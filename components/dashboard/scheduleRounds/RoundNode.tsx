import React, { useMemo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import RoundType, { Round, RoundEdge, OutputPort } from '../../../types/scheduleRounds';
import { formatRoundTypeWithAudience, primaryActionLabel, shortlistRuleSummary } from '../../../lib/roundScheduleUtils';
import { Users, Globe, Shield, Settings, CheckCircle2, Clock, XCircle, MoreVertical, Sparkles, Play, Mail } from 'lucide-react';
import { RoundCardShareLinks } from './RoundCardShareLinks';

interface RoundNodeData {
  round: Round;
  onSelect: () => void;
  isSelected: boolean;
  onCreateChild?: () => void;
  incomingEdges?: RoundEdge[]; // Edges coming into this node
  outgoingEdges?: RoundEdge[]; // Edges going out of this node
  onPortClick?: (portId: string, type: 'input' | 'output') => void;
  allRounds?: Round[]; // All rounds for resolving output port streams
  roundIndex?: number;
  totalRounds?: number;
  onAdvanceRound?: (roundId: string) => void;
  onPromoteRound?: (roundId: string) => void;
  onInformParticipants?: (roundId: string) => Promise<void>;
  roundInsights?: Record<string, any>;
  insightsLoading?: boolean;
}

export const RoundNode: React.FC<NodeProps<RoundNodeData>> = ({ data }) => {
  const { round, onSelect, isSelected, onCreateChild, incomingEdges = [], outgoingEdges = [], onPortClick, allRounds = [], roundIndex = 0, totalRounds = 0, onAdvanceRound, onPromoteRound, onInformParticipants, roundInsights, insightsLoading } = data;
  const [loadingInform, setLoadingInform] = useState(false);

  const hasNextRound = roundIndex < totalRounds - 1;
  const pipelineAction = primaryActionLabel(round, hasNextRound);

  // Get input ports from round metadata or create defaults
  const inputPorts = useMemo(() => {
    if (round.inputPorts && round.inputPorts.length > 0) {
      return round.inputPorts;
    }
    // If no ports defined, create a default one
    return [{ id: 'input-0', name: 'Input 1' }];
  }, [round.inputPorts]);

  // Output ports are now configured independently, not based on input count

  // Get unique input handles from edges (to show which ports are used)
  const usedInputHandles = useMemo(() => {
    const handles = new Set<string>();
    incomingEdges.forEach(edge => {
      if (edge.targetHandle) handles.add(edge.targetHandle);
    });
    return handles;
  }, [incomingEdges]);

  // Get port name by ID
  const getPortName = (portId: string): string => {
    const port = inputPorts.find(p => p.id === portId);
    return port?.name || portId;
  };

  // Calculate available data streams from incoming edges
  // Each individual stream (A, B, C, D) should be available separately
  const availableDataStreams = useMemo(() => {
    const streams = new Set<string>();

    incomingEdges.forEach(edge => {
      // Get individual streams from source round's output port
      if (edge.sourceRoundId && edge.sourceHandle) {
        const sourceRound = allRounds.find(r => r.id === edge.sourceRoundId);
        if (sourceRound?.outputPorts) {
          const outputPort = sourceRound.outputPorts.find(p => p.id === edge.sourceHandle);
          if (outputPort && outputPort.dataStreams.length > 0) {
            // Add each individual stream from the output port
            outputPort.dataStreams.forEach(stream => streams.add(stream));
          }
        }
      }

      // Also check edge.dataStream directly for backward compatibility
      if (edge.dataStream) {
        const streamList = edge.dataStream.split(',').map(s => s.trim()).filter(s => s && s !== 'all');
        streamList.forEach(stream => streams.add(stream));
      }
    });

    return Array.from(streams).sort();
  }, [incomingEdges, allRounds]);

  // Get output ports from round metadata or create a default one
  // Every node should have at least one output port by default
  const outputPorts = useMemo(() => {
    if (round.outputPorts && round.outputPorts.length > 0) {
      return round.outputPorts;
    }
    // Always create a default output port, even if no inputs yet
    // Default name and empty streams array - will be configured when inputs are connected
    return [{
      id: 'output-0',
      name: 'Output 1',
      dataStreams: availableDataStreams.length > 0 ? availableDataStreams : []
    }];
  }, [round.outputPorts, availableDataStreams]);

  // Get unique output handles from edges
  const usedOutputHandles = useMemo(() => {
    const handles = new Set<string>();
    outgoingEdges.forEach(edge => {
      if (edge.sourceHandle) handles.add(edge.sourceHandle);
    });
    return handles;
  }, [outgoingEdges]);

  const getRoundTypeIcon = (type: RoundType) => {
    switch (type) {
      case 'Nomination':
        return <Users className="w-3.5 h-3.5" />;
      case 'Shortlisting':
        return <Shield className="w-3.5 h-3.5" />;
      case 'Public Voting':
        return <Globe className="w-3.5 h-3.5" />;
      case 'Public Rating':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'Announce':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      default:
        return <Settings className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = (status: Round['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-500 bg-green-50';
      case 'scheduled':
        return 'text-blue-500 bg-blue-50';
      case 'completed':
        return 'text-indigo-500 bg-indigo-50';
      case 'cancelled':
        return 'text-red-500 bg-red-50';
      default:
        return 'text-slate-400 bg-slate-100';
    }
  };

  return (
    <div
      onClick={onSelect}
      data-demo-target={round.id === 'round-1' ? 'schedule-round-node-1' : undefined}
      className={`
        relative w-[280px] min-h-[220px] flex flex-col rounded-xl border bg-white transition-all duration-200 group
        ${isSelected
          ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20 z-10'
          : 'border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5'
        }
      `}
    >
      {/* Multiple Input Handles - Using named ports from metadata */}
      {round.type !== 'Nomination' && inputPorts.map((port, index) => {
        const handleId = port.id;
        const isUsed = usedInputHandles.has(handleId);
        return (
          <Handle
            key={handleId}
            type="target"
            id={handleId}
            position={Position.Top}
            style={{
              left: `${(index + 1) * (100 / (inputPorts.length + 1))}%`,
            }}
            className={`!w-3 !h-3 !border-2 !border-white !rounded-full !shadow-sm transition-all
              ${isUsed
                ? '!bg-indigo-500 ring-2 ring-indigo-200'
                : '!bg-slate-200 hover:!bg-indigo-400'
              } -mt-1.5`}
            onClick={(e) => {
              e.stopPropagation();
              onPortClick?.(handleId, 'input');
            }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {port.name}
            </div>
          </Handle>
        );
      })}

      <div className="p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`
              w-8 h-8 rounded-lg flex items-center justify-center transition-colors
              ${isSelected ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'}
            `}>
              {getRoundTypeIcon(round.type)}
            </div>
            <div className="min-w-0">
              <h3 className={`font-bold text-sm truncate transition-colors ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                {round.name}
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{formatRoundTypeWithAudience(round.type)}</p>
            </div>
          </div>

          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border border-transparent ${getStatusColor(round.status)}`}>
            {round.status}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          {round.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {round.description}
            </p>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
            {round.evaluationLogic && round.evaluationLogic !== 'none' && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium px-2 py-1 rounded bg-slate-50 border border-slate-100">
                <Settings className="w-3 h-3" />
                <span className="capitalize">{round.evaluationLogic}</span>
              </div>
            )}
            {round.blindEvaluation && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium px-2 py-1 rounded bg-slate-50 border border-slate-100">
                <Globe className="w-3 h-3" />
                <span>Blind</span>
              </div>
            )}
          </div>

          {/* Add Child Button */}
          {onCreateChild && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateChild();
              }}
              className="mt-3 w-full py-1.5 text-[10px] font-bold text-center border border-dashed border-slate-200 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors opacity-0 group-hover:opacity-100"
            >
              + Add Child Round
            </button>
          )}

          {/* Shortlist Rule Summary */}
          {(round.shortlistConfig.enabled || round.type === 'Shortlisting' || round.type === 'Public Voting') && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-indigo-600 font-medium">
                {shortlistRuleSummary(round.shortlistConfig, round.type)}
              </span>
            </div>
          )}

          <RoundCardShareLinks round={round} programId={round.programId} />

          {/* Workflow Action Buttons */}
          <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap min-h-[44px]">
            {((pipelineAction && !round.isFinalized && onAdvanceRound) ||
              (round.type?.toLowerCase() === 'nomination' && !insightsLoading && roundInsights?.[round.id]?.participantTotal === 0 && onPromoteRound) ||
              ((round.status === 'active' || round.status === 'completed') && onInformParticipants) ||
              (round.status === 'completed' && !round.isFinalized && onAdvanceRound)) && (
              <>
              {pipelineAction && !round.isFinalized && onAdvanceRound && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvanceRound(round.id);
                  }}
                  disabled={round.id.startsWith('round-')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3" />
                  {pipelineAction}
                </button>
              )}
              {round.type?.toLowerCase() === 'nomination' && !insightsLoading && roundInsights?.[round.id]?.participantTotal === 0 && onPromoteRound && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPromoteRound(round.id);
                  }}
                  disabled={round.id.startsWith('round-')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all shadow-sm bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3" />
                  Promote
                </button>
              )}
              {round.status === 'completed' && !round.isFinalized && onAdvanceRound && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvanceRound(round.id);
                  }}
                  disabled={round.id.startsWith('round-')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all shadow-sm bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3" />
                  View Results
                </button>
              )}
              {(round.status === 'active' || round.status === 'completed') && onInformParticipants && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setLoadingInform(true);
                    try {
                      await onInformParticipants(round.id);
                    } finally {
                      setLoadingInform(false);
                    }
                  }}
                  disabled={round.id.startsWith('round-') || loadingInform}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all shadow-sm bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="w-3 h-3" />
                  {loadingInform ? 'Informing...' : 'Inform Participants'}
                </button>
              )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Multiple Output Handles - Using configured output ports */}
      {outputPorts.map((port, index) => {
        const handleId = port.id;
        const isUsed = usedOutputHandles.has(handleId);
        const dataStreamsLabel = port.dataStreams.join(', ');

        return (
          <Handle
            key={handleId}
            type="source"
            id={handleId}
            position={Position.Bottom}
            style={{
              left: `${(index + 1) * (100 / (outputPorts.length + 1))}%`,
            }}
            className={`!w-3 !h-3 !border-2 !border-white !rounded-full !shadow-lg transition-all -mb-1.5
              ${isUsed
                ? '!bg-indigo-500 ring-2 ring-indigo-200'
                : '!bg-indigo-400 hover:!bg-indigo-600 ring-1 ring-indigo-100'
              }`}
            onClick={(e) => {
              e.stopPropagation();
              onPortClick?.(handleId, 'output');
            }}
          >
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
              {port.name}{round.type !== 'Nomination' ? ` (${dataStreamsLabel})` : ''}
            </div>
          </Handle>
        );
      })}
    </div>
  );
};
