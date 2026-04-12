import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
   Trophy, Gavel, HandCoins, Building2, Palette, MapPin,
   Store, Briefcase, Sparkles, Calendar, ArrowRight,
   LogOut, Bell, Search, RefreshCw, Plus, Pencil, Trash2, Layers, CheckCircle2
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

const StatusBadge: React.FC<{ status: Program['status'] }> = ({ status }) => {
   const styles =
      status === 'Active'
         ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
         : status === 'Completed'
            ? 'bg-slate-100 text-slate-700 border-slate-200'
            : 'bg-amber-50 text-amber-700 border-amber-200';

   return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${styles}`}>
         {status}
      </span>
   );
};

const SupabaseStatCard: React.FC<{ label: string; value: number; icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
   <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
         <p className="text-xs text-slate-500">{label}</p>
         <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
   </div>
);

const EventTypeCard = ({ type, icon: Icon, description, onClick }: any) => (
   <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="flex flex-col items-start text-left bg-white p-6 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all duration-200 h-full group w-full"
   >
      <div className="w-11 h-11 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center mb-4 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors border border-slate-200 group-hover:border-emerald-200">
         <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1.5">{type}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
   </motion.button>
);

const ExistingEventCard: React.FC<{
   event: Program;
   onClick: () => void;
   onEdit: (event: Program) => void;
   onDelete: (event: Program) => void;
   isDeleting?: boolean;
   canManagePrograms?: boolean;
}> = ({ event, onClick, onEdit, onDelete, isDeleting, canManagePrograms = false }) => (
   <motion.div
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group"
   >
      <div className="flex justify-between items-start mb-4">
         <StatusBadge status={event.status} />
         <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200">{event.type}</span>
            {canManagePrograms && (
               <>
                  <button
                     type="button"
                     onClick={(e) => {
                        e.stopPropagation();
                        onEdit(event);
                     }}
                     className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                     title="Edit event"
                     aria-label={`Edit ${event.title}`}
                  >
                     <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                     type="button"
                     onClick={(e) => {
                        e.stopPropagation();
                        onDelete(event);
                     }}
                     disabled={isDeleting}
                     className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                     title="Delete event"
                     aria-label={`Delete ${event.title}`}
                  >
                     <Trash2 className="w-3.5 h-3.5" />
                  </button>
               </>
            )}
         </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-emerald-700 transition-colors">
         {event.title}
      </h3>
      <p className="text-sm text-slate-500 mb-5">{event.category} • {event.entriesCount} Entries</p>

      <div className="flex items-center text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
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
   const [isUpdating, setIsUpdating] = useState(false);
   const [deletingId, setDeletingId] = useState<string | null>(null);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [editingEventId, setEditingEventId] = useState<string | null>(null);
   const [editingEvent, setEditingEvent] = useState({ title: '', category: 'General', deadline: '', status: 'Draft' as Program['status'] });
   const [canManagePrograms, setCanManagePrograms] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [statusFilter, setStatusFilter] = useState<'All' | Program['status']>('All');
   const [userData, setUserData] = useState<UserData>({
      name: 'Loading...',
      avatar: '',
      role: 'Admin Workspace'
   });

   const filteredEvents = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      return events.filter((event) => {
         const matchesStatus = statusFilter === 'All' || event.status === statusFilter;
         const matchesSearch =
            !q ||
            event.title.toLowerCase().includes(q) ||
            event.category.toLowerCase().includes(q) ||
            event.type.toLowerCase().includes(q);
         return matchesStatus && matchesSearch;
      });
   }, [events, searchQuery, statusFilter]);

   const stats = useMemo(() => {
      const active = events.filter((e) => e.status === 'Active').length;
      const draft = events.filter((e) => e.status === 'Draft').length;
      const completed = events.filter((e) => e.status === 'Completed').length;
      return {
         total: events.length,
         active,
         draft,
         completed,
      };
   }, [events]);

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
         const canManage = await databaseService.canManagePrograms();
         setCanManagePrograms(canManage);
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
         }, { autoCreateRounds: eventType !== 'Other' });


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

   const openEditModal = (event: Program) => {
      if (!canManagePrograms) return;
      setEditingEventId(event.id);
      setEditingEvent({
         title: event.title,
         category: event.category,
         deadline: event.deadline,
         status: event.status,
      });
      setIsEditModalOpen(true);
   };

   const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canManagePrograms) return;
      if (!editingEventId || isUpdating) return;

      const existing = events.find((evt) => evt.id === editingEventId);
      if (!existing) return;

      setIsUpdating(true);

      const updatedProgram: Program = {
         ...existing,
         title: editingEvent.title,
         category: editingEvent.category,
         deadline: editingEvent.deadline,
         status: editingEvent.status,
      };

      // Optimistic update for snappy UI.
      setEvents((prev) => prev.map((evt) => evt.id === editingEventId ? updatedProgram : evt));

      try {
         const saved = await databaseService.updateProgram(updatedProgram);
         setEvents((prev) => prev.map((evt) => evt.id === saved.id ? saved : evt));
         setIsEditModalOpen(false);
      } catch (error: any) {
         setEvents((prev) => prev.map((evt) => evt.id === existing.id ? existing : evt));
         alert(error?.message || 'Failed to update event. Please try again.');
      } finally {
         setIsUpdating(false);
      }
   };

   const handleDeleteEvent = async (event: Program) => {
      if (!canManagePrograms) return;
      const confirmed = window.confirm(`Delete "${event.title}"? This action cannot be undone.`);
      if (!confirmed || deletingId) return;

      setDeletingId(event.id);
      const previousEvents = events;
      setEvents((prev) => prev.filter((evt) => evt.id !== event.id));

      try {
         await databaseService.deleteProgram(event.id);
      } catch (error: any) {
         setEvents(previousEvents);
         alert(error?.message || 'Failed to delete event. Please try again.');
      } finally {
         setDeletingId(null);
      }
   };

   return (
      <div className="min-h-screen bg-[#f8faf9] font-sans text-slate-900">
         {/* Top Navigation Bar */}
         <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-200/60">
                     <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                     <span className="font-display text-xl font-semibold text-slate-900">AwardX</span>
                     <p className="text-[11px] text-slate-500 -mt-0.5">Project Console</p>
                  </div>
               </div>

               <div className="flex items-center gap-4">
                  <div className="hidden md:flex relative">
                     <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input
                        type="text"
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none w-72"
                     />
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
                           <div className="w-9 h-9 rounded-full border-2 border-white shadow-sm bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
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
               <div className="mb-6">
                  <div>
                     <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Your Events</h2>
                     <p className="text-slate-500 mt-1">Manage your active programs and competitions.</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
                  <SupabaseStatCard label="Total Programs" value={stats.total} icon={Layers} />
                  <SupabaseStatCard label="Active" value={stats.active} icon={CheckCircle2} />
                  <SupabaseStatCard label="Draft" value={stats.draft} icon={Calendar} />
                  <SupabaseStatCard label="Completed" value={stats.completed} icon={Trophy} />
               </div>

               <div className="rounded-xl border border-slate-200 bg-white p-3 mb-8">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                     <div className="flex items-center gap-2 flex-wrap">
                        {(['All', 'Active', 'Draft', 'Completed'] as const).map((status) => (
                           <button
                              key={status}
                              type="button"
                              onClick={() => setStatusFilter(status)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${statusFilter === status
                                 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                 : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                 }`}
                           >
                              {status}
                           </button>
                        ))}
                     </div>
                     <div className="flex items-center gap-2">
                        <button
                           onClick={scrollToCreate}
                           className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
                        >
                           <Plus className="w-4 h-4" />
                           <span className="hidden sm:inline">New Event</span>
                        </button>
                        <button
                           onClick={() => loadPrograms(true)}
                           disabled={isRefreshing}
                           className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                           title="Refresh events"
                        >
                           <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                           <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                     </div>
                  </div>
               </div>

               {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                           <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                           <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
                           <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {/* Create Custom Grid Card */}
                     <motion.div
                        whileHover={{ y: -2 }}
                        onClick={() => handleTypeSelect('Other')}
                        className="flex flex-col items-center justify-center bg-emerald-50/60 border border-dashed border-emerald-300 rounded-xl p-6 cursor-pointer hover:border-emerald-500 transition-colors h-[190px]"
                     >
                        <div className="w-11 h-11 rounded-lg bg-white text-emerald-700 flex items-center justify-center mb-3 border border-emerald-200">
                           <Plus className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-semibold text-emerald-900 mb-1">Create Custom</h3>
                        <p className="text-xs text-emerald-700/80 font-medium">Build a custom event workflow</p>
                     </motion.div>

                     {filteredEvents.map(event => (
                        <ExistingEventCard
                           key={event.id}
                           event={event}
                           onClick={() => onSelectEvent(event)}
                           onEdit={openEditModal}
                           onDelete={handleDeleteEvent}
                           isDeleting={deletingId === event.id}
                            canManagePrograms={canManagePrograms}
                        />
                     ))}

                     {/* Empty State */}
                     {filteredEvents.length === 0 && !isLoading && (
                        <div className="col-span-full py-12 text-center border border-dashed border-slate-300 rounded-xl bg-white">
                           <p className="text-slate-700 mb-2 font-medium">No matching events found.</p>
                           <p className="text-sm text-slate-500">Try a different filter or search query.</p>
                        </div>
                     )}
                  </div>
               )}
            </section>

            {/* Create New Event Section - Grouped */}
            <section ref={createSectionRef} className="scroll-mt-24">
               <div className="text-center mb-10">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-3">Create New Event</h2>
                  <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                     Select a strategic category to initialize your event workspace with pre-configured workflows.
                  </p>
               </div>

               <div className="space-y-9">
                  {eventGroups.map((group, idx) => (
                     <div key={idx}>
                        <div className="flex items-center gap-4 mb-5">
                           <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-md border border-slate-200">{group.title}</h3>
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
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
                     value={newEvent.title}
                     onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                     placeholder={`e.g. Annual ${selectedType} 2024`}
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Industry / Category</label>
                  <select
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
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
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
                        value={newEvent.deadline}
                        onChange={e => setNewEvent({ ...newEvent, deadline: e.target.value })}
                     />
                  </div>
               </div>
               <div className="bg-emerald-50 p-4 rounded-xl text-sm text-emerald-800 flex gap-3 items-start mt-4 border border-emerald-100">
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700" />
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

         {/* Edit Modal */}
         <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Event">
            <form onSubmit={handleSaveEdit} className="space-y-4">
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Event Title</label>
                  <input
                     required
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
                     value={editingEvent.title}
                     onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Industry / Category</label>
                  <select
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
                     value={editingEvent.category}
                     onChange={e => setEditingEvent({ ...editingEvent, category: e.target.value })}
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
                     value={editingEvent.status}
                     onChange={e => setEditingEvent({ ...editingEvent, status: e.target.value as Program['status'] })}
                  >
                     <option value="Draft">Draft</option>
                     <option value="Active">Active</option>
                     <option value="Completed">Completed</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Submission Deadline</label>
                  <div className="relative">
                     <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input
                        required
                        type="date"
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
                        value={editingEvent.deadline}
                        onChange={e => setEditingEvent({ ...editingEvent, deadline: e.target.value })}
                     />
                  </div>
               </div>
               <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isUpdating}>Cancel</Button>
                  <Button type="submit" disabled={isUpdating}>
                     {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
               </div>
            </form>
         </Modal>
      </div>
   );
};