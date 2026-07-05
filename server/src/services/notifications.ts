import {
	buildNotificationRoute,
	buildOrgHubRoute,
	buildTeamNotificationRoute,
} from '../lib/notificationRoutes.js';

export type CreateNotificationPayload = {
	organizationId: string;
	programId?: string | null;
	recipientUserId?: string | null;
	type: string;
	title: string;
	body: string;
	/** Dashboard view segment — preferred over raw route strings. */
	view?: string | null;
	settingsTab?: string | null;
	route?: string | null;
	metadata?: Record<string, any>;
};

function resolveRoute(payload: CreateNotificationPayload): string | undefined {
	if (payload.route) return payload.route;
	if (payload.programId && payload.view) {
		return buildNotificationRoute({
			eventId: payload.programId,
			view: payload.view,
			settingsTab: payload.settingsTab,
		});
	}
	if (payload.programId) {
		return buildNotificationRoute({ eventId: payload.programId, view: 'overview' });
	}
	if (payload.type === 'organization') {
		return buildOrgHubRoute();
	}
	if (payload.type === 'team') {
		return buildTeamNotificationRoute(payload.programId);
	}
	return undefined;
}

export async function createNotification(supabase: any, payload: CreateNotificationPayload) {
	const route = resolveRoute(payload);
	const metadata = {
		organizationId: payload.organizationId,
		programId: payload.programId ?? null,
		...(payload.metadata || {}),
		...(route ? { route } : {}),
	};

	try {
		await supabase.from('notifications').insert({
			organization_id: payload.organizationId,
			program_id: payload.programId || null,
			recipient_user_id: payload.recipientUserId || null,
			type: payload.type,
			title: payload.title,
			body: payload.body,
			metadata,
		});
	} catch (err) {
		console.warn('Failed to insert notification:', err);
	}
}
