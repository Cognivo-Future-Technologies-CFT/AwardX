import { describe, expect, it } from 'vitest';

/** Mirrors ensureHasProgramPermission matching rules (any-of required keys). */
function roleAllows(permissions: string[], required: string[], privileged = false): boolean {
  if (privileged) return true;
  const set = new Set(permissions.map((p) => p.toLowerCase()));
  if (set.has('all')) return true;
  return required.some((key) => set.has(key.toLowerCase()));
}

describe('custom role page permissions', () => {
  const customRole = ['manage_forms', 'manage_programs', 'view_submissions'];

  it('allows form builder with manage_forms', () => {
    expect(roleAllows(customRole, ['manage_forms'])).toBe(true);
  });

  it('allows program details with manage_programs', () => {
    expect(roleAllows(customRole, ['manage_programs'])).toBe(true);
  });

  it('allows submissions with view_submissions', () => {
    expect(roleAllows(customRole, ['view_submissions', 'manage_submissions'])).toBe(true);
  });

  it('denies teams page without manage_teams', () => {
    expect(roleAllows(customRole, ['manage_teams'])).toBe(false);
  });

  it('denies empty custom role', () => {
    expect(roleAllows([], ['manage_forms'])).toBe(false);
  });
});
