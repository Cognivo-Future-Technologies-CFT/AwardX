import React, { useState, useRef, useEffect } from 'react';
import { Category } from '../../services/demoDb';
import { ZoomIn, ZoomOut, X } from 'lucide-react';

interface WorkflowProps {
    categories: Category[];
    onAddSub: (parentId: string) => void;
    programId?: string;
}

interface Node {
    id: string;
    x: number;
    y: number;
    data: Category;
}

interface Edge {
    id: string;
    source: string;
    target: string;
}

export const CategoriesWorkflow: React.FC<WorkflowProps> = ({ categories, onAddSub, programId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // Interaction State
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });

    const [hasInitialized, setHasInitialized] = useState(false);

    // Initial Layout Calculation
    useEffect(() => {
        if (!categories.length || hasInitialized) return;

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const levelHeight = 150;
        const levelWidth = 350;

        // Group by parent
        const hierarchy: Record<string, Category[]> = {};
        categories.forEach(c => {
            const pid = c.parentId || 'root';
            if (!hierarchy[pid]) hierarchy[pid] = [];
            hierarchy[pid].push(c);
        });

        // Recursive layout
        const processNode = (cat: Category, x: number, y: number) => {
            newNodes.push({
                id: cat.id,
                x: x,
                y: y,
                data: cat
            });

            const children = hierarchy[cat.id] || [];
            if (children.length > 0) {
                const childrenTotalHeight = children.length * levelHeight;
                let currentChildY = y - (childrenTotalHeight / 2) + (levelHeight / 2);

                children.forEach(child => {
                    newEdges.push({
                        id: `${cat.id}-${child.id}`,
                        source: cat.id,
                        target: child.id
                    });

                    processNode(child, x + levelWidth, currentChildY);
                    currentChildY += levelHeight;
                });
            }
        };

        // Start with roots
        const roots = hierarchy['root'] || [];
        let rootY = 0;
        roots.forEach((root) => {
            processNode(root, 100, rootY);
            rootY += 350; // Spacing between trees
        });

        setNodes(newNodes);
        setEdges(newEdges);
        setHasInitialized(true);
    }, [categories, hasInitialized]);

    // Handle new categories (simple append logic)
    useEffect(() => {
        if (!hasInitialized || !categories.length) return;
        const existingIds = new Set(nodes.map(n => n.id));
        const newCats = categories.filter(c => !existingIds.has(c.id));

        if (newCats.length === 0) return;

        const newNodesToAdd: Node[] = [];
        const newEdgesToAdd: Edge[] = [];

        newCats.forEach(cat => {
            const parentNode = nodes.find(n => n.id === cat.parentId);
            const x = parentNode ? parentNode.x + 350 : 100;
            const y = parentNode ? parentNode.y + 120 : 0;

            newNodesToAdd.push({ id: cat.id, x, y, data: cat });

            if (cat.parentId) {
                newEdgesToAdd.push({
                    id: `${cat.parentId}-${cat.id}`,
                    source: cat.parentId,
                    target: cat.id
                });
            }
        });

        setNodes(prev => [...prev, ...newNodesToAdd]);
        setEdges(prev => [...prev, ...newEdgesToAdd]);
    }, [categories, hasInitialized, nodes]);


    // Handlers
    const handleNodeMouseDown = (e: React.MouseEvent, node: Node) => {
        e.stopPropagation();
        if (e.button !== 0) return; // Only left click
        setDraggingNodeId(node.id);
        setDragStart({
            mouseX: e.clientX,
            mouseY: e.clientY,
            nodeX: node.x,
            nodeY: node.y
        });
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsPanning(true);
        setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingNodeId) {
            const deltaX = (e.clientX - dragStart.mouseX) / scale;
            const deltaY = (e.clientY - dragStart.mouseY) / scale;

            setNodes(prev => prev.map(n => {
                if (n.id === draggingNodeId) {
                    return { ...n, x: dragStart.nodeX + deltaX, y: dragStart.nodeY + deltaY };
                }
                return n;
            }));
        } else if (isPanning) {
            setOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setDraggingNodeId(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        const delta = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.1, scale + delta), 3);
        setScale(newScale);
    };

    // Handle Escape to exit fullscreen
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsFullscreen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Handle fullscreen mode - prevent body scroll and center content
    useEffect(() => {
        if (isFullscreen) {
            // Prevent body scroll when in fullscreen
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            
            // Center the view on the nodes when entering fullscreen
            if (nodes.length > 0) {
                const minX = Math.min(...nodes.map(n => n.x));
                const maxX = Math.max(...nodes.map(n => n.x));
                const minY = Math.min(...nodes.map(n => n.y));
                const maxY = Math.max(...nodes.map(n => n.y));
                
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                
                // Use a small timeout to ensure container dimensions are available
                setTimeout(() => {
                    if (containerRef.current && isFullscreen) {
                        const containerWidth = containerRef.current.clientWidth || window.innerWidth;
                        const containerHeight = containerRef.current.clientHeight || window.innerHeight;
                        
                        setOffset({
                            x: containerWidth / 2 - centerX * scale,
                            y: containerHeight / 2 - centerY * scale
                        });
                    }
                }, 100);
            }
            
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        } else {
            // Restore body scroll when exiting fullscreen
            document.body.style.overflow = '';
        }
    }, [isFullscreen, nodes.length, scale]);
    
    // Cleanup: ensure fullscreen is disabled when component unmounts
    useEffect(() => {
        return () => {
            setIsFullscreen(false);
            document.body.style.overflow = '';
        };
    }, []);

    return (
        <div
            ref={containerRef}
                className={`
                bg-slate-50 relative overflow-hidden transition-all duration-300 group select-none shadow-inner
                ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}
                ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : 'w-full h-full rounded-xl border border-slate-200'}
             `}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
            <style>{`
            @keyframes flow {
               to {
                  stroke-dashoffset: -20;
               }
            }
            .flow-line {
               animation: flow 1s linear infinite;
            }
         `}</style>

            {/* Grid grid - Infinite effect */}
            <div
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)',
                    backgroundSize: `${40 * scale}px ${40 * scale}px`,
                    backgroundPosition: `${offset.x}px ${offset.y}px`
                }}
            />

            <div
                className="absolute origin-top-left transition-transform duration-75 ease-out will-change-transform"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
                }}
            >
                {/* Edges */}
                <svg className="absolute top-0 left-0 w-[50000px] h-[50000px] pointer-events-none overflow-visible" style={{ transform: 'translate(0, 0)' }}>
                    {edges.map(edge => {
                        const sourceNode = nodes.find(n => n.id === edge.source);
                        const targetNode = nodes.find(n => n.id === edge.target);
                        if (!sourceNode || !targetNode) return null;

                        const startX = sourceNode.x + 250;
                        const startY = sourceNode.y + 40;
                        const endX = targetNode.x;
                        const endY = targetNode.y + 40;

                        return (
                            <path
                                key={edge.id}
                                d={`M ${startX} ${startY} C ${startX + 80} ${startY}, ${endX - 80} ${endY}, ${endX} ${endY}`}
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth={Math.max(2, 6 / scale)}
                                strokeDasharray="8,8"
                                strokeLinecap="round"
                                className="flow-line transition-all"
                                style={{ opacity: 0.8 }}
                            />
                        );
                    })}
                </svg>

                {/* Nodes */}
                {nodes.map(node => (
                    <div
                        key={node.id}
                        className="absolute"
                        style={{
                            transform: `translate(${node.x}px, ${node.y}px)`,
                            width: '250px',
                            zIndex: draggingNodeId === node.id ? 50 : 10
                        }}
                        onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    >
                        <div className={`
                    bg-white rounded-xl border p-4 flex flex-col gap-2 relative transition-all duration-200
                    ${draggingNodeId === node.id
                                ? 'border-indigo-500 shadow-2xl scale-[1.05] cursor-grabbing'
                                : 'border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 cursor-grab hover:scale-105'
                            }
                  `}>
                            {/* Handles */}
                            <div className="absolute left-0 top-1/2 -translate-x-1/2 w-3 h-3 bg-slate-200 border-2 border-white rounded-full shadow-sm" />
                            <div className="absolute right-0 top-1/2 translate-x-1/2 w-3 h-3 bg-indigo-500 border-2 border-white rounded-full shadow-sm" />

                            <div className="flex items-center justify-between pointer-events-none">
                                <span className="font-bold text-slate-800 truncate text-sm" title={node.data.title}>{node.data.title}</span>
                                <div className={`w-2 h-2 rounded-full ${draggingNodeId === node.id ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
                            </div>
                            <div className="text-[10px] text-slate-500 pointer-events-none flex justify-between">
                                <span>{node.data.parentId ? 'Subcategory' : 'Root Category'}</span>
                                <span className="bg-slate-50 px-1 rounded">{node.data.entriesCount} entries</span>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); onAddSub(node.data.id); }}
                                className="mt-2 w-full py-1.5 text-[10px] font-bold text-center border border-dashed border-slate-200 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                + Add Child
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* UI Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 select-none z-50">
                <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-lg flex flex-col gap-1">
                    <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-2 hover:bg-slate-50 text-slate-600 rounded active:bg-slate-100 transition-colors"><ZoomIn className="w-4 h-4" /></button>
                    <div className="h-px bg-slate-100 mx-2" />
                    <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="p-2 hover:bg-slate-50 text-slate-600 rounded active:bg-slate-100 transition-colors"><ZoomOut className="w-4 h-4" /></button>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-lg text-xs font-mono text-slate-500 text-center">
                    {Math.round(scale * 100)}%
                </div>
            </div>


            {isFullscreen && (
                <button
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-6 right-6 p-2 bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full border border-slate-200 shadow-lg transition-colors z-50"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};
