import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { auth } from '../services/supabase';
import {
  getCachedSession,
  getCurrentOrgId,
  setCachedSession,
  subscribeAuthState,
  subscribeOrgContext,
} from '../services/userContext';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  userId: string | null;
  orgId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const currentSession = await getCachedSession();
      if (!mounted) {
        return;
      }
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    };

    void initialize();

    const unsubscribe = subscribeAuthState((_event, nextSession) => {
      if (!mounted) {
        return;
      }
      setCachedSession(nextSession);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setOrgId(null);
      return;
    }

    let cancelled = false;
    void getCurrentOrgId().then((resolvedOrgId) => {
      if (!cancelled) {
        setOrgId(resolvedOrgId);
      }
    });

    const unsubscribeOrg = subscribeOrgContext((nextOrgId) => {
      if (!cancelled) {
        setOrgId(nextOrgId);
      }
    });

    return () => {
      cancelled = true;
      unsubscribeOrg();
    };
  }, [user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      userId: user?.id ?? null,
      orgId,
      isAuthenticated: !!session,
      isLoading,
      signOut: async () => {
        await auth.signOut();
      },
    }),
    [isLoading, orgId, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
