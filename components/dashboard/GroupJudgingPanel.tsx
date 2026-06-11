import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase, getCurrentOrgId } from '../../services/supabase';
import { db } from '../../services/database';
import { Judge, Program } from '../../services/models';
import { sendJudgeInviteEmail } from '../../services/email';
import { Plus, Trash2, Mail, UserPlus, Users } from 'lucide-react';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { useConfirm } from '../ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';

interface Group {
  id: string;
  name: string;
  members: { id: string; judge_id: string; judge: Judge | null }[];
}

interface Props {
  activeEvent: Program;
  judges: Judge[];
}

export const JudgeGroups: React.FC<Props> = ({ activeEvent, judges }) => {
  const { confirm, ConfirmDialogNode } = useConfirm();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [addMemberGroupId, setAddMemberGroupId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
  const [addMode, setAddMode] = useState<'existing' | 'invite'>('existing');
  const [selectedJudgeId, setSelectedJudgeId] = useState<string | null>(null);

  const groupsKey = ['judging-panels', activeEvent.id];

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: groupsKey,
    queryFn: async () => {
      if (!supabase) return [];
      const orgId = await getCurrentOrgId();
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('judging_panels')
        .select('id, name, judging_panel_members(id, judge_id)')
        .eq('program_id', activeEvent.id)
        .eq('organization_id', orgId)
        .order('created_at');

      if (error || !data) return [];

      return data.map((g: any) => ({
        id: g.id,
        name: g.name,
        members: (g.judging_panel_members || []).map((m: any) => ({
          id: m.id,
          judge_id: m.judge_id,
          judge: judges.find(j => j.id === m.judge_id) || null,
        })),
      }));
    },
    enabled: !!activeEvent.id && !!supabase,
    staleTime: 30_000,
  });

  const createGroup = useMutation({
    mutationFn: async (name: string) => {
      if (!supabase) throw new Error('Not connected');
      const orgId = await getCurrentOrgId();
      if (!orgId) throw new Error('No organization');
      const { error } = await supabase.from('judging_panels').insert({
        organization_id: orgId,
        program_id: activeEvent.id,
        name: name.trim(),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKey });
      setIsCreateOpen(false);
      setGroupName('');
      toast.success('Group created');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to create group'),
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      if (!supabase) throw new Error('Not connected');
      const { error } = await supabase.from('judging_panels').delete().eq('id', groupId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKey });
      toast.success('Group deleted');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to delete group'),
  });

  const addMember = useMutation({
    mutationFn: async ({ groupId, judgeId }: { groupId: string; judgeId: string }) => {
      if (!supabase) throw new Error('Not connected');
      const { error } = await supabase.from('judging_panel_members').insert({
        panel_id: groupId,
        judge_id: judgeId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKey });
      setAddMemberGroupId(null);
      setSelectedJudgeId(null);
      toast.success('Judge added to group');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to add judge'),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      if (!supabase) throw new Error('Not connected');
      const { error } = await supabase.from('judging_panel_members').delete().eq('id', memberId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupsKey });
      toast.success('Judge removed from group');
    },
    onError: (e: any) => toast.error(e.message || 'Failed to remove judge'),
  });

  const handleInviteNewJudge = async (groupId: string) => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;
    try {
      const judgeData = await db.inviteJudge({
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        programId: activeEvent.id,
        currentUserEmail: user?.email,
      });

      const inviteToken = judgeData?.invite_token;
      let emailWarning = '';
      if (inviteToken && judgeData?.status !== 'active') {
        const magicLinkUrl = `${window.location.origin}/judge/${inviteToken}`;
        const inviteResult = await sendJudgeInviteEmail({
          email: inviteForm.email.trim(),
          name: inviteForm.name.trim(),
          programTitle: activeEvent.title || 'your workspace',
          organizationId: (judgeData as any)?.organization_id,
          programId: (judgeData as any)?.program_id || activeEvent.id,
          inviteId: (judgeData as any)?.id,
          inviteUrl: magicLinkUrl,
        });
        if (inviteResult && inviteResult.emailSent === false) {
          emailWarning = inviteResult.warning || 'Invitation email could not be delivered.';
        }
      }

      if (judgeData?.id) {
        await addMember.mutateAsync({ groupId, judgeId: judgeData.id });
      }

      queryClient.invalidateQueries({ queryKey: ['judges'] });
      setInviteForm({ name: '', email: '' });
      setAddMemberGroupId(null);
      setAddMode('existing');
      if (judgeData?.status === 'active') {
        const magicLinkUrl = inviteToken ? `${window.location.origin}/judge/${inviteToken}` : '';
        if (magicLinkUrl) {
          try {
            await navigator.clipboard.writeText(magicLinkUrl);
            toast.success('You have been added to the group as a judge. Portal link copied to clipboard!');
          } catch (clipErr) {
            toast.success('You have been added to the group as a judge');
          }
        } else {
          toast.success('You have been added to the group as a judge');
        }
      } else if (emailWarning) {
        toast.warning(`Judge invited and added to group, but email failed: ${emailWarning}`);
      } else {
        toast.success('Judge invited and added to group');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to invite judge');
    }
  };

  const getAvailableJudges = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    const memberIds = new Set((group?.members || []).map(m => m.judge_id));
    return judges.filter(j => !memberIds.has(j.id));
  };

  return (
    <div className="space-y-4">
      {ConfirmDialogNode}

      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" /> Judge Groups
        </h3>
        <Button size="sm" variant="outline" onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Group
        </Button>
      </div>

      {isLoading ? (
        <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No groups yet. Create a group to organize judges.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.id} className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-semibold text-slate-900 text-sm">{group.name}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setAddMemberGroupId(group.id); setAddMode('existing'); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Add judge"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Delete group "${group.name}"?`,
                        description: 'Judges will remain in the organization.',
                        confirmLabel: 'Delete',
                      });
                      if (ok) deleteGroup.mutate(group.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {group.members.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-400">No judges in this group.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {group.members.map(member => (
                    <div key={member.id} className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                          {(member.judge?.name || 'J').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800">{member.judge?.name || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">{member.judge?.email || ''}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeMember.mutate(member.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Judge Group">
        <form onSubmit={(e) => { e.preventDefault(); createGroup.mutate(groupName); }} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Technical Reviewers"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createGroup.isPending}>
              {createGroup.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Judge Modal */}
      <Modal
        isOpen={!!addMemberGroupId}
        onClose={() => { setAddMemberGroupId(null); setAddMode('existing'); setInviteForm({ name: '', email: '' }); setSelectedJudgeId(null); }}
        title="Add Judge to Group"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddMode('existing')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                addMode === 'existing' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Assign Existing
            </button>
            <button
              type="button"
              onClick={() => setAddMode('invite')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                addMode === 'invite' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5 inline mr-1.5" /> Invite via Email
            </button>
          </div>

          {addMode === 'existing' && addMemberGroupId && (
            <>
              <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                {getAvailableJudges(addMemberGroupId).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-3">All org judges are already in this group.</p>
                ) : (
                  getAvailableJudges(addMemberGroupId).map(judge => (
                    <label key={judge.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="selectJudge"
                        checked={selectedJudgeId === judge.id}
                        onChange={() => setSelectedJudgeId(judge.id)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        {judge.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{judge.name}</div>
                        <div className="text-xs text-slate-500">{judge.email}</div>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setAddMemberGroupId(null)}>Cancel</Button>
                <Button
                  onClick={() => { if (selectedJudgeId && addMemberGroupId) addMember.mutate({ groupId: addMemberGroupId, judgeId: selectedJudgeId }); }}
                  disabled={!selectedJudgeId || addMember.isPending}
                >
                  {addMember.isPending ? 'Adding...' : 'Add to Group'}
                </Button>
              </div>
            </>
          )}

          {addMode === 'invite' && addMemberGroupId && (
            <form onSubmit={(e) => { e.preventDefault(); handleInviteNewJudge(addMemberGroupId); }} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <p className="text-xs text-slate-500">An invite email with a magic link will be sent and the judge added to this group.</p>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setAddMemberGroupId(null)}>Cancel</Button>
                <Button type="submit">Send Invite &amp; Add</Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};
