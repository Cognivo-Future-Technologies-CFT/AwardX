import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Program } from '../../../services/models';
import { Plus } from 'lucide-react';
import { Button } from '../../Button';
import { Round, RoundEdge } from '../../../types/scheduleRounds';
import { scheduleRoundsService } from '../../../services/scheduleRoundsDb';
import { roundSubmissions } from '../../../services/supabase';
import { RoundScheduler } from './RoundScheduler';
import { AdvancementPreviewModal } from '../AdvancementPreviewModal';
import {
  activateRound,
  completeRound,
  executeAdvancement,
  previewAdvancement,
  type AdvancementPreview,
} from '../../../services/roundPipelineApi';
import {
  buildLinearEdges,
  createDefaultRound,
  shortlistConfigToCriteria,
} from '../../../lib/roundScheduleUtils';
import type { AdvancementCriteria } from '../../../types/scheduleRounds';

interface RoundCardInsight {
  participantTotal: number;
  participantAdvanced: number;
}

interface ScheduleRoundsViewProps {
  activeEvent: Program | null;
}

type AdvancementModalState = {
  roundId: string;
  preview: AdvancementPreview;
  criteriaOverride: AdvancementCriteria;
};

function hasCustomWorkflowEdges(orderedRounds: Round[], edges: RoundEdge[]): boolean {
  if (edges.length === 0) return false;

  const realRounds = orderedRounds.filter((round) => !round.id.startsWith('round-'));
  if (realRounds.length <= 1) {
    return edges.length > 0;
  }

  const expectedPairs = new Set<string>();
  for (let idx = 0; idx < realRounds.length - 1; idx += 1) {
    expectedPairs.add(`${realRounds[idx].id}->${realRounds[idx + 1].id}`);
  }

  const seenPairs = new Set<string>();
  for (const edge of edges) {
    const conditionType = String((edge.condition as any)?.type || 'always').toLowerCase();
    if (conditionType !== 'always') {
      return true;
    }

    const pair = `${edge.sourceRoundId}->${edge.targetRoundId}`;
    if (!expectedPairs.has(pair) || seenPairs.has(pair)) {
      return true;
    }
    seenPairs.add(pair);
  }

  return seenPairs.size !== expectedPairs.size;
}

export const ScheduleRoundsView: React.FC<ScheduleRoundsViewProps> = ({ activeEvent }) => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundEdges, setRoundEdges] = useState<RoundEdge[]>([]);
  const [hasCustomEdges, setHasCustomEdges] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roundInsights, setRoundInsights] = useState<Record<string, RoundCardInsight>>({});
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [pipelineBusyRoundId, setPipelineBusyRoundId] = useState<string | null>(null);
  const [advancementModal, setAdvancementModal] = useState<AdvancementModalState | null>(null);
  const customEdgeWarningShown = useRef(false);

  const enforceNominationFirst = useCallback(async (inputRounds: Round[]): Promise<Round[]> => {
    const ordered = [...inputRounds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (ordered.length === 0) return ordered;

    const nominationIndex = ordered.findIndex((r) => r.type === 'Nomination');
    let normalized = ordered;

    if (nominationIndex === -1) {
      normalized = ordered.map((round, index) =>
        index === 0 ? { ...round, type: 'Nomination' as const } : round,
      );
    } else if (nominationIndex > 0) {
      const nominationRound = ordered[nominationIndex];
      normalized = [nominationRound, ...ordered.filter((_, idx) => idx !== nominationIndex)];
    }

    return normalized.map((round, index) => ({ ...round, order: index }));
  }, []);

  const persistLinearEdges = useCallback(
    async (orderedRounds: Round[], options?: { force?: boolean }) => {
      if (!activeEvent) return false;
      if (hasCustomEdges && !options?.force) {
        if (!customEdgeWarningShown.current) {
          toast.warning('Custom workflow edges detected — linear scheduler changes will not overwrite them.');
          customEdgeWarningShown.current = true;
        }
        return false;
      }

      const linearEdges = buildLinearEdges(activeEvent.id, orderedRounds);
      const savedEdges = await scheduleRoundsService.saveEdges(activeEvent.id, linearEdges);
      const customAfterSave = hasCustomWorkflowEdges(orderedRounds, savedEdges);
      setRoundEdges(savedEdges);
      setHasCustomEdges(customAfterSave);
      if (!customAfterSave) {
        customEdgeWarningShown.current = false;
      }
      return true;
    },
    [activeEvent, hasCustomEdges],
  );

  const loadRoundInsights = useCallback(async (targetRounds: Round[]) => {
    if (!activeEvent || targetRounds.length === 0) {
      setRoundInsights({});
      return;
    }

    setIsInsightsLoading(true);
    try {
      const insightsEntries = await Promise.all(
        targetRounds.map(async (round): Promise<[string, RoundCardInsight]> => {
          if (round.id.startsWith('round-')) {
            return [round.id, { participantTotal: 0, participantAdvanced: 0 }];
          }

          const { data, error } = await roundSubmissions.getByRound(round.id);
          if (error || !data) {
            return [round.id, { participantTotal: 0, participantAdvanced: 0 }];
          }

          const participantAdvanced = data.filter((row: { status?: string }) => row.status === 'advanced').length;
          return [round.id, { participantTotal: data.length, participantAdvanced }];
        }),
      );

      setRoundInsights(Object.fromEntries(insightsEntries));
    } catch (error) {
      console.error('Failed to load round insights:', error);
      setRoundInsights({});
    } finally {
      setIsInsightsLoading(false);
    }
  }, [activeEvent]);

  const loadWorkflow = useCallback(async () => {
    if (!activeEvent) return;
    setIsLoading(true);
    try {
      const [loadedRounds, loadedEdges] = await Promise.all([
        scheduleRoundsService.getRounds(activeEvent.id),
        scheduleRoundsService.getEdges(activeEvent.id).catch((error) => {
          console.error('Failed to load workflow edges:', error);
          return [] as RoundEdge[];
        }),
      ]);

      const normalizedRounds = await enforceNominationFirst(loadedRounds);
      const customDetected = hasCustomWorkflowEdges(normalizedRounds, loadedEdges);

      setRounds(normalizedRounds);
      setRoundEdges(loadedEdges);
      setHasCustomEdges(customDetected);

      if (customDetected && !customEdgeWarningShown.current) {
        toast.warning('Branching/conditional workflow edges detected. Linear edits will preserve them unless you convert.');
        customEdgeWarningShown.current = true;
      } else if (!customDetected) {
        customEdgeWarningShown.current = false;
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      setRounds([]);
      setRoundEdges([]);
      setHasCustomEdges(false);
    } finally {
      setIsLoading(false);
    }
  }, [activeEvent, enforceNominationFirst]);

  useEffect(() => {
    void loadRoundInsights(rounds);
  }, [rounds, loadRoundInsights]);

  useEffect(() => {
    if (activeEvent) {
      void loadWorkflow();
    }
  }, [activeEvent, loadWorkflow]);

  const handleRoundUpdate = useCallback(
    async (round: Round): Promise<void> => {
      let updatedRound: Round;

      if (round.id.startsWith('round-')) {
        const { id, createdAt, updatedAt, ...roundToCreate } = round;
        updatedRound = await scheduleRoundsService.createRound(roundToCreate);
      } else {
        updatedRound = await scheduleRoundsService.updateRound({
          ...round,
          updatedAt: new Date().toISOString(),
          version: (rounds.find((r) => r.id === round.id)?.version || 0) + 1,
        });
      }

      let nextRounds: Round[] = [];
      setRounds((prev) => {
        nextRounds = prev.some((r) => r.id === updatedRound.id)
          ? prev.map((r) => (r.id === updatedRound.id ? updatedRound : r))
          : [...prev, updatedRound];
        return nextRounds;
      });

      try {
        await persistLinearEdges(nextRounds);
      } catch (error) {
        console.error('Failed to persist linear edges after round save:', error);
        toast.error('Round saved, but workflow connections were not updated.');
      }

      if (round.id.startsWith('round-') && updatedRound.id !== round.id) {
        setSelectedRoundId(updatedRound.id);
        setEditingRoundId(updatedRound.id);
      }
    },
    [rounds, persistLinearEdges],
  );

  const handleRoundDelete = useCallback(
    async (roundId: string) => {
      if (!roundId.startsWith('round-')) {
        await scheduleRoundsService.deleteRound(roundId);
      }

      let nextRounds: Round[] = [];
      setRounds((prev) => {
        nextRounds = prev.filter((r) => r.id !== roundId).map((r, i) => ({ ...r, order: i }));
        return nextRounds;
      });

      try {
        await persistLinearEdges(nextRounds);
      } catch (error) {
        console.error('Failed to persist linear edges after round deletion:', error);
        toast.error('Round deleted, but workflow connections were not updated.');
      }

      setSelectedRoundId((prev) => (prev === roundId ? null : prev));
      setEditingRoundId((prev) => (prev === roundId ? null : prev));
    },
    [persistLinearEdges],
  );

  const handleRoundReorder = useCallback(
    async (reorderedRounds: Round[]) => {
      setRounds(reorderedRounds);
      try {
        await Promise.all(
          reorderedRounds.map((round) =>
            scheduleRoundsService.updateRound({
              ...round,
              updatedAt: new Date().toISOString(),
            }),
          ),
        );
        await persistLinearEdges(reorderedRounds);
      } catch (error) {
        console.error('Failed to persist round order:', error);
        toast.error('Could not save round order');
      }
    },
    [persistLinearEdges],
  );

  const createNewRound = useCallback(() => {
    if (!activeEvent) return;
    const newRound = createDefaultRound(activeEvent.id, rounds.length);
    void handleRoundUpdate(newRound);
    setSelectedRoundId(newRound.id);
    setEditingRoundId(newRound.id);
  }, [activeEvent, rounds.length, handleRoundUpdate]);

  const handleConvertToLinear = useCallback(async () => {
    if (!activeEvent) return;

    if (hasCustomEdges) {
      const confirmed = window.confirm(
        'This will replace existing branching/conditional workflow edges with a simple linear sequence. Continue?',
      );
      if (!confirmed) return;
    }

    try {
      const orderedRounds = [...rounds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      await persistLinearEdges(orderedRounds, { force: true });
      toast.success('Workflow connections converted to linear sequence.');
    } catch (error) {
      console.error('Failed to convert workflow to linear edges:', error);
      toast.error('Could not convert workflow connections');
    }
  }, [activeEvent, hasCustomEdges, rounds, persistLinearEdges]);

  const openAdvancementPreview = useCallback(async (round: Round) => {
    const criteriaOverride = shortlistConfigToCriteria(round.shortlistConfig, round.type);
    const preview = await previewAdvancement(round.id, criteriaOverride);

    if (preview.hasEmptyScores) {
      toast.error('No scores yet — judges must score submissions before shortlisting.');
      return;
    }

    setAdvancementModal({ roundId: round.id, preview, criteriaOverride });
  }, []);

  const handleRunPipelineAction = useCallback(
    async (roundId: string) => {
      const round = rounds.find((r) => r.id === roundId);
      if (!round || round.id.startsWith('round-')) return;

      setPipelineBusyRoundId(roundId);
      try {
        if (round.status === 'draft' || round.status === 'scheduled') {
          const activated = await activateRound(roundId);
          if (!activated.ok) {
            throw new Error(activated.error || 'Could not start round');
          }
          toast.success(`"${round.name}" is now active`);
          await loadWorkflow();
          return;
        }

        if (round.status === 'active') {
          const completed = await completeRound(roundId);
          if (!completed.ok) {
            throw new Error(completed.error || 'Could not end round');
          }
          const refreshed = { ...round, status: 'completed' as const };
          await openAdvancementPreview(refreshed);
          await loadWorkflow();
          return;
        }

        if (round.status === 'completed' && !round.isFinalized) {
          await openAdvancementPreview(round);
          return;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Pipeline action failed';
        toast.error(message);
      } finally {
        setPipelineBusyRoundId(null);
      }
    },
    [rounds, loadWorkflow, openAdvancementPreview],
  );

  const handleExecuteAdvancement = useCallback(
    async (
      overrides: Array<{ submissionId: string; action: 'advance' | 'eliminate'; reason?: string }>,
    ) => {
      if (!advancementModal) return;

      const tieResolutions =
        advancementModal.preview.paused && advancementModal.preview.reason === 'tie_at_boundary'
          ? advancementModal.preview.ties.map((t) => ({
              submissionId: t.submissionId,
              action: 'eliminate' as const,
            }))
          : undefined;

      const result = await executeAdvancement(advancementModal.roundId, {
        criteriaOverride: advancementModal.criteriaOverride,
        overrides,
        tieResolutions,
      });

      if (!result?.ok) {
        throw new Error(result?.error || 'Advancement failed');
      }

      const currentIndex = rounds.findIndex((r) => r.id === advancementModal.roundId);
      const nextRound = rounds[currentIndex + 1];
      if (nextRound && (nextRound.status === 'draft' || nextRound.status === 'scheduled')) {
        await activateRound(nextRound.id);
        toast.success(`Advanced participants into "${nextRound.name}"`);
      } else {
        toast.success('Round shortlist completed');
      }

      setAdvancementModal(null);
      await loadWorkflow();
    },
    [advancementModal, rounds, loadWorkflow],
  );

  const editingRound = editingRoundId ? rounds.find((r) => r.id === editingRoundId) || null : null;

  if (!activeEvent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Please select a program to configure rounds</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading schedule…</p>
        </div>
      </div>
    );
  }

  const mapPreviewParticipant = (p: { submissionId: string; score: number; rank: number }) => ({
    submissionId: p.submissionId,
    title: `Submission ${p.submissionId.slice(0, 8)}`,
    applicantName: 'Participant',
    score: p.score,
    rank: p.rank,
  });

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Schedule & Rounds</h2>
          <p className="text-sm text-slate-500 mt-1">
            Linear round scheduler — start each round, then run shortlist to move top entries forward
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleConvertToLinear}>
            Convert to linear flow
          </Button>
          <Button variant="primary" onClick={createNewRound} className="shadow-lg shadow-indigo-500/20">
            <Plus className="w-4 h-4 mr-2" />
            Add round
          </Button>
        </div>
      </div>

      {hasCustomEdges && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
          Branching or conditional workflow edges are active. Scheduler edits will preserve those edges unless you
          explicitly convert to linear flow.
        </div>
      )}

      <div className="flex-1 min-w-0 overflow-hidden">
        <RoundScheduler
          rounds={rounds}
          roundInsights={roundInsights}
          insightsLoading={isInsightsLoading}
          selectedRoundId={selectedRoundId}
          editingRound={editingRound}
          pipelineBusyRoundId={pipelineBusyRoundId}
          onRoundSelect={(id) => {
            setSelectedRoundId(id);
            setEditingRoundId(id);
          }}
          onRoundReorder={handleRoundReorder}
          onRoundSave={handleRoundUpdate}
          onAddRound={createNewRound}
          onRunPipelineAction={handleRunPipelineAction}
          onCloseEditor={() => setEditingRoundId(null)}
        />
      </div>

      {advancementModal && (
        <AdvancementPreviewModal
          isOpen
          roundId={advancementModal.roundId}
          advancing={advancementModal.preview.advancing.map(mapPreviewParticipant)}
          eliminated={advancementModal.preview.eliminated.map(mapPreviewParticipant)}
          ties={advancementModal.preview.ties.map(mapPreviewParticipant)}
          onExecute={handleExecuteAdvancement}
          onClose={() => setAdvancementModal(null)}
        />
      )}
    </div>
  );
};
