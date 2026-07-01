import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Award,
  Download,
  Search,
  FileText,
  Upload,
  Image,
  Move,
  X,
  Send,
  Mail,
  ChevronLeft,
  CheckCircle,
  Pencil,
  Link as LinkIcon,
  Copy,
} from 'lucide-react';
import { Program, Round } from '../../services/models';
import { db as databaseService } from '../../services/database';
import { roundSubmissions } from '../../services/supabase';
import { queryKeys } from '../../services/queryKeys';
import { TableSkeleton } from '../SkeletonLoader';
import { fetchBackendJson } from '../../services/backendApi';
import { Modal } from '../Modal';

interface CertificatesViewProps {
  activeEvent: Program | null;
}

type CertificateType = 'participation' | 'round_advance' | 'winner';

interface ParticipantCertData {
  submissionId: string;
  applicantName: string;
  applicantEmail?: string;
  submissionTitle: string;
  certificateType: CertificateType;
  roundsCleared: number;
  totalRounds: number;
  eliminatedAtRound?: string;
}

interface NamePosition {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

interface CertificateRoundLabel {
  round_id: string;
  certificate_display_name: string;
  updated_at: string;
}

const FONT_OPTIONS = [
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Playfair Display', value: 'Playfair Display, serif' },
  { label: 'Cormorant Garamond', value: 'Cormorant Garamond, serif' },
  { label: 'Libre Baskerville', value: 'Libre Baskerville, serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Lora', value: 'Lora, serif' },
  { label: 'EB Garamond', value: 'EB Garamond, serif' },
  { label: 'Cinzel', value: 'Cinzel, serif' },
  { label: 'Great Vibes', value: 'Great Vibes, cursive' },
  { label: 'Dancing Script', value: 'Dancing Script, cursive' },
  { label: 'Parisienne', value: 'Parisienne, cursive' },
  { label: 'Alex Brush', value: 'Alex Brush, cursive' },
  { label: 'Sacramento', value: 'Sacramento, cursive' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' },
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto Slab', value: 'Roboto Slab, serif' },
];

function getCertificateColor(type: CertificateType): string {
  switch (type) {
    case 'winner': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'round_advance': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 'participation': return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

function formatRoundWindow(round?: Round): string {
  if (!round?.startDate || !round?.endDate) return '';
  const start = new Date(`${round.startDate}T00:00:00`);
  const end = new Date(`${round.endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

function getRoundNarrative(participant: ParticipantCertData, rounds: Round[]): { headline: string; detail: string } {
  const completedRounds = rounds.slice(0, Math.min(participant.roundsCleared, rounds.length));
  const lastCompletedRound = completedRounds[completedRounds.length - 1];
  const eliminatedRound = participant.eliminatedAtRound
    ? rounds.find((r) => r.title === participant.eliminatedAtRound)
    : undefined;

  if (participant.certificateType === 'winner') {
    const finalRound = rounds[rounds.length - 1];
    return {
      headline: `has completed all ${participant.totalRounds} scheduled rounds`,
      detail: finalRound
        ? `Final round: ${finalRound.title}${formatRoundWindow(finalRound) ? ` (${formatRoundWindow(finalRound)})` : ''}`
        : `Progress tracked across ${participant.totalRounds} rounds`,
    };
  }

  if (participant.certificateType === 'round_advance') {
    const roundsWord = participant.roundsCleared === 1 ? 'round' : 'rounds';
    if (eliminatedRound) {
      return {
        headline: `has advanced through ${participant.roundsCleared} ${roundsWord} in the schedule`,
        detail: `Eliminated at ${eliminatedRound.title}${formatRoundWindow(eliminatedRound) ? ` (${formatRoundWindow(eliminatedRound)})` : ''}`,
      };
    }

    return {
      headline: `has advanced through ${participant.roundsCleared} ${roundsWord} in the schedule`,
      detail: lastCompletedRound
        ? `Latest cleared round: ${lastCompletedRound.title}${formatRoundWindow(lastCompletedRound) ? ` (${formatRoundWindow(lastCompletedRound)})` : ''}`
        : 'Round progression is based on the configured schedule',
    };
  }

  const firstRound = rounds[0];
  return {
    headline: 'has participated in the scheduled rounds',
    detail: firstRound
      ? `Started with ${firstRound.title}${formatRoundWindow(firstRound) ? ` (${formatRoundWindow(firstRound)})` : ''}`
      : 'Participation recorded in this program schedule',
  };
}

function getParticipantActiveRound(participant: ParticipantCertData, rounds: Round[]): Round | undefined {
  if (participant.certificateType === 'winner') {
    return rounds[rounds.length - 1];
  }
  if (participant.certificateType === 'round_advance') {
    const completedRounds = rounds.slice(0, Math.min(participant.roundsCleared, rounds.length));
    return completedRounds[completedRounds.length - 1];
  }
  return rounds[0];
}

function getCertificateSubtitle(participant: ParticipantCertData, rounds: Round[], roundLabelsMap: Map<string, string>): string {
  if (participant.certificateType === 'winner') return 'OF EXCELLENCE';
  if (participant.certificateType === 'participation') return 'OF PARTICIPATION';

  const activeRound = getParticipantActiveRound(participant, rounds);
  let roundLabel = activeRound?.title || 'Round Advance';

  if (activeRound) {
    const customLabel = roundLabelsMap.get(activeRound.id);
    if (customLabel?.trim()) {
      roundLabel = customLabel.trim();
    }
  }

  return `OF ${roundLabel.toUpperCase()}`;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({ activeEvent }) => {
  const [filterType, setFilterType] = useState<CertificateType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [namePosition, setNamePosition] = useState<NamePosition>({ x: 50, y: 50, fontSize: 48, color: '#1e293b', fontFamily: 'Georgia, serif' });
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantCertData | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);
  const [showTemplateSetup, setShowTemplateSetup] = useState(false);
  const [showRoundLabelsModal, setShowRoundLabelsModal] = useState(false);
  const [savingRoundId, setSavingRoundId] = useState<string | null>(null);
  const [editingLabelInputs, setEditingLabelInputs] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Load Google Fonts for certificate rendering
  React.useEffect(() => {
    const fontFamilies = FONT_OPTIONS
      .map((f) => f.label)
      .filter((f) => !['Georgia', 'Times New Roman'].includes(f))
      .map((f) => f.replace(/ /g, '+'))
      .join('&family=');
    const linkId = 'cert-google-fonts';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
      document.head.appendChild(link);
    }
  }, []);

  const roundsQuery = useQuery({
    queryKey: queryKeys.rounds.all(activeEvent?.id || ''),
    queryFn: () => databaseService.getRounds(activeEvent!.id),
    enabled: !!activeEvent?.id,
  });

  const submissionsQuery = useQuery({
    queryKey: queryKeys.submissions.all(activeEvent?.id || ''),
    queryFn: () => databaseService.getSubmissions(activeEvent!.id),
    enabled: !!activeEvent?.id,
  });

  const roundSubmissionsQuery = useQuery({
    queryKey: ['certificates-round-submissions', activeEvent?.id],
    queryFn: async () => {
      if (!activeEvent?.id) return [];
      const rounds = roundsQuery.data || [];
      const results: Array<{
        roundId: string;
        roundTitle: string;
        roundIndex: number;
        submissions: Array<{ submission_id: string; status: string }>;
      }> = [];
      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        const { data } = await roundSubmissions.getByRound(round.id);
        results.push({
          roundId: round.id,
          roundTitle: round.title,
          roundIndex: i,
          submissions: (data || []).map((rs: any) => ({ submission_id: rs.submission_id, status: rs.status })),
        });
      }
      return results;
    },
    enabled: !!activeEvent?.id && !!roundsQuery.data?.length,
  });

  // Delivery tracking — which certificates have been emailed
  const deliveriesQuery = useQuery({
    queryKey: ['certificate-deliveries', activeEvent?.id],
    queryFn: async () => {
      if (!activeEvent?.id) return [];
      const res = await fetchBackendJson<{ deliveries: Array<{ submission_id: string; verification_code: string; delivered_at: string }> }>(
        `/api/certificates/${activeEvent.id}/deliveries`,
        { requireAuth: true }
      );
      return res.deliveries;
    },
    enabled: !!activeEvent?.id,
  });

  const roundLabelsQuery = useQuery({
    queryKey: ['certificate-round-labels', activeEvent?.id],
    queryFn: async () => {
      if (!activeEvent?.id) return [] as CertificateRoundLabel[];
      const res = await fetchBackendJson<{ labels: CertificateRoundLabel[] }>(
        `/api/certificates/${activeEvent.id}/certificate-round-labels`,
        { requireAuth: true }
      );
      return res.labels || [];
    },
    enabled: !!activeEvent?.id,
  });

  const deliveredMap = React.useMemo(() => {
    const map = new Map<string, { verificationCode: string; deliveredAt: string }>();
    for (const d of deliveriesQuery.data || []) {
      map.set(d.submission_id, { verificationCode: d.verification_code, deliveredAt: d.delivered_at });
    }
    return map;
  }, [deliveriesQuery.data]);

  const roundLabelsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const row of roundLabelsQuery.data || []) {
      map.set(row.round_id, row.certificate_display_name);
    }
    return map;
  }, [roundLabelsQuery.data]);

  const certificateData: ParticipantCertData[] = React.useMemo(() => {
    const submissions = submissionsQuery.data || [];
    const rounds = roundsQuery.data || [];
    const roundSubs = roundSubmissionsQuery.data || [];
    const totalRounds = rounds.length;
    if (!submissions.length || !totalRounds) return [];

    return submissions.map((sub: any) => {
      let roundsCleared = 0;
      let eliminatedAtRound: string | undefined;
      for (const rs of roundSubs) {
        const entry = rs.submissions.find((s) => s.submission_id === sub.id);
        if (!entry) break;
        if (entry.status === 'advanced') roundsCleared++;
        else if (entry.status === 'eliminated') { eliminatedAtRound = rs.roundTitle; break; }
        else roundsCleared++;
      }
      let certificateType: CertificateType = 'participation';
      if (roundsCleared === totalRounds && !eliminatedAtRound) certificateType = 'winner';
      else if (roundsCleared > 0) certificateType = 'round_advance';

      return {
        submissionId: sub.id,
        applicantName: sub.applicantName || sub.applicant || 'Unknown',
        applicantEmail: sub.applicantEmail || sub.email || undefined,
        submissionTitle: sub.title,
        certificateType, roundsCleared, totalRounds, eliminatedAtRound,
      };
    });
  }, [submissionsQuery.data, roundsQuery.data, roundSubmissionsQuery.data]);

  const filtered = certificateData.filter((p) => {
    if (filterType !== 'all' && p.certificateType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.applicantName.toLowerCase().includes(q) || p.submissionTitle.toLowerCase().includes(q);
    }
    return true;
  });

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) { toast.error('Upload an image file'); return; }
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setTemplateImage(img);
      setNamePosition((p) => ({ ...p, x: 50, y: 50 }));
      toast.success('Template uploaded! Click to position the name.');
    };
    img.src = url;
  };

  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !templateImage) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const maxW = 500;
    const scale = maxW / templateImage.width;
    canvas.width = maxW;
    canvas.height = templateImage.height * scale;
    ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
    const x = (namePosition.x / 100) * canvas.width;
    const y = (namePosition.y / 100) * canvas.height;
    ctx.font = `bold ${namePosition.fontSize * scale}px ${namePosition.fontFamily}`;
    ctx.fillStyle = namePosition.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(selectedParticipant?.applicantName || 'Participant Name', x, y);
  }, [templateImage, namePosition, selectedParticipant]);

  React.useEffect(() => { drawPreview(); }, [drawPreview]);

  const handlePreviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setNamePosition((p) => ({
      ...p,
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }));
  };

  const handleSaveRoundLabel = async (roundId: string) => {
    if (!activeEvent?.id) return;
    const label = editingLabelInputs[roundId]?.trim();
    if (!label) {
      toast.error('Label cannot be empty');
      return;
    }
    setSavingRoundId(roundId);
    try {
      await fetchBackendJson(`/api/certificates/${activeEvent.id}/certificate-round-labels/${roundId}`, {
        method: 'PUT',
        requireAuth: true,
        body: { certificateDisplayName: label },
      });
      await queryClient.invalidateQueries({ queryKey: ['certificate-round-labels', activeEvent.id] });
      toast.success('Certificate round label saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save round label');
    } finally {
      setSavingRoundId(null);
    }
  };

  const handleResetRoundLabel = async (roundId: string) => {
    if (!activeEvent?.id) return;
    setSavingRoundId(roundId);
    try {
      await fetchBackendJson(`/api/certificates/${activeEvent.id}/certificate-round-labels/${roundId}`, {
        method: 'DELETE',
        requireAuth: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['certificate-round-labels', activeEvent.id] });
      
      setEditingLabelInputs(prev => {
        const next = { ...prev };
        delete next[roundId];
        return next;
      });
      toast.success('Reset to workflow round name');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset round label');
    } finally {
      setSavingRoundId(null);
    }
  };

  const generateCertificateDataUrl = (participant: ParticipantCertData): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    if (templateImage) {
      canvas.width = templateImage.width;
      canvas.height = templateImage.height;
      ctx.drawImage(templateImage, 0, 0);
      const x = (namePosition.x / 100) * canvas.width;
      const y = (namePosition.y / 100) * canvas.height;
      ctx.font = `bold ${namePosition.fontSize}px ${namePosition.fontFamily}`;
      ctx.fillStyle = namePosition.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(participant.applicantName, x, y);
    } else {
      canvas.width = 1120;
      canvas.height = 800;
      drawBuiltinCertificate(ctx, canvas, participant);
    }
    return canvas.toDataURL('image/png');
  };

  const drawBuiltinCertificate = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, p: ParticipantCertData) => {
    const rounds = roundsQuery.data || [];
    const narrative = getRoundNarrative(p, rounds);
    const subtitle = getCertificateSubtitle(p, rounds, roundLabelsMap);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = p.certificateType === 'winner' ? '#d97706' : '#6366f1';
    ctx.lineWidth = 12;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
    ctx.strokeStyle = p.certificateType === 'winner' ? '#fbbf24' : '#a5b4fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 42px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE', canvas.width / 2, 140);
    ctx.font = '20px Georgia, serif'; ctx.fillStyle = '#64748b';
    ctx.fillText(subtitle, canvas.width / 2, 180);
    ctx.font = '18px Georgia, serif'; ctx.fillStyle = '#475569';
    ctx.fillText('This is to certify that', canvas.width / 2, 270);
    ctx.font = 'bold 36px Georgia, serif'; ctx.fillStyle = '#1e293b';
    ctx.fillText(p.applicantName, canvas.width / 2, 330);
    ctx.font = '18px Georgia, serif'; ctx.fillStyle = '#475569';
    ctx.fillText(narrative.headline, canvas.width / 2, 400);
    ctx.font = '15px Georgia, serif'; ctx.fillStyle = '#64748b';
    ctx.fillText(narrative.detail, canvas.width / 2, 432);
    ctx.font = 'bold 24px Georgia, serif'; ctx.fillStyle = '#4f46e5';
    ctx.fillText(activeEvent?.title || 'Awards Program', canvas.width / 2, 472);
    ctx.font = '16px Georgia, serif'; ctx.fillStyle = '#64748b';
    ctx.fillText(`Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, canvas.width / 2, 650);
  };

  const handleDownload = (participant: ParticipantCertData) => {
    const dataUrl = generateCertificateDataUrl(participant);
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `certificate-${participant.applicantName.replace(/\s+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
    toast.success(`Downloaded for ${participant.applicantName}`);
  };

  const handleEmailOne = async (participant: ParticipantCertData) => {
    if (!participant.applicantEmail) { toast.error('No email address for this participant'); return; }
    if (!activeEvent?.id) return;
    setIsSending(true);
    try {
      const dataUrl = generateCertificateDataUrl(participant);
      await fetchBackendJson<{ sent: number }>(`/api/certificates/${activeEvent.id}/send`, {
        method: 'POST',
        requireAuth: true,
        body: { recipients: [{
          email: participant.applicantEmail,
          name: participant.applicantName,
          submissionId: participant.submissionId,
          certificateType: participant.certificateType,
          roundsCleared: participant.roundsCleared,
          totalRounds: participant.totalRounds,
          certificateDataUrl: dataUrl,
        }] },
      });
      toast.success(`Certificate emailed to ${effectiveParticipant.applicantEmail}`);
      queryClient.invalidateQueries({ queryKey: ['certificate-deliveries', activeEvent.id] });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeliverAll = async () => {
    if (!activeEvent?.id || !filtered.length) return;
    const withEmail = filtered.filter((p) => p.applicantEmail && !deliveredMap.has(p.submissionId));
    
    if (!withEmail.length) {
      const withoutEmail = filtered.filter((p) => !p.applicantEmail);
      const alreadyDelivered = filtered.filter((p) => p.applicantEmail && deliveredMap.has(p.submissionId));
      if (withoutEmail.length > 0) {
        toast.error(`${withoutEmail.length} participants missing email addresses. Add emails in submissions to deliver.`);
      } else if (alreadyDelivered.length === filtered.length) {
        toast.error('All participants have already been delivered.');
      } else {
        toast.error('No undelivered participants with email addresses');
      }
      return;
    }

    setIsDelivering(true);
    toast.info(`Sending certificates to ${withEmail.length} participants...`);

    try {
      const batchSize = 5;
      let totalSent = 0;
      for (let i = 0; i < withEmail.length; i += batchSize) {
        const batch = withEmail.slice(i, i + batchSize);
        const recipients = batch.map((p) => {
          return {
            email: p.applicantEmail!,
            name: p.applicantName,
            submissionId: p.submissionId,
            certificateType: p.certificateType,
            roundsCleared: p.roundsCleared,
            totalRounds: p.totalRounds,
            certificateDataUrl: generateCertificateDataUrl(p),
          };
        });

        // Retry logic for rate limiting (429)
        let retries = 0;
        const maxRetries = 3;
        while (true) {
          try {
            const res = await fetchBackendJson<{ sent: number }>(`/api/certificates/${activeEvent.id}/send`, {
              method: 'POST',
              requireAuth: true,
              body: { recipients },
            });
            totalSent += res.sent;
            break; // Success, exit retry loop
          } catch (err: any) {
            const is429 = err?.message?.includes('429') || err?.message?.toLowerCase()?.includes('too many');
            if (is429 && retries < maxRetries) {
              retries++;
              const waitMs = Math.min(2000 * Math.pow(2, retries - 1), 15000); // 2s, 4s, 8s
              toast.info(`Rate limited — waiting ${Math.round(waitMs / 1000)}s before retrying (attempt ${retries}/${maxRetries})...`);
              await new Promise((resolve) => setTimeout(resolve, waitMs));
            } else {
              throw err; // Not a 429 or max retries exceeded
            }
          }
        }

        // Show progress
        const progress = Math.min(i + batchSize, withEmail.length);
        if (withEmail.length > batchSize) {
          toast.info(`Progress: ${progress}/${withEmail.length} certificates sent...`);
        }

        // Delay between batches to avoid rate limiting
        if (i + batchSize < withEmail.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      toast.success(`Delivered ${totalSent} certificates via email!`);
      queryClient.invalidateQueries({ queryKey: ['certificate-deliveries', activeEvent.id] });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deliver certificates');
    } finally {
      setIsDelivering(false);
    }
  };

  if (!activeEvent) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Select a program to generate certificates.</div>;
  }

  const isLoading = roundsQuery.isLoading || submissionsQuery.isLoading || roundSubmissionsQuery.isLoading || roundLabelsQuery.isLoading;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleTemplateUpload} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" /> Certificates
          </h1>
          <p className="text-sm text-slate-500 mt-1">Tap a participant to preview. Deliver individually or all at once.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all(activeEvent?.id || '') });
              queryClient.invalidateQueries({ queryKey: ['certificates-round-submissions', activeEvent?.id] });
              toast.success('Refreshing participant data...');
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            title="Refresh participant data"
          >
            Refresh
          </button>
          <button
            onClick={() => {
              const initial: Record<string, string> = {};
              for (const round of roundsQuery.data || []) {
                const existing = roundLabelsMap.get(round.id);
                if (existing) initial[round.id] = existing;
              }
              setEditingLabelInputs(initial);
              setShowRoundLabelsModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Manage Round Labels
          </button>
          <button
            onClick={() => setShowTemplateSetup(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Image className="w-4 h-4" />
            {templateImage ? 'Edit Template' : 'Upload Template'}
          </button>
          <button
            onClick={handleDeliverAll}
            disabled={!filtered.length || isLoading || isDelivering}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {isDelivering ? 'Delivering...' : `Deliver All (${filtered.filter((p) => p.applicantEmail && !deliveredMap.has(p.submissionId)).length})`}
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
        >
          <option value="all">All ({certificateData.length})</option>
          <option value="winner">Winners ({certificateData.filter((p) => p.certificateType === 'winner').length})</option>
          <option value="round_advance">Round Advance ({certificateData.filter((p) => p.certificateType === 'round_advance').length})</option>
          <option value="participation">Participation ({certificateData.filter((p) => p.certificateType === 'participation').length})</option>
        </select>
      </div>

      {/* Participant List */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={4} />
      ) : !certificateData.length ? (
        <div className="text-center py-16 text-slate-500">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No submissions yet</p>
          <p className="text-sm mt-1">Certificates appear once participants submit and rounds are processed.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {filtered.map((p) => {
            const delivery = deliveredMap.get(p.submissionId);
            const activeRound = getParticipantActiveRound(p, roundsQuery.data || []);
            let roundLabel = activeRound?.title || 'Round Advance';
            if (activeRound) {
              const custom = roundLabelsMap.get(activeRound.id);
              if (custom?.trim()) roundLabel = custom.trim();
            }
            if (p.certificateType === 'winner') roundLabel = 'Winner';
            if (p.certificateType === 'participation') roundLabel = 'Participation';

            return (
            <div
              key={p.submissionId}
              onClick={() => setSelectedParticipant(p)}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                  {p.applicantName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{p.applicantName}</div>
                  <div className="text-xs text-slate-500 truncate">{p.submissionTitle}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {delivery && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle className="w-3.5 h-3.5" /> Delivered
                  </span>
                )}
                <span className="text-xs text-slate-500">{p.roundsCleared}/{p.totalRounds} rounds</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold border max-w-[260px] inline-flex items-center gap-1 truncate ${getCertificateColor(p.certificateType)}`}
                  title={roundLabel}
                >
                  <span className="truncate">{roundLabel}</span>
                </span>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Certificate Preview Modal */}
      <Modal isOpen={!!selectedParticipant} onClose={() => setSelectedParticipant(null)} title="Certificate Preview">
        {selectedParticipant && (() => {
          const delivery = deliveredMap.get(selectedParticipant.submissionId);
          const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');
          const verifyUrl = delivery ? `${siteUrl}/certificates/verify/${delivery.verificationCode}` : null;
          return (
          <div className="space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <CertificatePreviewCanvas
                participant={selectedParticipant}
                templateImage={templateImage}
                namePosition={namePosition}
                programTitle={activeEvent?.title || ''}
                rounds={roundsQuery.data || []}
                roundLabelsMap={roundLabelsMap}
              />
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-medium">{selectedParticipant.applicantName}</span>
              {selectedParticipant.applicantEmail && <span className="text-slate-400 ml-2">({selectedParticipant.applicantEmail})</span>}
            </div>
            {delivery && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm text-green-700 font-medium">Delivered {new Date(delivery.deliveredAt).toLocaleDateString()}</span>
              </div>
            )}
            {verifyUrl && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <LinkIcon className="w-4 h-4 text-slate-500 shrink-0" />
                <input readOnly value={verifyUrl} className="flex-1 text-xs text-slate-600 bg-transparent outline-none truncate" />
                <button
                  onClick={() => { navigator.clipboard.writeText(verifyUrl); toast.success('Verification URL copied!'); }}
                  className="p-1 hover:bg-slate-200 rounded"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownload(selectedParticipant)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={() => handleEmailOne(selectedParticipant)}
                disabled={!selectedParticipant.applicantEmail || isSending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" /> {isSending ? 'Sending...' : delivery ? 'Resend' : 'Email Certificate'}
              </button>
            </div>
          </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={showRoundLabelsModal}
        onClose={() => setShowRoundLabelsModal(false)}
        title="Manage Certificate Round Labels"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 mb-4">
            Customize how round names appear on certificates. This terminology will only be used inside the Certificates module, leaving your internal Schedule workflow unchanged.
          </p>
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Workflow Round</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Certificate Display Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(roundsQuery.data || []).map(round => {
                  const isSaving = savingRoundId === round.id;
                  const currentInput = editingLabelInputs[round.id] ?? round.title;
                  const hasOverride = roundLabelsMap.has(round.id);
                  const isModified = currentInput.trim() !== (roundLabelsMap.get(round.id) || round.title);
                  
                  return (
                    <tr key={round.id} className="bg-white">
                      <td className="px-4 py-3 font-medium text-slate-900">{round.title}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={currentInput}
                          onChange={(e) => setEditingLabelInputs(prev => ({ ...prev, [round.id]: e.target.value }))}
                          placeholder={round.title}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {isModified ? (
                          <button
                            onClick={() => handleSaveRoundLabel(round.id)}
                            disabled={isSaving}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                          >
                            Save
                          </button>
                        ) : hasOverride ? (
                          <button
                            onClick={() => handleResetRoundLabel(round.id)}
                            disabled={isSaving}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
                          >
                            Reset
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowRoundLabelsModal(false)}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Template Setup — Full Screen */}
      {showTemplateSetup && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Image className="w-5 h-5 text-indigo-600" /> Certificate Template Editor
            </h1>
            <button
              onClick={() => setShowTemplateSetup(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Done
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {!templateImage ? (
              <div className="max-w-xl mx-auto mt-20">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-16 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                >
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                  <p className="text-lg font-medium text-slate-700">Upload certificate design</p>
                  <p className="text-sm text-slate-500 mt-2">PNG or JPG. Participant names will be overlaid on this image.</p>
                </div>
                <p className="text-xs text-slate-400 text-center mt-4">If no template is uploaded, a default certificate design is used.</p>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* Canvas preview */}
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 flex items-center gap-1"><Move className="w-4 h-4" /> Click on the certificate to position the name</p>
                  <canvas ref={previewCanvasRef} onClick={handlePreviewClick} className="border border-slate-200 rounded-lg cursor-crosshair w-full shadow-sm" />
                </div>

                {/* Controls sidebar */}
                <div className="space-y-5 bg-slate-50 rounded-xl p-5 border border-slate-200 h-fit">
                  {/* Font Family */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Font Family</label>
                    <select
                      value={namePosition.fontFamily}
                      onChange={(e) => setNamePosition((p) => ({ ...p, fontFamily: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1" style={{ fontFamily: namePosition.fontFamily }}>
                      Preview: Participant Name
                    </p>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Font Size: {namePosition.fontSize}px</label>
                    <input
                      type="range"
                      min={16}
                      max={140}
                      value={namePosition.fontSize}
                      onChange={(e) => setNamePosition((p) => ({ ...p, fontSize: +e.target.value }))}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Text Color</label>
                    <input
                      type="color"
                      value={namePosition.color}
                      onChange={(e) => setNamePosition((p) => ({ ...p, color: e.target.value }))}
                      className="w-full h-10 rounded-lg cursor-pointer border border-slate-200"
                    />
                  </div>

                  {/* Position display */}
                  <div className="text-xs text-slate-500 bg-white p-3 rounded-lg border border-slate-200">
                    Position: X {namePosition.x.toFixed(0)}% · Y {namePosition.y.toFixed(0)}%
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors"
                    >
                      Change Image
                    </button>
                    <button
                      onClick={() => setTemplateImage(null)}
                      className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Remove Template
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/** Small helper component to render the certificate preview inside the modal */
const CertificatePreviewCanvas: React.FC<{
  participant: ParticipantCertData;
  templateImage: HTMLImageElement | null;
  namePosition: NamePosition;
  programTitle: string;
  rounds: Round[];
  roundLabelsMap: Map<string, string>;
}> = ({ participant, templateImage, namePosition, programTitle, rounds, roundLabelsMap }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (templateImage) {
      const maxW = 540;
      const scale = maxW / templateImage.width;
      canvas.width = maxW;
      canvas.height = templateImage.height * scale;
      ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
      const x = (namePosition.x / 100) * canvas.width;
      const y = (namePosition.y / 100) * canvas.height;
      ctx.font = `bold ${namePosition.fontSize * scale}px ${namePosition.fontFamily}`;
      ctx.fillStyle = namePosition.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(participant.applicantName, x, y);
    } else {
      const narrative = getRoundNarrative(participant, rounds);
      const subtitle = getCertificateSubtitle(participant, rounds, roundLabelsMap);
      canvas.width = 560;
      canvas.height = 400;
      const s = 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = participant.certificateType === 'winner' ? '#d97706' : '#6366f1';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 22px Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillText('CERTIFICATE', canvas.width / 2, 60);
      ctx.font = '12px Georgia, serif'; ctx.fillStyle = '#64748b';
      ctx.fillText(subtitle, canvas.width / 2, 82);
      ctx.font = '11px Georgia, serif'; ctx.fillStyle = '#475569';
      ctx.fillText('This is to certify that', canvas.width / 2, 130);
      ctx.font = 'bold 20px Georgia, serif'; ctx.fillStyle = '#1e293b';
      ctx.fillText(participant.applicantName, canvas.width / 2, 165);
      ctx.font = '11px Georgia, serif'; ctx.fillStyle = '#475569';
      ctx.fillText(narrative.headline, canvas.width / 2, 200);
      ctx.font = '9px Georgia, serif'; ctx.fillStyle = '#64748b';
      ctx.fillText(narrative.detail, canvas.width / 2, 220);
      ctx.font = 'bold 14px Georgia, serif'; ctx.fillStyle = '#4f46e5';
      ctx.fillText(programTitle, canvas.width / 2, 250);
      ctx.font = '10px Georgia, serif'; ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Issued: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, canvas.width / 2, 340);
    }
  }, [participant, templateImage, namePosition, programTitle, rounds, roundLabelsMap]);

  return <canvas ref={ref} className="w-full" />;
};
