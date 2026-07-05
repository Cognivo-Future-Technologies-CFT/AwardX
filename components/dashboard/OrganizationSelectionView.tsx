import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Building2, LogOut, Bell, Search, RefreshCw, Plus, ArrowRight,
  Sparkles, Layers, Calendar, Gavel
} from 'lucide-react';
import { Organization } from '../../services/models';
import { auth } from '../../services/supabase';
import { db as databaseService, type DashboardNotification } from '../../services/database';
import { buildDashboardPath } from '../../lib/dashboardRoutes';
import { handleNotificationClick } from '../../lib/notificationClick';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Logo, LogoTitle } from '../Logo';

interface JudgeInviteRow {
  judgeId: string;
  status: string;
  acceptedAt: string | null;
  inviteToken: string;
  program: {
    id: string;
    title: string;
    slug?: string | null;
    description?: string | null;
    coverImageUrl?: string | null;
    status?: string | null;
    deadline?: string | null;
    industryCategory?: string | null;
  };
  organization: { id: string; name: string; logoUrl?: string | null } | null;
}

interface UserData {
  name: string;
  avatar: string;
}

interface OrganizationSelectionViewProps {
  onSelectOrganization: (organization: Organization) => void;
  onLogout: () => void;
}

const OrganizationCard: React.FC<{
  organization: Organization;
  onClick: () => void;
}> = ({ organization, onClick }) => (
  <motion.button
    type="button"
    whileHover={{ y: -2 }}
    onClick={onClick}
    className="bg-white rounded-xl border border-slate-200 p-5 text-left cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all group w-full"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
        {organization.logoUrl ? (
          <img
            src={organization.logoUrl}
            alt=""
            className="w-8 h-8 rounded-md object-cover"
          />
        ) : (
          <Building2 className="w-5 h-5" />
        )}
      </div>
      <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">
        {organization.eventCount ?? 0} events
      </span>
    </div>

    <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
      {organization.name}
    </h3>
    <p className="text-sm text-slate-500 mb-5">
      {organization.industry || 'Organization workspace'}
      {organization.plan ? ` • ${organization.plan}` : ''}
    </p>

    <div className="flex items-center text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
      Open Organization <ArrowRight className="w-3 h-3 ml-1" />
    </div>
  </motion.button>
);

export const OrganizationSelectionView: React.FC<OrganizationSelectionViewProps> = ({
  onSelectOrganization,
  onLogout,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);
  
  const [userData, setUserData] = useState<UserData>({
    name: 'Loading...',
    avatar: '',
  });
  const [judgeInvites, setJudgeInvites] = useState<JudgeInviteRow[]>([]);
  const navigate = useNavigate();

  const filteredOrganizations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(q) ||
      (org.industry || '').toLowerCase().includes(q)
    );
  }, [organizations, searchQuery]);

  const stats = useMemo(() => {
    const totalEvents = organizations.reduce((sum, org) => sum + (org.eventCount ?? 0), 0);
    return {
      totalOrganizations: organizations.length,
      totalEvents,
    };
  }, [organizations]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await databaseService.getNotifications({ limit: 10, global: true });
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

  const handleMarkRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      try {
        await databaseService.markNotificationRead(id);
      } catch (err) {
        console.error('Error marking notification read:', err);
        loadNotifications();
      }
    },
    [loadNotifications]
  );

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

  const loadOrganizations = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      await databaseService.initialize();
      const [orgs, invites] = await Promise.all([
        databaseService.getUserOrganizations(),
        databaseService.getMyJudgeInvites(),
      ]);
      setOrganizations(orgs);
      setJudgeInvites(invites);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrganizations(true);

    const fetchUserData = async () => {
      try {
        const { user, error } = await auth.getUser();
        if (user && !error) {
          setUserData({
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
          });
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    fetchUserData();
    loadNotifications();
  }, [loadOrganizations, loadNotifications]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrganizationName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const created = await databaseService.createOrganization(newOrganizationName.trim());
      setOrganizations((prev) => [created, ...prev.filter((org) => org.id !== created.id)]);
      setIsCreateModalOpen(false);
      setNewOrganizationName('');
      onSelectOrganization(created);
    } catch (error: any) {
      alert(error?.message || 'Failed to create organization. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectOrganization = async (organization: Organization) => {
    await databaseService.setActiveOrganization(organization.id);
    onSelectOrganization(organization);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] font-sans text-slate-900">
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex justify-between items-center">
          <LogoTitle title="Organization Console" logoSize="xl" />

          <div className="flex items-center gap-4">
            <div className="hidden md:flex relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none w-72"
              />
            </div>
              <div className="h-6 w-px bg-slate-200 hidden md:block" />
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => {
                    setIsNotificationsOpen(prev => !prev);
                    if (!isNotificationsOpen) loadNotifications();
                  }}
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
                          onClick={() => {
                            void handleNotificationClick(n, navigate, {
                              onMarkRead: handleMarkRead,
                              ensureOrganizationContext: async (orgId) => {
                                const targetOrg = organizations.find((o) => o.id === orgId);
                                if (targetOrg) {
                                  await handleSelectOrganization(targetOrg);
                                }
                              },
                            });
                          }}
                          className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-emerald-50/40' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            {!n.isRead && <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
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
                  <div className="text-xs text-slate-500">Workspace</div>
                </div>
              </div>
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
        {judgeInvites.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-indigo-600" /> Events you're invited to judge
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  You've been invited as a judge on these events. Click to open your judging portal.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {judgeInvites.map((invite) => (
                <motion.button
                  key={invite.judgeId}
                  whileHover={{ y: -2 }}
                  onClick={() => navigate(`/judge/${invite.inviteToken}`)}
                  className="text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                      <Gavel className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded border ${
                      invite.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {invite.status === 'active' ? 'Accepted' : 'Invited'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-indigo-700 transition-colors">
                    {invite.program.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-2 line-clamp-2">
                    {invite.organization?.name || 'Award program'}
                    {invite.program.industryCategory ? ` • ${invite.program.industryCategory}` : ''}
                  </p>
                  {invite.program.deadline && (
                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Deadline: {new Date(invite.program.deadline).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex items-center text-xs font-semibold text-indigo-700 group-hover:translate-x-0.5 transition-transform">
                    Open judging portal <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-6">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Your Organizations</h2>
            <p className="text-slate-500 mt-1">
              Choose an organization to manage its events, teams, and settings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Organizations</p>
                <Layers className="w-4 h-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{stats.totalOrganizations}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Total Events</p>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{stats.totalEvents}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 mb-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-slate-600">
                Each organization can contain many events.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Organization</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadOrganizations(true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredOrganizations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrganizations.map((organization) => (
                <OrganizationCard
                  key={organization.id}
                  organization={organization}
                  onClick={() => handleSelectOrganization(organization)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-white text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Create your first organization</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                Organizations group your events, team members, and settings in one workspace.
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Organization
              </Button>
            </div>
          )}
        </section>
      </main>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isCreating) {
            setIsCreateModalOpen(false);
            setNewOrganizationName('');
          }
        }}
        title="Create Organization"
      >
        <form onSubmit={handleCreateOrganization} className="space-y-4">
          <div>
            <label htmlFor="organization-name" className="block text-sm font-medium text-slate-700 mb-1">
              Organization name
            </label>
            <input
              id="organization-name"
              type="text"
              value={newOrganizationName}
              onChange={(e) => setNewOrganizationName(e.target.value)}
              placeholder="Acme Awards Foundation"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setNewOrganizationName('');
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!newOrganizationName.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
