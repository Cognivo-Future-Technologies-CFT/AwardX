import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { Button } from '../../Button';
import { SCHEDULER_ROUND_TYPES, type SchedulerRoundType } from '../../../lib/roundScheduleUtils';

interface AddRoundSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, type: SchedulerRoundType) => void;
  existingNames: string[];
  isFirstRound: boolean;
  isSubmitting?: boolean;
}

export const AddRoundSheet: React.FC<AddRoundSheetProps> = ({
  isOpen,
  onClose,
  onConfirm,
  existingNames,
  isFirstRound,
  isSubmitting = false,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<SchedulerRoundType>(isFirstRound ? 'Nomination' : 'Shortlisting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType(isFirstRound ? 'Nomination' : 'Shortlisting');
      setError(null);
    }
  }, [isOpen, isFirstRound]);

  const normalizedExisting = existingNames.map((n) => n.trim().toLowerCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Round name is required before creating a round.');
      return;
    }
    if (normalizedExisting.includes(trimmed.toLowerCase())) {
      setError('A round with this name already exists. Choose a unique name.');
      return;
    }
    onConfirm(trimmed, type);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-round-title"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="rounded-t-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
              <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <h2 id="add-round-title" className="text-lg font-bold text-slate-900">
                  Add round
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-8 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Round name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                    placeholder={isFirstRound ? 'e.g. Nominations' : 'e.g. Public Voting'}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Round type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as SchedulerRoundType)}
                    disabled={isFirstRound}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                  >
                    {SCHEDULER_ROUND_TYPES.filter(t => isFirstRound || t !== 'Nomination').map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {isFirstRound && (
                    <p className="text-xs text-slate-500">
                      First round defaults to Nomination — collects applications via your form.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full shadow-lg shadow-indigo-500/25"
                  disabled={isSubmitting}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isSubmitting ? 'Creating…' : 'Create round'}
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
