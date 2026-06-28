import type { EmailIntelligenceDossier } from './types.js';
import type { PersonProfile } from '../identityResolver.js';

export function dossierToProfilePatch(
  person: PersonProfile,
  dossier: EmailIntelligenceDossier,
): {
  primaryName: string | null;
  aliases: string[];
  profileData: Record<string, unknown>;
} {
  const aliases = new Set(person.aliases || []);

  for (const hint of dossier.recoveryHints) {
    if (hint.kind === 'name') aliases.add(hint.value);
  }
  for (const account of dossier.registeredAccounts) {
    if (account.fullName) aliases.add(account.fullName);
  }

  const primaryName =
    dossier.recoveryHints.find((h) => h.kind === 'name')?.value
    || dossier.registeredAccounts.find((a) => a.fullName)?.fullName
    || person.primaryName;

  return {
    primaryName,
    aliases: Array.from(aliases),
    profileData: {
      ...(person.profileData || {}),
      emailIntelligence: dossier,
    },
  };
}
