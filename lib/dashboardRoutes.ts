/** Dashboard views that may appear as URL path segments. */
export const DASHBOARD_PATH_VIEWS = new Set([
  'overview',
  'program-details',
  'builder',
  'schedule-rounds',
  'schedule',
  'submissions',
  'judging',
  'awards',
  'templates',
  'analytics',
  'teams',
  'logs',
  'settings',
  'voting',
  'tile-hub',
  'certificates',
  'broadcasts',
]);

export const SETTINGS_TABS = new Set([
  'profile',
  'integrations',
  'billing',
  'notifications',
  'security',
  'domain',
  'shortcuts',
]);

export function normalizeDashboardView(view?: string | null): string {
  if (!view || view === 'overview') return 'overview';
  if (view === 'builder') return 'program-details';
  return view;
}

export function isValidSettingsTab(tab?: string | null): tab is string {
  return !!tab && SETTINGS_TABS.has(tab);
}

export function buildDashboardPath(options: {
  eventId?: string | null;
  view?: string | null;
  settingsTab?: string | null;
}): string {
  const { eventId, view, settingsTab } = options;
  if (!eventId) return '/dashboard';

  const normalizedView = normalizeDashboardView(view);

  if (normalizedView === 'settings') {
    if (settingsTab && isValidSettingsTab(settingsTab)) {
      return `/dashboard/events/${eventId}/settings/${settingsTab}`;
    }
    return `/dashboard/events/${eventId}/settings`;
  }

  if (normalizedView === 'overview') {
    return `/dashboard/events/${eventId}`;
  }

  return `/dashboard/events/${eventId}/${normalizedView}`;
}

export function parseDashboardPath(pathname: string): {
  eventId: string | null;
  view: string | null;
  settingsTab: string | null;
} {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized === '/dashboard') {
    return { eventId: null, view: null, settingsTab: null };
  }

  const eventRoot = normalized.match(/^\/dashboard\/events\/([^/]+)$/);
  if (eventRoot) {
    return { eventId: eventRoot[1], view: 'overview', settingsTab: null };
  }

  const settingsMatch = normalized.match(/^\/dashboard\/events\/([^/]+)\/settings(?:\/([^/]+))?$/);
  if (settingsMatch) {
    const tab = settingsMatch[2] || null;
    return {
      eventId: settingsMatch[1],
      view: 'settings',
      settingsTab: isValidSettingsTab(tab) ? tab : null,
    };
  }

  const viewMatch = normalized.match(/^\/dashboard\/events\/([^/]+)\/([^/]+)$/);
  if (viewMatch) {
    const viewSegment = viewMatch[2];
    if (DASHBOARD_PATH_VIEWS.has(viewSegment)) {
      return {
        eventId: viewMatch[1],
        view: normalizeDashboardView(viewSegment),
        settingsTab: null,
      };
    }
  }

  return { eventId: null, view: null, settingsTab: null };
}

/** Convert legacy `?program=&view=&tab=` URLs to path-based routes. */
export function legacyDashboardQueryToPath(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const program = params.get('program') || params.get('programId');
  const view = params.get('view');
  const tab = params.get('tab');

  if (!program && !view && !tab) return null;

  const normalizedView = view ? normalizeDashboardView(view) : 'overview';
  const settingsTab =
    normalizedView === 'settings' || tab
      ? (isValidSettingsTab(tab) ? tab : null)
      : null;

  return buildDashboardPath({
    eventId: program,
    view: program ? normalizedView : null,
    settingsTab,
  });
}

export function isDashboardSettingsPath(pathname: string, eventId: string): boolean {
  return pathname.startsWith(`/dashboard/events/${eventId}/settings`);
}
