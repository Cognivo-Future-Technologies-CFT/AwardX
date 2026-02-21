import React, { useState, useEffect } from 'react';
import RoundType, { Round, EvaluationLogic, EvaluatorStrategy, StartCondition, EndCondition, EdgeCondition, ShortlistConfig, OutputPort } from '../../../types/scheduleRounds';
import { X, Save, Trash2, Calendar, Users, Eye, EyeOff, Settings, Plus } from 'lucide-react';
import { Button } from '../../Button';
import { motion, AnimatePresence } from 'framer-motion';
import { OutputPortConfigModal } from './OutputPortConfigModal';

interface RoundConfigurationPanelProps {
  round: Round;
  onUpdate: (round: Round) => void;
  onDelete: () => void;
  onClose: () => void;
  incomingEdges?: Array<{
    dataStream?: string;
    sourceRoundId?: string;
    sourceHandle?: string;
  }>; // Edges coming into this round with source info
  allRounds?: Round[]; // All rounds to resolve output port configurations
}

export const RoundConfigurationPanel: React.FC<RoundConfigurationPanelProps> = ({
  round,
  onUpdate,
  onDelete,
  onClose,
  incomingEdges = [],
  allRounds = [],
}) => {
  const [formData, setFormData] = useState<Round>(round);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputPortModalOpen, setOutputPortModalOpen] = useState(false);
  const [editingOutputPort, setEditingOutputPort] = useState<OutputPort | undefined>(undefined);

  // Calculate available data streams from incoming edges
  // Each incoming edge represents ONE data stream
  // If N inputs exist, we generate N streams (A, B, C, ...) - one per input connection
  // The modal will show N individual streams + 1 "All Streams" option = N+1 total options
  const availableDataStreams = React.useMemo(() => {
    if (incomingEdges.length === 0) {
      return [];
    }

    // Each incoming edge gets a unique stream identifier (A, B, C, D, ...)
    // This ensures that if there are 3 inputs, we have exactly 3 streams
    const streams: string[] = [];

    incomingEdges.forEach((edge, index) => {
      // Generate stream identifier: A, B, C, D, etc.
      const streamId = String.fromCharCode(65 + index); // 65 is 'A' in ASCII
      streams.push(streamId);
    });

    return streams;
  }, [incomingEdges]);

  // Sync formData when round prop changes
  useEffect(() => {
    setFormData(round);
    setHasChanges(false);
    setError(null);
  }, [round]);

  const handleChange = (field: keyof Round, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleStartConditionChange = (condition: StartCondition) => {
    handleChange('startCondition', condition);
  };

  const handleEndConditionChange = (condition: EndCondition) => {
    handleChange('endCondition', condition);
  };

  const handleShortlistConfigChange = (config: Partial<ShortlistConfig>) => {
    handleChange('shortlistConfig', { ...formData.shortlistConfig, ...config });
  };

  const handleOutputPortSave = (port: OutputPort) => {
    const currentPorts = formData.outputPorts || [];
    if (editingOutputPort) {
      // Update existing port
      const updated = currentPorts.map(p => p.id === port.id ? port : p);
      handleChange('outputPorts', updated);
    } else {
      // Add new port
      handleChange('outputPorts', [...currentPorts, port]);
    }
    setEditingOutputPort(undefined);
  };

  const handleOutputPortDelete = (portId: string) => {
    const updated = (formData.outputPorts || []).filter(p => p.id !== portId);
    handleChange('outputPorts', updated);
  };

  const handleSave = async () => {
    if (formData.startCondition.type !== 'fixed_datetime' || formData.endCondition.type !== 'fixed_datetime') {
      setError('Start and end time are required. Please set fixed start and end dates.');
      return;
    }
    if (!formData.startCondition.datetime || !formData.endCondition.datetime) {
      setError('Start and end time are required.');
      return;
    }
    if (new Date(formData.endCondition.datetime) <= new Date(formData.startCondition.datetime)) {
      setError('End time must be after the start time.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const roundToSave = {
        ...formData,
        updatedAt: new Date().toISOString(),
        version: formData.version + 1,
      };
      await onUpdate(roundToSave);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save round');
      console.error('Error saving round:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="absolute right-4 top-24 bottom-6 w-[400px] bg-white/80 backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-20 flex flex-col rounded-[24px] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/50 flex items-center justify-between bg-white/40 backdrop-blur-md">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Round Handler</h3>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">Configuration Engine</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-200/50 rounded-full transition-all duration-200 group active:scale-90"
          >
            <X className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-hide">
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-xs font-medium"
            >
              {error}
            </motion.div>
          )}

          {/* Basic Info */}
          <section className="space-y-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Identity</h4>
            <div className="space-y-4 bg-slate-50/50 p-4 rounded-[20px] border border-slate-100/50">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500 ml-1">Label</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Round Name"
                  className="w-full px-4 py-3 bg-white border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none text-sm font-medium transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500 ml-1">Purpose</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="What happens in this round?"
                  className="w-full px-4 py-3 bg-white border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none text-sm font-medium transition-all resize-none min-h-[90px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500 ml-1">Round Category</label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value as RoundType)}
                  className="w-full px-4 py-3 bg-white border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none text-sm font-medium transition-all appearance-none cursor-pointer"
                >
                  <option value="Nomination">Nomination</option>
                  <option value="Shortlisting">Shortlisting</option>
                  <option value="Public Voting">Public Voting</option>
                  <option value="Public Rating">Public Rating</option>
                  <option value="Announce">Announce</option>
                </select>
              </div>
            </div>
          </section>

          {/* Evaluation Settings */}
          <section className="space-y-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Logic System</h4>
            <div className="space-y-4 bg-slate-50/50 p-4 rounded-[20px] border border-slate-100/50">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500 ml-1">Methodology</label>
                <select
                  value={formData.evaluationLogic}
                  onChange={(e) => handleChange('evaluationLogic', e.target.value as EvaluationLogic)}
                  className="w-full px-4 py-3 bg-white border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none text-sm font-medium transition-all appearance-none cursor-pointer"
                >
                  <option value="scoring">Scoring</option>
                  <option value="rubric">Rubric</option>
                  <option value="yes_no">Yes/No</option>
                  <option value="weighted">Weighted</option>
                  <option value="ranking">Ranking</option>
                  <option value="consensus">Consensus</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500 ml-1">Audience Strategy</label>
                <select
                  value={formData.evaluatorStrategy}
                  onChange={(e) => handleChange('evaluatorStrategy', e.target.value as EvaluatorStrategy)}
                  className="w-full px-4 py-3 bg-white border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none text-sm font-medium transition-all appearance-none cursor-pointer"
                >
                  <option value="all_judges">All Judges</option>
                  <option value="assigned_judges">Assigned Judges</option>
                  <option value="random_assignment">Random Assignment</option>
                  <option value="category_based">Category Based</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <button
                onClick={() => handleChange('blindEvaluation', !formData.blindEvaluation)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${formData.blindEvaluation ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-200/60 text-slate-700 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-3">
                  {formData.blindEvaluation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="text-sm font-semibold italic">Blind Mode</span>
                </div>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${formData.blindEvaluation ? 'bg-white/30' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${formData.blindEvaluation ? 'left-[17px]' : 'left-0.5'}`} />
                </div>
              </button>
            </div>
          </section>

          {/* Temporal Conditions */}
          <section className="space-y-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Timeline</h4>
            <div className="space-y-5 bg-slate-50/50 p-4 rounded-[20px] border border-slate-100/50">
              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-slate-400">Trigger Point</label>
                <div className="grid grid-cols-1 gap-2">
                  {['fixed_datetime', 'after_previous', 'manual_trigger'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        let condition: StartCondition;
                        if (type === 'fixed_datetime') condition = { type: 'fixed_datetime', datetime: new Date().toISOString() };
                        else if (type === 'after_previous') condition = { type: 'after_previous', roundId: '' };
                        else condition = { type: 'manual_trigger' };
                        handleStartConditionChange(condition);
                      }}
                      className={`px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all border ${formData.startCondition.type === type ? 'bg-white border-slate-200 shadow-sm text-indigo-600 ring-4 ring-indigo-50' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200/50'}`}
                    >
                      {type.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
                {formData.startCondition.type === 'fixed_datetime' && (
                  <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <input
                      type="datetime-local"
                      value={formData.startCondition.datetime ? new Date(formData.startCondition.datetime).toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleStartConditionChange({ type: 'fixed_datetime', datetime: new Date(e.target.value).toISOString() })}
                      className="w-full px-4 py-3 bg-white border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none text-sm font-medium transition-all"
                    />
                  </motion.div>
                )}
              </div>

              <div className="h-px bg-slate-200/50" />

              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-slate-400">Closure Point</label>
                <div className="grid grid-cols-1 gap-2">
                  {['fixed_datetime', 'manual_close', 'auto_close'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        let condition: EndCondition;
                        if (type === 'fixed_datetime') condition = { type: 'fixed_datetime', datetime: new Date().toISOString() };
                        else if (type === 'auto_close') condition = { type: 'auto_close', evaluationCount: 10 };
                        else condition = { type: 'manual_close' };
                        handleEndConditionChange(condition);
                      }}
                      className={`px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all border ${formData.endCondition.type === type ? 'bg-white border-slate-200 shadow-sm text-indigo-600 ring-4 ring-indigo-50' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200/50'}`}
                    >
                      {type.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
                {formData.endCondition.type === 'fixed_datetime' && (
                  <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <input
                      type="datetime-local"
                      value={formData.endCondition.datetime ? new Date(formData.endCondition.datetime).toISOString().slice(0, 16) : ''}
                      onChange={(e) => handleEndConditionChange({ type: 'fixed_datetime', datetime: new Date(e.target.value).toISOString() })}
                      className="w-full px-4 py-3 bg-white border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none text-sm font-medium transition-all"
                    />
                  </motion.div>
                )}
                {formData.endCondition.type === 'auto_close' && (
                  <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <input
                      type="number"
                      value={formData.endCondition.evaluationCount}
                      onChange={(e) => handleEndConditionChange({ type: 'auto_close', evaluationCount: parseInt(e.target.value) || 0 })}
                      placeholder="Targets"
                      className="w-full px-4 py-3 bg-white border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none text-sm font-medium transition-all"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          {/* Shortlist Configuration */}
          <section className="space-y-4">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Pipeline Output</h4>
            <div className="space-y-5 bg-slate-50/50 p-4 rounded-[20px] border border-slate-100/50">
              <button
                onClick={() => handleShortlistConfigChange({ enabled: !formData.shortlistConfig.enabled })}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${formData.shortlistConfig.enabled ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200/60 text-slate-600'}`}
              >
                <div className="flex items-center gap-3">
                  <Plus className={`w-4 h-4 transition-transform duration-500 ${formData.shortlistConfig.enabled ? 'rotate-45' : ''}`} />
                  <span className="text-sm font-bold">Announce Result</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.shortlistConfig.enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-md ${formData.shortlistConfig.enabled ? 'left-[23px]' : 'left-1'}`} />
                </div>
              </button>

              <AnimatePresence>
                {formData.shortlistConfig.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-5 overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {['percentage', 'fixed_count'].map((method) => (
                        <button
                          key={method}
                          onClick={() => handleShortlistConfigChange({ method: method as 'percentage' | 'fixed_count' })}
                          className={`px-4 py-3 rounded-xl text-[10px] font-black tracking-tighter uppercase transition-all border ${formData.shortlistConfig.method === method ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-200/50'}`}
                        >
                          {method.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-400 ml-1">Threshold</label>
                      <input
                        type="number"
                        value={formData.shortlistConfig.value}
                        onChange={(e) => handleShortlistConfigChange({ value: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-white border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none text-sm font-black transition-all"
                        min={0}
                        max={formData.shortlistConfig.method === 'percentage' ? 100 : undefined}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[11px] font-bold text-slate-400 ml-1">Audience Scope</label>
                      <div className="flex flex-wrap gap-2">
                        {(['admin', 'judges', 'public'] as const).map((visibility) => (
                          <button
                            key={visibility}
                            onClick={() => {
                              const current = formData.shortlistConfig.visibility;
                              const updated = current.includes(visibility)
                                ? current.filter(v => v !== visibility)
                                : [...current, visibility];
                              handleShortlistConfigChange({ visibility: updated });
                            }}
                            className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all border capitalize ${formData.shortlistConfig.visibility.includes(visibility) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                          >
                            {visibility}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Output Ports Configuration */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Connectors</h4>
              <button
                type="button"
                onClick={() => {
                  setEditingOutputPort(undefined);
                  setOutputPortModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:scale-95"
              >
                <Plus className="w-3 h-3" />
                Add Link
              </button>
            </div>
            <div className="space-y-2.5">
              {(formData.outputPorts && formData.outputPorts.length > 0) ? (
                formData.outputPorts.map((port) => (
                  <motion.div
                    key={port.id}
                    layoutId={port.id}
                    className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-800">{port.name}</div>
                      <div className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-wide">
                        Streams: {port.dataStreams.length > 0 ? port.dataStreams.join(' • ') : 'Disconnected'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOutputPort(port);
                          setOutputPortModalOpen(true);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOutputPortDelete(port.id)}
                        className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-[20px]">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-8">
                    {availableDataStreams.length === 0
                      ? 'No input signals detected'
                      : 'Define output connectors to upstream data'
                    }
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Output Port Configuration Modal */}
        <OutputPortConfigModal
          isOpen={outputPortModalOpen}
          onClose={() => {
            setOutputPortModalOpen(false);
            setEditingOutputPort(undefined);
          }}
          onSave={handleOutputPortSave}
          existingPort={editingOutputPort}
          availableDataStreams={availableDataStreams}
        />

        {/* Footer */}
        <div className="p-6 border-t border-slate-200/50 bg-white/40 backdrop-blur-md flex items-center justify-between gap-4">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-5 py-3.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-95 group"
          >
            <Trash2 className="w-4 h-4 group-hover:animate-bounce" />
            Erase
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex-1 flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-xl active:scale-95 ${!hasChanges || isSaving ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Processing' : 'Deploy Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

