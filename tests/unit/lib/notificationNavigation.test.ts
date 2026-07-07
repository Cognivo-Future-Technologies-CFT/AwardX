import { describe, expect, it } from 'vitest';
import {
  buildNotificationRoute,
  buildOrgHubRoute,
  parseNotificationRoute,
  resolveNotificationPath,
} from '../../../lib/notificationNavigation';

describe('notificationNavigation', () => {
  it('parses legacy dashboard routes', () => {
    expect(parseNotificationRoute('/dashboard/evt-1/submissions')).toEqual({
      eventId: 'evt-1',
      view: 'submissions',
      settingsTab: null,
    });
    expect(parseNotificationRoute('/dashboard/evt-1/pipeline')).toEqual({
      eventId: 'evt-1',
      view: 'schedule-rounds',
      settingsTab: null,
    });
    expect(parseNotificationRoute('/dashboard/evt-1/forms')).toEqual({
      eventId: 'evt-1',
      view: 'templates',
      settingsTab: null,
    });
  });

  it('parses current dashboard routes', () => {
    expect(parseNotificationRoute('/dashboard/events/evt-1/judging')).toEqual({
      eventId: 'evt-1',
      view: 'judging',
      settingsTab: null,
    });
    expect(parseNotificationRoute('/dashboard/events/evt-1/settings/billing')).toEqual({
      eventId: 'evt-1',
      view: 'settings',
      settingsTab: 'billing',
    });
  });

  it('maps organization routes to the dashboard hub', () => {
    expect(parseNotificationRoute('/organization/org-1/settings')).toEqual({
      eventId: null,
      view: null,
      settingsTab: null,
    });
  });

  it('resolves paths from legacy metadata routes', () => {
    expect(
      resolveNotificationPath({
        type: 'submission',
        programId: 'evt-1',
        metadata: { route: '/dashboard/evt-1/submissions' },
      }),
    ).toBe('/dashboard/events/evt-1/submissions');
  });

  it('parses certificate dashboard routes', () => {
    expect(parseNotificationRoute('/dashboard/events/evt-1/certificates')).toEqual({
      eventId: 'evt-1',
      view: 'certificates',
      settingsTab: null,
    });
    expect(
      resolveNotificationPath({
        type: 'certificate',
        programId: 'evt-1',
        metadata: { route: '/dashboard/events/evt-1/certificates' },
      }),
    ).toBe('/dashboard/events/evt-1/certificates');
    expect(
      resolveNotificationPath({
        type: 'certificate',
        programId: 'evt-1',
      }),
    ).toBe('/dashboard/events/evt-1/certificates');
  });

  it('falls back to notification type when route is missing', () => {
    expect(
      resolveNotificationPath({
        type: 'judging',
        programId: 'evt-1',
      }),
    ).toBe('/dashboard/events/evt-1/judging');

    expect(
      resolveNotificationPath({
        type: 'form',
        programId: 'evt-1',
      }),
    ).toBe('/dashboard/events/evt-1/templates');
  });

  it('maps team settings routes to the teams view', () => {
    expect(
      resolveNotificationPath({
        type: 'team',
        programId: 'evt-1',
        metadata: { route: '/dashboard/evt-1/settings' },
      }),
    ).toBe('/dashboard/events/evt-1/teams');
  });

  it('maps organization routes to the dashboard hub', () => {
    expect(
      resolveNotificationPath({
        type: 'organization',
        organizationId: 'org-1',
        metadata: { route: '/organization/org-1/settings' },
      }),
    ).toBe('/dashboard');
  });

  it('builds canonical routes for notification writers', () => {
    expect(buildNotificationRoute({ eventId: 'evt-1', view: 'teams' })).toBe(
      '/dashboard/events/evt-1/teams',
    );
    expect(buildOrgHubRoute()).toBe('/dashboard');
  });
});
