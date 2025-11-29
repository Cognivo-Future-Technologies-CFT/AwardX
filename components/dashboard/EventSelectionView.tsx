import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, Gavel, HandCoins, Building2, Palette, MapPin, 
  Store, Briefcase, Sparkles, Calendar, ArrowRight,
  LogOut, Bell, Search
} from 'lucide-react';
import { db, Program, EventType } from '../../services/demoDb';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface EventSelectionViewProps {
  onSelectEvent: (event: Program) => void;
  onLogout: () => void;
}

const EventTypeCard = ({ type, icon: Icon, description, onClick }: any) => (
  <motion.button
    whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.15)' }}
    onClick={onClick}
    className="flex flex-col items-start text-left bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all duration-300 h-full group w-full"
  >
    <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-slate-100 group-hover:border-indigo-500">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-lg font-bold text-slate-900 mb-2">{type}</h3>
    <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
  </motion.button>
);

const ExistingEventCard: React.FC<{ event: Program; onClick: () => void }> = ({ event, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    onClick={onClick}
    className="bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer hover:shadow-lg hover:border-indigo-200 transition-all group relative overflow-hidden"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity`}></div>
    
    <div className="flex justify-between items-start mb-4 relative z-10">
      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        event.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
      }`}>
        {event.status}
      </span>
      <span className="text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-100">{event.type}</span>
    </div>
    
    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors relative z-10">
      {event.title}
    </h3>
    <p className="text-sm text-slate-500 mb-6 relative z-10">{event.category} • {event.entriesCount} Entries</p>
    
    <div className="flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform relative z-10">
      Manage Event <ArrowRight className="w-3 h-3 ml-1" />
    </div>
  </motion.div>
);

export const EventSelectionView: React.FC<EventSelectionViewProps> = ({ onSelectEvent, onLogout }) => {
  const [events, setEvents] = useState<Program[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', category: 'General', deadline: '' });

  // Grouped Event Types
  const eventGroups = [
    {
      title: "Recognition & Excellence",
      items: [
        { type: 'Award', icon: Trophy, description: 'Recognize winners based on final selection.' },
        { type: 'Competition', icon: Gavel, description: 'Multi-round judging and competitive ranking.' },
      ]
    },
    {
      title: "Funding & Opportunities",
      items: [
        { type: 'Grant', icon: HandCoins, description: 'Funding applications and proposal evaluation.' },
        { type: 'Residency', icon: MapPin, description: 'Select people for residencies or fellowships.' },
        { type: 'Commission', icon: Briefcase, description: 'Submit proposals to be hired or commissioned.' },
      ]
    },
    {
      title: "Showcase & Events",
      items: [
        { type: 'Exhibition', icon: Palette, description: 'Collect work to display or showcase.' },
        { type: 'Fair', icon: Store, description: 'Applications for a fair or trade show.' },
        { type: 'Internal Event', icon: Building2, description: 'Private/internal organizational programs.' },
      ]
    },
    {
      title: "Custom",
      items: [
        { type: 'Other', icon: Sparkles, description: 'Build a custom process from scratch.' },
      ]
    }
  ];

  useEffect(() => {
    setEvents(db.getPrograms());
  }, []);

  const handleTypeSelect = (type: EventType) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.deadline || !selectedType) return;
    
    const created = db.addProgram({
      ...newEvent,
      type: selectedType,
      status: 'Draft',
      paymentConfig: { enabled: false, provider: 'Stripe', currency: 'USD', fee: 0, connected: false }
    });
    
    setEvents(db.getPrograms());
    setIsModalOpen(false);
    setNewEvent({ title: '', category: 'General', deadline: '' });
    // Automatically enter the new event
    onSelectEvent(created);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white" />
             </div>
             <span className="font-display text-xl font-bold text-slate-900">AwardX</span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search events..." className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64" />
             </div>
             <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
             <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
             <div className="flex items-center gap-3 pl-2 cursor-pointer group relative">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" alt="" className="w-9 h-9 rounded-full border-2 border-white shadow-sm" />
                <div className="hidden md:block text-left">
                   <div className="text-sm font-bold text-slate-900">Sarah Jenkins</div>
                   <div className="text-xs text-slate-500">Admin Workspace</div>
                </div>
                {/* Dropdown for logout */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-1 hidden group-hover:block z-50">
                   <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Sign Out
                   </button>
                </div>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Active Events Section */}
        <section className="mb-16">
           <div className="flex justify-between items-end mb-8">
              <div>
                 <h2 className="text-2xl font-bold text-slate-900">Your Events</h2>
                 <p className="text-slate-500">Manage your active programs and competitions.</p>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                 <ExistingEventCard key={event.id} event={event} onClick={() => onSelectEvent(event)} />
              ))}
              
              {/* Empty State */}
              {events.length === 0 && (
                 <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <p className="text-slate-500 mb-4">No events created yet.</p>
                    <p className="text-sm text-slate-400">Select a category below to start.</p>
                 </div>
              )}
           </div>
        </section>

        {/* Create New Event Section - Grouped */}
        <section>
           <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Create New Event</h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                 Select a strategic category to initialize your event workspace with pre-configured workflows.
              </p>
           </div>

           <div className="space-y-12">
             {eventGroups.map((group, idx) => (
                <div key={idx}>
                   <div className="flex items-center gap-4 mb-6">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest bg-slate-200/50 px-3 py-1 rounded-md">{group.title}</h3>
                      <div className="h-px bg-slate-200 flex-1"></div>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {group.items.map((item) => (
                         <EventTypeCard 
                            key={item.type}
                            type={item.type}
                            icon={item.icon}
                            description={item.description}
                            onClick={() => handleTypeSelect(item.type as EventType)}
                         />
                      ))}
                   </div>
                </div>
             ))}
           </div>
        </section>
      </main>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Create New ${selectedType}`}>
         <form onSubmit={handleCreate} className="space-y-4">
            <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1">Event Title</label>
               <input 
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder={`e.g. Annual ${selectedType} 2024`}
               />
            </div>
            <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1">Industry / Category</label>
               <select 
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newEvent.category}
                  onChange={e => setNewEvent({...newEvent, category: e.target.value})}
               >
                  <option>General</option>
                  <option>Design</option>
                  <option>Technology</option>
                  <option>Business</option>
                  <option>Arts</option>
                  <option>Education</option>
                  <option>Non-Profit</option>
               </select>
            </div>
            <div>
               <label className="block text-sm font-semibold text-slate-700 mb-1">Submission Deadline</label>
               <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                     required
                     type="date"
                     className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                     value={newEvent.deadline}
                     onChange={e => setNewEvent({...newEvent, deadline: e.target.value})}
                  />
               </div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-xl text-sm text-indigo-700 flex gap-3 items-start mt-4">
               <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
               <p>
                  AwardX will automatically configure the workspace for a <strong>{selectedType}</strong> workflow, including relevant judging criteria and terminology.
               </p>
            </div>
            <div className="pt-6 flex justify-end gap-3">
               <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
               <Button type="submit">Initialize Workspace</Button>
            </div>
         </form>
      </Modal>
    </div>
  );
};