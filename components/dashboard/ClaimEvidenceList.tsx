import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Check, X, Minus } from 'lucide-react';
import type { ClaimSource } from '../../services/personIntelligenceApi';

interface ClaimEvidenceListProps {
  sources: ClaimSource[];
  maxPreview?: number;
}

export const ClaimEvidenceList: React.FC<ClaimEvidenceListProps> = ({
  sources,
  maxPreview = 3,
}) => {
  const [showAll, setShowAll] = useState(false);

  if (!sources || sources.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic mt-1">No verification sources found</p>
    );
  }

  const displaySources = showAll ? sources : sources.slice(0, maxPreview);
  const hasMore = sources.length > maxPreview;

  return (
    <div className="mt-2 space-y-1">
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
        Sources ({sources.length})
      </p>
      {displaySources.map((source, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs">
          {source.supportsClaim === true && (
            <Check className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
          )}
          {source.supportsClaim === false && (
            <X className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
          )}
          {source.supportsClaim === null && (
            <Minus className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
          )}
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 hover:decoration-indigo-600 inline-flex items-center gap-0.5"
            >
              {source.title || source.url.slice(0, 60)}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="text-gray-500">{source.title || 'Unknown source'}</span>
          )}
          <span className="text-gray-400 ml-auto shrink-0">
            {(source.confidence * 100).toFixed(0)}%
          </span>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 mt-1"
        >
          {showAll ? (
            <>Show less <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>Show {sources.length - maxPreview} more <ChevronDown className="w-3 h-3" /></>
          )}
        </button>
      )}
    </div>
  );
};
