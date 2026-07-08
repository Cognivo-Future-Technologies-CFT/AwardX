import { canManageOrganizationInvites } from '../../lib/orgAccess';

export async function canManageInvites(supabase: any, userId: string, organizationId: string) {
  return canManageOrganizationInvites(supabase, userId, organizationId);
}
