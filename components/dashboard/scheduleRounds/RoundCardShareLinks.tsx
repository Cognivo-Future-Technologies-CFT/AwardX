import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Globe, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import type { Round } from '../../../types/scheduleRounds';
import { isAnnounceRoundType } from '../../../lib/roundInsightUtils';
import { isVotingRoundType } from '../../../lib/roundScheduleUtils';
import { getVotingConfig } from '../../../services/votingApi';

interface RoundCardShareLinksProps {
  round: Round;
  programId: string;
}

export const RoundCardShareLinks: React.FC<RoundCardShareLinksProps> = ({ round, programId }) => {
  const [votingSlug, setVotingSlug] = useState<string | null>(null);
  const [loadingVoting, setLoadingVoting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isVoting = isVotingRoundType(round.type);
  const isAnnounce = isAnnounceRoundType(round.type);
  const isPersisted = Boolean(round.id) && !round.id.startsWith('round-');

  useEffect(() => {
    if (!isVoting || !isPersisted) {
      setVotingSlug(null);
      return;
    }

    let cancelled = false;
    setLoadingVoting(true);
    (async () => {
      try {
        const row = await getVotingConfig(round.id);
        if (!cancelled) {
          setVotingSlug(row?.public_voting_slug || null);
        }
      } catch {
        if (!cancelled) setVotingSlug(null);
      } finally {
        if (!cancelled) setLoadingVoting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isVoting, isPersisted, round.id]);

  if (!isVoting && !isAnnounce) return null;

  const publicUrl = isAnnounce
    ? `${window.location.origin}/winners/${programId}`
    : votingSlug
      ? `${window.location.origin}/vote/${votingSlug}`
      : isPersisted
        ? `${window.location.origin}/voting/${round.id}`
        : null;

  const title = isAnnounce ? 'Winners page' : 'Public voting';
  const Icon = isAnnounce ? Trophy : Globe;

  const copyLink = async () => {
    if (!publicUrl) {
      toast.error('Save this round first to generate a share link.');
      return;
    }
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied');
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">{title}</p>
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Icon className="h-4 w-4 flex-shrink-0 text-indigo-600" />
        <code className="min-w-0 flex-1 truncate text-xs text-slate-700">
          {loadingVoting
            ? 'Loading link…'
            : publicUrl || 'Link available after you save this round'}
        </code>
        <button
          type="button"
          onClick={() => void copyLink()}
          disabled={!publicUrl}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold hover:bg-slate-50 disabled:opacity-40"
        >
          {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
          Copy
        </button>
        {publicUrl && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold hover:bg-slate-50"
          >
            <ExternalLink className="h-3 w-3" />
            Preview
          </a>
        )}
      </div>
    </div>
  );
};
