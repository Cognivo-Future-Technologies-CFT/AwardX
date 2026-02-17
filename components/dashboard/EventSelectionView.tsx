import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
   Trophy, Gavel, HandCoins, Building2, Palette, MapPin,
   Store, Briefcase, Sparkles, Calendar, ArrowRight,
   LogOut, Bell, Search, RefreshCw, Plus
} from 'lucide-react';
import { Program, EventType } from '../../services/models';
import { auth } from '../../services/supabase';
import { db as databaseService } from '../../services/database';
import { Modal } from '../Modal';
import { Button } from '../Button';

interface UserData {
   name: string;
   avatar: string;
   role: string;
}

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
         <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${event.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
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
   const createSectionRef = React.useRef<HTMLElement>(null);
   const [events, setEvents] = useState<Program[]>([]);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [selectedType, setSelectedType] = useState<EventType | null>(null);
   const [newEvent, setNewEvent] = useState({ title: '', category: 'General', deadline: '' });
   const [isLoading, setIsLoading] = useState(true);
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [isCreating, setIsCreating] = useState(false);
   const [userData, setUserData] = useState<UserData>({
      name: 'Loading...',
      avatar: '',
      role: 'Admin Workspace'
   });

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

   // Optimized load programs function
   const loadPrograms = useCallback(async (showLoading = false) => {
      if (showLoading) setIsRefreshing(true);
      try {
         // Ensure database is initialized (only once)
         await databaseService.initialize();
         const programs = await databaseService.getPrograms();
         setEvents(programs);
      } catch (error) {
         console.error('Failed to load programs:', error);
      } finally {
         setIsLoading(false);
         setIsRefreshing(false);
      }
   }, []);

   // Fetch real user data from Supabase
   useEffect(() => {
      // Load programs immediately
      loadPrograms(true);

      const fetchUserData = async () => {
         try {
            const { user, error } = await auth.getUser();
            if (user && !error) {
               setUserData({
                  name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                  avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
                  role: 'Admin Workspace'
               });
            }
         } catch (err) {
            console.error('Error fetching user data:', err);
         }
      };

      fetchUserData();

      // Refresh programs when component becomes visible or window gains focus
      let visibilityTimeout: NodeJS.Timeout;
      let focusTimeout: NodeJS.Timeout;

      const handleVisibilityChange = () => {
         if (!document.hidden) {
            clearTimeout(visibilityTimeout);
            visibilityTimeout = setTimeout(() => {
               loadPrograms(false);
            }, 100); // Small delay to avoid rapid refreshes
         }
      };

      const handleFocus = () => {
         clearTimeout(focusTimeout);
         focusTimeout = setTimeout(() => {
            loadPrograms(false);
         }, 200); // Slightly longer delay for focus to avoid conflicts
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);

      // Set up periodic refresh (every 20 seconds when visible)
      const refreshInterval = setInterval(() => {
         if (!document.hidden) {
            loadPrograms(false);
         }
      }, 20000);

      return () => {
         document.removeEventListener('visibilitychange', handleVisibilityChange);
         window.removeEventListener('focus', handleFocus);
         clearInterval(refreshInterval);
         clearTimeout(visibilityTimeout);
         clearTimeout(focusTimeout);
      };
   }, [loadPrograms]);

   const handleTypeSelect = (type: EventType) => {
      setSelectedType(type);
      setIsModalOpen(true);
   };

   const scrollToCreate = () => {
      createSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
   };

   const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newEvent.title || !newEvent.deadline || !selectedType || isCreating) return;

      setIsCreating(true);

      // Save event data before clearing
      const eventData = { ...newEvent };
      const eventType = selectedType;

      // Optimistic update - add event immediately to UI
      const optimisticEvent: Program = {
         id: `temp-${Date.now()}`,
         title: eventData.title,
         category: eventData.category,
         type: eventType,
         status: 'Draft',
         deadline: eventData.deadline,
         entriesCount: 0,
         paymentConfig: { enabled: false, provider: 'Stripe', currency: 'USD', fee: 0, connected: false }
      };

      // Add optimistic event immediately
      setEvents(prev => [optimisticEvent, ...prev]);
      setIsModalOpen(false);
      setNewEvent({ title: '', category: 'General', deadline: '' });

      try {
         // Ensure database is initialized before creating
         await databaseService.initialize();

         const created = await databaseService.addProgram({
            ...eventData,
            type: eventType,
            status: 'Draft',
            paymentConfig: { enabled: false, provider: 'Stripe', currency: 'USD', fee: 0, connected: false }
         });

         // Replace optimistic event with real one
         setEvents(prev => prev.map(e => e.id === optimisticEvent.id ? created : e));

         // Automatically enter the new event
         onSelectEvent(created);
      } catch (error: any) {
         console.error('Failed to create program:', error);
         // Remove optimistic event on error
         setEvents(prev => prev.filter(e => e.id !== optimisticEvent.id));
         const errorMessage = error?.message || 'Failed to create program. Please try again.';
         alert(errorMessage);
         // Reopen modal on error
         setIsModalOpen(true);
         setSelectedType(eventType);
         setNewEvent(eventData);
      } finally {
         setIsCreating(false);
      }
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
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-3 pl-2">
                        {userData.avatar ? (
                           <img src={userData.avatar} alt="" className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover" />
                        ) : (
                           <div className="w-9 h-9 rounded-full border-2 border-white shadow-sm bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                              {userData.name.charAt(0).toUpperCase()}
                           </div>
                        )}
                        <div className="hidden md:block text-left">
                           <div className="text-sm font-bold text-slate-900">{userData.name}</div>
                           <div className="text-xs text-slate-500">{userData.role}</div>
                        </div>
                     </div>
                     {/* Always visible logout button */}
                     <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200 hover:border-red-200"
                        title="Sign Out"
                     >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                     </button>
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
                  <div className="flex items-center gap-3">
                     <button
                        onClick={scrollToCreate}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300 group"
                     >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                        <span className="hidden sm:inline">New Event</span>
                     </button>
                     <button
                        onClick={() => loadPrograms(true)}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh events"
                     >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                     </button>
                  </div>
               </div>

               {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                           <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                           <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
                           <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {events.map(event => (
                        <ExistingEventCard key={event.id} event={event} onClick={() => onSelectEvent(event)} />
                     ))}

                     {/* Empty State */}
                     {events.length === 0 && !isLoading && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                           <p className="text-slate-500 mb-4">No events created yet.</p>
                           <p className="text-sm text-slate-400">Select a category below to start.</p>
                        </div>
                     )}
                  </div>
               )}
            </section>

            {/* Create New Event Section - Grouped */}
            <section ref={createSectionRef} className="scroll-mt-24">
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
                     onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                     placeholder={`e.g. Annual ${selectedType} 2024`}
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Industry / Category</label>
                  <select
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                     value={newEvent.category}
                     onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
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
                        onChange={e => setNewEvent({ ...newEvent, deadline: e.target.value })}
                     />
                  </div>
               </div>
               <div className="bg-indigo-50 p-4 rounded-xl text-sm text-indigo-700 flex gap-3 items-start mt-4">
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>
                     AwardX will automatically configure the workspace for a <strong>{selectedType}</strong> workflow, including optimal judging rounds based on research from {selectedType === 'Award' ? 'A\' Design and iF Design' : selectedType === 'Grant' ? 'NIH and SSHRC' : selectedType === 'Residency' ? 'MacDowell and Yaddo' : 'industry best practices'}.
                  </p>
               </div>
               <div className="pt-6 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isCreating}>Cancel</Button>
                  <Button type="submit" disabled={isCreating}>
                     {isCreating ? (
                        <>
                           <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                           Creating...
                        </>
                     ) : (
                        'Initialize Workspace'
                     )}
                  </Button>
               </div>
            </form>
         </Modal>
      </div>
   );
};