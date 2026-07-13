import { Router } from 'express';
import { getSupabaseAdmin } from '../supabase.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { requireProgramAccess, canAccessProgram } from '../middleware/programAccess.js';
import { Resend } from 'resend';
import QRCode from 'qrcode';
import { resolveEmailSiteUrl } from '../lib/emailSiteUrl.js';

const router = Router();

// Helper to escape HTML
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// Helper to check if a user has permission to view/mark attendance
async function hasAttendancePermission(userId: string, programId: string): Promise<boolean> {
	try {
		const supabase = getSupabaseAdmin();

		// 1. Get the program's organization_id
		const { data: program } = await supabase
			.from('programs')
			.select('organization_id')
			.eq('id', programId)
			.maybeSingle();

		if (!program?.organization_id) return false;

		// 2. Fetch active membership inside the organization
		const { data: memberships } = await supabase
			.from('organization_members')
			.select('program_id, roles(name, permissions, role_permissions(permissions(key)))')
			.eq('organization_id', program.organization_id)
			.eq('user_id', userId)
			.eq('status', 'active');

		if (!memberships || memberships.length === 0) return false;

		return memberships.some((membership: any) => {
			// Program-specific membership must match the target programId
			if (membership.program_id !== null && membership.program_id !== programId) {
				return false;
			}

			const roleName = String(membership.roles?.name || '').toLowerCase().trim();
			if (['admin', 'owner', 'superadmin'].includes(roleName)) return true;

			// Check array and junction permissions
			const permsFromArray = Array.isArray(membership.roles?.permissions)
				? membership.roles.permissions.map((v: any) => String(v).toLowerCase().trim())
				: [];

			const permsFromJunction = Array.isArray(membership.roles?.role_permissions)
				? membership.roles.role_permissions
						.map((row: any) => String(row?.permissions?.key || '').toLowerCase().trim())
						.filter(Boolean)
				: [];

			const permissions = new Set([...permsFromArray, ...permsFromJunction]);

			return permissions.has('mark_attendance') || permissions.has('view_submissions') || permissions.has('manage_programs');
		});
	} catch (error) {
		console.error('[attendance-permission] Error checking permission:', error);
		return false;
	}
}

// 1. Get all attendance records for a program
router.get('/program/:programId', requireAuth, async (req: AuthenticatedRequest, res) => {
	const { programId } = req.params;
	try {
		if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
		const permitted = await hasAttendancePermission(req.userId, programId);
		if (!permitted) {
			return res.status(403).json({ error: 'You do not have permission to access attendance for this program' });
		}

		const supabase = getSupabaseAdmin();
		const { data, error } = await supabase
			.from('program_attendance')
			.select('*')
			.eq('program_id', programId)
			.order('created_at', { ascending: false });

		if (error) throw error;
		return res.json({ ok: true, data });
	} catch (error: any) {
		return res.status(500).json({ error: error.message || 'Failed to fetch attendance list' });
	}
});

router.post('/program/:programId/add', requireAuth, async (req: AuthenticatedRequest, res) => {
	const { programId } = req.params;
	const { name, email } = req.body;

	if (!name || !email) {
		return res.status(400).json({ error: 'Name and email are required' });
	}

	try {
		if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
		const permitted = await hasAttendancePermission(req.userId, programId);
		if (!permitted) {
			return res.status(403).json({ error: 'You do not have permission to add participants' });
		}

		const supabase = getSupabaseAdmin();
		const { data, error } = await supabase
			.from('program_attendance')
			.insert({
				program_id: programId,
				name: name.trim(),
				email: email.trim().toLowerCase(),
				status: 'pending'
			})
			.select()
			.single();

		if (error) {
			if (error.code === '23505') { // Unique key violation
				return res.status(400).json({ error: 'Participant with this email already exists' });
			}
			throw error;
		}

		return res.json({ ok: true, data });
	} catch (error: any) {
		return res.status(500).json({ error: error.message || 'Failed to add participant' });
	}
});

router.post('/program/:programId/sync', requireAuth, async (req: AuthenticatedRequest, res) => {
	const { programId } = req.params;
	try {
		if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
		const permitted = await hasAttendancePermission(req.userId, programId);
		if (!permitted) {
			return res.status(403).json({ error: 'You do not have permission to sync submissions' });
		}

		const supabase = getSupabaseAdmin();

		// Get all submissions for this program
		const { data: submissions, error: subError } = await supabase
			.from('submissions')
			.select('applicant_email, applicant_name')
			.eq('program_id', programId);

		if (subError) throw subError;

		if (!submissions || submissions.length === 0) {
			return res.json({ ok: true, syncedCount: 0, message: 'No submissions found to sync' });
		}

		let syncedCount = 0;
		for (const sub of submissions) {
			if (!sub.applicant_email) continue;
			const email = sub.applicant_email.trim().toLowerCase();
			const name = sub.applicant_name ? sub.applicant_name.trim() : email.split('@')[0];

			// Try to insert
			const { error: insError } = await supabase
				.from('program_attendance')
				.insert({
					program_id: programId,
					name,
					email,
					status: 'pending'
				});

			if (!insError) {
				syncedCount++;
			}
		}

		return res.json({ ok: true, syncedCount, message: `Successfully synced ${syncedCount} new participants.` });
	} catch (error: any) {
		return res.status(500).json({ error: error.message || 'Failed to sync submissions' });
	}
});

// 4. Delete participant
router.delete('/record/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
	const { id } = req.params;
	try {
		const supabase = getSupabaseAdmin();

		// Fetch record to check program id
		const { data: record, error: getError } = await supabase
			.from('program_attendance')
			.select('program_id')
			.eq('id', id)
			.maybeSingle();

		if (getError || !record) {
			return res.status(404).json({ error: 'Record not found' });
		}

		// Check access
		if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
		const permitted = await hasAttendancePermission(req.userId, record.program_id);
		if (!permitted) {
			return res.status(403).json({ error: 'You do not have permission to delete participants' });
		}

		const { error: delError } = await supabase
			.from('program_attendance')
			.delete()
			.eq('id', id);

		if (delError) throw delError;

		return res.json({ ok: true });
	} catch (error: any) {
		return res.status(500).json({ error: error.message || 'Failed to delete record' });
	}
});

// Helper: send QR Email using Resend directly
async function sendQrEmailHelper(recordId: string): Promise<{ ok: boolean; error?: string }> {
	try {
		const supabase = getSupabaseAdmin();
		
		const { data: record, error: recordError } = await supabase
			.from('program_attendance')
			.select('*, programs(id, title, organization_id)')
			.eq('id', recordId)
			.maybeSingle();

		if (recordError || !record) return { ok: false, error: 'Record not found' };

		const program = record.programs as any;
		if (!program) return { ok: false, error: 'Associated program not found' };

		const siteUrl = resolveEmailSiteUrl();
		const scanUrl = `${siteUrl}/attendance/scan?token=${record.qr_code_token}`;
		
		const qrDataUrl = await QRCode.toDataURL(scanUrl, { width: 300, margin: 2 });
		const qrBase64 = qrDataUrl.split(',')[1];

		const resendApiKey = process.env.RESEND_API_KEY;
		if (!resendApiKey) return { ok: false, error: 'RESEND_API_KEY environment variable is not set.' };

		const resend = new Resend(resendApiKey);
		const fromEmail = process.env.RESEND_FROM || 'onboarding@resend.dev';
		const subject = `Your Attendance Pass for ${program.title}`;

		const html = `
		<html>
			<head>
				<style>
					body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0; }
					.card { background-color: #ffffff; border-radius: 16px; padding: 32px; max-width: 480px; margin: 0 auto; text-align: center; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
					.title { font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 8px; }
					.subtitle { font-size: 14px; color: #64748b; margin-bottom: 24px; }
					.qr-container { background-color: #f8fafc; padding: 16px; border-radius: 12px; display: inline-block; margin-bottom: 24px; border: 1px solid #f1f5f9; }
					.qr-image { display: block; width: 220px; height: 220px; margin: 0 auto; }
					.details { text-align: left; background-color: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #f1f5f9; }
					.detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
					.detail-row:last-child { margin-bottom: 0; }
					.label { color: #64748b; font-weight: 500; }
					.value { color: #0f172a; font-weight: 600; }
					.footer { font-size: 12px; color: #94a3b8; margin-top: 16px; }
				</style>
			</head>
			<body>
				<div class="card">
					<div class="title">Attendance Pass</div>
					<div class="subtitle">Present this QR code to the event organizers to check in.</div>
					<div class="qr-container">
						<img src="cid:qr.png" class="qr-image" alt="Check-in Pass QR Code" />
					</div>
					<div class="details">
						<div class="detail-row">
							<span class="label">Event:</span>
							<span class="value">${program.title}</span>
						</div>
						<div class="detail-row">
							<span class="label">Participant:</span>
							<span class="value">${record.name}</span>
						</div>
						<div class="detail-row">
							<span class="label">Email:</span>
							<span class="value">${record.email}</span>
						</div>
					</div>
					<div class="footer">Sent via AwardX system. Please do not reply directly to this email.</div>
				</div>
			</body>
		</html>
		`;

		const { error: resError } = await resend.emails.send({
			from: fromEmail,
			to: record.email,
			subject,
			html,
			attachments: [
				{
					filename: 'qr.png',
					content: qrBase64
				}
			]
		});

		if (resError) {
			console.error('[attendance-email] Resend error:', resError);
			return { ok: false, error: resError.message };
		}

		return { ok: true };
	} catch (error: any) {
		console.error('[attendance-email] Error sending email:', error);
		return { ok: false, error: error.message || 'Failed to send email' };
	}
}

// 5. Send QR code to single participant
router.post('/record/:id/send-qr', requireAuth, async (req: AuthenticatedRequest, res) => {
	const { id } = req.params;
	try {
		const supabase = getSupabaseAdmin();

		// Fetch record and program
		const { data: record, error: getError } = await supabase
			.from('program_attendance')
			.select('*, programs(id, title, organization_id)')
			.eq('id', id)
			.maybeSingle();

		if (getError || !record) {
			return res.status(404).json({ error: 'Record not found' });
		}

		// Typecast program join
		const program = record.programs as any;
		if (!program) {
			return res.status(404).json({ error: 'Associated program not found' });
		}

		// Check access
		if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
		const permitted = await hasAttendancePermission(req.userId, program.id);
		if (!permitted) {
			return res.status(403).json({ error: 'You do not have permission to send passes for this program' });
		}

		const emailResult = await sendQrEmailHelper(record.id);
		if (!emailResult.ok) {
			return res.status(500).json({ error: emailResult.error });
		}

		return res.json({ ok: true });
	} catch (error: any) {
		return res.status(500).json({ error: error.message || 'Failed to send QR pass' });
	}
});

router.post('/program/:programId/send-qr-all', requireAuth, async (req: AuthenticatedRequest, res) => {
	const { programId } = req.params;
	try {
		if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
		const permitted = await hasAttendancePermission(req.userId, programId);
		if (!permitted) {
			return res.status(403).json({ error: 'You do not have permission to send passes for this program' });
		}

		const supabase = getSupabaseAdmin();

		// Get program info
		const { data: program } = await supabase
			.from('programs')
			.select('title, organization_id')
			.eq('id', programId)
			.single();

		if (!program) {
			return res.status(404).json({ error: 'Program not found' });
		}

		// Fetch all participants
		const { data: records, error: getError } = await supabase
			.from('program_attendance')
			.select('*')
			.eq('program_id', programId);

		if (getError) throw getError;

		if (!records || records.length === 0) {
			return res.status(400).json({ error: 'No participants found to send passes to' });
		}

		let successCount = 0;
		let failedCount = 0;

		for (const record of records) {
			const resEmail = await sendQrEmailHelper(record.id);
			if (resEmail.ok) {
				successCount++;
			} else {
				failedCount++;
			}
		}

		return res.json({
			ok: true,
			message: `Sent passes: ${successCount} successful, ${failedCount} failed.`
		});
	} catch (error: any) {
		return res.status(500).json({ error: error.message || 'Failed to send bulk passes' });
	}
});

// 7. Verify and mark attendance (Scan QR endpoint)
router.post('/scan', requireAuth, async (req: AuthenticatedRequest, res) => {
	const { token } = req.body;
	if (!token) {
		return res.status(400).json({ error: 'Token is required' });
	}

	try {
		const supabase = getSupabaseAdmin();

		// Fetch participant record by QR token
		const { data: record, error: getError } = await supabase
			.from('program_attendance')
			.select('*, programs(id, title, organization_id)')
			.eq('qr_code_token', token)
			.maybeSingle();

		if (getError || !record) {
			return res.status(404).json({ error: 'Invalid or unrecognized attendance QR code.' });
		}

		const program = record.programs as any;
		if (!program) {
			return res.status(404).json({ error: 'Associated program not found' });
		}

		// Verify scanner permission (must belong to organization)
		if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
		const permitted = await hasAttendancePermission(req.userId, program.id);
		if (!permitted) {
			return res.status(403).json({ error: 'You do not have permission to mark attendance for this event.' });
		}

		// Mark participant as present
		const { data: updatedRecord, error: updateError } = await supabase
			.from('program_attendance')
			.update({
				status: 'present',
				marked_at: new Date().toISOString(),
				marked_by: req.userId
			})
			.eq('id', record.id)
			.select()
			.single();

		if (updateError) throw updateError;

		return res.json({
			ok: true,
			participant: {
				name: updatedRecord.name,
				email: updatedRecord.email,
				status: updatedRecord.status,
				markedAt: updatedRecord.marked_at,
			},
			programTitle: program.title
		});
	} catch (error: any) {
		return res.status(500).json({ error: error.message || 'Failed to scan and mark attendance' });
	}
});

export default router;
