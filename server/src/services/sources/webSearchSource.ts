/**
 * Web Search Source — Firecrawl-based web search and crawling.
 *
 * Searches the web for a person's digital footprint using Firecrawl's search API,
 * then optionally crawls the resulting pages for full content extraction.
 */

import { getSupabaseAdmin } from '../../supabase.js';
import { googleCseSearch } from './googleCseSource.js';
import { INTELLIGENCE_LIMITS } from '../../lib/intelligenceConfig.js';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  sourceType: 'web_search';
  sourceName: 'firecrawl';
  confidence: number;
}

/** Lazily-loaded Firecrawl client */
let _firecrawlClient: any = null;
let _firecrawlLoadAttempted = false;

async function getFirecrawlClient() {
  if (_firecrawlLoadAttempted) return _firecrawlClient;

  _firecrawlLoadAttempted = true;
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.warn('[webSearchSource] FIRECRAWL_API_KEY not configured');
    return null;
  }

  try {
    const FirecrawlApp = (await import('@mendable/firecrawl-js')).default;
    _firecrawlClient = new FirecrawlApp({ apiKey });
    console.log('[webSearchSource] Firecrawl client initialized');
    return _firecrawlClient;
  } catch (err) {
    console.warn('[webSearchSource] Failed to load Firecrawl:', err);
    return null;
  }
}

/** Parse Firecrawl v2/v4 search responses into a flat result list. */
function parseFirecrawlSearchResponse(response: unknown, limit: number): SearchResult[] {
  if (!response || typeof response !== 'object') return [];

  const items: Array<Record<string, unknown>> = [];

  // v1 legacy: { data: [...] }
  if (Array.isArray((response as { data?: unknown }).data)) {
    items.push(...((response as { data: Array<Record<string, unknown>> }).data));
  } else {
    // v4: { web: [...], news: [...], images: [...] }
    const grouped = response as { web?: unknown[]; news?: unknown[]; images?: unknown[] };
    for (const bucket of [grouped.web, grouped.news, grouped.images]) {
      if (Array.isArray(bucket)) {
        items.push(...(bucket as Array<Record<string, unknown>>));
      }
    }
  }

  return items
    .filter((r) => typeof r.url === 'string' && r.url.length > 0)
    .map((r): SearchResult => ({
      url: r.url as string,
      title: String(r.title || (r.metadata as { title?: string })?.title || ''),
      snippet: String(
        r.description || r.markdown || r.snippet || '',
      ).slice(0, 500),
      sourceType: 'web_search',
      sourceName: 'firecrawl',
      confidence: 0.5,
    }))
    .slice(0, limit);
}

/**
 * Search the web using Firecrawl.
 * Falls back to Google CSE, then a search URL placeholder.
 */
export async function webSearch(query: string, limit = 8): Promise<SearchResult[]> {
  const client = await getFirecrawlClient();

  if (client) {
    try {
      const response = await client.search(query, {
        limit,
        scrapeOptions: { formats: ['markdown'] },
      });

      const results = parseFirecrawlSearchResponse(response, limit);
      if (results.length > 0) {
        console.log(`[webSearchSource] Firecrawl returned ${results.length} results for: ${query.slice(0, 60)}`);
        return results;
      }

      console.warn('[webSearchSource] Firecrawl returned no parseable results for:', query.slice(0, 60));
    } catch (err) {
      console.warn('[webSearchSource] Firecrawl search failed:', err);
    }
  }

  // Fallback: Google Custom Search
  const cseResults = await googleCseSearch(query, limit);
  if (cseResults.length > 0) return cseResults;

  // Last resort: search URL placeholder
  const encoded = encodeURIComponent(query);
  return [
    {
      url: `https://www.google.com/search?q=${encoded}`,
      title: `Google Search: ${query}`,
      snippet: 'Search results for the query — open in browser to view',
      sourceType: 'web_search',
      sourceName: 'firecrawl',
      confidence: 0.1,
    },
  ];
}

/**
 * Crawl a specific URL for full content using Firecrawl.
 * Returns the extracted text or null on failure.
 */
export async function crawlUrl(url: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from('collected_documents')
    .select('extracted_text, last_crawled_at, collection_status')
    .eq('url', url)
    .maybeSingle();

  const ttlMs = INTELLIGENCE_LIMITS.documentCacheTtlDays * 24 * 60 * 60 * 1000;
  if (existing?.extracted_text && existing.last_crawled_at) {
    const age = Date.now() - new Date(existing.last_crawled_at).getTime();
    if (age < ttlMs && existing.collection_status === 'collected') {
      return existing.extracted_text;
    }
  }

  const client = await getFirecrawlClient();
  if (!client) return null;

  try {
    const page = await client.scrape(url, { formats: ['markdown'] });

    const markdown = page?.markdown;
    if (!markdown) {
      console.warn(`[webSearchSource] No content found at ${url}`);
      await supabase.from('collected_documents').upsert({
        url,
        domain: extractDomain(url),
        collection_status: 'failed',
        error: 'No content found',
        last_crawled_at: new Date().toISOString(),
      }, { onConflict: 'url' });
      return null;
    }

    const content = String(markdown).slice(0, 100_000);
    const title = String(page.title || page.metadata?.title || '');

    await supabase.from('collected_documents').upsert({
      url,
      domain: extractDomain(url),
      title,
      content,
      extracted_text: content.slice(0, 50_000),
      collection_status: 'collected',
      last_crawled_at: new Date().toISOString(),
    }, { onConflict: 'url' });

    return content;
  } catch (err) {
    console.warn(`[webSearchSource] Failed to crawl ${url}:`, err);
    await supabase.from('collected_documents').upsert({
      url,
      domain: extractDomain(url),
      collection_status: 'failed',
      error: err instanceof Error ? err.message : 'Unknown error',
      last_crawled_at: new Date().toISOString(),
    }, { onConflict: 'url' });
    return null;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Search for a person across the web, building search queries from their
 * name, email, and known context.
 */
export async function searchPerson(
  name: string | null,
  email: string,
): Promise<SearchResult[]> {
  const queries: string[] = [];

  if (name && name.trim().length > 2) {
    queries.push(`"${name}"`);
    queries.push(`"${name}" "${email}"`);
  }
  queries.push(email);

  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries.slice(0, 3)) {
    const results = await webSearch(query);
    for (const r of results) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        allResults.push(r);
      }
    }
  }

  return allResults;
}
