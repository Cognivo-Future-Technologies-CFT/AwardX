import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApplicantDraftItem, db, MySubmissionPortalItem } from '../../services/database';
import { AlertCircle, ChevronDown, ChevronUp, Clock, Clock3, CheckCircle, XCircle, Star, CreditCard, Eye, FileText, MessageSquareText, MinusCircle, PencilLine, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useConfirm } from '../ConfirmDialog';

const statusBadgeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'border-slate-200 bg-slate-50 text-slate-600', icon: <Clock className="h-3 w-3" /> },
  under_review: { label: 'Under Review', color: 'border-blue-200 bg-blue-50 text-blue-700', icon: <Eye className="h-3 w-3" /> },
  shortlisted: { label: 'Shortlisted', color: 'border-purple-200 bg-purple-50 text-purple-700', icon: <Star className="h-3 w-3" /> },
  accepted: { label: 'Accepted', color: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: 'Rejected', color: 'border-rose-200 bg-rose-50 text-rose-700', icon: <XCircle className="h-3 w-3" /> },
  withdrawn: { label: 'Withdrawn', color: 'border-slate-200 bg-slate-100 text-slate-500', icon: <MinusCircle className="h-3 w-3" /> },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const key = status.toLowerCase().replace(/\s+/g, '_');
  const cfg = statusBadgeConfig[key] || { label: status, color: 'border-slate-200 bg-slate-50 text-slate-600', icon: <Clock className="h-3 w-3" /> };
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

const toTitleCase = (value: string) =>
  (value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

export const MySubmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialogNode } = useConfirm();
  const [expandedSubmissionId, setExpandedSubmissionId] = React.useState<string | null>(null);
  const [withdrawError, setWithdrawError] = React.useState<string | null>(null);

  const submissionsQuery = useQuery({
    queryKey: ['my-submissions-portal'],
    queryFn: () => db.getMySubmissionPortalData(),
  });

  const withdrawMutation = useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: string; reason?: string }) =>
      db.withdrawMySubmission(submissionId, reason),
    onSuccess: async () => {
      setWithdrawError(null);
      await queryClient.invalidateQueries({ queryKey: ['my-submissions-portal'] });
    },
    onError: (error: any) => {
      setWithdrawError(error?.message || 'Unable to withdraw submission.');
    },
  });

  const submissions: MySubmissionPortalItem[] = submissionsQuery.data?.submissions || [];
  const drafts: ApplicantDraftItem[] = submissionsQuery.data?.drafts || [];

  const handleResumeDraft = (draft: ApplicantDraftItem) => {
    navigate(`/form/${draft.formId}`);
  };

  const handleWithdraw = async (submission: MySubmissionPortalItem) => {
    const ok = await confirm({
      title: `Withdraw "${submission.title}"?`,
      description: 'This will withdraw your entry from the program. This action cannot be undone.',
      confirmLabel: 'Withdraw entry',
    });
    if (!ok) return;
    await withdrawMutation.mutateAsync({ submissionId: submission.id });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      {ConfirmDialogNode}
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900">My Submissions</h1>
          <p className="mt-1 text-slate-500">Track status, review feedback, continue drafts, and withdraw pending entries.</p>
        </div>

        {withdrawError && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{withdrawError}</span>
          </div>
        )}

        {drafts.length > 0 && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Saved Drafts</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{drafts.length} draft{drafts.length === 1 ? '' : 's'}</span>
            </div>
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div key={draft.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{draft.programTitle}</p>
                    <p className="mt-1 font-semibold text-slate-800">{draft.formTitle}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Last saved {new Date(draft.updatedAt).toLocaleString()} | Page {draft.currentPage + 1} | {draft.fieldCount} field{draft.fieldCount === 1 ? '' : 's'} completed
                    </p>
                  </div>
                  <button
                    onClick={() => handleResumeDraft(draft)}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    <PencilLine className="h-4 w-4" /> Resume Draft
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {submissionsQuery.isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading your submissions...
          </div>
        )}

        {submissionsQuery.isError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400" />
            <h2 className="text-lg font-bold text-rose-900">Could not load submissions</h2>
            <p className="mt-1 text-sm text-rose-700">
              {(submissionsQuery.error as Error)?.message || 'Something went wrong. Please try again.'}
            </p>
            <button
              type="button"
              onClick={() => submissionsQuery.refetch()}
              className="mt-4 inline-flex items-center rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Try again
            </button>
          </div>
        )}

        {!submissionsQuery.isLoading && !submissionsQuery.isError && submissions.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <h2 className="text-lg font-bold text-slate-900">No submissions yet</h2>
            <p className="mt-1 text-sm text-slate-500">Your submitted applications will appear here.</p>
          </div>
        )}

        <div className="space-y-4">
          {submissions.map((submission) => (
            <div key={submission.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">{submission.programTitle}</p>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900">{submission.title}</h3>
                </div>
                <StatusBadge status={submission.status} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" /> Submitted
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">{new Date(submission.submittedAt).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" /> Payment
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {toTitleCase(submission.paymentStatus)}
                    {submission.paymentAmount > 0 ? ` (${submission.paymentAmount.toFixed(2)})` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={() => setExpandedSubmissionId((prev) => (prev === submission.id ? null : submission.id))}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <MessageSquareText className="h-4 w-4" />
                  {submission.feedbackCount > 0 ? `${submission.feedbackCount} Feedback item${submission.feedbackCount === 1 ? '' : 's'}` : 'No feedback yet'}
                  {expandedSubmissionId === submission.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {submission.canWithdraw && (
                  <button
                    onClick={() => handleWithdraw(submission)}
                    disabled={withdrawMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw Submission'}
                  </button>
                )}
              </div>

              {expandedSubmissionId === submission.id && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {submission.feedbackItems.length === 0 && (
                    <p className="text-sm text-slate-500">Judges have not submitted feedback for this entry yet.</p>
                  )}

                  {submission.feedbackItems.length > 0 && (
                    <div className="space-y-3">
                      {submission.feedbackItems.map((feedback, idx) => (
                        <div key={`${submission.id}-feedback-${idx}`} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-800">{feedback.judgeName}</p>
                            {feedback.recommendation && (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                {feedback.recommendation}
                              </span>
                            )}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                              {feedback.scoredCriteriaCount} score{feedback.scoredCriteriaCount === 1 ? '' : 's'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{feedback.overallComment || 'No written comment provided.'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
