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
		const previewText = `Your attendance pass for ${program.title} is ready.`;
		const safeName = escapeHtml(String(record.name || ''));
		const safeEmail = escapeHtml(String(record.email || ''));
		const safeTitle = escapeHtml(String(program.title || ''));
		const safeScanUrl = escapeHtml(scanUrl);

		const html = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapeHtml(previewText)}</span>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="width:560px;max-width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <tr>
              <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;text-align:center;">
                <img src="https://www.awardx.one/logo.png" alt="AwardX" height="44" style="height:44px;width:auto;display:block;margin:0 auto 8px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1e293b;line-height:1.3;">Attendance Check-In Pass</h2>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">Hi ${safeName},</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                  Here is your attendance check-in pass for <strong>${safeTitle}</strong>. Please display the QR code below at the reception desk to check in:
                </p>
                <div style="text-align:center;margin:0 0 24px;background-color:#f8fafc;padding:16px;border-radius:12px;border:1px solid #f1f5f9;">
                  <img src="cid:attendance-qr" alt="Check-in Pass QR Code" style="display:block;width:220px;height:220px;margin:0 auto;" />
                </div>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
                  <tr>
                    <td align="center">
                      <a href="${safeScanUrl}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;">Open Digital Pass</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">
                  If the button above does not work, copy and paste this URL into your browser:<br />
                  <a href="${safeScanUrl}" style="color:#4f46e5;word-break:break-all;">${safeScanUrl}</a>
                </p>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:#f1f5f9;border-radius:8px;border-left:4px solid #4f46e5;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="padding:6px 0;font-size:14px;color:#475569;width:100px;vertical-align:top;"><strong>Event:</strong></td>
                          <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${safeTitle}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Participant:</strong></td>
                          <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${safeName}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:14px;color:#475569;vertical-align:top;"><strong>Email:</strong></td>
                          <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;vertical-align:top;">${safeEmail}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#334155;">Best regards,<br /><strong>AwardX</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                  Sent via AwardX. Please do not reply directly to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

		const { error: resError } = await resend.emails.send({
			from: fromEmail,
			to: record.email,
			subject,
			html,
			attachments: [
				{
					filename: 'qr.png',
					content: qrBase64,
					contentId: 'attendance-qr',
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
