import React, { useRef, useEffect, useState } from 'react';
import { ArrowRight, Search, Command, CornerDownLeft, ArrowUp, ArrowDown, Hash, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface UniversalSearchResult {
  id: string;
  title: string;
  description: string;
  meta?: string;
  icon: React.ReactNode;
  onSelect: () => void;
  category?: string;
}

interface UniversalSearchPaletteProps {
  isOpen: boolean;
  query: string;
  results: UniversalSearchResult[];
  onQueryChange: (value: string) => void;
  onClose: () => void;
}

export const UniversalSearchPalette: React.FC<UniversalSearchPaletteProps> = ({
  isOpen,
  query,
  results,
  onQueryChange,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const hasQuery = query.trim().length > 0;

  // Group results by category
  const grouped = results.reduce<Record<string, UniversalSearchResult[]>>((acc, result) => {
    const cat = result.meta || 'Results';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(result);
    return acc;
  }, {});

  // Flat list for keyboard nav
  const flatResults = results;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[activeIndex]) {
          flatResults[activeIndex].onSelect();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  let globalIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-slate-950/40 backdrop-blur-[8px]"
            onClick={onClose}
          />

          {/* Palette Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed inset-x-0 top-[12vh] z-[9999] mx-auto w-full max-w-2xl px-4"
            onKeyDown={handleKeyDown}
          >
            {/* Detached Search Input Panel */}
            <div className="flex items-center gap-4 rounded-full border border-white/40 bg-white/75 backdrop-blur-xl px-6 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-white/10 transition-all duration-300 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/30">
              <Search className="h-5.5 w-5.5 shrink-0 text-indigo-500" />
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search programs, submissions, settings..."
                className="flex-1 bg-transparent border-0 border-transparent shadow-none outline-none focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none text-[17px] text-slate-900 placeholder:text-slate-400 font-medium"
                style={{ border: 'none', background: 'transparent', boxShadow: 'none', outline: 'none' }}
              />
              <kbd className="hidden sm:inline-flex h-6 items-center rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 text-[9px] font-extrabold text-slate-400 tracking-widest">
                ESC
              </kbd>
            </div>

            {/* Detached Results Panel */}
            <div className="mt-4 overflow-hidden rounded-[28px] border border-white/30 bg-white/75 backdrop-blur-xl shadow-[0_32px_60px_-15px_rgba(0,0,0,0.25)] ring-1 ring-white/10">
              <div ref={listRef} className="max-h-[50vh] overflow-y-auto overscroll-contain py-3 px-3 space-y-1">
                {!hasQuery && (
                  <div className="px-5 py-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50/60 to-purple-50/60 shadow-inner">
                      <Sparkles className="h-6.5 w-6.5 text-indigo-500" />
                    </div>
                    <p className="text-base font-bold text-slate-800">Search across your workspace</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Instantly jump to programs, submissions, judges, forms, or settings.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100/50 pt-5 max-w-sm mx-auto">
                      <span className="flex items-center gap-1.5"><ArrowUp className="h-3.5 w-3.5" /><ArrowDown className="h-3.5 w-3.5" /> Navigate</span>
                      <span className="flex items-center gap-1.5"><CornerDownLeft className="h-3.5 w-3.5" /> Select</span>
                      <span className="flex items-center gap-1.5">ESC Close</span>
                    </div>
                  </div>
                )}

                {hasQuery && flatResults.length === 0 && (
                  <div className="px-5 py-12 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50/40">
                      <Search className="h-7 w-7 text-slate-300" />
                    </div>
                    <p className="text-base font-bold text-slate-800">No results found</p>
                    <p className="mt-1 text-sm text-slate-500">We couldn't find anything matching your query.</p>
                  </div>
                )}

                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="space-y-1">
                    <div className="px-4 py-2 mt-3 first:mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        {category}
                      </span>
                    </div>
                    {items.map((result) => {
                      globalIndex++;
                      const idx = globalIndex;
                      const isActive = activeIndex === idx;
                      return (
                        <button
                          key={result.id}
                          data-index={idx}
                          type="button"
                          onClick={() => {
                            result.onSelect();
                            onClose();
                          }}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`group flex w-full items-center gap-4 px-4 py-3 text-left rounded-2xl transition-all duration-200 ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.01]'
                              : 'text-slate-700 hover:bg-slate-50/50 hover:scale-[1.005]'
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-indigo-50/50 text-indigo-500 group-hover:bg-indigo-100/50'
                            } [&>svg]:h-5 [&>svg]:w-5`}
                          >
                            {result.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-[15px] font-bold ${isActive ? 'text-white' : 'text-slate-800'}`}>{result.title}</div>
                            <div className={`mt-0.5 truncate text-[13px] ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>{result.description}</div>
                          </div>
                          {isActive && (
                            <CornerDownLeft className="h-4.5 w-4.5 shrink-0 text-white opacity-90" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer */}
              {hasQuery && flatResults.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-200/30 bg-slate-50/30 px-5 py-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {flatResults.length} result{flatResults.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><ArrowUp className="h-3.5 w-3.5" /><ArrowDown className="h-3.5 w-3.5" /> Navigate</span>
                    <span className="flex items-center gap-1.5"><CornerDownLeft className="h-3.5 w-3.5" /> Open</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
