import type { NextFunction, Response } from 'express';
import { getSupabaseAdmin } from '../supabase.js';
import type { AuthenticatedRequest } from './auth.js';

export type AccessiblePrograms =
  | { all: true }
  | { all: false; programIds: string[] };

/** True if user belongs to the organization as an active member. */
export async function canAccessOrganization(userId: string, organizationId: string): Promise<boolean> {
  if (!userId || !organizationId) return false;

  const supabase = getSupabaseAdmin();

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active');

  return (memberships || []).length > 0;
}

/**
 * Org-wide membership (program_id IS NULL) → all programs.
 * Otherwise only explicitly scoped program_ids.
 */
export async function getAccessiblePrograms(
  userId: string,
  organizationId: string,
): Promise<AccessiblePrograms> {
  if (!userId || !organizationId) {
    return { all: false, programIds: [] };
  }

  const supabase = getSupabaseAdmin();
  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select('program_id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    throw new Error(error.message || 'Failed to load organization memberships');
  }

  const rows = memberships || [];
  if (rows.some((row) => row.program_id == null)) {
    return { all: true };
  }

  const programIds = Array.from(
    new Set(
      rows
        .map((row) => row.program_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  );

  return { all: false, programIds };
}

/** True if user can access this specific program (org-wide or matching program scope). */
export async function canAccessProgram(userId: string, programId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data: program } = await supabase
    .from('programs')
    .select('organization_id')
    .eq('id', programId)
    .maybeSingle();

  if (!program?.organization_id) return false;

  const access = await getAccessiblePrograms(userId, program.organization_id);
  if (access.all) return true;
  return access.programIds.includes(programId);
}

export function requireProgramAccess(paramName = 'programId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const programId = req.params[paramName];
    if (!programId) {
      return res.status(400).json({ error: `${paramName} is required` });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Missing authenticated user' });
    }

    try {
      const permitted = await canAccessProgram(req.userId, programId);
      if (!permitted) {
        return res.status(403).json({ error: 'You do not have access to this program' });
      }
      return next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Authorization failed';
      return res.status(500).json({ error: message });
    }
  };
}
