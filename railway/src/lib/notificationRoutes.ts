const SETTINGS_TABS = new Set([
	'profile',
	'integrations',
	'billing',
	'notifications',
	'security',
	'domain',
	'shortcuts',
]);

export function buildNotificationRoute(options: {
	eventId: string;
	view?: string | null;
	settingsTab?: string | null;
}): string {
	const { eventId, view, settingsTab } = options;
	const normalizedView = view === 'builder' ? 'program-details' : (view || 'overview');

	if (normalizedView === 'settings') {
		if (settingsTab && SETTINGS_TABS.has(settingsTab)) {
			return `/dashboard/events/${eventId}/settings/${settingsTab}`;
		}
		return `/dashboard/events/${eventId}/settings`;
	}

	if (normalizedView === 'overview') {
		return `/dashboard/events/${eventId}`;
	}

	return `/dashboard/events/${eventId}/${normalizedView}`;
}

export function buildOrgHubRoute(): string {
	return '/dashboard';
}

export function buildTeamNotificationRoute(programId?: string | null): string {
	return programId ? buildNotificationRoute({ eventId: programId, view: 'teams' }) : buildOrgHubRoute();
}
