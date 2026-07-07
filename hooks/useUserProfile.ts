import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  authUserToSnapshot,
  clearCachedUserProfile,
  getCachedUserProfile,
  setCachedUserProfile,
  type UserProfileSnapshot,
} from '../lib/userProfile';

type UseUserProfileOptions = {
  fetchFullProfile?: () => Promise<UserProfileSnapshot | null>;
  enabled?: boolean;
};

export function useUserProfile(options: UseUserProfileOptions = {}) {
  const { enabled = true } = options;
  const fetchFullProfileRef = useRef(options.fetchFullProfile);
  fetchFullProfileRef.current = options.fetchFullProfile;

  const { user, isAuthenticated, isLoading: isAuthLoading, isSigningOut } = useAuth();
  const [profile, setProfile] = useState<UserProfileSnapshot | null>(() => {
    if (!enabled || !user?.id) return null;
    return getCachedUserProfile(user.id);
  });
  const [isProfileLoading, setIsProfileLoading] = useState(() => {
    if (!enabled || !user?.id) return false;
    return !getCachedUserProfile(user.id);
  });

  useEffect(() => {
    if (!enabled) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      if (!isSigningOut) {
        setProfile(null);
        clearCachedUserProfile();
      }
      setIsProfileLoading(false);
      return;
    }

    const cached = getCachedUserProfile(user.id);
    if (cached) {
      setProfile(cached);
    } else {
      const interim = authUserToSnapshot(user);
      if (interim.name) {
        setProfile(interim);
      }
    }

    if (!fetchFullProfileRef.current) {
      const snapshot = cached || authUserToSnapshot(user);
      if (snapshot.name) {
        setProfile(snapshot);
        setCachedUserProfile(snapshot);
      }
      setIsProfileLoading(false);
      return;
    }

    let cancelled = false;
    setIsProfileLoading(!cached?.name);

    const loadProfile = async () => {
      try {
        const fullProfile = await fetchFullProfileRef.current!();
        if (cancelled) return;

        if (fullProfile?.name) {
          setProfile(fullProfile);
          setCachedUserProfile(fullProfile);
          return;
        }

        const fallback = cached || authUserToSnapshot(user);
        if (fallback.name) {
          setProfile(fallback);
          setCachedUserProfile(fallback);
        }
      } catch {
        if (cancelled) return;
        const fallback = cached || authUserToSnapshot(user);
        if (fallback.name) {
          setProfile(fallback);
        }
      } finally {
        if (!cancelled) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    isAuthLoading,
    isAuthenticated,
    isSigningOut,
    user?.id,
  ]);

  const displayProfile = useMemo(() => {
    if (isSigningOut) return profile;
    if (!isAuthenticated) return null;
    return profile;
  }, [isAuthenticated, isSigningOut, profile]);

  const isLoading = enabled && (isAuthLoading || ((isAuthenticated || isSigningOut) && isProfileLoading && !displayProfile?.name));

  return {
    profile: displayProfile,
    isLoading,
    isAuthenticated: isAuthenticated || isSigningOut,
    isSigningOut,
  };
}
