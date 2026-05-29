export function slugifyVotingSegment(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'vote';
}

export function buildPublicVotingSlug(programSlug: string | null | undefined, roundName: string): string {
  const programPart = slugifyVotingSegment(programSlug || 'program');
  const roundPart = slugifyVotingSegment(roundName);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${programPart}-${roundPart}-${suffix}`;
}
