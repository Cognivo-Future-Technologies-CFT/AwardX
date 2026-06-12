import type { NextFunction, Response } from 'express';
import { getSupabaseAdmin } from '../supabase.js';
import type { AuthenticatedRequest } from './auth.js';

/** True if user belongs to the program's organization (owner profile or active member). */
export async function canAccessOrganization(userId: string, organizationId: string): Promise<boolean> {
  if (!userId || !organizationId) return false;

  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.organization_id === organizationId) {
    const { count: activeMembershipCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .in('status', ['active', 'pending']);

    if ((activeMembershipCount || 0) === 0) {
      return true;
    }
  }

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .in('status', ['active', 'pending']);

  return (memberships || []).length > 0;
}

/** True if user belongs to the program's organization (owner profile or active member). */
export async function canAccessProgram(userId: string, programId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data: program } = await supabase
    .from('programs')
    .select('organization_id')
    .eq('id', programId)
    .maybeSingle();

  if (!program?.organization_id) return false;

  return canAccessOrganization(userId, program.organization_id);
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
