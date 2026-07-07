import { canManageOrganizationInvites } from '../../lib/orgAccess';
export async function canManageInvites(supabase, userId, organizationId) {
    return canManageOrganizationInvites(supabase, userId, organizationId);
}
