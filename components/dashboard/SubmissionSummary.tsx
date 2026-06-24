import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Bot,
  FileSearch,
  Link2,
} from 'lucide-react';
import { useSubmissionSummary } from '../../hooks/useSubmissionSummary';
import type { Submission } from '../../services/models';

interface SubmissionSummaryProps {
  submission: Submission;
  enabled?: boolean;
  className?: string;
  judgeToken?: string;
}

function aiRiskLabel(percentage: number): { label: string; className: string } {
  if (percentage >= 75) {
    return { label: 'High AI likelihood', className: 'bg-rose-100 text-rose-700 border-rose-200' };
  }
  if (percentage >= 45) {
    return { label: 'Moderate AI signal', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
  return { label: 'Likely human-written', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
}

export const SubmissionSummary: React.FC<SubmissionSummaryProps> = ({
  submission,
  enabled = true,
  className = '',
  judgeToken,
}) => {
  const [expanded, setExpanded] = useState(false);
  const { processing, similar, isLoading, error } = useSubmissionSummary(
    enabled ? submission : null,
    { judgeToken },
  );

  if (!enabled) return null;

  const isProcessing =
    processing?.status === 'pending' || processing?.status === 'processing';
  const metadata = (processing?.metadata || {}) as Record<string, number | string[]>;
  const aiPct = processing?.aiPercentage;
  const aiRisk = typeof aiPct === 'number' ? aiRiskLabel(aiPct) : null;

  return (
    <div className={`rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
            Submission Intelligence
          </span>
          {processing?.status === 'completed' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-indigo-100 text-indigo-700 border-indigo-200">
              <FileSearch className="w-2.5 h-2.5" />
              Processed
            </span>
          )}
        </div>
        {processing?.summary && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-medium text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
            type="button"
          >
            {expanded ? 'Less' : 'Details'}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {isLoading && !processing ? (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Loading analysis...</span>
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Could not load submission analysis.</span>
          </div>
        ) : isProcessing ? (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Processing submission (documents, AI detection, embeddings)...</span>
          </div>
        ) : processing?.status === 'failed' ? (
          <div className="flex items-start gap-2 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Processing failed. Summary will be available after reprocessing.</span>
          </div>
        ) : null}

        {typeof aiPct === 'number' && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-100">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs font-semibold text-slate-700">AI Content Detection</p>
                <p className="text-[10px] text-slate-400">
                  Open-source linguistic analysis
                  {processing?.aiConfidence != null && ` · ${Math.round(processing.aiConfidence * 100)}% detection confidence`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">{aiPct}%</p>
              {aiRisk && (
                <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${aiRisk.className}`}>
                  {aiRisk.label}
                </span>
              )}
            </div>
          </div>
        )}

        {processing?.summary ? (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary</p>
            <p className="text-sm leading-relaxed text-slate-800">{processing.summary}</p>
          </div>
        ) : null}

        {similar.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              Similar submissions in organization
            </p>
            <ul className="space-y-2">
              {similar.map((item) => (
                <li
                  key={item.submissionId}
                  className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-white border border-slate-100"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{item.title}</p>
                    {item.applicantName && (
                      <p className="text-slate-400 truncate">{item.applicantName}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold text-indigo-600">
                    {Math.round(item.similarity * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {expanded && processing && (
          <div className="pt-3 border-t border-indigo-100 space-y-2 text-xs text-slate-500">
            {Array.isArray(metadata.aiReasons) && metadata.aiReasons.length > 0 && (
              <div className="pt-2 space-y-1">
                <span className="text-slate-500">Detection signals</span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                  {(metadata.aiReasons as string[]).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {typeof metadata.aiPerplexity === 'number' && (
              <div className="flex justify-between">
                <span>Perplexity</span>
                <span className="font-medium text-slate-700">{metadata.aiPerplexity}</span>
              </div>
            )}
            {typeof metadata.aiBurstiness === 'number' && (
              <div className="flex justify-between">
                <span>Burstiness</span>
                <span className="font-medium text-slate-700">{metadata.aiBurstiness}</span>
              </div>
            )}
            {typeof metadata.wordCount === 'number' && (
              <div className="flex justify-between">
                <span>Words processed</span>
                <span className="font-medium text-slate-700">{metadata.wordCount}</span>
              </div>
            )}
            {typeof metadata.parsedDocumentCount === 'number' && metadata.parsedDocumentCount > 0 && (
              <div className="flex justify-between">
                <span>Documents parsed</span>
                <span className="font-medium text-slate-700">{metadata.parsedDocumentCount}</span>
              </div>
            )}
            {typeof metadata.attachmentCount === 'number' && (
              <div className="flex justify-between">
                <span>Attachments</span>
                <span className="font-medium text-slate-700">{metadata.attachmentCount}</span>
              </div>
            )}
            {processing.summaryConfidence != null && (
              <div className="flex justify-between">
                <span>Summary confidence</span>
                <span className="font-medium text-slate-700">
                  {Math.round(processing.summaryConfidence * 100)}%
                </span>
              </div>
            )}
            {typeof metadata.processingTimeMs === 'number' && (
              <div className="flex justify-between">
                <span>Processing time</span>
                <span className="font-medium text-slate-700">{metadata.processingTimeMs}ms</span>
              </div>
            )}
            {processing.processedAt && (
              <div className="flex justify-between">
                <span>Processed at</span>
                <span className="font-medium text-slate-700">
                  {new Date(processing.processedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
