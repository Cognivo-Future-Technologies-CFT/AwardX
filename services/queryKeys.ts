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
  },
} as const;
