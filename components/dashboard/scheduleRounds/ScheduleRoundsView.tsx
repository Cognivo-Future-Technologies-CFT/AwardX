import React, { useState, useEffect, useCallback } from 'react';
import { Program } from '../../../services/models';
import { TileView } from './TileView';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '../../Button';
import { Round, RoundEdge } from '../../../types/scheduleRounds';
import { scheduleRoundsService } from '../../../services/scheduleRoundsDb';
import { ExtensionsMarketplaceModal } from './ExtensionsMarketplaceModal';
import { db } from '../../../services/database';
import { roundSubmissions } from '../../../services/supabase';

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
}

interface RoundCardInsight {
  participantTotal: number;
  participantAdvanced: number;
  participants: RoundParticipantInsight[];
  judgeTotal: number;
  judges: RoundJudgeInsight[];
}

interface ScheduleRoundsViewProps {
  activeEvent: Program | null;
}

export const ScheduleRoundsView: React.FC<ScheduleRoundsViewProps> = ({ activeEvent }) => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [edges, setEdges] = useState<RoundEdge[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [roundInsights, setRoundInsights] = useState<Record<string, RoundCardInsight>>({});
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);

  const enforceNominationFirst = useCallback(async (inputRounds: Round[]): Promise<Round[]> => {
    const ordered = [...inputRounds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (ordered.length === 0) return ordered;

    const nominationIndex = ordered.findIndex(r => r.type === 'Nomination');
    let normalized = ordered;

    if (nominationIndex === -1) {
      normalized = ordered.map((round, index) => (
        index === 0 ? { ...round, type: 'Nomination' as const } : round
      ));
    } else if (nominationIndex > 0) {
      const nominationRound = ordered[nominationIndex];
      normalized = [nominationRound, ...ordered.filter((_, idx) => idx !== nominationIndex)];
    }

    const now = new Date().toISOString();
    const changedRounds = normalized
      .map((round, index) => ({
        ...round,
        order: index,
        updatedAt: now,
        version: round.version + 1,
      }))
      .filter((round, index) => {
        const previous = inputRounds.find(r => r.id === round.id);
        if (!previous) return false;
        return previous.order !== index || previous.type !== round.type;
      });

    if (changedRounds.length === 0) {
      return normalized.map((round, index) => ({ ...round, order: index }));
    }

    try {
      const persisted = await Promise.all(
        changedRounds.map(round => scheduleRoundsService.updateRound(round))
      );
      const persistedMap = new Map(persisted.map(round => [round.id, round]));
      return normalized.map((round, index) => {
        const persistedRound = persistedMap.get(round.id);
        if (persistedRound) return persistedRound;
        return { ...round, order: index };
      });
    } catch (error) {
      console.error('Failed to enforce Nomination-first ordering:', error);
      return normalized.map((round, index) => ({ ...round, order: index }));
    }
  }, []);

  const loadRoundInsights = useCallback(async (targetRounds: Round[]) => {
    if (!activeEvent || targetRounds.length === 0) {
      setRoundInsights({});
      return;
    }

    setIsInsightsLoading(true);
    try {
      const judges = await db.getJudges(activeEvent.id);
      const judgeMap = new Map(
        judges.map(judge => [judge.id, {
          id: judge.id,
          name: judge.name,
          avatarUrl: judge.avatar,
          email: judge.email,
        }])
      );

      const insightsEntries = await Promise.all(
        targetRounds.map(async (round): Promise<[string, RoundCardInsight]> => {
          if (round.id.startsWith('round-')) {
            return [round.id, {
              participantTotal: 0,
              participantAdvanced: 0,
              participants: [],
              judgeTotal: 0,
              judges: [],
            }];
          }

          const { data, error } = await roundSubmissions.getByRound(round.id);
          if (error || !data) {
            return [round.id, {
              participantTotal: 0,
              participantAdvanced: 0,
              participants: [],
              judgeTotal: 0,
              judges: [],
            }];
          }

          const participants: RoundParticipantInsight[] = data.map((row: any) => {
            const submission = row.submissions || {};
            const safeStatus = row.status === 'advanced' || row.status === 'eliminated' ? row.status : 'active';
            return {
              id: submission.id || row.submission_id,
              name: submission.applicant_name || submission.title || 'Untitled Submission',
              avatarUrl: submission.cover_image_url || undefined,
              status: safeStatus,
              score: typeof submission.average_score === 'number' ? submission.average_score : null,
              votes: submission.votes_count || submission.submission_data?.votes || 0,
            };
          });

          const judgeIds = new Set<string>();
          data.forEach((row: any) => {
            const submissionJudges = row.submissions?.submission_judges || [];
            submissionJudges.forEach((judgeRef: any) => {
              if (judgeRef?.judge_id) judgeIds.add(judgeRef.judge_id);
            });
          });

          const assignedRoundJudges: RoundJudgeInsight[] = Array.from(judgeIds)
            .map(judgeId => judgeMap.get(judgeId))
            .filter(Boolean) as RoundJudgeInsight[];

          let roundJudges: RoundJudgeInsight[] = assignedRoundJudges;

          // For all_judges rounds, display the full judge panel even before explicit assignments exist.
          if (round.evaluatorStrategy === 'all_judges') {
            roundJudges = judges.map(judge => ({
              id: judge.id,
              name: judge.name,
              avatarUrl: judge.avatar,
              email: judge.email,
            }));
          } else if (roundJudges.length === 0) {
            // Fallback for partially configured rounds where assignment rows are not yet present.
            roundJudges = judges.map(judge => ({
              id: judge.id,
              name: judge.name,
              avatarUrl: judge.avatar,
              email: judge.email,
            }));
          }

          const participantAdvanced = participants.filter(p => p.status === 'advanced').length;

          return [round.id, {
            participantTotal: participants.length,
            participantAdvanced,
            participants,
            judgeTotal: roundJudges.length,
            judges: roundJudges,
          }];
        })
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
      // Load rounds from database
      const loadedRounds = await scheduleRoundsService.getRounds(activeEvent.id);
      const normalizedRounds = await enforceNominationFirst(loadedRounds);
      setRounds(normalizedRounds);

      // Load edges from storage
      const loadedEdges = await scheduleRoundsService.getEdges(activeEvent.id);
      setEdges(loadedEdges);
    } catch (error) {
      console.error('Failed to load workflow:', error);
      // Set empty arrays on error
      setRounds([]);
      setEdges([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeEvent]);

  useEffect(() => {
    void loadRoundInsights(rounds);
  }, [rounds, loadRoundInsights]);

  useEffect(() => {
    if (activeEvent) {
      loadWorkflow();
    }
  }, [activeEvent, loadWorkflow]);

  const handleRoundUpdate = useCallback(async (round: Round): Promise<void> => {
    try {
      let updatedRound: Round;

      if (round.id.startsWith('round-')) {
        // New round - create in database
        const { id, createdAt, updatedAt, ...roundToCreate } = round;
        updatedRound = await scheduleRoundsService.createRound(roundToCreate);
      } else {
        // Existing round - update in database
        updatedRound = await scheduleRoundsService.updateRound({
          ...round,
          updatedAt: new Date().toISOString(),
          version: (rounds.find(r => r.id === round.id)?.version || 0) + 1,
        });
      }

      // Update local state with the round from database
      setRounds(prev => {
        const existing = prev.find(r => r.id === updatedRound.id);
        if (existing) {
          return prev.map(r => r.id === updatedRound.id ? updatedRound : r);
        }
        return [...prev, updatedRound];
      });

      // If this was a new round, update selectedRoundId to the real ID
      if (round.id.startsWith('round-') && updatedRound.id !== round.id) {
        setSelectedRoundId(updatedRound.id);
      }
    } catch (error) {
      console.error('Failed to save round:', error);
      // Re-throw error so the panel can show it
      throw error;
    }
  }, [rounds]);

  const handleRoundDelete = useCallback(async (roundId: string) => {
    try {
      // Only delete from database if it's a real ID (not a temp ID)
      if (!roundId.startsWith('round-')) {
        await scheduleRoundsService.deleteRound(roundId);
      }

      // Update local state
      setRounds(prev => prev.filter(r => r.id !== roundId));
      setEdges(prev => {
        const updated = prev.filter(e => e.sourceRoundId !== roundId && e.targetRoundId !== roundId);
        // Save updated edges
        if (activeEvent) {
          void scheduleRoundsService.saveEdges(activeEvent.id, updated).then((persisted) => {
            if (persisted.length) setEdges(persisted);
          });
        }
        return updated;
      });
      setSelectedRoundId(prev => prev === roundId ? null : prev);
    } catch (error) {
      console.error('Failed to delete round:', error);
      // Still update UI optimistically
      setRounds(prev => prev.filter(r => r.id !== roundId));
      setEdges(prev => prev.filter(e => e.sourceRoundId !== roundId && e.targetRoundId !== roundId));
      setSelectedRoundId(prev => prev === roundId ? null : prev);
    }
  }, [activeEvent]);

  const handleEdgeCreate = useCallback((edge: RoundEdge) => {
    setEdges(prev => {
      const updated = [...prev, edge];
      // Save to storage
      if (activeEvent) {
        void scheduleRoundsService.saveEdges(activeEvent.id, updated).then((persisted) => {
          if (persisted.length) setEdges(persisted);
        });
      }
      return updated;
    });
  }, [activeEvent]);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    setEdges(prev => {
      const updated = prev.filter(e => e.id !== edgeId);
      // Save to storage
      if (activeEvent) {
        void scheduleRoundsService.saveEdges(activeEvent.id, updated).then((persisted) => {
          if (persisted.length) setEdges(persisted);
        });
      }
      return updated;
    });
  }, [activeEvent]);

  const handleEdgeUpdate = useCallback((edge: RoundEdge) => {
    setEdges(prev => {
      const updated = prev.map(e => e.id === edge.id ? edge : e);
      if (activeEvent) {
        void scheduleRoundsService.saveEdges(activeEvent.id, updated).then((persisted) => {
          if (persisted.length) setEdges(persisted);
        });
      }
      return updated;
    });
  }, [activeEvent]);


  const handleAdvanceRound = useCallback(async (roundId: string) => {
    const currentRound = rounds.find(r => r.id === roundId);
    if (!currentRound) return;

    const sortedRounds = [...rounds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const currentIndex = sortedRounds.findIndex(r => r.id === roundId);
    const nextRound = sortedRounds[currentIndex + 1];

    if (!confirm(`Advance from "${currentRound.name}"${nextRound ? ` to "${nextRound.name}"` : ''}? This will mark the current round as completed.`)) {
      return;
    }

    try {
      await handleRoundUpdate({
        ...currentRound,
        status: 'completed',
        updatedAt: new Date().toISOString(),
        version: currentRound.version + 1,
      });

      if (nextRound) {
        await handleRoundUpdate({
          ...nextRound,
          status: 'active',
          updatedAt: new Date().toISOString(),
          version: nextRound.version + 1,
        });
      }
    } catch (error) {
      console.error('Failed to advance round:', error);
    }
  }, [rounds, handleRoundUpdate]);

  const createNewRound = useCallback(() => {
    if (!activeEvent) return;

    const newRound: Round = {
      id: `round-${Date.now()}`,
      programId: activeEvent.id,
      name: 'New Round',
      type: 'Nomination',
      evaluationLogic: 'scoring',
      evaluatorStrategy: 'all_judges',
      blindEvaluation: false,
      startCondition: { type: 'manual_trigger' },
      endCondition: { type: 'manual_close' },
      shortlistConfig: {
        enabled: false,
        method: 'percentage',
        value: 50,
        visibility: ['admin'],
      },
      order: rounds.length,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    handleRoundUpdate(newRound);
    setSelectedRoundId(newRound.id);
  }, [activeEvent, rounds.length, handleRoundUpdate]);

  const handleDeleteSelectedRound = useCallback(() => {
    if (selectedRoundId) {
      handleRoundDelete(selectedRoundId);
      setSelectedRoundId(null);
    }
  }, [selectedRoundId, handleRoundDelete]);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input, textarea, [contenteditable]');

      if (isInput) return;

      // Handle shortcuts
      if (event.key.toLowerCase() === 'n' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        // 'n' key - create new round
        event.preventDefault();
        createNewRound();
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && !event.ctrlKey && !event.metaKey) {
        // Delete or Backspace to delete selected round
        if (selectedRoundId) {
          event.preventDefault();
          handleDeleteSelectedRound();
        }
      } else if (event.key === 'Escape') {
        // Escape to deselect
        if (selectedRoundId) {
          event.preventDefault();
          setSelectedRoundId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [createNewRound, handleDeleteSelectedRound]);

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with View Toggle */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Schedule & Rounds</h2>
            <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 font-medium">
              <span>Press <kbd className="font-sans font-bold text-slate-600">N</kbd> for new</span>
              <span className="w-px h-3 bg-slate-200" />
              <span><kbd className="font-sans font-bold text-slate-600">Del</kbd> to remove</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1">Configure evaluation rounds</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsExtensionsOpen(true)}
            className="px-4 py-2 text-xs shadow-none"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Extensions
          </Button>

          <div className="h-8 w-px bg-slate-200" />

          <Button
            variant="primary"
            onClick={createNewRound}
            className="shadow-lg shadow-indigo-500/20"
          >
            <div className="bg-white/20 p-0.5 rounded mr-2">
              <Plus className="w-3 h-3" />
            </div>
            Add Round
          </Button>
        </div>
      </div>

      {activeEvent && (
        <ExtensionsMarketplaceModal
          isOpen={isExtensionsOpen}
          onClose={() => setIsExtensionsOpen(false)}
          programId={activeEvent.id}
          existingRounds={rounds}
          existingEdges={edges}
          onApplied={async () => {
            await loadWorkflow();
          }}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <TileView
          rounds={rounds}
          selectedRoundId={selectedRoundId}
          onRoundSelect={setSelectedRoundId}
          onRoundUpdate={handleRoundUpdate}
          onRoundDelete={handleRoundDelete}
          onRoundReorder={async (reorderedRounds) => {
            setRounds(reorderedRounds);
            // Persist the new order to database
            try {
              await Promise.all(
                reorderedRounds.map(round =>
                  scheduleRoundsService.updateRound({
                    ...round,
                    updatedAt: new Date().toISOString(),
                  })
                )
              );
            } catch (error) {
              console.error('Failed to persist round order:', error);
            }
          }}
          programId={activeEvent.id}
          roundInsights={roundInsights}
          insightsLoading={isInsightsLoading}
          onAdvanceRound={handleAdvanceRound}
        />
      </div>
    </div>
  );
};
