import { getSupabaseAdmin } from '../supabase.js';
import { resolvePerson, type PersonProfile } from '../services/identityResolver.js';
import { resolveApplicantIdentity } from './submissionApplicant.js';

export async function getSubmissionApplicant(
  submissionId: string,
): Promise<{
  email: string | null;
  name: string | null;
  orgId: string | null;
}> {
  const supabase = getSupabaseAdmin();
  const { data: sub } = await supabase
    .from('submissions')
    .select('applicant_email, applicant_name, submission_data, program_id, programs(organization_id)')
    .eq('id', submissionId)
    .maybeSingle();

  if (!sub) {
    return { email: null, name: null, orgId: null };
  }

  const orgId = (sub as { programs?: { organization_id?: string } }).programs?.organization_id ?? null;
  const { email, name } = resolveApplicantIdentity({
    applicant_email: sub.applicant_email,
    applicant_name: sub.applicant_name,
    submission_data: sub.submission_data as Record<string, unknown>,
  });

  return { email, name, orgId };
}

export async function resolvePersonForSubmission(
  submissionId: string,
  createIfMissing = false,
): Promise<PersonProfile | null> {
  const { email, name, orgId } = await getSubmissionApplicant(submissionId);
  if (!email || !orgId) return null;

  if (createIfMissing) {
    const { profile } = await resolvePerson(email, name, orgId);
    return profile;
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('person_profiles')
    .select('*')
    .eq('organization_id', orgId)
    .eq('email', email)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    email: data.email,
    primaryName: data.primary_name,
    aliases: data.aliases || [],
    profileData: data.profile_data || {},
    profileConfidence: Number(data.profile_confidence || 0),
    metadata: data.metadata || {},
  };
}
