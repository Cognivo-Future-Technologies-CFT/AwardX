import type { NextFunction, Response } from 'express';
import { getSupabaseAdmin } from '../supabase.js';
import type { AuthenticatedRequest } from './auth.js';

// Role names that are always considered management-level regardless of assigned permissions.
const MANAGEMENT_ROLE_NAMES = new Set([
  'admin',
  'owner',
  'superadmin',
  'program manager',
  'lead judge',
  'lead_judge',
  'event manager',
  'judge',
  'attendance marker',
  'ceo',
]);

// Any of these permissions on a role grant program management access.
// This covers every actionable permission defined in the system (excludes pure view-only).
const MANAGEMENT_PERMISSION_KEYS = new Set([
  'manage_programs',
  'manage_judging',
  'manage_submissions',
  'manage_forms',
  'manage_teams',
  'manage_settings',
  'manage_crm',
  'manage_payments',
  'manage_reach',
  'manage_voting',
  'mark_attendance',
  'view_submissions',
  'view_judging',
  'view_overview',
  'view_analytics',
  'view_logs',
  'view_messages',
  'view_payments',
  'view_subscription',
  'all',
]);

type ProgramRow = {
  id: string;
  organization_id: string;
};

async function getProgram(programId: string): Promise<ProgramRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('programs')
    .select('id, organization_id')
    .eq('id', programId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load program');
  }

  return data || null;
}

async function canManageOrganizationProgram(userId: string, organizationId: string, programId?: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // Join through roles → role_permissions → permissions to get actual permission keys.
  // The roles.permissions array column is a legacy field that is not populated by the app;
  // the authoritative source is the role_permissions junction table.
  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('status, program_id, roles(name, permissions, role_permissions(permissions(key)))')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (membershipError) {
    throw new Error(membershipError.message || 'Failed to load organization memberships');
  }

  return (memberships || []).some((membership: any) => {
    // Org-wide membership (not scoped to a specific program) holds management rights over all programs.
    if (membership.program_id === null) {
      return true;
    }

    // Program-specific membership is allowed if it matches the current programId
    if (programId && membership.program_id === programId) {
      const roleName = String(membership.roles?.name || '').toLowerCase().trim();

      // Check role name directly — known management roles pass immediately
      if (MANAGEMENT_ROLE_NAMES.has(roleName)) return true;

      // Collect permissions from both sources:
      // 1. The legacy roles.permissions array column (may be populated in older setups)
      const permsFromArray: string[] = Array.isArray(membership.roles?.permissions)
        ? membership.roles.permissions.map((value: unknown) => String(value).toLowerCase().trim())
        : [];

      // 2. The role_permissions junction table (authoritative source)
      const permsFromJunction: string[] = Array.isArray(membership.roles?.role_permissions)
        ? membership.roles.role_permissions
            .map((rp: any) => rp?.permissions?.key)
            .filter(Boolean)
            .map((key: string) => key.toLowerCase().trim())
        : [];

      const allPermissions = [...permsFromArray, ...permsFromJunction];

      // Custom / predefined roles: any assigned permission unlocks program API access
      // for this event. Fine-grained UI still gates individual views via hasPermission.
      return allPermissions.length > 0;
    }

    return false;
  });
}

export async function canManageProgram(userId: string, programId: string): Promise<boolean> {
  if (!userId || !programId) {
    return false;
  }

  const program = await getProgram(programId);
  if (!program?.organization_id) {
    return false;
  }

  return canManageOrganizationProgram(userId, program.organization_id, programId);
}

export async function ensureCanManageProgram(userId: string, programId: string): Promise<{
  ok: true;
  program: ProgramRow;
} | {
  ok: false;
  status: 403 | 404;
  error: string;
}> {
  const program = await getProgram(programId);
  if (!program) {
    return { ok: false, status: 404, error: 'Program not found' };
  }

  const permitted = await canManageOrganizationProgram(userId, program.organization_id, programId);
  if (!permitted) {
    return { ok: false, status: 403, error: 'Insufficient permissions' };
  }

  return { ok: true, program };
}

export function requireProgramManage(paramName = 'programId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const programId = req.params[paramName];
    if (!programId) {
      return res.status(400).json({ error: `${paramName} is required` });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    try {
      const result = await ensureCanManageProgram(req.userId, programId);
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error });
      }
      return next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Authorization failed';
      return res.status(500).json({ error: message });
    }
  };
}
