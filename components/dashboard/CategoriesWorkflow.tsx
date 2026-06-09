import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Category } from '../../services/models';
import { layoutCategoryTree } from '../../lib/categoryHierarchy';
import { ZoomIn, ZoomOut, X, Maximize2, Plus, Trash2 } from 'lucide-react';

interface WorkflowProps {
    categories: Category[];
    onAddSub: (parentId: string) => void;
    onDelete: (id: string) => void;
    selectedIds: string[];
    onToggleSelect: (id: string) => void;
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

export const CategoriesWorkflow: React.FC<WorkflowProps> = ({ categories, onAddSub, onDelete, selectedIds, onToggleSelect, programId }) => {
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

    const scaleRef = useRef(scale);
    const offsetRef = useRef(offset);

    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);

    useEffect(() => {
        offsetRef.current = offset;
    }, [offset]);

    const categorySignature = useMemo(
        () =>
            categories
                .map((c) => `${c.id}:${c.parentId ?? ''}:${c.title}`)
                .sort()
                .join('|'),
        [categories],
    );

    const fitCanvasToNodes = useCallback(() => {
        if (!containerRef.current || nodes.length === 0) return;

        const NODE_W = 250;
        const NODE_H = 90;
        const minX = Math.min(...nodes.map((n) => n.x));
        const maxX = Math.max(...nodes.map((n) => n.x + NODE_W));
        const minY = Math.min(...nodes.map((n) => n.y));
        const maxY = Math.max(...nodes.map((n) => n.y + NODE_H));
        const contentW = Math.max(maxX - minX, NODE_W);
        const contentH = Math.max(maxY - minY, NODE_H);
        const pad = 56;
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const fitScale = Math.min(1.1, (cw - pad * 2) / contentW, (ch - pad * 2) / contentH);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setScale(fitScale);
        setOffset({
            x: cw / 2 - centerX * fitScale,
            y: ch / 2 - centerY * fitScale,
        });
    }, [nodes]);

    useEffect(() => {
        if (!categories.length) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const { nodes: layoutNodes, edges: layoutEdges } = layoutCategoryTree(categories);
        setNodes(layoutNodes);
        setEdges(layoutEdges);
    }, [programId, categorySignature, categories]);

    useEffect(() => {
        const handler = (e: Event) => {
            if ((e as CustomEvent).detail === 'awards-fit-canvas') {
                window.requestAnimationFrame(() => fitCanvasToNodes());
            }
        };
        window.addEventListener('demo-action', handler);
        return () => window.removeEventListener('demo-action', handler);
    }, [fitCanvasToNodes]);

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

    const applyZoom = (deltaScale: number, focalX: number, focalY: number) => {
        const currentScale = scaleRef.current;
        const currentOffset = offsetRef.current;
        const newScale = Math.min(Math.max(0.1, currentScale + deltaScale), 3);
        if (newScale === currentScale) return;

        const ratio = newScale / currentScale;
        const nextOffset = {
            x: focalX - (focalX - currentOffset.x) * ratio,
            y: focalY - (focalY - currentOffset.y) * ratio,
        };

        scaleRef.current = newScale;
        offsetRef.current = nextOffset;
        setScale(newScale);
        setOffset(nextOffset);
    };

    const zoomByStep = (direction: 1 | -1) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        applyZoom(direction * 0.15, rect.width / 2, rect.height / 2);
    };

    // Native wheel listener — React onWheel is passive and cannot preventDefault,
    // so the dashboard main scroll was stealing scroll-to-zoom.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const rect = el.getBoundingClientRect();
            const focalX = e.clientX - rect.left;
            const focalY = e.clientY - rect.top;

            let deltaY = e.deltaY;
            if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
                deltaY *= 16;
            } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
                deltaY *= rect.height;
            }

            const zoomIntensity = e.ctrlKey || e.metaKey ? 0.0025 : 0.0015;
            applyZoom(-deltaY * zoomIntensity, focalX, focalY);
        };

        el.addEventListener('wheel', onWheel, { passive: false, capture: true });
        return () => el.removeEventListener('wheel', onWheel, { capture: true });
    }, []);

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
            data-demo-target="awards-workflow-canvas"
            className={`
                bg-slate-50 relative overflow-hidden transition-all duration-300 group select-none shadow-inner
                ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}
                ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : 'w-full h-full min-h-[480px] rounded-xl border border-slate-200'}
             `}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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
                        data-demo-target={node.id === 'cat-1' ? 'awards-category-node-1' : undefined}
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

                            <div className="flex items-center justify-between gap-2">
                                <input
                                    type="checkbox"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    checked={selectedIds.includes(node.data.id)}
                                    onChange={() => onToggleSelect(node.data.id)}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                                />
                                <span className="font-bold text-slate-800 truncate text-sm pointer-events-none select-none flex-1" title={node.data.title}>{node.data.title}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); onDelete(node.data.id); }}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title={`Delete ${node.data.title}`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <div className={`w-2 h-2 rounded-full ${draggingNodeId === node.id ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500 pointer-events-none flex justify-between">
                                <span>{node.data.parentId ? 'Subcategory' : 'Root Category'}</span>
                                <span className="bg-slate-50 px-1 rounded">{node.data.entriesCount} entries</span>
                            </div>

                            <button
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); onAddSub(node.data.id); }}
                                className="mt-2 w-full py-1.5 text-[10px] font-bold text-center border border-dashed border-slate-200 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                + Add Child
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {categories.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-20">
                    <p className="text-sm font-semibold text-slate-600">No categories yet</p>
                    <p className="text-xs text-slate-400 max-w-xs text-center">
                        Add a root category, then use the 2D canvas to branch subcategories and awards.
                    </p>
                </div>
            )}

            {/* UI Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 select-none z-50">
                <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-lg flex flex-col gap-1">
                    {!isFullscreen && (
                        <>
                            <button
                                type="button"
                                onClick={() => setIsFullscreen(true)}
                                className="p-2 hover:bg-slate-50 text-slate-600 rounded active:bg-slate-100 transition-colors"
                                title="Fullscreen"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                            <div className="h-px bg-slate-100 mx-2" />
                        </>
                    )}
                    <button type="button" onClick={() => zoomByStep(1)} className="p-2 hover:bg-slate-50 text-slate-600 rounded active:bg-slate-100 transition-colors" title="Zoom in"><ZoomIn className="w-4 h-4" /></button>
                    <div className="h-px bg-slate-100 mx-2" />
                    <button type="button" onClick={() => zoomByStep(-1)} className="p-2 hover:bg-slate-50 text-slate-600 rounded active:bg-slate-100 transition-colors" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-lg text-xs font-mono text-slate-500 text-center">
                    {Math.round(scale * 100)}%
                </div>
            </div>

            {!isFullscreen && categories.length > 0 && (
                <button
                    type="button"
                    onClick={() => onAddSub('')}
                    className="absolute top-4 left-4 z-30 inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add root category
                </button>
            )}

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
