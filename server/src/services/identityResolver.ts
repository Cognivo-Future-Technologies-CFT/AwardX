/**
 * Identity Resolution Service
 *
 * Resolves an email + name to a person_profiles row.
 * Creates new profiles on first sighting and aggregates aliases across submissions.
 */

import { getSupabaseAdmin } from '../supabase.js';

export interface PersonProfile {
  id: string;
  organizationId: string;
  email: string;
  primaryName: string | null;
  aliases: string[];
  profileData: Record<string, unknown>;
  profileConfidence: number;
  metadata: Record<string, unknown>;
}

export interface ResolveResult {
  profile: PersonProfile;
  isNew: boolean;
}

function toProfile(row: Record<string, any>): PersonProfile {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    primaryName: row.primary_name,
    aliases: row.aliases || [],
    profileData: row.profile_data || {},
    profileConfidence: Number(row.profile_confidence || 0),
    metadata: row.metadata || {},
  };
}

/**
 * Resolves a person by email and organization. Creates a new profile if none exists,
 * or updates the existing one with a new alias and refreshed timestamp.
 */
export async function resolvePerson(
  email: string,
  name: string | null,
  orgId: string,
): Promise<ResolveResult> {
  const supabase = getSupabaseAdmin();

  // Try to find existing
  const { data: existing } = await supabase
    .from('person_profiles')
    .select('*')
    .eq('organization_id', orgId)
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    // Update last_seen_at and merge aliases
    const currentAliases: string[] = existing.aliases || [];
    const newAliases =
      name && !currentAliases.includes(name) && name !== existing.primary_name
        ? [...currentAliases, name]
        : currentAliases;

    const { data: updated } = await supabase
      .from('person_profiles')
      .update({
        last_seen_at: new Date().toISOString(),
        aliases: newAliases,
        primary_name: existing.primary_name || name,
      })
      .eq('id', existing.id)
      .select()
      .single();

    return {
      profile: toProfile(updated || existing),
      isNew: false,
    };
  }

  // Create new profile
  const { data: created, error } = await supabase
    .from('person_profiles')
    .insert({
      organization_id: orgId,
      email,
      primary_name: name,
      aliases: name ? [name] : [],
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Failed to create person profile: ${error?.message}`);
  }

  return {
    profile: toProfile(created),
    isNew: true,
  };
}

/**
 * Fetch a person profile by ID (with org scope check).
 */
export async function getPersonProfile(
  personId: string,
  orgId?: string,
): Promise<PersonProfile | null> {
  const supabase = getSupabaseAdmin();

  let query = supabase.from('person_profiles').select('*').eq('id', personId);
  if (orgId) {
    query = query.eq('organization_id', orgId);
  }

  const { data } = await query.maybeSingle();
  return data ? toProfile(data) : null;
}
