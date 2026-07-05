import { buildDashboardPath, DASHBOARD_PATH_VIEWS, isValidSettingsTab, } from './dashboardRoutes';
const NOTIFICATION_TYPE_VIEWS = {
    submission: 'submissions',
    judging: 'judging',
    form: 'templates',
    award: 'awards',
    certificate: 'certificates',
    team: 'teams',
    program: 'overview',
    organization: 'overview',
    deadline: 'schedule-rounds',
};
const LEGACY_VIEW_ALIASES = {
    pipeline: 'schedule-rounds',
    forms: 'templates',
    'form-builder': 'templates',
    builder: 'program-details',
};
export function normalizeNotificationView(segment) {
    if (!segment || segment === 'overview')
        return 'overview';
    const normalized = LEGACY_VIEW_ALIASES[segment] || segment;
    if (normalized === 'settings')
        return 'settings';
    return DASHBOARD_PATH_VIEWS.has(normalized) ? normalized : null;
}
export function parseNotificationRoute(route) {
    const normalized = route.replace(/\/+$/, '') || '/';
    if (/^\/organization\/[^/]+/.test(normalized)) {
        return { eventId: null, view: null, settingsTab: null };
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
    const newFormatMatch = normalized.match(/^\/dashboard\/events\/([^/]+)(?:\/([^/]+))?$/);
    if (newFormatMatch) {
        const viewSegment = newFormatMatch[2] || 'overview';
        return {
            eventId: newFormatMatch[1],
            view: normalizeNotificationView(viewSegment),
            settingsTab: null,
        };
    }
    const legacyMatch = normalized.match(/^\/dashboard\/([^/]+)\/([^/]+)$/);
    if (legacyMatch) {
        const segment = legacyMatch[2];
        if (segment === 'settings') {
            return { eventId: legacyMatch[1], view: 'settings', settingsTab: null };
        }
        return {
            eventId: legacyMatch[1],
            view: normalizeNotificationView(segment),
            settingsTab: null,
        };
    }
    const legacyRoot = normalized.match(/^\/dashboard\/([^/]+)$/);
    if (legacyRoot) {
        return { eventId: legacyRoot[1], view: 'overview', settingsTab: null };
    }
    if (normalized === '/dashboard') {
        return { eventId: null, view: null, settingsTab: null };
    }
    return null;
}
export function buildNotificationRoute(options) {
    return buildDashboardPath({
        eventId: options.eventId,
        view: options.view || 'overview',
        settingsTab: options.settingsTab,
    });
}
export function buildOrgHubRoute() {
    return '/dashboard';
}
export function buildTeamNotificationRoute(programId) {
    return programId
        ? buildNotificationRoute({ eventId: programId, view: 'teams' })
        : buildOrgHubRoute();
}
/**
 * Navigate to a notification's destination, switching organization context if needed.
 *
 * @param notification - The notification with type, programId, organizationId, metadata
 * @param navigate - React Router's navigate function
 * @param ensureOrganizationContext - Async callback that switches to the given orgId and
 *   fully initializes the context. Only called when organizationId is set. Must throw on failure.
 * @returns The path that was navigated to
 * @throws If organization context initialization fails
 */
export async function navigateToNotification(notification, navigate, ensureOrganizationContext) {
    const path = resolveNotificationPath(notification);
    if (notification.organizationId && ensureOrganizationContext) {
        await ensureOrganizationContext(notification.organizationId);
    }
    navigate(path);
    return path;
}
export function resolveNotificationPath(notification) {
    const route = notification.metadata?.route;
    if (typeof route === 'string' && route.trim()) {
        const parsed = parseNotificationRoute(route);
        if (parsed) {
            if (!parsed.eventId) {
                return '/dashboard';
            }
            let view = parsed.view || NOTIFICATION_TYPE_VIEWS[notification.type] || 'overview';
            if (view === 'settings' && notification.type === 'team' && !parsed.settingsTab) {
                view = 'teams';
            }
            return buildDashboardPath({
                eventId: parsed.eventId,
                view,
                settingsTab: parsed.settingsTab,
            });
        }
    }
    const eventId = notification.programId;
    const typeView = NOTIFICATION_TYPE_VIEWS[notification.type];
    if (eventId && typeView) {
        return buildDashboardPath({ eventId, view: typeView });
    }
    if (eventId) {
        return buildDashboardPath({ eventId, view: 'overview' });
    }
    return '/dashboard';
}
