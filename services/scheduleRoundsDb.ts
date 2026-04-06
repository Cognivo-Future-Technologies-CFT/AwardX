import { rounds as supabaseRounds, roundEdges as supabaseRoundEdges, supabase } from './supabase';
import { Round, RoundEdge, EdgeCondition } from '../types/scheduleRounds';

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
    shortlistConfig: settings.shortlistConfig || {
      enabled: false,
      method: 'percentage',
      value: 50,
      visibility: ['admin'],
    },
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
  settings: any;
} {
  // Extract fixed dates if available
  let startDate = new Date().toISOString();
  let endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Default: 7 days from now

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
      updatedAt: round.updatedAt,
      version: round.version,
      metadata: round.metadata,
      inputPorts: round.inputPorts,
      outputPorts: round.outputPorts,
      position: round.position,
    },
  };
}

// Status mapping functions
function mapStatusToScheduleRound(dbStatus: string): Round['status'] {
  const statusMap: Record<string, Round['status']> = {
    'upcoming': 'scheduled',
    'active': 'active',
    'completed': 'completed',
    'draft': 'draft',
    'cancelled': 'cancelled',
    'scheduled': 'scheduled',
  };
  return statusMap[dbStatus?.toLowerCase()] || 'draft';
}

function mapStatusToDb(status: Round['status']): string {
  const statusMap: Record<Round['status'], string> = {
    'draft': 'draft',
    'scheduled': 'upcoming',
    'active': 'active',
    'completed': 'completed',
    'cancelled': 'cancelled',
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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

// Main service functions
export const scheduleRoundsService = {
  // Get all rounds for a program
  async getRounds(programId: string): Promise<Round[]> {
    const { data, error } = await supabaseRounds.getByProgram(programId);
    
    if (error || !data) {
      console.error('Failed to load rounds:', error);
      return [];
    }

    return data.map(dbRoundToScheduleRound);
  },

  // Create a new round
  async createRound(round: Omit<Round, 'id' | 'createdAt' | 'updatedAt'>): Promise<Round> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const dbRound = scheduleRoundToDbRound({
      ...round,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Round);
    
    console.log('Creating round in database:', { program_id: dbRound.program_id, title: dbRound.title, settings: dbRound.settings });
    
    const { data, error } = await supabase
      .from('rounds')
      .insert({
        program_id: dbRound.program_id,
        title: dbRound.title,
        description: dbRound.description,
        type: dbRound.type,
        start_date: dbRound.start_date,
        end_date: dbRound.end_date,
        status: dbRound.status,
        sort_order: dbRound.sort_order,
        settings: dbRound.settings,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to create round:', error);
      throw new Error(error?.message || 'Failed to create round');
    }

    console.log('Round created successfully:', data.id);
    return dbRoundToScheduleRound(data);
  },

  // Update an existing round
  async updateRound(round: Round): Promise<Round> {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    const dbRound = scheduleRoundToDbRound(round);
    
    console.log('Updating round in database:', { id: round.id, title: dbRound.title, settings: dbRound.settings });
    
    // Use direct supabase call to update all fields including settings
    const { data, error } = await supabase
      .from('rounds')
      .update({
        title: dbRound.title,
        description: dbRound.description,
        type: dbRound.type,
        start_date: dbRound.start_date,
        end_date: dbRound.end_date,
        status: dbRound.status,
        sort_order: dbRound.sort_order,
        settings: dbRound.settings,
      })
      .eq('id', round.id)
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to update round:', error);
      throw new Error(error?.message || 'Failed to update round');
    }

    console.log('Round updated successfully:', data.id);
    return dbRoundToScheduleRound(data);
  },

  // Delete a round
  async deleteRound(roundId: string): Promise<void> {
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

    const { error } = await supabaseRounds.delete(roundId);
    
    if (error) {
      throw new Error(error.message || 'Failed to delete round');
    }
  },

  // Get edges for a program
  async getEdges(programId: string): Promise<RoundEdge[]> {
    if (!supabase) {
      console.warn('Supabase not configured; returning empty edge list');
      return [];
    }

    const { data, error } = await supabaseRoundEdges.getByProgram(programId);
    if (error || !data) {
      console.error('Failed to load edges from database:', error);
      throw new Error(error?.message || 'Failed to load round connections');
    }

    return data.map(dbEdgeToScheduleRoundEdge);
  },

  // Save edges for a program
  async saveEdges(programId: string, edges: RoundEdge[]): Promise<RoundEdge[]> {
    if (!supabase) {
      console.warn('Supabase not configured; skipping edge persistence');
      return edges;
    }

    const { data: existingData, error: existingError } = await supabaseRoundEdges.getByProgram(programId);
    if (existingError || !existingData) {
      throw new Error(existingError?.message || 'Failed to load existing round connections');
    }

    const incomingIds = new Set(edges.filter(e => isUuid(e.id)).map(e => e.id));
    const deletions = existingData.filter(edge => !incomingIds.has(edge.id));

    await Promise.all(
      deletions.map(edge => supabaseRoundEdges.delete(edge.id))
    );

    const persisted: RoundEdge[] = [];

    for (const edge of edges) {
      const dbPayload = scheduleRoundEdgeToDb(edge);
      if (isUuid(edge.id)) {
        const { data, error } = await supabaseRoundEdges.update(edge.id, dbPayload);
        if (!error && data) {
          persisted.push(dbEdgeToScheduleRoundEdge(data));
        }
      } else {
        const { data, error } = await supabaseRoundEdges.create(dbPayload);
        if (!error && data) {
          persisted.push(dbEdgeToScheduleRoundEdge(data));
        }
      }
    }

    return persisted.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
};

