/**
 * Google Custom Search Engine — fallback when Firecrawl is unavailable or rate-limited.
 */

import type { SearchResult } from './webSearchSource.js';

interface CseItem {
  link?: string;
  title?: string;
  snippet?: string;
}

interface CseResponse {
  items?: CseItem[];
}

export async function googleCseSearch(query: string, limit = 8): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
  if (!apiKey || !cx) return [];

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: query,
      num: String(Math.min(limit, 10)),
    });

    const resp = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
    if (!resp.ok) {
      console.warn(`[googleCseSource] API returned ${resp.status}`);
      return [];
    }

    const json = (await resp.json()) as CseResponse;
    return (json.items || [])
      .filter((item) => item.link && item.title)
      .map(
        (item): SearchResult => ({
          url: item.link!,
          title: item.title || '',
          snippet: (item.snippet || '').slice(0, 500),
          sourceType: 'web_search',
          sourceName: 'google_cse',
          confidence: 0.55,
        }),
      )
      .slice(0, limit);
  } catch (err) {
    console.warn('[googleCseSource] Search failed:', err);
    return [];
  }
}
