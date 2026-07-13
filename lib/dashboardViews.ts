import { PERMISSIONS } from '../services/models';

/** Maps dashboard view ids to required permission keys. */
export const DASHBOARD_VIEW_PERMISSIONS: Record<string, string> = {
  overview: PERMISSIONS.VIEW_OVERVIEW,
  builder: PERMISSIONS.MANAGE_PROGRAMS,
  'program-details': PERMISSIONS.MANAGE_PROGRAMS,
  'schedule-rounds': PERMISSIONS.MANAGE_PROGRAMS,
  submissions: PERMISSIONS.VIEW_SUBMISSIONS,
  judging: PERMISSIONS.VIEW_JUDGING,
  'judge-category-mapping': PERMISSIONS.VIEW_JUDGING,
  subscription: PERMISSIONS.VIEW_SUBSCRIPTION,
  awards: PERMISSIONS.MANAGE_PROGRAMS,
  templates: PERMISSIONS.MANAGE_FORMS,
  analytics: PERMISSIONS.VIEW_ANALYTICS,
  teams: PERMISSIONS.MANAGE_TEAMS,
  logs: PERMISSIONS.VIEW_LOGS,
  settings: PERMISSIONS.MANAGE_SETTINGS,
  categories: PERMISSIONS.MANAGE_PROGRAMS,
  schedule: PERMISSIONS.MANAGE_PROGRAMS,
  'submission-process': PERMISSIONS.MANAGE_PROGRAMS,
  broadcasts: PERMISSIONS.MANAGE_PROGRAMS,
  certificates: PERMISSIONS.MANAGE_PROGRAMS,
  attendance: PERMISSIONS.MARK_ATTENDANCE,
};

/** First dashboard view the user is allowed to open (prefers overview when available). */
export function resolveDefaultDashboardView(
  hasPermission: (permission: string) => boolean,
  fallback = 'overview',
): string {
  if (hasPermission(PERMISSIONS.VIEW_OVERVIEW)) {
    return fallback;
  }

  for (const [viewId, permission] of Object.entries(DASHBOARD_VIEW_PERMISSIONS)) {
    if (hasPermission(permission)) {
      return viewId;
    }
  }

  return fallback;
}

export function resolveAllowedDashboardView(
  requestedView: string | null | undefined,
  hasPermission: (permission: string) => boolean,
  fallback = 'overview',
): string {
  if (!requestedView) {
    return resolveDefaultDashboardView(hasPermission, fallback);
  }

  const normalizedView = requestedView === 'builder' ? 'program-details' : requestedView;
  const required = DASHBOARD_VIEW_PERMISSIONS[normalizedView];
  if (!required) {
    return resolveDefaultDashboardView(hasPermission, fallback);
  }
  if (!hasPermission(required)) {
    return resolveDefaultDashboardView(hasPermission, fallback);
  }

  return normalizedView;
}
