import { describe, expect, it } from 'vitest';

/**
 * Mirrors server/railway programAccess.getAccessiblePrograms filtering rules.
 * Kept as a pure helper test so Railway parity stays cheap to verify.
 */
function filterAccessibleProgramIds(
  membershipProgramIds: Array<string | null>,
  allProgramIds: string[],
): string[] {
  if (membershipProgramIds.some((id) => id == null)) {
    return allProgramIds;
  }
  const scoped = new Set(membershipProgramIds.filter((id): id is string => typeof id === 'string'));
  return allProgramIds.filter((id) => scoped.has(id));
}

describe('accessible program filter', () => {
  it('returns all programs for org-wide membership', () => {
    expect(filterAccessibleProgramIds([null], ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('returns only scoped programs for program memberships', () => {
    expect(filterAccessibleProgramIds(['b'], ['a', 'b', 'c'])).toEqual(['b']);
  });

  it('returns empty when scoped ids do not match any program', () => {
    expect(filterAccessibleProgramIds(['missing'], ['a', 'b'])).toEqual([]);
  });
});
