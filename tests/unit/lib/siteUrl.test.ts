import { describe, expect, it } from 'vitest';
import { normalizeLocalDevProtocol } from '../../../lib/siteUrl';

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
});
