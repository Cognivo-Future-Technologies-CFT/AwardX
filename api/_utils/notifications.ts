import { buildNotificationRoute } from '../../lib/notificationNavigation';

export type ApiNotificationPayload = {
  organizationId: string;
  programId?: string | null;
  recipientUserId?: string | null;
  type: string;
  title: string;
  body: string;
  view?: string | null;
  settingsTab?: string | null;
  route?: string | null;
  metadata?: Record<string, unknown>;
};

export function resolveApiNotificationRoute(payload: ApiNotificationPayload): string | undefined {
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
  return undefined;
}

export async function insertNotification(supabase: any, payload: ApiNotificationPayload) {
  const route = resolveApiNotificationRoute(payload);
  const metadata = {
    organizationId: payload.organizationId,
    programId: payload.programId ?? null,
    ...(payload.metadata || {}),
    ...(route ? { route } : {}),
  };

  const { error } = await supabase.from('notifications').insert({
    organization_id: payload.organizationId,
    program_id: payload.programId || null,
    recipient_user_id: payload.recipientUserId || null,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    metadata,
  });

  return { error };
}
