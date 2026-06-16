import React, { useState } from 'react';
import { Modal } from '../Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

interface Participant {
  submissionId: string;
  title: string;
  applicantName: string;
  score: number;
  rank: number;
}

interface AdvancementPreviewModalProps {
  isOpen: boolean;
  roundId: string;
  advancing: Participant[];
  eliminated: Participant[];
  ties: Participant[];
  onExecute: (
    overrides: Array<{ submissionId: string; action: 'advance' | 'eliminate'; reason?: string }>,
    targetRoundId?: string
  ) => Promise<void>;
  onClose: () => void;
}

export const AdvancementPreviewModal: React.FC<AdvancementPreviewModalProps> = ({
  isOpen,
  roundId,
  advancing,
  eliminated,
  ties,
  onExecute,
  onClose,
}) => {
  const [overrides, setOverrides] = useState<Map<string, { action: 'advance' | 'eliminate'; reason: string }>>(new Map());
  const [selectedTab, setSelectedTab] = useState<'advancing' | 'eliminated' | 'ties'>('advancing');
  const executeMutation = useMutation({
    mutationFn: () => {
      const overrideArray = Array.from(overrides.entries()).map(([submissionId, { action, reason }]) => ({
        submissionId,
        action,
        ...(reason && { reason }),
      }));
      return onExecute(overrideArray, undefined);
    },
    onSuccess: () => {
      toast.success('Participants advanced successfully');
      onClose();
    },
    onError: () => toast.error('Failed to execute advancement'),
  });

  const toggleOverride = (submissionId: string, action: 'advance' | 'eliminate') => {
    setOverrides((prev) => {
      const updated = new Map(prev);
      updated.set(submissionId, { action, reason: '' });
      return updated;
    });
  };

  const removeOverride = (submissionId: string) => {
    setOverrides((prev) => {
      const updated = new Map(prev);
      updated.delete(submissionId);
      return updated;
    });
  };

  const ParticipantRow: React.FC<{ p: Participant; status: 'advancing' | 'eliminated' | 'tied' }> = ({ p, status }) => {
    const override = overrides.get(p.submissionId);
    const isSwitched = override && override.action !== (status === 'advancing' ? 'advance' : 'eliminate');

    return (
      <motion.div
        key={p.submissionId}
        layout
        className={`p-3 rounded-lg border-2 transition-all ${
          isSwitched ? 'bg-orange-50 border-orange-300' : status === 'advancing' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-semibold text-slate-900 text-sm">{p.title}</p>
            <p className="text-xs text-slate-500">{p.applicantName}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-bold text-indigo-600">Score: {p.score.toFixed(1)}</span>
              {status !== 'tied' && <span className="text-xs text-slate-500">#{p.rank}</span>}
            </div>
          </div>

          <div className="flex gap-2">
            {isSwitched ? (
              <button
                onClick={() => removeOverride(p.submissionId)}
                className="px-2 py-1 bg-white border border-orange-300 text-orange-600 text-xs font-semibold rounded hover:bg-orange-50"
              >
                Undo
              </button>
            ) : (
              <>
                {status !== 'advancing' && (
                  <button
                    onClick={() => toggleOverride(p.submissionId, 'advance')}
                    className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded hover:bg-emerald-200"
                  >
                    ↑
                  </button>
                )}
                {status !== 'eliminated' && (
                  <button
                    onClick={() => toggleOverride(p.submissionId, 'eliminate')}
                    className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded hover:bg-red-200"
                  >
                    ↓
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Advancement Preview">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-emerald-600">{advancing.length}</p>
            <p className="text-xs text-emerald-700 font-semibold">Advancing</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-red-600">{eliminated.length}</p>
            <p className="text-xs text-red-700 font-semibold">Eliminated</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <p className="text-2xl font-bold text-orange-600">{ties.length}</p>
            <p className="text-xs text-orange-700 font-semibold">Tied</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {(['advancing', 'eliminated', 'ties'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-3 py-2 text-xs font-semibold transition-all border-b-2 ${
                selectedTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'advancing' ? `Advancing (${advancing.length})` : tab === 'eliminated' ? `Eliminated (${eliminated.length})` : `Tied (${ties.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <AnimatePresence mode="wait">
            {selectedTab === 'advancing' && advancing.map((p) => <ParticipantRow key={p.submissionId} p={p} status="advancing" />)}
            {selectedTab === 'eliminated' && eliminated.map((p) => <ParticipantRow key={p.submissionId} p={p} status="eliminated" />)}
            {selectedTab === 'ties' && ties.map((p) => <ParticipantRow key={p.submissionId} p={p} status="tied" />)}
          </AnimatePresence>
        </div>



        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400"
          >
            {executeMutation.isPending ? 'Processing...' : 'Confirm Advancement'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
