/**
 * Footprint Collector
 *
 * Orchestrates email account discovery (Holehe) and optional enrichment (Hunter).
 */

import { getSupabaseAdmin } from '../supabase.js';
import { buildProfile } from './profileBuilder.js';
import { INTELLIGENCE_LIMITS } from '../lib/intelligenceConfig.js';
import type { PersonProfile } from './identityResolver.js';
import { collectEmailIntelligence } from './emailIntelligence/EmailIntelligenceService.js';
import { dossierToProfilePatch } from './emailIntelligence/profilePatch.js';
import type { EmailIntelligenceDossier } from './emailIntelligence/types.js';

export interface CollectResult {
  totalCollected: number;
  sources: string[];
  errors: string[];
  dossierStatus?: EmailIntelligenceDossier['status'] | null;
}

export async function collectFootprints(
  person: PersonProfile,
  options?: { force?: boolean },
): Promise<CollectResult> {
  const errors: string[] = [];
  const sources: string[] = [];

  if (!options?.force) {
    const ttlMs = INTELLIGENCE_LIMITS.footprintRefreshTtlDays * 24 * 60 * 60 * 1000;
    const supabase = getSupabaseAdmin();
    const { data: recent } = await supabase
      .from('person_digital_footprints')
      .select('collected_at')
      .eq('person_profile_id', person.id)
      .order('collected_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent?.collected_at) {
      const age = Date.now() - new Date(recent.collected_at).getTime();
      if (age < ttlMs) {
        return { totalCollected: 0, sources: ['cached'], errors: [] };
      }
    }
  }

  if (options?.force) {
    await clearStaleFootprints(person.id);
  }

  let dossierStatus: EmailIntelligenceDossier['status'] | null = null;

  try {
    const { footprints, dossier } = await collectEmailIntelligence(person.email);

    if (dossier) {
      dossierStatus = dossier.status;
      if (dossier.status !== 'unavailable') {
        await persistDossier(person, dossier);
      } else if (dossier.unavailableReason) {
        errors.push(dossier.unavailableReason);
      }
    }

    if (footprints.length > 0) {
      const sourceNames = [...new Set(footprints.map((f) => f.sourceName))];
      sources.push(...sourceNames);
      await storeFootprints(person.id, footprints);
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Email intelligence failed');
  }

  return { totalCollected: sources.length, sources, errors, dossierStatus };
}

async function clearStaleFootprints(personProfileId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('person_digital_footprints')
    .delete()
    .eq('person_profile_id', personProfileId)
    .in('source_name', ['holehe', 'hunter', 'behindtheemail', 'email_search', 'firecrawl']);
}

async function persistDossier(
  person: PersonProfile,
  dossier: EmailIntelligenceDossier,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const patch = dossierToProfilePatch(person, dossier);

  await supabase
    .from('person_profiles')
    .update({
      primary_name: patch.primaryName,
      aliases: patch.aliases,
      profile_data: patch.profileData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', person.id);
}

async function storeFootprints(
  personProfileId: string,
  results: Array<{
    url: string;
    title: string;
    snippet: string;
    sourceType: string;
    sourceName: string;
    confidence: number;
    data?: Record<string, unknown>;
  }>,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from('person_digital_footprints')
    .select('source_url, title, source_name, data')
    .eq('person_profile_id', personProfileId);

  const existingKeys = new Set(
    (existing || []).map((r: Record<string, unknown>) => {
      if (r.source_url) return String(r.source_url);
      const data = r.data as Record<string, unknown> | undefined;
      return `${r.source_name}:${data?.category || 'item'}:${r.title}`;
    }),
  );

  const newRows = results
    .filter((r) => {
      const key = r.url || `${r.sourceName}:${r.data?.category || 'item'}:${r.title}`;
      return !existingKeys.has(key);
    })
    .map((r) => ({
      person_profile_id: personProfileId,
      source_type: r.sourceType,
      source_name: r.sourceName,
      source_url: r.url || null,
      title: r.title,
      snippet: r.snippet?.slice(0, 1000) || null,
      confidence: r.confidence,
      data: r.data || {},
      collected_at: new Date().toISOString(),
    }));

  if (newRows.length === 0) return;

  const batchSize = 50;
  for (let i = 0; i < newRows.length; i += batchSize) {
    const batch = newRows.slice(i, i + batchSize);
    const { error } = await supabase.from('person_digital_footprints').insert(batch);
    if (error) {
      console.error(`[footprintCollector] Failed to insert batch ${i}:`, error);
    }
  }

  try {
    await buildProfile(personProfileId);
  } catch (err) {
    console.warn('[footprintCollector] Profile rebuild failed:', err);
  }

  console.log(`[footprintCollector] Stored ${newRows.length} footprints for profile ${personProfileId}`);
}
