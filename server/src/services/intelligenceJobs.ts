/**
 * Lightweight intelligence job queue using Supabase status table.
 * Falls back to fire-and-forget when table doesn't exist.
 */

import { getSupabaseAdmin } from '../supabase.js';
import { collectFootprints } from './footprintCollector.js';
import { verifySubmissionClaims } from './claimVerifier.js';
import { buildProfile } from './profileBuilder.js';
import type { PersonProfile } from './identityResolver.js';

export type IntelligenceJobType =
  | 'footprint_collect'
  | 'claim_verify'
  | 'profile_rebuild';

interface EnqueueParams {
  type: IntelligenceJobType;
  personProfileId?: string;
  submissionId?: string;
  payload?: Record<string, unknown>;
}

export async function enqueueIntelligenceJob(params: EnqueueParams): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('intelligence_jobs').insert({
    job_type: params.type,
    person_profile_id: params.personProfileId ?? null,
    submission_id: params.submissionId ?? null,
    payload: params.payload ?? {},
    status: 'pending',
  });

  if (error) {
    // Table may not exist yet — run inline as fallback
    console.warn('[intelligenceJobs] Queue insert failed, running inline:', error.message);
    await runIntelligenceJob(params);
    return;
  }

  setImmediate(() => {
    processNextJob().catch((err) => console.warn('[intelligenceJobs] Background process failed:', err));
  });
}

async function processNextJob(): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: job } = await supabase
    .from('intelligence_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job) return;

  await supabase
    .from('intelligence_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', job.id);

  try {
    await runIntelligenceJob({
      type: job.job_type as IntelligenceJobType,
      personProfileId: job.person_profile_id ?? undefined,
      submissionId: job.submission_id ?? undefined,
      payload: (job.payload as Record<string, unknown>) || {},
    });

    await supabase
      .from('intelligence_jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', job.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await supabase
      .from('intelligence_jobs')
      .update({ status: 'failed', error: message, completed_at: new Date().toISOString() })
      .eq('id', job.id);
  }
}

async function runIntelligenceJob(params: EnqueueParams): Promise<void> {
  const supabase = getSupabaseAdmin();

  if (params.type === 'footprint_collect' && params.personProfileId) {
    const { data } = await supabase
      .from('person_profiles')
      .select('*')
      .eq('id', params.personProfileId)
      .single();

    if (data) {
      const person: PersonProfile = {
        id: data.id,
        organizationId: data.organization_id,
        email: data.email,
        primaryName: data.primary_name,
        aliases: data.aliases || [],
        profileData: data.profile_data || {},
        profileConfidence: Number(data.profile_confidence || 0),
        metadata: data.metadata || {},
      };
      await collectFootprints(person);
      await buildProfile(person.id);
    }
    return;
  }

  if (params.type === 'claim_verify' && params.submissionId && params.personProfileId) {
    const { data } = await supabase
      .from('person_profiles')
      .select('*')
      .eq('id', params.personProfileId)
      .single();

    if (data) {
      const person: PersonProfile = {
        id: data.id,
        organizationId: data.organization_id,
        email: data.email,
        primaryName: data.primary_name,
        aliases: data.aliases || [],
        profileData: data.profile_data || {},
        profileConfidence: Number(data.profile_confidence || 0),
        metadata: data.metadata || {},
      };
      await verifySubmissionClaims(params.submissionId, person);
      await buildProfile(person.id);
    }
    return;
  }

  if (params.type === 'profile_rebuild' && params.personProfileId) {
    await buildProfile(params.personProfileId);
  }
}

/** Convenience: queue footprint + claim verify after submission processing. */
export async function queuePersonIntelligence(
  person: PersonProfile,
  submissionId: string,
): Promise<void> {
  await enqueueIntelligenceJob({
    type: 'footprint_collect',
    personProfileId: person.id,
    submissionId,
  });
  await enqueueIntelligenceJob({
    type: 'claim_verify',
    personProfileId: person.id,
    submissionId,
  });
}
