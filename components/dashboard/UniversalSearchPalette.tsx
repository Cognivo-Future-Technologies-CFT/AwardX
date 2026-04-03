import React from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { Modal } from '../Modal';

export interface UniversalSearchResult {
  id: string;
  title: string;
  description: string;
  meta?: string;
  icon: React.ReactNode;
  onSelect: () => void;
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
  const hasQuery = query.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Universal Search" size="xl">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search programs, submissions, teams, roles, notifications, logs..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {!hasQuery && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Tip: press Cmd/Ctrl+K anytime to open search, or press ? to view shortcuts.
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
          {results.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              {hasQuery ? 'No results found. Try a different term.' : 'Start typing to search across the workspace.'}
            </div>
          ) : (
            results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => {
                  result.onSelect();
                  onClose();
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 [&>svg]:h-5 [&>svg]:w-5">
                    {result.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{result.title}</span>
                      {result.meta && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {result.meta}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{result.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-slate-300" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
