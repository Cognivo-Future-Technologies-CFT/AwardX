
import React, { useEffect, useMemo, useState } from 'react';
import { useConfirm } from '../ConfirmDialog';
import { Filter, Download, Eye, Calendar, Search, ChevronDown, ChevronLeft, ChevronRight, User, Plus, Trash2, CheckCircle, XCircle, Gavel, ArrowUpDown, MoreVertical, Sparkles } from 'lucide-react';

import { db } from '../../services/database';
import { Program, Submission } from '../../services/models';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { motion, AnimatePresence } from 'framer-motion';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '../SkeletonLoader';
import { realtime } from '../../services/supabase';
import { queryKeys } from '../../services/queryKeys';

const StatusBadge = ({ status }: { status: string }) => {
   const variants: Record<string, { container: string; icon: React.ReactNode; dot: string }> = {
      'Shortlisted': {
         container: 'bg-purple-50 text-purple-700 border-purple-100/50',
         icon: <Gavel className="w-3 h-3" />,
         dot: 'bg-purple-400'
      },
      'Accepted': {
         container: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
         icon: <CheckCircle className="w-3 h-3" />,
         dot: 'bg-emerald-400'
      },
      'Rejected': {
         container: 'bg-rose-50 text-rose-700 border-rose-100/50',
         icon: <XCircle className="w-3 h-3" />,
         dot: 'bg-rose-400'
      },
      'Pending': {
         container: 'bg-slate-50 text-slate-600 border-slate-200/50',
         icon: <Calendar className="w-3 h-3" />,
         dot: 'bg-slate-400'
      },
      'Under Review': {
         container: 'bg-blue-50 text-blue-700 border-blue-100/50',
         icon: <Search className="w-3 h-3" />,
         dot: 'bg-blue-400'
      },
   };

   const variant = variants[status] || variants['Pending'];

   return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border leading-none tracking-tight ${variant.container}`}>
         {variant.icon}
         {status}
      </span>
   );
};

interface SubmissionTableProps {
   activeEvent?: Program | null;
}

export const SubmissionTable: React.FC<SubmissionTableProps> = ({ activeEvent }) => {
   const queryClient = useQueryClient();
   const { confirm, ConfirmDialogNode } = useConfirm();
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
   const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
   const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
   const [newSub, setNewSub] = useState({ title: '', applicant: '', category: 'General', status: 'Pending' as const });
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [selectedJudgesForBulk, setSelectedJudgesForBulk] = useState<string[]>([]);
   const [isBulkProcessing, setIsBulkProcessing] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');
   const [page, setPage] = useState(1);
   const pageSize = 15;

   useEffect(() => {
      const timer = window.setTimeout(() => {
         setDebouncedSearch(searchTerm.trim());
      }, 300);

      return () => {
         window.clearTimeout(timer);
      };
   }, [searchTerm]);

   useEffect(() => {
      setPage(1);
   }, [debouncedSearch, activeEvent?.id]);

   useEffect(() => {
      setSelectedIds([]);
   }, [page]);

   const submissionsQuery = useQuery({
      queryKey: queryKeys.submissions.paginated(activeEvent?.id ?? 'all', page, debouncedSearch),
      queryFn: () => db.getSubmissionsPaginated({
         programId: activeEvent?.id,
         page,
         pageSize,
         search: debouncedSearch,
      }),
      staleTime: 30_000,
   });

   const judgesQuery = useQuery({
      queryKey: queryKeys.judges.all(activeEvent?.id ?? 'all'),
      queryFn: () => db.getJudges(activeEvent?.id),
      staleTime: 30_000,
   });

   useEffect(() => {
      if (!activeEvent?.id) return;

      const channel = realtime.subscribeToSubmissions(activeEvent.id, () => {
         queryClient.invalidateQueries({ queryKey: queryKeys.submissions.paginated(activeEvent.id, page, debouncedSearch) });
      });

      return () => {
         realtime.unsubscribe(channel);
      };
   }, [activeEvent?.id, queryClient]);

   const submissions = submissionsQuery.data?.items || [];
   const judges = judgesQuery.data || [];
   const total = submissionsQuery.data?.total || 0;
   const totalPages = Math.max(1, Math.ceil(total / pageSize));
   const isLoading = submissionsQuery.isLoading || judgesQuery.isLoading;
   const isSearching = debouncedSearch.length > 0;

   const visiblePageNumbers = useMemo(() => {
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, start + 4);
      return Array.from({ length: end - start + 1 }).map((_, idx) => start + idx);
   }, [page, totalPages]);

   const showingStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
   const showingEnd = Math.min(page * pageSize, total);

   const refreshSubmissions = async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.submissions.paginated(activeEvent?.id ?? 'all', page, debouncedSearch) });
      setSelectedIds([]);
   };

   const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSub.title || !newSub.applicant) return;

      await db.addSubmission({
         ...newSub,
         programId: activeEvent?.id
      } as any);
      await refreshSubmissions();
      setIsModalOpen(false);
      setNewSub({ title: '', applicant: '', category: 'General', status: 'Pending' });
   };

   const handleView = (submission: Submission) => {
      setSelectedSubmission(submission);
      setIsDetailModalOpen(true);
   };

   const toggleSelection = (id: string) => {
      setSelectedIds(prev =>
         prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
   };

   const toggleSelectAll = () => {
      if (selectedIds.length === submissions.length) {
         setSelectedIds([]);
      } else {
         setSelectedIds(submissions.map(s => s.id));
      }
   };

   const handleBulkAction = async (action: 'Accept' | 'Reject' | 'Delete' | 'Shortlist' | 'AssignJudge') => {
      if (selectedIds.length === 0) return;

      if (action === 'AssignJudge') {
         setIsJudgeModalOpen(true);
         return;
      }

      if (action === 'Delete') {
         const ok = await confirm({
           title: `Delete ${selectedIds.length} submission${selectedIds.length > 1 ? 's' : ''}?`,
           description: 'This action cannot be undone. All associated data including scores and judge comments will be removed.',
           confirmLabel: `Delete ${selectedIds.length} submission${selectedIds.length > 1 ? 's' : ''}`,
         });
         if (!ok) return;
      }

      setIsBulkProcessing(true);
      try {
         if (action === 'Delete') {
            await db.deleteSubmissions(selectedIds);
         } else {
            const statusMap: any = { 'Accept': 'Accepted', 'Reject': 'Rejected', 'Shortlist': 'Shortlisted' };
            await db.bulkUpdateSubmissions(selectedIds, { status: statusMap[action] } as any);
         }
         await refreshSubmissions();
      } finally {
         setIsBulkProcessing(false);
      }
   };

   const handleAssignJudges = async () => {
      if (selectedJudgesForBulk.length > 0 && selectedIds.length > 0) {
         await db.assignJudgesToSubmissions(selectedIds, selectedJudgesForBulk);
         await refreshSubmissions();
         setIsJudgeModalOpen(false);
         setSelectedJudgesForBulk([]);
      }
   };

   const handleExportCsv = async () => {
      const exported = await db.getSubmissionsPaginated({
         programId: activeEvent?.id,
         page: 1,
         pageSize: 1000,
         search: debouncedSearch,
      });

      if (exported.items.length === 0) {
         return;
      }

      const header = ['id', 'title', 'applicant', 'category', 'status', 'score', 'date', 'votes'];
      const rows = exported.items.map((item) => [
         item.id,
         item.title,
         item.applicant,
         item.category,
         item.status,
         item.score ?? '',
         item.date,
         item.votes ?? 0,
      ]);

      const csv = [header, ...rows]
         .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
         .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeEvent?.title || 'submissions'}-export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
   };

   return (
      <div className="space-y-8 relative pb-24">
         {ConfirmDialogNode}
         {/* Enhanced Header Section */}
         <div className="flex flex-col gap-5 px-1 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
               <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  Submission workspace
               </div>
               <div className="space-y-2">
                  <h1 className="text-4xl font-black tracking-tight text-slate-950 leading-none">Submissions</h1>
                  <p className="max-w-2xl text-sm font-medium leading-6 text-slate-500">
                     Review entries, assess status at a glance, and move quickly from search to action.
                  </p>
               </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
               <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <div className="flex h-8 min-w-8 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-700">{total}</div>
                  <div className="leading-tight">
                     <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Total entries</div>
                     <div className="text-sm font-semibold text-slate-900">{selectedIds.length} selected</div>
                  </div>
               </div>
               <button
                  onClick={handleExportCsv}
                  className="h-11 px-5 bg-white border border-slate-200 rounded-2xl text-slate-700 hover:bg-slate-50 font-bold text-sm flex items-center gap-2.5 transition-all shadow-sm shadow-slate-200/50 hover:shadow-md"
               >
                  <Download className="w-4 h-4 text-slate-400" /> Export CSV
               </button>
               <button
                  onClick={() => setIsModalOpen(true)}
                  className="h-11 px-6 bg-slate-950 text-white rounded-2xl font-bold text-sm flex items-center gap-2.5 hover:bg-indigo-600 transition-all shadow-lg shadow-slate-950/15 hover:shadow-indigo-300"
               >
                  <Plus className="w-4 h-4" /> Add Submission
               </button>
            </div>
         </div>

         <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            {/* Premium Toolbar */}
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/40 p-5 sm:flex-row sm:items-center">
               <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                     type="text"
                     placeholder="Search projects, applicants, or IDs..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm font-medium placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
               </div>
               <div className="flex gap-2">
                  <button className="h-11 px-4 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 font-bold flex items-center gap-2.5 hover:bg-slate-50 transition-all hover:border-slate-300">
                     <Filter className="w-4 h-4 text-slate-500" />
                     Filter
                     <span className="w-5 h-5 bg-slate-100 text-slate-500 rounded-md text-[10px] flex items-center justify-center ml-1">0</span>
                     <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button className="h-11 w-11 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all">
                     <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  </button>
               </div>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
               {isLoading && (
                  <div className="p-4">
                     <TableSkeleton rows={4} columns={1} />
                  </div>
               )}
               {!isLoading && submissions.map((sub) => (
                  <div key={sub.id} className="p-4 space-y-3">
                     <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                           <input
                              type="checkbox"
                              className="mt-1 w-4.5 h-4.5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                              checked={selectedIds.includes(sub.id)}
                              onChange={() => toggleSelection(sub.id)}
                           />
                           <div className="min-w-0">
                              <button
                                 onClick={() => handleView(sub)}
                                 className="block truncate text-left text-sm font-extrabold text-slate-900 hover:text-indigo-600"
                              >
                                 {sub.title}
                              </button>
                              <p className="mt-0.5 truncate text-xs text-slate-500">{sub.applicant}</p>
                           </div>
                        </div>
                        <StatusBadge status={sub.status} />
                     </div>

                     <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                           <p className="font-bold uppercase tracking-wide text-slate-500">Category</p>
                           <p className="mt-1 font-semibold text-slate-700">{sub.category}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                           <p className="font-bold uppercase tracking-wide text-slate-500">Score</p>
                           <p className="mt-1 font-semibold text-slate-700">{sub.score ? `${sub.score}/100` : '--'}</p>
                        </div>
                     </div>

                     <div className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-500">
                           {(sub.assignedJudges || []).length} judge{(sub.assignedJudges || []).length === 1 ? '' : 's'} assigned
                        </p>
                        <button
                           onClick={() => handleView(sub)}
                           className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                        >
                           <Eye className="w-3.5 h-3.5" /> View
                        </button>
                     </div>
                  </div>
               ))}
               {!isLoading && submissions.length === 0 && (
                  <div className="p-10 text-center">
                     <div className="text-lg font-extrabold text-slate-900">
                        {isSearching ? 'No matching entries' : 'No entries found'}
                     </div>
                     <p className="mt-1 text-sm text-slate-500 font-medium">
                        {isSearching
                           ? 'Try a different keyword for title, applicant name, or email.'
                           : 'There are currently no submissions for this program workspace.'}
                     </p>
                     <Button onClick={() => setIsModalOpen(true)} size="sm" className="mt-4">Create First Entry</Button>
                  </div>
               )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
               <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                     <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        <th className="p-5 w-16 text-center">
                           <div className="flex justify-center">
                              <input
                                 type="checkbox"
                                 className="w-4.5 h-4.5 cursor-pointer rounded-md border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500"
                                 checked={selectedIds.length === submissions.length && submissions.length > 0}
                                 onChange={toggleSelectAll}
                              />
                           </div>
                        </th>
                        <th className="p-5 w-20">ID</th>
                        <th className="p-5">Submission</th>
                        <th className="p-5">Category</th>
                        <th className="p-5">Status</th>
                        <th className="p-5">Judges</th>
                        <th className="p-5">Score</th>
                        <th className="p-5">Date</th>
                        <th className="p-5 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {isLoading && (
                        <tr>
                           <td colSpan={9}>
                              <TableSkeleton rows={6} columns={9} />
                           </td>
                        </tr>
                     )}
                     {!isLoading && submissions.map((sub) => (
                        <tr
                           key={sub.id}
                           className={`group border-b border-slate-50 transition-all hover:bg-slate-50/70 ${selectedIds.includes(sub.id) ? 'bg-indigo-50/50' : ''}`}
                        >
                           <td className="p-5 text-center">
                              <div className="flex justify-center">
                                 <input
                                    type="checkbox"
                                    className="w-4.5 h-4.5 cursor-pointer rounded-md border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500"
                                    checked={selectedIds.includes(sub.id)}
                                    onChange={() => toggleSelection(sub.id)}
                                 />
                              </div>
                           </td>
                           <td className="p-5">
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-semibold text-slate-500">
                                 {sub.id.split('-')[1]}
                              </span>
                           </td>
                           <td className="p-5">
                              <div className="flex items-center gap-4">
                                 <div className="relative group/image shrink-0">
                                    {sub.image ? (
                                       <img src={sub.image} alt="" className="h-11 w-11 rounded-2xl object-cover border border-slate-200/60 shadow-sm" />
                                    ) : (
                                       <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-100">
                                          <Sparkles className="w-5 h-5 text-slate-400" />
                                       </div>
                                    )}
                                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-black/5 opacity-0 transition-opacity group-hover/image:opacity-100"></div>
                                 </div>
                                 <div className="min-w-0 space-y-0.5">
                                    <div className="cursor-pointer text-[15px] font-extrabold text-slate-900 transition-colors group-hover:text-indigo-600" onClick={() => handleView(sub)}>
                                       {sub.title}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                       <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                       {sub.applicant}
                                    </div>
                                 </div>
                              </div>
                           </td>
                           <td className="p-5">
                              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm shadow-slate-50">
                                 {sub.category}
                              </div>
                           </td>
                           <td className="p-5">
                              <StatusBadge status={sub.status} />
                           </td>
                           <td className="p-5">
                              <div className="flex items-center -space-x-2">
                                 {(sub.assignedJudges || []).length > 0 ? (
                                    <>
                                       {(sub.assignedJudges || []).slice(0, 3).map((jid, i) => {
                                          const j = judges.find(judge => judge.id === jid);
                                          return j ? (
                                             j.avatar ? (
                                                <img key={i} src={j.avatar} className="w-7 h-7 rounded-full border-2 border-white ring-1 ring-slate-100 shadow-sm object-cover" title={j.name} alt="" />
                                             ) : (
                                                <div key={i} className="w-7 h-7 rounded-full border-2 border-white ring-1 ring-slate-100 shadow-sm bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold" title={j.name}>
                                                   {j.name?.charAt(0).toUpperCase() || 'J'}
                                                </div>
                                             )
                                          ) : null;
                                       })}
                                       {(sub.assignedJudges || []).length > 3 && (
                                          <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center text-[9px] text-slate-500 font-bold shadow-sm">
                                             +{(sub.assignedJudges?.length || 0) - 3}
                                          </div>
                                       )}
                                    </>
                                 ) : (
                                    <div className="flex items-center gap-1.5 text-[11px] italic font-medium text-slate-400">
                                       <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                       Unassigned
                                    </div>
                                 )}
                              </div>
                           </td>
                           <td className="p-5">
                              {sub.score ? (
                                 <div className="space-y-1.5">
                                    <div className="flex items-baseline gap-0.5">
                                       <span className="text-[17px] font-black tracking-tighter text-slate-950">{sub.score}</span>
                                       <span className="text-[10px] font-bold text-slate-400">/100</span>
                                    </div>
                                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                       <div
                                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                                          style={{ width: `${Math.max(0, Math.min(100, sub.score))}%` }}
                                       />
                                    </div>
                                 </div>
                              ) : (
                                 <span className="text-sm font-medium text-slate-300">--</span>
                              )}
                           </td>
                           <td className="p-5">
                              <div className="flex flex-col">
                                 <div className="text-xs font-bold tracking-tight text-slate-900">
                                    {sub.date.split('-').slice(1).join('/')}/{sub.date.split('-')[0].slice(2)}
                                 </div>
                                 <div className="text-[10px] font-medium capitalize text-slate-400">
                                    Submitted
                                 </div>
                              </div>
                           </td>
                           <td className="p-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                 <button
                                    onClick={() => handleView(sub)}
                                    className="rounded-xl border border-transparent p-2 text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-indigo-600 hover:shadow-sm"
                                    title="View Details"
                                 >
                                    <Eye className="w-4.5 h-4.5" />
                                 </button>
                                 <button
                                    className="rounded-xl border border-transparent p-2 text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                                    title="More Actions"
                                 >
                                    <MoreVertical className="w-4.5 h-4.5" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                     {!isLoading && submissions.length === 0 && (
                        <tr>
                           <td colSpan={9} className="p-20 text-center">
                              <div className="max-w-xs mx-auto space-y-4">
                                 <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                    <Search className="w-8 h-8" />
                                 </div>
                                 <div className="space-y-1">
                                    <div className="text-lg font-extrabold text-slate-900">
                                       {isSearching ? 'No matching entries' : 'No entries found'}
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">
                                       {isSearching
                                          ? 'Try a different keyword for title, applicant name, or email.'
                                          : 'There are currently no submissions for this program workspace.'}
                                    </p>
                                 </div>
                                 <Button onClick={() => setIsModalOpen(true)} size="sm">Create First Entry</Button>
                              </div>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
               <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Showing {showingStart}-{showingEnd} of {total}
               </p>
               <div className="flex items-center gap-2">
                  <button
                     onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                     disabled={page === 1}
                     className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                     <ChevronLeft className="w-4 h-4" />
                     Prev
                  </button>
                  {visiblePageNumbers.map((pageNumber) => (
                     <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        className={`h-9 w-9 rounded-xl border text-sm font-bold transition-colors ${
                           pageNumber === page
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                     >
                        {pageNumber}
                     </button>
                  ))}
                  <button
                     onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                     disabled={page >= totalPages}
                     className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                     Next
                     <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
         </div>

         {/* Premium Floating Actions */}
         <AnimatePresence>
            {selectedIds.length > 0 && (
               <motion.div
                  initial={{ y: 100, opacity: 0, x: '-50%' }}
                  animate={{ y: 0, opacity: 1, x: '-50%' }}
                  exit={{ y: 100, opacity: 0, x: '-50%' }}
                  className="fixed bottom-10 left-1/2 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 flex items-center gap-6 border border-slate-800 backdrop-blur-md bg-opacity-95"
               >
                  <div className="flex items-center gap-4 border-r border-slate-800 pr-6">
                     <div className="w-9 h-9 bg-indigo-600 text-white text-sm font-black flex items-center justify-center rounded-xl shadow-lg shadow-indigo-500/20">
                        {selectedIds.length}
                     </div>
                     <div className="flex flex-col leading-none">
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Selected</span>
                        <span className="text-[10px] text-slate-400 font-bold">Submissions</span>
                     </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                     {isBulkProcessing && (
                        <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                     )}
                     <button onClick={() => handleBulkAction('Accept')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-emerald-400 flex items-center gap-2 group disabled:opacity-40">
                        <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> ACCEPT
                     </button>
                     <button onClick={() => handleBulkAction('Reject')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-rose-400 flex items-center gap-2 group disabled:opacity-40">
                        <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> REJECT
                     </button>
                     <button onClick={() => handleBulkAction('Shortlist')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-purple-400 flex items-center gap-2 group disabled:opacity-40">
                        <Gavel className="w-4 h-4 group-hover:scale-110 transition-transform" /> SHORTLIST
                     </button>
                     <div className="w-px h-6 bg-slate-800 mx-3"></div>
                     <button onClick={() => handleBulkAction('AssignJudge')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-blue-400 flex items-center gap-2 group disabled:opacity-40">
                        <User className="w-4 h-4 group-hover:scale-110 transition-transform" /> ASSIGN JUDGES
                     </button>
                     <div className="w-px h-6 bg-slate-800 mx-3"></div>
                     <button onClick={() => handleBulkAction('Delete')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-rose-950/30 rounded-xl transition-all text-xs font-black text-slate-500 hover:text-rose-400 flex items-center gap-2 group disabled:opacity-40">
                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> DELETE
                     </button>
                  </div>

                  <button
                     onClick={() => setSelectedIds([])}
                     className="ml-6 w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400"
                  >
                     <XCircle className="w-4 h-4" />
                  </button>
               </motion.div>
            )}
         </AnimatePresence>

         {/* Create Modal - Kept same logic, updated styling slightly */}
         <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Manual Submission Entry">
            <form onSubmit={handleCreate} className="space-y-5 p-2">
               <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex gap-4 items-start mb-2">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-indigo-100 shrink-0">
                     <Sparkles className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="space-y-1">
                     <div className="text-sm font-black text-indigo-900 leading-none">Direct Entry Mode</div>
                     <p className="text-xs text-indigo-600/70 font-medium">Manually bypass the public entry form to record an existing submission.</p>
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Project Title</label>
                  <input required className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium transition-all"
                     value={newSub.title} onChange={e => setNewSub({ ...newSub, title: e.target.value })} placeholder="Enter project or submission name" />
               </div>
               <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Applicant Reference</label>
                  <input required className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium transition-all"
                     value={newSub.applicant} onChange={e => setNewSub({ ...newSub, applicant: e.target.value })} placeholder="Full name or company name" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                     <select className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm transition-all"
                        value={newSub.category} onChange={e => setNewSub({ ...newSub, category: e.target.value })}>
                        <option>General</option>
                        <option>Design</option>
                        <option>Technology</option>
                        <option>Sustainability</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Initial Status</label>
                     <select className="w-full px-5 h-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm transition-all text-slate-700"
                        value={newSub.status} onChange={e => setNewSub({ ...newSub, status: e.target.value as any })}>
                        <option value="Pending">Pending Review</option>
                        <option value="Under Review">Active Review</option>
                        <option value="Accepted">Pre-Accepted</option>
                     </select>
                  </div>
               </div>
               <div className="pt-6 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 h-12 font-bold text-sm text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                  <button type="submit" className="px-8 h-12 bg-slate-950 text-white font-black text-sm rounded-xl shadow-lg shadow-slate-200 hover:bg-indigo-600 transition-all">Initialize Entry</button>
               </div>
            </form>
         </Modal>

         {/* Assign Judge Modal - Updated styling */}
         <Modal isOpen={isJudgeModalOpen} onClose={() => setIsJudgeModalOpen(false)} title="Panel Assignment">
            <div className="space-y-6">
               <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-4 items-start">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-blue-100 shrink-0">
                     <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                     <div className="text-sm font-black text-blue-900 leading-none">Bulk Judge Assignment</div>
                     <p className="text-xs text-blue-600/70 font-medium tracking-tight">Assigning panel members to <strong>{selectedIds.length}</strong> selected entries.</p>
                  </div>
               </div>

               <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {judges.map(judge => (
                     <label key={judge.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-all hover:border-indigo-100 group">
                        <div className="flex items-center gap-4">
                           <div className="relative">
                              {judge.avatar ? (
                                 <img src={judge.avatar} alt="" className="w-10 h-10 rounded-xl shadow-sm border border-slate-200 group-hover:border-indigo-200 transition-colors" />
                              ) : (
                                 <div className="w-10 h-10 rounded-xl shadow-sm border border-slate-200 group-hover:border-indigo-200 transition-colors bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                                    {judge.name?.charAt(0).toUpperCase() || 'J'}
                                 </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                           </div>
                           <div>
                              <div className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">{judge.name}</div>
                              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{judge.email}</div>
                           </div>
                        </div>
                        <div className="relative flex items-center">
                              <input
                                 type="checkbox"
                                 className="w-6 h-6 cursor-pointer rounded-lg border-slate-300 text-indigo-600 accent-indigo-600 transition-all focus:ring-indigo-500"
                              checked={selectedJudgesForBulk.includes(judge.id)}
                              onChange={(e) => {
                                 if (e.target.checked) {
                                    setSelectedJudgesForBulk([...selectedJudgesForBulk, judge.id]);
                                 } else {
                                    setSelectedJudgesForBulk(selectedJudgesForBulk.filter(id => id !== judge.id));
                                 }
                              }}
                           />
                        </div>
                     </label>
                  ))}
               </div>
               <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsJudgeModalOpen(false)} className="px-6 h-12 font-bold text-sm text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                  <button
                     onClick={handleAssignJudges}
                     disabled={selectedJudgesForBulk.length === 0}
                     className="px-8 h-12 bg-slate-950 text-white font-black text-sm rounded-xl shadow-lg shadow-slate-200 hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     Confirm Assignment
                  </button>
               </div>
            </div>
         </Modal>

         {/* Submission Detail Modal */}
         <SubmissionDetailModal
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            submission={selectedSubmission}
         />
      </div>
   );
};

