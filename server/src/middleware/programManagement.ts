import { getSupabaseAdmin } from '../supabase.js';

const ALLOWED_ROLE_NAMES = new Set(['admin', 'program manager']);
const ALLOWED_PERMISSION_KEYS = new Set(['manage_programs', 'manage_judging']);

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

async function canManageOrganizationProgram(userId: string, organizationId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message || 'Failed to load profile');
  }

  if (profile?.organization_id === organizationId) {
    return true;
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('status, roles(name, permissions)')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (membershipError) {
    throw new Error(membershipError.message || 'Failed to load organization memberships');
  }

  return (memberships || []).some((membership: any) => {
    const roleName = String(membership.roles?.name || '').toLowerCase().trim();
    const rolePermissions = Array.isArray(membership.roles?.permissions)
      ? membership.roles.permissions.map((value: unknown) => String(value).toLowerCase().trim())
      : [];
    return ALLOWED_ROLE_NAMES.has(roleName) || rolePermissions.some((permission: string) => ALLOWED_PERMISSION_KEYS.has(permission));
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

  return canManageOrganizationProgram(userId, program.organization_id);
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

  const permitted = await canManageOrganizationProgram(userId, program.organization_id);
  if (!permitted) {
    return { ok: false, status: 403, error: 'Insufficient permissions' };
  }

  return { ok: true, program };
}
