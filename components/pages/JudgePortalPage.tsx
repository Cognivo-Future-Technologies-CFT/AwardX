import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Gavel,
  LinkIcon,
  ShieldCheck,
  Star,
  Target,
  Users,
} from 'lucide-react';
import { JudgeScoringModal } from '../dashboard/JudgeScoringModal';
import { Submission, JudgingCriterion } from '../../services/models';

interface JudgeInfo {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
}

interface ProgramInfo {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  status: string;
  deadline?: string;
  timezone?: string;
  industryCategory?: string;
}

interface AssignmentInfo {
  submissionJudgeId: string;
  status: string;
  completedAt?: string;
  submission: Submission | null;
}

export const JudgePortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { token: tokenParam } = useParams<{ token?: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [judge, setJudge] = useState<JudgeInfo | null>(null);
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([]);
  const [criteria, setCriteria] = useState<JudgingCriterion[]>([]);
  const [organization, setOrganization] = useState('');
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [selectedSubmissionJudgeId, setSelectedSubmissionJudgeId] = useState<string | undefined>();
  const [scoringOpen, setScoringOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = tokenParam || params.get('token');

        if (!token) {
          setStatus('error');
          setErrorMessage('No invite token found. Please check your email link.');
          return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(token)) {
          setStatus('error');
          setErrorMessage('Invalid invite link format.');
          return;
        }

        const resp = await fetch(`/api/invites/verify-judge?token=${encodeURIComponent(token)}`);
        const data = await resp.json();

        if (!resp.ok) {
          setStatus('error');
          setErrorMessage(data.error || 'Failed to verify invite.');
          return;
        }

        setJudge(data.judge);
        setProgram(data.program);
        setAssignments((data.assignments || []).filter((item: AssignmentInfo) => item.submission));
        setCriteria(data.criteria || []);
        setOrganization(data.organization || '');
        setStatus('success');
      } catch (err: any) {
        console.error('Judge portal error:', err);
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again or contact the organizer.');
      }
    };

    verifyToken();
  }, [tokenParam, lastRefresh]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((assignment) => assignment.status === 'completed').length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [assignments]);

  const openScoring = (assignment: AssignmentInfo) => {
    if (!assignment.submission) return;
    setSelectedSubmission(assignment.submission);
    setSelectedSubmissionJudgeId(assignment.submissionJudgeId);
    setScoringOpen(true);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Verifying your invite...</h2>
          <p className="text-slate-500">Please wait while we set up your judging portal.</p>
        </motion.div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Unable to open judging portal</h2>
          <p className="text-slate-600 mb-6">{errorMessage}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Go to Homepage
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <JudgeScoringModal
        isOpen={scoringOpen}
        onClose={() => {
          setScoringOpen(false);
          setSelectedSubmission(null);
          setSelectedSubmissionJudgeId(undefined);
        }}
        submission={selectedSubmission}
        criteria={criteria}
        submissionJudgeId={selectedSubmissionJudgeId}
        isJudgeView={true}
        onScored={() => {
          // Refresh assignments from server to get updated status
          setLastRefresh(Date.now());
          // Also update local state optimistically for immediate UI feedback
          setAssignments((prev) =>
            prev.map((assignment) =>
              assignment.submissionJudgeId === selectedSubmissionJudgeId
                ? { ...assignment, status: 'completed', completedAt: new Date().toISOString() }
                : assignment,
            ),
          );
        }}
      />

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-200">
              <Gavel className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Judging Portal</h1>
              {organization && <p className="text-xs text-slate-500">{organization}</p>}
            </div>
          </div>
          {judge && (
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
                {judge.name?.charAt(0).toUpperCase() || 'J'}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-slate-900">{judge.name}</div>
                <div className="text-[11px] text-slate-500">{stats.pending} pending</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >
          {program?.coverImageUrl ? (
            <div className="relative h-48">
              <img src={program.coverImageUrl} alt={program.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/20 to-transparent" />
            </div>
          ) : (
            <div className="relative flex h-40 items-center justify-center bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600">
              <Award className="h-16 w-16 text-white/25" />
            </div>
          )}
          <div className="p-6 md:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700">
                {program?.industryCategory || 'Award Program'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
                {program?.status || 'Active'}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
                {stats.completed}/{stats.total} completed
              </span>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-900 md:text-3xl">{program?.title}</h2>
            {program?.description && <p className="mb-4 max-w-3xl text-slate-600">{program.description}</p>}
            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              {program?.deadline && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Deadline: {formatDate(program.deadline)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span>{stats.total} assigned submission{stats.total !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span>{criteria.length} scoring criteria</span>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-lg shadow-indigo-200"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Target className="h-3.5 w-3.5" /> Focused scoring
              </div>
              <h3 className="text-xl font-bold">Welcome, {judge?.name}.</h3>
              <p className="mt-1 max-w-2xl text-sm text-indigo-100">
                Review your assigned submissions, score them against the official criteria, and save your progress as you go.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-white/95">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/70">Assigned</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-2xl font-bold">{stats.completed}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/70">Done</div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <div className="text-2xl font-bold">{stats.pending}</div>
                <div className="text-[11px] uppercase tracking-wider text-white/70">Pending</div>
              </div>
            </div>
          </div>
        </motion.section>

        {criteria.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Star className="h-5 w-5 text-indigo-600" /> Scoring Criteria
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {criteria.map((criterion) => (
                <div key={criterion.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-slate-900">{criterion.name}</h4>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                      {criterion.weight}%
                    </span>
                  </div>
                  {criterion.description && <p className="text-sm text-slate-500">{criterion.description}</p>}
                  <p className="mt-2 text-xs text-slate-500">Score range: {criterion.minScore} – {criterion.maxScore}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Users className="h-5 w-5 text-emerald-600" /> Assigned Submissions
            </h3>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              {stats.completed} scored · {stats.pending} remaining
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h4 className="mb-2 text-lg font-semibold text-slate-700">No assigned submissions yet</h4>
              <p className="text-slate-500">The organizer hasn't assigned any entries to your judging panel yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {assignments.map((assignment, idx) => {
                const submission = assignment.submission;
                if (!submission) return null;
                const completed = assignment.status === 'completed';
                return (
                  <motion.article
                    key={assignment.submissionJudgeId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + idx * 0.04 }}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex items-start justify-between gap-4 p-5">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                              #{idx + 1}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              {submission.category}
                            </span>
                            <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                              {completed ? 'Scored' : 'Pending'}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900">{submission.title}</h4>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            {submission.applicantName && <span>by {submission.applicantName}</span>}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDate(submission.submittedAt)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id)}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          aria-label={expandedSubmission === submission.id ? 'Collapse details' : 'Expand details'}
                        >
                          {expandedSubmission === submission.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                      </div>

                      <div className="px-5 pb-5">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-2 rounded-full ${completed ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: completed ? '100%' : `${Math.min(35 + idx * 12, 85)}%` }}
                          />
                        </div>
                      </div>

                      {expandedSubmission === submission.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="border-t border-slate-100 px-5 pb-5"
                        >
                          <div className="space-y-4 pt-4">
                            {submission.coverImageUrl && (
                              <img
                                src={submission.coverImageUrl}
                                alt={submission.title}
                                className="h-56 w-full rounded-2xl object-cover"
                              />
                            )}
                            {submission.description && (
                              <div>
                                <h5 className="mb-1 text-sm font-semibold text-slate-700">Description</h5>
                                <p className="text-sm leading-relaxed text-slate-600">{submission.description}</p>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openScoring(assignment)}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                              >
                                <Star className="h-4 w-4" /> {completed ? 'Review score' : 'Score entry'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedSubmission(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                Collapse
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </motion.section>

        <div className="mt-12 pb-8 text-center text-sm text-slate-500">
          Powered by <strong className="text-slate-700">AwardX</strong> · Questions? Contact the program organizer.
        </div>
      </main>
    </div>
  );
};
