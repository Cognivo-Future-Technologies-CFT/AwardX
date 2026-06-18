import React, { useState } from 'react';
import { AdvancementCriteria, AdvancementTrigger } from '../../types/scheduleRounds';
import { Save, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface AdvancementCriteriaConfigProps {
  criteria: AdvancementCriteria | null;
  trigger: AdvancementTrigger;
  onSave: (criteria: AdvancementCriteria, trigger: AdvancementTrigger) => void;
  isSaving?: boolean;
}

export const AdvancementCriteriaConfig: React.FC<AdvancementCriteriaConfigProps> = ({
  criteria,
  trigger,
  onSave,
  isSaving = false,
}) => {
  const [selectedType, setSelectedType] = useState<AdvancementCriteria['type']>(criteria?.type || 'all_pass');
  const [value, setValue] = useState<string>(
    (criteria && 'value' in criteria) ? String(criteria.value) : ''
  );
  const [selectedTrigger, setSelectedTrigger] = useState<AdvancementTrigger>(trigger || 'manual');

  const helpText: Record<AdvancementCriteria['type'], string> = {
    all_pass: 'All participants advance to the next round.',
    top_n: 'Top N participants by score/votes advance.',
    top_percent: 'Top N% of participants by score/votes advance.',
    score_threshold: 'Only participants at or above the score match value advance.',
    manual: 'Admin manually selects who advances.',
  };

  const handleSave = () => {
    let newCriteria: AdvancementCriteria;
    if (selectedType === 'all_pass' || selectedType === 'manual') {
      newCriteria = { type: selectedType };
    } else {
      newCriteria = { type: selectedType, value: parseFloat(value) || 0 };
    }
    onSave(newCriteria, selectedTrigger);
    toast.success('Advancement criteria saved');
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Advancement Pipeline</h4>
        <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
      </div>

      <div className="space-y-4 bg-slate-50/50 p-4 rounded-[20px] border border-slate-100/50">
        {/* Criteria Type Selection */}
        <div className="space-y-3">
          <label className="block text-[11px] font-bold text-slate-400">Advancement Rule</label>
          <div className="grid grid-cols-1 gap-2">
            {(['all_pass', 'top_n', 'top_percent', 'score_threshold', 'manual'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border text-left ${
                  selectedType === type
                    ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm'
                    : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>
                    {type === 'score_threshold'
                      ? 'SCORE MATCH'
                      : type === 'top_percent'
                        ? 'PERCENTAGE'
                        : type.replace('_', ' ').toUpperCase()}
                  </span>
                  {selectedType === type && <div className="w-2 h-2 bg-indigo-600 rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Input Based on Type */}
        <AnimatePresence>
          {selectedType === 'top_n' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400">Number of Participants</label>
                <input
                  type="number"
                  min="1"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  placeholder="E.g., 10"
                />
                <p className="text-[10px] text-slate-500">{helpText[selectedType]}</p>
              </div>
            </motion.div>
          )}

          {selectedType === 'top_percent' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400">Percentage (%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={parseFloat(value) || 0}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full"
                />
                <div className="text-center text-sm font-bold text-indigo-600">{parseFloat(value) || 0}%</div>
                <p className="text-[10px] text-slate-500">{helpText[selectedType]}</p>
              </div>
            </motion.div>
          )}

          {selectedType === 'score_threshold' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400">Score match value</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                  placeholder="E.g., 70"
                />
                <p className="text-[10px] text-slate-500">{helpText[selectedType]}</p>
              </div>
            </motion.div>
          )}

          {selectedType === 'manual' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <p className="text-[10px] text-slate-500 px-3 py-2 bg-blue-50/50 border border-blue-100 rounded-lg">{helpText[selectedType]}</p>
            </motion.div>
          )}

          {selectedType === 'all_pass' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <p className="text-[10px] text-slate-500 px-3 py-2 bg-green-50/50 border border-green-100 rounded-lg">{helpText[selectedType]}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trigger Type */}
        <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
          <label className="block text-[11px] font-bold text-slate-400">Advancement Trigger</label>
          <div className="flex gap-2">
            {(['manual', 'automatic'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTrigger(t)}
                className={`flex-1 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all border ${
                  selectedTrigger === t
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t === 'manual' ? '👆 Manual' : '⏱️ Automatic'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">
            {selectedTrigger === 'manual'
              ? 'Admin must click to advance participants.'
              : 'Participants advance automatically when round ends.'}
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-all"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Criteria'}
        </button>
      </div>
    </section>
  );
};
