import { enforceRateLimit, getClientIp } from '../_utils/rateLimit';
import { verifyTeamSchema } from '../_utils/validation';
import { createSupabaseAdmin } from '../_utils/supabaseAdmin';
import { getAuthenticatedUser } from '../_utils/authUser';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function normalizeInviteToken(raw: unknown): string {
  if (!raw) return '';
  const text = (() => {
    try {
      return decodeURIComponent(String(raw));
    } catch {
      return String(raw);
    }
  })().trim();

  const directMatch = text.match(UUID_RE);
  if (directMatch?.[0]) return directMatch[0];

  try {
    const maybeUrl = new URL(text);
    const queryCandidate = maybeUrl.searchParams.get('teamInviteToken') || maybeUrl.searchParams.get('token') || maybeUrl.searchParams.get('inviteToken');
    const queryMatch = queryCandidate?.match(UUID_RE);
    if (queryMatch?.[0]) return queryMatch[0];
    const pathMatch = maybeUrl.pathname.match(UUID_RE);
    if (pathMatch?.[0]) return pathMatch[0];
  } catch {
    // Not a URL, ignore.
  }

  return '';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const ip = getClientIp(req);
  const rateLimit = enforceRateLimit(`verify-team:${ip}`, 10, 15 * 60 * 1000);
  if (!rateLimit.ok) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    return;
  }

  const tokenCandidate = req.method === 'GET' ? (req.query?.token || req.query?.teamInviteToken || req.query?.inviteToken || req.query?.url) : req.body?.token;
  const normalizedToken = normalizeInviteToken(tokenCandidate);
  const parsed = verifyTeamSchema.safeParse({ token: normalizedToken });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid token format', details: parsed.error.flatten() });
    return;
  }

  const { token } = parsed.data;
  const supabase = createSupabaseAdmin();

  try {
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .select('id, organization_id, program_id, role_id, invited_by, email, status, accepted_at')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      res.status(404).json({ error: 'Invalid or expired invite link.' });
      return;
    }

    if (invite.status === 'accepted' || invite.accepted_at) {
      res.status(403).json({ error: 'This invite has already been accepted.' });
      return;
    }

    const auth = await getAuthenticatedUser(req);
    if (!auth.user) {
      // Allow frontend to show invite context before auth, but do not accept yet.
      res.status(401).json({
        error: 'Authentication required to accept invite',
        requiresAuth: true,
        invite: {
          organizationId: invite.organization_id,
          programId: invite.program_id,
          email: invite.email,
        },
      });
      return;
    }

    const inviteEmail = String(invite.email || '').toLowerCase().trim();
    const authEmail = String(auth.user.email || '').toLowerCase().trim();
    if (!authEmail || authEmail !== inviteEmail) {
      res.status(403).json({ error: 'This invite is for a different email address.' });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', auth.user.id)
      .maybeSingle();

    const profileEmail = String(profile?.email || '').toLowerCase().trim();
    if (profileEmail && profileEmail !== inviteEmail) {
      res.status(403).json({ error: 'This invite is for a different email address.' });
      return;
    }

    const acceptedAt = new Date().toISOString();

    const { error: profileUpsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: auth.user.id,
          email: inviteEmail,
          full_name: profile?.full_name || auth.user.user_metadata?.full_name || auth.user.user_metadata?.name || authEmail.split('@')[0] || 'User',
          organization_id: invite.organization_id,
        },
        { onConflict: 'id' },
      );

    if (profileUpsertError) {
      res.status(500).json({ error: profileUpsertError.message || 'Failed to link user profile' });
      return;
    }

    const { error: memberUpsertError } = await supabase
      .from('organization_members')
      .upsert(
        {
          organization_id: invite.organization_id,
          program_id: invite.program_id,
          user_id: auth.user.id,
          role_id: invite.role_id,
          status: 'active',
          invited_at: acceptedAt,
          joined_at: acceptedAt,
          invited_by: invite.invited_by || null,
        },
        { onConflict: 'organization_id,user_id,program_id' },
      );

    if (memberUpsertError) {
      res.status(500).json({ error: memberUpsertError.message || 'Failed to add team member' });
      return;
    }

    const { error: updateInviteError } = await supabase
      .from('organization_invites')
      .update({
        status: 'accepted',
        accepted_at: acceptedAt,
      })
      .eq('id', invite.id)
      .eq('status', 'pending');

    if (updateInviteError) {
      res.status(500).json({ error: updateInviteError.message || 'Failed to accept invite' });
      return;
    }

    res.json({ ok: true, accepted: true });
  } catch (error: any) {
    console.error('Verify team invite error:', error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
