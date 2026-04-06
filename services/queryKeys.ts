// Centralised, namespaced React Query key registry.
// Always use these keys so cache invalidation is deterministic.

export const queryKeys = {
  programs: {
    all: () => ['programs'] as const,
    byId: (id: string) => ['programs', id] as const,
  },
  submissions: {
    all: (programId: string) => ['submissions', programId] as const,
    paginated: (programId: string, page: number, search: string) =>
      ['submissions', programId, page, search] as const,
  },
  judges: {
    all: (programId: string) => ['judges', programId] as const,
  },
  judging: {
    criteria: (programId: string) => ['judging', 'criteria', programId] as const,
    scores: (submissionId: string) => ['judging', 'scores', submissionId] as const,
  },
  teams: {
    members: (programId: string) => ['teams', programId] as const,
    roles: (programId: string) => ['roles', programId] as const,
  },
  rounds: {
    all: (programId: string) => ['rounds', programId] as const,
  },
  notifications: {
    all: (programId: string) => ['notifications', programId] as const,
  },
  audit: {
    logs: (page: number, search: string) => ['audit-logs', page, search] as const,
  },
  overview: {
    stats: (programId: string) => ['overview-stats', programId] as const,
    publicBySlug: (slug: string) => ['overview-public', 'slug', slug] as const,
    publicByProgramId: (programId: string) => ['overview-public', 'program', programId] as const,
    media: (programId: string) => ['overview-media', programId] as const,
  },
  categories: {
    all: (programId: string) => ['categories', programId] as const,
  },
  forms: {
    byProgram: (programId: string) => ['forms', programId] as const,
  },
  roundSubmissions: {
    byRound: (roundId: string) => ['round-submissions', roundId] as const,
    countByRound: (roundId: string) => ['round-submissions', 'count', roundId] as const,
  },
  voting: {
    config: (roundId: string) => ['voting', 'config', roundId] as const,
    results: (roundId: string) => ['voting', 'results', roundId] as const,
    round: (roundId: string) => ['voting', 'round', roundId] as const,
    leaderboard: (roundId: string) => ['voting', 'leaderboard', roundId] as const,
    submission: (roundId: string, submissionId: string) => ['voting', roundId, 'submission', submissionId] as const,
  },
  advancement: {
    preview: (roundId: string) => ['advancement', 'preview', roundId] as const,
    history: (programId: string) => ['advancement', 'history', programId] as const,
    event: (eventId: string) => ['advancement', 'event', eventId] as const,
  },
  pipeline: {
    status: (programId: string) => ['pipeline', 'status', programId] as const,
  },
  invites: {
    pending: (organizationId: string) => ['invites', 'pending', organizationId] as const,
  },
  leaderboard: {
    byProgram: (programId: string) => ['leaderboard', 'program', programId] as const,
    byRound: (roundId: string) => ['leaderboard', 'round', roundId] as const,
  },
  massEmail: {
    segments: (programId: string, roundId: string) => ['mass-email', 'segments', programId, roundId] as const,
  },
} as const;
