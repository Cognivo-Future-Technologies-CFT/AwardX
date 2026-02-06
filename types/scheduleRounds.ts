// Core Data Models for Schedule & Rounds Workflow Engine

type RoundType = 'Nomination' | 'Shortlisting' | 'Public Voting' | 'Public Rating' | 'Announce';
export default RoundType;

export type EvaluationLogic =
  | 'scoring'
  | 'rubric'
  | 'yes_no'
  | 'weighted'
  | 'ranking'
  | 'consensus';

export type EvaluatorStrategy =
  | 'all_judges'
  | 'assigned_judges'
  | 'random_assignment'
  | 'category_based'
  | 'custom';

export type StartCondition =
  | { type: 'fixed_datetime'; datetime: string }
  | { type: 'after_previous'; roundId: string }
  | { type: 'manual_trigger' };

export type EndCondition =
  | { type: 'fixed_datetime'; datetime: string }
  | { type: 'manual_close' }
  | { type: 'auto_close'; evaluationCount: number };

export type EdgeCondition =
  | { type: 'always' }
  | { type: 'if_shortlisted' }
  | { type: 'if_score_gte'; score: number }
  | { type: 'manual_approval' }
  | { type: 'custom_logic'; expression: string };

export type ShortlistVisibility = 'admin' | 'judges' | 'public';

export interface ShortlistConfig {
  enabled: boolean;
  method: 'percentage' | 'fixed_count';
  value: number; // percentage (0-100) or count
  visibility: ShortlistVisibility[];
}

export interface InputPort {
  id: string; // e.g., 'input-0', 'input-1'
  name: string; // User-defined name for the port
}

export interface OutputPort {
  id: string; // e.g., 'output-0', 'output-1'
  name: string; // User-defined name for the port
  dataStreams: string[]; // Array of data streams this port processes (e.g., ['A', 'B'] or ['A', 'B', 'C', 'D'])
  processingLogic?: {
    type: 'all' | 'filter' | 'custom'; // How to process the data
    filters?: Record<string, any>; // Additional filter criteria
  };
}

export interface Round {
  id: string;
  programId: string;
  name: string;
  type: RoundType;
  description?: string;
  evaluationLogic: EvaluationLogic;
  evaluatorStrategy: EvaluatorStrategy;
  blindEvaluation: boolean;
  startCondition: StartCondition;
  endCondition: EndCondition;
  shortlistConfig: ShortlistConfig;
  order: number; // For tile view ordering (visual only)
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  version: number; // For versioning round configurations
  metadata?: Record<string, any>; // For custom round types
  inputPorts?: InputPort[]; // Dynamic input ports with names
  outputPorts?: OutputPort[]; // Dynamic output ports with data stream configuration
  position?: { x: number; y: number }; // Node position in workflow view
}

export interface RoundEdge {
  id: string;
  programId: string;
  sourceRoundId: string;
  targetRoundId: string;
  sourceHandle?: string; // Output port ID (e.g., 'output-0', 'output-1')
  targetHandle?: string; // Input port ID (e.g., 'input-0', 'input-1')
  condition?: EdgeCondition; // Optional, defaults to { type: 'always' }
  order: number; // For multiple edges from same source
  dataStream?: string; // Name/type of datastream (e.g., 'shortlisted', 'filtered', 'all')
  name?: string; // Optional connection name
  createdAt: string;
}


export interface DataBlock {
  id: string;
  programId: string;
  name: string;
  type: 'filtered' | 'reprocessed' | 'shortlisted' | 'custom';
  description?: string;
  condition?: EdgeCondition; // Logic that created this block
  createdAt: string;
  updatedAt: string;
}

export interface RoundWorkflow {
  programId: string;
  rounds: Round[];
  dataBlocks: DataBlock[];
  edges: RoundEdge[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoundAuditLog {
  id: string;
  programId: string;
  roundId?: string;
  action: 'created' | 'updated' | 'deleted' | 'started' | 'ended' | 'transitioned';
  userId: string;
  timestamp: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}



