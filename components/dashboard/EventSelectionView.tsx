import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
   Trophy, HandCoins, Building2, Sparkles, Calendar, ArrowRight,
   LogOut, Bell, Search, RefreshCw, Plus, Pencil, Trash2, Layers, CheckCircle2,
   Rocket, GraduationCap, BookOpen, UserCheck, Palette, Users, UserPlus, Shield
} from 'lucide-react';
import { Program, EventType, Organization, Role, TeamMember, JudgingType } from '../../services/models';
import { auth } from '../../services/supabase';
import { db as databaseService, type DashboardNotification } from '../../services/database';
import { sendTeamInviteEmail } from '../../services/email';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { AppDatePicker } from '../ui/AppDateFields';
import { todayDateString } from '../../lib/utils';
import { Logo, LogoTitle } from '../Logo';
import { toast } from 'sonner';
import { JUDGING_TYPE_OPTIONS, DEFAULT_JUDGING_TYPE } from '../../lib/judgingType';
interface UserData {
   name: string;
   avatar: string;
   role: string;
}

interface EventSelectionViewProps {
   activeOrganization: Organization;
   onSelectEvent: (event: Program) => void;
   onSwitchOrganization: () => void;
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

const EventTypeCard = ({ type, label, icon: Icon, description, onClick }: any) => (
   <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="flex flex-col items-start text-left bg-white p-6 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all duration-200 h-full group w-full"
   >
      <div className="w-11 h-11 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center mb-4 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors border border-slate-200 group-hover:border-emerald-200">
         <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1.5">{label || type}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
   </motion.button>
);

const INDUSTRIES = [
   "Technology",
   "AI",
   "Cybersecurity",
   "Healthcare",
   "Education",
   "Business",
   "Finance",
   "Government",
   "Non-Profit",
   "Arts & Culture",
   "Sports",
   "Media",
];

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
   <div className="mb-5">
   <div className="flex items-center gap-2 mb-2">
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
         {event.category || 'Uncategorized'}
      </span>
   </div>

   <p className="text-sm text-slate-500">
      {event.entriesCount} Entries
   </p>
</div>

      <div className="flex items-center text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
         Manage Event <ArrowRight className="w-3 h-3 ml-1" />
      </div>
   </motion.div>
);

const WORKFLOW_HINTS: Partial<Record<EventType, string>> = {
   'Accelerator & Incubator Programs': 'Y Combinator-style cohort programs with collaborative founder workspaces.',
   'Grants & Funding': 'NIH, SSHRC, and ERC-style multi-stage grant review pipelines.',
   'Academic Admissions': 'University admissions with blind references and committee review.',
   'Abstracts & Journals': 'Conference and journal workflows with double-blind peer review.',
   'Personnel & Fellowships': 'Nomination-driven fellowship programs with executive review.',
   'Creative Contests': 'Design and media contests with jury scoring and public voting.',
   'Other': 'industry best practices',
};

export const EventSelectionView: React.FC<EventSelectionViewProps> = ({
   activeOrganization,
   onSelectEvent,
   onSwitchOrganization,
   onLogout,
}) => {
   const createSectionRef = React.useRef<HTMLElement>(null);
   const [events, setEvents] = useState<Program[]>([]);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [selectedType, setSelectedType] = useState<EventType | null>(null);
   const [newEvent, setNewEvent] = useState({
      title: '',
      category: '',
      deadline: '',
      judgingType: DEFAULT_JUDGING_TYPE as JudgingType,
   });
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
   const [orgMembers, setOrgMembers] = useState<TeamMember[]>([]);
   const [orgRoles, setOrgRoles] = useState<Role[]>([]);
   const [memberSearchQuery, setMemberSearchQuery] = useState('');
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
   const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
   const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
   const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
   const [newMemberEmail, setNewMemberEmail] = useState('');
   const [newMemberRoleId, setNewMemberRoleId] = useState('');
   const [isAddingMember, setIsAddingMember] = useState(false);
   const [userData, setUserData] = useState<UserData>({
      name: 'Loading...',
      avatar: '',
      role: 'Admin Workspace'
   });
   const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
   const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
   const notificationsRef = React.useRef<HTMLDivElement>(null);

   const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

   const loadNotifications = useCallback(async () => {
      try {
         const data = await databaseService.getNotifications({ limit: 10 });
         setNotifications(data);
      } catch (err) {
         console.error('Error loading notifications:', err);
      }
   }, []);

   const handleMarkAllRead = useCallback(async () => {
      const hadUnread = notifications.some((n) => !n.isRead);
      if (!hadUnread) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      try {
         await databaseService.markAllNotificationsRead();
      } catch (err) {
         console.error('Error marking notifications read:', err);
         loadNotifications();
      }
   }, [notifications, loadNotifications]);

   const handleMarkRead = useCallback(async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      try {
         await databaseService.markNotificationRead(id);
      } catch (err) {
         console.error('Error marking notification read:', err);
         loadNotifications();
      }
   }, [loadNotifications]);

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

   const filteredMembers = useMemo(() => {
      const q = memberSearchQuery.trim().toLowerCase();
      if (!q) return orgMembers;
      return orgMembers.filter((m) => {
         return (
            (m.name || '').toLowerCase().includes(q) ||
            (m.email || '').toLowerCase().includes(q) ||
            (m.role || '').toLowerCase().includes(q)
         );
      });
   }, [orgMembers, memberSearchQuery]);

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

   const eventTypes: Array<{ type: EventType; label?: string; icon: React.ElementType; description: string }> = [
      {
         type: 'Accelerator & Incubator Programs',
         icon: Rocket,
         description: 'Multi-stage startup evaluation with entry collaboration for co-founder teams.',
      },
      {
         type: 'Grants & Funding',
         icon: HandCoins,
         description: 'Grant applications with multi-stage review, compliance, and COI management.',
      },
      {
         type: 'Academic Admissions',
         icon: GraduationCap,
         description: 'Student admissions with blind references, academic records, and committee review.',
      },
      {
         type: 'Abstracts & Journals',
         icon: BookOpen,
         description: 'Abstract and manuscript submission with peer review and editorial decisions.',
      },
      {
         type: 'Personnel & Fellowships',
         icon: UserCheck,
         description: 'Nomination and fellowship selection with endorsement and executive review.',
      },
      {
         type: 'Creative Contests',
         icon: Palette,
         description: 'Video, photography, and design contests with jury scoring and public voting.',
      },
      {
         type: 'Other',
         label: 'Custom',
         icon: Sparkles,
         description: 'Build a custom process from scratch.',
      },
   ];

   // Optimized load programs function
   const loadPrograms = useCallback(async (showLoading = false) => {
      if (showLoading) setIsRefreshing(true);
      try {
         // Ensure database is initialized (only once)
         await databaseService.initialize();
         const canManage = await databaseService.canManagePrograms();
         setCanManagePrograms(canManage);
         
         const [programs, members, roles] = await Promise.all([
            databaseService.getPrograms(),
            databaseService.getTeamMembers(),
            databaseService.getRoles(),
         ]);
         setEvents(programs);
         setOrgMembers(members);
         setOrgRoles(roles);
      } catch (error) {
         console.error('Failed to load programs:', error);
      } finally {
         setIsLoading(false);
         setIsRefreshing(false);
      }
   }, []);

   useEffect(() => {
      if (!newMemberRoleId && orgRoles[0]?.id) {
         setNewMemberRoleId(orgRoles[0].id);
      }
   }, [newMemberRoleId, orgRoles]);

   useEffect(() => {
      if (!isNotificationsOpen) return;
      const handleClickOutside = (e: MouseEvent) => {
         if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
            setIsNotificationsOpen(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, [isNotificationsOpen]);

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
      loadNotifications();

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

      return () => {
         document.removeEventListener('visibilitychange', handleVisibilityChange);
         window.removeEventListener('focus', handleFocus);
         clearTimeout(visibilityTimeout);
         clearTimeout(focusTimeout);
      };
   }, [loadPrograms, activeOrganization.id]);

   const handleTypeSelect = (type: EventType) => {
      setSelectedType(type);
      setIsModalOpen(true);
   };

   const scrollToCreate = () => {
      createSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
   };

   const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isCreating) return;

if (!newEvent.title?.trim()) {
   toast.error('Please enter a program title');
   return;
}

if (!newEvent.category) {
   toast.error('Please select a category');
   return;
}

if (!selectedType) {
   toast.error('Please select a program type');
   return;
}

if (!newEvent.deadline) {
   toast.error('Please select a deadline');
   return;
}

      setIsCreating(true);

      // Save event data before clearing
      const eventData = { ...newEvent };
      const eventType = selectedType;

      // Optimistic update - add event immediately to UI
      const optimisticEvent: Program = {
         id: `temp-${Date.now()}`,
         title: eventData.title,
         category: eventData.category,
         judgingType: eventData.judgingType,
         type: eventType,
         status: 'Draft',
         deadline: eventData.deadline,
         entriesCount: 0,
         paymentConfig: { enabled: false, provider: 'Stripe', currency: 'USD', fee: 0, connected: false }
      };

      // Add optimistic event immediately
      setEvents(prev => [optimisticEvent, ...prev]);
      setIsModalOpen(false);
      setNewEvent({ title: '', category: '', deadline: '', judgingType: DEFAULT_JUDGING_TYPE });

      try {
         // Ensure database is initialized before creating
         await databaseService.initialize();

         const created = await databaseService.addProgram({
            title: eventData.title,
            category: eventData.category,
            judgingType: eventData.judgingType,
            deadline: eventData.deadline,
            type: eventType,
            status: 'Draft',
            paymentConfig: { enabled: false, provider: 'Stripe', currency: 'USD', fee: 0, connected: false }
         }, { autoCreateRounds: eventType !== 'Other' });


         // Replace optimistic event with real one
         setEvents(prev => prev.map(e => e.id === optimisticEvent.id ? created : e));

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

   const openMemberDetails = (member: TeamMember) => {
      setSelectedMember(member);
      setIsMemberModalOpen(true);
   };

   const handleAddMember = async (e: React.FormEvent) => {
      e.preventDefault();
      const email = newMemberEmail.trim().toLowerCase();
      if (!email || !newMemberRoleId || isAddingMember) return;

      setIsAddingMember(true);
      try {
         await databaseService.addTeamMemberByEmail(email, newMemberRoleId);
         // Also send invite email so the person gets notified. The member is already added,
         // so a failed email should warn (not fail) and never falsely claim success.
         const roleName = orgRoles.find(r => r.id === newMemberRoleId)?.name;
         let emailFailed = false;
         try {
            const result: any = await sendTeamInviteEmail({
               email,
               roleId: newMemberRoleId,
               roleName,
               programTitle: activeOrganization.name,
               organizationId: activeOrganization.id,
            });
            if (result && result.emailSent === false) emailFailed = true;
         } catch {
            emailFailed = true;
         }
         await loadPrograms(false);
         setNewMemberEmail('');
         setIsAddMemberModalOpen(false);
         if (emailFailed) {
            alert(`${email} was added to the organization, but the invite email could not be sent. You can resend it from Team Management → Pending Invitations.`);
         }
      } catch (error: any) {
         alert(error?.message || 'Failed to add member. Please try again.');
      } finally {
         setIsAddingMember(false);
      }
   };

   return (
      <div className="min-h-screen bg-[#f8faf9] font-sans text-slate-900">
         {/* Top Navigation Bar */}
         <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex justify-between items-center">
               <LogoTitle title={activeOrganization.name} logoSize="xl" />

               <div className="flex items-center gap-4">
                  <button
                     type="button"
                     onClick={onSwitchOrganization}
                     className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200 hover:border-emerald-200"
                  >
                     <Building2 className="w-4 h-4" />
                     <span className="hidden sm:inline">Switch Organization</span>
                     <span className="sm:hidden">Organizations</span>
                  </button>
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
                  <div className="relative" ref={notificationsRef}>
                     <button
                        type="button"
                        onClick={() => {
                           setIsNotificationsOpen((prev) => !prev);
                           if (!isNotificationsOpen) loadNotifications();
                        }}
                        aria-label="Notifications"
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
                     >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                           <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                     </button>

                     {isNotificationsOpen && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
                           <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                              {unreadCount > 0 && (
                                 <button
                                    type="button"
                                    onClick={handleMarkAllRead}
                                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                                 >
                                    Mark all read
                                 </button>
                              )}
                           </div>
                           <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                              {notifications.length === 0 ? (
                                 <div className="p-8 text-center text-sm text-slate-400">No notifications yet</div>
                              ) : notifications.map((n) => (
                                 <div
                                    key={n.id}
                                    onClick={() => !n.isRead && handleMarkRead(n.id)}
                                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-emerald-50/40' : ''}`}
                                 >
                                    <div className="flex items-start gap-3">
                                       {!n.isRead && <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />}
                                       <div className="min-w-0 flex-1">
                                          <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                                          {n.body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                                          <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
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
            <div className="space-y-16">
               {/* Active Events Section */}
               <section className="mb-16">
               <div className="mb-6">
                  <div>
                     <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Your Events</h2>
                     <p className="text-slate-500 mt-1">
                        Manage events inside <span className="font-medium text-slate-700">{activeOrganization.name}</span>.
                     </p>
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

            {/* Create New Event Section */}
            <section ref={createSectionRef} className="scroll-mt-24">
               <div className="text-center mb-10">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-3">Create New Event</h2>
                  <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                     Select a program template to initialize your workspace with pre-configured workflows and judging rounds.
                  </p>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eventTypes.map((item) => (
                     <EventTypeCard
                        key={item.type}
                        type={item.type}
                        label={item.label}
                        icon={item.icon}
                        description={item.description}
                        onClick={() => handleTypeSelect(item.type)}
                     />
                  ))}
               </div>
            </section>
         </div>
      </main>

      {/* Collapsible Right Sidebar Panel */}
<motion.aside
  initial={{ x: '100%' }}
  animate={{
    x: isSidebarOpen ? 0 : '100%',
    y: '-50%',
  }}
  transition={{
    type: 'spring',
    damping: 28,
    stiffness: 220,
  }}
  className="
    fixed
    right-0
    top-1/2
    w-[320px]
    max-h-[75vh]
    bg-white
    border border-slate-200
    rounded-l-[28px]
    shadow-2xl
    z-40
    p-6
    flex flex-col
  "
>
         {/* Toggle Tab Button on Left Edge */}
         <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute left-[-40px] top-1/2 -translate-y-1/2 w-10 h-24 bg-white border border-r-0 border-slate-200 shadow-[-6px_0_15px_-3px_rgba(0,0,0,0.1)] rounded-l-2xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-50 text-slate-500 hover:text-emerald-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            aria-label={isSidebarOpen ? "Close members sidebar" : "Open members sidebar"}
         >
            {isSidebarOpen ? (
               <ArrowRight className="w-5 h-5" />
            ) : (
               <>
                  <Users className="w-5 h-5 animate-pulse" />
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5">
                     {orgMembers.length}
                  </span>
               </>
            )}
         </button>

         {/* Sidebar Content */}
         <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
            <div className="flex items-center gap-2">
               <Users className="w-5 h-5 text-emerald-600" />
               <h2 className="text-base font-bold text-slate-900">Members</h2>
            </div>
            <div className="flex items-center gap-2">
               <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {orgMembers.length}
               </span>
               <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  aria-label="Add member"
                  title="Add member"
               >
                  <UserPlus className="w-4 h-4" />
               </button>
            </div>
         </div>

         <div className="relative my-4 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
               type="text"
               placeholder="Search members..."
               value={memberSearchQuery}
               onChange={(e) => setMemberSearchQuery(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
            />
         </div>

         <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
            {filteredMembers.map((member) => {
               const roleLower = (member.role || 'member').toLowerCase();
               const isOwner = roleLower === 'owner' || roleLower === 'superadmin';
               const isAdmin = roleLower === 'admin';
               const isJudge = roleLower === 'judge';
               
               const badgeStyle = isOwner 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                  : isAdmin 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : isJudge 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-slate-50 text-slate-600 border-slate-200';

               const initials = (member.name || member.email || 'U')
                  .trim()
                  .split(' ')
                  .map((n: string) => n.charAt(0))
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'U';

               return (
                  <button
                     key={member.memberId}
                     type="button"
                     onClick={() => openMemberDetails(member)}
                     className="w-full flex items-center justify-between gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-emerald-100 hover:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                     <div className="flex items-center gap-2.5 min-w-0">
                        {member.avatar ? (
                           <img 
                              src={member.avatar} 
                              alt={member.name} 
                              className="w-8 h-8 rounded-full border border-slate-100 object-cover shrink-0" 
                           />
                        ) : (
                           <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                              {initials}
                           </div>
                        )}
                        <div className="min-w-0">
                           <div className="text-xs font-semibold text-slate-900 truncate">
                              {member.name}
                           </div>
                           <div className="text-[10px] text-slate-500 truncate">
                              {member.email}
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold border ${badgeStyle}`}>
                           {member.role}
                        </span>
                        <span 
                           className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              member.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'
                           }`}
                           title={member.status}
                        />
                     </div>
                  </button>
               );
            })}

            {filteredMembers.length === 0 && (
               <div className="py-6 text-center text-slate-400 text-xs">
                  No members found
               </div>
            )}
         </div>
      </motion.aside>

         {/* Member Details Modal */}
         <Modal
            isOpen={isMemberModalOpen}
            onClose={() => setIsMemberModalOpen(false)}
            title="Member Details"
         >
            {selectedMember && (
               <div className="space-y-5">
                  <div className="flex items-start gap-4">
                     {selectedMember.avatar ? (
                        <img
                           src={selectedMember.avatar}
                           alt={selectedMember.name}
                           className="w-14 h-14 rounded-xl border border-slate-200 object-cover"
                        />
                     ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold">
                           {(selectedMember.name || selectedMember.email || 'U')
                              .trim()
                              .split(' ')
                              .map((n) => n.charAt(0))
                              .join('')
                              .toUpperCase()
                              .slice(0, 2) || 'U'}
                        </div>
                     )}
                     <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 truncate">{selectedMember.name}</h3>
                        <p className="text-sm text-slate-500 truncate">{selectedMember.email}</p>
                        <div className="mt-2 flex items-center gap-2">
                           <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                              {selectedMember.role}
                           </span>
                           <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold ${
                              selectedMember.status === 'Active'
                                 ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                 : 'border-slate-200 bg-slate-50 text-slate-600'
                           }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${selectedMember.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              {selectedMember.status}
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                     <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Role</div>
                        <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                           <Shield className="w-4 h-4 text-emerald-600" />
                           {selectedMember.role}
                        </div>
                     </div>
                     <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Access</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                           {selectedMember.programScope === 'program' ? 'Program-specific' : 'All events'}
                        </div>
                     </div>
                     <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Joined</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{selectedMember.joinedDate}</div>
                     </div>
                     <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Last Active</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{selectedMember.lastActive}</div>
                     </div>
                  </div>

                  <div className="flex justify-end">
                     <Button type="button" variant="ghost" onClick={() => setIsMemberModalOpen(false)}>
                        Close
                     </Button>
                  </div>
               </div>
            )}
         </Modal>

         {/* Add Member Modal */}
         <Modal
            isOpen={isAddMemberModalOpen}
            onClose={() => setIsAddMemberModalOpen(false)}
            title="Add Member"
         >
            <form onSubmit={handleAddMember} className="space-y-4">
               <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Add an existing platform user to <span className="font-semibold">{activeOrganization.name}</span> and choose their role.
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                     required
                     type="email"
                     value={newMemberEmail}
                     onChange={(e) => setNewMemberEmail(e.target.value)}
                     placeholder="person@example.com"
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                  <select
                     required
                     value={newMemberRoleId}
                     onChange={(e) => setNewMemberRoleId(e.target.value)}
                     className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
                  >
                     {orgRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                           {role.name}
                        </option>
                     ))}
                  </select>
                  {orgRoles.length === 0 && (
                     <p className="mt-1 text-xs text-amber-700">Create a role before adding members.</p>
                  )}
               </div>
               <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setIsAddMemberModalOpen(false)} disabled={isAddingMember}>
                     Cancel
                  </Button>
                  <Button type="submit" disabled={isAddingMember || orgRoles.length === 0}>
                     {isAddingMember ? (
                        <>
                           <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                           Adding...
                        </>
                     ) : (
                        <>
                           <UserPlus className="w-4 h-4 mr-2" />
                           Add Member
                        </>
                     )}
                  </Button>
               </div>
            </form>
         </Modal>

         {/* Create Modal */}
         <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedType === 'Other' ? 'Create Custom Event' : `Create New ${selectedType}`}>
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
   <label className="block text-sm font-semibold text-slate-700 mb-3">
      Industry Focus
   </label>

   <div className="flex flex-wrap gap-2">
      {INDUSTRIES.map((industry) => (
         <button
            key={industry}
            type="button"
            onClick={() =>
               setNewEvent({
                  ...newEvent,
                  category: industry,
               })
            }
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
               ${
                  newEvent.category === industry
                     ? 'bg-emerald-600 text-white border-emerald-600'
                     : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
               }`}
         >
            {industry}
         </button>
      ))}
   </div>
</div>
<div>
   <label className="block text-sm font-semibold text-slate-700 mb-3">
      Judging Type <span className="text-red-500">*</span>
   </label>
   <div className="space-y-2">
      {JUDGING_TYPE_OPTIONS.map((option) => (
         <button
            key={option.value}
            type="button"
            onClick={() => setNewEvent({ ...newEvent, judgingType: option.value })}
            className={`w-full rounded-xl border px-4 py-3 text-left transition-[transform,border-color,background-color] duration-150 ease-out active:scale-[0.99] ${
               newEvent.judgingType === option.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-emerald-200'
            }`}
         >
            <p className="text-sm font-semibold text-slate-900">{option.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{option.description}</p>
         </button>
      ))}
   </div>
</div>
               <div>
                  <AppDatePicker
                     label="Submission Deadline"
                     value={newEvent.deadline || null}
                     minDate={todayDateString()}
                     onChange={(deadline) => setNewEvent({ ...newEvent, deadline: deadline || '' })}
                  />
               </div>
               <div className="bg-emerald-50 p-4 rounded-xl text-sm text-emerald-800 flex gap-3 items-start mt-4 border border-emerald-100">
                  <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700" />
                  <p>
                     The platform will automatically configure the workspace for a <strong>{selectedType}</strong> workflow, including optimal judging rounds based on research from {selectedType ? WORKFLOW_HINTS[selectedType] || 'industry best practices' : 'industry best practices'}.
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
   <label className="block text-sm font-semibold text-slate-700 mb-3">
      Industry Focus
   </label>

   <div className="flex flex-wrap gap-2">
      {INDUSTRIES.map((industry) => (
         <button
            key={industry}
            type="button"
            onClick={() =>
               setEditingEvent({
                  ...editingEvent,
                  category: industry,
               })
            }
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
               ${
                  editingEvent.category === industry
                     ? 'bg-emerald-600 text-white border-emerald-600'
                     : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
               }`}
         >
            {industry}
         </button>
      ))}
   </div>
</div>
<div>
   <label className="block text-sm font-semibold text-slate-700 mb-3">
      Status
   </label>

   <div className="flex flex-wrap gap-2">
      {(['Draft', 'Active', 'Completed'] as Program['status'][]).map((status) => (
         <button
            key={status}
            type="button"
            onClick={() =>
               setEditingEvent({
                  ...editingEvent,
                  status,
               })
            }
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
               ${
                  editingEvent.status === status
                     ? 'bg-emerald-600 text-white border-emerald-600'
                     : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
               }`}
         >
            {status}
         </button>
      ))}
   </div>
</div>
<br></br>
               <div>
                  <AppDatePicker
                     label="Submission Deadline"
                     value={editingEvent.deadline || null}
                     minDate={todayDateString()}
                     onChange={(deadline) => setEditingEvent({ ...editingEvent, deadline: deadline || '' })}
                  />
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
