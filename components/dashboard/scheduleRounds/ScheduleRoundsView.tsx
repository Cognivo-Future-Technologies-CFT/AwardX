import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { Program } from '../../../services/models';
import { ArrowRightLeft, LayoutGrid, Plus, Workflow, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '../../Button';
import { Round, RoundEdge } from '../../../types/scheduleRounds';
import { scheduleRoundsService } from '../../../services/scheduleRoundsDb';
import { roundSubmissions, supabase } from '../../../services/supabase';
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
  layoutRoundsOnCanvas,
  readStoredRepresentation,
  writeStoredRepresentation,
  type ConversionAnalysis,
  type ScheduleRepresentation,
} from '../../../lib/roundRepresentationConversion';
import {
  activateRound,
  completeRound,
  promoteRound,
  executeAdvancement,
  previewAdvancement,
  resetPipeline,
  syncProgramEnrollments,
  informRoundParticipants,
  type AdvancementPreview,
} from '../../../services/roundPipelineApi';
import { createDefaultRound, shortlistConfigToCriteria, buildLinearEdges, isVotingRoundType } from '../../../lib/roundScheduleUtils';
import {
  fetchJudgeScoresBySubmission,
  fetchVoteCountsBySubmission,
} from '../../../lib/roundInsightUtils';
import type { AdvancementCriteria } from '../../../types/scheduleRounds';
import { AddRoundSheet } from './AddRoundSheet';
import { validateRoundTransitions } from '../../../lib/flowValidation';
import { Modal } from '../../Modal';
import { fireCelebrationConfetti } from '../../../lib/confetti';

interface RoundCardInsight {
  participantTotal: number;
  participantAdvanced: number;
  participants: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    status: 'active' | 'advanced' | 'eliminated';
    score?: number | null;
    votes?: number;
  }>;
  judgeTotal: number;
  judges: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    email?: string;
    scoreStatus: 'scored' | 'pending';
  }>;
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

function normalizeEdgesCondition(edges: RoundEdge[], rounds: Round[]): RoundEdge[] {
  const roundsMap = new Map(rounds.map(r => [r.id, r]));
  return edges
    .filter(edge => {
      const targetRound = roundsMap.get(edge.targetRoundId);
      return targetRound?.type !== 'Nomination';
    })
    .map(edge => {
      const sourceRound = roundsMap.get(edge.sourceRoundId);
      if (sourceRound) {
        if (sourceRound.type === 'Nomination') {
          if (edge.condition && edge.condition.type !== 'always') {
            return { ...edge, condition: { type: 'always' } };
          }
        } else {
          if (!edge.condition || edge.condition.type === 'always') {
            return { ...edge, condition: { type: 'if_shortlisted' } };
          }
        }
      }
      return edge;
    });
}

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
  const hasLoadedOnceRef = useRef(false);
  const [roundInsights, setRoundInsights] = useState<Record<string, RoundCardInsight>>({});
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [advancementModal, setAdvancementModal] = useState<AdvancementModalState | null>(null);

  const validationResult = useMemo(() => {
    return validateRoundTransitions(roundEdges, rounds.map(r => ({ id: r.id, name: r.name, type: r.type })));
  }, [roundEdges, rounds]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'schedule-select-first-round' && rounds.length > 0) {
        setSelectedRoundId(rounds[0].id);
      }
    };
    window.addEventListener('demo-action', handler);
    return () => window.removeEventListener('demo-action', handler);
  }, [rounds]);
  const [addRoundOpen, setAddRoundOpen] = useState(false);
  const [isCreatingRound, setIsCreatingRound] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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



  const loadRoundInsights = useCallback(async (targetRounds: Round[], options?: { silent?: boolean }) => {
    if (!activeEvent || targetRounds.length === 0) {
      setRoundInsights({});
      return;
    }

    if (!options?.silent) {
      setIsInsightsLoading(true);
    }
    try {
      const insightsEntries = await Promise.all(
        targetRounds.map(async (round): Promise<[string, RoundCardInsight]> => {
          const empty: RoundCardInsight = { participantTotal: 0, participantAdvanced: 0, participants: [], judgeTotal: 0, judges: [] };
          if (round.id.startsWith('round-')) {
            return [round.id, empty];
          }

          const { data, error } = await roundSubmissions.getByRound(round.id);
          if (error || !data) {
            return [round.id, empty];
          }

          const participantAdvanced = data.filter((row: any) => row.status === 'advanced').length;
          const submissionIds = data
            .map((row: any) => row.submission_id || row.submissions?.id)
            .filter(Boolean) as string[];

          const votingRound = isVotingRoundType(round.type);
          const voteCounts = votingRound && supabase
            ? await fetchVoteCountsBySubmission(supabase, round.id)
            : new Map<string, number>();
          const judgeScores = !votingRound && supabase && activeEvent
            ? await fetchJudgeScoresBySubmission(supabase, round.id, activeEvent.id, submissionIds)
            : new Map<string, number>();

          const participants = data.map((row: any) => {
            const sub = row.submissions;
            const submissionId = sub?.id || row.submission_id || row.id;
            const status: 'active' | 'advanced' | 'eliminated' =
              row.status === 'advanced' ? 'advanced' : row.status === 'eliminated' ? 'eliminated' : 'active';

            if (votingRound) {
              return {
                id: submissionId,
                name: sub?.applicant_name || sub?.title || 'Unknown',
                avatarUrl: sub?.cover_image_url || undefined,
                status,
                votes: voteCounts.get(submissionId) ?? 0,
              };
            }

            const roundScore =
              row.carried_score ??
              judgeScores.get(submissionId) ??
              (typeof sub?.average_score === 'number' ? sub.average_score : null);

            return {
              id: submissionId,
              name: sub?.applicant_name || sub?.title || 'Unknown',
              avatarUrl: sub?.cover_image_url || undefined,
              status,
              score: roundScore,
            };
          });

          // Collect unique judges from submission_judges
          const judgeStatusMap = new Map<string, string>();
          for (const row of data) {
            const sj = row.submissions?.submission_judges;
            if (Array.isArray(sj)) {
              for (const j of sj) {
                if (j.judge_id && !judgeStatusMap.has(j.judge_id)) {
                  judgeStatusMap.set(j.judge_id, j.status || 'pending');
                }
              }
            }
          }

          // Fetch judge names
          let judgeNames = new Map<string, { name: string; email: string }>();
          const judgeIds = Array.from(judgeStatusMap.keys());
          if (judgeIds.length > 0 && supabase) {
            const { data: judgeRows } = await supabase
              .from('judges')
              .select('id, name, email')
              .in('id', judgeIds);
            if (judgeRows) {
              judgeNames = new Map(judgeRows.map((j: any) => [j.id, { name: j.name, email: j.email }]));
            }
          }

          const judges = judgeIds.map(id => ({
            id,
            name: judgeNames.get(id)?.name || 'Unknown Judge',
            email: judgeNames.get(id)?.email,
            scoreStatus: (judgeStatusMap.get(id) === 'completed' ? 'scored' : 'pending') as 'scored' | 'pending',
          }));

          return [round.id, {
            participantTotal: data.length,
            participantAdvanced,
            participants,
            judgeTotal: judges.length,
            judges,
          }];
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

  const loadWorkflow = useCallback(async (options?: { silent?: boolean }) => {
    if (!activeEvent) return;
    const silent = options?.silent ?? hasLoadedOnceRef.current;
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const [loadedRounds, loadedEdges] = await Promise.all([
        scheduleRoundsService.getRounds(activeEvent.id),
        scheduleRoundsService.getEdges(activeEvent.id).catch((error) => {
          console.error('Failed to load workflow edges:', error);
          return [] as RoundEdge[];
        }),
      ]);

      let normalizedRounds: Round[];
      if (loadedRounds.length === 0) {
        const defaultNomination = createDefaultRound(activeEvent.id, 0, 'Nomination', 'Nomination');
        const { id, createdAt, updatedAt, ...roundToCreate } = defaultNomination;
        const created = await scheduleRoundsService.createRound(roundToCreate);
        normalizedRounds = [created];
      } else {
        normalizedRounds = await enforceNominationFirst(loadedRounds);
      }
      
      const normalizedEdges = normalizeEdgesCondition(loadedEdges, normalizedRounds);
      const customDetected = hasCustomWorkflowEdges(normalizedRounds, normalizedEdges);

      setRounds(normalizedRounds);
      setRoundEdges(normalizedEdges);
      setHasCustomEdges(customDetected);

      const storedRepresentation = readStoredRepresentation(activeEvent.id);
      updateRepresentation(storedRepresentation || inferRepresentation(normalizedRounds, normalizedEdges));

      // Persist migrated edges if they changed from loaded edges
      const edgesChanged = normalizedEdges.length !== loadedEdges.length || normalizedEdges.some((edge, idx) => {
        const loadedEdge = loadedEdges[idx];
        return !loadedEdge || JSON.stringify(edge.condition) !== JSON.stringify(loadedEdge.condition);
      });
      if (edgesChanged) {
        void persistWorkflowEdges(normalizedEdges, normalizedRounds).catch(err => 
          console.error('Failed to auto-persist normalized edges:', err)
        );
      }

      if (customDetected && !customEdgeWarningShown.current) {
        customEdgeWarningShown.current = true;
      } else if (!customDetected) {
        customEdgeWarningShown.current = false;
      }

      // Auto-enroll any submissions missing from the nomination round
      try {
        await syncProgramEnrollments(activeEvent.id);
        await loadRoundInsights(normalizedRounds, { silent: true });
      } catch (syncErr) {
        console.warn('[pipeline] Failed to sync nomination enrollments:', syncErr);
      }
    } catch (error) {
      console.error('Failed to load workflow:', error);
      setRounds([]);
      setRoundEdges([]);
      setHasCustomEdges(false);
    } finally {
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
    }
  }, [activeEvent, enforceNominationFirst, updateRepresentation, persistWorkflowEdges, loadRoundInsights]);

  const insightsLoadedOnceRef = useRef(false);

  useEffect(() => {
    void loadRoundInsights(rounds, { silent: insightsLoadedOnceRef.current });
    insightsLoadedOnceRef.current = true;
  }, [rounds, loadRoundInsights]);

  useEffect(() => {
    if (activeEvent) {
      hasLoadedOnceRef.current = false;
      insightsLoadedOnceRef.current = false;
      void loadWorkflow();
    }
  }, [activeEvent?.id, loadWorkflow]);

  const handleEdgeCreate = useCallback(
    async (edge: RoundEdge) => {
      const updated = [...roundEdges, edge];
      
      const roundsList = rounds.map(r => ({ id: r.id, name: r.name, type: r.type }));
      const validation = validateRoundTransitions(updated, roundsList);
      if (!validation.isValid) {
        const firstError = validation.errors.find(e => e.type === 'error');
        toast.error(`Invalid transition logic: ${firstError?.message || 'Overlap detected'}`);
        return;
      }

      setRoundEdges(updated);
      try {
        await persistWorkflowEdges(updated, rounds);
      } catch (error: any) {
        console.error('Failed to save workflow edge:', error);
        toast.error(error?.message || 'Could not save workflow connection');
        await loadWorkflow({ silent: true }); // revert state
      }
    },
    [roundEdges, rounds, persistWorkflowEdges, loadWorkflow],
  );

  const handleEdgeUpdate = useCallback(
    async (edge: RoundEdge) => {
      const updated = roundEdges.map((item) => (item.id === edge.id ? edge : item));
      
      const roundsList = rounds.map(r => ({ id: r.id, name: r.name, type: r.type }));
      const validation = validateRoundTransitions(updated, roundsList);
      if (!validation.isValid) {
        const firstError = validation.errors.find(e => e.type === 'error');
        toast.error(`Invalid transition logic: ${firstError?.message || 'Overlap detected'}`);
        return;
      }

      setRoundEdges(updated);
      try {
        await persistWorkflowEdges(updated, rounds);
      } catch (error: any) {
        console.error('Failed to update workflow edge:', error);
        toast.error(error?.message || 'Could not update workflow connection');
        await loadWorkflow({ silent: true }); // revert state
      }
    },
    [roundEdges, rounds, persistWorkflowEdges, loadWorkflow],
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
      if (rounds.length <= 1) {
        toast.error('The default Nomination round cannot be deleted.');
        return;
      }

      if (!roundId.startsWith('round-') && activeEvent) {
        await scheduleRoundsService.deleteRound(roundId, activeEvent.id);
      }

      const filtered = rounds.filter((r) => r.id !== roundId);
      const normalized = await enforceNominationFirst(filtered);
      const repositioned = layoutRoundsOnCanvas(normalized);
      setRounds(repositioned);

      let nextEdges: RoundEdge[];
      if (representation === 'workflow') {
        nextEdges = roundEdges.filter(
          (edge) => edge.sourceRoundId !== roundId && edge.targetRoundId !== roundId
        );
      } else {
        nextEdges = activeEvent ? buildLinearEdges(activeEvent.id, repositioned) : [];
      }
      setRoundEdges(nextEdges);

      try {
        await Promise.all([
          persistWorkflowEdges(nextEdges, repositioned),
          ...repositioned
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
    [activeEvent, persistWorkflowEdges, rounds, roundEdges, representation, enforceNominationFirst],
  );

  const handleRoundReorder = useCallback(
    async (reorderedRounds: Round[]) => {
      const normalized = await enforceNominationFirst(reorderedRounds);
      const repositioned = layoutRoundsOnCanvas(normalized);
      setRounds(repositioned);
      try {
        await Promise.all(
          repositioned.map((round) =>
            scheduleRoundsService.updateRound({
              ...round,
              updatedAt: new Date().toISOString(),
            }),
          ),
        );

        if (activeEvent) {
          const newEdges = buildLinearEdges(activeEvent.id, repositioned);
          await persistWorkflowEdges(newEdges, repositioned);
        }
      } catch (error) {
        console.error('Failed to persist round order:', error);
        toast.error('Could not save round order');
      }
    },
    [activeEvent, enforceNominationFirst, persistWorkflowEdges],
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
        const updatedRound = await handleRoundUpdate(newRound);

        const updatedRounds = [...rounds.filter((r) => r.id !== newRound.id), updatedRound];
        const normalized = await enforceNominationFirst(updatedRounds);
        const repositioned = layoutRoundsOnCanvas(normalized);
        
        let newEdges: RoundEdge[];
        if (representation === 'workflow') {
          newEdges = [...roundEdges];
        } else {
          newEdges = buildLinearEdges(activeEvent.id, repositioned);
        }
        
        await Promise.all(
          repositioned.map((round) =>
            scheduleRoundsService.updateRound({
              ...round,
              updatedAt: new Date().toISOString(),
            }),
          ),
        );
        
        await persistWorkflowEdges(newEdges, repositioned);
        setRounds(repositioned);

        setSelectedRoundId(updatedRound.id);
        setAddRoundOpen(false);
        toast.success(`Round "${name}" created`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not create round';
        toast.error(message);
      } finally {
        setIsCreatingRound(false);
      }
    },
    [activeEvent, rounds, roundEdges, representation, handleRoundUpdate, enforceNominationFirst, persistWorkflowEdges],
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

    // Only enforce scoring guards if the round uses scoring logic and is not a Nomination round.
    const isJudgingRound = round.type?.toLowerCase() !== 'nomination' && (round.evaluationLogic
      ? round.evaluationLogic === 'scoring'
      : !['public voting', 'public rating', 'public'].includes(round.type?.toLowerCase()));

    if (preview.hasEmptyScores && isJudgingRound) {
      toast.error('No scores yet — judges must score submissions before shortlisting.');
      return false;
    }

    if (preview.paused && preview.reason === 'no_scores' && isJudgingRound) {
      toast.error('No scores yet — judges must score submissions before shortlisting.');
      return false;
    }

    setAdvancementModal({ roundId: round.id, preview, criteriaOverride });
    return true;
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
          await loadWorkflow({ silent: true });
          return;
        }

        if (round.status === 'active') {
          const criteriaOverride = shortlistConfigToCriteria(round.shortlistConfig, round.type);
          const isJudgingRound = round.type?.toLowerCase() !== 'nomination' && (round.evaluationLogic
            ? round.evaluationLogic === 'scoring'
            : !['public voting', 'public rating', 'public'].includes(round.type?.toLowerCase()));

          if (isJudgingRound) {
            const preview = await previewAdvancement(round.id, criteriaOverride);
            if (preview.hasEmptyScores || (preview.paused && preview.reason === 'no_scores')) {
              toast.error('No scores yet — judges must score submissions before shortlisting.');
              return;
            }
          }

          const completed = await completeRound(roundId);
          if (!completed.ok) {
            throw new Error(completed.error || 'Could not end round');
          }
          const refreshed = { ...round, status: 'completed' as const };
          await openAdvancementPreview(refreshed);
          await loadWorkflow({ silent: true });
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

  const handlePromoteRound = useCallback(
    async (roundId: string) => {
      try {
        const result = await promoteRound(roundId);
        if (!result.ok) throw new Error(result.error || 'Could not promote round');
        toast.success(`Promoted — ${result.enrolled || 0} submissions enrolled for new nomination cycle`);
        await loadWorkflow({ silent: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Promote failed');
      }
    },
    [loadWorkflow],
  );

  const handleInformParticipants = useCallback(
    async (roundId: string) => {
      const round = rounds.find((r) => r.id === roundId);
      if (!round || round.id.startsWith('round-')) return;

      try {
        const result = await informRoundParticipants(roundId);
        if (!result.ok) {
          throw new Error(result.error || 'Failed to inform participants');
        }
        if (result.sent === 0 && result.failed === 0) {
          toast.info('No participants found to inform in this round.');
        } else {
          toast.success(`Informed ${result.sent} participants successfully!${result.failed > 0 ? ` (${result.failed} failed)` : ''}`);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to inform participants');
      }
    },
    [rounds],
  );

  const handleResetParticipants = useCallback(async () => {
    if (!activeEvent) return;
    setIsResetting(true);
    try {
      const result = await resetPipeline(activeEvent.id);
      if (!result.ok) throw new Error(result.error || 'Failed to reset participants');
      toast.success('All participants, evaluations, and rounds have been reset successfully.');
      await loadWorkflow({ silent: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reset failed');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  }, [activeEvent, loadWorkflow]);

  const handleExecuteAdvancement = useCallback(
    async (
      overrides: Array<{ submissionId: string; action: 'advance' | 'eliminate'; reason?: string }>,
      targetRoundId?: string,
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
        targetRoundId,
      });

      if (!result?.ok) {
        throw new Error(result?.error || 'Advancement failed');
      }

      const finalTargetRoundId = targetRoundId || rounds[rounds.findIndex((r) => r.id === advancementModal.roundId) + 1]?.id;
      const targetRound = rounds.find((r) => r.id === finalTargetRoundId);
      const isFinalRound = !targetRound;
      if (targetRound && (targetRound.status === 'draft' || targetRound.status === 'scheduled')) {
        await activateRound(targetRound.id);
        toast.success(`Advanced participants into "${targetRound.name}"`);
      } else {
        toast.success('Round shortlist completed');
        if (isFinalRound) {
          fireCelebrationConfetti();
        }
      }

      setAdvancementModal(null);
      await loadWorkflow({ silent: true });
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowResetConfirm(true)}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            disabled={isResetting || rounds.length === 0}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset participants
          </Button>
          <Button
            variant="primary"
            onClick={openAddRoundSheet}
            className="shadow-lg shadow-indigo-500/20"
            data-demo-target="schedule-add-round"
          >
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

      {validationResult.errors.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50/80 space-y-1 max-h-48 overflow-y-auto">
          {validationResult.errors.map((err, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 px-6 py-2 text-xs ${
                err.type === 'error'
                  ? 'bg-rose-50/60 border-y border-rose-100/80 text-rose-800'
                  : 'bg-amber-50/60 border-y border-amber-100/80 text-amber-800'
              }`}
            >
              <AlertCircle
                className={`mt-0.5 w-3.5 h-3.5 shrink-0 ${
                  err.type === 'error' ? 'text-rose-500 animate-pulse' : 'text-amber-500'
                }`}
              />
              <div className="flex-1">
                <span className="font-semibold capitalize">{err.type}: </span>
                {err.message}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-w-0 overflow-hidden" data-demo-target="schedule-page-canvas">
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
            edges={roundEdges}
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
            onPromoteRound={handlePromoteRound}
            onInformParticipants={handleInformParticipants}
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
          isNomination={rounds.find(r => r.id === advancementModal.roundId)?.type === 'Nomination'}
          advancing={advancementModal.preview.advancing.map(mapPreviewParticipant)}
          eliminated={advancementModal.preview.eliminated.map(mapPreviewParticipant)}
          ties={advancementModal.preview.ties.map(mapPreviewParticipant)}
          onExecute={handleExecuteAdvancement}
          onClose={() => setAdvancementModal(null)}
        />
      )}
      {showResetConfirm && (
        <Modal
          isOpen
          onClose={() => setShowResetConfirm(false)}
          title="Reset Program Participants & Rounds"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to reset all participants and rounds for this program?
            </p>
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                This is a destructive action that will:
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Permanently delete all judging grades, scores, and judge assignments</li>
                <li>Permanently delete all public votes and ratings cast for all rounds</li>
                <li>Clear all round advancement outcomes and logs</li>
                <li>Reset all rounds status back to <span className="font-semibold">Draft</span></li>
                <li>Re-enroll all submissions back into the first round as active participants</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleResetParticipants}
                disabled={isResetting}
                className="bg-red-600 hover:bg-red-700 text-white border-none"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset All'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
