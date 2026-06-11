
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db } from '../../services/database';
import { Judge, JudgeGroup, Program, Submission, JudgingCriterion, TeamMember } from '../../services/models';
import { Mail, Plus, Settings, Sliders, Trash2, Users, Calendar, UserX, Sparkles } from 'lucide-react';
import { SkeletonLoader } from '../SkeletonLoader';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { GroupCard } from './judgeGroups/GroupCard';
import { CreateGroupModal } from './judgeGroups/CreateGroupModal';
import { ViewGroupJudgesModal } from './judgeGroups/ViewGroupJudgesModal';
import { AddJudgeToGroupModal } from './judgeGroups/AddJudgeToGroupModal';
import { useConfirm } from '../ConfirmDialog';
import { scheduleRoundsService } from '../../services/scheduleRoundsDb';
import { resendJudgeInvite } from '../../services/email';
import { judgingCriteria, refreshUserCache, supabase, realtime } from '../../services/supabase';
import { queryKeys } from '../../services/queryKeys';
import { JudgeScoresOverviewPanel } from './JudgeScoresOverviewPanel';
import { SubmissionReviewSheet } from './SubmissionReviewSheet';

interface JudgingViewProps {
   activeEvent?: Program | null;
}

const defaultCriteria: JudgingCriterion[] = [
   { id: 'default-1', name: 'Innovation & Creativity', weight: 40, description: 'Originality of the idea.', minScore: 0, maxScore: 100, sortOrder: 0 },
   { id: 'default-2', name: 'Technical Execution', weight: 30, description: 'Quality of implementation.', minScore: 0, maxScore: 100, sortOrder: 1 },
   { id: 'default-3', name: 'Impact & Results', weight: 30, description: 'Measurable outcomes.', minScore: 0, maxScore: 100, sortOrder: 2 },
];

export const JudgingView: React.FC<JudgingViewProps> = ({ activeEvent }) => {
   const { confirm, ConfirmDialogNode } = useConfirm();
   const queryClient = useQueryClient();
   const [activeTab, setActiveTab] = useState<'overview' | 'panel' | 'scoring' | 'scorecard' | 'assignments'>('overview');
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [selectedJudgesForBulk, setSelectedJudgesForBulk] = useState<string[]>([]);
   const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
   const [replaceAssignments, setReplaceAssignments] = useState(false);
   const [isAddJudgeModalOpen, setIsAddJudgeModalOpen] = useState(false);
   const [addJudgeTargetGroup, setAddJudgeTargetGroup] = useState<JudgeGroup | null>(null);
   const [editJudge, setEditJudge] = useState<Judge | null>(null);
   const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
   const [groupModalGroup, setGroupModalGroup] = useState<JudgeGroup | null>(null);
   const [viewGroupModalOpen, setViewGroupModalOpen] = useState(false);
   const [selectedGroup, setSelectedGroup] = useState<JudgeGroup | null>(null);
   const [isSavingGroup, setIsSavingGroup] = useState(false);
   const [isRemovingJudge, setIsRemovingJudge] = useState<string | null>(null);
   const [isRemovingAll, setIsRemovingAll] = useState(false);
   const [resendingJudgeId, setResendingJudgeId] = useState<string | null>(null);
   const [shortlistOnly, setShortlistOnly] = useState(false);
   const [unscoredOnly, setUnscoredOnly] = useState(false);
   const [judgesPage, setJudgesPage] = useState(1);
   const judgesPerPage = 9;
   const [criteriaDraft, setCriteriaDraft] = useState<JudgingCriterion[]>([]);
   const [criteriaSaving, setCriteriaSaving] = useState(false);
   const [criteriaNotice, setCriteriaNotice] = useState<string | null>(null);
   const [criteriaError, setCriteriaError] = useState<string | null>(null);

   // Submission review sheet state
   const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
   const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
   const [scoresOverviewJudge, setScoresOverviewJudge] = useState<Judge | null>(null);



   useEffect(() => {
      const handler = (e: Event) => {
         const detail = (e as CustomEvent).detail;
         if (detail === 'judging-panel-tab') {
            setActiveTab('panel');
         }
      };
      window.addEventListener('demo-action', handler);
      return () => window.removeEventListener('demo-action', handler);
   }, []);

   // ── React Query data fetching ──────────────────────────────────────────────
   const { data: judges = [], isLoading: judgesLoading } = useQuery({
      queryKey: queryKeys.judges.all(activeEvent?.id ?? ''),
      queryFn: () => db.getJudges(activeEvent!.id),
      enabled: !!activeEvent?.id,
      staleTime: 30_000,
   });

   const { data: allOrgJudges = [], isLoading: allOrgJudgesLoading } = useQuery({
      queryKey: ['judges', 'org'],
      queryFn: () => db.getJudges(),
      enabled: !!activeEvent?.id && isAssignModalOpen,
      staleTime: 30_000,
   });

   const { data: allSubmissions = [], isLoading: submissionsLoading } = useQuery({
      queryKey: queryKeys.submissions.all(activeEvent?.id ?? ''),
      queryFn: () => db.getSubmissions(activeEvent!.id),
      enabled: !!activeEvent?.id,
      staleTime: 30_000,
   });
   const { data: teamMembers = [] } = useQuery<TeamMember[]>({
      queryKey: queryKeys.teams.members(activeEvent?.id ?? ''),
      queryFn: () => db.getTeamMembers(activeEvent!.id),
      enabled: !!activeEvent?.id,
      staleTime: 30_000,
   });

   const { data: judgeGroups = [] } = useQuery<JudgeGroup[]>({
      queryKey: queryKeys.judgeGroups.all(activeEvent?.id ?? ''),
      queryFn: () => db.getJudgeGroups(activeEvent!.id),
      enabled: !!activeEvent?.id,
      staleTime: 30_000,
   });

   const { data: categories = [] } = useQuery({
      queryKey: queryKeys.categories.all(activeEvent?.id ?? ''),
      queryFn: () => db.getCategories(activeEvent!.id),
      enabled: !!activeEvent?.id,
      staleTime: 30_000,
   });
   const { data: criteriaData } = useQuery<JudgingCriterion[]>({
      queryKey: queryKeys.judging.criteria(activeEvent?.id ?? ''),
      queryFn: async (): Promise<JudgingCriterion[]> => {
         if (!activeEvent?.id) return defaultCriteria;

         await refreshUserCache();
         const { data, error } = await judgingCriteria.getByProgram(activeEvent.id);

         if (error) {
            console.warn('[judging] criteria load failed:', error);
            return defaultCriteria;
         }

         if (data && data.length > 0) {
            return data.map((c: Record<string, unknown>) => ({
               id: String(c.id),
               name: String(c.name),
               description: String(c.description || ''),
               weight: Number(c.weight) || 100,
               minScore: Number(c.min_score) || 0,
               maxScore: Number(c.max_score) || 100,
               sortOrder: Number(c.sort_order) || 0,
            }));
         }

         if (!supabase) return defaultCriteria;

         // Bootstrap defaults for new programs so scoring always has UUID-backed criteria.
         const bootstrapPayload = defaultCriteria.map((criterion, index) => ({
            program_id: activeEvent.id,
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
            min_score: criterion.minScore,
            max_score: criterion.maxScore,
            sort_order: index,
         }));

         const { data: inserted, error: insertError } = await supabase
            .from('judging_criteria')
            .insert(bootstrapPayload)
            .select('*')
            .order('sort_order');

         if (insertError) {
            console.warn('[judging] criteria bootstrap failed:', insertError);
            return defaultCriteria;
         }

         if (inserted && inserted.length > 0) {
            return inserted.map((c: Record<string, unknown>) => ({
               id: String(c.id),
               name: String(c.name),
               description: String(c.description || ''),
               weight: Number(c.weight) || 100,
               minScore: Number(c.min_score) || 0,
               maxScore: Number(c.max_score) || 100,
               sortOrder: Number(c.sort_order) || 0,
            }));
         }

         return defaultCriteria;
      },
      enabled: !!activeEvent?.id,
      staleTime: 5 * 60_000,
   });

   const criteria = criteriaData ?? defaultCriteria;

   useEffect(() => {
      setCriteriaDraft(criteria.map((criterion) => ({ ...criterion })));
   }, [criteriaData, activeEvent?.id]);

   const handleCriterionChange = (id: string, field: keyof Omit<JudgingCriterion, 'id' | 'sortOrder'>, value: string | number) => {
      setCriteriaDraft((prev) => prev.map((criterion) => {
         if (criterion.id !== id) return criterion;
         return {
            ...criterion,
            [field]: value,
         } as JudgingCriterion;
      }));
   };

   const handleAddCriterion = () => {
      setCriteriaDraft((prev) => ([
         ...prev,
         {
            id: `temp-${Date.now()}`,
            name: 'New Criterion',
            description: 'Describe what judges should evaluate.',
            weight: 0,
            minScore: 0,
            maxScore: 100,
            sortOrder: prev.length,
         },
      ]));
   };

   const handleDeleteCriterion = (id: string) => {
      setCriteriaDraft((prev) => prev.filter((criterion) => criterion.id !== id));
   };

   const handleSaveCriteria = async () => {
      if (!activeEvent?.id) return;
      if (totalWeight !== 100 && criteriaDraft.length > 0) {
         toast.error('Weights must total 100%');
         return;
      }
      setCriteriaSaving(true);
      setCriteriaError(null);
      setCriteriaNotice(null);

      try {
         const existingById = new Map(criteria.map((criterion) => [criterion.id, criterion]));
         const draftIds = new Set(criteriaDraft.map((criterion) => criterion.id));

         for (const removed of criteria.filter((criterion) => !draftIds.has(criterion.id))) {
            const { error } = await judgingCriteria.delete(removed.id);
            if (error) throw new Error(error.message || 'Failed to delete criterion');
         }

         for (const [index, criterion] of criteriaDraft.entries()) {
            const payload = {
               name: String(criterion.name).trim() || `Criterion ${index + 1}`,
               description: String(criterion.description || '').trim(),
               weight: Number(criterion.weight) || 0,
               min_score: Number(criterion.minScore) || 0,
               max_score: Number(criterion.maxScore) || 100,
               sort_order: index,
            };

            if (existingById.has(criterion.id) && !criterion.id.startsWith('temp-')) {
               const { error } = await judgingCriteria.update(criterion.id, payload);
               if (error) throw new Error(error.message || 'Failed to update criterion');
            } else {
               const { error } = await judgingCriteria.create({
                  program_id: activeEvent.id,
                  ...payload,
               });
               if (error) throw new Error(error.message || 'Failed to create criterion');
            }
         }

         queryClient.invalidateQueries({ queryKey: queryKeys.judging.criteria(activeEvent.id) });
         setCriteriaNotice('Scorecard saved successfully.');
         toast.success('Scorecard saved');
      } catch (error: any) {
         const message = error?.message || 'Failed to save scorecard';
         setCriteriaError(message);
         toast.error(message);
      } finally {
         setCriteriaSaving(false);
      }
   };

   const submissions = shortlistOnly
      ? allSubmissions.filter(s => s.status === 'Shortlisted')
      : allSubmissions;

   const assignmentSubmissions = unscoredOnly
      ? submissions.filter(s => s.score == null)
      : submissions;

   const refreshAll = useCallback(() => {
      if (!activeEvent?.id) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.judges.all(activeEvent.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions.all(activeEvent.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.judgeGroups.all(activeEvent.id) });
      queryClient.invalidateQueries({ queryKey: ['judging', 'scores-by-round', activeEvent.id] });
   }, [activeEvent?.id, queryClient]);

   // Realtime judging progress subscription
   useEffect(() => {
      if (!activeEvent?.id) return;
      const channel = realtime.subscribeToJudgingProgress(activeEvent.id, refreshAll);
      return () => realtime.unsubscribe(channel);
   }, [activeEvent?.id]);

   const handleRemoveJudge = async (judgeId: string) => {
      const ok = await confirm({
        title: 'Remove judge?',
        description: 'This will also remove all their submission assignments. Their scored data will be preserved.',
        confirmLabel: 'Remove judge',
      });
      if (!ok) return;
      setIsRemovingJudge(judgeId);
      try {
         await db.deleteJudge(judgeId);
         refreshAll();
      } catch (error) {
         console.error('Failed to remove judge:', error);
         toast.error('Failed to remove judge. Please try again.');
      } finally {
         setIsRemovingJudge(null);
      }
   };

   const handleRemoveAllJudges = async () => {
      const ok = await confirm({
        title: `Remove all ${judges.length} judges?`,
        description: 'This will remove all submission assignments. This cannot be undone. Existing scores will be preserved.',
        confirmLabel: 'Remove all judges',
      });
      if (!ok) return;
      setIsRemovingAll(true);
      try {
         await db.deleteAllJudges(activeEvent?.id);
         refreshAll();
      } catch (error) {
         console.error('Failed to remove all judges:', error);
         toast.error('Failed to remove judges. Please try again.');
      } finally {
         setIsRemovingAll(false);
      }
   };

   const handleCreateOrUpdateGroup = async (payload: { name: string; description?: string }) => {
      if (!activeEvent?.id) return;
      setIsSavingGroup(true);
      try {
         if (groupModalGroup) {
            await db.updateJudgeGroup(groupModalGroup.id, payload);
            toast.success('Judge group updated');
         } else {
            await db.createJudgeGroup({ programId: activeEvent.id, ...payload });
            toast.success('Judge group created');
         }
         queryClient.invalidateQueries({ queryKey: queryKeys.judgeGroups.all(activeEvent.id) });
         queryClient.invalidateQueries({ queryKey: queryKeys.judges.all(activeEvent.id) });
         setIsGroupModalOpen(false);
      } catch (error: any) {
         console.error('Group save failed:', error);
         toast.error(error?.message || 'Failed to save judge group.');
         throw error;
      } finally {
         setIsSavingGroup(false);
      }
   };

   const handleDeleteGroup = async (groupId: string) => {
      const ok = await confirm({
         title: 'Delete judge group?',
         description: 'This will remove the group but retain judges. Judges will no longer be grouped.',
         confirmLabel: 'Delete group',
      });
      if (!ok) return;
      try {
         await db.deleteJudgeGroup(groupId);
         queryClient.invalidateQueries({ queryKey: queryKeys.judgeGroups.all(activeEvent?.id) });
         queryClient.invalidateQueries({ queryKey: queryKeys.judges.all(activeEvent?.id) });
         toast.success('Judge group deleted');
      } catch (error) {
         console.error('Failed to delete group:', error);
         toast.error('Failed to delete judge group. Please try again.');
      }
   };

   const handleOpenGroupView = (group: JudgeGroup) => {
      setSelectedGroup(group);
      setViewGroupModalOpen(true);
   };

   const handleRemoveJudgeFromGroup = async (judgeId: string) => {
      if (!activeEvent?.id) return;
      try {
         await db.removeJudgeFromGroup(judgeId);
         queryClient.invalidateQueries({ queryKey: queryKeys.judges.all(activeEvent.id) });
         queryClient.invalidateQueries({ queryKey: queryKeys.judgeGroups.all(activeEvent.id) });
         toast.success('Judge removed from group');
      } catch (error) {
         console.error('Failed to remove judge from group:', error);
         toast.error('Unable to remove judge from group.');
      }
   };

   const handleMoveJudgeToGroup = async (judgeId: string, targetGroupId: string) => {
      if (!activeEvent?.id) return;
      try {
         await db.assignJudgeToGroup(judgeId, targetGroupId);
         queryClient.invalidateQueries({ queryKey: queryKeys.judges.all(activeEvent.id) });
         queryClient.invalidateQueries({ queryKey: queryKeys.judgeGroups.all(activeEvent.id) });
         toast.success('Judge moved to group');
      } catch (error) {
         console.error('Failed to move judge:', error);
         toast.error('Unable to move judge to the selected group.');
      }
   };

   const toggleSelection = (id: string) => {
      setSelectedIds(prev =>
         prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
   };

   const toggleSelectAll = () => {
      const visibleIds = assignmentSubmissions.map(s => s.id);
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

      if (allVisibleSelected) {
         setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
      } else {
         setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
      }
   };

   const handleAssignJudges = async () => {
      if (selectedJudgesForBulk.length > 0 && selectedIds.length > 0) {
         await db.assignJudgesToSubmissions(selectedIds, selectedJudgesForBulk, { replaceExisting: replaceAssignments });
         refreshAll();
         setIsAssignModalOpen(false);
         setSelectedJudgesForBulk([]);
         setSelectedIds([]);
         toast.success('Judges assigned successfully');
      }
   };



   const totalWeight = criteriaDraft.reduce((sum, c) => sum + Number(c.weight || 0), 0);
   const judgeTotalPages = Math.max(1, Math.ceil(judges.length / judgesPerPage));
   const paginatedJudges = judges.slice((judgesPage - 1) * judgesPerPage, judgesPage * judgesPerPage);
   const assignableJudges = judges.length > 0 ? judges : allOrgJudges;
   const judgeDirectory = assignableJudges.length > 0 ? assignableJudges : allOrgJudges;
   const judgeNameById = new Map(judgeDirectory.map((judge) => [judge.id, judge.name]));
   const assignedSubmissions = submissions.filter((submission) => (submission.assignedJudges || []).length > 0);
   const groupNameById = new Map(judgeGroups.map((group) => [group.id, group.name]));
   const categoryNameById = new Map(categories.map((category) => [category.id, category.title]));

   const groupStats = React.useMemo(() => {
      const stats = new Map<string, { active: number; pending: number }>();
      for (const judge of judges) {
         if (!judge.groupId) continue;
         const cur = stats.get(judge.groupId) ?? { active: 0, pending: 0 };
         if (judge.status === 'Active' || judge.status === 'Completed') cur.active++;
         else if (judge.status === 'Invited') cur.pending++;
         stats.set(judge.groupId, cur);
      }
      return stats;
   }, [judges]);

   useEffect(() => {
      if (judgesPage > judgeTotalPages) {
         setJudgesPage(judgeTotalPages);
      }
   }, [judgeTotalPages, judgesPage]);

   if (!activeEvent) {
      return (
         <div className="flex items-center justify-center h-full text-slate-500">
            Select a program to manage judging.
         </div>
      );
   }

  return (
    <div className="space-y-8">
      {ConfirmDialogNode}
      <SubmissionReviewSheet
        isOpen={reviewSheetOpen}
        onClose={() => {
          setReviewSheetOpen(false);
          setSelectedSubmission(null);
        }}
        submission={selectedSubmission}
        judges={judges}
        programId={activeEvent?.id}
      />
         <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Judging Management</h1>
          <p className="text-slate-500">Track scoring progress and manage your panel.</p>
        </div>
            <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm overflow-x-auto">
           {([
              { id: 'overview', label: 'Overview' },
              { id: 'panel', label: 'Panel' },
              { id: 'scoring', label: 'Scoring' },
              { id: 'scorecard', label: 'Criteria' },
              { id: 'assignments', label: 'Assignments' },
           ] as const).map((tab) => (
              <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                         className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow' 
                    : 'text-slate-500 hover:text-slate-900'
                 }`}
              >
                 {tab.label}
              </button>
           ))}
        </div>
      </div>

      {activeTab === 'overview' && (
         <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100">
                  <div>
                     <h2 className="text-lg font-bold text-slate-900">Assigned Submissions</h2>
                     <p className="text-sm text-slate-500">Assignment details are visible directly in overview.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab('assignments')}>
                     Open Full Assignments
                  </Button>
               </div>

               {submissionsLoading ? (
                  <div className="p-5 space-y-3">
                     <SkeletonLoader className="h-12" />
                     <SkeletonLoader className="h-12" />
                     <SkeletonLoader className="h-12" />
                  </div>
               ) : assignedSubmissions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                     No assigned submissions yet. Use Assignments tab to assign judges.
                  </div>
               ) : (
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              <th className="p-4">Submission</th>
                              <th className="p-4">Applicant</th>
                              <th className="p-4">Assigned Judges</th>
                              <th className="p-4">Status</th>
                              <th className="p-4">Score</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {assignedSubmissions.map((submission) => {
                              const assignedJudgeChips = (submission.assignedJudges || []).map((judgeId, idx) => ({
                                 key: `${submission.id}-${judgeId}-${idx}`,
                                 name: judgeNameById.get(judgeId) || 'Unknown Judge',
                              }));

                              return (
                                 <tr
                                    key={submission.id}
                                    className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                                    onClick={() => {
                                       setSelectedSubmission(submission);
                                       setReviewSheetOpen(true);
                                    }}
                                    onKeyDown={(e) => {
                                       if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          setSelectedSubmission(submission);
                                          setReviewSheetOpen(true);
                                       }
                                    }}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={`View submission ${submission.title}`}
                                 >
                                    <td className="p-4">
                                       <div className="font-semibold text-slate-900 text-sm">{submission.title}</div>
                                       <div className="text-xs text-slate-500">{submission.category} · Tap to view</div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-700">{submission.applicant || '-'}</td>
                                    <td className="p-4">
                                       <div className="mb-1 text-[11px] font-semibold text-slate-500">
                                          {assignedJudgeChips.length} judge{assignedJudgeChips.length === 1 ? '' : 's'}
                                       </div>
                                       <div className="flex flex-wrap gap-1.5 max-w-[380px]">
                                          {assignedJudgeChips.map((chip) => (
                                             <span key={chip.key} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {chip.name}
                                             </span>
                                          ))}
                                       </div>
                                    </td>
                                    <td className="p-4">
                                       <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
                                          {submission.status}
                                       </span>
                                    </td>
                                    <td className="p-4 text-sm font-semibold text-slate-800">
                                       {submission.score == null ? 'Unscored' : submission.score}
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               )}
            </div>
         </div>
      )}

      {activeTab === 'panel' && (
         <div className="space-y-6" data-demo-target="judging-panel-area">
            {judgesLoading && (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => <SkeletonLoader key={i} className="h-48" />)}
               </div>
            )}
            <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center">
               <h2 className="text-lg font-bold text-slate-900">Judge Groups</h2>
               <Button
                  size="sm"
                  variant="secondary"
                  className="flex items-center justify-center gap-2 w-full lg:w-auto"
                  onClick={() => {
                     setGroupModalGroup(null);
                     setIsGroupModalOpen(true);
                  }}
               >
                  <Users className="w-4 h-4" /> Create Judge Group
               </Button>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
               <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                     <h3 className="text-sm font-semibold text-slate-900">Judge Groups</h3>
                     <p className="text-sm text-slate-500">Organize judges into groups for program-level review.</p>
                  </div>
                  <Button
                     size="sm"
                     variant="outline"
                     onClick={() => {
                        setGroupModalGroup(null);
                        setIsGroupModalOpen(true);
                     }}
                  >
                     + New Group
                  </Button>
               </div>
               {judgeGroups.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 text-center">
                     No judge groups yet. Create a group to organize judges by topic, stage, or expertise.
                  </div>
               ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                     {judgeGroups.map((group) => {
                        const stats = groupStats.get(group.id) ?? { active: 0, pending: 0 };
                        return (
                           <GroupCard
                              key={group.id}
                              group={group}
                              activeCount={stats.active}
                              pendingCount={stats.pending}
                              onAddJudge={() => {
                                 setAddJudgeTargetGroup(group);
                                 setEditJudge(null);
                                 setIsAddJudgeModalOpen(true);
                              }}
                              onView={() => handleOpenGroupView(group)}
                              onEdit={() => {
                                 setGroupModalGroup(group);
                                 setIsGroupModalOpen(true);
                              }}
                              onDelete={() => handleDeleteGroup(group.id)}
                           />
                        );
                     })}
                  </div>
               )}
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:justify-between lg:items-center">
               <h2 className="text-lg font-bold text-slate-900">Judge Panel</h2>
                      <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                           <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center justify-center gap-2 w-full sm:w-auto"
                              data-demo-target="judging-add-judge"
                                 onClick={() => {
                                    setAddJudgeTargetGroup(null);
                                    setEditJudge(null);
                                    setIsAddJudgeModalOpen(true);
                                 }}
                           >
                              <Plus className="w-4 h-4" /> Add / Invite Judge
                           </Button>
                           {judges.length > 0 && (
                              <Button
                                 size="sm"
                                 variant="outline"
                                 className="flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 w-full sm:w-auto"
                                 onClick={handleRemoveAllJudges}
                                 disabled={isRemovingAll}
                              >
                                 <Trash2 className="w-4 h-4" /> {isRemovingAll ? 'Removing...' : 'Remove All Invites'}
                              </Button>
                           )}
                      </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {paginatedJudges.map((judge, judgeIndex) => (
                  <div
                     key={judge.id}
                     data-demo-target={judgeIndex === 0 ? 'judging-judge-card-1' : undefined}
                     className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group"
                  >
                     <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                           {judge.avatar ? (
                              <img src={judge.avatar} alt={judge.name} className="w-12 h-12 rounded-full border-2 border-slate-100" />
                           ) : (
                              <div className="w-12 h-12 rounded-full border-2 border-slate-100 bg-indigo-500 flex items-center justify-center text-white text-lg font-bold">
                                 {judge.name?.charAt(0).toUpperCase() || 'J'}
                              </div>
                           )}
                           <div>
                              <div className="font-bold text-slate-900">{judge.name}</div>
                              <div className="text-xs text-slate-500">{judge.email}</div>
                              {judge.groupId && groupNameById.get(judge.groupId) && (
                                 <div className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {groupNameById.get(judge.groupId)}
                                 </div>
                              )}
                              {(judge.categoryIds || []).length > 0 && (
                                 <div className="mt-2 flex flex-wrap gap-1">
                                    {(judge.categoryIds || []).slice(0, 2).map((categoryId) => (
                                       <span key={categoryId} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                          {categoryNameById.get(categoryId) || 'Award'}
                                       </span>
                                    ))}
                                    {(judge.categoryIds || []).length > 2 && (
                                       <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                                          +{(judge.categoryIds || []).length - 2}
                                       </span>
                                    )}
                                 </div>
                              )}
                           </div>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                           judge.status === 'Active' ? 'bg-green-100 text-green-700' : 
                           judge.status === 'Completed' ? 'bg-indigo-100 text-indigo-700' : 
                           judge.status === 'Declined' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                           {judge.status}
                        </span>
                     </div>

                     <div className="mb-4">
                        <div className="flex justify-between text-xs font-semibold text-slate-500 mb-2">
                           <span>Progress</span>
                           <span>{judge.completedCount}/{judge.assignedCount}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                           <div className={`h-2 rounded-full ${
                              judge.progress === 100 ? 'bg-green-500' : 'bg-indigo-500'
                           }`} style={{ width: `${judge.progress}%` }}></div>
                        </div>
                     </div>

                     <div className="flex gap-2">
                        <button
                           className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                           title={judge.assignedCount > 0 ? undefined : 'No assignments found'}
                           disabled={judge.assignedCount === 0}
                           onClick={() => {
                              if (judge.assignedCount === 0) return;
                              setScoresOverviewJudge(judge);
                              setActiveTab('scoring');
                           }}
                        >
                           View Scores
                        </button>
                        <button
                           className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                           title="Resend invite"
                           disabled={resendingJudgeId === judge.id}
                           onClick={async () => {
                              setResendingJudgeId(judge.id);
                              try {
                                 await resendJudgeInvite(judge.id, activeEvent?.title);
                                 toast.success('Invite resent successfully');
                              } catch (err: any) {
                                 toast.error(err?.message || 'Failed to resend invite');
                              } finally {
                                 setResendingJudgeId(null);
                              }
                           }}
                        >
                           {resendingJudgeId === judge.id ? (
                              <div className="w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                           ) : (
                              <Mail className="w-4 h-4" />
                           )}
                        </button>
                        <button
                           className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-100 transition-colors"
                           onClick={() => {
                              setEditJudge(judge);
                              setAddJudgeTargetGroup(null);
                              setIsAddJudgeModalOpen(true);
                           }}
                           title="Edit judge"
                        >
                           <Sliders className="w-4 h-4" />
                        </button>
                        <button
                           className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-100 transition-colors"
                           onClick={() => handleRemoveJudge(judge.id)}
                           disabled={isRemovingJudge === judge.id}
                           title="Remove invite"
                        >
                           {isRemovingJudge === judge.id ? (
                              <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                           ) : (
                              <UserX className="w-4 h-4" />
                           )}
                        </button>
                     </div>
                  </div>
               ))}
               {paginatedJudges.length === 0 && (
                  <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                     No judges yet. Invite your first judge to begin panel reviews.
                  </div>
               )}
            </div>
            {judges.length > judgesPerPage && (
               <div className="flex items-center justify-end gap-2">
                  <button
                     onClick={() => setJudgesPage((prev) => Math.max(1, prev - 1))}
                     disabled={judgesPage === 1}
                     className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                     Prev
                  </button>
                  <span className="text-xs text-slate-500">Page {judgesPage} of {judgeTotalPages}</span>
                  <button
                     onClick={() => setJudgesPage((prev) => Math.min(judgeTotalPages, prev + 1))}
                     disabled={judgesPage >= judgeTotalPages}
                     className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                     Next
                  </button>
               </div>
            )}
         </div>
      )}

      {activeTab === 'scoring' && activeEvent?.id && (
         <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
               <div>
                  <h2 className="text-lg font-bold text-slate-900">Scoring by Round</h2>
                  <p className="text-sm text-slate-500">
                     Each round lists its judges and assigned submissions. Click an entry to open the scorecard.
                  </p>
               </div>
               {scoresOverviewJudge && (
                  <button
                     type="button"
                     onClick={() => setScoresOverviewJudge(null)}
                     className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                     Show all judges
                  </button>
               )}
            </div>
            <JudgeScoresOverviewPanel
               programId={activeEvent.id}
               submissions={allSubmissions}
               focusJudgeId={scoresOverviewJudge?.id}
               focusJudgeName={scoresOverviewJudge?.name}
               onOpenSubmission={(submission) => {
                  setSelectedSubmission(submission);
                  setReviewSheetOpen(true);
               }}
            />
         </div>
      )}

      {activeTab === 'scorecard' && (
         <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8">
            <div className="space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center mb-6">
                     <div>
                        <h2 className="text-lg font-bold text-slate-900">Scorecard Criteria</h2>
                        <p className="text-sm text-slate-500">Edit the criteria judges will see. Keep the total weight at 100%.</p>
                     </div>
                     <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={handleAddCriterion} className="flex items-center gap-2">
                           <Plus className="w-4 h-4" /> Add Criterion
                        </Button>
                        <Button size="sm" onClick={handleSaveCriteria} disabled={criteriaSaving} className="flex items-center gap-2">
                           <Settings className="w-4 h-4" /> {criteriaSaving ? 'Saving...' : 'Save Scorecard'}
                        </Button>
                     </div>
                  </div>

                  <div className="space-y-4">
                     {criteriaDraft.map((criterion, idx) => (
                        <div key={criterion.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 group">
                           <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                              <div className="flex-1 space-y-3">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                       <label className="block text-xs font-semibold text-slate-600 mb-1">Criterion name</label>
                                       <input
                                          value={criterion.name}
                                          onChange={(e) => handleCriterionChange(criterion.id, 'name', e.target.value)}
                                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                       />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-semibold text-slate-600 mb-1">Weight %</label>
                                       <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={criterion.weight}
                                          onChange={(e) => handleCriterionChange(criterion.id, 'weight', Number(e.target.value) || 0)}
                                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                       />
                                    </div>
                                 </div>

                                 <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                                    <textarea
                                       rows={2}
                                       value={criterion.description}
                                       onChange={(e) => handleCriterionChange(criterion.id, 'description', e.target.value)}
                                       className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                       <label className="block text-xs font-semibold text-slate-600 mb-1">Min score</label>
                                       <input
                                          type="number"
                                          value={criterion.minScore}
                                          onChange={(e) => handleCriterionChange(criterion.id, 'minScore', Number(e.target.value) || 0)}
                                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                       />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-semibold text-slate-600 mb-1">Max score</label>
                                       <input
                                          type="number"
                                          value={criterion.maxScore}
                                          onChange={(e) => handleCriterionChange(criterion.id, 'maxScore', Number(e.target.value) || 0)}
                                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                       />
                                    </div>
                                    <div>
                                       <label className="block text-xs font-semibold text-slate-600 mb-1">Preview weight</label>
                                       <div className="h-10 rounded-xl bg-white border border-slate-200 px-3 flex items-center gap-3">
                                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                             <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(Number(criterion.weight) || 0, 100)}%` }} />
                                          </div>
                                          <span className="text-xs font-bold text-slate-500">{criterion.weight}%</span>
                                       </div>
                                    </div>
                                 </div>
                              </div>

                              <div className="flex items-center gap-2 xl:pt-7">
                                 <button
                                    type="button"
                                    onClick={() => handleDeleteCriterion(criterion.id)}
                                    className="rounded-xl border border-red-200 bg-white p-2 text-red-500 transition-colors hover:bg-red-50"
                                    aria-label="Delete criterion"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                           <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                              <span>Criterion {idx + 1}</span>
                              <span>{criterion.minScore} to {criterion.maxScore}</span>
                           </div>
                        </div>
                     ))}
                  </div>

                  {criteriaDraft.length === 0 && (
                     <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                        No criteria yet. Add one to define how judges should score entries.
                     </div>
                  )}

                  {totalWeight !== 100 && criteriaDraft.length > 0 && (
                     <div className="mt-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        Total weight should equal 100% for a balanced scorecard. Current total: {totalWeight}%
                     </div>
                  )}

                  {criteriaNotice && (
                     <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {criteriaNotice}
                     </div>
                  )}

                  {criteriaError && (
                     <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {criteriaError}
                     </div>
                  )}
               </div>
            </div>

            <div className="space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                     <Sliders className="w-4 h-4 text-slate-400" /> Admin Guidelines
                  </h3>
                  <div className="space-y-3 text-sm text-slate-600">
                     <p className="rounded-xl bg-slate-50 border border-slate-100 p-3">Use clear, measurable criteria names. Avoid overlapping scopes so judges score consistently.</p>
                     <p className="rounded-xl bg-slate-50 border border-slate-100 p-3">Keep weights summing to 100% and use score ranges that match the judging model you want to enforce.</p>
                     <p className="rounded-xl bg-slate-50 border border-slate-100 p-3">Save changes before publishing assignments so judges see the latest rubric immediately.</p>
                  </div>
               </div>
            </div>
         </div>
      )}

         {activeTab === 'assignments' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center gap-3 flex-wrap">
                  <div>
                     <h2 className="text-lg font-bold text-slate-900">Judge Assignments</h2>
                     <p className="text-sm text-slate-500">All nominations are visible here for admin assignment.</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <button
                        onClick={() => setUnscoredOnly(prev => !prev)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${unscoredOnly
                           ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                           : 'bg-white text-slate-600 border-slate-200'
                        }`}
                     >
                        {unscoredOnly ? 'Showing Unscored Only' : 'Filter: Unscored Only'}
                     </button>

                     <Button size="sm" className="flex items-center gap-2" onClick={() => setIsAssignModalOpen(true)} disabled={selectedIds.length === 0}>
                        <Users className="w-4 h-4" /> Assign Judges{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
                     </Button>
                  </div>
               </div>

               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              <th className="p-4 w-12 text-center">
                                 <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={assignmentSubmissions.length > 0 && assignmentSubmissions.every(s => selectedIds.includes(s.id))}
                                    onChange={toggleSelectAll}
                                 />
                              </th>
                              <th className="p-4">Submission</th>
                              <th className="p-4">Category</th>
                              <th className="p-4">Status</th>
                              <th className="p-4">Assigned Judges</th>
                              <th className="p-4">Date</th>
                              <th className="p-4">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {assignmentSubmissions.map((sub) => (
                              <tr key={sub.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.includes(sub.id) ? 'bg-indigo-50/30' : ''}`}>
                                 <td className="p-4 text-center">
                                    <input
                                       type="checkbox"
                                       className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                       checked={selectedIds.includes(sub.id)}
                                       onChange={() => toggleSelection(sub.id)}
                                    />
                                 </td>
                                 <td className="p-4">
                                    <div className="font-semibold text-slate-900 text-sm">{sub.title}</div>
                                    <div className="text-xs text-slate-500">{sub.applicant}</div>
                                 </td>
                                 <td className="p-4">
                                    <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{sub.category}</span>
                                 </td>
                                 <td className="p-4">
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-100 text-slate-700 border-slate-200">
                                       {sub.status}
                                    </span>
                                 </td>
                                 <td className="p-4">
                                    <span className="text-xs text-slate-500">
                                       {(sub.assignedJudges || []).length > 0 ? `${sub.assignedJudges?.length} judge(s)` : 'Unassigned'}
                                    </span>
                                 </td>
                                 <td className="p-4">
                                    <div className="flex items-center text-sm text-slate-500">
                                       <Calendar className="w-3 h-3 mr-1.5" />
                                       {sub.date}
                                    </div>
                                 </td>
                                 <td className="p-4">
                                    <button
                                       onClick={() => { setSelectedSubmission(sub); setReviewSheetOpen(true); }}
                                       className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200"
                                    >
                                       Score Entry
                                    </button>
                                 </td>
                              </tr>
                           ))}
                           {assignmentSubmissions.length === 0 && (
                              <tr>
                                 <td colSpan={7} className="p-8 text-center text-slate-500">
                                    No submissions found for this filter.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Judges">
            <div className="space-y-4">
               <p className="text-sm text-slate-500">
                  Select judges to assign to the {selectedIds.length} selected submissions.
               </p>
               <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                     type="checkbox"
                     checked={replaceAssignments}
                     onChange={(e) => setReplaceAssignments(e.target.checked)}
                     className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Replace existing assignments
               </label>
               <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {assignableJudges.map(judge => (
                     <label key={judge.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                           {judge.avatar ? (
                              <img src={judge.avatar} alt="" className="w-8 h-8 rounded-full" />
                           ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                 {judge.name?.charAt(0).toUpperCase() || 'J'}
                              </div>
                           )}
                           <div>
                              <div className="text-sm font-bold text-slate-900">{judge.name}</div>
                              <div className="text-xs text-slate-500">{judge.email}</div>
                           </div>
                        </div>
                        <input
                           type="checkbox"
                           className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                           checked={selectedJudgesForBulk.includes(judge.id)}
                           onChange={(e) => {
                              if (e.target.checked) {
                                 setSelectedJudgesForBulk([...selectedJudgesForBulk, judge.id]);
                              } else {
                                 setSelectedJudgesForBulk(selectedJudgesForBulk.filter(id => id !== judge.id));
                              }
                           }}
                        />
                     </label>
                  ))}
                  {!allOrgJudgesLoading && assignableJudges.length === 0 && (
                     <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        No judges available yet. Add or invite a judge first.
                     </div>
                  )}
               </div>
               <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <Button type="button" variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleAssignJudges} disabled={selectedIds.length === 0 || selectedJudgesForBulk.length === 0}>Assign Selected</Button>
               </div>
            </div>
         </Modal>



         <AddJudgeToGroupModal
            isOpen={isAddJudgeModalOpen}
            onClose={() => {
               setIsAddJudgeModalOpen(false);
               setEditJudge(null);
            }}
            targetGroup={addJudgeTargetGroup}
            judgeGroups={judgeGroups}
            judges={judges}
            teamMembers={teamMembers}
            programId={activeEvent?.id ?? ''}
            programTitle={activeEvent?.title ?? 'your workspace'}
            categories={categories}
            editJudge={editJudge}
            onDone={refreshAll}
         />

         <CreateGroupModal
            isOpen={isGroupModalOpen}
            onClose={() => {
               setIsGroupModalOpen(false);
               setGroupModalGroup(null);
            }}
            onSave={handleCreateOrUpdateGroup}
            existingGroups={judgeGroups}
            initialGroup={groupModalGroup}
            isSaving={isSavingGroup}
         />

         <ViewGroupJudgesModal
            isOpen={viewGroupModalOpen}
            onClose={() => {
               setViewGroupModalOpen(false);
               setSelectedGroup(null);
            }}
            group={selectedGroup}
            judges={selectedGroup ? judges.filter((judge) => judge.groupId === selectedGroup.id) : []}
            groups={judgeGroups}
            onRemove={handleRemoveJudgeFromGroup}
            onMove={handleMoveJudgeToGroup}
         />
    </div>
  );
};
