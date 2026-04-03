
import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, FileText, Gavel,
  BarChart3, Users, Settings, LogOut, Bell, Search,
  Menu, X, Sparkles, LayoutTemplate, MessageSquare, ChevronRight, Share2, Shield, Activity,
  ChevronLeft, ArrowLeft, Trophy, Plus, ChevronDown, Folder, CalendarClock, Settings2, Beaker,
  UserCog, Edit, Workflow, Layout, Command
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { Program, Category, PERMISSIONS, programStatusLabel } from '../../services/models';

interface DashboardUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
  lastActive: string;
  avatar: string;
  joinedDate: string;
}
import { db as databaseService } from '../../services/database';
import { auth, realtime } from '../../services/supabase';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UniversalSearchPalette, type UniversalSearchResult } from './UniversalSearchPalette';
import NavigationMenuFour, { type HeaderNavItem, type HeaderNavigationLink } from '@/components/ui/navigation-menu-4';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: string;
  activeEvent: Program | null;
  onChangeView: (view: string) => void;
  onSelectProgram: (program: Program) => void;
  onLogout: () => void;
  onSwitchEvent: () => void;
  noPadding?: boolean;
  hideHeader?: boolean;
}

interface SidebarItemProps {
  id: string;
  label: string;
  icon: any;
  currentView: string;
  collapsed: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ id, label, icon: Icon, currentView, collapsed, onClick, children }) => (
  <div className="mb-1">
    <button
      onClick={onClick}
      aria-current={currentView === id ? 'page' : undefined}
      className={`group w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${currentView === id
        ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
        }`}
      title={collapsed ? label : undefined}
    >
      <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
        <Icon className={`w-5 h-5 transition-colors ${currentView === id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
        {!collapsed && <span>{label}</span>}
      </div>
      {!collapsed && currentView === id && !children && (
        <motion.div layoutId="active-nav" className="w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
      )}
    </button>
    {!collapsed && children}
  </div>
);

// ... (CategoryTreeItem remains unchanged) ...
interface CategoryTreeItemProps {
  category: Category;
  allCategories: Category[];
  depth?: number;
  onAddSub: (parentId: string) => void;
  activeId: string;
  onSelect: (id: string) => void;
}

const CategoryTreeItem: React.FC<CategoryTreeItemProps> = ({
  category,
  allCategories,
  depth = 0,
  onAddSub,
  activeId,
  onSelect
}) => {
  const children = allCategories.filter(c => c.parentId === category.id);
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="relative">
      {depth > 0 && (
        <div className="absolute left-[-12px] top-0 bottom-0 w-px bg-slate-200"></div>
      )}
      <div className={`flex items-center justify-between py-1.5 pr-2 pl-2 rounded-lg group hover:bg-slate-50 transition-colors ${activeId === category.id ? 'bg-indigo-50/50 text-indigo-700' : 'text-slate-600'}`}>
        <div
          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
          style={{ paddingLeft: `${depth * 4}px` }}
          onClick={() => onSelect('awards')}
        >
          {children.length > 0 ? (
            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="p-0.5 hover:bg-slate-200 rounded">
              {expanded ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
            </button>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            </div>
          )}
          <span className="text-xs font-medium truncate">{category.title}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onAddSub(category.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-100 hover:text-indigo-600 rounded transition-all"
          title="Add Subcategory"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {expanded && children.length > 0 && (
        <div className="ml-4">
          {children.map(child => (
            <CategoryTreeItem
              key={child.id}
              category={child}
              allCategories={allCategories}
              depth={depth + 1}
              onAddSub={onAddSub}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  currentView,
  activeEvent,
  onChangeView,
  onSelectProgram,
  onLogout,
  onSwitchEvent,
  noPadding = false,
  hideHeader = false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [pendingShortcut, setPendingShortcut] = useState<string | null>(null);

  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [parentForModal, setParentForModal] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // User & Permissions
  const [currentUser, setCurrentUser] = useState<DashboardUser>({
    id: '',
    name: 'Loading...',
    email: '',
    role: 'Admin',
    status: 'Active',
    lastActive: 'Now',
    avatar: '',
    joinedDate: new Date().toISOString().split('T')[0],
  });
  const [allUsers, setAllUsers] = useState<DashboardUser[]>([]);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const queryClient = useQueryClient();
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', activeEvent?.id || 'all'],
    queryFn: () => databaseService.getNotifications({ programId: activeEvent?.id, limit: 8 }),
  });

  const allProgramsQuery = useQuery({
    queryKey: ['dashboard-search-programs'],
    queryFn: () => databaseService.getPrograms(),
    staleTime: 5 * 60_000,
  });

  const allSubmissionsQuery = useQuery({
    queryKey: ['dashboard-search-submissions'],
    queryFn: () => databaseService.getSubmissions(),
    staleTime: 30_000,
  });

  const allTeamMembersQuery = useQuery({
    queryKey: ['dashboard-search-team'],
    queryFn: () => databaseService.getTeamMembers(),
    staleTime: 30_000,
  });

  const allRolesQuery = useQuery({
    queryKey: ['dashboard-search-roles'],
    queryFn: () => databaseService.getRoles(),
    staleTime: 60_000,
  });

  const allLogsQuery = useQuery({
    queryKey: ['dashboard-search-logs'],
    queryFn: () => databaseService.getLogs(),
    staleTime: 30_000,
  });

  const allNotificationsQuery = useQuery({
    queryKey: ['dashboard-search-notifications'],
    queryFn: () => databaseService.getNotifications({ limit: 50 }),
    staleTime: 30_000,
  });

  const activeCategoriesQuery = useQuery({
    queryKey: ['dashboard-search-categories', activeEvent?.id || 'none'],
    queryFn: () => (activeEvent ? databaseService.getCategories(activeEvent.id) : Promise.resolve([])),
    enabled: !!activeEvent,
    staleTime: 60_000,
  });

  const activeFormsQuery = useQuery({
    queryKey: ['dashboard-search-forms', activeEvent?.id || 'none'],
    queryFn: () => (activeEvent ? databaseService.getForms(activeEvent.id) : Promise.resolve([])),
    enabled: !!activeEvent,
    staleTime: 60_000,
  });

  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const openSettingsTab = (tab: 'profile' | 'billing' | 'notifications' | 'security' | 'domain' | 'shortcuts') => {
    const params = new URLSearchParams(window.location.search);
    params.set('view', 'settings');
    params.set('tab', tab);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    onChangeView('settings');
  };

  const openView = (view: string) => {
    onChangeView(view);
  };

  const searchResults = useMemo<UniversalSearchResult[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    const programs = allProgramsQuery.data || [];
    const submissions = allSubmissionsQuery.data || [];
    const members = allTeamMembersQuery.data || [];
    const roles = allRolesQuery.data || [];
    const logs = allLogsQuery.data || [];
    const notificationsData = allNotificationsQuery.data || [];
    const categories = activeCategoriesQuery.data || [];
    const forms = activeFormsQuery.data || [];

    const quickActions: UniversalSearchResult[] = [
      {
        id: 'action-overview',
        title: 'Go to Overview',
        description: 'Jump back to the program dashboard.',
        meta: 'Navigation',
        icon: <LayoutDashboard />,
        onSelect: () => openView('overview'),
      },
      {
        id: 'action-settings',
        title: 'Open Settings',
        description: 'Browse profile, billing, and shortcut guide.',
        meta: 'Navigation',
        icon: <Settings />,
        onSelect: () => openSettingsTab('profile'),
      },
      {
        id: 'action-shortcuts',
        title: 'Shortcut Guide',
        description: 'See keyboard shortcuts for fast navigation.',
        meta: 'Help',
        icon: <Command />,
        onSelect: () => openSettingsTab('shortcuts'),
      },
      {
        id: 'action-teams',
        title: 'Teams & Roles',
        description: 'Manage team members and permissions.',
        meta: 'Navigation',
        icon: <Users />,
        onSelect: () => openView('teams'),
      },
      {
        id: 'action-forms',
        title: 'Form Builder',
        description: 'Edit the submission form and fields.',
        meta: 'Navigation',
        icon: <LayoutTemplate />,
        onSelect: () => openView('templates'),
      },
    ];

    if (!query) {
      return quickActions;
    }

    const scored: Array<UniversalSearchResult & { score: number }> = [];

    const addResult = (result: UniversalSearchResult, haystack: string) => {
      const normalized = haystack.toLowerCase();
      if (!normalized.includes(query)) return;
      let score = 1;
      if (result.title.toLowerCase() === query) score += 50;
      if (result.title.toLowerCase().startsWith(query)) score += 25;
      if (normalized.startsWith(query)) score += 10;
      if (normalized.includes(`${query} `)) score += 5;
      scored.push({ ...result, score });
    };

    programs.forEach((program) => {
      addResult(
        {
          id: `program-${program.id}`,
          title: program.title,
          description: program.description || `${program.category} · ${program.type} · ${programStatusLabel(program.status)}`,
          meta: 'Program',
          icon: <Sparkles />,
          onSelect: () => {
            if (program.id !== activeEvent?.id) {
              onSelectProgram(program);
            }
            openView('overview');
          },
        },
        [program.title, program.description, program.category, program.type, program.status].filter(Boolean).join(' '),
      );
    });

    submissions.forEach((submission) => {
      addResult(
        {
          id: `submission-${submission.id}`,
          title: submission.title,
          description: `${submission.applicant} · ${submission.category} · ${submission.status}`,
          meta: 'Submission',
          icon: <FileText />,
          onSelect: () => openView('submissions'),
        },
        [submission.title, submission.applicant, submission.category, submission.status, submission.score, submission.date].filter(Boolean).join(' '),
      );
    });

    members.forEach((member) => {
      addResult(
        {
          id: `team-${member.userId || member.memberId}`,
          title: member.name,
          description: `${member.email} · ${member.role} · ${member.status}`,
          meta: 'Team',
          icon: <Users />,
          onSelect: () => openView('teams'),
        },
        [member.name, member.email, member.role, member.status].filter(Boolean).join(' '),
      );
    });

    roles.forEach((role) => {
      addResult(
        {
          id: `role-${role.id}`,
          title: role.name,
          description: `${role.permissions.length} permissions configured`,
          meta: 'Role',
          icon: <Shield />,
          onSelect: () => openView('teams'),
        },
        [role.name, role.permissions.join(' ')].join(' '),
      );
    });

    logs.forEach((log) => {
      addResult(
        {
          id: `log-${log.id}`,
          title: log.action,
          description: `${log.user} · ${log.details || 'Activity log entry'}`,
          meta: 'Log',
          icon: <Activity />,
          onSelect: () => openView('logs'),
        },
        [log.action, log.user, log.details, log.type].filter(Boolean).join(' '),
      );
    });

    notificationsData.forEach((notification) => {
      addResult(
        {
          id: `notification-${notification.id}`,
          title: notification.title,
          description: notification.body || 'Notification',
          meta: notification.isRead ? 'Read' : 'Unread',
          icon: <Bell />,
          onSelect: () => openView('overview'),
        },
        [notification.title, notification.body, notification.type].filter(Boolean).join(' '),
      );
    });

    categories.forEach((category) => {
      addResult(
        {
          id: `category-${category.id}`,
          title: category.title,
          description: 'Program category',
          meta: 'Category',
          icon: <Folder />,
          onSelect: () => openView('awards'),
        },
        category.title,
      );
    });

    forms.forEach((form) => {
      addResult(
        {
          id: `form-${form.id}`,
          title: form.title,
          description: form.description || 'Program form',
          meta: form.is_active ? 'Active form' : 'Draft form',
          icon: <LayoutTemplate />,
          onSelect: () => openView('templates'),
        },
        [form.title, form.description, form.is_active ? 'active' : 'draft'].filter(Boolean).join(' '),
      );
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...result }) => result)
      .slice(0, 12);
  }, [
    activeEvent?.id,
    allLogsQuery.data,
    allNotificationsQuery.data,
    allProgramsQuery.data,
    allRolesQuery.data,
    allSubmissionsQuery.data,
    allTeamMembersQuery.data,
    activeCategoriesQuery.data,
    activeFormsQuery.data,
    searchQuery,
  ]);

  const runShortcutAction = (action: string) => {
    switch (action) {
      case 'overview':
        openView('overview');
        break;
      case 'builder':
        openView('builder');
        break;
      case 'details':
        openView('program-details');
        break;
      case 'forms':
        openView('templates');
        break;
      case 'settings':
        openSettingsTab('profile');
        break;
      case 'teams':
        openView('teams');
        break;
      case 'analytics':
        openView('analytics');
        break;
      case 'reach':
        openView('reach');
        break;
      case 'logs':
        openView('logs');
        break;
      case 'judging':
        openView('judging');
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.isContentEditable
        || !!target.closest('input, textarea, [contenteditable]');

      if (event.metaKey || event.ctrlKey) {
        if (event.key.toLowerCase() === 'k') {
          event.preventDefault();
          setIsSearchOpen(true);
          return;
        }
      }

      if (isTyping) return;

      if (event.key === '?') {
        event.preventDefault();
        openSettingsTab('shortcuts');
        return;
      }

      if (event.key === 'Escape') {
        setPendingShortcut(null);
        setIsSearchOpen(false);
        return;
      }

      if (pendingShortcut === 'g') {
        event.preventDefault();
        runShortcutAction({
          o: 'overview',
          b: 'builder',
          p: 'details',
          f: 'forms',
          s: 'settings',
          t: 'teams',
          a: 'analytics',
          r: 'reach',
          l: 'logs',
          j: 'judging',
        }[event.key.toLowerCase()] || '');
        setPendingShortcut(null);
        return;
      }

      if (event.key.toLowerCase() === 'g') {
        setPendingShortcut('g');
        window.setTimeout(() => setPendingShortcut((current) => (current === 'g' ? null : current)), 900);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingShortcut]);

  useEffect(() => {
    const channel = realtime.subscribeToNotifications(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => realtime.unsubscribe(channel);
  }, [queryClient]);

  useEffect(() => {
    // Fetch real user data from Supabase
    const fetchUserData = async () => {
      try {
        await databaseService.initialize();
        setPermissionsReady(true);
        const realUser = await databaseService.getCurrentUser();
        if (realUser) {
          setCurrentUser(realUser);
        } else {
          // Fallback: Get user from auth
          const { user } = await auth.getUser();
          if (user) {
            setCurrentUser({
              id: user.id,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              role: 'Admin',
              status: 'Active',
              lastActive: 'Now',
              avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
              joinedDate: new Date().toISOString().split('T')[0],
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Fallback: Get user from auth directly
        try {
          const { user } = await auth.getUser();
          if (user) {
            setCurrentUser({
              id: user.id,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              role: 'Admin',
              status: 'Active',
              lastActive: 'Now',
              avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
              joinedDate: new Date().toISOString().split('T')[0],
            });
          }
        } catch (authError) {
          console.error('Failed to get user from auth:', authError);
        }
      }
    };

    fetchUserData();

    const fetchCategories = async () => {
      if (!activeEvent) return;
      const cats = await databaseService.getCategories(activeEvent.id);
      setCategories(cats);
    };

    fetchCategories();
  }, [activeEvent, isCategoryModalOpen]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !newCategoryName) return;

    await databaseService.addCategory({
      title: newCategoryName,
      programId: activeEvent.id,
      parentId: parentForModal
    });
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
  };

  const openCategoryModal = (parentId: string | null = null) => {
    setParentForModal(parentId);
    setNewCategoryName('');
    setIsCategoryModalOpen(true);
  };

  // Define Nav items with Permissions
  const leftNavItems = [
    { id: 'overview',          label: 'Overview',           icon: LayoutDashboard, permission: PERMISSIONS.VIEW_OVERVIEW },
    { id: 'builder',           label: 'Overview Page',      icon: Sparkles,        permission: PERMISSIONS.MANAGE_PROGRAMS },
    { id: 'program-details',   label: 'Program Details',    icon: Edit,            permission: PERMISSIONS.MANAGE_PROGRAMS },
    { id: 'schedule-rounds',   label: 'Schedule & Rounds',  icon: CalendarClock,   permission: PERMISSIONS.MANAGE_PROGRAMS },
    { id: 'submission-setup',  label: 'Submission Process', icon: Settings2,       permission: PERMISSIONS.MANAGE_PROGRAMS },
    { id: 'submissions',       label: 'Submissions',        icon: FileText,        permission: PERMISSIONS.VIEW_SUBMISSIONS },
    { id: 'judging',           label: 'Judging',            icon: Gavel,           permission: PERMISSIONS.VIEW_JUDGING },
    { id: 'awards',            label: 'Awards',             icon: Trophy,          permission: PERMISSIONS.MANAGE_PROGRAMS },
    { id: 'templates',         label: 'Form Builder',       icon: LayoutTemplate,  permission: PERMISSIONS.MANAGE_FORMS },
    ...(activeEvent?.type === 'Other' ? [{ id: 'custom-grid', label: 'Grid Builder', icon: Layout, permission: PERMISSIONS.MANAGE_PROGRAMS }] : []),
  ];


  const rightNavItems = [
    { id: 'reach', label: 'Reach', icon: Share2, permission: PERMISSIONS.MANAGE_REACH },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, permission: PERMISSIONS.VIEW_ANALYTICS },
    { id: 'teams', label: 'Teams & Roles', icon: Shield, permission: PERMISSIONS.MANAGE_TEAMS },
    { id: 'logs', label: 'Audit Logs', icon: Activity, permission: PERMISSIONS.VIEW_LOGS },
    { id: 'settings', label: 'Settings', icon: Settings, permission: PERMISSIONS.MANAGE_SETTINGS },
  ];

  const filterNav = (items: any[]) => items.filter(item => databaseService.hasPermission(item.permission));

  const visibleLeftNav = filterNav(leftNavItems);
  const visibleRightNav = filterNav(rightNavItems);
  const rootCategories = categories.filter(c => c.parentId === null);
  const headerNavigationLinks = useMemo<HeaderNavigationLink[]>(() => {
    const overviewLink: HeaderNavigationLink = {
      label: 'Overview',
      submenu: false,
      onSelect: () => onChangeView('overview'),
    };

    const operationLinks: HeaderNavItem[] = visibleLeftNav
      .filter((item) => item.id !== 'overview')
      .map((item) => ({
        label: item.label,
        description: `Open ${item.label} view`,
        onSelect: () => onChangeView(item.id),
      }));

    const workspaceLinks: HeaderNavItem[] = visibleRightNav.map((item) => ({
      label: item.label,
      onSelect: () => onChangeView(item.id),
    }));

    const quickLinks: HeaderNavItem[] = [
      {
        label: 'Open Settings',
        icon: 'InfoIcon' as const,
        onSelect: () => onChangeView('settings'),
      },
      {
        label: 'Audit Logs',
        icon: 'BookOpenIcon' as const,
        onSelect: () => onChangeView('logs'),
      },
      {
        label: 'Teams & Roles',
        icon: 'LifeBuoyIcon' as const,
        onSelect: () => onChangeView('teams'),
      },
    ];

    const links: HeaderNavigationLink[] = [
      overviewLink,
      {
        label: 'Operations',
        submenu: true as const,
        type: 'description',
        items: operationLinks,
      },
      {
        label: 'Workspace',
        submenu: true as const,
        type: 'simple',
        items: workspaceLinks,
      },
      {
        label: 'Quick Actions',
        submenu: true as const,
        type: 'icon',
        items: quickLinks,
      },
    ];

    return links.filter((link) => !link.submenu || link.items.length > 0);
  }, [onChangeView, visibleLeftNav, visibleRightNav]);

  // Demo-only user switching was removed for Supabase-backed auth.
  const handleUserSwitch = (_userId: string) => {
    // no-op
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 overflow-hidden">
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[70] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-indigo-600 focus:font-semibold focus:text-sm focus:border focus:border-indigo-200"
      >
        Skip to content
      </a>
      {/* Visual Indicator for Test Mode */}
      {isTestMode && (
        <div className="fixed top-0 left-0 w-full h-1 bg-amber-400 z-[60]" />
      )}

      {/* LEFT SIDEBAR - Desktop */}
      <aside
        role="navigation"
        aria-label="Dashboard navigation"
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${isLeftCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        {/* Header / Logo / Event Switcher */}
        <div className={`h-auto min-h-[5rem] flex flex-col border-b border-slate-50 transition-all ${isLeftCollapsed ? 'items-center py-4' : 'p-4'}`}>
          {/* Back to Hub Button */}
          {!isLeftCollapsed && (
            <button
              onClick={onSwitchEvent}
              className="flex items-center text-xs font-bold text-slate-400 hover:text-indigo-600 mb-4 transition-colors group"
            >
              <ArrowLeft className="w-3 h-3 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to Hub
            </button>
          )}
          {isLeftCollapsed && (
            <button onClick={onSwitchEvent} className="mb-4 text-slate-400 hover:text-indigo-600"><ArrowLeft className="w-4 h-4" /></button>
          )}

          {/* Active Event Display */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!isLeftCollapsed && (
              <div className="overflow-hidden">
                <div className="font-display tracking-tight text-sm font-bold text-slate-900 truncate leading-tight">
                  {activeEvent?.title || 'Active Event'}
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{activeEvent?.type || 'Event'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-hide">
          {!isLeftCollapsed && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3 font-display">Event Operations</div>}

          {visibleLeftNav.map((item) => (
            <SidebarItem
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              currentView={currentView}
              collapsed={isLeftCollapsed}
              onClick={() => onChangeView(item.id)}
            >
            </SidebarItem>
          ))}

          {visibleRightNav.length > 0 && (
            <>
              {!isLeftCollapsed && (
                <div className="mt-6 mb-4 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Workspace Tools</div>
              )}

              {visibleRightNav.map((item) => (
                <SidebarItem
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  icon={item.icon}
                  currentView={currentView}
                  collapsed={isLeftCollapsed}
                  onClick={() => onChangeView(item.id)}
                />
              ))}
            </>
          )}
        </div>

        {/* User Profile (Left Bottom) */}
        <div className="p-3 border-t border-slate-100 relative group">
          <div className={`bg-slate-50/80 rounded-xl p-2 border border-slate-100 transition-all cursor-pointer hover:bg-slate-100 ${isLeftCollapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}>
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt="User"
                className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full border-2 border-white shadow-sm bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {currentUser.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            {!isLeftCollapsed && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-sm font-bold text-slate-900 truncate font-display">{currentUser.name}</div>
                <div className="text-xs text-indigo-600 font-medium truncate">{currentUser.role}</div>
              </div>
            )}
          </div>

          {/* User Switcher Dropdown (For Demo Purposes) */}
          <div className="absolute bottom-full left-0 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 mb-2 hidden group-hover:block z-50">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Switch Persona (Demo)</div>
            {allUsers.map(u => (
              <button
                key={u.id}
                onClick={() => handleUserSwitch(u.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${currentUser.id === u.id ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50'}`}
              >
                {u.avatar ? (
                  <img src={u.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {u.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="truncate">{u.name} ({u.role})</span>
              </button>
            ))}
          </div>

          <button
            onClick={onLogout}
            className={`w-full flex items-center mt-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors group ${isLeftCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
              }`}
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 group-hover:text-red-500 transition-colors" />
            {!isLeftCollapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
          className="absolute -right-3 top-24 bg-white border border-slate-200 rounded-full p-1 shadow-sm text-slate-400 hover:text-indigo-600 z-50"
        >
          {isLeftCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>


      {/* MAIN CONTENT AREA */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out min-h-screen relative
          ${isLeftCollapsed ? 'lg:pl-20' : 'lg:pl-64'} 
          lg:pr-0
        `}
      >
        {/* Top Header Mobile/Desktop Mix */}
        {!hideHeader && (
          <NavigationMenuFour
            navigationLinks={headerNavigationLinks}
            eventTitle={activeEvent?.title || 'Event'}
            currentView={currentView}
            unreadCount={unreadCount}
            isLive={!isTestMode}
            compact={isLeftCollapsed}
            searchValue={searchQuery}
            onSearchChange={(value) => {
              setSearchQuery(value);
              setIsSearchOpen(true);
            }}
            onToggleLive={() => setIsTestMode((prev) => !prev)}
            onBackToHub={onSwitchEvent}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          />
        )}

        {!hideHeader && showMobileSearch && (
          <div className="sm:hidden border-b border-slate-200/60 bg-white px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search workspace..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <main id="main-content" className={`flex-1 overflow-y-auto ${noPadding ? '' : 'p-4 lg:p-8'}`}>
          {isTestMode && (
            <div className="mb-6 mx-4 lg:mx-8 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Beaker className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-800">You are in Sandbox Mode</h4>
                <p className="text-xs text-amber-700 mt-1">Actions performed here will not affect live data. Use this environment to test your program configuration.</p>
              </div>
            </div>
          )}
          <div className={noPadding || currentView === 'settings' ? 'h-full w-full' : 'max-w-7xl mx-auto'}>
            {children}
          </div>
        </main>
      </div>


      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col lg:hidden shadow-2xl overflow-y-auto"
            >
              <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-xl text-slate-900 font-display">AwardX</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-lg text-slate-500"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 py-6 px-4 space-y-6">
                <button
                  onClick={() => { onSwitchEvent(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 font-medium text-sm border border-slate-100"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Event Hub
                </button>

                <div>

                <UniversalSearchPalette
                  isOpen={isSearchOpen}
                  query={searchQuery}
                  results={searchResults}
                  onQueryChange={setSearchQuery}
                  onClose={() => setIsSearchOpen(false)}
                />
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Operations</div>
                  <div className="space-y-1">
                    {visibleLeftNav.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onChangeView(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentView === item.id
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                      >
                        <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Management</div>
                  <div className="space-y-1">
                    {visibleRightNav.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onChangeView(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${currentView === item.id
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                      >
                        <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100">
                <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 font-medium">
                  <LogOut className="w-5 h-5" /> Exit Demo
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={parentForModal ? "Add Subcategory" : "Create New Award"}>
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {parentForModal ? "Subcategory Name" : "Award Name"}
            </label>
            <div className="relative">
              <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder={parentForModal ? "e.g. Best UI" : "e.g. Design Awards"}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
