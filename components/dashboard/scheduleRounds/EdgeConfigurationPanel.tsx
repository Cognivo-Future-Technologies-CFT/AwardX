import React, { useState, useEffect } from 'react';
import { RoundEdge, EdgeCondition } from '../../../types/scheduleRounds';
import { X, Save, Trash2, GitBranch } from 'lucide-react';
import { Button } from '../../Button';
import { motion, AnimatePresence } from 'framer-motion';

interface EdgeConfigurationPanelProps {
    edge: RoundEdge;
    onUpdate: (edge: RoundEdge) => void;
    onDelete: () => void;
    onClose: () => void;
    sourceRoundType?: string;
}

export const EdgeConfigurationPanel: React.FC<EdgeConfigurationPanelProps> = ({
    edge,
    onUpdate,
    onDelete,
    onClose,
    sourceRoundType,
}) => {
    const [formData, setFormData] = useState<RoundEdge>(edge);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setFormData(edge);
        setHasChanges(false);
    }, [edge]);

    const handleChange = (field: keyof RoundEdge, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleConditionChange = (condition: EdgeCondition) => {
        handleChange('condition', condition);
    };

    const handleSave = () => {
        onUpdate({
            ...formData,
        });
        setHasChanges(false);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 bottom-0 w-[420px] bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-900">Logic Configuration</h3>
                        <p className="text-xs text-slate-500 mt-1">Configure transition logic</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <section>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Transition Logic</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Condition Type</label>
                                {sourceRoundType === 'Nomination' ? (
                                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                                        <span className="font-semibold text-slate-700">Connection Logic:</span> Always Proceed (Default for Nomination Round)
                                    </div>
                                ) : (
                                    <select
                                        value={formData.condition?.type || 'if_shortlisted'}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            let newCondition: EdgeCondition | undefined = undefined;
                                            if (type === 'if_shortlisted') newCondition = { type: 'if_shortlisted' };
                                            else if (type === 'if_score_gte') newCondition = { type: 'if_score_gte', score: 70 };
                                            else if (type === 'if_score_gt') newCondition = { type: 'if_score_gt', score: 70 } as any;
                                            else if (type === 'if_score_lt') newCondition = { type: 'if_score_lt', score: 50 } as any;
                                            else if (type === 'if_score_lte') newCondition = { type: 'if_score_lte', score: 50 } as any;
                                            else if (type === 'if_score_eq') newCondition = { type: 'if_score_eq', score: 50 } as any;
                                            else if (type === 'if_score_range') newCondition = { type: 'if_score_range', minScore: 40, maxScore: 80 } as any;
                                            else if (type === 'manual_approval') newCondition = { type: 'manual_approval' };
                                            else if (type === 'custom_logic') newCondition = { type: 'custom_logic', expression: '' };
                                            handleConditionChange(newCondition as any);
                                        }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                    >
                                        <option value="if_shortlisted">If Shortlisted (default)</option>
                                        <option value="if_score_gte">If Score &gt;= Threshold</option>
                                        <option value="if_score_gt">If Score &gt; Threshold</option>
                                        <option value="if_score_lt">If Score &lt; Threshold</option>
                                        <option value="if_score_lte">If Score &lt;= Threshold</option>
                                        <option value="if_score_eq">If Score = Threshold</option>
                                        <option value="if_score_range">If Score Between Range</option>
                                        <option value="manual_approval">Manual Approval</option>
                                        <option value="custom_logic">Custom Logic</option>
                                    </select>
                                )}
                            </div>

                            {formData.condition && ['if_score_gte', 'if_score_gt', 'if_score_lt', 'if_score_lte', 'if_score_eq'].includes(formData.condition.type) && 'score' in formData.condition && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Score Threshold (0-100)</label>
                                    <input
                                        type="number"
                                        value={formData.condition.score}
                                        onChange={(e) => handleConditionChange({ ...formData.condition, score: parseInt(e.target.value) || 0 } as any)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        min={0}
                                        max={100}
                                    />
                                </div>
                            )}

                            {formData.condition?.type === 'if_score_range' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">MIN SCORE</label>
                                        <input
                                            type="number"
                                            value={(formData.condition as any).minScore ?? 0}
                                            onChange={(e) => handleConditionChange({
                                                type: 'if_score_range',
                                                minScore: parseInt(e.target.value) || 0,
                                                maxScore: (formData.condition as any).maxScore ?? 100,
                                            } as any)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            min={0}
                                            max={100}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">MAX SCORE</label>
                                        <input
                                            type="number"
                                            value={(formData.condition as any).maxScore ?? 100}
                                            onChange={(e) => handleConditionChange({
                                                type: 'if_score_range',
                                                minScore: (formData.condition as any).minScore ?? 0,
                                                maxScore: parseInt(e.target.value) || 0,
                                            } as any)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            min={0}
                                            max={100}
                                        />
                                    </div>
                                </div>
                            )}

                            {formData.condition?.type === 'custom_logic' && 'expression' in formData.condition && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Logic Expression</label>
                                    <textarea
                                        value={formData.condition.expression}
                                        onChange={(e) => handleConditionChange({ ...formData.condition, expression: e.target.value } as any)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                                        rows={4}
                                        placeholder="e.g. score > 80 && status == 'approved'"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Enter a valid boolean expression.</p>
                                </div>
                            )}


                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                    <Button
                        variant="ghost"
                        onClick={onDelete}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Connection
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                    </div>
                </div>

            </motion.div>
        </AnimatePresence>
    );
};
