import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Program } from '../../services/models';
import { supabase } from '../../services/supabase';
import { Globe, Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleRoundsService } from '../../services/scheduleRoundsDb';

interface VotingConfigViewProps {
  activeEvent: Program | null;
}

interface VotingConfig {
  id?: string;
  round_id: string;
  votes_per_user: number;
  votes_per_submission: number;
  require_auth: boolean;
  allow_anonymous: boolean;
  show_results_publicly: boolean;
  show_leaderboard: boolean;
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
    r => r.type === 'Public Voting' || r.type === 'Public Rating' || r.evaluationLogic === 'voting'
  );

  const configsQuery = useQuery({
    queryKey: ['voting-configs', activeEvent?.id],
    queryFn: async () => {
      if (!supabase || !activeEvent?.id) return [];
      const roundIds = votingRounds.map(r => r.id);
      if (roundIds.length === 0) return [];
      const { data } = await supabase
        .from('voting_configs')
        .select('*')
        .in('round_id', roundIds);
      return data || [];
    },
    enabled: !!activeEvent?.id && votingRounds.length > 0,
    staleTime: 30_000,
  });

  const updateConfig = useMutation({
    mutationFn: async (config: Partial<VotingConfig> & { round_id: string }) => {
      if (!supabase) throw new Error('Not configured');
      const { error } = await supabase
        .from('voting_configs')
        .upsert({
          round_id: config.round_id,
          votes_per_user: config.votes_per_user ?? 5,
          votes_per_submission: config.votes_per_submission ?? 1,
          require_auth: config.require_auth ?? false,
          allow_anonymous: config.allow_anonymous ?? true,
          show_results_publicly: config.show_results_publicly ?? false,
          show_leaderboard: config.show_leaderboard ?? true,
        }, { onConflict: 'round_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voting-configs'] });
      toast.success('Voting configuration saved');
    },
    onError: () => toast.error('Failed to save voting config'),
  });

  const copyVotingLink = async (roundId: string) => {
    const url = `${window.location.origin}/voting/${roundId}`;
    await navigator.clipboard.writeText(url);
    setCopiedRoundId(roundId);
    setTimeout(() => setCopiedRoundId(null), 2000);
    toast.success('Voting link copied!');
  };

  if (!activeEvent) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Select a program to configure public voting.
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Public Voting</h1>
        <p className="text-slate-500 mt-1">Configure and manage public voting rounds for your program.</p>
      </div>

      {votingRounds.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Voting Rounds</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Create a round with type "Public Voting" or "Public Rating" in Schedule & Rounds to enable public voting.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {votingRounds.map(round => {
            const config = (configsQuery.data || []).find((c: any) => c.round_id === round.id);
            return (
              <div key={round.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{round.name}</h3>
                        <p className="text-xs text-slate-500">{round.type} · {round.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyVotingLink(round.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        {copiedRoundId === round.id ? (
                          <><Check className="w-3.5 h-3.5 text-green-600" /> Copied!</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" /> Copy Link</>
                        )}
                      </button>
                      <a
                        href={`/voting/${round.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Preview
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Votes per User</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        defaultValue={config?.votes_per_user ?? 5}
                        onChange={(e) => updateConfig.mutate({ round_id: round.id, ...config, votes_per_user: parseInt(e.target.value) || 5 })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Votes per Submission</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        defaultValue={config?.votes_per_submission ?? 1}
                        onChange={(e) => updateConfig.mutate({ round_id: round.id, ...config, votes_per_submission: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'allow_anonymous', label: 'Allow Anonymous Voting', desc: 'Visitors can vote without signing in' },
                      { key: 'require_auth', label: 'Require Authentication', desc: 'Only logged-in users can vote' },
                      { key: 'show_leaderboard', label: 'Show Leaderboard', desc: 'Display live vote counts publicly' },
                      { key: 'show_results_publicly', label: 'Show Results Publicly', desc: 'Make final results visible to everyone' },
                    ].map(opt => (
                      <label key={opt.key} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{opt.label}</div>
                          <div className="text-xs text-slate-400">{opt.desc}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateConfig.mutate({
                            round_id: round.id,
                            ...config,
                            [opt.key]: !(config?.[opt.key] ?? (opt.key === 'allow_anonymous' || opt.key === 'show_leaderboard')),
                          })}
                          className={`w-10 h-5 rounded-full relative transition-colors ${
                            (config?.[opt.key] ?? (opt.key === 'allow_anonymous' || opt.key === 'show_leaderboard'))
                              ? 'bg-indigo-600' : 'bg-slate-200'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                            (config?.[opt.key] ?? (opt.key === 'allow_anonymous' || opt.key === 'show_leaderboard'))
                              ? 'left-[22px]' : 'left-0.5'
                          }`} />
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
