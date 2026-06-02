import React, { useMemo } from 'react';
import {
  Calendar,
  ChevronRight,
  GripVertical,
  Loader2,
  Pencil,
  Play,
  Plus,
  Users,
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import type { Round } from '../../../types/scheduleRounds';
import {
  formatRoundDates,
  primaryActionLabel,
  roundUsesShortlist,
} from '../../../lib/roundScheduleUtils';
import { Button } from '../../Button';
import { SimpleRoundEditor } from './SimpleRoundEditor';

export interface RoundSchedulerInsight {
  participantTotal: number;
  participantAdvanced: number;
}

interface RoundSchedulerProps {
  rounds: Round[];
  roundInsights: Record<string, RoundSchedulerInsight>;
  insightsLoading?: boolean;
  selectedRoundId: string | null;
  editingRound: Round | null;
  pipelineBusyRoundId: string | null;
  onRoundSelect: (roundId: string | null) => void;
  onRoundReorder: (rounds: Round[]) => void;
  onRoundSave: (round: Round) => Promise<void>;
  onAddRound: () => void;
  onRunPipelineAction: (roundId: string) => void;
  onCloseEditor: () => void;
}

function statusStyles(status: Round['status'], isFinalized?: boolean) {
  if (isFinalized) return 'bg-slate-100 text-slate-600 border-slate-200';
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'completed':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'scheduled':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function statusLabel(round: Round) {
  if (round.isFinalized) return 'Finalized';
  if (round.status === 'completed') return 'Ended — ready to shortlist';
  return round.status.charAt(0).toUpperCase() + round.status.slice(1);
}

export const RoundScheduler: React.FC<RoundSchedulerProps> = ({
  rounds,
  roundInsights,
  insightsLoading,
  selectedRoundId,
  editingRound,
  pipelineBusyRoundId,
  onRoundSelect,
  onRoundReorder,
  onRoundSave,
  onAddRound,
  onRunPipelineAction,
  onCloseEditor,
}) => {
  const sorted = useMemo(
    () => [...rounds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [rounds],
  );

  const handleReorder = (reordered: Round[]) => {
    onRoundReorder(reordered.map((r, index) => ({ ...r, order: index })));
  };

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50">
        <Calendar className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Build your program timeline</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Add rounds in order — nominations, shortlisting, judging, and finals. Drag to reorder, then start each round when ready.
        </p>
        <Button variant="primary" className="mt-6" onClick={onAddRound}>
          <Plus className="w-4 h-4 mr-2" />
          Add first round
        </Button>
      </div>
    );
  }

  return (
    <div className="relative h-full flex bg-slate-50">
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Program timeline</h3>
              <p className="text-sm text-slate-500 mt-1">
                Rounds run top to bottom. Shortlisting uses scores to advance the top entries into the next round.
              </p>
            </div>
            <Button variant="outline" onClick={onAddRound} className="shrink-0 text-sm">
              <Plus className="w-4 h-4 mr-1" />
              Add round
            </Button>
          </div>

          <Reorder.Group axis="y" values={sorted} onReorder={handleReorder} className="space-y-0">
            {sorted.map((round, index) => {
              const insight = roundInsights[round.id];
              const hasNext = index < sorted.length - 1;
              const action = primaryActionLabel(round, hasNext);
              const isBusy = pipelineBusyRoundId === round.id;
              const isSelected = selectedRoundId === round.id;

              return (
                <Reorder.Item key={round.id} value={round} className="relative">
                  {index < sorted.length - 1 && (
                    <div className="absolute left-[1.65rem] top-[4.5rem] bottom-0 w-px bg-slate-200 z-0" />
                  )}

                  <div
                    className={`relative z-10 mb-4 rounded-2xl border bg-white p-4 shadow-sm transition-all ${
                      isSelected ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <span className="text-slate-300 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <span className="mt-2 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900">{round.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {round.type}
                              {roundUsesShortlist(round) && (
                                <span className="ml-2 text-indigo-600 font-semibold">
                                  ·{' '}
                                  {round.shortlistConfig.method === 'percentage'
                                    ? `Top ${round.shortlistConfig.value}%`
                                    : `Top ${round.shortlistConfig.value}`}
                                </span>
                              )}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${statusStyles(
                              round.status,
                              round.isFinalized,
                            )}`}
                          >
                            {statusLabel(round)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-2">{formatRoundDates(round)}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {insightsLoading
                              ? '…'
                              : `${insight?.participantTotal ?? 0} in round`}
                          </span>
                          {!insightsLoading && (insight?.participantAdvanced ?? 0) > 0 && (
                            <span className="text-emerald-700 font-semibold">
                              {insight?.participantAdvanced} advanced
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onRoundSelect(round.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>

                          {action && !round.isFinalized && (
                            <button
                              type="button"
                              disabled={isBusy || round.id.startsWith('round-')}
                              onClick={() => onRunPipelineAction(round.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                              {action}
                            </button>
                          )}

                          {round.isFinalized && hasNext && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 px-2">
                              <ChevronRight className="w-3.5 h-3.5" />
                              Next round can start
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>
      </div>

      {editingRound && (
        <SimpleRoundEditor
          round={editingRound}
          onSave={onRoundSave}
          onClose={onCloseEditor}
          allRounds={rounds}
        />
      )}
    </div>
  );
};
