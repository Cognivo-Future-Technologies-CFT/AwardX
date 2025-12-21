import React, { useState } from 'react';
import { Category } from '../../services/demoDb';
import { Folder, Plus, MoreHorizontal, FileText } from 'lucide-react';

interface TileProps {
    categories: Category[];
    onAddSub: (parentId: string) => void;
}

export const CategoriesTiles: React.FC<TileProps> = ({ categories, onAddSub }) => {
    // Filter filtering logic can be added here, for now show all flat or rooted?
    // "Tile View" usually implies seeing everything in a grid.
    // But flat list of 100 items is chaotic.
    // Let's simple show Root Categories as Big Tiles, and maybe clickable to drill down?
    // Or actually, let's show ALL categories as a flat grid but with visual hierarchy or filtering?
    // Valid "Tile View" Interpretation: A grid of folders, identical to Windows Explorer Large Icons.

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map(cat => (
                <div
                    key={cat.id}
                    className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer relative"
                    onClick={() => onAddSub(cat.id)} // For now open modal to add sub, or maybe should navigate?
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl mb-1 ${!cat.parentId ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            <Folder className="w-6 h-6" />
                        </div>
                        <button className="text-slate-300 hover:text-slate-600">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-700 truncate text-sm" title={cat.title}>{cat.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                {cat.parentId ? 'Sub' : 'Main'}
                            </span>
                            {cat.entriesCount > 0 && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                    <FileText className="w-3 h-3" /> {cat.entriesCount}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Add Sub Button Overlay */}
                    <div className="absolute inset-0 bg-indigo-900/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4 backdrop-blur-[1px]">
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddSub(cat.id); }}
                            className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:scale-105 transition-transform flex items-center gap-2"
                        >
                            <Plus className="w-3 h-3" /> Add Sub
                        </button>
                    </div>
                </div>
            ))}

            <button
                onClick={() => onAddSub('')}
                className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all min-h-[140px]"
            >
                <Plus className="w-8 h-8 opacity-50 mb-2" />
                <span className="text-xs font-bold">Create New</span>
            </button>
        </div>
    );
};
