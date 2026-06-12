const ALLOWED_ROLE_NAMES = new Set(['admin', 'program manager']);
const ALLOWED_PERMISSION_KEYS = new Set(['manage_teams', 'manage_programs']);

export async function canManageInvites(supabase: any, userId: string, organizationId: string) {
  // First, check if the user is the organization owner (defined by profiles table)
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile && profile.organization_id === organizationId) {
    const { count: activeMembershipCount } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('status', 'active');

    if ((activeMembershipCount || 0) === 0) {
      return true;
    }
  }

  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select('status, roles(name, permissions)')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !memberships || memberships.length === 0) {
    return false;
  }

  return memberships.some((membership: any) => {
    const roleName = String(membership.roles?.name || '').toLowerCase().trim();
    const rolePermissions = Array.isArray(membership.roles?.permissions)
      ? membership.roles.permissions.map((value: unknown) => String(value).toLowerCase().trim())
      : [];

    return ALLOWED_ROLE_NAMES.has(roleName) || rolePermissions.some((key: string) => ALLOWED_PERMISSION_KEYS.has(key));
  });
}
