import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Program } from '../../services/models';
import { supabase } from '../../services/supabase';
import { Globe, Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleRoundsService } from '../../services/scheduleRoundsDb';
import {
  updateVotingConfig,
  votingPublicUrl,
  type VotingAccessMode,
  type VotingConfigPayload,
} from '../../services/votingApi';

interface VotingConfigViewProps {
  activeEvent: Program | null;
}

type VotingConfig = VotingConfigPayload & { id?: string; round_id: string };

function votingPublicUrlForRound(slug?: string, roundId?: string) {
  return votingPublicUrl(slug, roundId);
}

export const VotingConfigView: React.FC<VotingConfigViewProps> = ({ activeEvent }) => {
  const queryClient = useQueryClient();
  const [copiedRoundId, setCopiedRoundId] = useState<string | null>(null);

  const roundsQuery = useQuery({
    queryKey: ['voting-rounds', activeEvent?.id],
    queryFn: () => scheduleRoundsService.getRounds(activeEvent!.id),
    enabled: !!activeEvent?.id,
    staleTime: 30_000,
  });

  const votingRounds = (roundsQuery.data || []).filter(
    (r) => r.type === 'Public Voting' || r.type === 'Public Rating' || r.evaluationLogic === 'voting',
  );

  const configsQuery = useQuery({
    queryKey: ['voting-configs', activeEvent?.id],
    queryFn: async () => {
      if (!supabase || !activeEvent?.id) return [];
      const roundIds = votingRounds.map((r) => r.id).filter((id) => !id.startsWith('round-'));
      if (roundIds.length === 0) return [];
      const { data } = await supabase.from('voting_configs').select('*').in('round_id', roundIds);
      return data || [];
    },
    enabled: !!activeEvent?.id && votingRounds.length > 0,
    staleTime: 30_000,
  });

  const updateConfig = useMutation({
    mutationFn: async (config: Partial<VotingConfig> & { round_id: string }) => {
      return updateVotingConfig(config.round_id, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voting-configs'] });
      toast.success('Voting configuration saved');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save voting config'),
  });

  const copyVotingLink = async (roundId: string, slug?: string) => {
    const url = votingPublicUrlForRound(slug, roundId);
    await navigator.clipboard.writeText(url);
    setCopiedRoundId(roundId);
    setTimeout(() => setCopiedRoundId(null), 2000);
    toast.success('Voting link copied');
  };

  if (!activeEvent) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Select a program to configure public voting.
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Public Voting</h1>
        <p className="mt-1 text-slate-500">
          Each public voting round gets a shareable slug URL. Configure access and vote limits below.
        </p>
        {activeEvent.kycEnabled && (
          <p className="mt-2 text-sm text-violet-700">
            DIDIT KYC is enabled for this program — voters must verify identity before casting votes.
          </p>
        )}
      </div>

      {votingRounds.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Globe className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-700">No voting rounds</h3>
          <p className="mx-auto max-w-md text-sm text-slate-500">
            Add a round with type &quot;Public Voting&quot; in Schedule &amp; Rounds. A public voting slug is
            created automatically when the round is saved.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {votingRounds.map((round) => {
            const config = (configsQuery.data || []).find((c: VotingConfig) => c.round_id === round.id);
            const slug = config?.public_voting_slug;
            const previewUrl = slug ? `/vote/${slug}` : `/voting/${round.id}`;

            return (
              <div
                key={round.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                        <Globe className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{round.name}</h3>
                        <p className="text-xs text-slate-500">
                          {round.type} · {round.status}
                          {slug && (
                            <span className="ml-2 font-mono text-indigo-600">/vote/{slug}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copyVotingLink(round.id, slug)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                      >
                        {copiedRoundId === round.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-green-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy link
                          </>
                        )}
                      </button>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Preview
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Who can vote
                    </label>
                    <select
                      value={config?.access_mode || 'open'}
                      onChange={(e) =>
                        updateConfig.mutate({
                          round_id: round.id,
                          ...config,
                          access_mode: e.target.value as VotingAccessMode,
                          require_auth: e.target.value !== 'open',
                          allow_anonymous: e.target.value === 'open',
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="open">Open to everyone (anonymous OK)</option>
                      <option value="authenticated">Any signed-in user</option>
                      <option value="org_only">Organization members only</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Votes per user
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={config?.votes_per_user ?? 5}
                        onBlur={(e) =>
                          updateConfig.mutate({
                            round_id: round.id,
                            ...config,
                            votes_per_user: parseInt(e.target.value, 10) || 5,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Votes per submission
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        defaultValue={config?.votes_per_submission ?? 1}
                        onBlur={(e) =>
                          updateConfig.mutate({
                            round_id: round.id,
                            ...config,
                            votes_per_submission: parseInt(e.target.value, 10) || 1,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        key: 'show_leaderboard',
                        label: 'Show leaderboard',
                        desc: 'Live rankings on the public page',
                        default: true,
                      },
                      {
                        key: 'show_results_publicly',
                        label: 'Show vote counts on cards',
                        desc: 'Display totals on each nomination',
                        default: false,
                      },
                    ].map((opt) => (
                      <label
                        key={opt.key}
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50"
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{opt.label}</div>
                          <div className="text-xs text-slate-400">{opt.desc}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateConfig.mutate({
                              round_id: round.id,
                              ...config,
                              [opt.key]: !(config?.[opt.key as keyof VotingConfig] ?? opt.default),
                            })
                          }
                          className={`relative h-5 w-10 rounded-full transition-colors ${
                            (config?.[opt.key as keyof VotingConfig] ?? opt.default)
                              ? 'bg-indigo-600'
                              : 'bg-slate-200'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                              (config?.[opt.key as keyof VotingConfig] ?? opt.default)
                                ? 'left-[22px]'
                                : 'left-0.5'
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
