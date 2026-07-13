import type { NextFunction, Response } from 'express';
import { getSupabaseAdmin } from '../supabase.js';
import type { AuthenticatedRequest } from './auth.js';

/** Privileged role names that bypass fine-grained permission checks. */
const PRIVILEGED_ROLE_NAMES = new Set([
  'admin',
  'owner',
  'superadmin',
  'ceo',
]);

type ProgramRow = {
  id: string;
  organization_id: string;
};

type ProgramAuthContext = {
  program: ProgramRow;
  roleName: string;
  permissions: Set<string>;
  privileged: boolean;
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

function collectRolePermissions(membership: any): { roleName: string; permissions: Set<string> } {
  const roleName = String(membership?.roles?.name || '').toLowerCase().trim();
  const permsFromArray: string[] = Array.isArray(membership?.roles?.permissions)
    ? membership.roles.permissions.map((value: unknown) => String(value).toLowerCase().trim())
    : [];
  const permsFromJunction: string[] = Array.isArray(membership?.roles?.role_permissions)
    ? membership.roles.role_permissions
        .map((rp: any) => rp?.permissions?.key)
        .filter(Boolean)
        .map((key: string) => String(key).toLowerCase().trim())
    : [];

  return {
    roleName,
    permissions: new Set([...permsFromArray, ...permsFromJunction].filter(Boolean)),
  };
}

/**
 * Resolve the caller's role permissions for a program.
 * Uses org-wide membership (program_id null) or an exact program-scoped membership.
 */
export async function getProgramAuthContext(
  userId: string,
  programId: string,
): Promise<ProgramAuthContext | null> {
  if (!userId || !programId) return null;

  const program = await getProgram(programId);
  if (!program?.organization_id) return null;

  const supabase = getSupabaseAdmin();
  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select('status, program_id, roles(name, permissions, role_permissions(permissions(key)))')
    .eq('organization_id', program.organization_id)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    throw new Error(error.message || 'Failed to load organization memberships');
  }

  const rows = memberships || [];
  const scoped = rows.find((row: any) => row.program_id === programId);
  const orgWide = rows.find((row: any) => row.program_id == null);
  const membership = scoped || orgWide;
  if (!membership) return null;

  const { roleName, permissions } = collectRolePermissions(membership);
  return {
    program,
    roleName,
    permissions,
    privileged: PRIVILEGED_ROLE_NAMES.has(roleName) || permissions.has('all'),
  };
}

function hasAnyPermission(ctx: ProgramAuthContext, required: string[]): boolean {
  if (ctx.privileged) return true;
  return required.some((key) => ctx.permissions.has(key.toLowerCase().trim()));
}

/**
 * Require at least one of the given permission keys on the caller's role for this program.
 * Custom roles work by their assigned permissions only (not by copying Event Manager).
 */
export async function ensureHasProgramPermission(
  userId: string,
  programId: string,
  requiredPermissions: string | string[],
): Promise<
  | { ok: true; program: ProgramRow; permissions: Set<string> }
  | { ok: false; status: 403 | 404; error: string }
> {
  const required = (Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions])
    .map((key) => key.toLowerCase().trim())
    .filter(Boolean);

  const ctx = await getProgramAuthContext(userId, programId);
  if (!ctx) {
    const program = await getProgram(programId);
    if (!program) return { ok: false, status: 404, error: 'Program not found' };
    return { ok: false, status: 403, error: 'Insufficient permissions' };
  }

  if (required.length > 0 && !hasAnyPermission(ctx, required)) {
    return { ok: false, status: 403, error: 'Insufficient permissions' };
  }

  return { ok: true, program: ctx.program, permissions: ctx.permissions };
}

/** True if caller can manage broad program ops (legacy helper used by many routes). */
export async function canManageProgram(userId: string, programId: string): Promise<boolean> {
  const result = await ensureHasProgramPermission(userId, programId, [
    'manage_programs',
    'manage_forms',
    'manage_submissions',
    'view_submissions',
    'manage_judging',
    'view_judging',
    'manage_teams',
    'manage_settings',
    'mark_attendance',
    'view_overview',
    'view_analytics',
  ]);
  return result.ok;
}

export async function ensureCanManageProgram(userId: string, programId: string): Promise<{
  ok: true;
  program: ProgramRow;
} | {
  ok: false;
  status: 403 | 404;
  error: string;
}> {
  const result = await ensureHasProgramPermission(userId, programId, [
    'manage_programs',
    'manage_forms',
    'manage_submissions',
    'view_submissions',
    'manage_judging',
    'view_judging',
    'manage_teams',
    'manage_settings',
    'mark_attendance',
    'view_overview',
    'view_analytics',
  ]);
  if (!result.ok) return result;
  return { ok: true, program: result.program };
}

export function requireProgramManage(paramName = 'programId') {
  return requireProgramPermission(paramName, ['manage_programs']);
}

/** Express middleware: require any of the listed permissions for :programId. */
export function requireProgramPermission(paramName: string, requiredPermissions: string | string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const programId = req.params[paramName];
    if (!programId) {
      return res.status(400).json({ error: `${paramName} is required` });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    try {
      const result = await ensureHasProgramPermission(req.userId, programId, requiredPermissions);
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
