import { afterEach, describe, expect, it } from 'vitest';
import { normalizeLocalDevProtocol, resolvePublicSiteUrl } from '../../../lib/siteUrl';
import {
  resolveEmailActionUrl,
  resolveEmailSiteUrl,
} from '../../../server/src/lib/emailSiteUrl';

describe('siteUrl', () => {
  it('downgrades https localhost origins to http', () => {
    expect(normalizeLocalDevProtocol('https://localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeLocalDevProtocol('https://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
    expect(normalizeLocalDevProtocol('https://[::1]:3000')).toBe('http://[::1]:3000');
  });

  it('keeps http localhost and production https unchanged', () => {
    expect(normalizeLocalDevProtocol('http://localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeLocalDevProtocol('https://awardx.one')).toBe('https://awardx.one');
  });

  it('resolvePublicSiteUrl never returns localhost', () => {
    expect(resolvePublicSiteUrl()).toBe('https://www.awardx.one');
  });
});

describe('emailSiteUrl', () => {
  const original = {
    SITE_URL: process.env.SITE_URL,
    VITE_SITE_URL: process.env.VITE_SITE_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
  };

  afterEach(() => {
    process.env.SITE_URL = original.SITE_URL;
    process.env.VITE_SITE_URL = original.VITE_SITE_URL;
    process.env.FRONTEND_URL = original.FRONTEND_URL;
  });

  it('skips localhost env values and defaults to production', () => {
    process.env.SITE_URL = 'http://localhost:3000';
    process.env.VITE_SITE_URL = 'http://localhost:3000';
    delete process.env.FRONTEND_URL;
    expect(resolveEmailSiteUrl()).toBe('https://www.awardx.one');
  });

  it('rewrites localhost invite URLs onto the public site', () => {
    process.env.SITE_URL = 'https://www.awardx.one';
    expect(resolveEmailActionUrl('http://localhost:3000/judge/abc', '/judge/fallback')).toBe(
      'https://www.awardx.one/judge/abc',
    );
  });
});
