import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Program } from '../../../services/models';
import { ArrowRightLeft, LayoutGrid, Plus, Workflow } from 'lucide-react';
import { Button } from '../../Button';
import { Round, RoundEdge } from '../../../types/scheduleRounds';
import { scheduleRoundsService } from '../../../services/scheduleRoundsDb';
import { roundSubmissions } from '../../../services/supabase';
import { WorkflowView } from './WorkflowView';
import { TileView } from './TileView';
import { RepresentationConversionModal } from './RepresentationConversionModal';
import { AdvancementPreviewModal } from '../AdvancementPreviewModal';
import {
  analyzeConversionToTiles,
  analyzeConversionToWorkflow,
  convertToTilesRepresentation,
  convertToWorkflowRepresentation,
  hasCustomWorkflowEdges,
  inferRepresentation,
  readStoredRepresentation,
  writeStoredRepresentation,
  type ConversionAnalysis,
  type ScheduleRepresentation,
} from '../../../lib/roundRepresentationConversion';
import {
  activateRound,
  completeRound,
  executeAdvancement,
  previewAdvancement,
  type AdvancementPreview,
} from '../../../services/roundPipelineApi';
import { createDefaultRound, shortlistConfigToCriteria } from '../../../lib/roundScheduleUtils';
import type { AdvancementCriteria } from '../../../types/scheduleRounds';
import { AddRoundSheet } from './AddRoundSheet';

interface RoundCardInsight {
  participantTotal: number;
  participantAdvanced: number;
}

interface ScheduleRoundsViewProps {
  activeEvent: Program | null;
  representation?: ScheduleRepresentation;
  onRepresentationChange?: (mode: ScheduleRepresentation) => void;
}

type AdvancementModalState = {
  roundId: string;
  preview: AdvancementPreview;
  criteriaOverride: AdvancementCriteria;
};

export const ScheduleRoundsView: React.FC<ScheduleRoundsViewProps> = ({
  activeEvent,
  representation: representationProp,
  onRepresentationChange,
}) => {
  const [internalRepresentation, setInternalRepresentation] = useState<ScheduleRepresentation>('tiles');
  const representation = representationProp ?? internalRepresentation;

  const updateRepresentation = useCallback(
    (mode: ScheduleRepresentation) => {
      if (representationProp === undefined) {
        setInternalRepresentation(mode);
      }
      onRepresentationChange?.(mode);
      if (activeEvent) {
        writeStoredRepresentation(activeEvent.id, mode);
      }
    },
    [activeEvent, onRepresentationChange, representationProp],
  );
  const [conversionTarget, setConversionTarget] = useState<ScheduleRepresentation | null>(null);
  const [conversionAnalysis, setConversionAnalysis] = useState<ConversionAnalysis | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundEdges, setRoundEdges] = useState<RoundEdge[]>([]);
  const [hasCustomEdges, setHasCustomEdges] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roundInsights, setRoundInsights] = useState<Record<string, RoundCardInsight>>({});
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [advancementModal, setAdvancementModal] = useState<AdvancementModalState | null>(null);
  const [addRoundOpen, setAddRoundOpen] = useState(false);
  const [isCreatingRound, setIsCreatingRound] = useState(false);
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

  const persistWorkflowEdges = useCallback(
    async (updatedEdges: RoundEdge[], orderedRounds: Round[]) => {
      if (!activeEvent) return [];
      const savedEdges = await scheduleRoundsService.saveEdges(activeEvent.id, updatedEdges);
      const customAfterSave = hasCustomWorkflowEdges(orderedRounds, savedEdges);
      setRoundEdges(savedEdges);
      setHasCustomEdges(customAfterSave);
      if (customAfterSave) {
        customEdgeWarningShown.current = true;
      } else {
        customEdgeWarningShown.current = false;
      }
      return savedEdges;
    },
    [activeEvent],
  );

  const handleEdgeCreate = useCallback(
    async (edge: RoundEdge) => {
      const updated = [...roundEdges, edge];
      setRoundEdges(updated);
      try {
        await persistWorkflowEdges(updated, rounds);
      } catch (error) {
        console.error('Failed to save workflow edge:', error);
        toast.error('Could not save workflow connection');
      }
    },
    [roundEdges, rounds, persistWorkflowEdges],
  );

  const handleEdgeUpdate = useCallback(
    async (edge: RoundEdge) => {
      const updated = roundEdges.map((item) => (item.id === edge.id ? edge : item));
      setRoundEdges(updated);
      try {
        await persistWorkflowEdges(updated, rounds);
      } catch (error) {
        console.error('Failed to update workflow edge:', error);
        toast.error('Could not update workflow connection');
      }
    },
    [roundEdges, rounds, persistWorkflowEdges],
  );

  const handleEdgeDelete = useCallback(
    async (edgeId: string) => {
      const updated = roundEdges.filter((item) => item.id !== edgeId);
      setRoundEdges(updated);
      try {
        await persistWorkflowEdges(updated, rounds);
      } catch (error) {
        console.error('Failed to delete workflow edge:', error);
        toast.error('Could not delete workflow connection');
      }
    },
    [roundEdges, rounds, persistWorkflowEdges],
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

      const storedRepresentation = readStoredRepresentation(activeEvent.id);
      updateRepresentation(storedRepresentation || inferRepresentation(normalizedRounds, loadedEdges));

      if (customDetected && !customEdgeWarningShown.current) {
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
  }, [activeEvent, enforceNominationFirst, updateRepresentation]);

  useEffect(() => {
    void loadRoundInsights(rounds);
  }, [rounds, loadRoundInsights]);

  useEffect(() => {
    if (activeEvent) {
      void loadWorkflow();
    }
  }, [activeEvent, loadWorkflow]);

  const handleRoundUpdate = useCallback(
    async (round: Round): Promise<Round> => {
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

      setRounds((prev) => {
        return prev.some((r) => r.id === updatedRound.id)
          ? prev.map((r) => (r.id === updatedRound.id ? updatedRound : r))
          : [...prev, updatedRound];
      });

      if (round.id.startsWith('round-') && updatedRound.id !== round.id) {
        setSelectedRoundId(updatedRound.id);
      }

      return updatedRound;
    },
    [rounds],
  );

  const handleRoundDelete = useCallback(
    async (roundId: string) => {
      if (!roundId.startsWith('round-') && activeEvent) {
        await scheduleRoundsService.deleteRound(roundId, activeEvent.id);
      }

      const filtered = rounds.filter((r) => r.id !== roundId);
      const normalized = await enforceNominationFirst(filtered);
      setRounds(normalized);

      const nextEdges = roundEdges.filter(
        (edge) => edge.sourceRoundId !== roundId && edge.targetRoundId !== roundId,
      );
      setRoundEdges(nextEdges);

      try {
        await Promise.all([
          persistWorkflowEdges(nextEdges, normalized),
          ...normalized
            .filter((round) => !round.id.startsWith('round-'))
            .map((round) =>
              scheduleRoundsService.updateRound({
                ...round,
                updatedAt: new Date().toISOString(),
              }),
            ),
        ]);
      } catch (error) {
        console.error('Failed to persist rounds/edges after round deletion:', error);
        toast.error('Round deleted, but some updates were not saved.');
      }

      setSelectedRoundId((prev) => (prev === roundId ? null : prev));
    },
    [activeEvent, persistWorkflowEdges, roundEdges, rounds, enforceNominationFirst],
  );

  const handleRoundReorder = useCallback(
    async (reorderedRounds: Round[]) => {
      const normalized = await enforceNominationFirst(reorderedRounds);
      setRounds(normalized);
      try {
        await Promise.all(
          normalized.map((round) =>
            scheduleRoundsService.updateRound({
              ...round,
              updatedAt: new Date().toISOString(),
            }),
          ),
        );
      } catch (error) {
        console.error('Failed to persist round order:', error);
        toast.error('Could not save round order');
      }
    },
    [enforceNominationFirst],
  );

  const openAddRoundSheet = useCallback(() => {
    setAddRoundOpen(true);
  }, []);

  const confirmAddRound = useCallback(
    async (name: string, type: Round['type']) => {
      if (!activeEvent) return;
      setIsCreatingRound(true);
      try {
        const newRound = createDefaultRound(activeEvent.id, rounds.length, name, type);
        await handleRoundUpdate(newRound);
        setSelectedRoundId(newRound.id);
        setAddRoundOpen(false);
        toast.success(`Round "${name}" created`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not create round';
        toast.error(message);
      } finally {
        setIsCreatingRound(false);
      }
    },
    [activeEvent, rounds.length, handleRoundUpdate],
  );

  const openConversionDialog = useCallback(
    (target: ScheduleRepresentation) => {
      const analysis =
        target === 'tiles'
          ? analyzeConversionToTiles(rounds, roundEdges)
          : analyzeConversionToWorkflow(rounds, roundEdges);
      setConversionAnalysis(analysis);
      setConversionTarget(target);
    },
    [rounds, roundEdges],
  );

  const applyRepresentationConversion = useCallback(async () => {
    if (!activeEvent || !conversionTarget) return;

    setIsConverting(true);
    try {
      const converted =
        conversionTarget === 'tiles'
          ? convertToTilesRepresentation(activeEvent.id, rounds, roundEdges)
          : convertToWorkflowRepresentation(activeEvent.id, rounds, roundEdges);

      const normalizedRounds = await enforceNominationFirst(converted.rounds);

      await Promise.all(
        normalizedRounds
          .filter((round) => !round.id.startsWith('round-'))
          .map((round) =>
            scheduleRoundsService.updateRound({
              ...round,
              updatedAt: new Date().toISOString(),
              version: (rounds.find((item) => item.id === round.id)?.version || round.version || 0) + 1,
            }),
          ),
      );

      const savedEdges = await scheduleRoundsService.saveEdges(activeEvent.id, converted.edges);
      const customAfterSave = hasCustomWorkflowEdges(normalizedRounds, savedEdges);

      setRounds(normalizedRounds);
      setRoundEdges(savedEdges);
      setHasCustomEdges(customAfterSave);
      updateRepresentation(conversionTarget);
      setConversionTarget(null);
      setConversionAnalysis(null);
      customEdgeWarningShown.current = false;

      toast.success(
        conversionTarget === 'tiles'
          ? 'Converted to tile sequence. Rounds now follow a single ordered path.'
          : 'Converted to block diagram. Rounds are laid out on the canvas.',
      );
    } catch (error) {
      console.error('Representation conversion failed:', error);
      toast.error('Could not convert schedule representation');
    } finally {
      setIsConverting(false);
    }
  }, [activeEvent, conversionTarget, roundEdges, rounds, updateRepresentation, enforceNominationFirst]);

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

  const conversionTargetLabel = conversionTarget === 'tiles' ? 'tile sequence' : 'block diagram';

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
            {representation === 'workflow'
              ? 'Block diagram — same connections, shown on a spatial canvas'
              : 'Tile sequence — same connections, shown as ordered cards'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
            data-testid="current-representation"
          >
            {representation === 'workflow' ? (
              <>
                <Workflow className="mr-1.5 h-3.5 w-3.5" />
                Block diagram
              </>
            ) : (
              <>
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
                Tile sequence
              </>
            )}
          </span>
          {representation === 'workflow' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => openConversionDialog('tiles')}
              data-testid="convert-to-tiles"
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Convert to tiles
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => openConversionDialog('workflow')}
              data-testid="convert-to-workflow"
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Convert to block diagram
            </Button>
          )}
          <Button variant="primary" onClick={openAddRoundSheet} className="shadow-lg shadow-indigo-500/20">
            <Plus className="w-4 h-4 mr-2" />
            Add round
          </Button>
        </div>
      </div>

      {representation === 'workflow' && hasCustomEdges && (
        <div className="border-b border-indigo-200 bg-indigo-50 px-6 py-3 text-sm text-indigo-900">
          Branching or conditional connections are active. Converting to tiles keeps the same flow — only the
          layout changes.
        </div>
      )}

      <div className="flex-1 min-w-0 overflow-hidden">
        {representation === 'workflow' ? (
          <WorkflowView
            rounds={rounds}
            edges={roundEdges}
            selectedRoundId={selectedRoundId}
            onRoundSelect={setSelectedRoundId}
            onRoundUpdate={handleRoundUpdate}
            onRoundDelete={handleRoundDelete}
            onEdgeCreate={handleEdgeCreate}
            onEdgeUpdate={handleEdgeUpdate}
            onEdgeDelete={handleEdgeDelete}
            programId={activeEvent.id}
          />
        ) : (
          <TileView
            rounds={rounds}
            selectedRoundId={selectedRoundId}
            onRoundSelect={setSelectedRoundId}
            onRoundUpdate={handleRoundUpdate}
            onRoundDelete={handleRoundDelete}
            onRoundReorder={handleRoundReorder}
            onAddRound={openAddRoundSheet}
            programId={activeEvent.id}
            roundInsights={roundInsights}
            insightsLoading={isInsightsLoading}
            onAdvanceRound={handleRunPipelineAction}
            reorderUpdatesFlow
          />
        )}
      </div>

      <RepresentationConversionModal
        isOpen={conversionTarget !== null}
        title={
          conversionTarget === 'tiles'
            ? 'Convert block diagram to tile sequence'
            : 'Convert tile sequence to block diagram'
        }
        description={`This will transform how rounds are arranged and connected — similar to converting between a block diagram and an ordered list. You are switching to ${conversionTargetLabel}.`}
        analysis={conversionAnalysis}
        isSubmitting={isConverting}
        onConfirm={() => void applyRepresentationConversion()}
        onClose={() => {
          if (isConverting) return;
          setConversionTarget(null);
          setConversionAnalysis(null);
        }}
      />

      <AddRoundSheet
        isOpen={addRoundOpen}
        onClose={() => !isCreatingRound && setAddRoundOpen(false)}
        onConfirm={(name, type) => void confirmAddRound(name, type)}
        existingNames={rounds.map((r) => r.name)}
        isFirstRound={rounds.length === 0}
        isSubmitting={isCreatingRound}
      />

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
