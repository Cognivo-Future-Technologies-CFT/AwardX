import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Gavel, Clock, AlertTriangle, CheckCircle2, Star, FileText, Calendar, Award, ChevronDown, ChevronUp, LinkIcon } from 'lucide-react';

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

interface SubmissionInfo {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  status: string;
  category: string;
  submittedAt: string;
  applicantName?: string;
  voteCount?: number;
}

interface CriterionInfo {
  id: string;
  name: string;
  description?: string;
  weight: number;
  minScore: number;
  maxScore: number;
}

interface JudgePortalPageProps {
  onNavigate?: (page: string) => void;
}

export const JudgePortalPage: React.FC<JudgePortalPageProps> = ({ onNavigate }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'expired' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [judge, setJudge] = useState<JudgeInfo | null>(null);
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionInfo[]>([]);
  const [criteria, setCriteria] = useState<CriterionInfo[]>([]);
  const [organization, setOrganization] = useState('');
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
          setStatus('error');
          setErrorMessage('No invite token found. Please check your email link.');
          return;
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(token)) {
          setStatus('error');
          setErrorMessage('Invalid invite link format.');
          return;
        }

        const resp = await fetch(`/api/invites/verify-judge?token=${encodeURIComponent(token)}`);
        const data = await resp.json();

        if (!resp.ok) {
          if (resp.status === 410 || data.expired) {
            setStatus('expired');
            setErrorMessage(data.error || 'This invite link has already been used.');
          } else {
            setStatus('error');
            setErrorMessage(data.error || 'Failed to verify invite.');
          }
          return;
        }

        setJudge(data.judge);
        setProgram(data.program);
        setSubmissions(data.submissions || []);
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
  }, []);

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

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Verifying your invite...</h2>
          <p className="text-slate-500">Please wait while we set up your judging portal.</p>
        </motion.div>
      </div>
    );
  }

  // Expired link
  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <LinkIcon className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Link Already Used</h2>
          <p className="text-slate-600 mb-6">{errorMessage}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <p className="text-sm text-amber-800">
              <strong>Need access again?</strong> Contact the program organizer to request a new invite link.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
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
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Invalid Invite Link</h2>
          <p className="text-slate-600 mb-6">{errorMessage}</p>
          <button
            onClick={() => onNavigate?.('home')}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Go to Homepage
          </button>
        </motion.div>
      </div>
    );
  }

  // Success - Judge Portal
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Judging Portal</h1>
              {organization && <p className="text-xs text-slate-500">{organization}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {judge && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                  {judge.name?.charAt(0).toUpperCase() || 'J'}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block">{judge.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome & Program Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {program?.coverImageUrl && (
              <div className="h-48 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
                <img
                  src={program.coverImageUrl}
                  alt={program.title}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
            )}
            {!program?.coverImageUrl && (
              <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Award className="w-16 h-16 text-white/30" />
                </div>
              </div>
            )}
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  {program?.industryCategory || 'Award Program'}
                </span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                  program?.status === 'active' ? 'bg-green-100 text-green-700' :
                  program?.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {program?.status || 'Active'}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{program?.title}</h2>
              {program?.description && (
                <p className="text-slate-600 mb-4 max-w-3xl">{program.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                {program?.deadline && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Deadline: {formatDate(program.deadline)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>{submissions.length} shortlisted submission{submissions.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4" />
                  <span>{criteria.length} scoring criteri{criteria.length !== 1 ? 'a' : 'on'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Welcome message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-indigo-600 text-white rounded-2xl p-6 md:p-8 mb-8 shadow-lg shadow-indigo-200"
        >
          <h3 className="text-xl font-bold mb-2">Welcome, {judge?.name}!</h3>
          <p className="text-indigo-100">
            Thank you for accepting the invitation to judge. Below you'll find the shortlisted submissions for your review.
            {criteria.length > 0 && ` Each submission should be scored on ${criteria.length} criteri${criteria.length !== 1 ? 'a' : 'on'}.`}
          </p>
        </motion.div>

        {/* Scoring Criteria */}
        {criteria.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 mb-8"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-600" />
              Scoring Criteria
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criteria.map((c) => (
                <div key={c.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-slate-900">{c.name}</h4>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">{c.weight}%</span>
                  </div>
                  {c.description && <p className="text-sm text-slate-500 mb-2">{c.description}</p>}
                  <p className="text-xs text-slate-400">Score range: {c.minScore} - {c.maxScore}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Shortlisted Submissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Shortlisted Submissions ({submissions.length})
            </h3>
          </div>

          {submissions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-700 mb-2">No Shortlisted Submissions Yet</h4>
              <p className="text-slate-500">The organizer hasn't shortlisted any submissions for review yet. Please check back later.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub, idx) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + idx * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div
                    className="p-6 cursor-pointer"
                    onClick={() => setExpandedSubmission(expandedSubmission === sub.id ? null : sub.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                            #{idx + 1}
                          </span>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            {sub.category}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 mb-1">{sub.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          {sub.applicantName && <span>by {sub.applicantName}</span>}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(sub.submittedAt)}
                          </span>
                        </div>
                      </div>
                      <button className="p-2 text-slate-400 hover:text-slate-600">
                        {expandedSubmission === sub.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedSubmission === sub.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-slate-100 px-6 pb-6"
                    >
                      <div className="pt-4">
                        {sub.coverImageUrl && (
                          <img
                            src={sub.coverImageUrl}
                            alt={sub.title}
                            className="w-full h-48 object-cover rounded-xl mb-4"
                          />
                        )}
                        {sub.description && (
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-slate-700 mb-1">Description</h5>
                            <p className="text-sm text-slate-600 leading-relaxed">{sub.description}</p>
                          </div>
                        )}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <p className="text-sm text-slate-500 text-center">
                            Scoring interface will be available when the judging round starts.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Footer note */}
        <div className="mt-12 text-center pb-8">
          <p className="text-sm text-slate-400">
            Powered by <strong className="text-slate-500">AwardX</strong> &middot; Questions? Contact the program organizer.
          </p>
        </div>
      </main>
    </div>
  );
};
