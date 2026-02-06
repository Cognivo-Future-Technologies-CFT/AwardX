import React, { useState, useEffect, useCallback } from 'react';
import { Program } from '../../../services/models';
import { WorkflowView } from './WorkflowView';
import { TileView } from './TileView';
import { Grid, Workflow, Plus, Sparkles } from 'lucide-react';
import { Button } from '../../Button';
import { Round, RoundEdge } from '../../../types/scheduleRounds';
import { scheduleRoundsService } from '../../../services/scheduleRoundsDb';
import { ExtensionsMarketplaceModal } from './ExtensionsMarketplaceModal';

interface ScheduleRoundsViewProps {
  activeEvent: Program | null;
}

type ViewMode = 'tile' | 'workflow';

export const ScheduleRoundsView: React.FC<ScheduleRoundsViewProps> = ({ activeEvent }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('workflow');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [edges, setEdges] = useState<RoundEdge[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);

  const loadWorkflow = useCallback(async () => {
    if (!activeEvent) return;
    setIsLoading(true);
    try {
      // Load rounds from database
      const loadedRounds = await scheduleRoundsService.getRounds(activeEvent.id);
      setRounds(loadedRounds);

      // Load edges from storage
      const loadedEdges = scheduleRoundsService.getEdges(activeEvent.id);
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
          scheduleRoundsService.saveEdges(activeEvent.id, updated);
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
        scheduleRoundsService.saveEdges(activeEvent.id, updated);
      }
      return updated;
    });
  }, [activeEvent]);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    setEdges(prev => {
      const updated = prev.filter(e => e.id !== edgeId);
      // Save to storage
      if (activeEvent) {
        scheduleRoundsService.saveEdges(activeEvent.id, updated);
      }
      return updated;
    });
  }, [activeEvent]);

  const handleEdgeUpdate = useCallback((edge: RoundEdge) => {
    setEdges(prev => {
      const updated = prev.map(e => e.id === edge.id ? edge : e);
      if (activeEvent) {
        scheduleRoundsService.saveEdges(activeEvent.id, updated);
      }
      return updated;
    });
  }, [activeEvent]);


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
          <p className="text-sm text-slate-500 mt-1">Configure evaluation rounds and workflow</p>
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

          <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
            <Button
              variant={viewMode === 'tile' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('tile')}
              className="px-3 py-1.5 text-xs shadow-none"
            >
              <Grid className="w-4 h-4 mr-2" />
              Tile View
            </Button>
            <Button
              variant={viewMode === 'workflow' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('workflow')}
              className="px-3 py-1.5 text-xs shadow-none"
            >
              <Workflow className="w-4 h-4 mr-2" />
              Workflow View
            </Button>
          </div>

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
        {viewMode === 'workflow' ? (
          <WorkflowView
            rounds={rounds}
            edges={edges}
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
          />
        )}
      </div>
    </div>
  );
};
