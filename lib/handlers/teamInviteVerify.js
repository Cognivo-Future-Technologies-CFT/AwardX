import { serviceJson } from '../serviceResult.js';
export async function resolveTeamInvite(supabase, token) {
    const { data: invite, error: inviteError } = await supabase
        .from('organization_invites')
        .select('id, organization_id, program_id, role_id, invited_by, email, status, accepted_at, expires_at')
        .eq('token', token)
        .single();
    if (inviteError || !invite) {
        return { error: 'Invalid or expired invite link.', statusCode: 404 };
    }
    if (invite.status === 'accepted' || invite.accepted_at) {
        return { error: 'This invite has already been accepted.', statusCode: 403 };
    }
    if (invite.status === 'expired' || (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now())) {
        await supabase
            .from('organization_invites')
            .update({ status: 'expired', accepted_at: null })
            .eq('id', invite.id)
            .eq('status', 'pending');
        return { error: 'This invite has expired.', statusCode: 403 };
    }
    return { invite: invite };
}
async function organizationNameForInvite(supabase, organizationId) {
    const { data: org } = await supabase.from('organizations').select('name').eq('id', organizationId).maybeSingle();
    return org?.name || 'Organization';
}
function inviteContext(invite, organizationName) {
    return {
        organizationId: invite.organization_id,
        organizationName,
        programId: invite.program_id,
        email: invite.email,
    };
}
export async function verifyTeamInviteGet(supabase, token, user) {
    const resolved = await resolveTeamInvite(supabase, token);
    if ('error' in resolved) {
        return serviceJson(resolved.statusCode || 404, { error: resolved.error });
    }
    const organizationName = await organizationNameForInvite(supabase, resolved.invite.organization_id);
    if (!user) {
        return serviceJson(401, {
            error: 'Authentication required to accept invite',
            requiresAuth: true,
            invite: inviteContext(resolved.invite, organizationName),
        });
    }
    const inviteEmail = String(resolved.invite.email || '').toLowerCase().trim();
    const authEmail = String(user.email || '').toLowerCase().trim();
    if (!authEmail || authEmail !== inviteEmail) {
        return serviceJson(403, { error: 'This invite is for a different email address.' });
    }
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', user.id)
        .maybeSingle();
    const profileEmail = String(profile?.email || '').toLowerCase().trim();
    if (profileEmail && profileEmail !== inviteEmail) {
        return serviceJson(403, { error: 'This invite is for a different email address.' });
    }
    return serviceJson(200, {
        ok: true,
        requiresAcceptance: true,
        invite: inviteContext(resolved.invite, organizationName),
    });
}
export async function verifyTeamInvitePost(supabase, token, action, user) {
    const normalizedAction = String(action || 'accept').trim().toLowerCase();
    if (normalizedAction !== 'accept' && normalizedAction !== 'decline') {
        return serviceJson(400, { error: 'Invalid action parameter' });
    }
    if (!user) {
        return serviceJson(401, { error: 'Authentication required to accept invite', requiresAuth: true });
    }
    const resolved = await resolveTeamInvite(supabase, token);
    if ('error' in resolved) {
        if (resolved.statusCode === 403 &&
            resolved.error === 'This invite has already been accepted.') {
            const { data: acceptedInvite } = await supabase
                .from('organization_invites')
                .select('organization_id')
                .eq('token', token)
                .maybeSingle();
            const { data: existingMember } = await supabase
                .from('organization_members')
                .select('id')
                .eq('organization_id', acceptedInvite?.organization_id || null)
                .eq('user_id', user.id)
                .maybeSingle();
            if (existingMember?.id) {
                return serviceJson(200, { ok: true, accepted: true, alreadyAccepted: true });
            }
        }
        return serviceJson(resolved.statusCode || 404, { error: resolved.error });
    }
    const inviteEmail = String(resolved.invite.email || '').toLowerCase().trim();
    const authEmail = String(user.email || '').toLowerCase().trim();
    if (!authEmail || authEmail !== inviteEmail) {
        return serviceJson(403, { error: 'This invite is for a different email address.' });
    }
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', user.id)
        .maybeSingle();
    const profileEmail = String(profile?.email || '').toLowerCase().trim();
    if (profileEmail && profileEmail !== inviteEmail) {
        return serviceJson(403, { error: 'This invite is for a different email address.' });
    }
    if (normalizedAction === 'decline') {
        const { error: declineError } = await supabase
            .from('organization_invites')
            .update({ status: 'declined', accepted_at: null })
            .eq('id', resolved.invite.id)
            .eq('status', 'pending');
        if (declineError) {
            return serviceJson(500, { error: declineError.message || 'Failed to decline invite' });
        }
        return serviceJson(200, { ok: true, declined: true });
    }
    const profileName = profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        inviteEmail.split('@')[0] ||
        'User';
    const { data: acceptanceResult, error: acceptError } = await supabase.rpc('accept_organization_invite', {
        p_token: token,
        p_user_id: user.id,
        p_user_email: inviteEmail,
        p_user_full_name: profileName,
    });
    if (acceptError) {
        return serviceJson(500, { error: acceptError.message || 'Failed to accept invite' });
    }
    const resultRow = Array.isArray(acceptanceResult) ? acceptanceResult[0] : acceptanceResult;
    if (!resultRow?.ok) {
        const reason = resultRow?.error || 'accept_failed';
        if (reason === 'already_processed') {
            return serviceJson(200, { ok: true, accepted: true, alreadyAccepted: true });
        }
        if (reason === 'expired') {
            return serviceJson(403, { error: 'This invite has expired.' });
        }
        if (reason === 'email_mismatch') {
            return serviceJson(403, { error: 'This invite is for a different email address.' });
        }
        return serviceJson(500, { error: 'Failed to accept invite' });
    }
    return serviceJson(200, { ok: true, accepted: true });
}
