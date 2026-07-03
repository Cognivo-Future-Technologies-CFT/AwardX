export async function createNotification(
	supabase: any,
	payload: {
		organizationId: string;
		programId?: string | null;
		recipientUserId?: string | null;
		type: string;
		title: string;
		body: string;
		metadata?: Record<string, any>;
	},
) {
	try {
		await supabase.from('notifications').insert({
			organization_id: payload.organizationId,
			program_id: payload.programId || null,
			recipient_user_id: payload.recipientUserId || null,
			type: payload.type,
			title: payload.title,
			body: payload.body,
			metadata: payload.metadata || {},
		});
	} catch (err) {
		console.warn('Failed to insert notification:', err);
	}
}
