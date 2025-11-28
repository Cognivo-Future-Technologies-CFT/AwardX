
import React, { useState, useEffect } from 'react';
import { db, Judge } from '../../services/demoDb';
import { Gavel, CheckCircle2, Clock, Mail, Plus } from 'lucide-react';
import { Button } from '../Button';

export const JudgingView: React.FC = () => {
  const [judges, setJudges] = useState<Judge[]>([]);

  useEffect(() => {
    setJudges(db.getJudges());
  }, []);

  const totalProgress = Math.round(judges.reduce((acc, curr) => acc + curr.progress, 0) / (judges.length || 1));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Judging Management</h1>
          <p className="text-slate-500">Track scoring progress and manage your panel.</p>
        </div>
        <Button className="flex items-center gap-2">
           <Plus className="w-4 h-4" /> Invite Judge
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
           <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                 <Gavel className="w-6 h-6 text-white" />
              </div>
              <div>
                 <div className="text-indigo-100 text-sm font-medium">Overall Progress</div>
                 <div className="text-2xl font-bold">{totalProgress}%</div>
              </div>
           </div>
           <div className="w-full bg-indigo-900/30 rounded-full h-2">
              <div className="bg-white h-2 rounded-full transition-all duration-1000" style={{ width: `${totalProgress}%` }}></div>
           </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-green-50 rounded-xl text-green-600">
              <CheckCircle2 className="w-6 h-6" />
           </div>
           <div>
              <div className="text-slate-500 text-sm font-medium">Completed Scores</div>
              <div className="text-2xl font-bold text-slate-900">
                 {judges.reduce((acc, curr) => acc + curr.completedCount, 0)}
              </div>
           </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
              <Clock className="w-6 h-6" />
           </div>
           <div>
              <div className="text-slate-500 text-sm font-medium">Pending Reviews</div>
              <div className="text-2xl font-bold text-slate-900">
                 {judges.reduce((acc, curr) => acc + (curr.assignedCount - curr.completedCount), 0)}
              </div>
           </div>
        </div>
      </div>

      {/* Judges Grid */}
      <h2 className="text-lg font-bold text-slate-900">Judge Panel</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {judges.map((judge) => (
            <div key={judge.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group">
               <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                     <img src={judge.avatar} alt={judge.name} className="w-12 h-12 rounded-full border-2 border-slate-100" />
                     <div>
                        <div className="font-bold text-slate-900">{judge.name}</div>
                        <div className="text-xs text-slate-500">{judge.email}</div>
                     </div>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                     judge.status === 'Active' ? 'bg-green-100 text-green-700' : 
                     judge.status === 'Completed' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
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
                  <button className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100">
                     View Scores
                  </button>
                  <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-100">
                     <Mail className="w-4 h-4" />
                  </button>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};
