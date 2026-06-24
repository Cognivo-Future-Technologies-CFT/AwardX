import { describe, expect, it } from 'vitest';
import {
  buildDashboardPath,
  legacyDashboardQueryToPath,
  parseDashboardPath,
} from '../../../lib/dashboardRoutes';

describe('dashboardRoutes', () => {
  it('builds event hub and overview paths', () => {
    expect(buildDashboardPath({})).toBe('/dashboard');
    expect(buildDashboardPath({ eventId: 'evt-1' })).toBe('/dashboard/events/evt-1');
    expect(buildDashboardPath({ eventId: 'evt-1', view: 'overview' })).toBe('/dashboard/events/evt-1');
  });

  it('builds operation and settings paths', () => {
    expect(buildDashboardPath({ eventId: 'evt-1', view: 'submissions' })).toBe(
      '/dashboard/events/evt-1/submissions',
    );
    expect(buildDashboardPath({ eventId: 'evt-1', view: 'settings' })).toBe(
      '/dashboard/events/evt-1/settings',
    );
    expect(buildDashboardPath({ eventId: 'evt-1', view: 'settings', settingsTab: 'billing' })).toBe(
      '/dashboard/events/evt-1/settings/billing',
    );
    expect(buildDashboardPath({ eventId: 'evt-1', view: 'certificates' })).toBe(
      '/dashboard/events/evt-1/certificates',
    );
  });

  it('parses dashboard paths', () => {
    expect(parseDashboardPath('/dashboard')).toEqual({
      eventId: null,
      view: null,
      settingsTab: null,
    });
    expect(parseDashboardPath('/dashboard/events/evt-1')).toEqual({
      eventId: 'evt-1',
      view: 'overview',
      settingsTab: null,
    });
    expect(parseDashboardPath('/dashboard/events/evt-1/judging')).toEqual({
      eventId: 'evt-1',
      view: 'judging',
      settingsTab: null,
    });
    expect(parseDashboardPath('/dashboard/events/evt-1/certificates')).toEqual({
      eventId: 'evt-1',
      view: 'certificates',
      settingsTab: null,
    });
    expect(parseDashboardPath('/dashboard/events/evt-1/settings/integrations')).toEqual({
      eventId: 'evt-1',
      view: 'settings',
      settingsTab: 'integrations',
    });
  });

  it('converts legacy query URLs', () => {
    expect(legacyDashboardQueryToPath('?program=evt-1&view=settings&tab=billing')).toBe(
      '/dashboard/events/evt-1/settings/billing',
    );
    expect(legacyDashboardQueryToPath('?program=evt-1&view=judging')).toBe(
      '/dashboard/events/evt-1/judging',
    );
  });
});
