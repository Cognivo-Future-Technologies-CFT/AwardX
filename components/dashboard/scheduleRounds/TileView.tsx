import React, { useState } from 'react';
import { Round } from '../../../types/scheduleRounds';
import { RoundConfigurationPanel } from './RoundConfigurationPanel';
import { Plus, GripVertical, Users, Globe, Shield, Settings, CheckCircle2, Clock, XCircle, Calendar } from 'lucide-react';
import { Button } from '../../Button';
import { motion, Reorder } from 'framer-motion';

interface TileViewProps {
  rounds: Round[];
  selectedRoundId: string | null;
  onRoundSelect: (roundId: string | null) => void;
  onRoundUpdate: (round: Round) => void;
  onRoundDelete: (roundId: string) => void;
  onRoundReorder: (rounds: Round[]) => void;
  programId: string;
}

export const TileView: React.FC<TileViewProps> = ({
  rounds,
  selectedRoundId,
  onRoundSelect,
  onRoundUpdate,
  onRoundDelete,
  onRoundReorder,
  programId,
}) => {
  const [items, setItems] = useState(rounds);

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

  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-50">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Rounds Configured</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            Create your first evaluation round to get started. Rounds can be configured with different evaluation types and conditions.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              const newRound: Round = {
                id: `round-${Date.now()}`,
                programId,
                name: 'New Round',
                type: 'jury',
                evaluationLogic: 'scoring',
                evaluatorStrategy: 'all_judges',
                blindEvaluation: false,
                startCondition: { type: 'fixed_datetime', datetime: new Date().toISOString() },
                endCondition: { type: 'fixed_datetime', datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
                shortlistConfig: {
                  enabled: false,
                  method: 'percentage',
                  value: 50,
                  visibility: ['admin'],
                },
                order: 0,
                status: 'draft',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: 1,
              };
              onRoundUpdate(newRound);
              onRoundSelect(newRound.id);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Round
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Rounds Overview</h3>
              <p className="text-sm text-slate-500 mt-1">Drag to reorder (visual only)</p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                const newRound: Round = {
                  id: `round-${Date.now()}`,
                  programId,
                  name: 'New Round',
                  type: 'jury',
                  evaluationLogic: 'scoring',
                  evaluatorStrategy: 'all_judges',
                  blindEvaluation: false,
                  startCondition: { type: 'fixed_datetime', datetime: new Date().toISOString() },
                  endCondition: { type: 'fixed_datetime', datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
                  shortlistConfig: {
                    enabled: false,
                    method: 'percentage',
                    value: 50,
                    visibility: ['admin'],
                  },
                  order: items.length,
                  status: 'draft',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  version: 1,
                };
                onRoundUpdate(newRound);
                onRoundSelect(newRound.id);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Round
            </Button>
          </div>

          <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-4">
            {items.map((round) => (
              <Reorder.Item
                key={round.id}
                value={round}
                className="bg-white rounded-xl border-2 border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
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
                          <p className="text-sm text-slate-500 capitalize">{round.type} • {round.evaluationLogic}</p>
                        </div>
                      </div>
                      {getStatusBadge(round.status)}
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
                      <div>
                        <span className="text-slate-500">Evaluators:</span>
                        <span className="ml-2 text-slate-700 capitalize">{round.evaluatorStrategy.replace('_', ' ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Blind:</span>
                        <span className="ml-2 text-slate-700">{round.blindEvaluation ? 'Yes' : 'No'}</span>
                      </div>
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
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </>
      )}

      {/* Configuration Panel */}
      {selectedRound && (
        <RoundConfigurationPanel
          round={selectedRound}
          onUpdate={onRoundUpdate}
          onDelete={() => {
            onRoundDelete(selectedRound.id);
            onRoundSelect(null);
          }}
          onClose={() => onRoundSelect(null)}
        />
      )}
    </div>
  );
};




