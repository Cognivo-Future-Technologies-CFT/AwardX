import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DataBlock } from '../../../types/scheduleRounds';
import { Database, Filter, RefreshCw, Layers } from 'lucide-react';

interface DataNodeData {
    dataBlock: DataBlock;
    onSelect: () => void;
    isSelected: boolean;
}

export const DataNode: React.FC<NodeProps<DataNodeData>> = ({ data }) => {
    const { dataBlock, onSelect, isSelected } = data;

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'filtered': return <Filter className="w-3 h-3" />;
            case 'reprocessed': return <RefreshCw className="w-3 h-3" />;
            case 'shortlisted': return <Layers className="w-3 h-3" />;
            default: return <Database className="w-3 h-3" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'filtered': return 'bg-orange-50 text-orange-600 border-orange-200';
            case 'reprocessed': return 'bg-cyan-50 text-cyan-600 border-cyan-200';
            case 'shortlisted': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    };

    return (
        <div
            onClick={onSelect}
            className={`
        relative min-w-[180px] rounded-lg border bg-white transition-all duration-200 group
        ${isSelected
                    ? 'ring-2 ring-indigo-500/20 shadow-lg'
                    : 'shadow-sm hover:shadow-md'
                }
      `}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="!w-2 !h-2 !bg-slate-300 !border-2 !border-white !rounded-full -mt-1"
            />

            <div className={`
        flex items-center gap-2 px-3 py-2 border-b text-[10px] font-bold uppercase tracking-wide rounded-t-lg
        ${getTypeColor(dataBlock.type)}
      `}>
                {getTypeIcon(dataBlock.type)}
                {dataBlock.type}
            </div>

            <div className="p-3">
                <div className="font-semibold text-xs text-slate-800 mb-1">{dataBlock.name}</div>
                {dataBlock.description && (
                    <div className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                        {dataBlock.description}
                    </div>
                )}
            </div>

<Handle
    type="source"
    position={Position.Bottom}
    style={{
        width: 0,
        height: 0,
        opacity: 0,
        pointerEvents: 'none',
    }}
/>

            {/* Tooltip on Hover */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-50">
                {dataBlock.name} - {dataBlock.type}
            </div>
        </div>
    );
};
