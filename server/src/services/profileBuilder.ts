/**
 * Profile Builder
 *
 * Aggregates all data about a person into a structured profile with
 * organized achievements, education, experience, skills, and digital presence.
 */

import { getSupabaseAdmin } from '../supabase.js';

export interface OrganizedClaim {
  id: string;
  text: string;
  subject: string | null;
  type: string;
  verified: boolean;
  confidence: number;
  status: string;
  sources: ClaimSource[];
}

export interface ClaimSource {
  url: string | null;
  title: string | null;
  supportsClaim: boolean | null;
  confidence: number;
}

export interface DigitalPresence {
  totalSources: number;
  topSources: Array<{ name: string; type: string; count: number }>;
  topDomains: Array<{ domain: string; count: number }>;
  lastCollected: string | null;
}

export interface PersonIntelligenceProfile {
  identity: {
    id: string;
    name: string | null;
    email: string;
    aliases: string[];
    firstSeen: string;
    lastSeen: string;
  };
  achievements: OrganizedClaim[];
  education: OrganizedClaim[];
  experience: OrganizedClaim[];
  skills: OrganizedClaim[];
  affiliations: OrganizedClaim[];
  awards: OrganizedClaim[];
  digitalPresence: DigitalPresence;
  overallConfidence: number;
}

/**
 * Build a complete intelligence profile for a person.
 */
export async function buildProfile(personId: string): Promise<PersonIntelligenceProfile | null> {
  const supabase = getSupabaseAdmin();

  // Fetch person profile
  const { data: person } = await supabase
    .from('person_profiles')
    .select('*')
    .eq('id', personId)
    .single();

  if (!person) return null;

  // Fetch all claims across all submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id')
    .eq('applicant_email', person.email);

  const submissionIds = (submissions || []).map((s: any) => s.id);

  let allClaims: any[] = [];
  if (submissionIds.length > 0) {
    const { data: claims } = await supabase
      .from('submission_claims')
      .select('*')
      .in('submission_id', submissionIds)
      .order('extracted_at', { ascending: false });

    allClaims = claims || [];
  }

  // Fetch digital footprints
  const { data: footprints } = await supabase
    .from('person_digital_footprints')
    .select('*')
    .eq('person_profile_id', personId)
    .order('collected_at', { ascending: false });

  // Fetch verifications for all claims
  const claimIds = allClaims.map((c: any) => c.id);
  let allVerifications: any[] = [];
  if (claimIds.length > 0) {
    const { data: verifications } = await supabase
      .from('claim_verifications')
      .select('*')
      .in('claim_id', claimIds);

    allVerifications = verifications || [];
  }

  // Group verifications by claim ID
  const verifMap = new Map<string, any[]>();
  for (const v of allVerifications) {
    const list = verifMap.get(v.claim_id) || [];
    list.push(v);
    verifMap.set(v.claim_id, list);
  }

  // Organize claims by type
  const organizeClaim = (c: any): OrganizedClaim => ({
    id: c.id,
    text: c.claim_text,
    subject: c.claim_subject,
    type: c.claim_type,
    verified: c.verification_status === 'verified',
    confidence: Number(c.verification_confidence || 0),
    status: c.verification_status,
    sources: (verifMap.get(c.id) || []).map((v: any): ClaimSource => ({
      url: v.source_url,
      title: v.source_title,
      supportsClaim: v.supports_claim,
      confidence: Number(v.confidence || 0),
    })),
  });

  const categorize = (type: string): OrganizedClaim[] =>
    allClaims
      .filter((c: any) => c.claim_type === type)
      .map(organizeClaim);

  // Build digital presence summary
  const footprintMap = new Map<string, { name: string; type: string; count: number }>();
  const domainMap = new Map<string, number>();

  let lastCollected: string | null = null;
  for (const f of footprints || []) {
    const key = f.source_name;
    const existing = footprintMap.get(key) || { name: f.source_name, type: f.source_type, count: 0 };
    existing.count++;
    footprintMap.set(key, existing);

    if (f.source_url) {
      try {
        const domain = new URL(f.source_url).hostname;
        domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
      } catch { /* ignore */ }
    }

    if (f.collected_at && (!lastCollected || f.collected_at > lastCollected)) {
      lastCollected = f.collected_at;
    }
  }

  const digitalPresence: DigitalPresence = {
    totalSources: footprints?.length || 0,
    topSources: Array.from(footprintMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topDomains: Array.from(domainMap.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    lastCollected,
  };

  // Calculate overall confidence (avg of verified claim confidences)
  const verifiedClaims = allClaims.filter(
    (c: any) => c.verification_status === 'verified' && c.verification_confidence != null,
  );
  const overallConfidence =
    verifiedClaims.length > 0
      ? verifiedClaims.reduce(
          (sum: number, c: any) => sum + Number(c.verification_confidence),
          0,
        ) / verifiedClaims.length
      : 0;

  // Expertise signals from claim subjects and footprint titles
  const expertiseTerms = new Map<string, number>();
  for (const c of allClaims) {
    if (c.claim_subject) {
      const key = c.claim_subject.toLowerCase().slice(0, 60);
      expertiseTerms.set(key, (expertiseTerms.get(key) || 0) + 1);
    }
  }
  const expertiseAreas = Array.from(expertiseTerms.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([area]) => area);

  // Consistency: how many claims are verified vs total
  const consistencyScore =
    allClaims.length > 0
      ? verifiedClaims.length / allClaims.length
      : 0;

  const profileData = {
    identity: {
      primaryName: person.primary_name,
      aliases: person.aliases || [],
      emails: [person.email],
    },
    digitalPresence: digitalPresence,
    expertiseSignals: { areas: expertiseAreas, sources: footprints?.length || 0 },
    claimHistory: {
      totalClaims: allClaims.length,
      verified: verifiedClaims.length,
      disputed: allClaims.filter((c: any) => c.verification_status === 'disputed').length,
      avgConfidence: overallConfidence,
    },
    consistencyScore: Math.round(consistencyScore * 100) / 100,
  };

  // Persist synthesized profile_data
  await supabase
    .from('person_profiles')
    .update({
      profile_data: profileData,
      profile_confidence: overallConfidence,
      updated_at: new Date().toISOString(),
    })
    .eq('id', personId);

  return {
    identity: {
      id: person.id,
      name: person.primary_name,
      email: person.email,
      aliases: person.aliases || [],
      firstSeen: person.first_seen_at,
      lastSeen: person.last_seen_at,
    },
    achievements: categorize('achievement'),
    education: categorize('education'),
    experience: categorize('experience'),
    skills: categorize('skill'),
    affiliations: categorize('affiliation'),
    awards: categorize('award'),
    digitalPresence,
    overallConfidence: Math.round(overallConfidence * 100) / 100,
  };
}
