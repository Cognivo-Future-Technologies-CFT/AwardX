import type { User } from '@supabase/supabase-js';

export type UserProfileSnapshot = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role?: string;
};

const PROFILE_CACHE_KEY = 'awardx:user-profile-v1';

export function resolveAuthDisplayName(user: Pick<User, 'email' | 'user_metadata'>): string {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = typeof metadata?.full_name === 'string' ? metadata.full_name.trim() : '';
  if (fullName) return fullName;

  const name = typeof metadata?.name === 'string' ? metadata.name.trim() : '';
  if (name) return name;

  const email = user.email?.trim();
  if (email) return email.split('@')[0];

  return '';
}

export function resolveAuthAvatar(user: Pick<User, 'user_metadata'>): string {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const avatarUrl = typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : '';
  if (avatarUrl) return avatarUrl;

  const picture = typeof metadata?.picture === 'string' ? metadata.picture : '';
  return picture || '';
}

export function authUserToSnapshot(user: User): UserProfileSnapshot {
  return {
    id: user.id,
    name: resolveAuthDisplayName(user),
    email: user.email || '',
    avatar: resolveAuthAvatar(user),
  };
}

export function getCachedUserProfile(userId: string): UserProfileSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as UserProfileSnapshot;
    if (!parsed?.id || parsed.id !== userId) return null;

    return {
      id: parsed.id,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      avatar: typeof parsed.avatar === 'string' ? parsed.avatar : '',
      role: typeof parsed.role === 'string' ? parsed.role : undefined,
    };
  } catch {
    return null;
  }
}

export function setCachedUserProfile(profile: UserProfileSnapshot): void {
  if (typeof window === 'undefined' || !profile.id || !profile.name) return;

  try {
    window.sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota or privacy mode errors.
  }
}

export function clearCachedUserProfile(): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function getProfileInitial(profile: UserProfileSnapshot | null | undefined): string {
  const trimmed = profile?.name?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '';
}
