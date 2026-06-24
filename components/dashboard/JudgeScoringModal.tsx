import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { db } from '../../services/database';
import { Submission, JudgingCriterion, CriterionScore } from '../../services/models';
import { queryKeys } from '../../services/queryKeys';
import { submitJudgeScores } from '../../services/scoresApi';
import { useConfirm } from '../ConfirmDialog';
import { SubmissionFormResponses } from './SubmissionFormResponses';
import { SubmissionSummary } from './SubmissionSummary';

interface JudgeScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
  criteria: JudgingCriterion[];
  /** The submission_judges row id linking this judge to this submission */
  submissionJudgeId?: string;
  onScored?: () => void;
  /** If true, only show this judge's scores (judge portal mode) */
  isJudgeView?: boolean;
  /** Invite token for judge portal scoring (bypasses org auth) */
  judgeToken?: string;
}

export const JudgeScoringModal: React.FC<JudgeScoringModalProps> = ({
  isOpen,
  onClose,
  submission,
  criteria,
  submissionJudgeId,
  onScored,
  isJudgeView = false,
  judgeToken,
}) => {
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [overallComment, setOverallComment] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Task 2: track whether the user has modified any field since opening
  const [isDirty, setIsDirty] = useState(false);
  // Task 3: per-criterion clamp warning
  const [clampWarnings, setClampWarnings] = useState<Record<string, boolean>>({});
  const populatedRef = useRef(false);

  const clampScore = (value: number, minScore: number, maxScore: number) => {
    const boundedMax = Math.min(maxScore, 100);
    return Math.min(Math.max(value, minScore), boundedMax);
  };

  const preferredJudgeId = submission?.assignedJudges?.[0];
  const { data: resolvedAssignmentId } = useQuery({
    queryKey: ['submission-judge-assignment-id', submission?.id, preferredJudgeId],
    queryFn: () => db.getSubmissionJudgeAssignmentId(submission!.id, preferredJudgeId),
    enabled: isOpen && !isJudgeView && !!submission?.id && !submissionJudgeId,
    staleTime: 30_000,
  });

  const effectiveSubmissionJudgeId = submissionJudgeId || resolvedAssignmentId || undefined;

  // Fetch existing scores for this submission (admin view shows all judges)
  const { data: existingScores = [] } = useQuery({
    queryKey: queryKeys.judging.scores(submission?.id ?? ''),
    queryFn: () => db.getScoresForSubmission(submission!.id),
    enabled: isOpen && !!submission?.id,
    staleTime: 30_000,
  });

  const currentJudgeScoreRow = effectiveSubmissionJudgeId
    ? (existingScores as any[]).find((sj: any) => sj.id === effectiveSubmissionJudgeId)
    : null;
  const hasExistingScore = !!currentJudgeScoreRow && (
    ((currentJudgeScoreRow.scores as any[] | undefined)?.length || 0) > 0 ||
    !!currentJudgeScoreRow.judge_comments?.overall_comment
  );

  // Task 1: Pre-populate scores when modal opens for an already-scored submission.
  // Reset and populate whenever the modal opens for a different submission.
  useEffect(() => {
    if (!isOpen || !submission) return;
    // Always clear form state when opening/changing submission to avoid value carry-over.
    setScores({});
    setComments({});
    setOverallComment('');
    // Reset dirty flag and clamp warnings for every open
    setIsDirty(false);
    setClampWarnings({});
    setSaveState('idle');
    setLastSavedAt(null);
    populatedRef.current = false;
  }, [isOpen, submission?.id]);

  useEffect(() => {
    if (!isOpen || !submission || populatedRef.current) return;
    if (!effectiveSubmissionJudgeId) return;
    if (existingScores.length === 0) return;

    // Find the score rows belonging to this specific submission_judge
    const myScoreRow = (existingScores as any[]).find(
      (sj: any) => sj.id === effectiveSubmissionJudgeId,
    );
    if (!myScoreRow) return;

    const scoreRows: { score: number; comment?: string; judging_criteria: { id?: string } }[] =
      myScoreRow.scores || [];

    if (scoreRows.length === 0) return;

    const preScores: Record<string, number> = {};
    const preComments: Record<string, string> = {};
    for (const row of scoreRows) {
      const criterionId = row.judging_criteria?.id;
      if (!criterionId) continue;
      preScores[criterionId] = row.score;
      if (row.comment) preComments[criterionId] = row.comment;
    }

    const preOverall = myScoreRow.judge_comments?.overall_comment || '';

    setScores(preScores);
    setComments(preComments);
    setOverallComment(preOverall);
    populatedRef.current = true;
    // Pre-populating does not make the form dirty
  }, [isOpen, submission?.id, effectiveSubmissionJudgeId, existingScores]);

  const submitMutation = useMutation({
    mutationFn: async (payload: { criteriaScores: CriterionScore[]; overallComment?: string }) => {
      if (!effectiveSubmissionJudgeId) throw new Error('No judge assignment found');

      if (judgeToken) {
        return submitJudgeScores({
          token: judgeToken,
          submissionJudgeId: effectiveSubmissionJudgeId,
          criteriaScores: payload.criteriaScores,
          overallComment: payload.overallComment,
        });
      }

      return db.submitScores(
        effectiveSubmissionJudgeId,
        payload.criteriaScores,
        payload.overallComment,
        criteria.map((criterion, index) => ({
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
          minScore: criterion.minScore,
          maxScore: criterion.maxScore,
          sortOrder: criterion.sortOrder ?? index,
        })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.judging.scores(submission?.id ?? '') });
      setSaveState('saved');
      setLastSavedAt(new Date());
      toast.success('Scores saved successfully');
      onScored?.();
      onClose();
    },
    onError: (err: Error) => {
      setSaveState('error');
      toast.error(err.message || 'Failed to submit scores');
    },
  });

  const handleSubmit = async () => {
    const ok = await confirm({
      title: hasExistingScore ? 'Update scores?' : 'Save scores?',
      description: hasExistingScore
        ? 'This will overwrite your previous scoring values for this submission.'
        : 'These scores will be saved for this submission.',
      confirmLabel: hasExistingScore ? 'Update Scores' : 'Save Scores',
    });
    if (!ok) return;

    setSaveState('saving');
    const criteriaScores: CriterionScore[] = criteria.map(c => ({
      criterionId: c.id,
      score: scores[c.id] ?? c.minScore,
      comment: comments[c.id] || undefined,
    }));
    // Pass overall comment to submitScores
    submitMutation.mutate({ criteriaScores, overallComment });
  };

  // Weighted total calculation
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const weightedScore = totalWeight > 0
    ? criteria.reduce((sum, c) => {
        const raw = clampScore(scores[c.id] ?? 0, c.minScore, c.maxScore);
        const normalised = c.maxScore > 0 ? (raw / c.maxScore) * 100 : 0;
        return sum + (normalised * c.weight) / totalWeight;
      }, 0)
    : 0;

  // Task 5: Admins should not overwrite individual judge scores.
  // In admin view (not isJudgeView), and no submissionJudgeId provided, show read-only.
  const isAdminReadOnly = !isJudgeView && !submissionJudgeId && !resolvedAssignmentId;

  if (!submission) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${hasExistingScore ? 'Edit Scoring' : 'Score'}: ${submission.title}`}
      size="full"
    >
      {ConfirmDialogNode}
      {/* Task 4: responsive layout — stack on small screens, side-by-side on lg+ */}
      <div className="flex flex-col lg:flex-row h-auto lg:h-[70vh] gap-0 -mx-6 -mb-6 mt-2 overflow-hidden border-t border-slate-100">
        {/* LEFT: Submitted form data */}
        <div className="w-full lg:w-[60%] border-b lg:border-b-0 lg:border-r border-slate-100 overflow-y-auto">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Submitted Entry</span>
            <span className="ml-auto text-xs text-slate-400">
              {(submission.applicant || submission.applicantName || 'Unknown')} · {(submission.date || submission.submittedAt ? new Date(submission.date || submission.submittedAt!).toLocaleDateString() : 'N/A')}
            </span>
          </div>

          {/* Entry meta */}
          <div className="px-6 pt-4 pb-2 flex items-center gap-3">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{submission.category}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{submission.status}</span>
          </div>

          {/* AI Summary */}
          <div className="px-6 pb-4">
            <SubmissionSummary submission={submission} enabled={isOpen} judgeToken={judgeToken} />
          </div>

          <SubmissionFormResponses submission={submission} enabled={isOpen} />

          {/* Existing scores from other judges (admin view only) */}
          {!isJudgeView && existingScores.length > 0 && (
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
        <div className="w-full lg:w-[40%] flex flex-col">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">{hasExistingScore ? 'Edit this Score' : 'Score this Entry'}</span>
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
            {/* Task 2: only show save state text after user has made changes */}
            <div className="mt-2 text-xs">
              {saveState === 'saving' && <span className="text-amber-600">Saving scores...</span>}
              {saveState === 'saved' && (
                <span className="text-emerald-600">Saved {lastSavedAt ? lastSavedAt.toLocaleTimeString() : 'just now'}</span>
              )}
              {saveState === 'error' && <span className="text-red-600">Save failed. Please retry.</span>}
              {saveState === 'idle' && isDirty && <span className="text-slate-500">Unsaved changes</span>}
              {saveState === 'idle' && !isDirty && <span className="text-slate-400">Ready to score</span>}
            </div>
          </div>

          {/* Task 5: if admin has no assignment, show read-only notice */}
          {isAdminReadOnly ? (
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4 border border-slate-200">
                Viewing as admin. To score this submission, assign yourself as a judge first.
              </p>
            </div>
          ) : (
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
    max={Math.min(c.maxScore, 100)}
    step={1}
    value={scores[c.id] ?? ''}
    onChange={e => {
      const value = e.target.value.trim();

      if (value === '') {
        setScores(prev => {
          const next = { ...prev };
          delete next[c.id];
          return next;
        });

        setClampWarnings(prev => ({
          ...prev,
          [c.id]: false,
        }));

        setIsDirty(true);
        return;
      }

      const parsed = Number(value);

      if (!Number.isFinite(parsed)) {
        return;
      }

      const maxAllowed = Math.min(c.maxScore, 100);

      if (parsed < c.minScore || parsed > maxAllowed) {
        setClampWarnings(prev => ({
          ...prev,
          [c.id]: true,
        }));

        return;
      }

      setClampWarnings(prev => ({
        ...prev,
        [c.id]: false,
      }));

      setScores(prev => ({
        ...prev,
        [c.id]: parsed,
      }));

      setIsDirty(true);
    }}
    placeholder={`${c.minScore}–${Math.min(c.maxScore, 100)}`}
    className={`w-24 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2
      ${
        clampWarnings[c.id]
          ? 'border-red-300 focus:ring-red-300'
          : 'border-slate-200 focus:ring-indigo-300'
      }`}
  />

  <span className="text-xs text-slate-400">
    / {c.maxScore}
  </span>
</div>

{clampWarnings[c.id] && (
  <p className="mt-1 text-xs text-red-600">
    Score must be between {c.minScore} and {Math.min(c.maxScore, 100)}
  </p>
)}
                    <textarea
                      rows={2}
                      value={comments[c.id] ?? ''}
                        onChange={e => {
                          setComments(prev => ({ ...prev, [c.id]: e.target.value }));
                          setIsDirty(true);
                        }}
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
                  onChange={e => {
                    setOverallComment(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="General feedback for this entry…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
          )}

          <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100">
            {isAdminReadOnly ? (
              <button
                onClick={onClose}
                className="w-full text-sm font-medium text-slate-600 hover:text-slate-800 py-2"
                type="button"
              >
                Close
              </button>
            ) : !effectiveSubmissionJudgeId ? (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                This submission has not been assigned to you. Scores cannot be submitted.
              </p>
            ) : (
              <>
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
                  {submitMutation.isPending
                    ? 'Saving…'
                    : saveState === 'saved'
                      ? 'Saved'
                      : hasExistingScore
                        ? 'Update Scores'
                        : 'Save Scores'}
                </Button>
                <button
                  onClick={onClose}
                  className="w-full mt-2 text-xs text-slate-500 hover:text-slate-700"
                  type="button"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
