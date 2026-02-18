
import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Filter, Download, Eye, Calendar, Search, ChevronDown, User, Plus, CheckSquare, Trash2, CheckCircle, XCircle, Gavel, ArrowUpDown, MoreVertical, ExternalLink, Sparkles } from 'lucide-react';

import { db } from '../../services/database';
import { Submission, Judge, Program } from '../../services/models';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { motion, AnimatePresence } from 'framer-motion';
import { SubmissionDetailModal } from './SubmissionDetailModal';

const StatusBadge = ({ status }: { status: string }) => {
   const variants: any = {
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
   const [submissions, setSubmissions] = useState<Submission[]>([]);
   const [judges, setJudges] = useState<Judge[]>([]);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
   const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
   const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
   const [newSub, setNewSub] = useState({ title: '', applicant: '', category: 'General', status: 'Pending' as const });
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [selectedJudgesForBulk, setSelectedJudgesForBulk] = useState<string[]>([]);

   useEffect(() => {
      const load = async () => {
         const [subs, js] = await Promise.all([
            db.getSubmissions(activeEvent?.id),
            db.getJudges()
         ]);
         setSubmissions(subs);
         setJudges(js);
      };
      load();
   }, [activeEvent]);

   const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSub.title || !newSub.applicant) return;

      await db.addSubmission({
         ...newSub,
         programId: activeEvent?.id
      } as any);
      setSubmissions(await db.getSubmissions(activeEvent?.id));
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
         if (confirm(`Are you sure you want to delete ${selectedIds.length} submissions?`)) {
            await db.deleteSubmissions(selectedIds);
         }
      } else {
         const statusMap: any = {
            'Accept': 'Accepted',
            'Reject': 'Rejected',
            'Shortlist': 'Shortlisted'
         };
         await db.bulkUpdateSubmissions(selectedIds, { status: statusMap[action] } as any);
      }

      // Refresh
      setSubmissions(await db.getSubmissions(activeEvent?.id));
      setSelectedIds([]);
   };

   const handleAssignJudges = async () => {
      if (selectedJudgesForBulk.length > 0 && selectedIds.length > 0) {
         await db.assignJudgesToSubmissions(selectedIds, selectedJudgesForBulk);
         setSubmissions(await db.getSubmissions(activeEvent?.id));
         setIsJudgeModalOpen(false);
         setSelectedJudgesForBulk([]);
         setSelectedIds([]);
      }
   };

   return (
      <div className="space-y-8 relative pb-24">
         {/* Enhanced Header Section */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
            <div className="space-y-1">
               <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
                  Database
               </div>
               <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight leading-none">Submissions</h1>
               <p className="text-slate-500 font-medium">Manage and review entries stored in Supabase</p>
            </div>
            <div className="flex items-center gap-3">
               <button className="h-11 px-5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-bold text-sm flex items-center gap-2.5 transition-all shadow-sm shadow-slate-200/50 hover:shadow-md">
                  <Download className="w-4 h-4 text-slate-400" /> Export CSV
               </button>
               <button
                  onClick={() => setIsModalOpen(true)}
                  className="h-11 px-6 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center gap-2.5 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300"
               >
                  <Plus className="w-4 h-4" /> Add Submission
               </button>
            </div>
         </div>

         <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            {/* Premium Toolbar */}
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-white">
               <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                     type="text"
                     placeholder="Search projects, applicants, or IDs..."
                     className="w-full pl-11 pr-4 h-11 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
               </div>
               <div className="flex gap-2">
                  <button className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 font-bold flex items-center gap-2.5 hover:bg-slate-50 transition-all hover:border-slate-300">
                     <Filter className="w-4 h-4 text-slate-500" />
                     Filter
                     <span className="w-5 h-5 bg-slate-100 text-slate-500 rounded-md text-[10px] flex items-center justify-center ml-1">0</span>
                     <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button className="h-11 w-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-all">
                     <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  </button>
               </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                     <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                        <th className="p-5 w-16 text-center">
                           <div className="flex justify-center">
                              <input
                                 type="checkbox"
                                 className="w-4.5 h-4.5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
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
                     {submissions.map((sub) => (
                        <tr
                           key={sub.id}
                           className={`hover:bg-slate-50/50 transition-all group ${selectedIds.includes(sub.id) ? 'bg-indigo-50/40' : ''}`}
                        >
                           <td className="p-5 text-center">
                              <div className="flex justify-center">
                                 <input
                                    type="checkbox"
                                    className="w-4.5 h-4.5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                    checked={selectedIds.includes(sub.id)}
                                    onChange={() => toggleSelection(sub.id)}
                                 />
                              </div>
                           </td>
                           <td className="p-5">
                              <span className="font-mono text-xs text-slate-400 px-2 py-1 bg-slate-50 rounded-md border border-slate-100">
                                 {sub.id.split('-')[1]}
                              </span>
                           </td>
                           <td className="p-5">
                              <div className="flex items-center gap-4">
                                 <div className="relative group/image">
                                    {sub.image ? (
                                       <img src={sub.image} alt="" className="w-11 h-11 rounded-xl object-cover border border-slate-200/60 shadow-sm" />
                                    ) : (
                                       <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200/60">
                                          <Sparkles className="w-5 h-5 text-slate-400" />
                                       </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/image:opacity-100 rounded-xl transition-opacity pointer-events-none"></div>
                                 </div>
                                 <div className="space-y-0.5">
                                    <div className="font-extrabold text-slate-900 text-[15px] group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => handleView(sub)}>
                                       {sub.title}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                       <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                       {sub.applicant}
                                    </div>
                                 </div>
                              </div>
                           </td>
                           <td className="p-5">
                              <div className="inline-flex items-center px-2 py-1 bg-slate-50 text-slate-600 text-[11px] font-bold rounded-lg border border-slate-100">
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
                                             <img key={i} src={j.avatar} className="w-7 h-7 rounded-full border-2 border-white ring-1 ring-slate-100 shadow-sm object-cover" title={j.name} alt="" />
                                          ) : null;
                                       })}
                                       {(sub.assignedJudges || []).length > 3 && (
                                          <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center text-[9px] text-slate-500 font-bold shadow-sm">
                                             +{(sub.assignedJudges?.length || 0) - 3}
                                          </div>
                                       )}
                                    </>
                                 ) : (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 italic font-medium">
                                       <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                       Unassigned
                                    </div>
                                 )}
                              </div>
                           </td>
                           <td className="p-5">
                              {sub.score ? (
                                 <div className="flex items-baseline gap-0.5">
                                    <span className="text-[17px] font-black text-slate-950 tracking-tighter">{sub.score}</span>
                                    <span className="text-[10px] text-slate-400 font-bold">/100</span>
                                 </div>
                              ) : (
                                 <span className="text-slate-300 text-sm font-medium">--</span>
                              )}
                           </td>
                           <td className="p-5">
                              <div className="flex flex-col">
                                 <div className="text-xs font-bold text-slate-900 tracking-tight">
                                    {sub.date.split('-').slice(1).join('/')}/{sub.date.split('-')[0].slice(2)}
                                 </div>
                                 <div className="text-[10px] text-slate-400 font-medium capitalize">
                                    Submitted
                                 </div>
                              </div>
                           </td>
                           <td className="p-5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                 <button
                                    onClick={() => handleView(sub)}
                                    className="p-2 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-400 transition-all hover:shadow-sm border border-transparent hover:border-slate-100"
                                    title="View Details"
                                 >
                                    <Eye className="w-4.5 h-4.5" />
                                 </button>
                                 <button
                                    className="p-2 hover:bg-white hover:text-slate-900 rounded-lg text-slate-400 transition-all hover:shadow-sm border border-transparent hover:border-slate-100"
                                    title="More Actions"
                                 >
                                    <MoreVertical className="w-4.5 h-4.5" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     ))}
                     {submissions.length === 0 && (
                        <tr>
                           <td colSpan={9} className="p-20 text-center">
                              <div className="max-w-xs mx-auto space-y-4">
                                 <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                    <Search className="w-8 h-8" />
                                 </div>
                                 <div className="space-y-1">
                                    <div className="text-lg font-extrabold text-slate-900">No entries found</div>
                                    <p className="text-sm text-slate-500 font-medium">There are currently no submissions for this program workspace.</p>
                                 </div>
                                 <Button onClick={() => setIsModalOpen(true)} size="sm">Create First Entry</Button>
                              </div>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
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
                     <button onClick={() => handleBulkAction('Accept')} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-emerald-400 flex items-center gap-2 group">
                        <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> ACCEPT
                     </button>
                     <button onClick={() => handleBulkAction('Reject')} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-rose-400 flex items-center gap-2 group">
                        <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> REJECT
                     </button>
                     <button onClick={() => handleBulkAction('Shortlist')} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-purple-400 flex items-center gap-2 group">
                        <Gavel className="w-4 h-4 group-hover:scale-110 transition-transform" /> SHORTLIST
                     </button>
                     <div className="w-px h-6 bg-slate-800 mx-3"></div>
                     <button onClick={() => handleBulkAction('AssignJudge')} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-blue-400 flex items-center gap-2 group">
                        <User className="w-4 h-4 group-hover:scale-110 transition-transform" /> ASSIGN JUDGES
                     </button>
                     <div className="w-px h-6 bg-slate-800 mx-3"></div>
                     <button onClick={() => handleBulkAction('Delete')} className="px-4 py-2 hover:bg-rose-950/30 rounded-xl transition-all text-xs font-black text-slate-500 hover:text-rose-400 flex items-center gap-2 group">
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
                              <img src={judge.avatar} alt="" className="w-10 h-10 rounded-xl shadow-sm border border-slate-200 group-hover:border-indigo-200 transition-colors" />
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
                              className="w-6 h-6 text-indigo-600 rounded-lg focus:ring- indigo-500 border-slate-300 transition-all cursor-pointer accent-indigo-600"
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

