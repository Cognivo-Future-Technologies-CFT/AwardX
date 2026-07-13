export interface ResourceUsage {
  submissionsUsed: number;
  storageMbUsed: number;
  aiCreditsUsed: number;
  teamMembersUsed: number;
}

export type UsageStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNLIMITED';

export interface UsageHistoryPoint {
  month: string; // e.g., 'Jan'
  submissions: number;
  storage: number;
}
