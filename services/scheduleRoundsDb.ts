import { fetchBackendJson } from './backendApi';
import { supabase } from './supabase';
import {
  AdvancementCriteria,
  AdvancementTrigger,
  Round,
  RoundEdge,
  EdgeCondition,
} from '../types/scheduleRounds';
import { criteriaToShortlistConfig, shortlistConfigToCriteria } from '../lib/roundScheduleUtils';
import { isDemoMode } from './demoMode';
import * as demoDb from './demoDatabase';

// Convert database round to scheduleRounds Round type
export function dbRoundToScheduleRound(dbRound: any): Round {
  const settings = dbRound.settings || {};

  // Extract dates from start/end conditions if they exist
  const startDate = settings.startCondition?.type === 'fixed_datetime'
    ? settings.startCondition.datetime
    : dbRound.start_date;

  const endDate = settings.endCondition?.type === 'fixed_datetime'
    ? settings.endCondition.datetime
    : dbRound.end_date;

  return {
    id: dbRound.id,
    programId: dbRound.program_id,
    name: settings.name || dbRound.title || 'Untitled Round',
    type: settings.type || (dbRound.type as Round['type']) || 'jury',
    description: dbRound.description || settings.description,
    evaluationLogic: settings.evaluationLogic || 'scoring',
    evaluatorStrategy: settings.evaluatorStrategy || 'all_judges',
    blindEvaluation: settings.blindEvaluation ?? false,
    startCondition: settings.startCondition || { type: 'manual_trigger' },
    endCondition: settings.endCondition || { type: 'manual_close' },
    shortlistConfig: dbRound.advancement_criteria
      ? criteriaToShortlistConfig(dbRound.advancement_criteria as AdvancementCriteria)
      : (settings.shortlistConfig || criteriaToShortlistConfig(null)),
    advancementCriteria: (dbRound.advancement_criteria as AdvancementCriteria) || shortlistConfigToCriteria(
      settings.shortlistConfig || criteriaToShortlistConfig(null),
      settings.type || dbRound.type,
    ),
    advancementTrigger: (dbRound.advancement_trigger as AdvancementTrigger) || 'manual',
    isFinalized: Boolean(dbRound.is_finalized),
    order: dbRound.sort_order ?? settings.order ?? 0,
    status: mapStatusToScheduleRound(dbRound.status),
    createdAt: dbRound.created_at || new Date().toISOString(),
    updatedAt: settings.updatedAt || dbRound.created_at || new Date().toISOString(),
    version: settings.version || 1,
    metadata: settings.metadata,
    inputPorts: settings.inputPorts || undefined,
    outputPorts: settings.outputPorts || undefined,
    position: settings.position || undefined,
  };
}

// Convert scheduleRounds Round type to database format
export function scheduleRoundToDbRound(round: Round): {
  program_id: string;
  title: string;
  description?: string | null;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
  sort_order: number;
  advancement_criteria: AdvancementCriteria;
  advancement_trigger: AdvancementTrigger;
  settings: any;
} {
  const advancementCriteria =
    round.advancementCriteria || shortlistConfigToCriteria(round.shortlistConfig, round.type);
  const advancementTrigger = round.advancementTrigger || 'manual';

  // Extract fixed dates if available
  let startDate = new Date().toISOString();
  let endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (round.startCondition.type === 'fixed_datetime') {
    startDate = round.startCondition.datetime;
  }

  if (round.endCondition.type === 'fixed_datetime') {
    endDate = round.endCondition.datetime;
  }

  return {
    program_id: round.programId,
    title: round.name,
    description: round.description || null,
    type: round.type,
    start_date: startDate,
    end_date: endDate,
    status: mapStatusToDb(round.status),
    sort_order: round.order,
    advancement_criteria: advancementCriteria,
    advancement_trigger: advancementTrigger,
    settings: {
      name: round.name,
      type: round.type,
      description: round.description,
      evaluationLogic: round.evaluationLogic,
      evaluatorStrategy: round.evaluatorStrategy,
      blindEvaluation: round.blindEvaluation,
      startCondition: round.startCondition,
      endCondition: round.endCondition,
      shortlistConfig: round.shortlistConfig,
      advancementCriteria,
      advancementTrigger,
      updatedAt: round.updatedAt,
      version: round.version,
      metadata: round.metadata,
      inputPorts: round.inputPorts,
      outputPorts: round.outputPorts,
      position: round.position,
    },
  };
}

function mapStatusToScheduleRound(dbStatus: string): Round['status'] {
  const statusMap: Record<string, Round['status']> = {
    upcoming: 'scheduled',
    active: 'active',
    completed: 'completed',
    draft: 'draft',
    cancelled: 'cancelled',
    scheduled: 'scheduled',
  };
  return statusMap[dbStatus?.toLowerCase()] || 'draft';
}

function mapStatusToDb(status: Round['status']): string {
  const statusMap: Record<Round['status'], string> = {
    draft: 'draft',
    scheduled: 'upcoming',
    active: 'active',
    completed: 'completed',
    cancelled: 'cancelled',
  };
  return statusMap[status] || 'draft';
}

type EdgeMetadata = {
  sourceHandle?: string;
  targetHandle?: string;
  dataStream?: string;
  name?: string;
};

const DEFAULT_EDGE_CONDITION: EdgeCondition = { type: 'always' };

function extractCondition(raw: any): { condition: EdgeCondition; metadata: EdgeMetadata } {
  if (!raw || typeof raw !== 'object') {
    return { condition: DEFAULT_EDGE_CONDITION, metadata: {} };
  }

  const { metadata, ...rest } = raw as Record<string, any>;
  const condition = typeof rest.type === 'string' ? (rest as EdgeCondition) : DEFAULT_EDGE_CONDITION;
  return { condition, metadata: metadata || {} };
}

function dbEdgeToScheduleRoundEdge(dbEdge: any): RoundEdge {
  const { condition, metadata } = extractCondition(dbEdge.condition);

  return {
    id: dbEdge.id,
    programId: dbEdge.program_id,
    sourceRoundId: dbEdge.source_round_id,
    targetRoundId: dbEdge.target_round_id,
    sourceHandle: metadata.sourceHandle,
    targetHandle: metadata.targetHandle,
    condition,
    order: dbEdge.sort_order ?? 0,
    dataStream: metadata.dataStream,
    name: metadata.name,
    createdAt: dbEdge.created_at || new Date().toISOString(),
  };
}

function scheduleRoundEdgeToDb(edge: RoundEdge) {
  const condition = edge.condition ? { ...edge.condition } : DEFAULT_EDGE_CONDITION;
  const metadata: EdgeMetadata = {
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    dataStream: edge.dataStream,
    name: edge.name,
  };

  return {
    program_id: edge.programId,
    source_round_id: edge.sourceRoundId,
    target_round_id: edge.targetRoundId,
    condition: { ...condition, metadata },
    sort_order: edge.order ?? 0,
  };
}

export const scheduleRoundsService = {
  async getRounds(programId: string): Promise<Round[]> {
    if (isDemoMode()) return demoDb.getDemoScheduleRounds(programId);

    try {
      const response = await fetchBackendJson<{ data: any[] }>(
        `/api/schedule-rounds/${encodeURIComponent(programId)}/rounds`,
        {
          requireAuth: true,
          errorPrefix: 'Schedule rounds API',
        },
      );

      return (response.data || []).map(dbRoundToScheduleRound);
    } catch (error) {
      console.error('Failed to load rounds:', error);
      return [];
    }
  },

  async createRound(round: Omit<Round, 'id' | 'createdAt' | 'updatedAt'>): Promise<Round> {
    const dbRound = scheduleRoundToDbRound({
      ...round,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Round);

    const response = await fetchBackendJson<{ data: any }>(
      `/api/schedule-rounds/${encodeURIComponent(round.programId)}/rounds`,
      {
        method: 'POST',
        requireAuth: true,
        errorPrefix: 'Schedule rounds API',
        body: {
          title: dbRound.title,
          description: dbRound.description,
          type: dbRound.type,
          start_date: dbRound.start_date,
          end_date: dbRound.end_date,
          status: dbRound.status,
          sort_order: dbRound.sort_order,
          advancement_criteria: dbRound.advancement_criteria,
          advancement_trigger: dbRound.advancement_trigger,
          settings: dbRound.settings,
        },
      },
    );

    return dbRoundToScheduleRound(response.data);
  },

  async updateRound(round: Round): Promise<Round> {
    const dbRound = scheduleRoundToDbRound(round);

    const response = await fetchBackendJson<{ data: any }>(
      `/api/schedule-rounds/${encodeURIComponent(round.programId)}/rounds/${encodeURIComponent(round.id)}`,
      {
        method: 'PUT',
        requireAuth: true,
        errorPrefix: 'Schedule rounds API',
        body: {
          title: dbRound.title,
          description: dbRound.description,
          type: dbRound.type,
          start_date: dbRound.start_date,
          end_date: dbRound.end_date,
          status: dbRound.status,
          sort_order: dbRound.sort_order,
          advancement_criteria: dbRound.advancement_criteria,
          advancement_trigger: dbRound.advancement_trigger,
          settings: dbRound.settings,
        },
      },
    );

    return dbRoundToScheduleRound(response.data);
  },

  async deleteRound(roundId: string, programId?: string): Promise<void> {
    if (programId) {
      await fetchBackendJson(
        `/api/schedule-rounds/${encodeURIComponent(programId)}/rounds/${encodeURIComponent(roundId)}`,
        {
          method: 'DELETE',
          requireAuth: true,
          errorPrefix: 'Schedule rounds API',
        },
      );
      return;
    }

    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const { error: edgeDeleteError } = await supabase
      .from('round_edges')
      .delete()
      .or(`source_round_id.eq.${roundId},target_round_id.eq.${roundId}`);

    if (edgeDeleteError) {
      throw new Error(edgeDeleteError.message || 'Failed to delete round connections');
    }

    const { error } = await supabase.from('rounds').delete().eq('id', roundId);
    if (error) {
      throw new Error(error.message || 'Failed to delete round');
    }
  },

  async getEdges(programId: string): Promise<RoundEdge[]> {
    if (isDemoMode()) return demoDb.getDemoScheduleEdges(programId);

    const response = await fetchBackendJson<{ data: any[] }>(
      `/api/schedule-rounds/${encodeURIComponent(programId)}/edges`,
      {
        requireAuth: true,
        errorPrefix: 'Schedule rounds API',
      },
    );

    return (response.data || []).map(dbEdgeToScheduleRoundEdge);
  },

  async saveEdges(programId: string, edges: RoundEdge[]): Promise<RoundEdge[]> {
    await fetchBackendJson<{ ok: boolean }>(
      `/api/schedule-rounds/${encodeURIComponent(programId)}/edges`,
      {
        method: 'PUT',
        requireAuth: true,
        errorPrefix: 'Schedule rounds API',
        body: {
          edges: edges.map((edge) => {
            const dbEdge = scheduleRoundEdgeToDb(edge);
            return {
              source_round_id: dbEdge.source_round_id,
              target_round_id: dbEdge.target_round_id,
              condition: dbEdge.condition,
              sort_order: dbEdge.sort_order,
            };
          }),
        },
      },
    );

    return this.getEdges(programId);
  },
};
