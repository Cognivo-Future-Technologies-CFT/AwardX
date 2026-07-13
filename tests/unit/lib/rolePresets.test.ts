import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSION_KEYS,
  ROLE_PRESETS,
  resolvePermissionKeysForStorage,
} from '../../../lib/rolePresets';

describe('rolePresets', () => {
  it('expands all into concrete permission keys', () => {
    expect(resolvePermissionKeysForStorage(['all'])).toEqual(ALL_PERMISSION_KEYS);
  });

  it('dedupes and ignores blanks', () => {
    expect(resolvePermissionKeysForStorage(['view_overview', 'view_overview', ''])).toEqual([
      'view_overview',
    ]);
  });

  it('every preset includes at least one permission', () => {
    for (const preset of ROLE_PRESETS) {
      expect(preset.permissions.length).toBeGreaterThan(0);
    }
  });

  it('admin preset includes all concrete keys', () => {
    const admin = ROLE_PRESETS.find((p) => p.key === 'admin');
    expect(admin?.permissions).toEqual(ALL_PERMISSION_KEYS);
  });
});
