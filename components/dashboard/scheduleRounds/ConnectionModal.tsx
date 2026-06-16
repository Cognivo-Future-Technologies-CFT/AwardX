import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../Modal';
import { Round, RoundEdge, InputPort } from '../../../types/scheduleRounds';
import { Button } from '../../Button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceRound: Round;
  targetRound: Round;
  onConfirm: (edge: Partial<RoundEdge> & { newInputPort?: InputPort }) => void;
  existingEdge?: RoundEdge;
  initialSourceHandle?: string;
  initialTargetHandle?: string;
  onUseDefaults?: () => void; // Callback to skip configuration
  onDelete?: (edgeId: string) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  sourceRound,
  targetRound,
  onConfirm,
   onDelete,
  existingEdge,
  initialSourceHandle,
  initialTargetHandle,
  onUseDefaults,
}) => {
  // Use handles from props/edge - these come from the node handles selected during connection
  const sourceHandle = existingEdge?.sourceHandle || initialSourceHandle || 'output-0';
  const targetHandle = existingEdge?.targetHandle || initialTargetHandle || 'input-0';
  
  const [dataStream, setDataStream] = useState<string>(existingEdge?.dataStream || 'all');
  const [condition, setCondition] = useState<RoundEdge['condition'] | undefined>(
    existingEdge?.condition || (sourceRound.type === 'Nomination' ? undefined : { type: 'if_shortlisted' })
  );
  const [connectionName, setConnectionName] = useState<string>(existingEdge?.name || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [priority, setPriority] = useState<number>(existingEdge?.order ?? 0);

  const scoreLabel = useMemo(() => {
    const logic = sourceRound.evaluationLogic?.toLowerCase();
    if (logic === 'voting') return 'Voting';
    if (logic === 'ranking') return 'Rank';
    return 'Score';
  }, [sourceRound.evaluationLogic]);

  // Reset form when modal opens/closes or rounds change
  useEffect(() => {
    if (isOpen) {
      setDataStream(existingEdge?.dataStream || 'all');
      setCondition(
        existingEdge?.condition || (sourceRound.type === 'Nomination' ? undefined : { type: 'if_shortlisted' })
      );
      setConnectionName(existingEdge?.name || '');
      setPriority(existingEdge?.order ?? 0);
    }
  }, [isOpen, existingEdge, sourceRound.type]);

  // Get configured output ports from source round
  // Output ports are based on the source round's input data streams
  const sourceOutputs = useMemo(() => {
    if (sourceRound.outputPorts && sourceRound.outputPorts.length > 0) {
      return sourceRound.outputPorts.map(port => ({
        id: port.id,
        label: sourceRound.type === 'Nomination' ? port.name : `${port.name} (${port.dataStreams.join(', ')})`,
        value: port.dataStreams.join(','),
        dataStreams: port.dataStreams,
      }));
    }
    // If no output ports configured and no default available, user needs to configure first
    return [{
      id: 'output-0',
      label: 'No output ports configured - configure in round settings first',
      value: '',
      dataStreams: [],
    }];
  }, [sourceRound]);

  // Get existing input ports from target round metadata
  const existingInputPorts = useMemo(() => {
    return targetRound.inputPorts || [];
  }, [targetRound]);

  // Generate available input ports for target round
  const targetInputs = useMemo(() => {
    const ports = [...existingInputPorts];
    // Ensure at least one default port
    if (ports.length === 0) {
      ports.push({ id: 'input-0', name: 'Input 1' });
    }
    return ports;
  }, [existingInputPorts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get data stream from selected output port
    const selectedOutput = sourceOutputs.find(o => o.id === sourceHandle);
    const finalDataStream = selectedOutput?.value || dataStream;
    
    onConfirm({
      sourceHandle: existingEdge?.sourceHandle || initialSourceHandle || sourceHandle,
      targetHandle: existingEdge?.targetHandle || initialTargetHandle || targetHandle,
      dataStream: finalDataStream,
      condition,
      name: connectionName.trim() || undefined,
      order: priority,
    });
    onClose();
  };

  const handleUseDefaults = () => {
    if (onUseDefaults) {
      onUseDefaults();
    } else {
      // Use the handles that were passed from the connection
      const defaultOutput = sourceOutputs.find(o => o.id === sourceHandle) || sourceOutputs[0];
      const defaultPort = targetInputs.find(i => i.id === targetHandle) || targetInputs[0];
      onConfirm({
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        dataStream: defaultOutput?.value || 'all',
        condition: sourceRound.type === 'Nomination' ? undefined : { type: 'if_shortlisted' },
        name: undefined,
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={existingEdge ? "Edit Connection" : "Configure Connection"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Connection Name (Optional) */}
        <div className="space-y-2">
          <label className="block text-xs text-slate-600 mb-1">
            Connection Name <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder="e.g., Main Flow, Review Path"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">
            Connection: {sourceRound.name} → {targetRound.name}
          </label>
          <p className="text-xs text-slate-500">
            Ports are managed in the round configuration panel. This connection uses the selected ports from the workflow.
          </p>
          {sourceOutputs.find(o => o.id === sourceHandle) && (
            <div className="p-2 bg-slate-50 rounded-lg text-xs">
              <div className="font-medium text-slate-700 mb-1">Output Port:</div>
              <div className="text-slate-600">{sourceOutputs.find(o => o.id === sourceHandle)?.label || sourceHandle}</div>
              {sourceRound.type !== 'Nomination' && sourceOutputs.find(o => o.id === sourceHandle)?.dataStreams && sourceOutputs.find(o => o.id === sourceHandle)!.dataStreams.length > 0 && (
                <div className="mt-1 text-slate-500">
                  Data streams: <span className="font-medium">{sourceOutputs.find(o => o.id === sourceHandle)!.dataStreams.join(', ')}</span>
                </div>
              )}
            </div>
          )}
          {targetInputs.find(i => i.id === targetHandle) && (
            <div className="p-2 bg-slate-50 rounded-lg text-xs">
              <div className="font-medium text-slate-700 mb-1">Input Port:</div>
              <div className="text-slate-600">{targetInputs.find(i => i.id === targetHandle)?.name || targetHandle}</div>
            </div>
          )}
        </div>

        {sourceRound.type !== 'Nomination' ? (
          <div className="space-y-2">
            <label className="block text-xs text-slate-600 mb-1">
              Connection Logic <span className="text-slate-400">(optional)</span>
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Add conditions or logic to control when this connection is active
            </p>
            <select
              value={condition?.type || 'if_shortlisted'}
              onChange={(e) => {
                const type = e.target.value;
                if (type === 'if_shortlisted') {
                  setCondition({ type: 'if_shortlisted' });
                } else if (type === 'if_score_gte') {
                  setCondition({ type: 'if_score_gte', score: 70 });
                } else if (type === 'if_score_gt') {
                  setCondition({ type: 'if_score_gt', score: 70 } as any);
                } else if (type === 'if_score_lt') {
                  setCondition({ type: 'if_score_lt', score: 50 } as any);
                } else if (type === 'if_score_lte') {
                  setCondition({ type: 'if_score_lte', score: 50 } as any);
                } else if (type === 'if_score_eq') {
                  setCondition({ type: 'if_score_eq', score: 50 } as any);
                } else if (type === 'if_score_range') {
                  setCondition({ type: 'if_score_range', minScore: 40, maxScore: 80 } as any);
                } else if (type === 'custom_logic') {
                  setCondition({ type: 'custom_logic', expression: '' });
                } else {
                  setCondition({ type: 'manual_approval' });
                }
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            >
              <option value="if_shortlisted">If Shortlisted (default)</option>
              <option value="if_score_gte">If {scoreLabel} ≥ Threshold</option>
              <option value="if_score_gt">If {scoreLabel} &gt; Threshold</option>
              <option value="if_score_lt">If {scoreLabel} &lt; Threshold</option>
              <option value="if_score_lte">If {scoreLabel} ≤ Threshold</option>
              <option value="if_score_eq">If {scoreLabel} = Threshold</option>
              <option value="if_score_range">If {scoreLabel} Between Range</option>
              <option value="manual_approval">Manual Approval</option>
              <option value="custom_logic">Custom Logic Expression</option>
            </select>

            {condition && ['if_score_gte', 'if_score_gt', 'if_score_lt', 'if_score_lte', 'if_score_eq'].includes(condition.type) && 'score' in condition && (
              <input
                type="number"
                value={condition.score}
                onChange={(e) => setCondition({ type: condition.type, score: parseInt(e.target.value) || 0 } as any)}
                placeholder={`${scoreLabel} threshold`}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm mt-2"
                min={0}
                max={100}
              />
            )}

            {condition?.type === 'if_score_range' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">MIN {scoreLabel.toUpperCase()}</label>
                  <input
                    type="number"
                    value={(condition as any).minScore ?? 0}
                    onChange={(e) => setCondition({
                      type: 'if_score_range',
                      minScore: parseInt(e.target.value) || 0,
                      maxScore: (condition as any).maxScore ?? 100,
                    } as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">MAX {scoreLabel.toUpperCase()}</label>
                  <input
                    type="number"
                    value={(condition as any).maxScore ?? 100}
                    onChange={(e) => setCondition({
                      type: 'if_score_range',
                      minScore: (condition as any).minScore ?? 0,
                      maxScore: parseInt(e.target.value) || 0,
                    } as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            )}

            {condition?.type === 'custom_logic' && 'expression' in condition && (
              <textarea
                value={condition.expression || ''}
                onChange={(e) => setCondition({ type: 'custom_logic', expression: e.target.value })}
                placeholder={`Enter custom logic expression (e.g., ${scoreLabel.toLowerCase()} > 80 AND status == 'approved')`}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm mt-2 resize-none"
                rows={3}
              />
            )}
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Connection Logic:</span> Always Proceed (Default for Nomination Round)
          </div>
        )}



        <div className="flex justify-between items-center pt-4 border-t border-slate-200">
          {!existingEdge && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleUseDefaults}
              className="text-xs"
            >
              Use Defaults
            </Button>
          )}
<div className={`flex gap-3 ${existingEdge ? 'ml-auto' : ''}`}>
  <Button
    type="button"
    variant="ghost"
    onClick={onClose}
  >
    Cancel
  </Button>

  {existingEdge && (
<Button
  type="button"
  variant="ghost"
  className="!text-red-600 hover:!text-red-700 hover:bg-red-50"
  onClick={() => setShowDeleteConfirm(true)}
>
  Delete Connection
</Button>
  )}

  <Button type="submit" variant="primary">
    {existingEdge ? 'Save Changes' : 'Create Connection'}
  </Button>
</div>

        </div>
      </form>
      <Modal
  isOpen={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  title="Delete Connection"
>
  <div className="space-y-4">
    <p className="text-sm text-slate-600">
      This will permanently remove the connection between
      <strong> {sourceRound.name}</strong> and
      <strong> {targetRound.name}</strong>.
    </p>

    <div className="flex justify-end gap-2">
      <Button
        variant="ghost"
        onClick={() => setShowDeleteConfirm(false)}
      >
        Cancel
      </Button>

      <Button
        variant="primary"
        className="bg-red-600 hover:bg-red-700"
        onClick={() => {
          onDelete?.(existingEdge!.id);
          setShowDeleteConfirm(false);
          onClose();
          toast.success('Connection deleted');
        }}
      >
        Delete Connection
      </Button>
    </div>
  </div>
</Modal>
    </Modal>
    
  );
};

