
import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Filter, Download, Eye, Calendar, Search, ChevronDown, User, Plus } from 'lucide-react';
import { db, Submission } from '../../services/demoDb';
import { Modal } from '../Modal';
import { Button } from '../Button';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSub, setNewSub] = useState({ title: '', applicant: '', category: 'General', status: 'Pending' as const });

  useEffect(() => {
    setSubmissions(db.getSubmissions());
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.title || !newSub.applicant) return;
    
    db.addSubmission(newSub);
    setSubmissions(db.getSubmissions());
    setIsModalOpen(false);
    setNewSub({ title: '', applicant: '', category: 'General', status: 'Pending' });
  };

  return (
    <div className="space-y-6">
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
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">Submission</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors group">
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
                       <td colSpan={7} className="p-8 text-center text-slate-500">
                          No submissions found. Create one to get started.
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

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
    </div>
  );
};
