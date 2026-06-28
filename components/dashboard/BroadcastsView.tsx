import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Mail,
  Send,
  History,
  LayoutTemplate,
  Info,
  Users,
  Search,
  Eye,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Monitor,
  Smartphone,
  RefreshCw,
  Save,
  Plus,
} from 'lucide-react';
import { Program } from '../../services/models';
import { queryKeys } from '../../services/queryKeys';
import { fetchBroadcastHistory, sendCustomBroadcast, BroadcastLog } from '../../services/broadcastApi';
import {
  getEmailSegments,
  getRoundsForEmail,
  type EmailRecipient,
  type EmailSegmentData,
} from '../../services/massEmailApi';
import { SkeletonLoader } from '../SkeletonLoader';
import { Modal } from '../Modal';
import { supabase, getCurrentOrgId } from '../../services/supabase';

// ── Types & Constants ─────────────────────────────────────────────────────────

type TabKey = 'history' | 'templates' | 'new-broadcast';
type PreviewDevice = 'desktop' | 'mobile';
type RecipientMode = 'segment' | 'judges' | 'members' | 'all_people' | 'manual';

interface Round {
  id: string;
  title: string;
  status: string;
}

type Recipient = EmailRecipient;
type SegmentData = EmailSegmentData;

const TEMPLATE_PRESETS = [
  {
    id: 'progression_advanced',
    name: 'Progression - Advanced',
    description: 'Congratulate participants who have advanced to the next round.',
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    subject: "Congratulations {{name}}! You've advanced in {{program_title}}",
    body: `Dear {{name}},

We are thrilled to inform you that your submission "{{submission_title}}" has successfully advanced in the judging process for {{program_title}}!

Our evaluation panel was highly impressed by your submission. We will share further details shortly about the next steps and upcoming rounds.

Congratulations again on this achievement!`,
  },
  {
    id: 'progression_eliminated',
    name: 'Progression - Completed',
    description: 'Politely notify participants who did not advance.',
    gradient: 'linear-gradient(135deg, #64748b, #475569)',
    subject: 'Update on your application: {{program_title}}',
    body: `Dear {{name}},

Thank you for submitting your application "{{submission_title}}" to {{program_title}}.

After careful consideration by our review panel, we regret to inform you that your submission was not selected to advance to the next round.

We received an exceptionally high volume of quality submissions this year, and selecting only a limited number to advance was a difficult decision. We want to thank you for your time, effort, and for sharing your work with us.

We wish you the very best in your future endeavors.`,
  },
  {
    id: 'progression_active',
    name: 'Progression - Under Review',
    description: 'Provide an update to participants currently active in a round.',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    subject: 'Review in progress: {{program_title}}',
    body: `Dear {{name}},

This is a quick update regarding your submission "{{submission_title}}" for {{program_title}}.

Your application is currently active and under review. Our evaluation team is carefully assessing all entries, and we expect to share the progression results soon.

You do not need to take any action at this time. We will reach out as soon as the results are finalized.`,
  },
  {
    id: 'custom_announcement',
    name: 'General Announcement',
    description: 'A standard newsletter layout for announcements.',
    gradient: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    subject: 'Announcement regarding {{program_title}}',
    body: `Dear {{name}},

We would like to share an important announcement regarding {{program_title}}.

[Your custom announcement details here]

If you have any questions or require support, please reply directly to this email.`,
  },
];

const GRADIENTS = [
  { name: 'Sunset Indigo', value: 'linear-gradient(135deg, #6366f1, #7c3aed)' },
  { name: 'Emerald Wave', value: 'linear-gradient(135deg, #059669, #10b981)' },
  { name: 'Midnight Slate', value: 'linear-gradient(135deg, #475569, #1e293b)' },
  { name: 'Golden Amber', value: 'linear-gradient(135deg, #d97706, #f59e0b)' },
  { name: 'Royal Blue', value: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' },
];

const VARIABLES = [
  { key: '{{name}}', label: 'Recipient Name', desc: "Recipient's name" },
  { key: '{{email}}', label: 'Recipient Email', desc: "Recipient's email" },
  { key: '{{submission_title}}', label: 'Submission Title', desc: 'Submission title' },
  { key: '{{program_title}}', label: 'Program Name', desc: 'Program name' },
];

// ── Main Component ────────────────────────────────────────────────────────────

interface BroadcastsViewProps {
  activeEvent?: Program | null;
}

export const BroadcastsView: React.FC<BroadcastsViewProps> = ({ activeEvent }) => {
  const programId = activeEvent?.id;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('history');
  const [selectedLog, setSelectedLog] = useState<BroadcastLog | null>(null);

  // Form States
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('segment');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<'winners' | 'eliminated' | 'active' | 'all'>('winners');
  const [manualEmails, setManualEmails] = useState<string>('');
  
  const [subject, setSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [fromName, setFromName] = useState('Organizer');
  const [headerGradient, setHeaderGradient] = useState('linear-gradient(135deg, #6366f1, #7c3aed)');
  
  // UI States
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load draft from localStorage on program change
  React.useEffect(() => {
    if (!programId) return;
    const saved = localStorage.getItem(`broadcast_draft_${programId}`);
    if (saved) {
      try {
        const { subject, templateBody, fromName, headerGradient } = JSON.parse(saved);
        setSubject(subject || '');
        setTemplateBody(templateBody || '');
        setFromName(fromName || 'Organizer');
        setHeaderGradient(headerGradient || 'linear-gradient(135deg, #6366f1, #7c3aed)');
      } catch (e) {
        console.error('Error loading draft', e);
      }
    } else {
      // Clean up fields if no draft exists
      setSubject('');
      setTemplateBody('');
      setFromName('Organizer');
      setHeaderGradient('linear-gradient(135deg, #6366f1, #7c3aed)');
    }
  }, [programId]);

  const handleSaveDraft = () => {
    if (!programId) return;
    const draft = {
      subject,
      templateBody,
      fromName,
      headerGradient,
    };
    localStorage.setItem(`broadcast_draft_${programId}`, JSON.stringify(draft));
    toast.success('Draft saved successfully!');
  };

  const handleNewBroadcast = () => {
    if (subject.trim() || templateBody.trim()) {
      if (!window.confirm('Are you sure you want to discard the current draft and start a new broadcast?')) {
        return;
      }
    }
    setSubject('');
    setTemplateBody('');
    setFromName('Organizer');
    setHeaderGradient('linear-gradient(135deg, #6366f1, #7c3aed)');
    setManualEmails('');
    setSelectedRoundId('');
    setSelectedSegment('winners');
    setRecipientMode('segment');
    if (programId) {
      localStorage.removeItem(`broadcast_draft_${programId}`);
    }
    toast.success('Form cleared. Ready for a new broadcast!');
  };

  // React Query Queries
  const { data: historyData, isLoading: historyLoading, isFetching: historyFetching, refetch: refetchHistory } = useQuery({
    queryKey: ['broadcast-history', programId],
    queryFn: () => fetchBroadcastHistory(programId!),
    enabled: !!programId,
  });

  const { data: rounds = [], isLoading: roundsLoading } = useQuery({
    queryKey: queryKeys.rounds.all(programId ?? ''),
    queryFn: () => getRoundsForEmail(programId!),
    enabled: !!programId && activeTab === 'new-broadcast' && recipientMode === 'segment',
  });

  const { data: segments, isLoading: segmentsLoading } = useQuery({
    queryKey: queryKeys.massEmail.segments(programId ?? '', selectedRoundId),
    queryFn: () => getEmailSegments(programId!, selectedRoundId),
    enabled: !!programId && activeTab === 'new-broadcast' && recipientMode === 'segment' && !!selectedRoundId,
  });

  const { data: judgesList } = useQuery({
    queryKey: ['broadcast-judges', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('judges')
        .select('name, email')
        .eq('program_id', programId!);
      if (error) throw error;
      return (data || []).map((j) => ({
        email: j.email,
        name: j.name,
        submissionTitle: 'Event Judge',
      })).filter((j) => !!j.email);
    },
    enabled: !!programId && activeTab === 'new-broadcast' && (recipientMode === 'judges' || recipientMode === 'all_people'),
  });

  const { data: membersList } = useQuery({
    queryKey: ['broadcast-members', programId],
    queryFn: async () => {
      const orgId = await getCurrentOrgId();
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          profiles:user_id ( full_name, email )
        `)
        .eq('organization_id', orgId)
        .eq('status', 'active');
      if (error) throw error;
      return (data || [])
        .map((m: any) => {
          const profile = m.profiles || {};
          return {
            email: profile.email || '',
            name: profile.full_name || 'Member',
            submissionTitle: 'Organization Member',
          };
        })
        .filter((m) => !!m.email);
    },
    enabled: !!programId && activeTab === 'new-broadcast' && (recipientMode === 'members' || recipientMode === 'all_people'),
  });

  const { data: participantsList } = useQuery({
    queryKey: ['broadcast-participants', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select('applicant_name, applicant_email, title')
        .eq('program_id', programId!);
      if (error) throw error;
      return (data || [])
        .map((s) => ({
          email: s.applicant_email || '',
          name: s.applicant_name || 'Participant',
          submissionTitle: s.title || 'Submission Participant',
        }))
        .filter((p) => !!p.email);
    },
    enabled: !!programId && activeTab === 'new-broadcast' && recipientMode === 'all_people',
  });

  // Resolve recipients
  const resolvedRecipients: Array<{ email: string; name?: string; submissionTitle?: string }> = React.useMemo(() => {
    if (recipientMode === 'manual') {
      return manualEmails
        .split(',')
        .map((email) => email.trim())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        .map((email) => ({ email, name: email.split('@')[0] }));
    }

    if (recipientMode === 'judges') {
      return judgesList || [];
    }

    if (recipientMode === 'members') {
      return membersList || [];
    }

    if (recipientMode === 'all_people') {
      const map = new Map<string, { email: string; name?: string; submissionTitle?: string }>();
      (participantsList || []).forEach((p) => map.set(p.email.toLowerCase(), p));
      (judgesList || []).forEach((j) => {
        const key = j.email.toLowerCase();
        if (!map.has(key)) map.set(key, j);
      });
      (membersList || []).forEach((m) => {
        const key = m.email.toLowerCase();
        if (!map.has(key)) map.set(key, m);
      });
      return Array.from(map.values());
    }

    if (!segments) return [];

    const toRow = (r: Recipient) => ({
      email: r.applicantEmail || '',
      name: r.applicantName,
      submissionTitle: r.submissionTitle,
    });

    if (selectedSegment === 'all') {
      return [
        ...segments.segments.winners.map(toRow),
        ...segments.segments.eliminated.map(toRow),
        ...segments.segments.active.map(toRow),
      ].filter((r) => !!r.email);
    }

    return (segments.segments[selectedSegment] || []).map(toRow).filter((r) => !!r.email);
  }, [recipientMode, manualEmails, segments, selectedSegment, judgesList, membersList, participantsList]);

  // Send Broadcast Mutation
  const sendMutation = useMutation({
    mutationFn: () =>
      sendCustomBroadcast(programId!, {
        recipients: resolvedRecipients,
        subject,
        template: templateBody,
        fromName,
        headerGradient,
      }),
    onSuccess: (res) => {
      toast.success(`Successfully sent ${res.sent} broadcast emails!${res.failed > 0 ? ` (${res.failed} failed)` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['broadcast-history', programId] });
      setActiveTab('history');
      // Reset Form
      setManualEmails('');
      setSubject('');
      setTemplateBody('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to send broadcast');
    },
  });

  if (!activeEvent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Mail className="w-12 h-12 stroke-[1.5] mb-2" />
        <p className="text-sm">Select a program to manage broadcasts.</p>
      </div>
    );
  }

  // Interpolate preview values for the first recipient
  const previewRecipient = resolvedRecipients[0] || {
    email: 'recipient@example.com',
    name: 'Jane Doe',
    submissionTitle: 'Innovations in AI',
  };

  const interpolate = (tmpl: string) => {
    const vars: Record<string, string> = {
      name: previewRecipient.name || 'Recipient',
      email: previewRecipient.email,
      submission_title: previewRecipient.submissionTitle || 'Submission Title',
      program_title: activeEvent.title,
    };
    return tmpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  };

  const previewSubject = interpolate(subject || '[Subject line preview]');
  const previewBodyHTML = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" style="background-color:#f8fafc; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" align="center" width="100%" style="max-width:560px; margin:0 auto; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px -2px rgba(0,0,0,.08); border-collapse: collapse;">
          <tr>
            <td style="background:${headerGradient};padding:32px 32px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Broadcast</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.85);font-weight:500;">${activeEvent.title}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px;">
              <div style="font-size:15px;line-height:1.75;color:#334155;font-weight:400;white-space:pre-wrap;">${interpolate(templateBody || 'Email body text goes here...').replace(/\n/g, '<br/>')}</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:500;">Sent on behalf of ${activeEvent.title}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Filter logs for the history tab
  const filteredLogs = (historyData?.logs || []).filter((log) => {
    const matchesSearch =
      log.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(log.context_json?.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && log.status === statusFilter;
  });

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'failed':
      case 'bounced':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  const handleUseTemplate = (preset: typeof TEMPLATE_PRESETS[0]) => {
    setSubject(preset.subject);
    setTemplateBody(preset.body);
    setHeaderGradient(preset.gradient);
    setActiveTab('new-broadcast');
    toast.success(`Loaded "${preset.name}" template`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-600" />
            Broadcast Center
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Send bulk emails to contestants, manage visual templates, and view delivery history.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="bg-slate-100 p-0.5 rounded-xl flex flex-nowrap overflow-x-auto max-w-full scrollbar-none whitespace-nowrap self-start">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Sent History
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'templates'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            Templates Library
          </button>
          <button
            onClick={() => setActiveTab('new-broadcast')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'new-broadcast'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            New Broadcast
          </button>
        </div>
      </div>

      {/* ── TAB 1: SENT HISTORY ────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by recipient or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white text-slate-700 min-w-[140px]"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => refetchHistory()}
              disabled={historyFetching}
              className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none"
              title="Refresh History"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Logs Table */}
          {historyLoading ? (
            <SkeletonLoader />
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/60 p-8 text-slate-400">
              <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No matching sent broadcasts found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Recipient</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Sent Date</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredLogs.map((log) => {
                      const subjectLine = log.context_json?.subject || '[No Subject]';
                      const cleanType = log.template_key.replace('mass_', '').replace('_', ' ');
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">{log.recipient_email}</td>
                          <td className="px-6 py-4 max-w-xs truncate text-slate-600">{subjectLine}</td>
                          <td className="px-6 py-4 text-xs capitalize text-slate-500">{cleanType}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColorClass(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: TEMPLATES LIBRARY ─────────────────────────────────────────────── */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TEMPLATE_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="bg-white rounded-2xl border border-slate-200/60 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              {/* Header Visual Bar */}
              <div className="absolute top-0 inset-x-0 h-1.5" style={{ background: preset.gradient }} />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-lg leading-tight">{preset.name}</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold uppercase px-2 py-0.5 rounded">Preset</span>
                </div>
                <p className="text-sm text-slate-500">{preset.description}</p>

                {/* Body Snippet */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-mono text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                  {preset.body}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-400">Supports variable bindings</span>
                <button
                  onClick={() => handleUseTemplate(preset)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  Use Template
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 3: NEW BROADCAST (CUSTOM COMPOSE) ─────────────────────────────────── */}
      {activeTab === 'new-broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Composing Editor Section (Left) */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-50 pb-3">Email Settings</h3>

            {/* Recipient Mode Toggler */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recipients Mode</label>
              <div className="flex flex-wrap gap-1 p-0.5 bg-slate-100 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setRecipientMode('segment')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    recipientMode === 'segment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Target segment
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('judges')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    recipientMode === 'judges' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Event Judges
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('members')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    recipientMode === 'members' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  Org Members
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('all_people')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    recipientMode === 'all_people' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 inline mr-1" />
                  All People
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('manual')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    recipientMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 inline mr-1" />
                  Manual Entry
                </button>
              </div>
            </div>

            {/* Target segment Inputs */}
            {recipientMode === 'segment' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Select round</label>
                  {roundsLoading ? (
                    <div className="h-10 bg-slate-50 rounded-lg animate-pulse" />
                  ) : (
                    <select
                      value={selectedRoundId}
                      onChange={(e) => setSelectedRoundId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white text-slate-700"
                    >
                      <option value="">— select round —</option>
                      {rounds.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Select segment</label>
                  <select
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value as any)}
                    disabled={!selectedRoundId}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="winners">Winners / Advanced</option>
                    <option value="eliminated">Eliminated</option>
                    <option value="active">Active (in round)</option>
                    <option value="all">All Enrolled</option>
                  </select>
                </div>
              </div>
            )}

            {/* Manual Entry Text Area */}
            {recipientMode === 'manual' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Comma-separated email addresses</label>
                <textarea
                  rows={2}
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  placeholder=" contestant1@test.com, contestant2@test.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono resize-none bg-slate-50/50"
                />
              </div>
            )}

            <div className="border-t border-slate-100 my-4" />

            {/* General Settings */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">From Address Display Name</label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="e.g. Innovation Awards Committee"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Header Visual Theme</label>
                  <select
                    value={headerGradient}
                    onChange={(e) => setHeaderGradient(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none bg-white text-slate-700"
                  >
                    {GRADIENTS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Subject Line</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line — e.g. Progression Update: {{program_title}}"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Content</label>
                  <span className="text-[10px] text-slate-400">Supports markdown / double-braces variables</span>
                </div>
                
                {/* Body Content Input */}
                <textarea
                  rows={9}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder={`Dear {{name}},\n\n[Write your email body here...]\n\nBest regards,\nThe Platform`}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none bg-slate-50/30"
                />

                {/* Variable bindings helper bar */}
                <div className="flex items-center flex-wrap gap-2 pt-2">
                  <span className="text-xs font-bold text-slate-400 mr-1 uppercase">Click to inject:</span>
                  {VARIABLES.map((v) => (
                    <button
                      type="button"
                      key={v.key}
                      onClick={() => setTemplateBody((b) => `${b}${v.key}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-100/80 transition-all hover:scale-105 active:scale-95 duration-150 shadow-sm cursor-pointer"
                      title={v.desc}
                    >
                      <span className="text-[10px] text-indigo-400 font-bold bg-white w-4 h-4 rounded-full flex items-center justify-center shadow-sm">+</span>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-medium">
                Targeting <span className="font-bold text-slate-800">{resolvedRecipients.length}</span> recipient{resolvedRecipients.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleNewBroadcast}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4 text-slate-500" />
                  New Broadcast
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-4 h-4 text-slate-500" />
                  Save Draft
                </button>
                <button
                  onClick={() => sendMutation.mutate()}
                  disabled={
                    !subject.trim() ||
                    !templateBody.trim() ||
                    resolvedRecipients.length === 0 ||
                    sendMutation.isPending
                  }
                  className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {sendMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Sending Broadcast...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to {resolvedRecipients.length} Recipient{resolvedRecipients.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Real-time styled responsive preview Section (Right) */}
          <div className="space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Eye className="w-4 h-4 text-indigo-600" />
                Live styled preview
              </h4>
              <div className="bg-slate-100 p-0.5 rounded-lg flex">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded transition-all ${
                    previewDevice === 'desktop' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded transition-all ${
                    previewDevice === 'mobile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Mobile Preview"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subject and Sender preview header */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm space-y-1">
              <div className="flex text-xs font-semibold text-slate-500">
                <span className="w-14">From:</span>
                <span className="text-slate-800">{fromName ? `${fromName} <no-reply@awardx.one>` : 'no-reply@awardx.one'}</span>
              </div>
              <div className="flex text-xs font-semibold text-slate-500">
                <span className="w-14">Subject:</span>
                <span className="text-slate-900 font-bold">{previewSubject}</span>
              </div>
            </div>

            {/* Preview Viewport Frame */}
            <div className="flex items-center justify-center w-full overflow-hidden">
              <div
                className={`bg-slate-200 border-4 border-slate-300 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'w-full max-w-[360px] h-[580px]' : 'w-full h-[580px]'
                }`}
              >
                <iframe
                  title="Live Email HTML Preview"
                  srcDoc={previewBodyHTML}
                  className="w-full h-full border-none bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS DETAIL DIALOG (MODAL) ────────────────────────────────────────────── */}
      <Modal
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
        title="Broadcast Sent Details"
      >
        {selectedLog && (
          <div className="space-y-5 text-sm">
            {/* Metadata Fields */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Recipient</span>
                <p className="font-semibold text-slate-800 truncate mt-0.5">{selectedLog.recipient_email}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Template Key</span>
                <p className="font-semibold text-slate-800 mt-0.5 capitalize">{selectedLog.template_key.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Sent Timestamp</span>
                <p className="font-semibold text-slate-800 mt-0.5">{new Date(selectedLog.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Status</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusColorClass(selectedLog.status)}`}>
                    {selectedLog.status}
                  </span>
                </div>
              </div>
              {selectedLog.resend_message_id && (
                <div className="col-span-2">
                  <span className="text-xs text-slate-400 font-bold uppercase">Resend Message ID</span>
                  <p className="font-mono text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded px-2 py-1 mt-1 truncate">
                    {selectedLog.resend_message_id}
                  </p>
                </div>
              )}
              {selectedLog.error_message && (
                <div className="col-span-2 rounded-xl bg-red-50 border border-red-100 p-3 text-red-800 flex items-start gap-2">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-red-700">Delivery Error</span>
                    <p className="text-xs mt-0.5">{selectedLog.error_message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Email Subject preview */}
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase">Personalized Subject</span>
              <p className="font-bold text-slate-900 border border-slate-100 rounded-xl px-3 py-2 bg-slate-50/50">
                {selectedLog.context_json?.subject || '[No Subject Saved]'}
              </p>
            </div>

            {/* HTML Body preview in Frame */}
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase">Personalized Body</span>
              <div className="border border-slate-200 rounded-2xl overflow-hidden h-[300px] shadow-inner bg-slate-100">
                {selectedLog.context_json?.body ? (
                  <iframe
                    title="Sent Email Content Preview"
                    srcDoc={`<!doctype html><html><head><style>@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');body{font-family:'Outfit',sans-serif;margin:16px;color:#334155;line-height:1.6;font-size:14px;white-space:pre-wrap;}</style></head><body>${selectedLog.context_json.body.replace(/\n/g, '<br/>')}</body></html>`}
                    className="w-full h-full border-none bg-white"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Info className="w-6 h-6 mb-1 text-slate-300" />
                    <p className="text-xs">Full body text not available for this record.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
