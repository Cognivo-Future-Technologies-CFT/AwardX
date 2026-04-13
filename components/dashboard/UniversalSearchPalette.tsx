import React, { useRef, useEffect, useState } from 'react';
import { ArrowRight, Search, Command, CornerDownLeft, ArrowUp, ArrowDown, Hash, Sparkles } from 'lucide-react';

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

  if (!isOpen) return null;

  let globalIndex = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className="fixed inset-x-0 top-[12vh] z-[9999] mx-auto w-full max-w-2xl px-4"
        onKeyDown={handleKeyDown}
      >
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl shadow-black/20 ring-1 ring-black/5">
          {/* Search Input */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search everything... programs, submissions, judges, settings"
              className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none font-medium"
            />
            <kbd className="hidden sm:inline-flex h-6 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-[10px] font-bold text-slate-400 tracking-wider">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto overscroll-contain py-2">
            {!hasQuery && (
              <div className="px-5 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50">
                  <Sparkles className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Search across your workspace</p>
                <p className="mt-1 text-xs text-slate-400">
                  Programs, submissions, judges, forms, settings, and more
                </p>
                <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> Navigate</span>
                  <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> Select</span>
                  <span className="flex items-center gap-1">ESC Close</span>
                </div>
              </div>
            )}

            {hasQuery && flatResults.length === 0 && (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                  <Search className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No results found</p>
                <p className="mt-1 text-xs text-slate-400">Try a different search term</p>
              </div>
            )}

            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-5 py-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
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
                      className={`group flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-900'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isActive
                            ? 'bg-indigo-100 text-indigo-600'
                            : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                        } [&>svg]:h-4 [&>svg]:w-4`}
                      >
                        {result.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{result.title}</div>
                        <div className="mt-0.5 truncate text-xs text-slate-400">{result.description}</div>
                      </div>
                      {isActive && (
                        <CornerDownLeft className="h-4 w-4 shrink-0 text-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          {hasQuery && flatResults.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {flatResults.length} result{flatResults.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> Navigate</span>
                <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> Open</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
