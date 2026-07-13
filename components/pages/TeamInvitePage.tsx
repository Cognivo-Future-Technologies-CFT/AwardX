import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Mail, UserPlus, XCircle } from 'lucide-react';
import { auth, refreshUserCache, setActiveOrganization } from '../../services/supabase';
import { db as databaseService } from '../../services/database';
import { resolveBackendPath } from '../../services/backendApi';
import { buildDashboardPath } from '../../lib/dashboardRoutes';
import { consumePostAuthRedirect, sanitizeRedirectPath, storePostAuthRedirect } from '../../lib/safeRedirect';

type InviteContext = {
  organizationId?: string;
  organizationName?: string;
  programId?: string;
  email?: string;
};

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function normalizeInviteToken(raw?: string | null): string {
  if (!raw) return '';
  const decoded = (() => {
    try {
      return decodeURIComponent(String(raw));
    } catch {
      return String(raw);
    }
  })().trim();

  const directMatch = decoded.match(UUID_RE);
  if (directMatch?.[0]) return directMatch[0];

  try {
    const maybeUrl = new URL(decoded);
    const fromQuery = maybeUrl.searchParams.get('teamInviteToken') || maybeUrl.searchParams.get('token') || maybeUrl.searchParams.get('inviteToken');
    const queryMatch = fromQuery?.match(UUID_RE);
    if (queryMatch?.[0]) return queryMatch[0];
    const pathMatch = maybeUrl.pathname.match(UUID_RE);
    if (pathMatch?.[0]) return pathMatch[0];
  } catch {
    // ignore non-URL values
  }

  return '';
}

function getInviteToken(pathToken?: string) {
  const params = new URLSearchParams(window.location.search);
  const candidates = [
    pathToken,
    params.get('teamInviteToken'),
    params.get('token'),
    params.get('inviteToken'),
    params.get('url'),
  ];

  for (const candidate of candidates) {
    const token = normalizeInviteToken(candidate);
    if (token) return token;
  }

  return '';
}

export const TeamInvitePage: React.FC = () => {
  const { token: pathToken } = useParams<{ token?: string }>();
  const location = useLocation();
  const token = React.useMemo(() => getInviteToken(pathToken), [pathToken, location.search]);
  const navigate = useNavigate();

  const [checking, setChecking] = React.useState(true);
  const [accepting, setAccepting] = React.useState(false);
  const [accepted, setAccepted] = React.useState(false);
  const [declining, setDeclining] = React.useState(false);
  const [declined, setDeclined] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [invite, setInvite] = React.useState<InviteContext | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    if (!pathToken && token) {
      navigate(`/team-invite/${token}`, { replace: true });
    }
  }, [navigate, pathToken, token]);

  React.useEffect(() => {
    const checkInvite = async () => {
      if (!token) {
        setError('Missing invite token.');
        setChecking(false);
        return;
      }

      setChecking(true);
      setError(null);

      try {
        const { session } = await auth.getSession();
        const accessToken = session?.access_token;
        setIsAuthenticated(!!accessToken);

        const resp = await fetch(resolveBackendPath(`/api/invites/verify-team?token=${encodeURIComponent(token)}`), {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
        const body = await resp.json().catch(() => ({}));

        if (resp.status === 401 && body?.requiresAuth) {
          setInvite(body?.invite || null);
          setIsAuthenticated(false);
          setChecking(false);
          return;
        }

        if (!resp.ok) {
          setError(body?.error || 'Invalid or expired invite link.');
          setChecking(false);
          return;
        }

        setInvite(body?.invite || null);
        setIsAuthenticated(true);
      } catch (e: any) {
        setError(e?.message || 'Failed to verify invite.');
      } finally {
        setChecking(false);
      }
    };

    void checkInvite();
  }, [token]);

  const nextPath = `/team-invite/${token}`;

  const acceptInvite = React.useCallback(async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);

    try {
      const { session } = await auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        storePostAuthRedirect(nextPath);
        navigate(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const resp = await fetch(resolveBackendPath('/api/invites/verify-team'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token, action: 'accept' }),
      });

      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(body?.error || 'Failed to accept invite.');
        return;
      }

      const organizationId = body?.organizationId || invite?.organizationId || null;
      const programId = body?.programId || invite?.programId || null;

      try {
        await refreshUserCache();
        if (organizationId) {
          await setActiveOrganization(organizationId);
          await databaseService.setActiveOrganization(organizationId);
        }
        if (programId) {
          await databaseService.setActiveProgram(programId);
        }
      } catch (cacheErr) {
        console.warn('Failed to refresh workspace after invite accept:', cacheErr);
      }

      setAccepted(true);
      const nextDashboard = programId
        ? buildDashboardPath({ eventId: programId, view: 'overview' })
        : '/dashboard';
      setTimeout(() => navigate(nextDashboard, { replace: true }), 1500);
    } catch (e: any) {
      setError(e?.message || 'Failed to accept invite.');
    } finally {
      setAccepting(false);
    }
  }, [navigate, nextPath, token]);

  const declineInvite = React.useCallback(async () => {
    if (!token) return;
    setDeclining(true);
    setError(null);

    try {
      const { session } = await auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        storePostAuthRedirect(nextPath);
        navigate(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const resp = await fetch(resolveBackendPath('/api/invites/verify-team'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token, action: 'decline' }),
      });

      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setError(body?.error || 'Failed to decline invite.');
        return;
      }

      setDeclined(true);
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (e: any) {
      setError(e?.message || 'Failed to decline invite.');
    } finally {
      setDeclining(false);
    }
  }, [navigate, nextPath, token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        {checking ? (
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
            <h1 className="text-xl font-bold text-slate-900">Checking invite...</h1>
            <p className="text-slate-500 mt-1">Please wait a moment.</p>
          </div>
        ) : accepted ? (
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-slate-900">Invite Accepted</h1>
            <p className="text-slate-500 mt-1">You have been added to the team. Redirecting to your dashboard...</p>
          </div>
        ) : declined ? (
          <div className="text-center">
            <CheckCircle2 className="w-10 h-10 text-rose-600 mx-auto mb-3 animate-pulse" />
            <h1 className="text-xl font-bold text-slate-900">Invite Declined</h1>
            <p className="text-slate-500 mt-1">You have declined the team invitation. Redirecting...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <XCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-slate-900">Invite Issue</h1>
            <p className="text-slate-600 mt-1">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-5 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              Go Home
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Team Invitation</h1>
                <p className="text-sm text-slate-500">
                  You have been invited to join{' '}
                  <span className="font-semibold text-indigo-600">
                    {invite?.organizationName || 'a team'}
                  </span>
                  .
                </p>
              </div>
            </div>

            {invite?.email && (
              <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                Invite sent to: <span className="font-semibold">{invite.email}</span>
              </div>
            )}

            <p className="text-sm text-slate-600 mb-6">
              {isAuthenticated
                ? 'Please confirm whether you would like to accept or decline this team invitation.'
                : 'Sign in with the invited email address, then accept this request to be added as a team member.'}
            </p>

            <div className="flex flex-wrap gap-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={acceptInvite}
                    disabled={accepting || declining}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Accept Request
                  </button>
                  <button
                    onClick={declineInvite}
                    disabled={accepting || declining}
                    className="px-5 py-2.5 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {declining ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Decline
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      storePostAuthRedirect(nextPath);
                      navigate(`/login?next=${encodeURIComponent(nextPath)}`);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
                  >
                    Log In to Accept
                  </button>
                  <button
                    onClick={() => {
                      storePostAuthRedirect(nextPath);
                      navigate(`/signup?next=${encodeURIComponent(nextPath)}`);
                    }}
                    className="px-5 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
