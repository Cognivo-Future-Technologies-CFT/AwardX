import type { Session } from '@supabase/supabase-js';
import { hasPendingAuthCallback } from '../lib/siteUrl';
import { getSupabaseClient } from './supabaseClient';

const USER_CONTEXT_TTL_MS = 45_000;
const ORG_DETAILS_TTL_MS = 45_000;

type CachedUserContext = {
  userId: string | null;
  orgId: string | null;
  fetchedAt: number;
};

export type OrganizationSummary = {
  id: string;
  name?: string | null;
  slug?: string | null;
  logo_url?: string | null;
  website?: string | null;
  industry?: string | null;
  plan?: string | null;
};

type CachedOrganizationDetails = {
  orgId: string;
  data: OrganizationSummary;
  fetchedAt: number;
};

type AuthStateListener = (event: string, session: Session | null) => void;
type OrgContextListener = (orgId: string | null) => void;

let cachedUserContext: CachedUserContext | null = null;
let cachedUserContextPromise: Promise<CachedUserContext> | null = null;
let cachedOrganizationDetails: CachedOrganizationDetails | null = null;
let activeOrganizationOverride: string | null = null;

/** `undefined` = not hydrated yet; `null` = signed out. */
let cachedSession: Session | null | undefined;
let sessionHydrationPromise: Promise<Session | null> | null = null;

const authStateListeners = new Set<AuthStateListener>();
const orgContextListeners = new Set<OrgContextListener>();
let authListenerRegistered = false;

export const isAuthUnauthorizedError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const status = (error as { status?: number }).status;
  const message = String((error as { message?: string }).message || '').toLowerCase();
  return status === 401 || message.includes('invalid jwt') || message.includes('jwt expired');
};

export const setCachedSession = (session: Session | null) => {
  cachedSession = session;
};

export const invalidateSessionCache = () => {
  cachedSession = undefined;
  sessionHydrationPromise = null;
};

const shouldBypassSessionCache = (): boolean => hasPendingAuthCallback();

export const refreshSessionFromAuth = async (): Promise<Session | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    cachedSession = null;
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  cachedSession = session;
  return session;
};

export const getCachedSession = async (forceRefresh = false): Promise<Session | null> => {
  if (!forceRefresh && !shouldBypassSessionCache() && cachedSession !== undefined) {
    return cachedSession;
  }

  if (sessionHydrationPromise) {
    return sessionHydrationPromise;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    cachedSession = null;
    return null;
  }

  const hydration = refreshSessionFromAuth();

  sessionHydrationPromise = hydration;
  try {
    return await hydration;
  } finally {
    if (sessionHydrationPromise === hydration) {
      sessionHydrationPromise = null;
    }
  }
};

export const getAccessToken = async (): Promise<string | undefined> => {
  const session = await getCachedSession();
  return session?.access_token;
};

const clearStaleAuthSession = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // ignore — storage may already be empty
  }
  clearUserCache();
};

export const resolveUserContext = async (forceRefresh = false): Promise<CachedUserContext> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { userId: null, orgId: null, fetchedAt: Date.now() };
  }

  const now = Date.now();
  if (!forceRefresh && cachedUserContext && now - cachedUserContext.fetchedAt < USER_CONTEXT_TTL_MS) {
    return cachedUserContext;
  }

  if (!forceRefresh && cachedUserContextPromise) {
    return cachedUserContextPromise;
  }

  const resolver = (async (): Promise<CachedUserContext> => {
    const session = await getCachedSession();
    let userId = session?.user?.id || null;

    if (!userId && session?.access_token) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError && isAuthUnauthorizedError(userError)) {
        await clearStaleAuthSession();
        const next = { userId: null, orgId: null, fetchedAt: Date.now() };
        cachedUserContext = next;
        return next;
      }
      userId = user?.id || null;
      if (user && session) {
        setCachedSession({ ...session, user });
      }
    }

    if (!userId) {
      const next = { userId: null, orgId: null, fetchedAt: Date.now() };
      cachedUserContext = next;
      return next;
    }

    let orgId: string | null = activeOrganizationOverride;

    if (!orgId) {
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id, joined_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (!membershipError && memberships && memberships.length > 0) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .maybeSingle();

        const profileOrgId = !profileError ? profile?.organization_id : null;
        const hasActiveProfileOrg = profileOrgId
          && memberships.some((membership) => membership.organization_id === profileOrgId);

        orgId = hasActiveProfileOrg
          ? profileOrgId!
          : memberships[0].organization_id;

        if (orgId && profileOrgId !== orgId) {
          void supabase.from('profiles').update({ organization_id: orgId }).eq('id', userId);
        }
      } else {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .maybeSingle();

        if (!profileError && profile?.organization_id) {
          void supabase.from('profiles').update({ organization_id: null }).eq('id', userId);
        }
      }
    }

    const next = { userId, orgId, fetchedAt: Date.now() };
    cachedUserContext = next;
    return next;
  })();

  cachedUserContextPromise = resolver;
  try {
    return await resolver;
  } finally {
    if (cachedUserContextPromise === resolver) {
      cachedUserContextPromise = null;
    }
  }
};

export const getCurrentUserId = async (): Promise<string | null> => {
  const context = await resolveUserContext();
  return context.userId;
};

export const getCurrentOrgId = async (): Promise<string | null> => {
  const context = await resolveUserContext();
  return context.orgId;
};

export const clearUserCache = () => {
  cachedUserContext = null;
  cachedUserContextPromise = null;
  cachedOrganizationDetails = null;
  activeOrganizationOverride = null;
};

export const setActiveOrganization = (orgId: string | null) => {
  activeOrganizationOverride = orgId;
  if (cachedUserContext) {
    cachedUserContext = {
      ...cachedUserContext,
      orgId,
      fetchedAt: Date.now(),
    };
  }
  cachedOrganizationDetails = null;
  orgContextListeners.forEach((listener) => listener(orgId));
};

export const subscribeOrgContext = (listener: OrgContextListener): (() => void) => {
  orgContextListeners.add(listener);
  return () => {
    orgContextListeners.delete(listener);
  };
};

export const refreshUserCache = async () => {
  await resolveUserContext(true);
};

export const getCachedOrganizationDetails = (): CachedOrganizationDetails | null => {
  if (
    !cachedOrganizationDetails ||
    Date.now() - cachedOrganizationDetails.fetchedAt >= ORG_DETAILS_TTL_MS
  ) {
    return null;
  }
  return cachedOrganizationDetails;
};

export const setCachedOrganizationDetails = (orgId: string, data: OrganizationSummary) => {
  cachedOrganizationDetails = {
    orgId,
    data,
    fetchedAt: Date.now(),
  };
};

export const subscribeAuthState = (listener: AuthStateListener): (() => void) => {
  ensureAuthListener();
  authStateListeners.add(listener);
  return () => {
    authStateListeners.delete(listener);
  };
};

const ensureAuthListener = () => {
  if (authListenerRegistered) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  authListenerRegistered = true;
  supabase.auth.onAuthStateChange((event, session) => {
    setCachedSession(session);

    if (
      event === 'SIGNED_IN' ||
      event === 'SIGNED_OUT' ||
      event === 'TOKEN_REFRESHED' ||
      event === 'USER_UPDATED' ||
      event === 'PASSWORD_RECOVERY'
    ) {
      clearUserCache();
    }

    authStateListeners.forEach((listener) => listener(event, session));
  });
};

ensureAuthListener();
