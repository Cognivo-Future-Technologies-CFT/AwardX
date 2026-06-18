import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Gavel,
  Filter,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Layers,
  ClipboardList,
} from 'lucide-react';
import { JudgeScoringModal } from '../dashboard/JudgeScoringModal';
import { Logo } from '../Logo';
import { Submission, JudgingCriterion } from '../../services/models';
import { formatRoundTypeLabel } from '../../lib/roundScheduleUtils';
import { fireCelebrationConfetti } from '../../lib/confetti';
import { useAuth } from '../../contexts/AuthContext';

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
  round?: { id: string; name: string; type: string; status: string } | null;
  submission: Submission | null;
}

export const JudgePortalPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
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
  // Task 15: track deleted submissions count for banner
  const [deletedCount, setDeletedCount] = useState(0);
  // Resolved token stored so fetchAssignments can use it without re-verifying
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);

  const [requiresAcceptance, setRequiresAcceptance] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const confettiFiredRef = useRef(false);

  // Task 14: separate function that only re-fetches assignments/criteria (no token re-verify)
  const fetchAssignments = useMemo(() => async (token: string) => {
    const resp = await fetch(`/api/invites/verify-judge?token=${encodeURIComponent(token)}`);
    const data = await resp.json();
    if (!resp.ok) return;
    const allAssignments: AssignmentInfo[] = data.assignments || [];
    const valid = allAssignments.filter((item) => item.submission);
    const removed = allAssignments.length - valid.length;
    setDeletedCount(removed);
    setAssignments(valid);
    setCriteria(data.criteria || []);
  }, []);

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

        if (data.requiresAcceptance) {
          setJudge(data.judge);
          setProgram(data.program);
          setOrganization(data.organization || '');
          setResolvedToken(token);
          setRequiresAcceptance(true);
          setStatus('success');
          return;
        }

        setJudge(data.judge);
        setProgram(data.program);
        const allAssignments: AssignmentInfo[] = data.assignments || [];
        const valid = allAssignments.filter((item: AssignmentInfo) => item.submission);
        // Task 15: track silently-filtered (deleted) submissions
        setDeletedCount(allAssignments.length - valid.length);
        setAssignments(valid);
        setCriteria(data.criteria || []);
        setOrganization(data.organization || '');
        setResolvedToken(token);
        setStatus('success');
      } catch (err: any) {
        console.error('Judge portal error:', err);
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again or contact the organizer.');
      }
    };

    verifyToken();
  }, [tokenParam]);

  const acceptInvite = async () => {
    const params = new URLSearchParams(window.location.search);
    const token = tokenParam || params.get('token');
    if (!token) return;

    setAccepting(true);
    try {
      const resp = await fetch('/api/invites/verify-judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'accept' }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to accept invite.');
        return;
      }

      setRequiresAcceptance(false);
      const allAssignments: AssignmentInfo[] = data.assignments || [];
      const valid = allAssignments.filter((item) => item.submission);
      setDeletedCount(allAssignments.length - valid.length);
      setAssignments(valid);
      setCriteria(data.criteria || []);
    } catch (err) {
      console.error('Accept error:', err);
      setStatus('error');
      setErrorMessage('Failed to accept invite.');
    } finally {
      setAccepting(false);
    }
  };

  const declineInvite = async () => {
    const params = new URLSearchParams(window.location.search);
    const token = tokenParam || params.get('token');
    if (!token) return;

    setDeclining(true);
    try {
      const resp = await fetch('/api/invites/verify-judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'decline' }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setStatus('error');
        setErrorMessage(data.error || 'Failed to decline invite.');
        return;
      }

      setDeclined(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      console.error('Decline error:', err);
      setStatus('error');
      setErrorMessage('Failed to decline invite.');
    } finally {
      setDeclining(false);
    }
  };

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
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, progressPercent };
  }, [assignments]);

  const allScoringComplete = stats.total > 0 && stats.completed === stats.total;

  useEffect(() => {
    if (allScoringComplete && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      fireCelebrationConfetti();
    }
  }, [allScoringComplete]);

  const filteredAssignments = useMemo(() => {
    if (assignmentFilter === 'all') return assignments;
    if (assignmentFilter === 'completed') {
      return assignments.filter((a) => a.status === 'completed');
    }
    return assignments.filter((a) => a.status !== 'completed');
  }, [assignments, assignmentFilter]);

  const assignmentsByRound = useMemo(() => {
    const groups = new Map<string, {
      round: AssignmentInfo['round'];
      items: AssignmentInfo[];
    }>();

    for (const assignment of filteredAssignments) {
      const roundKey = assignment.round?.id || '__general__';
      if (!groups.has(roundKey)) {
        groups.set(roundKey, {
          round: assignment.round || null,
          items: [],
        });
      }
      groups.get(roundKey)!.items.push(assignment);
    }

    return Array.from(groups.values()).sort((a, b) => {
      const aName = a.round?.name || 'General Assignments';
      const bName = b.round?.name || 'General Assignments';
      return aName.localeCompare(bName);
    });
  }, [filteredAssignments]);

  const openScoring = (assignment: AssignmentInfo) => {
    if (!assignment.submission) return;
    setSelectedSubmission(assignment.submission);
    setSelectedSubmissionJudgeId(assignment.submissionJudgeId);
    setScoringOpen(true);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 mb-2">Verifying your invite…</h2>
          <p className="text-slate-500">Please wait while we set up your judging portal.</p>
        </motion.div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12 max-w-md w-full text-center"
        >
          <div className="w-14 h-14 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-7 h-7 text-rose-600" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-3">Unable to open judging portal</h2>
          <p className="text-slate-500 mb-6">{errorMessage}</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-semibold text-sm"
          >
            Go to Homepage
          </button>
        </motion.div>
      </div>
    );
  }

  if (declined) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4 font-sans text-slate-900">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12 max-w-md w-full text-center"
        >
          <div className="w-14 h-14 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-7 h-7 text-rose-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-3">Invitation Declined</h2>
          <p className="text-slate-500 mb-6">You have declined the invitation to judge this program. Redirecting...</p>
        </motion.div>
      </div>
    );
  }

  if (requiresAcceptance) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-4 font-sans text-slate-900">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12 max-w-lg w-full"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
              <Gavel className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Judge Invitation</h2>
              <p className="text-sm text-slate-500">{organization || 'Judging Portal'}</p>
            </div>
          </div>

          <p className="text-slate-600 mb-6 leading-relaxed">
            Hello <span className="font-semibold text-slate-900">{judge?.name || 'Judge'}</span>, you have been invited to serve as a judge for the award program:
            <span className="block mt-2 font-semibold text-emerald-700 text-lg">{program?.title || 'Award Program'}</span>
          </p>

          {program?.description && (
            <p className="text-sm text-slate-500 mb-6 bg-slate-50 border border-slate-150 rounded-lg p-4 italic">
              "{program.description}"
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={acceptInvite}
              disabled={accepting || declining}
              className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors inline-flex items-center gap-2"
            >
              {accepting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Accept Invitation
            </button>
            <button
              onClick={declineInvite}
              disabled={accepting || declining}
              className="px-6 py-3 border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-50 disabled:opacity-60 transition-colors inline-flex items-center gap-2"
            >
              {declining ? <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : null}
              Decline
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf9] font-sans text-slate-900">
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
        judgeToken={resolvedToken || undefined}
        onScored={() => {
          setAssignments((prev) =>
            prev.map((assignment) =>
              assignment.submissionJudgeId === selectedSubmissionJudgeId
                ? { ...assignment, status: 'completed', completedAt: new Date().toISOString() }
                : assignment,
            ),
          );
          if (resolvedToken) fetchAssignments(resolvedToken);
        }}
      />

      <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isAuthenticated ? 'Back to dashboard' : 'Back to home'}
              </span>
            </button>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <Logo size="lg" className="hidden sm:flex" />
            <div>
              <p className="text-[11px] text-slate-500 -mt-0.5">
                {organization ? `${organization} · Judging Portal` : 'Judging Portal'}
              </p>
            </div>
          </div>
          {judge && (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                <Clock className="w-3 h-3" /> {stats.pending} pending
              </span>
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                {judge.avatarUrl ? (
                  <img src={judge.avatarUrl} alt="" className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full border-2 border-white shadow-sm bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    {judge.name?.charAt(0).toUpperCase() || 'J'}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-sm font-bold text-slate-900">{judge.name}</div>
                  <div className="text-xs text-slate-500">Judge</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_320px]">
          <div className="min-w-0">
        {/* Program header card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          {program?.coverImageUrl ? (
            <div className="relative h-44">
              <img
                src={program.coverImageUrl}
                alt={program.title}
                className="h-full w-full object-cover"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
            </div>
          ) : (
            <div className="relative flex h-36 items-center justify-center bg-emerald-50/60 border-b border-emerald-100">
              <Award className="h-14 w-14 text-emerald-600/40" />
            </div>
          )}
          <div className="p-6 md:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                {program?.industryCategory || 'Award Program'}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 bg-slate-50 text-slate-600">
                {program?.status || 'Active'}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {stats.completed}/{stats.total} completed
              </span>
            </div>
            <h2 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900">{program?.title}</h2>
            {program?.description && (
              <p className="mb-4 max-w-3xl text-slate-500">{program.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              {program?.deadline && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Deadline: {formatDate(program.deadline)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-slate-400" />
                <span>{stats.total} assigned submission{stats.total !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span>{criteria.length} scoring criteria</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Stat cards with overall progress */}
        <div className="mb-8 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Your scoring progress</p>
                <p className="text-xs text-slate-500">
                  {stats.completed} of {stats.total} entries scored
                </p>
              </div>
              <span className="text-2xl font-bold text-emerald-600">{stats.progressPercent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${stats.progressPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Assigned</p>
                <ClipboardList className="w-4 h-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-emerald-700">Scored</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-700">{stats.completed}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-700">Pending</p>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-amber-700">{stats.pending}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Criteria</p>
                <Target className="w-4 h-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{criteria.length}</p>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {allScoringComplete && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 flex items-center gap-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-900">All scoring complete!</h3>
                <p className="text-sm text-emerald-700">
                  Thank you for reviewing every assigned entry. Your scores have been submitted.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome strip */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 rounded-xl border border-emerald-200 bg-white p-5 md:p-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                  Welcome, {judge?.name}.
                </h3>
                <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
                  Review your assigned submissions, score them against the official criteria, and save your progress as you go.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Criteria */}
        {criteria.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-8 rounded-xl border border-slate-200 bg-white p-6"
          >
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
              <Star className="h-5 w-5 text-emerald-600" /> Scoring Criteria
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {criteria.map((criterion) => (
                <div key={criterion.id} className="rounded-xl border border-slate-200 bg-[#f8faf9] p-4">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <h4 className="font-semibold text-slate-900">{criterion.name}</h4>
                    <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
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

        {/* Assignments */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
                <ListChecks className="h-5 w-5 text-emerald-600" /> Assigned Submissions
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Review and score each shortlisting entry below
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                {([
                  { key: 'all' as const, label: 'All', count: stats.total },
                  { key: 'pending' as const, label: 'Pending', count: stats.pending },
                  { key: 'completed' as const, label: 'Scored', count: stats.completed },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setAssignmentFilter(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      assignmentFilter === tab.key
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Filter className="h-3 w-3" />
                    {tab.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      assignmentFilter === tab.key ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {deletedCount > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {deletedCount} submission{deletedCount > 1 ? 's' : ''} previously assigned to you {deletedCount > 1 ? 'are' : 'is'} no longer available.
            </div>
          )}

          {assignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-white text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">No assigned submissions yet</h4>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                The organizer hasn't assigned any entries to your judging panel yet.
              </p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Filter className="mx-auto mb-3 h-8 w-8 text-slate-400" />
              <h4 className="text-lg font-semibold text-slate-900 mb-1">No {assignmentFilter} entries</h4>
              <p className="text-sm text-slate-500">Try switching filters to see other submissions.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {assignmentsByRound.map((group, groupIdx) => {
                const roundTitle = group.round?.name || 'General Assignments';
                const roundCompleted = group.items.filter((item) => item.status === 'completed').length;
                const roundProgress = group.items.length > 0
                  ? Math.round((roundCompleted / group.items.length) * 100)
                  : 0;
                const roundTypeLabel = formatRoundTypeLabel(group.round?.type);

                return (
                  <section
                    key={group.round?.id || `general-${groupIdx}`}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-base font-bold text-slate-900">{roundTitle}</h4>
                          <span className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            {roundTypeLabel}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 flex-1 max-w-xs overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${roundProgress}%` }}
                            />
                          </div>
                          <p className="text-xs font-medium text-slate-500">
                            {roundCompleted}/{group.items.length} scored
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
                      {group.items.map((assignment, idx) => {
                        const submission = assignment.submission;
                        if (!submission) return null;
                        const completed = assignment.status === 'completed';
                        return (
                          <motion.article
                            key={assignment.submissionJudgeId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + idx * 0.04 }}
                            whileHover={{ y: -2 }}
                            className={`overflow-hidden rounded-xl border bg-white transition-all hover:shadow-md ${
                              completed
                                ? 'border-emerald-200 hover:border-emerald-300'
                                : 'border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex h-full flex-col">
                              {submission.coverImageUrl && (
                                <div className="relative h-32 overflow-hidden border-b border-slate-100">
                                  <img
                                    src={submission.coverImageUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                                </div>
                              )}
                              <div className="flex items-start justify-between gap-4 p-5">
                                <div className="min-w-0 flex-1">
                                  <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                      #{idx + 1}
                                    </span>
                                    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                      {submission.category}
                                    </span>
                                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                                      completed
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-amber-200 bg-amber-50 text-amber-700'
                                    }`}>
                                      {completed ? (
                                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Scored</>
                                      ) : (
                                        <><Clock className="w-3 h-3 mr-1" /> Pending</>
                                      )}
                                    </span>
                                  </div>
                                  <h4 className="text-lg font-semibold tracking-tight text-slate-900">{submission.title}</h4>
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
                                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                                  aria-label={expandedSubmission === submission.id ? 'Collapse details' : 'Expand details'}
                                >
                                  {expandedSubmission === submission.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </button>
                              </div>

                              <div className="mt-auto border-t border-slate-100 px-5 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openScoring(assignment)}
                                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                                      completed
                                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    }`}
                                  >
                                    <Star className="h-4 w-4" />
                                    {completed ? 'Review score' : 'Score entry'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedSubmission(expandedSubmission === submission.id ? null : submission.id)}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                                    aria-label={expandedSubmission === submission.id ? 'Collapse details' : 'Expand details'}
                                  >
                                    {expandedSubmission === submission.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                  </button>
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
                                        className="h-56 w-full rounded-xl border border-slate-200 object-cover"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                      />
                                    )}
                                    {submission.description && (
                                      <div>
                                        <h5 className="mb-1 text-sm font-semibold text-slate-700">Description</h5>
                                        <p className="text-sm leading-relaxed text-slate-600">{submission.description}</p>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setExpandedSubmission(null)}
                                      className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300"
                                    >
                                      Collapse
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </motion.article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </motion.section>

          </div>

          <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                How shortlisting works
              </h3>
              <ol className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">1</span>
                  Open each assigned entry and review the submission details.
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">2</span>
                  Score against every criterion using the official rubric.
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">3</span>
                  Save your score — you can return anytime to revise before the deadline.
                </li>
              </ol>
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-indigo-900">
                <HelpCircle className="h-4 w-4" />
                Scoring tips
              </h3>
              <ul className="space-y-2 text-sm text-indigo-800/80">
                <li>• Score each criterion independently before forming an overall impression.</li>
                <li>• Use the full score range — avoid clustering all entries at the same score.</li>
                <li>• Add notes in the scoring modal to justify your evaluation.</li>
              </ul>
            </section>

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
              >
                <LayoutDashboard className="h-4 w-4" />
                Go to organizer dashboard
              </button>
            )}

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="mb-2 text-sm font-bold text-slate-900">Program snapshot</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Entries assigned</dt>
                  <dd className="font-semibold text-slate-900">{stats.total}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Criteria</dt>
                  <dd className="font-semibold text-slate-900">{criteria.length}</dd>
                </div>
                {program?.deadline && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Deadline</dt>
                    <dd className="font-semibold text-slate-900">{formatDate(program.deadline)}</dd>
                  </div>
                )}
              </dl>
            </section>
          </aside>
        </div>

        <div className="mt-12 pb-8 text-center text-sm text-slate-500">
          Powered by <Logo size="xs" className="inline-flex align-middle mx-1" /> · Questions? Contact the program organizer.
        </div>
      </main>
    </div>
  );
};
