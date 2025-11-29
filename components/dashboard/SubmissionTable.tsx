
import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Filter, Download, Eye, Calendar, Search, ChevronDown, User, Plus, CheckSquare, Trash2, CheckCircle, XCircle, Gavel } from 'lucide-react';
import { db, Submission, Judge } from '../../services/demoDb';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { motion, AnimatePresence } from 'framer-motion';

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    'Shortlisted': 'bg-purple-100 text-purple-700 border-purple-200',
    'Accepted': 'bg-green-100 text-green-700 border-green-200',
    'Rejected': 'bg-red-100 text-red-700 border-red-200',
    'Pending': 'bg-slate-100 text-slate-700 border-slate-200',
    'Under Review': 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles['Pending']}`}>
      {status}
    </span>
  );
};

export const SubmissionTable: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
  const [newSub, setNewSub] = useState({ title: '', applicant: '', category: 'General', status: 'Pending' as const });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedJudgesForBulk, setSelectedJudgesForBulk] = useState<string[]>([]);

  useEffect(() => {
    setSubmissions(db.getSubmissions());
    setJudges(db.getJudges());
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.title || !newSub.applicant) return;
    
    db.addSubmission(newSub);
    setSubmissions(db.getSubmissions());
    setIsModalOpen(false);
    setNewSub({ title: '', applicant: '', category: 'General', status: 'Pending' });
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

  const handleBulkAction = (action: 'Accept' | 'Reject' | 'Delete' | 'Shortlist' | 'AssignJudge') => {
    if (selectedIds.length === 0) return;

    if (action === 'AssignJudge') {
      setIsJudgeModalOpen(true);
      return;
    }

    if (action === 'Delete') {
      if (confirm(`Are you sure you want to delete ${selectedIds.length} submissions?`)) {
        db.bulkUpdateSubmissions(selectedIds, { delete: true } as any);
      }
    } else {
      const statusMap: any = {
        'Accept': 'Accepted',
        'Reject': 'Rejected',
        'Shortlist': 'Shortlisted'
      };
      db.bulkUpdateSubmissions(selectedIds, { status: statusMap[action] });
    }
    
    // Refresh
    setSubmissions(db.getSubmissions());
    setSelectedIds([]);
  };

  const handleAssignJudges = () => {
    if (selectedJudgesForBulk.length > 0 && selectedIds.length > 0) {
      db.bulkUpdateSubmissions(selectedIds, { assignedJudges: selectedJudgesForBulk });
      setSubmissions(db.getSubmissions());
      setIsJudgeModalOpen(false);
      setSelectedJudgesForBulk([]);
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6 relative pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Submissions</h1>
           <p className="text-slate-500">Manage entries from your local demo database.</p>
        </div>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
           </button>
           <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Submission
           </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 bg-slate-50/50">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
           </div>
           <div className="flex gap-2 overflow-x-auto">
              <button className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 font-medium flex items-center gap-2 hover:bg-slate-50">
                 <Filter className="w-4 h-4" /> Filter <ChevronDown className="w-3 h-3" />
              </button>
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="p-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        checked={selectedIds.length === submissions.length && submissions.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-4 w-12 text-center">ID</th>
                    <th className="p-4">Submission</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Judges</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {submissions.map((sub) => (
                    <tr 
                      key={sub.id} 
                      className={`hover:bg-slate-50/80 transition-colors group ${selectedIds.includes(sub.id) ? 'bg-indigo-50/30' : ''}`}
                    >
                       <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            checked={selectedIds.includes(sub.id)}
                            onChange={() => toggleSelection(sub.id)}
                          />
                       </td>
                       <td className="p-4 text-center text-xs text-slate-400">
                          {sub.id.split('-')[1]}
                       </td>
                       <td className="p-4">
                          <div className="flex items-center gap-3">
                             {sub.image && <img src={sub.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />}
                             <div>
                                <div className="font-bold text-slate-900 text-sm">{sub.title}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                   <User className="w-3 h-3" /> {sub.applicant}
                                </div>
                             </div>
                          </div>
                       </td>
                       <td className="p-4">
                          <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{sub.category}</span>
                       </td>
                       <td className="p-4">
                          <StatusBadge status={sub.status} />
                       </td>
                       <td className="p-4">
                          <div className="flex -space-x-2">
                             {(sub.assignedJudges || []).length > 0 ? (
                                <>
                                   {(sub.assignedJudges || []).slice(0, 3).map((jid, i) => {
                                      const j = judges.find(judge => judge.id === jid);
                                      return j ? (
                                         <img key={i} src={j.avatar} className="w-6 h-6 rounded-full border-2 border-white" title={j.name} alt="" />
                                      ) : null;
                                   })}
                                   {(sub.assignedJudges || []).length > 3 && (
                                      <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                         +{(sub.assignedJudges?.length || 0) - 3}
                                      </div>
                                   )}
                                </>
                             ) : (
                                <span className="text-xs text-slate-400 italic">Unassigned</span>
                             )}
                          </div>
                       </td>
                       <td className="p-4">
                          {sub.score ? (
                             <span className="font-bold text-slate-900">{sub.score}</span>
                          ) : (
                             <span className="text-slate-400 text-sm italic">--</span>
                          )}
                       </td>
                       <td className="p-4">
                          <div className="flex items-center text-sm text-slate-500">
                             <Calendar className="w-3 h-3 mr-1.5" />
                             {sub.date}
                          </div>
                       </td>
                       <td className="p-4 text-right">
                          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                             <Eye className="w-4 h-4" />
                          </button>
                       </td>
                    </tr>
                 ))}
                 {submissions.length === 0 && (
                    <tr>
                       <td colSpan={9} className="p-8 text-center text-slate-500">
                          No submissions found. Create one to get started.
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-30 flex items-center gap-6 border border-slate-700"
          >
             <div className="flex items-center gap-3 border-r border-slate-700 pr-6">
                <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                   {selectedIds.length}
                </span>
                <span className="text-sm font-medium">Selected</span>
             </div>
             
             <div className="flex items-center gap-2">
                <button onClick={() => handleBulkAction('Accept')} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium text-green-400">
                   <CheckCircle className="w-4 h-4" /> Accept
                </button>
                <button onClick={() => handleBulkAction('Reject')} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium text-red-400">
                   <XCircle className="w-4 h-4" /> Reject
                </button>
                <button onClick={() => handleBulkAction('Shortlist')} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium text-purple-400">
                   <Gavel className="w-4 h-4" /> Shortlist
                </button>
                <div className="w-px h-4 bg-slate-700 mx-2"></div>
                <button onClick={() => handleBulkAction('AssignJudge')} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium text-blue-400">
                   <User className="w-4 h-4" /> Assign Judge
                </button>
                <div className="w-px h-4 bg-slate-700 mx-2"></div>
                <button onClick={() => handleBulkAction('Delete')} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium text-slate-400 hover:text-red-400">
                   <Trash2 className="w-4 h-4" /> Delete
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Manual Submission">
         <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
              <input required className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={newSub.title} onChange={e => setNewSub({...newSub, title: e.target.value})} placeholder="Project Title" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Applicant Name</label>
              <input required className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={newSub.applicant} onChange={e => setNewSub({...newSub, applicant: e.target.value})} placeholder="Full Name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                  <select className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newSub.category} onChange={e => setNewSub({...newSub, category: e.target.value})}>
                     <option>General</option>
                     <option>Design</option>
                     <option>Technology</option>
                     <option>Sustainability</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newSub.status} onChange={e => setNewSub({...newSub, status: e.target.value as any})}>
                     <option value="Pending">Pending</option>
                     <option value="Under Review">Under Review</option>
                     <option value="Accepted">Accepted</option>
                  </select>
               </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
               <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
               <Button type="submit">Add Submission</Button>
            </div>
         </form>
      </Modal>

      {/* Assign Judge Modal */}
      <Modal isOpen={isJudgeModalOpen} onClose={() => setIsJudgeModalOpen(false)} title="Assign Judges">
         <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">
               Select judges to assign to the {selectedIds.length} selected submissions. 
               This will add them to the existing panel for these entries.
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
               {judges.map(judge => (
                  <label key={judge.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                     <div className="flex items-center gap-3">
                        <img src={judge.avatar} alt="" className="w-8 h-8 rounded-full" />
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
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
               <Button type="button" variant="ghost" onClick={() => setIsJudgeModalOpen(false)}>Cancel</Button>
               <Button onClick={handleAssignJudges}>Assign Selected</Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};
