import React, { useState } from 'react';
import { Round } from '../../../types/scheduleRounds';
import { RoundConfigurationPanel } from './RoundConfigurationPanel';
import { Plus, GripVertical, Users, Globe, Shield, Settings, Calendar, Play } from 'lucide-react';
import { primaryActionLabel } from '../../../lib/roundScheduleUtils';
import { Button } from '../../Button';
import { Reorder } from 'framer-motion';
import { Modal } from '../../Modal';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';

interface RoundParticipantInsight {
  id: string;
  name: string;
  avatarUrl?: string;
  status: 'active' | 'advanced' | 'eliminated';
  score?: number | null;
  votes?: number;
}

interface RoundJudgeInsight {
  id: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  scoreStatus: 'scored' | 'pending';
}

interface RoundCardInsight {
  participantTotal: number;
  participantAdvanced: number;
  participants: RoundParticipantInsight[];
  judgeTotal: number;
  judges: RoundJudgeInsight[];
}

interface TileViewProps {
  rounds: Round[];
  edges?: any[];
  selectedRoundId: string | null;
  onRoundSelect: (roundId: string | null) => void;
  onRoundUpdate: (round: Round) => Promise<Round>;
  onRoundDelete: (roundId: string) => void;
  onRoundReorder: (rounds: Round[]) => void;
  onAddRound?: () => void;
  programId: string;
  roundInsights?: Record<string, RoundCardInsight>;
  insightsLoading?: boolean;
  onAdvanceRound?: (roundId: string) => void;
  onPromoteRound?: (roundId: string) => void;
  /** When true, drag-reorder updates the sequential flow (not visual-only). */
  reorderUpdatesFlow?: boolean;
}

export const TileView: React.FC<TileViewProps> = ({
  rounds,
  edges = [],
  selectedRoundId,
  onRoundSelect,
  onRoundUpdate,
  onRoundDelete,
  onRoundReorder,
  onAddRound,
  programId,
  roundInsights,
  insightsLoading,
  onAdvanceRound,
  onPromoteRound,
  reorderUpdatesFlow = false,
}) => {
  const [items, setItems] = useState(rounds);
  const [participantsListRoundId, setParticipantsListRoundId] = useState<string | null>(null);
  const [judgesListRoundId, setJudgesListRoundId] = useState<string | null>(null);

  React.useEffect(() => {
    setItems(rounds);
  }, [rounds]);

  const handleReorder = (newOrder: Round[]) => {
    setItems(newOrder);
    const reordered = newOrder.map((round, index) => ({ ...round, order: index }));
    onRoundReorder(reordered);
  };

  const getRoundTypeIcon = (type: Round['type']) => {
    switch (type) {
      case 'jury':
        return <Users className="w-5 h-5" />;
      case 'public':
        return <Globe className="w-5 h-5" />;
      case 'hybrid':
        return <Users className="w-5 h-5" />;
      case 'compliance':
        return <Shield className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: Round['status']) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">Draft</span>;
      case 'scheduled':
        return <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-medium">Scheduled</span>;
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs font-medium">Active</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-indigo-100 text-indigo-600 rounded text-xs font-medium">Completed</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-medium">Cancelled</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const getStartDate = (round: Round) => {
    if (round.startCondition.type === 'fixed_datetime') {
      return round.startCondition.datetime;
    }
    return undefined;
  };

  const getEndDate = (round: Round) => {
    if (round.endCondition.type === 'fixed_datetime') {
      return round.endCondition.datetime;
    }
    return undefined;
  };

  const selectedRound = rounds.find(r => r.id === selectedRoundId);
  const participantsListRound = items.find(r => r.id === participantsListRoundId) || null;
  const judgesListRound = items.find(r => r.id === judgesListRoundId) || null;

  const getInitials = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return 'NA';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const getParticipantStatusBadge = (status: RoundParticipantInsight['status']) => {
    if (status === 'advanced') {
      return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">Advanced</span>;
    }
    if (status === 'eliminated') {
      return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold">Eliminated</span>;
    }
    return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">Active</span>;
  };

  const getJudgeScoreBadge = (scoreStatus: RoundJudgeInsight['scoreStatus']) => {
    if (scoreStatus === 'scored') {
      return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold">Scored</span>;
    }
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">Pending</span>;
  };

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-50" data-demo-target="schedule-tiles-canvas">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Rounds Configured</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            Create your first evaluation round to get started. Rounds can be configured with different evaluation types and conditions.
          </p>
          <Button variant="primary" onClick={() => onAddRound?.()}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Round
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Rounds Overview</h3>
              <p className="text-sm text-slate-500 mt-1">
                {reorderUpdatesFlow
                  ? 'Drag to reorder cards — connections and conditions stay the same'
                  : 'Drag to reorder (visual only)'}
              </p>
            </div>
            <Button variant="primary" onClick={() => onAddRound?.()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Round
            </Button>
          </div>

          <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-4">
            {items.map((round, index) => {
              const hasNextRound = index < items.length - 1;
              const pipelineAction = primaryActionLabel(round, hasNextRound);

              return (
              <Reorder.Item
                key={round.id}
                value={round}
                className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                data-demo-target={round.id === 'round-1' ? 'schedule-tile-round-1' : undefined}
                onClick={() => onRoundSelect(round.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 text-slate-400 cursor-move">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-indigo-600 flex-shrink-0">
                          {getRoundTypeIcon(round.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-lg mb-1">{round.name}</h4>
                          <p className="text-sm text-slate-500 capitalize">
                            {round.type}
                            {round.evaluationLogic && round.evaluationLogic !== 'none' && ` • ${round.evaluationLogic}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 flex-wrap justify-end">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 border border-slate-200 rounded-full bg-white px-2 py-1 hover:bg-slate-100 transition-colors"
                          onClick={(event) => {
                            event.stopPropagation();
                            setParticipantsListRoundId(round.id);
                          }}
                        >
                          <div className="flex -space-x-2">
                            {(roundInsights?.[round.id]?.participants || []).slice(0, 3).map(participant => (
                              <Avatar key={participant.id} className="w-6 h-6 border-2 border-white">
                                <AvatarImage src={participant.avatarUrl} alt={participant.name} />
                                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-[10px]">
                                  {getInitials(participant.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {(roundInsights?.[round.id]?.participants || []).length === 0 && (
                              <span className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white text-slate-500 flex items-center justify-center">
                                <Users className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                            {insightsLoading
                              ? 'Participants...'
                              : (roundInsights?.[round.id]?.participantTotal || 0) > 0
                                ? `${roundInsights[round.id].participantTotal} nominations`
                                : 'Enroll submissions'}
                          </span>
                          {!insightsLoading && (roundInsights?.[round.id]?.participantAdvanced || 0) > 0 && (
                            <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              {roundInsights?.[round.id]?.participantAdvanced || 0} shortlisted
                            </span>
                          )}
                        </button>

                        {round.type?.toLowerCase() !== 'nomination' && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 border border-slate-200 rounded-full bg-white px-2 py-1 hover:bg-slate-100 transition-colors"
                            onClick={(event) => {
                              event.stopPropagation();
                              setJudgesListRoundId(round.id);
                            }}
                          >
                            <div className="flex -space-x-2">
                              {(roundInsights?.[round.id]?.judges || []).slice(0, 3).map(judge => (
                                <Avatar key={judge.id} className="w-6 h-6 border-2 border-white">
                                  <AvatarImage src={judge.avatarUrl} alt={judge.name} />
                                  <AvatarFallback className="bg-amber-100 text-amber-800 text-[10px]">
                                    {getInitials(judge.name)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {(roundInsights?.[round.id]?.judges || []).length === 0 && (
                                <span className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white text-slate-500 flex items-center justify-center">
                                  <Users className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                              {insightsLoading
                                ? 'Judges...'
                                : (roundInsights?.[round.id]?.judgeTotal || 0) > 0
                                  ? `${roundInsights[round.id].judgeTotal} judges`
                                  : 'No judges yet'}
                            </span>
                          </button>
                        )}

                        {getStatusBadge(round.status)}
                      </div>
                    </div>

                    {round.description && (
                      <p className="text-sm text-slate-600 mb-3">{round.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500">Start:</span>
                        <span className="ml-2 text-slate-700">{formatDate(getStartDate(round))}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">End:</span>
                        <span className="ml-2 text-slate-700">{formatDate(getEndDate(round))}</span>
                      </div>
                      {round.type?.toLowerCase() !== 'nomination' && (
                        <>
                          <div>
                            <span className="text-slate-500">Evaluators:</span>
                            <span className="ml-2 text-slate-700 capitalize">{round.evaluatorStrategy.replace('_', ' ')}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Blind:</span>
                            <span className="ml-2 text-slate-700">{round.blindEvaluation ? 'Yes' : 'No'}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {round.shortlistConfig.enabled && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-xs text-indigo-600 font-medium">
                          Shortlist: {round.shortlistConfig.method === 'percentage'
                            ? `${round.shortlistConfig.value}%`
                            : `${round.shortlistConfig.value} entries`}
                        </span>
                      </div>
                    )}

                    {pipelineAction && !round.isFinalized && onAdvanceRound && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onAdvanceRound(round.id);
                          }}
                          disabled={round.id.startsWith('round-')}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Play className="w-3.5 h-3.5" />
                          {pipelineAction}
                        </button>
                        {round.type?.toLowerCase() === 'nomination' && !insightsLoading && roundInsights?.[round.id]?.participantTotal === 0 && onPromoteRound && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onPromoteRound(round.id);
                            }}
                            disabled={round.id.startsWith('round-')}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-sm bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Promote
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Reorder.Item>
            );
            })}
          </Reorder.Group>
        </>
      )}

      {/* Configuration Panel */}
      {selectedRound && (() => {
        const roundIncomingEdges = edges.filter(e => e.targetRoundId === selectedRound.id);
        return (
          <RoundConfigurationPanel
            round={selectedRound}
            programId={programId}
            onUpdate={onRoundUpdate}
            onDelete={() => {
              onRoundDelete(selectedRound.id);
              onRoundSelect(null);
            }}
            onClose={() => onRoundSelect(null)}
            incomingEdges={roundIncomingEdges}
            allRounds={rounds}
          />
        );
      })()}

      <Modal
        isOpen={Boolean(participantsListRound)}
        onClose={() => setParticipantsListRoundId(null)}
        title={participantsListRound ? `${participantsListRound.name} - Participants` : 'Participants'}
        size="lg"
      >
        {participantsListRound && (roundInsights?.[participantsListRound.id]?.participants || []).length === 0 ? (
          <div className="text-sm text-slate-500">No participants enrolled in this round yet.</div>
        ) : (
          <div className="space-y-2">
            {(participantsListRound ? (roundInsights?.[participantsListRound.id]?.participants || []) : []).map(participant => (
              <div key={participant.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 border border-slate-200">
                    <AvatarImage src={participant.avatarUrl} alt={participant.name} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                      {getInitials(participant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{participant.name}</p>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      {typeof participant.score === 'number' && <span>Score {participant.score.toFixed(1)}</span>}
                      {typeof participant.votes === 'number' && <span>Votes {participant.votes}</span>}
                    </div>
                  </div>
                </div>
                {getParticipantStatusBadge(participant.status)}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(judgesListRound)}
        onClose={() => setJudgesListRoundId(null)}
        title={judgesListRound ? `${judgesListRound.name} - Judges` : 'Judges'}
      >
        {judgesListRound && (roundInsights?.[judgesListRound.id]?.judges || []).length === 0 ? (
          <div className="text-sm text-slate-500">No judges assigned to this round yet.</div>
        ) : (
          <div className="space-y-2">
            {(judgesListRound ? (roundInsights?.[judgesListRound.id]?.judges || []) : []).map(judge => (
              <div key={judge.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-10 h-10 border border-slate-200">
                    <AvatarImage src={judge.avatarUrl} alt={judge.name} />
                    <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold">
                      {getInitials(judge.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{judge.name}</p>
                    <p className="text-xs text-slate-500 truncate">{judge.email || 'No email available'}</p>
                  </div>
                </div>
                {getJudgeScoreBadge(judge.scoreStatus)}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};




