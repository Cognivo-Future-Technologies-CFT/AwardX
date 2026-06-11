import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Mail, Search, UserCheck, UserPlus } from 'lucide-react';
import { Button } from '../../Button';
import { Modal } from '../../Modal';
import { Category, Judge, JudgeGroup, TeamMember } from '../../../services/models';
import { db } from '../../../services/database';
import { sendJudgeInviteEmail } from '../../../services/email';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';

interface AddJudgeToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetGroup: JudgeGroup | null;
  judgeGroups: JudgeGroup[];
  /** All judges already on this program */
  judges: Judge[];
  /** Org members not yet judges */
  teamMembers: TeamMember[];
  programId: string;
  programTitle: string;
  categories: Category[];
  editJudge?: Judge | null;
  onDone: () => void;
}

const STATUS_PILL: Record<string, string> = {
  Active:    'bg-green-100 text-green-700',
  Invited:   'bg-amber-100 text-amber-700',
  Completed: 'bg-indigo-100 text-indigo-700',
};

const CategoryCheckbox: React.FC<{
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}> = ({ checked, indeterminate, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
    />
  );
};

export const AddJudgeToGroupModal: React.FC<AddJudgeToGroupModalProps> = ({
  isOpen,
  onClose,
  targetGroup,
  judgeGroups,
  judges,
  teamMembers,
  programId,
  programTitle,
  categories,
  editJudge,
  onDone,
}) => {
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteGroupId, setInviteGroupId] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setInviteGroupId(editJudge?.groupId || targetGroup?.id || '');
  }, [editJudge, targetGroup?.id, isOpen]);

  // Emails of judges already on this program (to exclude from org-member results)
  const judgeEmailSet = useMemo(
    () => new Set(judges.map((j) => j.email.trim().toLowerCase())),
    [judges],
  );

  const groupNameById = useMemo(
    () => new Map(judgeGroups.map((g) => [g.id, g.name])),
    [judgeGroups],
  );

  const q = search.trim().toLowerCase();

  // Case 1 — existing judges that match the search
  const matchingJudges = useMemo(() => {
    if (!q) return [];
    return judges.filter(
      (j) => j.name.toLowerCase().includes(q) || j.email.toLowerCase().includes(q),
    );
  }, [q, judges]);

  // Case 2 — org members not yet judges that match the search
  const matchingMembers = useMemo(() => {
    if (!q) return [];
    return teamMembers.filter(
      (m) =>
        !judgeEmailSet.has(m.email.trim().toLowerCase()) &&
        (m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)),
    );
  }, [q, teamMembers, judgeEmailSet]);

  const hasSearched = search.trim().length > 0;
  const hasAnyResult = matchingJudges.length > 0 || matchingMembers.length > 0;
  const noResults = hasSearched && !hasAnyResult;
  const isEditMode = Boolean(editJudge);

  const categoryTree = useMemo(() => {
    const byParent = new Map<string, Category[]>();
    categories.forEach((category) => {
      const key = category.parentId || 'root';
      byParent.set(key, [...(byParent.get(key) || []), category]);
    });
    byParent.forEach((items) => items.sort((a, b) => a.title.localeCompare(b.title)));

    const rows: Array<{ category: Category; depth: number }> = [];
    const subtreeIdsByCategory = new Map<string, string[]>();

    const collectSubtreeIds = (categoryId: string): string[] => {
      const childIds = (byParent.get(categoryId) || []).flatMap((child) => collectSubtreeIds(child.id));
      const ids = [categoryId, ...childIds];
      subtreeIdsByCategory.set(categoryId, ids);
      return ids;
    };

    const visit = (parentId: string, depth: number) => {
      (byParent.get(parentId) || []).forEach((category) => {
        rows.push({ category, depth });
        collectSubtreeIds(category.id);
        visit(category.id, depth + 1);
      });
    };
    visit('root', 0);
    return { rows, subtreeIdsByCategory };
  }, [categories]);

  const selectedCategorySet = useMemo(() => new Set(selectedCategoryIds), [selectedCategoryIds]);

  useEffect(() => {
    const initialIds = editJudge?.categoryIds || [];
    const expandedIds = new Set<string>();
    initialIds.forEach((categoryId) => {
      (categoryTree.subtreeIdsByCategory.get(categoryId) || [categoryId]).forEach((id) => expandedIds.add(id));
    });
    setSelectedCategoryIds(Array.from(expandedIds));
  }, [categoryTree, editJudge, isOpen]);

  const toggleCategory = (categoryId: string) => {
    const subtreeIds = categoryTree.subtreeIdsByCategory.get(categoryId) || [categoryId];
    setSelectedCategoryIds((prev) => {
      const current = new Set(prev);
      const isFullySelected = subtreeIds.every((id) => current.has(id));

      if (isFullySelected) {
        subtreeIds.forEach((id) => current.delete(id));
      } else {
        subtreeIds.forEach((id) => current.add(id));
      }

      return Array.from(current);
    });
  };

  const CategorySelector = (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-800">Award Categories</label>
        {selectedCategoryIds.length > 0 && (
          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
            {selectedCategoryIds.length} selected
          </span>
        )}
      </div>
      <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-inner shadow-slate-100/60">
        {categoryTree.rows.length === 0 ? (
          <div className="px-2 py-3 text-xs text-slate-400">No awards created yet.</div>
        ) : (
          categoryTree.rows.map(({ category, depth }) => {
            const subtreeIds = categoryTree.subtreeIdsByCategory.get(category.id) || [category.id];
            const selectedInSubtree = subtreeIds.filter((id) => selectedCategorySet.has(id)).length;
            const isChecked = selectedInSubtree === subtreeIds.length;
            const isIndeterminate = selectedInSubtree > 0 && !isChecked;
            const childCount = Math.max(0, subtreeIds.length - 1);

            return (
              <label
                key={category.id}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  isChecked || isIndeterminate ? 'bg-indigo-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                }`}
                style={{ marginLeft: `${depth * 22}px` }}
              >
                <CategoryCheckbox
                  checked={isChecked}
                  indeterminate={isIndeterminate}
                  onChange={() => toggleCategory(category.id)}
                />
                <span className={`${depth === 0 ? 'font-semibold' : 'font-medium'} min-w-0 flex-1 truncate`}>
                  {category.title}
                </span>
                {childCount > 0 && (
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200">
                    {childCount}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    </div>
  );

  // Pre-fill invite form when nothing is found
  useEffect(() => {
    if (!noResults) return;
    const raw = search.trim();
    if (raw.includes('@')) {
      setInviteEmail(raw);
      setInviteName('');
    } else {
      setInviteName(raw);
      setInviteEmail('');
    }
  }, [noResults, search]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Existing judge → assign to group (no new record needed) */
  const handleAssignToGroup = async (judge: Judge) => {
    const groupId = targetGroup?.id || inviteGroupId;
    if (!groupId && selectedCategoryIds.length === 0) {
      toast.error('Select a group or award category first.');
      return;
    }
    setBusy(judge.id);
    try {
      if (groupId && judge.groupId !== groupId) {
        await db.assignJudgeToGroup(judge.id, groupId);
      }
      try {
        await db.updateJudgeCategoryAssignments(judge.id, programId, selectedCategoryIds);
      } catch (catErr: any) {
        console.warn('Error updating judge category assignments:', catErr?.message || catErr);
      }
      toast.success(`${judge.name} updated`);
      onDone();
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign judge to group');
    } finally {
      setBusy(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editJudge) return;
    setBusy(editJudge.id);
    try {
      if (inviteGroupId && editJudge.groupId !== inviteGroupId) {
        await db.assignJudgeToGroup(editJudge.id, inviteGroupId);
      } else if (!inviteGroupId && editJudge.groupId) {
        await db.removeJudgeFromGroup(editJudge.id);
      }
      try {
        await db.updateJudgeCategoryAssignments(editJudge.id, programId, selectedCategoryIds);
      } catch (catErr: any) {
        console.warn('Error updating judge category assignments:', catErr?.message || catErr);
      }
      toast.success(`${editJudge.name} updated`);
      onDone();
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update judge');
    } finally {
      setBusy(null);
    }
  };

  /** New org member → create judge record + assign to group */
  const handleAddOrgUser = async (member: TeamMember) => {
    setBusy(member.memberId);
    try {
      await db.createJudge({
        name: member.name,
        email: member.email,
        programId,
        groupId: targetGroup?.id || inviteGroupId || undefined,
        categoryIds: selectedCategoryIds,
      });
      toast.success(`${member.name} added to group`);
      onDone();
      handleClose();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('duplicate key') || msg.includes('already')) {
        toast.error(`${member.email} is already a judge on this program.`);
      } else {
        toast.error(msg || 'Failed to add judge');
      }
    } finally {
      setBusy(null);
    }
  };

  /** Unknown person → invite via email */
  const handleSendInvite = async () => {
    const email = inviteEmail.trim();
    const name  = inviteName.trim();
    if (!email || !name) return;
    setBusy('invite');
    try {
      const judgeData = await db.inviteJudge({
        name,
        email,
        programId,
        groupId: inviteGroupId || targetGroup?.id || undefined,
        categoryIds: selectedCategoryIds,
        currentUserEmail: user?.email,
      });
      const inviteToken = judgeData?.invite_token;
      if (judgeData?.status !== 'active' && !inviteToken) {
        throw new Error('Unable to generate invite link. Please try again.');
      }
      
      let inviteResult = null;
      if (judgeData?.status !== 'active') {
        inviteResult = await sendJudgeInviteEmail({
          email,
          name,
          programTitle,
          organizationId: judgeData?.organization_id,
          programId: judgeData?.program_id || programId,
          inviteId: judgeData?.id,
          inviteUrl: `${window.location.origin}/judge/${inviteToken}`,
        });
      }
      
      if (inviteResult && inviteResult.emailSent === false) {
        toast.warning(inviteResult.warning || 'Judge record created, but invitation email could not be sent.');
      } else if (judgeData?.status === 'active') {
        const magicLinkUrl = inviteToken ? `${window.location.origin}/judge/${inviteToken}` : '';
        if (magicLinkUrl) {
          try {
            await navigator.clipboard.writeText(magicLinkUrl);
            toast.success('You have been added as a judge. Portal link copied to clipboard!');
          } catch (clipErr) {
            toast.success('You have been added as a judge');
          }
        } else {
          toast.success('You have been added as a judge');
        }
      } else {
        toast.success(`Invite sent to ${email}`);
      }
      onDone();
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send invite');
    } finally {
      setBusy(null);
    }
  };

  const handleClose = () => {
    setSearch('');
    setInviteEmail('');
    setInviteName('');
    setInviteGroupId(editJudge?.groupId || targetGroup?.id || '');
    setSelectedCategoryIds(editJudge?.categoryIds || []);
    setBusy(null);
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editJudge ? `Edit Judge — ${editJudge.name}` : targetGroup ? `Add Judge — ${targetGroup.name}` : 'Add Judge'}
    >
      <div className="space-y-5">
        {isEditMode && editJudge ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="font-semibold text-sm text-slate-900">{editJudge.name}</div>
              <div className="text-xs text-slate-500">{editJudge.email}</div>
            </div>
            {judgeGroups.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Judge Group</label>
                <select
                  value={inviteGroupId}
                  onChange={(e) => setInviteGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                >
                  <option value="">No group</option>
                  {judgeGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
            {CategorySelector}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={busy === editJudge.id}>
                {busy === editJudge.id ? 'Saving...' : 'Save Judge'}
              </Button>
            </div>
          </div>
        ) : (
        <>

        {/* Search input */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Search Judge</label>
          <p className="text-xs text-slate-500 mb-2">Name / Email</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            />
          </div>
        </div>
        {CategorySelector}

        {/* ── Case 1: Existing judges on this program ── */}
        {matchingJudges.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Already a judge on this program
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {matchingJudges.map((judge) => {
                const inThisGroup = judge.groupId === targetGroup?.id;
                const currentGroupName = judge.groupId ? groupNameById.get(judge.groupId) : null;
                const isBusy = busy === judge.id;

                return (
                  <div
                    key={judge.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {judge.avatar ? (
                        <img
                          src={judge.avatar}
                          alt={judge.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {judge.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 truncate">{judge.name}</div>
                        <div className="text-xs text-slate-500 truncate">{judge.email}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_PILL[judge.status] ?? 'bg-slate-100 text-slate-600'}`}>
                            {judge.status}
                          </span>
                          {currentGroupName && (
                            <span className="text-[11px] text-slate-400">
                              {inThisGroup ? 'Already in this group' : `In: ${currentGroupName}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {inThisGroup ? (
                      <span className="shrink-0 text-xs text-slate-400 font-medium">Assigned</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0 gap-1.5 whitespace-nowrap"
                        disabled={isBusy}
                        onClick={() => handleAssignToGroup(judge)}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {isBusy ? 'Moving…' : 'Assign to Group'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Case 2: Org members not yet judges ── */}
        {matchingMembers.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Organization members
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {matchingMembers.map((member) => (
                <div
                  key={member.memberId}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-900 truncate">{member.name}</div>
                      <div className="text-xs text-slate-500 truncate">{member.email}</div>
                      {member.joinedDate && (
                        <div className="text-[11px] text-slate-400">Member since {member.joinedDate}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0 gap-1.5 whitespace-nowrap"
                    disabled={busy === member.memberId}
                    onClick={() => handleAddOrgUser(member)}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {busy === member.memberId ? 'Adding…' : 'Add To Group'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Case 3: Nothing found → Invite ── */}
        {noResults && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 space-y-4">
            <p className="text-sm text-slate-600">No matching user found.</p>

            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="font-semibold text-sm text-slate-800">Invite as Judge</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="judge@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                />
              </div>
              {judgeGroups.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Assign Group</label>
                  <select
                    value={inviteGroupId}
                    onChange={(e) => setInviteGroupId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                  >
                    <option value="">No group</option>
                    {judgeGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                className="w-full gap-2"
                disabled={busy === 'invite' || !inviteEmail.trim() || !inviteName.trim()}
                onClick={handleSendInvite}
              >
                <Mail className="w-4 h-4" />
                {busy === 'invite' ? 'Sending…' : 'Send Invite'}
              </Button>
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {!hasSearched && (
          <p className="text-xs text-slate-400 text-center py-1">
            Type a name or email to search judges and organization members
          </p>
        )}

        <div className="pt-2 flex justify-end border-t border-slate-100">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
        </div>
        </>
        )}
      </div>
    </Modal>
  );
};
