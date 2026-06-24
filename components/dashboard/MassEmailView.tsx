/**
 * MassEmailView
 *
 * Admin tool for sending personalized bulk emails after each round.
 *
 * Workflow:
 *  1. Select a round from the program's round list
 *  2. See segment breakdown — winners / eliminated / still active
 *  3. Pick a segment (or "all")
 *  4. Compose subject + body with {{variable}} placeholders
 *  5. Preview the interpolated message for a sample recipient
 *  6. Send — shows per-recipient success/failure log
 *
 * All sends are logged to email_logs in the DB.
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Mail,
  Users,
  Trophy,
  XCircle,
  CheckCircle2,
  Send,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Program } from '../../services/models';
import { queryKeys } from '../../services/queryKeys';
import { sendMassEmail } from '../../services/email';
import { SkeletonLoader } from '../SkeletonLoader';
import {
  getEmailSegments,
  getRoundsForEmail,
  type EmailRecipient,
  type EmailSegmentData,
} from '../../services/massEmailApi';

// ── Types ─────────────────────────────────────────────────────────────────────

type SegmentKey = 'winners' | 'eliminated' | 'active' | 'all';

type Recipient = EmailRecipient;
type SegmentData = EmailSegmentData;

interface SendResult {
  email: string;
  ok: boolean;
  messageId?: string;
  error?: string;
}

// ── Template variable hint ────────────────────────────────────────────────────

const VARIABLES = [
  { key: '{{name}}', desc: "Recipient's name" },
  { key: '{{email}}', desc: "Recipient's email" },
  { key: '{{submission_title}}', desc: 'Submission title' },
  { key: '{{round_title}}', desc: 'Round name' },
  { key: '{{program_title}}', desc: 'Program name' },
  { key: '{{rank}}', desc: 'Position in the segment (1, 2, 3 …)' },
  { key: '{{total}}', desc: 'Total count in segment' },
  { key: '{{segment}}', desc: 'Segment label (winners / eliminated …)' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const SegmentCard: React.FC<{
  id: SegmentKey;
  label: string;
  count: number;
  icon: React.ReactNode;
  accent: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, count, icon, accent, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${
      selected
        ? 'border-indigo-500 bg-indigo-50'
        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
    }`}
  >
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent} [&>svg]:w-4 [&>svg]:h-4`}>
      {icon}
    </div>
    <div className="text-left">
      <p className={`text-sm font-bold ${selected ? 'text-indigo-700' : 'text-slate-800'}`}>{label}</p>
      <p className="text-xs text-slate-500">{count} recipient{count !== 1 ? 's' : ''}</p>
    </div>
    {selected && <CheckCircle2 className="w-4 h-4 text-indigo-500 ml-auto" />}
  </button>
);

function interpolatePreview(template: string, sample: Recipient, roundTitle: string, programTitle: string, idx: number, total: number, segment: string): string {
  const vars: Record<string, string> = {
    name: sample.applicantName,
    email: sample.applicantEmail || 'unknown@example.com',
    submission_title: sample.submissionTitle,
    round_title: roundTitle,
    program_title: programTitle,
    rank: String(idx + 1),
    total: String(total),
    segment,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ── Main Component ────────────────────────────────────────────────────────────

interface MassEmailViewProps {
  activeEvent?: Program | null;
}

export const MassEmailView: React.FC<MassEmailViewProps> = ({ activeEvent }) => {
  const programId = activeEvent?.id;

  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<SegmentKey>('winners');
  const [subject, setSubject] = useState('');
  const [template, setTemplate] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);
  const [showVarsHint, setShowVarsHint] = useState(false);

  // Fetch rounds list
  const { data: rounds = [], isLoading: roundsLoading } = useQuery({
    queryKey: queryKeys.rounds.all(programId ?? ''),
    queryFn: () => getRoundsForEmail(programId!),
    enabled: !!programId,
    staleTime: 60_000,
  });

  // Fetch segments when round is selected
  const {
    data: segmentsData,
    isLoading: segmentsLoading,
    error: segmentsError,
    refetch: refetchSegments,
  } = useQuery<SegmentData>({
    queryKey: queryKeys.massEmail.segments(programId ?? '', selectedRoundId),
    queryFn: () => getEmailSegments(programId!, selectedRoundId),
    enabled: !!programId && !!selectedRoundId,
    staleTime: 30_000,
  });

  const segments = segmentsData;

  // Determine recipients for selected segment
  const recipients: Recipient[] =
    segments
      ? selectedSegment === 'all'
        ? [
            ...segments.segments.winners,
            ...segments.segments.eliminated,
            ...segments.segments.active,
          ]
        : segments.segments[selectedSegment] || []
      : [];

  // Preview sample (first recipient)
  const previewRecipient = recipients[0] || null;

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: () =>
      sendMassEmail({
        programId: programId!,
        roundId: selectedRoundId,
        segment: selectedSegment,
        subject,
        template,
      }),
    onSuccess: (result: any) => {
      setSendResults(result?.results || []);
      toast.success(`Sent ${result?.sent || 0} emails · ${result?.failed || 0} failed`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to send emails');
    },
  });

  if (!activeEvent) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Select a program to send mass emails.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-600" />
          Mass Email
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Segment participants by round result and send personalized emails via Resend.
        </p>
      </div>

      {/* Step 1 — Round picker */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">1. Select a round</label>
        {roundsLoading ? (
          <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <select
            value={selectedRoundId}
            onChange={(e) => {
              setSelectedRoundId(e.target.value);
              setSendResults(null);
            }}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">— choose a round —</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.status})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Step 2 — Segment picker */}
      {selectedRoundId && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">2. Choose a segment</label>

          {segmentsLoading && <SkeletonLoader />}
          {segmentsError && (
            <div className="flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {(segmentsError as Error).message}
              <button onClick={() => refetchSegments()} className="ml-auto underline text-xs">Retry</button>
            </div>
          )}

          {segments && (
            <div className="flex gap-3 flex-wrap">
              <SegmentCard
                id="winners"
                label="Winners"
                count={segments.counts.winners}
                icon={<Trophy />}
                accent="bg-emerald-100 text-emerald-700"
                selected={selectedSegment === 'winners'}
                onClick={() => setSelectedSegment('winners')}
              />
              <SegmentCard
                id="eliminated"
                label="Eliminated"
                count={segments.counts.eliminated}
                icon={<XCircle />}
                accent="bg-red-100 text-red-600"
                selected={selectedSegment === 'eliminated'}
                onClick={() => setSelectedSegment('eliminated')}
              />
              <SegmentCard
                id="active"
                label="Still Active"
                count={segments.counts.active}
                icon={<Users />}
                accent="bg-blue-100 text-blue-700"
                selected={selectedSegment === 'active'}
                onClick={() => setSelectedSegment('active')}
              />
              <SegmentCard
                id="all"
                label="All"
                count={segments.counts.total}
                icon={<Mail />}
                accent="bg-slate-100 text-slate-600"
                selected={selectedSegment === 'all'}
                onClick={() => setSelectedSegment('all')}
              />
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Email composer */}
      {selectedRoundId && segments && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">3. Compose email</label>
            <button
              onClick={() => setShowVarsHint((v) => !v)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
            >
              <Info className="w-3.5 h-3.5" />
              Template variables
            </button>
          </div>

          {/* Variable hint */}
          {showVarsHint && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs space-y-1.5">
              <p className="font-semibold text-indigo-800 mb-2">Available placeholders</p>
              <div className="grid grid-cols-2 gap-1.5">
                {VARIABLES.map((v) => (
                  <div key={v.key} className="flex items-start gap-2">
                    <code className="text-indigo-700 font-mono bg-indigo-100 px-1 py-0.5 rounded text-xs shrink-0">
                      {v.key}
                    </code>
                    <span className="text-indigo-600">{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Subject — e.g. Congratulations {{name}}, you've advanced!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <textarea
              rows={8}
              placeholder={`Hi {{name}},\n\nCongratulations! You have qualified to Round {{round_title}} with submission "{{submission_title}}".\n\nYou are {{rank}} among {{total}} in the {{segment}} group.\n\nBest,\nThe Team`}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Preview toggle */}
          {previewRecipient && subject && template && (
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform ${showPreview ? 'rotate-90' : ''}`}
              />
              {showPreview ? 'Hide' : 'Show'} preview for{' '}
              <span className="font-semibold">{previewRecipient.applicantName}</span>
            </button>
          )}

          {showPreview && previewRecipient && segments && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email preview</p>
              <p className="text-sm font-bold text-slate-900">
                Subject:{' '}
                {interpolatePreview(
                  subject,
                  previewRecipient,
                  segments.round.title,
                  activeEvent.title,
                  0,
                  recipients.length,
                  selectedSegment,
                )}
              </p>
              <p className="text-xs text-slate-400">To: {previewRecipient.applicantEmail || '(no email)'}</p>
              <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mt-2">
                {interpolatePreview(
                  template,
                  previewRecipient,
                  segments.round.title,
                  activeEvent.title,
                  0,
                  recipients.length,
                  selectedSegment,
                )}
              </pre>
            </div>
          )}

          {/* Send button */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500">
              Will send to{' '}
              <span className="font-bold text-slate-800">{recipients.length}</span> recipient
              {recipients.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={
                !subject.trim() ||
                !template.trim() ||
                recipients.length === 0 ||
                sendMutation.isPending
              }
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sendMutation.isPending ? 'Sending…' : `Send to ${recipients.length}`}
            </button>
          </div>
        </div>
      )}

      {/* Send results log */}
      {sendResults && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Send log</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-600 font-semibold">
                ✓ {sendResults.filter((r) => r.ok).length} sent
              </span>
              <span className="text-red-600 font-semibold">
                ✗ {sendResults.filter((r) => !r.ok).length} failed
              </span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {sendResults.map((result, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                {result.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span className="flex-1 font-mono text-xs text-slate-700 truncate">{result.email}</span>
                {result.error && (
                  <span className="text-xs text-red-500 truncate max-w-48">{result.error}</span>
                )}
                {result.messageId && (
                  <span className="text-xs text-slate-400 font-mono truncate max-w-48">
                    {result.messageId}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
