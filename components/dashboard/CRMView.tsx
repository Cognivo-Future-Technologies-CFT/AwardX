
import React, { useState, useEffect } from 'react';
import { db, Contact } from '../../services/demoDb';
import { Search, Filter, MoreVertical, Mail, Tag, X, Calendar, Globe, Linkedin, MessageSquare, Info } from 'lucide-react';
import { Button } from '../Button';
import { motion, AnimatePresence } from 'framer-motion';

export const CRMView: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    setContacts(db.getContacts());
  }, []);

  const getSourceIcon = (source: string) => {
    if (source.includes('LinkedIn')) return <Linkedin className="w-3 h-3 text-blue-700" />;
    if (source.includes('Google') || source.includes('Search')) return <Globe className="w-3 h-3 text-green-600" />;
    return <Info className="w-3 h-3 text-slate-500" />;
  };

  return (
    <div className="flex h-full gap-6">
       {/* Main Content */}
       <div className={`flex-1 transition-all duration-300 space-y-6 ${selectedContact ? 'w-2/3' : 'w-full'}`}>
          <div className="flex justify-between items-center">
             <div>
                <h1 className="text-2xl font-bold text-slate-900">CRM & Users</h1>
                <p className="text-slate-500">Manage all your program participants and team.</p>
             </div>
             <Button>Add Contact</Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             {/* Toolbar */}
             <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50/50">
                <div className="relative flex-1 max-w-md">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input type="text" placeholder="Search by name or email..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 text-slate-600">
                   <Filter className="w-4 h-4" /> Role
                </button>
             </div>

             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="p-4 pl-6">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Acquisition</th>
                      <th className="p-4">Status</th>
                      <th className="p-4"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {contacts.map((contact) => (
                      <tr 
                         key={contact.id} 
                         onClick={() => setSelectedContact(contact)}
                         className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedContact?.id === contact.id ? 'bg-indigo-50/50' : ''}`}
                      >
                         <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                               <img src={contact.avatar} alt="" className="w-10 h-10 rounded-full bg-slate-200 object-cover border border-slate-200" />
                               <div>
                                  <div className="font-bold text-slate-900 text-sm">{contact.name}</div>
                                  <div className="text-slate-500 text-xs">{contact.email}</div>
                               </div>
                            </div>
                         </td>
                         <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold border ${
                               contact.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                               contact.role === 'Judge' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                               'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                               {contact.role}
                            </span>
                         </td>
                         <td className="p-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                               <div className="p-1 bg-white border border-slate-200 rounded-full shadow-sm">
                                  {getSourceIcon(contact.source)}
                               </div>
                               <span className="truncate max-w-[100px]">{contact.source}</span>
                            </div>
                         </td>
                         <td className="p-4">
                            <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${contact.status === 'Active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                               <span className="text-sm text-slate-600">{contact.status}</span>
                            </div>
                         </td>
                         <td className="p-4 text-right">
                             <button className="p-1 text-slate-400 hover:text-slate-600">
                                <MoreVertical className="w-4 h-4" />
                             </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>

       {/* Slide-over Details Panel */}
       <AnimatePresence>
         {selectedContact && (
           <motion.div 
             initial={{ x: 300, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             exit={{ x: 300, opacity: 0 }}
             transition={{ type: "spring", stiffness: 300, damping: 30 }}
             className="w-96 bg-white border-l border-slate-200 shadow-xl fixed right-0 top-20 bottom-0 z-20 overflow-y-auto"
           >
              <div className="p-6">
                 <div className="flex justify-between items-start mb-6">
                    <h2 className="text-lg font-bold text-slate-900">User Profile</h2>
                    <button onClick={() => setSelectedContact(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                       <X className="w-5 h-5" />
                    </button>
                 </div>

                 {/* Profile Header */}
                 <div className="text-center mb-8">
                    <div className="relative inline-block mb-3">
                       <img src={selectedContact.avatar} alt="" className="w-24 h-24 rounded-full border-4 border-slate-50 shadow-md object-cover" />
                       <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedContact.name}</h3>
                    <p className="text-slate-500 text-sm mb-4">{selectedContact.email}</p>
                    <div className="flex justify-center gap-2">
                       <Button size="sm" variant="secondary" className="px-6">Message</Button>
                       <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600">
                          <MoreVertical className="w-5 h-5" />
                       </button>
                    </div>
                 </div>

                 <hr className="border-slate-100 mb-6" />

                 {/* Acquisition Data */}
                 <div className="space-y-6">
                    <div>
                       <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Acquisition & Survey</h4>
                       <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 space-y-4">
                          <div>
                             <div className="text-xs text-indigo-500 font-semibold mb-1 flex items-center gap-1">
                                {getSourceIcon(selectedContact.source)} Source
                             </div>
                             <div className="font-bold text-slate-900">{selectedContact.source}</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-indigo-100/50 shadow-sm">
                             <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> Survey Response: "How did you hear about us?"
                             </div>
                             <p className="text-sm text-slate-700 italic">"{selectedContact.surveyAnswer}"</p>
                          </div>
                       </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Activity Timeline</h4>
                        <div className="space-y-4 relative pl-4 border-l-2 border-slate-100">
                           <div className="relative">
                              <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                              <div className="text-sm font-bold text-slate-900">Active Now</div>
                              <div className="text-xs text-slate-500">Viewing Dashboard</div>
                           </div>
                           <div className="relative">
                              <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white"></div>
                              <div className="text-sm font-bold text-slate-900">Last Login</div>
                              <div className="text-xs text-slate-500">{selectedContact.lastActive}</div>
                           </div>
                           <div className="relative">
                              <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-indigo-300 border-2 border-white"></div>
                              <div className="text-sm font-bold text-slate-900">Joined Platform</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                 <Calendar className="w-3 h-3" /> {selectedContact.joinedDate}
                              </div>
                           </div>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                       <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Tags</h4>
                       <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200 font-medium">Early Adopter</span>
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200 font-medium">Verified</span>
                          {selectedContact.role === 'Applicant' && (
                             <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md border border-green-200 font-medium">High Potential</span>
                          )}
                          <button className="px-2 py-1 border border-dashed border-slate-300 text-slate-400 text-xs rounded-md hover:text-indigo-600 hover:border-indigo-300 transition-colors">
                             + Add Tag
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};
