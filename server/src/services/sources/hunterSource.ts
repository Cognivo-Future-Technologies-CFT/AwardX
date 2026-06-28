/**
 * Hunter.io email enrichment — discovers name, company, and social profile URLs.
 */

import type { EmailLookupResult } from './emailLookupSource.js';

interface HunterResponse {
  data?: {
    first_name?: string;
    last_name?: string;
    position?: string;
    company?: string;
    linkedin_url?: string;
    twitter?: string;
    sources?: Array<{ domain?: string; uri?: string }>;
  };
}

export async function hunterEmailLookup(email: string): Promise<EmailLookupResult[]> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return [];

  try {
    const url = `https://api.hunter.io/v2/email-enrichment?email=${encodeURIComponent(email)}&api_key=${apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[hunterSource] API returned ${resp.status}`);
      return [];
    }

    const json = (await resp.json()) as HunterResponse;
    const data = json.data;
    if (!data) return [];

    const results: EmailLookupResult[] = [];
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');

    if (data.linkedin_url) {
      results.push({
        url: data.linkedin_url,
        title: fullName ? `${fullName} on LinkedIn` : 'LinkedIn Profile',
        snippet: [data.position, data.company].filter(Boolean).join(' at ') || 'LinkedIn profile discovered via Hunter.io',
        sourceType: 'email_lookup',
        sourceName: 'hunter',
        data: { email, provider: 'hunter', linkedin: data.linkedin_url },
        confidence: 0.75,
      });
    }

    if (data.twitter) {
      const twitterUrl = data.twitter.startsWith('http')
        ? data.twitter
        : `https://twitter.com/${data.twitter.replace('@', '')}`;
      results.push({
        url: twitterUrl,
        title: fullName ? `${fullName} on Twitter` : 'Twitter Profile',
        snippet: `Twitter profile associated with ${email}`,
        sourceType: 'email_lookup',
        sourceName: 'hunter',
        data: { email, provider: 'hunter', twitter: twitterUrl },
        confidence: 0.65,
      });
    }

    for (const source of data.sources || []) {
      if (source.uri && !results.some((r) => r.url === source.uri)) {
        results.push({
          url: source.uri,
          title: source.domain || 'Associated source',
          snippet: `Source associated with ${email} via Hunter.io`,
          sourceType: 'email_lookup',
          sourceName: 'hunter',
          data: { email, provider: 'hunter', domain: source.domain },
          confidence: 0.55,
        });
      }
    }

    return results;
  } catch (err) {
    console.warn('[hunterSource] Lookup failed:', err);
    return [];
  }
}
