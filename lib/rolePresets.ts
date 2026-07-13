import { PERMISSIONS } from '../services/models';

/** All concrete permission keys that can be stored on a role (excludes the virtual `all` flag). */
export const ALL_PERMISSION_KEYS: string[] = Object.values(PERMISSIONS);

export type RolePreset = {
  key: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  icon: string;
};

/**
 * Expand UI permission selections into DB-ready keys.
 * `all` is a UI shortcut — permissions table has no `all` row.
 */
export function resolvePermissionKeysForStorage(keys: string[] | null | undefined): string[] {
  const raw = Array.isArray(keys) ? keys.map((k) => String(k).trim()).filter(Boolean) : [];
  if (raw.includes('all')) {
    return [...ALL_PERMISSION_KEYS];
  }
  return Array.from(new Set(raw));
}

/** Predefined team roles — each includes permissions needed for a usable scoped dashboard. */
export const ROLE_PRESETS: RolePreset[] = [
  {
    key: 'judge',
    name: 'Judge',
    description: 'Review and score submissions',
    permissions: [
      PERMISSIONS.VIEW_OVERVIEW,
      PERMISSIONS.VIEW_SUBMISSIONS,
      PERMISSIONS.VIEW_JUDGING,
    ],
    color: 'bg-blue-100 text-blue-700',
    icon: '🏆',
  },
  {
    key: 'lead-judge',
    name: 'Lead Judge',
    description: 'Manage and oversee judging',
    permissions: [
      PERMISSIONS.VIEW_OVERVIEW,
      PERMISSIONS.VIEW_SUBMISSIONS,
      PERMISSIONS.VIEW_JUDGING,
      PERMISSIONS.MANAGE_JUDGING,
    ],
    color: 'bg-purple-100 text-purple-700',
    icon: '⭐',
  },
  {
    key: 'manager',
    name: 'Event Manager',
    description: 'Manage programs and operations',
    permissions: [
      PERMISSIONS.VIEW_OVERVIEW,
      PERMISSIONS.MANAGE_PROGRAMS,
      PERMISSIONS.VIEW_ANALYTICS,
      PERMISSIONS.VIEW_SUBMISSIONS,
      PERMISSIONS.MANAGE_SUBMISSIONS,
      PERMISSIONS.MANAGE_FORMS,
      PERMISSIONS.VIEW_JUDGING,
      PERMISSIONS.MARK_ATTENDANCE,
    ],
    color: 'bg-emerald-100 text-emerald-700',
    icon: '📋',
  },
  {
    key: 'attendance-marker',
    name: 'Attendance Marker',
    description: 'Check in participants at the event',
    permissions: [
      PERMISSIONS.VIEW_OVERVIEW,
      PERMISSIONS.MARK_ATTENDANCE,
    ],
    color: 'bg-amber-100 text-amber-700',
    icon: '✅',
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Full system access',
    permissions: [...ALL_PERMISSION_KEYS],
    color: 'bg-rose-100 text-rose-700',
    icon: '🛡️',
  },
];

export function getRolePresetByName(name: string): RolePreset | undefined {
  const normalized = name.toLowerCase().trim();
  return ROLE_PRESETS.find((preset) => preset.name.toLowerCase() === normalized);
}
