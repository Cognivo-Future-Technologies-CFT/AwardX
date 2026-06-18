const INVITE_ALLOWED_ROLE_NAMES = new Set(['admin', 'program manager', 'owner', 'superadmin']);
const INVITE_ALLOWED_PERMISSION_KEYS = new Set(['manage_teams', 'manage_programs']);

type MembershipRow = {
  program_id?: string | null;
  role_id?: string | null;
  roles?: {
    name?: string | null;
    permissions?: unknown;
    role_permissions?: Array<{ permissions?: { key?: string | null } | null }>;
  } | null;
};

function membershipHasInvitePermission(membership: MembershipRow): boolean {
  const roleName = String(membership.roles?.name || '').toLowerCase().trim();

  const permsFromArray = Array.isArray(membership.roles?.permissions)
    ? membership.roles.permissions.map((value) => String(value).toLowerCase().trim())
    : [];

  const permsFromJunction = Array.isArray(membership.roles?.role_permissions)
    ? membership.roles.role_permissions
        .map((row) => String(row?.permissions?.key || '').toLowerCase().trim())
        .filter(Boolean)
    : [];

  const permissions = new Set([...permsFromArray, ...permsFromJunction]);

  return INVITE_ALLOWED_ROLE_NAMES.has(roleName)
    || [...permissions].some((key) => INVITE_ALLOWED_PERMISSION_KEYS.has(key));
}

/** Whether a user may create or resend team/org invites for an organization. */
export async function canManageOrganizationInvites(
  supabase: {
    from: (table: string) => any;
  },
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select('program_id, role_id, roles(name, permissions, role_permissions(permissions(key)))')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !memberships?.length) {
    return false;
  }

  // Users with an explicit managing role/permission. Covers built-in roles (Admin / Program
  // Manager / Owner / Superadmin) as well as custom roles granted manage_teams / manage_programs.
  if (memberships.some(membershipHasInvitePermission)) {
    return true;
  }

  // Org-level staff/owners hold an active organization-wide membership (program_id IS NULL).
  // Founders are created this way at org setup, frequently without a role_id or with a custom
  // owner role (e.g. "CEO"), so we treat any org-wide membership as eligible to invite.
  if (memberships.some((membership) => membership.program_id == null)) {
    return true;
  }

  // Fallback for owners whose home organization is this org (e.g. founders whose membership row
  // ended up program-scoped). Still requires an active membership above, so revoked users — whose
  // membership is deleted and profile link cleared on removal — never reach this branch.
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();

  return profile?.organization_id === organizationId;
}
