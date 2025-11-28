
import React, { useState, useEffect } from 'react';
import { db, Message } from '../../services/demoDb';
import { Search, Send, Paperclip, MoreVertical, Phone, Video } from 'lucide-react';

export const MessagesView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>('T-001');

  useEffect(() => {
    setMessages(db.getMessages());
  }, []);

  return (
    <div className="h-[calc(100vh-140px)] bg-white rounded-2xl border border-slate-200 shadow-sm flex overflow-hidden">
       {/* Sidebar List */}
       <div className="w-80 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100">
             <h2 className="font-bold text-slate-900 text-lg mb-4">Inbox</h2>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search messages..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
             </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             {messages.map((msg) => (
                <div 
                   key={msg.id} 
                   onClick={() => setActiveThread(msg.threadId)}
                   className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${activeThread === msg.threadId ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
                >
                   <div className="flex justify-between mb-1">
                      <span className={`font-bold text-sm ${msg.unread ? 'text-slate-900' : 'text-slate-600'}`}>{msg.sender}</span>
                      <span className="text-xs text-slate-400">{msg.time}</span>
                   </div>
                   <p className="text-sm text-slate-500 truncate">{msg.content}</p>
                </div>
             ))}
          </div>
       </div>

       {/* Chat Area */}
       <div className="flex-1 flex flex-col bg-slate-50/30">
          {/* Chat Header */}
          <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                   <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="" />
                </div>
                <div>
                   <div className="font-bold text-slate-900 text-sm">Sarah Miller</div>
                   <div className="text-xs text-green-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-4 text-slate-400">
                <button className="hover:text-indigo-600"><Phone className="w-5 h-5" /></button>
                <button className="hover:text-indigo-600"><Video className="w-5 h-5" /></button>
                <button className="hover:text-indigo-600"><MoreVertical className="w-5 h-5" /></button>
             </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
             <div className="flex justify-center">
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Today</span>
             </div>
             
             {/* Incoming */}
             <div className="flex gap-4 max-w-lg">
                <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="" className="w-8 h-8 rounded-full mt-1" />
                <div>
                   <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm text-slate-700 text-sm">
                      Hi, I had a question about the video format for the Design category. Is MP4 acceptable?
                   </div>
                   <span className="text-xs text-slate-400 mt-1 block">10:30 AM</span>
                </div>
             </div>

             {/* Outgoing */}
             <div className="flex gap-4 max-w-lg ml-auto flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mt-1">SJ</div>
                <div>
                   <div className="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md text-sm">
                      Hi Sarah! Yes, MP4 is perfect. Just make sure it's under 500MB.
                   </div>
                   <span className="text-xs text-slate-400 mt-1 block text-right">10:32 AM • Read</span>
                </div>
             </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200">
             <div className="flex gap-2">
                <button className="p-3 text-slate-400 hover:bg-slate-50 rounded-lg">
                   <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                />
                <button className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                   <Send className="w-5 h-5" />
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};
