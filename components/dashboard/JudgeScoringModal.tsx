import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { db } from '../../services/database';
import { Submission, JudgingCriterion, CriterionScore } from '../../services/models';
import { queryKeys } from '../../services/queryKeys';

interface JudgeScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
  criteria: JudgingCriterion[];
  /** The submission_judges row id linking this judge to this submission */
  submissionJudgeId?: string;
  onScored?: () => void;
}

// Renders submitted form data from the submission_data jsonb field
const FormDataViewer: React.FC<{ submissionData: Record<string, unknown> }> = ({ submissionData }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const entries = Object.entries(submissionData || {}).filter(
    ([key]) => key !== 'votes' && key !== '__v',
  );

  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm p-6">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        No form data submitted.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-6">
      {entries.map(([key, value]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const strVal = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
        const isLong = strVal.length > 200;
        const isExpanded = expanded.has(key);

        return (
          <div key={key} className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            {isLong && !isExpanded ? (
              <>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{strVal.slice(0, 200)}…</p>
                <button
                  onClick={() => setExpanded(prev => { const s = new Set(prev); s.add(key); return s; })}
                  className="mt-1 text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  Show more <ChevronDown className="w-3 h-3" />
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{strVal}</p>
                {isLong && (
                  <button
                    onClick={() => setExpanded(prev => { const s = new Set(prev); s.delete(key); return s; })}
                    className="mt-1 text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    Show less <ChevronUp className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const JudgeScoringModal: React.FC<JudgeScoringModalProps> = ({
  isOpen,
  onClose,
  submission,
  criteria,
  submissionJudgeId,
  onScored,
}) => {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [overallComment, setOverallComment] = useState('');

  // Reset state when modal opens for a new submission
  useEffect(() => {
    if (isOpen && submission) {
      setScores({});
      setComments({});
      setOverallComment('');
    }
  }, [isOpen, submission?.id]);

  // Fetch existing scores for this submission (admin view shows all judges)
  const { data: existingScores = [] } = useQuery({
    queryKey: queryKeys.judging.scores(submission?.id ?? ''),
    queryFn: () => db.getScoresForSubmission(submission!.id),
    enabled: isOpen && !!submission?.id,
    staleTime: 30_000,
  });

  const submitMutation = useMutation({
    mutationFn: (criteriaScores: CriterionScore[]) => {
      if (!submissionJudgeId) throw new Error('No judge assignment found');
      return db.submitScores(submissionJudgeId, criteriaScores);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.judging.scores(submission?.id ?? '') });
      toast.success('Scores submitted successfully');
      onScored?.();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to submit scores');
    },
  });

  const handleSubmit = () => {
    const criteriaScores: CriterionScore[] = criteria.map(c => ({
      criterionId: c.id,
      score: scores[c.id] ?? c.minScore,
      comment: comments[c.id] || undefined,
    }));
    submitMutation.mutate(criteriaScores);
  };

  // Weighted total calculation
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const weightedScore = totalWeight > 0
    ? criteria.reduce((sum, c) => {
        const raw = scores[c.id] ?? 0;
        const normalised = c.maxScore > 0 ? (raw / c.maxScore) * 100 : 0;
        return sum + (normalised * c.weight) / totalWeight;
      }, 0)
    : 0;

  if (!submission) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Score: ${submission.title}`} size="full">
      <div className="flex h-[70vh] gap-0 -mx-6 -mb-6 mt-2 overflow-hidden border-t border-slate-100">
        {/* LEFT: Submitted form data */}
        <div className="w-[60%] border-r border-slate-100 overflow-y-auto">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Submitted Entry</span>
            <span className="ml-auto text-xs text-slate-400">{submission.applicant} · {submission.date}</span>
          </div>

          {/* Entry meta */}
          <div className="px-6 pt-4 pb-2 flex items-center gap-3">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{submission.category}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{submission.status}</span>
          </div>

          <FormDataViewer submissionData={submission.submissionData as Record<string, unknown> ?? {}} />

          {/* Existing scores from other judges (admin view) */}
          {existingScores.length > 0 && (
            <div className="px-6 pb-6">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Previous Scores ({existingScores.length} judge{existingScores.length > 1 ? 's' : ''})
              </h4>
              {existingScores.map((sj: Record<string, unknown>) => {
                const judge = sj.judges as { name?: string } | null;
                const scoreRows = sj.scores as { score: number; judging_criteria: { name: string } }[] | null;
                return (
                  <div key={String(sj.id)} className="bg-slate-50 rounded-xl p-4 mb-3 text-sm">
                    <p className="font-semibold text-slate-700 mb-2">{judge?.name ?? 'Judge'}</p>
                    {(scoreRows ?? []).map((row, i) => (
                      <div key={i} className="flex justify-between text-slate-600">
                        <span>{row.judging_criteria?.name}</span>
                        <span className="font-semibold">{row.score}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Scoring panel */}
        <div className="w-[40%] flex flex-col">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Score this Entry</span>
            {criteria.length > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min(weightedScore, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-indigo-600">{weightedScore.toFixed(1)}%</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {criteria.length === 0 ? (
              <p className="text-sm text-slate-400">No scoring criteria configured for this program.</p>
            ) : (
              criteria.map(c => (
                <div key={c.id}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                      {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
                    </div>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2">
                      ×{c.weight}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="number"
                      min={c.minScore}
                      max={c.maxScore}
                      step={1}
                      value={scores[c.id] ?? ''}
                      onChange={e => setScores(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                      placeholder={`${c.minScore}–${c.maxScore}`}
                      className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <span className="text-xs text-slate-400">/ {c.maxScore}</span>
                  </div>
                  <textarea
                    rows={2}
                    value={comments[c.id] ?? ''}
                    onChange={e => setComments(prev => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder="Optional comment…"
                    className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              ))
            )}

            {/* Overall comment */}
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1">Overall Comment</label>
              <textarea
                rows={3}
                value={overallComment}
                onChange={e => setOverallComment(e.target.value)}
                placeholder="General feedback for this entry…"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100">
            {!submissionJudgeId ? (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                This submission has not been assigned to you. Scores cannot be submitted.
              </p>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || criteria.length === 0}
                className="w-full flex items-center justify-center gap-2"
              >
                {submitMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {submitMutation.isPending ? 'Submitting…' : 'Submit Scores'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
