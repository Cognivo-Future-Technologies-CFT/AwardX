import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Copy, Check, Crown, X, Send,
  MessageCircle, ChevronDown, Loader2, LogOut, AlertCircle,
  UserMinus, Trash2, Shield,
} from 'lucide-react';
import {
  getMyTeam,
  createSubmissionTeam,
  joinTeamByCode,
  removeTeamMember,
  disbandTeam,
  markTeamReady,
  getTeamChat,
  sendTeamChatMessage,
  type SubmissionTeam,
  type TeamChatMessage,
} from '../../services/submissionTeamsApi';
import { supabase } from '../../services/supabase';

// ─── Team Gate ─────────────────────────────────────────────────────────
// This component is shown before the form when a program uses group submissions.
// The applicant must either create or join a team before proceeding to submit.

interface TeamGateProps {
  programId: string;
  minTeamSize: number;
  maxTeamSize: number;
  onProceed: (team: SubmissionTeam) => void;
}

export const TeamGate: React.FC<TeamGateProps> = ({
  programId,
  minTeamSize,
  maxTeamSize,
  onProceed,
}) => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'choice' | 'create' | 'join'>('choice');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['my-submission-team', programId],
    queryFn: () => getMyTeam(programId),
    staleTime: 10_000,
  });

  // If user already has a team, show team dashboard
  if (teamLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (team) {
    return (
      <TeamDashboard
        team={team}
        programId={programId}
        minTeamSize={minTeamSize}
        maxTeamSize={maxTeamSize}
        onProceed={onProceed}
      />
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setIsLoading(true);
    try {
      const newTeam = await createSubmissionTeam(programId, teamName.trim());
      toast.success('Team created! Share the invite code with your teammates.');
      queryClient.invalidateQueries({ queryKey: ['my-submission-team', programId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create team');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setIsLoading(true);
    try {
      await joinTeamByCode(inviteCode.trim(), programId);
      toast.success('Joined the team!');
      queryClient.invalidateQueries({ queryKey: ['my-submission-team', programId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to join team');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 mb-4">
          <Users className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Group Submission</h2>
        <p className="text-slate-500 mt-2">
          This program requires team submissions ({minTeamSize}–{maxTeamSize} members).
          Create a team or join an existing one to proceed.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {view === 'choice' && (
          <motion.div
            key="choice"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <button
              onClick={() => setView('create')}
              className="flex flex-col items-center p-6 rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
                <Crown className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="font-semibold text-slate-900">Create a Team</span>
              <span className="text-sm text-slate-500 mt-1">Be the team lead</span>
            </button>

            <button
              onClick={() => setView('join')}
              className="flex flex-col items-center p-6 rounded-xl border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3 group-hover:bg-emerald-200 transition-colors">
                <UserPlus className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="font-semibold text-slate-900">Join a Team</span>
              <span className="text-sm text-slate-500 mt-1">Enter an invite code</span>
            </button>
          </motion.div>
        )}

        {view === 'create' && (
          <motion.form
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreate}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900">Create a New Team</h3>
              <button
                type="button"
                onClick={() => setView('choice')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. The Innovators"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                maxLength={100}
                required
              />
            </div>

            <p className="text-xs text-slate-500">
              You'll become the team lead. Your submission will count as the team's submission.
              Team size: {minTeamSize}–{maxTeamSize} members.
            </p>

            <button
              type="submit"
              disabled={isLoading || !teamName.trim()}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crown className="w-4 h-4" />
              )}
              Create Team
            </button>
          </motion.form>
        )}

        {view === 'join' && (
          <motion.form
            key="join"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleJoin}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900">Join an Existing Team</h3>
              <button
                type="button"
                onClick={() => setView('choice')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Paste the invite code from your team lead"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !inviteCode.trim()}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Join Team
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Team Dashboard ────────────────────────────────────────────────────
// Shows team info, members, invite code, and chat. Allows team lead to
// mark as ready and proceed to submission form.

interface TeamDashboardProps {
  team: SubmissionTeam;
  programId: string;
  minTeamSize: number;
  maxTeamSize: number;
  onProceed: (team: SubmissionTeam) => void;
}

const TeamDashboard: React.FC<TeamDashboardProps> = ({
  team,
  programId,
  minTeamSize,
  maxTeamSize,
  onProceed,
}) => {
  const queryClient = useQueryClient();
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const canProceed = team.isLead && (team.status === 'ready' || team.memberCount >= minTeamSize);
  const needsMoreMembers = team.memberCount < minTeamSize;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(team.invite_code);
      setCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleMarkReady = async () => {
    setIsProcessing(true);
    try {
      await markTeamReady(team.id);
      toast.success('Team marked as ready!');
      queryClient.invalidateQueries({ queryKey: ['my-submission-team', programId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark team as ready');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisband = async () => {
    if (!confirm('Are you sure you want to disband this team? This cannot be undone.')) return;
    setIsProcessing(true);
    try {
      await disbandTeam(team.id);
      toast.success('Team disbanded');
      queryClient.invalidateQueries({ queryKey: ['my-submission-team', programId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to disband team');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeave = async () => {
    const myMember = team.members.find((m) => m.role !== 'lead');
    if (!myMember) return;
    if (!confirm('Leave this team?')) return;
    setIsProcessing(true);
    try {
      await removeTeamMember(team.id, myMember.id);
      toast.success('Left the team');
      queryClient.invalidateQueries({ queryKey: ['my-submission-team', programId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to leave team');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName || 'this member'} from the team?`)) return;
    try {
      await removeTeamMember(team.id, memberId);
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['my-submission-team', programId] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  const handleProceed = () => {
    if (team.status === 'submitted') {
      toast.info('Your team has already submitted.');
      return;
    }
    onProceed(team);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Team Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-slate-900">{team.name}</h2>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                team.status === 'forming' ? 'bg-amber-100 text-amber-700' :
                team.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                team.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {team.status === 'forming' ? 'Forming' :
                 team.status === 'ready' ? 'Ready' :
                 team.status === 'submitted' ? 'Submitted' : 'Disbanded'}
              </span>
              <span>{team.memberCount}/{maxTeamSize} members</span>
            </div>
          </div>

          {team.isLead && team.status === 'forming' && (
            <button
              onClick={handleDisband}
              disabled={isProcessing}
              className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Disband
            </button>
          )}
          {!team.isLead && team.status === 'forming' && (
            <button
              onClick={handleLeave}
              disabled={isProcessing}
              className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave
            </button>
          )}
        </div>

        {/* Invite Code */}
        {team.status === 'forming' && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1.5">Invite Code — share with teammates</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-md font-mono text-sm text-slate-800 select-all">
                {team.invite_code}
              </code>
              <button
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors"
                title="Copy invite code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          Team Members
          {needsMoreMembers && (
            <span className="text-xs text-amber-600 font-normal">
              (need {minTeamSize - team.memberCount} more)
            </span>
          )}
        </h3>
        <div className="space-y-3">
          {team.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                {member.profile?.avatar_url ? (
                  <img
                    src={member.profile.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-600">
                    {(member.profile?.full_name || member.profile?.email || '?')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {member.profile?.full_name || member.profile?.email || 'Unknown'}
                  </p>
                  {member.role === 'lead' && (
                    <span className="text-xs text-indigo-600 flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Team Lead
                    </span>
                  )}
                </div>
              </div>
              {team.isLead && member.role !== 'lead' && team.status === 'forming' && (
                <button
                  onClick={() => handleRemoveMember(member.id, member.profile?.full_name || '')}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Remove member"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowChat(!showChat)}
          className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Team Chat
        </button>

        {team.isLead && team.status === 'forming' && !needsMoreMembers && (
          <button
            onClick={handleMarkReady}
            disabled={isProcessing}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Mark Ready
          </button>
        )}

        {canProceed && team.status !== 'submitted' && (
          <button
            onClick={handleProceed}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {team.status === 'ready' ? 'Submit for Team' : 'Proceed to Submit'}
          </button>
        )}

        {team.status === 'submitted' && (
          <div className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-lg font-medium flex items-center justify-center gap-2 border border-blue-200">
            <Check className="w-4 h-4" />
            Team has submitted
          </div>
        )}
      </div>

      {/* Info for non-leads */}
      {!team.isLead && team.status !== 'submitted' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Only the team lead can submit on behalf of the team. Wait for your team lead to finalize and submit the entry.
          </p>
        </div>
      )}

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <TeamChat teamId={team.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Team Chat ─────────────────────────────────────────────────────────

interface TeamChatProps {
  teamId: string;
}

const TeamChat: React.FC<TeamChatProps> = ({ teamId }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['team-chat', teamId],
    queryFn: () => getTeamChat(teamId),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const messages = data?.messages || [];
  const chatActive = data?.chatActive ?? true;

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_chat_messages',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, refetch]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending || !chatActive) return;
    setIsSending(true);
    try {
      await sendTeamChatMessage(teamId, message.trim());
      setMessage('');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h4 className="font-medium text-slate-900 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-indigo-500" />
          Team Chat
        </h4>
        {!chatActive && (
          <span className="text-xs text-red-500 font-medium">Chat expired</span>
        )}
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">
            No messages yet. Start the conversation!
          </p>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-xs font-medium text-indigo-600">
              {(msg.sender?.full_name || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  {msg.sender?.full_name || 'Unknown'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-slate-800 break-words">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {chatActive ? (
        <form onSubmit={handleSend} className="p-3 border-t border-slate-200 flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            maxLength={2000}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !message.trim()}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      ) : (
        <div className="p-3 border-t border-slate-200 text-center text-sm text-slate-500 bg-red-50">
          Chat has expired — the announcement round has ended.
        </div>
      )}
    </div>
  );
};

export default TeamGate;
