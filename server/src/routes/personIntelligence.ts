/**
 * Person Intelligence Routes
 *
 * API endpoints for:
 * - Person profiles (identity, aggregated claims, digital presence)
 * - Submission claims extraction and verification
 * - Claim verification details
 */

import { Router } from 'express';
import { requireAuth, optionalAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../supabase.js';
import { getPersonProfile } from '../services/identityResolver.js';
import { collectFootprints } from '../services/footprintCollector.js';
import { buildProfile } from '../services/profileBuilder.js';
import { extractAndStoreClaims } from '../services/claimExtractor.js';
import { verifyClaim, verifySubmissionClaims } from '../services/claimVerifier.js';
import { mapClaimRow, mapFootprintRow } from '../lib/footprintMappers.js';

const router = Router();

/** Check if user has org access to a person profile */
async function canAccessPerson(userId: string, personId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('person_profiles')
    .select('organization_id')
    .eq('id', personId)
    .maybeSingle();

  if (!data) return false;

  const { canAccessOrganization } = await import('../middleware/programAccess.js');
  return canAccessOrganization(userId, data.organization_id);
}

/**
 * GET /api/person/:personId/profile
 * Full organized person profile with claims, verifications, and digital presence.
 */
router.get('/:personId/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { personId } = req.params;

  try {
    const access = await canAccessPerson(req.userId!, personId);
    if (!access) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const profile = await buildProfile(personId);
    if (!profile) {
      return res.status(404).json({ error: 'Person profile not found' });
    }

    return res.json({ data: profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/person/:personId/footprints
 * Raw digital footprints collected for a person.
 */
router.get('/:personId/footprints', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { personId } = req.params;

  try {
    const access = await canAccessPerson(req.userId!, personId);
    if (!access) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const supabase = getSupabaseAdmin();
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const sourceType = req.query.sourceType as string | undefined;

    let query = supabase
      .from('person_digital_footprints')
      .select('*', { count: 'exact' })
      .eq('person_profile_id', personId)
      .order('collected_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    const { data, count, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data: (data || []).map((row) => mapFootprintRow(row as Record<string, unknown>)), total: count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/person/:personId/refresh
 * Re-collect digital footprints for a person.
 */
router.post('/:personId/refresh', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { personId } = req.params;

  try {
    const access = await canAccessPerson(req.userId!, personId);
    if (!access) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const person = await getPersonProfile(personId);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Fire-and-forget collection (don't block the response)
    const result = await collectFootprints(person);

    return res.json({
      data: {
        collected: result.totalCollected,
        sources: result.sources,
        errors: result.errors,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/person/:personId/claims
 * All claims made by a person across all submissions.
 */
router.get('/:personId/claims', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { personId } = req.params;

  try {
    const access = await canAccessPerson(req.userId!, personId);
    if (!access) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const supabase = getSupabaseAdmin();
    const claimType = req.query.claimType as string | undefined;
    const status = req.query.status as string | undefined;

    // Get person's email
    const person = await getPersonProfile(personId);
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Get their submissions
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, title, program_id')
      .eq('applicant_email', person.email);

    const submissionIds = (submissions || []).map((s: any) => s.id);

    if (submissionIds.length === 0) {
      return res.json({ data: [] });
    }

    let query = supabase
      .from('submission_claims')
      .select(`
        *,
        claim_verifications(*)
      `)
      .in('submission_id', submissionIds)
      .order('extracted_at', { ascending: false });

    if (claimType) query = query.eq('claim_type', claimType);
    if (status) query = query.eq('verification_status', status);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/submissions/:submissionId/claims
 * Claims from a specific submission. Supports ?judgeToken= for judge access.
 */
router.get('/submissions/:submissionId/claims', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const { submissionId } = req.params;

  if (!submissionId) {
    return res.status(400).json({ error: 'submissionId is required' });
  }

  try {
    // Reuse the existing access resolution pattern from submissionProcessing routes
    const judgeToken = typeof req.query.judgeToken === 'string' ? req.query.judgeToken.trim() : '';

    if (!judgeToken && !req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('submission_claims')
      .select(`
        *,
        claim_verifications(*)
      `)
      .eq('submission_id', submissionId)
      .order('extracted_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/**
 * POST /api/claims/:claimId/verify
 * Force re-verify a specific claim.
 */
router.post('/claims/:claimId/verify', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { claimId } = req.params;

  try {
    const supabase = getSupabaseAdmin();

    // Fetch claim and related person
    const { data: claim } = await supabase
      .from('submission_claims')
      .select('*, submissions!inner(applicant_email)')
      .eq('id', claimId)
      .single();

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const applicantEmail = (claim as any).submissions?.applicant_email;
    if (!applicantEmail) {
      return res.status(400).json({ error: 'Cannot determine applicant for this claim' });
    }

    // Find person profile
    const { data: persons } = await supabase
      .from('person_profiles')
      .select('*')
      .eq('email', applicantEmail)
      .limit(1);

    const person = persons?.[0];
    if (!person) {
      return res.status(404).json({ error: 'Person profile not found for claim applicant' });
    }

    // Run verification asynchronously
    setImmediate(async () => {
      try {
        await verifyClaim(claimId, {
          id: person.id,
          organizationId: person.organization_id,
          email: person.email,
          primaryName: person.primary_name,
          aliases: person.aliases || [],
          profileData: person.profile_data || {},
          profileConfidence: Number(person.profile_confidence || 0),
          metadata: person.metadata || {},
        });
      } catch (err) {
        console.error(`[personIntelligence] Background verify failed for claim ${claimId}:`, err);
      }
    });

    return res.json({ data: { claimId, status: 'verifying' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/claims/:claimId/verifications
 * Verification sources for a specific claim.
 */
router.get('/claims/:claimId/verifications', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const { claimId } = req.params;

  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('claim_verifications')
      .select('*')
      .eq('claim_id', claimId)
      .order('confidence', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/person/:personId
 * GDPR: delete a person profile and all associated intelligence data.
 */
router.delete('/:personId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { personId } = req.params;

  try {
    const access = await canAccessPerson(req.userId!, personId);
    if (!access) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const supabase = getSupabaseAdmin();

    // Cascading deletes handle footprints; clean up claims via submissions
    const { data: person } = await supabase
      .from('person_profiles')
      .select('email')
      .eq('id', personId)
      .single();

    if (person?.email) {
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id')
        .eq('applicant_email', person.email);

      const submissionIds = (submissions || []).map((s: { id: string }) => s.id);
      if (submissionIds.length > 0) {
        await supabase.from('submission_claims').delete().in('submission_id', submissionIds);
      }
    }

    const { error } = await supabase.from('person_profiles').delete().eq('id', personId);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ data: { deleted: true, personId } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});

export default router;
