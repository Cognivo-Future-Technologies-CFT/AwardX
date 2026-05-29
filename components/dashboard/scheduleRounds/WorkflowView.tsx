import React, { useCallback, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import RoundType, { Round, RoundEdge } from '../../../types/scheduleRounds';
import { RoundConfigurationPanel } from './RoundConfigurationPanel';
import { ConnectionModal } from './ConnectionModal';
import { RoundNode } from './RoundNode';
import { Plus } from 'lucide-react';
import { Button } from '../../Button';

interface WorkflowViewProps {
  rounds: Round[];
  edges: RoundEdge[];
  selectedRoundId: string | null;
  onRoundSelect: (roundId: string | null) => void;
  onRoundUpdate: (round: Round) => Promise<Round>;
  onRoundDelete: (roundId: string) => void;
  onEdgeCreate: (edge: RoundEdge) => void;
  onEdgeUpdate: (edge: RoundEdge) => void;
  onEdgeDelete: (edgeId: string) => void;
  programId: string;
}

// Define nodeTypes outside component to avoid recreation warning
const nodeTypes = {
  roundNode: RoundNode,
};


export const WorkflowView: React.FC<WorkflowViewProps> = ({
  rounds,
  edges,
  selectedRoundId,
  onRoundSelect,
  onRoundUpdate,
  onRoundDelete,
  onEdgeCreate,
  onEdgeUpdate,
  onEdgeDelete,
  programId,
}) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ source: string; target: string; sourceHandle?: string; targetHandle?: string } | null>(null);
  const [editingEdge, setEditingEdge] = useState<RoundEdge | null>(null); // Edge being edited
  const reactFlowWrapperRef = useRef<any>(null);

  const onPaneClick = useCallback(() => {
    onRoundSelect(null);
    setSelectedEdgeId(null);
    setEditingEdge(null);
    setPendingConnection(null);
  }, [onRoundSelect]);


  // Convert edges to React Flow edges with dotted flowing lines
  const initialEdges: Edge[] = useMemo(() => {
    // Detect cycles/loops
    const simpleEdges = edges.map(e => ({ source: e.sourceRoundId, target: e.targetRoundId, id: e.id }));
    const cycleEdges = findCycleEdges(rounds.map(r => r.id), simpleEdges);

    return edges.map((edge) => {
      const isCycle = cycleEdges.has(edge.id);
      const isSelected = selectedEdgeId === edge.id;

      return {
        id: edge.id,
        source: edge.sourceRoundId,
        target: edge.targetRoundId,
        sourceHandle: edge.sourceHandle || 'output-0',
        targetHandle: edge.targetHandle || 'input-0',
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: isCycle ? '#f59e0b' : (isSelected ? '#4f46e5' : '#6366f1'),
          strokeWidth: isSelected ? 3 : (isCycle ? 2.5 : 2),
          strokeDasharray: isCycle ? '10,5' : '8,8',
          strokeLinecap: 'round',
          opacity: isSelected ? 1 : (isCycle ? 0.9 : 0.8),
        },
        className: isCycle ? 'flow-line cycle' : 'flow-line',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCycle ? '#f59e0b' : (isSelected ? '#4f46e5' : '#6366f1'),
          width: 20,
          height: 20,
        },
        label: edge.name || (edge.dataStream ? `${edge.dataStream.split(',').join(', ')}${edge.condition && getEdgeLabel(edge.condition) ? ` • ${getEdgeLabel(edge.condition)}` : ''}` : (edge.condition ? getEdgeLabel(edge.condition) : '')),
        labelStyle: { fill: isCycle ? '#d97706' : '#6366f1', fontWeight: 600, fontSize: 11 },
        labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.9 },
        data: { edge, isCycle },
      }
    });
  }, [edges, rounds, selectedEdgeId]);


  const handleCreateChildRound = useCallback((parentRoundId: string) => {
    const newRound: Round = {
      id: `round-${Date.now()}`,
      programId,
      name: 'New Round',
      type: 'jury',
      evaluationLogic: 'scoring',
      evaluatorStrategy: 'all_judges',
      blindEvaluation: false,
      startCondition: { type: 'after_previous', roundId: parentRoundId },
      endCondition: { type: 'fixed_datetime', datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
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

    onRoundUpdate(newRound);

    // Create edge from parent to child
    const newEdge: RoundEdge = {
      id: `edge-${Date.now()}`,
      programId,
      sourceRoundId: parentRoundId,
      targetRoundId: newRound.id,
      condition: { type: 'always' },
      order: edges.filter(e => e.sourceRoundId === parentRoundId).length,
      createdAt: new Date().toISOString(),
    };

    onEdgeCreate(newEdge);
    onRoundSelect(newRound.id);
  }, [programId, rounds.length, edges, onRoundUpdate, onEdgeCreate, onRoundSelect]);

  // Convert rounds to React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    const roundNodes = rounds.map((round, index) => {
      const incoming = edges.filter(e => e.targetRoundId === round.id);
      const outgoing = edges.filter(e => e.sourceRoundId === round.id);

      // Use saved position or calculate default position
      const savedPosition = round.position;
      const defaultPosition = {
        x: (index % 3) * 400 + 100,
        y: Math.floor(index / 3) * 400 + 100,
      };

      return {
        id: round.id,
        type: 'roundNode',
        position: savedPosition || defaultPosition,
        data: {
          round,
          onSelect: () => onRoundSelect(round.id),
          isSelected: selectedRoundId === round.id,
          onCreateChild: () => handleCreateChildRound(round.id),
          incomingEdges: incoming,
          outgoingEdges: outgoing,
          allRounds: rounds, // Pass all rounds for resolving output port streams
        },
      };
    });
    return roundNodes;
  }, [rounds, edges, selectedRoundId, onRoundSelect, handleCreateChildRound]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges);



  // Update node data with onCreateChild callback - DEPRECATED: handled in initialNodes useMemo now
  /*
  React.useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onCreateChild: () => handleCreateChildRound(node.id as string),
        },
      }))
    );
  }, [handleCreateChildRound, setNodes]);
  */

  // Handle node position changes (when user drags nodes)
  const handleNodesChange = useCallback(
    (changes: any[]) => {
      onNodesChange(changes);

      // Save position when node is moved
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          const round = rounds.find(r => r.id === change.id);
          if (round && (round.position?.x !== change.position.x || round.position?.y !== change.position.y)) {
            // Update round position
            const updatedRound: Round = {
              ...round,
              position: change.position,
              updatedAt: new Date().toISOString(),
            };
            onRoundUpdate(updatedRound);
          }
        }
      });
    },
    [rounds, onNodesChange, onRoundUpdate]
  );

  // Update nodes when rounds change, preserving positions from nodes state
  React.useEffect(() => {
    setNodes((currentNodes) => {
      // Create a map of current node positions (preserve user's current layout)
      const positionMap = new Map(currentNodes.map(n => [n.id, n.position]));

      // Merge saved positions with current positions
      return initialNodes.map(node => ({
        ...node,
        position: positionMap.get(node.id) || node.position,
      }));
    });
  }, [initialNodes, setNodes]);

  // Update edges when edges change
  React.useEffect(() => {
    setFlowEdges(initialEdges);
  }, [initialEdges, setFlowEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const sourceRound = rounds.find(r => r.id === params.source);
      const targetRound = rounds.find(r => r.id === params.target);
      if (!sourceRound || !targetRound) return;

      // Use the handles from the connection (these come from the node ports)
      // Ports should be created in the round configuration panel, not here
      const sourceHandle = params.sourceHandle || 'output-0';
      const targetHandle = params.targetHandle || 'input-0';

      // Get data streams from the selected output port
      const sourceOutputPorts = sourceRound.outputPorts || [];
      const selectedOutputPort = sourceOutputPorts.find(p => p.id === sourceHandle);
      const dataStream = selectedOutputPort?.dataStreams.join(',') || '';

      // Create edge automatically without showing modal
      const newEdge: RoundEdge = {
        id: `edge-${Date.now()}`,
        programId,
        sourceRoundId: params.source,
        targetRoundId: params.target,
        sourceHandle: sourceHandle,
        targetHandle: targetHandle,
        dataStream: dataStream,
        condition: undefined, // No condition = always
        order: edges.filter(e => e.sourceRoundId === params.source).length,
        createdAt: new Date().toISOString(),
      };

      onEdgeCreate(newEdge);
    },
    [rounds, edges, onEdgeCreate, programId]
  );

  const handleConnectionConfirm = useCallback((edgeData: Partial<RoundEdge> & { newInputPort?: { id: string; name: string } }) => {
    if (!pendingConnection) return;

    // If editing an existing edge, update it
    if (editingEdge) {
      const updatedEdge: RoundEdge = {
        ...editingEdge,
        sourceHandle: edgeData.sourceHandle || editingEdge.sourceHandle,
        targetHandle: edgeData.targetHandle || (edgeData.newInputPort?.id) || editingEdge.targetHandle,
        dataStream: edgeData.dataStream || editingEdge.dataStream,
        condition: edgeData.condition !== undefined ? edgeData.condition : editingEdge.condition,
        name: edgeData.name !== undefined ? edgeData.name : editingEdge.name,
      };

      // Trigger edge update through parent
      onEdgeUpdate(updatedEdge);
      setEditingEdge(null);
      setPendingConnection(null);
      return;
    }

    // If a new input port is being created, update the target round
    if (edgeData.newInputPort && pendingConnection.target) {
      const targetRound = rounds.find(r => r.id === pendingConnection.target);
      if (targetRound) {
        const updatedRound: Round = {
          ...targetRound,
          inputPorts: [
            ...(targetRound.inputPorts || []),
            edgeData.newInputPort,
          ],
        };
        onRoundUpdate(updatedRound);
      }
    }

    // Create new edge with defaults
    const sourceRound = rounds.find(r => r.id === pendingConnection.source);
    const sourceOutputPorts = sourceRound?.outputPorts || [];
    const defaultOutput = sourceOutputPorts.find(p => p.id === (pendingConnection.sourceHandle || 'output-0'))
      || sourceOutputPorts[0]
      || { id: 'output-0', name: 'Output 1', dataStreams: [] };

    const newEdge: RoundEdge = {
      id: `edge-${Date.now()}`,
      programId,
      sourceRoundId: pendingConnection.source,
      targetRoundId: pendingConnection.target,
      sourceHandle: edgeData.sourceHandle || pendingConnection.sourceHandle || 'output-0',
      targetHandle: edgeData.targetHandle || (edgeData.newInputPort?.id) || pendingConnection.targetHandle || 'input-0',
      dataStream: edgeData.dataStream || defaultOutput.dataStreams.join(','),
      condition: edgeData.condition, // Optional, defaults to undefined (always)
      name: edgeData.name, // Optional connection name
      order: edges.filter(e => e.sourceRoundId === pendingConnection.source).length,
      createdAt: new Date().toISOString(),
    };

    onEdgeCreate(newEdge);
    setPendingConnection(null);
  }, [pendingConnection, editingEdge, programId, edges, onEdgeCreate, onEdgeUpdate, rounds, onRoundUpdate]);

  const handleUseDefaults = useCallback(() => {
    if (!pendingConnection) return;

    const sourceRound = rounds.find(r => r.id === pendingConnection.source);
    const targetRound = rounds.find(r => r.id === pendingConnection.target);
    if (!sourceRound || !targetRound) {
      setPendingConnection(null);
      return;
    }

    // Get default input port (first available or create one)
    const targetInputPorts = targetRound.inputPorts || [{ id: 'input-0', name: 'Input 1' }];
    const defaultTargetHandle = targetInputPorts[0].id;

    // Get default output port from source round
    // Calculate available streams from source round's incoming edges
    const sourceIncomingEdges = edges.filter(e => e.targetRoundId === pendingConnection.source);
    const sourceAvailableStreams = new Set<string>();
    sourceIncomingEdges.forEach(edge => {
      if (edge.dataStream) {
        edge.dataStream.split(',').map(s => s.trim()).filter(s => s).forEach(s => sourceAvailableStreams.add(s));
      }
    });
    const defaultStreams = Array.from(sourceAvailableStreams).sort();

    const sourceOutputPorts = sourceRound.outputPorts || [];
    let defaultSourceHandle = 'output-0';
    let defaultDataStream = defaultStreams.join(',');

    if (sourceOutputPorts.length > 0) {
      defaultSourceHandle = sourceOutputPorts[0].id;
      defaultDataStream = sourceOutputPorts[0].dataStreams.join(',');
    } else if (defaultStreams.length === 0) {
      // If no ports and no streams, we can't create a valid connection
      console.warn('Cannot create connection: source round has no output ports and no input streams');
      return;
    }

    const newEdge: RoundEdge = {
      id: `edge-${Date.now()}`,
      programId,
      sourceRoundId: pendingConnection.source,
      targetRoundId: pendingConnection.target,
      sourceHandle: pendingConnection.sourceHandle || defaultSourceHandle,
      targetHandle: defaultTargetHandle,
      dataStream: defaultDataStream,
      condition: undefined, // No condition = always
      order: edges.filter(e => e.sourceRoundId === pendingConnection.source).length,
      createdAt: new Date().toISOString(),
    };

    onEdgeCreate(newEdge);
    setPendingConnection(null);
  }, [pendingConnection, programId, edges, onEdgeCreate, rounds]);

  const selectedRound = rounds.find(r => r.id === selectedRoundId);

  return (
    <div className="relative w-full h-full bg-slate-50 group">
      <style>{`
            @keyframes flow {
               to {
                  stroke-dashoffset: -20;
               }
            }
            .flow-line {
               animation: flow 1s linear infinite;
            }
            .react-flow__edge-path {
               animation: flow 1s linear infinite;
            }
         `}</style>

      {/* Grid Background - Matching CategoriesWorkflow exactly */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)',
          backgroundSize: `${40 * scale}px ${40 * scale}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`
        }}
      />

      <ReactFlow
        ref={reactFlowWrapperRef}
        nodes={nodes}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          if (node.type === 'roundNode') {
            onRoundSelect(node.id as string);
          }
          setSelectedEdgeId(null);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
          onRoundSelect(null);
          // Open connection modal for editing
          const edgeData = edges.find(e => e.id === edge.id);
          if (edgeData) {
            setEditingEdge(edgeData);
            setPendingConnection({
              source: edgeData.sourceRoundId,
              target: edgeData.targetRoundId,
              sourceHandle: edgeData.sourceHandle,
              targetHandle: edgeData.targetHandle,
            });
          }
        }}
        onPaneClick={onPaneClick}
        onMove={(_, viewport) => {
          setOffset({ x: viewport.x, y: viewport.y });
          setScale(viewport.zoom);
        }}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#6366f1',
            strokeWidth: 2,
            strokeDasharray: '8,8',
            strokeLinecap: 'round',
            opacity: 0.8,
          },
          className: 'flow-line',
        }}
      >
        <Controls className="!bg-white !shadow-lg !border !border-slate-100 !rounded-xl !p-1 !hidden md:!flex !flex-col !gap-1" />

        <MiniMap
          nodeColor={(node) => {
            const round = rounds.find(r => r.id === node.id);
            return getRoundStatusColor(round?.status || 'draft');
          }}
          maskColor="rgba(241, 245, 249, 0.7)"
          className="!bg-white !border !border-slate-200 !shadow-lg !rounded-xl overflow-hidden"
        />
      </ReactFlow>



      {/* Configuration Panel */}
      {selectedRound && (() => {
        // Get incoming edges for this round to determine available data streams
        const roundIncomingEdges = edges.filter(e => e.targetRoundId === selectedRound.id);

        return (
          <RoundConfigurationPanel
            round={selectedRound}
            programId={programId}
            onUpdate={onRoundUpdate}
            onDelete={() => {
              onRoundDelete(selectedRound.id);
              onRoundSelect(null);
            }}
            onClose={() => onRoundSelect(null)}
            incomingEdges={roundIncomingEdges}
            allRounds={rounds}
          />
        );
      })()}

      {/* Connection Modal */}
      {pendingConnection && (() => {
        const sourceRound = rounds.find(r => r.id === pendingConnection.source);
        const targetRound = rounds.find(r => r.id === pendingConnection.target);
        if (!sourceRound || !targetRound) {
          setPendingConnection(null);
          return null;
        }

        return (
          <ConnectionModal
            isOpen={!!pendingConnection}
            onClose={() => {
              setPendingConnection(null);
              setEditingEdge(null);
            }}
            sourceRound={sourceRound}
            targetRound={targetRound}
            onConfirm={handleConnectionConfirm}
            existingEdge={editingEdge || undefined}
            onUseDefaults={handleUseDefaults}
            initialSourceHandle={pendingConnection.sourceHandle}
            initialTargetHandle={pendingConnection.targetHandle}
          />
        );
      })()}
    </div>
  );
};

function getEdgeLabel(condition: RoundEdge['condition'] | undefined): string {
  if (!condition) return '';
  switch (condition.type) {
    case 'always':
      return '';
    case 'if_shortlisted':
      return 'Shortlist';
    case 'if_score_gte':
      return `≥ ${condition.score}`;
    case 'manual_approval':
      return 'Manual';
    case 'custom_logic':
      return 'Custom';
    default:
      return '';
  }
}

function getRoundStatusColor(status: Round['status']): string {
  switch (status) {
    case 'draft':
      return '#94a3b8';
    case 'scheduled':
      return '#3b82f6';
    case 'active':
      return '#10b981';
    case 'completed':
      return '#6366f1';
    case 'cancelled':
      return '#ef4444';
    default:
      return '#94a3b8';
  }
}

// Find edges that form a cycle
function findCycleEdges(nodeIds: string[], edges: { source: string; target: string; id: string }[]): Set<string> {
  const adj = new Map<string, Array<{ target: string; id: string }>>();
  edges.forEach(e => {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push({ target: e.target, id: e.id });
  });

  const cycleEdges = new Set<string>();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string) {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const children = adj.get(nodeId) || [];
    for (const { target, id } of children) {
      if (recursionStack.has(target)) {
        cycleEdges.add(id);
      } else if (!visited.has(target)) {
        dfs(target);
      }
    }
    recursionStack.delete(nodeId);
  }

  nodeIds.forEach(id => {
    if (!visited.has(id)) dfs(id);
  });

  return cycleEdges;
}
