import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  authUserToSnapshot,
  clearCachedUserProfile,
  getCachedUserProfile,
  resolveAuthDisplayName,
  setCachedUserProfile,
} from '../../../lib/userProfile';

describe('userProfile', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('resolves display names without using a generic placeholder', () => {
    expect(
      resolveAuthDisplayName({
        email: 'alex@example.com',
        user_metadata: { full_name: 'Alex Morgan' },
      }),
    ).toBe('Alex Morgan');

    expect(
      resolveAuthDisplayName({
        email: 'alex@example.com',
        user_metadata: {},
      }),
    ).toBe('alex');

    expect(
      resolveAuthDisplayName({
        email: undefined,
        user_metadata: {},
      }),
    ).toBe('');
  });

  it('caches and restores profile snapshots per user id', () => {
    const snapshot = {
      id: 'user-1',
      name: 'Alex Morgan',
      email: 'alex@example.com',
      avatar: '',
      role: 'Admin',
    };

    setCachedUserProfile(snapshot);
    expect(getCachedUserProfile('user-1')).toEqual(snapshot);
    expect(getCachedUserProfile('user-2')).toBeNull();
  });

  it('clears cached profile data', () => {
    setCachedUserProfile({
      id: 'user-1',
      name: 'Alex Morgan',
      email: 'alex@example.com',
      avatar: '',
    });
    clearCachedUserProfile();
    expect(getCachedUserProfile('user-1')).toBeNull();
  });

  it('builds auth snapshots from user metadata', () => {
    expect(
      authUserToSnapshot({
        id: 'user-1',
        email: 'alex@example.com',
        user_metadata: { full_name: 'Alex Morgan', avatar_url: 'https://cdn.example/avatar.png' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual({
      id: 'user-1',
      name: 'Alex Morgan',
      email: 'alex@example.com',
      avatar: 'https://cdn.example/avatar.png',
    });
  });
});
