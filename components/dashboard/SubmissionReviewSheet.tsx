import React, { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, User, X } from 'lucide-react';
import { Judge, Submission } from '../../services/models';
import { db } from '../../services/database';
import { queryKeys } from '../../services/queryKeys';
import { SubmissionFormResponses } from './SubmissionFormResponses';

interface SubmissionReviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
  judges?: Judge[];
  programId?: string;
}

const statusStyles: Record<string, string> = {
  Pending: 'bg-slate-100 text-slate-700 border-slate-200',
  'Under Review': 'bg-blue-50 text-blue-700 border-blue-200',
  Shortlisted: 'bg-purple-50 text-purple-700 border-purple-200',
  Accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const SubmissionReviewSheet: React.FC<SubmissionReviewSheetProps> = ({
  isOpen,
  onClose,
  submission,
  judges = [],
  programId,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: activeFormId } = useQuery({
    queryKey: queryKeys.programForms.active(programId ?? ''),
    queryFn: () => db.getActiveFormForProgram(programId!),
    enabled: isOpen && !!programId,
    staleTime: 60_000,
  });

  const assignedJudges = useMemo(() => {
    if (!submission) return [];
    if (submission.assignedJudgeDetails && submission.assignedJudgeDetails.length > 0) {
      return submission.assignedJudgeDetails.map((j) => ({
        id: j.id,
        name: j.name,
        email: j.email,
        avatar: j.avatar,
        status: 'Active' as const,
      }));
    }
    const ids = submission.assignedJudges || [];
    const byId = new Map(judges.map((judge) => [judge.id, judge]));
    return ids
      .map((id) => byId.get(id))
      .filter(Boolean) as Judge[];
  }, [submission, judges]);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!submission) return null;

  const applicant = submission.applicantName || submission.applicant || 'Unknown applicant';
  const submittedOn = submission.submittedAt || submission.date;
  const formattedDate = submittedOn
    ? new Date(submittedOn).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  const statusClass = statusStyles[submission.status] || statusStyles.Pending;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Submission review: ${submission.title}`}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 34, stiffness: 380, mass: 0.9 }}
          className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-[#f4f6f8]"
        >
          {/* Sticky header */}
          <header className="shrink-0 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
                aria-label="Close submission review"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </button>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                    {submission.status}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {submission.category}
                  </span>
                </div>
                <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  {submission.title}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-slate-500 sm:text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {applicant}
                  </span>
                  {formattedDate && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {formattedDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="hidden shrink-0 lg:block">
                <p className="mb-2 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Assigned judges
                </p>
                {assignedJudges.length === 0 ? (
                  <p className="text-right text-xs text-slate-400">None assigned</p>
                ) : (
                  <div className="flex flex-wrap justify-end gap-2">
                    {assignedJudges.map((judge) => (
                      <span
                        key={judge.id}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-xs font-semibold text-slate-700 shadow-sm"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-[11px] font-bold text-white">
                          {judge.name?.charAt(0).toUpperCase() || 'J'}
                        </span>
                        {judge.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900 lg:hidden"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {assignedJudges.length > 0 && (
              <div className="border-t border-slate-100 px-4 py-3 lg:hidden">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Assigned judges
                </p>
                <div className="flex flex-wrap gap-2">
                  {assignedJudges.map((judge) => (
                    <span
                      key={judge.id}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                        {judge.name?.charAt(0).toUpperCase() || 'J'}
                      </span>
                      {judge.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </header>

          {/* Full-screen scrollable body */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
              <SubmissionFormResponses
                submission={submission}
                enabled={isOpen}
                variant="page"
                inputsOnly
                fallbackFormId={activeFormId || undefined}
              />
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
