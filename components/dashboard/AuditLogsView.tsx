
import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import { Log } from '../../services/models';
import { Search, Filter, Clock, Activity, AlertCircle, CheckCircle2, User, RefreshCw } from 'lucide-react';
import { UserHoverCard } from '../UserHoverCard';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await db.getLogs();
      setLogs(data);
    };
    load();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'create': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'update': return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'delete': return <TrashIcon className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  // Helper icon for delete since Lucide Trash2 is usually used
  const TrashIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
  );

  return (
    <div className="space-y-6">
      <div>
         <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
         <p className="text-slate-500">Track all system activity and security events.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50/50 items-center">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input type="text" placeholder="Search logs..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="flex gap-2">
               <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 text-slate-600">
                  <Filter className="w-4 h-4" /> Type
               </button>
               <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 text-slate-600">
                  <User className="w-4 h-4" /> User
               </button>
               <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 text-slate-600">
                  <Clock className="w-4 h-4" /> Date Range
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                     <th className="p-4 pl-6 w-1/4">Action</th>
                     <th className="p-4 w-1/4">User</th>
                     <th className="p-4 w-1/3">Details</th>
                     <th className="p-4 text-right w-1/6">Time</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                     <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4 pl-6">
                           <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-opacity-10 border border-opacity-20 ${
                                 log.type === 'create' ? 'bg-green-500 border-green-500' :
                                 log.type === 'update' ? 'bg-blue-500 border-blue-500' :
                                 log.type === 'delete' ? 'bg-red-500 border-red-500' :
                                 'bg-orange-500 border-orange-500'
                              }`}>
                                 {getTypeIcon(log.type)}
                              </div>
                              <span className="font-semibold text-slate-900 text-sm">{log.action}</span>
                           </div>
                        </td>
                        <td className="p-4">
                           {log.user !== 'Unknown' ? (
                              <UserHoverCard user={{ name: log.user, avatar: log.userAvatar, role: 'Team Member' }}>
                                 <div className="flex items-center gap-2 cursor-pointer">
                                    {log.userAvatar ? (
                                       <img src={log.userAvatar} alt="" className="w-6 h-6 rounded-full border border-slate-200" />
                                    ) : (
                                       <div className="w-6 h-6 rounded-full border border-slate-200 bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                                          {log.user?.charAt(0).toUpperCase() || 'U'}
                                       </div>
                                    )}
                                    <span className="text-sm text-slate-600 font-medium hover:text-indigo-600 hover:underline">{log.user}</span>
                                 </div>
                              </UserHoverCard>
                           ) : (
                              <div className="flex items-center gap-2 text-slate-400 italic text-sm">
                                 <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">?</div>
                                 Unknown
                              </div>
                           )}
                        </td>
                        <td className="p-4 text-sm text-slate-500 font-mono">
                           {log.details}
                        </td>
                        <td className="p-4 text-right text-xs text-slate-400">
                           {log.timestamp}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-center">
            <button className="text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors">
               Load older logs
            </button>
         </div>
      </div>
    </div>
  );
};
