
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db, PendingInvite } from '../../services/database';
import { PERMISSIONS, Role, TeamMember, Program } from '../../services/models';
import { useAuth } from '../../contexts/AuthContext';
import {
    Plus, UserPlus, Shield, MoreVertical, Search, Filter,
    Trash2, Edit2, CheckCircle2, UserCog, Clock, Copy,
    RefreshCw, X, Mail, Link2, AlertCircle,
} from 'lucide-react';
import { Button } from '../Button';
import { UserHoverCard } from '../UserHoverCard';
import { Modal } from '../Modal';
import { useConfirm } from '../ConfirmDialog';
import { sendTeamInviteEmail, resendTeamInvite, type EmailApiRequestTrace } from '../../services/email';
import { queryKeys } from '../../services/queryKeys';
import { isPersistedUuid } from '../../lib/ids';
import { resolvePublicSiteUrl } from '../../lib/siteUrl';
import { TableSkeleton } from '../SkeletonLoader';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';


const PERMISSION_GROUPS = [
    {
        label: "Submissions & Entries",
        items: [
            { key: PERMISSIONS.VIEW_SUBMISSIONS, label: "View Submissions" },
            { key: PERMISSIONS.MANAGE_SUBMISSIONS, label: "Manage Status (Accept/Reject)" },
            { key: PERMISSIONS.MANAGE_FORMS, label: "Edit Submission Forms" },
            { key: PERMISSIONS.MARK_ATTENDANCE, label: "Mark Attendance" },
        ]
    },
    {
        label: "Judging",
        items: [
            { key: PERMISSIONS.VIEW_JUDGING, label: "View Judging Panels" },
            { key: PERMISSIONS.MANAGE_JUDGING, label: "Assign Judges & Configure Criteria" },
        ]
    },
    {
        label: "Program Management",
        items: [
            { key: PERMISSIONS.VIEW_OVERVIEW, label: "View Dashboard Stats" },
            { key: PERMISSIONS.MANAGE_PROGRAMS, label: "Edit Program Schedule & Awards" },
            { key: PERMISSIONS.VIEW_ANALYTICS, label: "View Analytics" },
        ]
    },
    {
        label: "Administration",
        items: [
            { key: PERMISSIONS.MANAGE_TEAMS, label: "Manage Teams & Roles" },
            { key: PERMISSIONS.MANAGE_SETTINGS, label: "Access Global Settings" },
            { key: PERMISSIONS.VIEW_LOGS, label: "View Audit Logs" },
        ]
    }
];

const ROLE_PRESETS = [
  {
    key: 'judge',
    name: 'Judge',
    description: 'Review and score submissions',
    permissions: [
      PERMISSIONS.VIEW_SUBMISSIONS,
      PERMISSIONS.VIEW_JUDGING,
    ],
    color: 'bg-blue-100 text-blue-700',
    icon: '🏆',
  },
  {
    key: 'lead-judge',
    name: 'Lead Judge',
    description: 'Manage and oversee judging',
    permissions: [
      PERMISSIONS.VIEW_SUBMISSIONS,
      PERMISSIONS.VIEW_JUDGING,
      PERMISSIONS.MANAGE_JUDGING,
    ],
    color: 'bg-purple-100 text-purple-700',
    icon: '⭐',
  },
  {
    key: 'manager',
    name: 'Event Manager',
    description: 'Manage programs and operations',
    permissions: [
      PERMISSIONS.VIEW_OVERVIEW,
      PERMISSIONS.MANAGE_PROGRAMS,
      PERMISSIONS.VIEW_ANALYTICS,
    ],
    color: 'bg-emerald-100 text-emerald-700',
    icon: '📋',
  },
  {
    key: 'attendance-marker',
    name: 'Attendance Marker',
    description: 'Check in participants at the event',
    permissions: [
      PERMISSIONS.MARK_ATTENDANCE,
    ],
    color: 'bg-amber-100 text-amber-700',
    icon: '✅',
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Full system access',
    permissions: Object.values(PERMISSIONS),
    color: 'bg-rose-100 text-rose-700',
    icon: '🛡️',
  },
];
interface TeamsViewProps {
    activeEvent?: Program | null;
}

// ── Main Component ────────────────────────────────────────────────────────────

export const TeamsView: React.FC<TeamsViewProps> = ({ activeEvent }) => {
    const { confirm, ConfirmDialogNode } = useConfirm();
    const queryClient = useQueryClient();
    const { userId: currentUserId, orgId, user } = useAuth();
    const currentUserEmail = user?.email ?? null;
    const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
    const [inviteEmailBlocks, setInviteEmailBlocks] = useState<string[]>([]);
    const [inviteEmailDraft, setInviteEmailDraft] = useState('');
    const [inviteRoleId, setInviteRoleId] = useState<string>('');
    const [inviteScope, setInviteScope] = useState<'program' | 'organization'>('program');
    const [isBulkInviting, setIsBulkInviting] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [roleFilterOpen, setRoleFilterOpen] = useState(false);
    const [memberPage, setMemberPage] = useState(1);
    const [resendingId, setResendingId] = useState<string | null>(null);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const eventId = activeEvent?.id ?? '';
    const eventTitle = activeEvent?.title || 'your workspace';

    const appendRequestTrace = (trace: EmailApiRequestTrace) => {
        if (!eventId) return;
        void db.addInviteRequestTrace(eventId, trace).catch((err) => {
            console.warn('Failed to persist invite request trace:', err);
        });
    };

    // Modals
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
    const [changingMember, setChangingMember] = useState<TeamMember | null>(null);
    const [newRoleId, setNewRoleId] = useState('');
    const [editingRole, setEditingRole] = useState<Partial<Role>>({
        name: '',
        permissions: [],
        color: 'bg-slate-100 text-slate-700'
    });

    // ── Queries ────────────────────────────────────────────────────────────────
    const { data: members = [], isLoading: membersLoading } = useQuery({
        queryKey: queryKeys.teams.members(eventId),
        queryFn: () => db.getTeamMembers(eventId),
        enabled: !!eventId,
        staleTime: 30_000,
    });

    const { data: pendingInvites = [], isLoading: invitesLoading } = useQuery({
        queryKey: queryKeys.invites.pending(orgId ?? ''),
        queryFn: () => db.getPendingTeamInvites(orgId!),
        enabled: !!orgId,
        staleTime: 30_000,
    });



    const { data: rawRoles = [] } = useQuery({
        queryKey: queryKeys.teams.roles(eventId),
        queryFn: () => db.getRoles(eventId),
        enabled: !!eventId,
        staleTime: 5 * 60_000,
    });

    const roles: Role[] = rawRoles.map(r => ({
        ...r,
        usersCount: members.filter(m => m.roleId === r.id).length,
    }));

    useEffect(() => {
        if (!inviteRoleId && rawRoles[0]?.id) setInviteRoleId(rawRoles[0].id);
    }, [rawRoles]);



    // ── Mutations ──────────────────────────────────────────────────────────────
    const inviteMutation = useMutation({
        mutationFn: async (vars: { email: string; roleId: string; scope: 'program' | 'organization' }) => {
            const roleName = rawRoles.find(r => r.id === vars.roleId)?.name;
            const result: any = await sendTeamInviteEmail({
                email: vars.email,
                roleId: vars.roleId,
                roleName,
                programTitle: eventTitle,
                organizationId: orgId || undefined,
                programId: vars.scope === 'program' ? eventId : undefined,
            }, { onTrace: appendRequestTrace });
            return result || { ok: true, emailSent: true };
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'An unexpected error occurred';
            toast.error(`Error: ${message}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.members(eventId) });
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.invites.pending(orgId) });
            }
        },
    });

    const removeMutation = useMutation({
        mutationFn: async (memberId: string) => {
            const member = members.find(m => m.memberId === memberId);
            if (member?.role === 'Judge') {
                return db.deleteJudge(memberId);
            }
            return db.removeTeamMember(memberId);
        },
        onMutate: async (memberId) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.teams.members(eventId) });
            const previous = queryClient.getQueryData<TeamMember[]>(queryKeys.teams.members(eventId));
            queryClient.setQueryData<TeamMember[]>(queryKeys.teams.members(eventId), old =>
                (old ?? []).filter(m => m.memberId !== memberId)
            );
            return { previous };
        },
        onError: (_err, _vars, context) => {
            queryClient.setQueryData(queryKeys.teams.members(eventId), context?.previous);
            toast.error('Failed to remove member');
        },
        onSuccess: () => toast.success('Member removed'),
    });

    const roleChangeMutation = useMutation({
        mutationFn: (vars: { memberId: string; roleId: string; email: string; userName: string; roleName: string; programTitle: string; oldRoleName: string; newPermissions: string[] }) =>
            db.updateTeamMemberRole(vars.memberId, vars.roleId, eventId, vars.email, vars.roleName, vars.programTitle, vars.oldRoleName, vars.userName, vars.newPermissions),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.members(eventId) });
            toast.success('Role updated');
            setIsChangeRoleModalOpen(false);
        },
        onError: () => toast.error('Failed to update role'),
    });

    // ── Invite actions ─────────────────────────────────────────────────────────
    const handleResend = async (invite: PendingInvite) => {
        setResendingId(invite.id);
        try {
            await resendTeamInvite(invite.id, eventTitle, { onTrace: appendRequestTrace });
            toast.success(`Invite resent to ${invite.email}`);
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.invites.pending(orgId) });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to resend invite');
        } finally {
            setResendingId(null);
        }
    };

    const handleRevoke = async (invite: PendingInvite) => {
        const ok = await confirm({
            title: 'Revoke invitation?',
            description: `The invite link for ${invite.email} will stop working immediately.`,
            confirmLabel: 'Revoke',
        });
        if (!ok) return;
        setRevokingId(invite.id);
        try {
            await db.cancelTeamInvite(invite.id);
            toast.success('Invitation revoked');
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.invites.pending(orgId) });
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to revoke invite');
        } finally {
            setRevokingId(null);
        }
    };



    // ── Role editor ────────────────────────────────────────────────────────────
    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole.name) return;
        const roleId = editingRole.id;
        const isExistingRole = isPersistedUuid(roleId);
        try {
            if (isExistingRole) {
                await db.updateRole({
                    id: roleId,
                    name: editingRole.name,
                    color: editingRole.color,
                    permissions: editingRole.permissions || [],
                });
            } else {
                if (!isPersistedUuid(eventId)) {
                    toast.error('Program is still loading. Wait a moment and try again.');
                    return;
                }
                await db.createRole({
                    name: editingRole.name,
                    permissions: editingRole.permissions || [],
                    color: editingRole.color,
                    programId: eventId,
                });
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.roles(eventId) });
            toast.success('Role saved');
            setIsRoleModalOpen(false);
            setEditingRole({ name: '', permissions: [], color: 'bg-slate-100 text-slate-700' });
        } catch (err: unknown) {
            toast.error((err as Error)?.message || 'Failed to save role');
        }
    };

    const openRoleModal = (role?: Role) => {
        setEditingRole(role ? { ...role } : { name: '', permissions: [], color: 'bg-slate-100 text-slate-700' });
        setIsRoleModalOpen(true);
    };

    const duplicateRole = (role: Role) => {
    const { id, usersCount, ...rest } = role;

    setEditingRole({
        ...rest,
        name: `${role.name} Copy`,
    });

    setIsRoleModalOpen(true);
};

    const togglePermission = (key: string) => {
        const current = editingRole.permissions || [];
        if (current.includes('all')) {
            setEditingRole({ ...editingRole, permissions: [key] });
            return;
        }
        if (current.includes(key)) {
            setEditingRole({ ...editingRole, permissions: current.filter(p => p !== key) });
        } else {
            setEditingRole({ ...editingRole, permissions: [...current, key] });
        }
    };

    const addInviteEmailBlocks = (raw: string) => {
        const emails = raw
            .split(/[,\n]/g)
            .map((s) => s.trim())
            .filter(Boolean);

        if (emails.length === 0) return;

        setInviteEmailBlocks((prev) => {
            const seen = new Set(prev.map((e) => e.toLowerCase()));
            const next = [...prev];

            for (const email of emails) {
                const key = email.toLowerCase();
                if (seen.has(key)) continue;
                seen.add(key);
                next.push(email);
            }

            return next;
        });
    };

    const commitInviteEmailDraft = () => {
        const value = inviteEmailDraft.trim();
        if (!value) return;
        addInviteEmailBlocks(value);
        setInviteEmailDraft('');
    };

    const removeInviteEmailBlock = (emailToRemove: string) => {
        setInviteEmailBlocks((prev) => prev.filter((email) => email !== emailToRemove));
    };

    const handleInviteDraftKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            if (inviteEmailDraft.trim()) {
                e.preventDefault();
                commitInviteEmailDraft();
            }
        }
    };

    const handleInviteDraftPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = e.clipboardData.getData('text');
        if (!/[\n,]/.test(pasted)) return;
        e.preventDefault();
        addInviteEmailBlocks(pasted);
        setInviteEmailDraft('');
    };

    const handleSendInvites = async () => {
        const draftEmails = inviteEmailDraft
            .split(/[,\n]/g)
            .map(s => s.trim())
            .filter(Boolean);
        const emails = [...inviteEmailBlocks, ...draftEmails];

        if (emails.length === 0) { toast.error('Please enter at least one email address'); return; }
        if (!inviteRoleId) { toast.error('Please select a role'); return; }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emails.filter(e => !emailRegex.test(e));
        if (invalidEmails.length > 0) {
            toast.error(`Invalid email format: ${invalidEmails.slice(0, 2).join(', ')}${invalidEmails.length > 2 ? '…' : ''}`);
            return;
        }

        const dedupedEmails = Array.from(new Set(emails.map((email) => email.toLowerCase())));

        if (currentUserEmail && dedupedEmails.includes(currentUserEmail.toLowerCase())) {
            toast.error('You cannot invite yourself.');
            return;
        }

        const activeEmails = new Set(members.map(m => m.email.toLowerCase().trim()));
        const alreadyActive = dedupedEmails.filter(e => activeEmails.has(e));
        if (alreadyActive.length > 0) {
            toast.error(`${alreadyActive.slice(0, 2).join(', ')}${alreadyActive.length > 2 ? '…' : ''} is already an active member of the team.`);
            return;
        }

        const pendingEmails = new Set(pendingInvites.map((i: any) => (i.email || '').toLowerCase().trim()));
        const alreadyPending = dedupedEmails.filter(e => pendingEmails.has(e));
        if (alreadyPending.length > 0) {
            toast.error(`${alreadyPending.slice(0, 2).join(', ')}${alreadyPending.length > 2 ? '…' : ''} already has a pending invite.`);
            return;
        }

        setIsBulkInviting(true);

        const failed: string[] = [];
        const warned: string[] = [];

        try {
            for (const email of dedupedEmails) {
                try {
                    const result: any = await inviteMutation.mutateAsync({ email, roleId: inviteRoleId, scope: inviteScope });
                    if (result?.emailSent === false) {
                        warned.push(email);
                    }
                } catch {
                    failed.push(email);
                }
            }

            if (dedupedEmails.length > 0) {
                queryClient.invalidateQueries({ queryKey: queryKeys.teams.members(eventId) });
                if (orgId) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.invites.pending(orgId) });
                }
            }

            if (failed.length > 0) {
                toast.error(`Sent ${dedupedEmails.length - failed.length}/${dedupedEmails.length} invites. Failed: ${failed.slice(0, 2).join(', ')}${failed.length > 2 ? '…' : ''}`);
                return;
            }

            if (warned.length > 0) {
                toast.warning(`Invites created for ${warned.length}/${dedupedEmails.length}, but some emails were not delivered. Use Resend in Pending Invitations.`);
            } else {
                toast.success(`Sent ${dedupedEmails.length} invite${dedupedEmails.length === 1 ? '' : 's'}.`);
            }

            setInviteEmailBlocks([]);
            setInviteEmailDraft('');
            setIsInviteModalOpen(false);
        } finally {
            setIsBulkInviting(false);
        }
    };

    // ── Pagination ─────────────────────────────────────────────────────────────
    const membersPerPage = 10;
    const siteOrigin = resolvePublicSiteUrl();

    // Filter pending invites for this program only.
    const filteredPendingInvites = pendingInvites.filter(
        inv => inv.programId === eventId || inv.programId == null
    );

    const filteredMembers = members.filter((member) => {
        const q = memberSearch.trim().toLowerCase();
        if (!q) return true;
        return (
            member.name.toLowerCase().includes(q) ||
            member.email.toLowerCase().includes(q) ||
            member.role.toLowerCase().includes(q)
        );
    });

    const filteredPending = filteredPendingInvites.filter((invite) => {
        const q = memberSearch.trim().toLowerCase();
        if (!q) return true;
        return (
            invite.email.toLowerCase().includes(q) ||
            (invite.roleName || 'Team member').toLowerCase().includes(q)
        );
    });

    const mergedItems = [
        ...filteredMembers.map(m => ({
            id: m.memberId,
            memberId: m.memberId,
            userId: m.userId,
            name: m.name,
            email: m.email,
            role: m.role,
            roleId: m.roleId,
            status: m.status,
            lastActive: m.lastActive,
            avatar: m.avatar,
            joinedDate: m.joinedDate,
            programScope: m.programScope,
            programId: m.programId,
            isInvite: false,
            sortName: m.name.toLowerCase()
        })),
        ...filteredPending.map(inv => ({
            id: inv.id,
            userId: '',
            name: inv.email.split('@')[0],
            email: inv.email,
            role: inv.roleName || 'Team member',
            roleId: inv.roleId,
            status: 'Pending Invite' as const,
            lastActive: (() => {
                const diff = Date.now() - new Date(inv.createdAt).getTime();
                const days = Math.floor(diff / 86400000);
                const hours = Math.floor(diff / 3600000);
                if (days > 0) return `Invited ${days}d ago`;
                if (hours > 0) return `Invited ${hours}h ago`;
                return 'Invited just now';
            })(),
            avatar: '',
            joinedDate: inv.createdAt,
            programScope: inv.programId ? 'program' as const : 'organization' as const,
            programId: inv.programId,
            isInvite: true,
            rawInvite: inv,
            sortName: inv.email.toLowerCase()
        }))
    ].sort((a, b) => a.sortName.localeCompare(b.sortName));

    const filteredByRole = roleFilter
        ? mergedItems.filter(item => item.role.toLowerCase() === roleFilter.toLowerCase())
        : mergedItems;

    const memberTotalPages = Math.max(1, Math.ceil(filteredByRole.length / membersPerPage));
    const paginatedItems = filteredByRole.slice((memberPage - 1) * membersPerPage, memberPage * membersPerPage);

    useEffect(() => { setMemberPage(1); }, [memberSearch, roleFilter]);

    if (!activeEvent) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                Select a program to manage team roles.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {ConfirmDialogNode}

            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
                    <p className="text-slate-500">Manage your team members, roles, and granular permissions.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    <div className="bg-slate-100 p-1 rounded-lg flex gap-1 w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex-1 sm:flex-none ${activeTab === 'members' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Members
                            {filteredPendingInvites.length > 0 && (
                                <span className="ml-1.5 bg-amber-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {filteredPendingInvites.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('roles')}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex-1 sm:flex-none ${activeTab === 'roles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Roles & Permissions
                        </button>
                    </div>
                    <Button className="flex items-center justify-center gap-2 w-full sm:w-auto" onClick={() => setIsInviteModalOpen(true)}>
                        <UserPlus className="w-4 h-4" /> Add User
                    </Button>
                </div>
            </div>



            {/* Members tab */}
            {activeTab === 'members' && (
                <>
                    {/* Active members table */}
                    {membersLoading ? (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <TableSkeleton rows={5} columns={5} />
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-slate-50/50">
                                <div className="relative flex-1 max-w-full sm:max-w-md">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        placeholder="Search team members..."
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setRoleFilterOpen(!roleFilterOpen)}
                                        className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm bg-white hover:bg-slate-50 w-full sm:w-auto ${roleFilter ? 'border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
                                    >
                                        <Filter className="w-4 h-4" /> {roleFilter || 'Role'}
                                        {roleFilter && (
                                            <span
                                                onClick={(e) => { e.stopPropagation(); setRoleFilter(''); setRoleFilterOpen(false); }}
                                                className="ml-1 text-slate-400 hover:text-slate-600"
                                            >×</span>
                                        )}
                                    </button>
                                    {roleFilterOpen && (
                                        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                                            {roles.map((r) => (
                                                <button
                                                    key={r.id}
                                                    onClick={() => { setRoleFilter(r.name); setRoleFilterOpen(false); }}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${roleFilter === r.name ? 'text-indigo-700 font-medium' : 'text-slate-700'}`}
                                                >
                                                    {r.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="px-4 pt-3 text-xs text-slate-500 md:hidden">Swipe horizontally to view all columns.</div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[900px] text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            <th className="p-4 pl-6">Member</th>
                                            <th className="p-4">Role</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Last Active</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedItems.map((item) => {
                                            if (item.isInvite) {
                                                const invite = item.rawInvite!;
                                                return (
                                                    <tr key={item.id} className="hover:bg-amber-50/10 transition-colors bg-amber-50/5">
                                                        {/* Member (email placeholder) */}
                                                        <td className="p-4 pl-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center">
                                                                    <Mail className="w-4 h-4 text-amber-500" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-slate-800 text-sm">{item.email}</div>
                                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                                        Awaiting {item.name}'s response
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Role */}
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="px-2 py-1 rounded-md text-xs font-bold border bg-slate-50 text-slate-600 border-slate-100 max-w-max">
                                                                    {item.role}
                                                                </span>
                                                                <span className="text-[10px] font-semibold text-slate-500">
                                                                    {item.programScope === 'organization' ? 'All events' : eventTitle}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* Status */}
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                                                <span className="text-sm text-amber-700 font-medium">Pending Invite</span>
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const inviteLink = `${siteOrigin}/team-invite/${invite.token}`;
                                                                            await navigator.clipboard.writeText(inviteLink);
                                                                            toast.success('Invite link copied to clipboard');
                                                                        } catch {
                                                                            toast.error('Failed to copy link');
                                                                        }
                                                                    }}
                                                                    title="Copy invite link"
                                                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                                                                >
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>

                                                        {/* Last Active */}
                                                        <td className="p-4 text-sm text-slate-500">
                                                            {item.lastActive}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors outline-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-600">
                                                                            <MoreVertical className="w-4 h-4" />
                                                                        </button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuPortal>
                                                                        <DropdownMenuContent align="end" className="w-44 z-[100] bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleResend(invite)}
                                                                                disabled={resendingId === invite.id}
                                                                                className="flex items-center gap-2 cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-700 outline-none w-full data-[disabled]:opacity-50"
                                                                            >
                                                                                <RefreshCw className={`w-4 h-4 ${resendingId === invite.id ? 'animate-spin' : ''}`} /> Resend Invite
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleRevoke(invite)}
                                                                                disabled={revokingId === invite.id}
                                                                                className="text-red-600 focus:text-red-600 focus:bg-red-50 hover:bg-red-50 flex items-center gap-2 cursor-pointer px-4 py-2 text-sm outline-none w-full data-[disabled]:opacity-50"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" /> Revoke Invite
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenuPortal>
                                                                </DropdownMenu>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            // Render regular member row
                                            const member = item;
                                            return (
                                                <tr key={member.id} className={`hover:bg-slate-50 transition-colors ${currentUserId && member.userId === currentUserId ? 'bg-indigo-50/30' : ''}`}>
                                                    <td className="p-4 pl-6">
                                                        <UserHoverCard user={member as any}>
                                                            <div className="flex items-center gap-3 cursor-pointer group">
                                                                {member.avatar ? (
                                                                    <img src={member.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover group-hover:border-indigo-200 transition-colors" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full border-2 border-slate-100 group-hover:border-indigo-200 transition-colors bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                                                                        {member.name?.charAt(0).toUpperCase() || 'U'}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                                                                        {member.name}
                                                                        {currentUserId && member.userId === currentUserId && (
                                                                            <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">You</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-slate-500 text-xs">{member.email}</div>
                                                                </div>
                                                            </div>
                                                        </UserHoverCard>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`px-2 py-1 rounded-md text-xs font-bold border ${member.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                member.role === 'Judge' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                                    'bg-slate-50 text-slate-600 border-slate-100'} max-w-max`}>
                                                                {member.role}
                                                            </span>
                                                            <span className="text-[10px] font-semibold text-slate-500">
                                                                {member.programScope === 'organization' ? 'All events' : eventTitle}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${member.status === 'Active' ? 'bg-green-500' : member.status === 'Pending' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                                            <span className="text-sm text-slate-600">{member.status}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-500">{member.lastActive}</td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors outline-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-600">
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuPortal>
                                                                    <DropdownMenuContent align="end" className="w-40 z-[100] bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                                                                        {member.role !== 'Judge' && (
                                                                            <DropdownMenuItem
                                                                                onClick={() => {
                                                                                    setChangingMember(member as any);
                                                                                    setNewRoleId(member.roleId ?? rawRoles[0]?.id ?? '');
                                                                                    setIsChangeRoleModalOpen(true);
                                                                                }}
                                                                                className="flex items-center gap-2 cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-700 outline-none w-full"
                                                                            >
                                                                                <UserCog className="w-4 h-4" /> Change Role
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {(!currentUserId || member.userId !== currentUserId) && (
                                                                            <DropdownMenuItem
                                                                                onClick={async () => {
                                                                                    const ok = await confirm({ title: 'Remove member?', description: `Remove ${member.name} from this program?`, confirmLabel: 'Remove' });
                                                                                    if (ok) removeMutation.mutate(member.id);
                                                                                }}
                                                                                className="text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50 flex items-center gap-2 cursor-pointer px-4 py-2 text-sm outline-none w-full"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" /> Remove
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenuPortal>
                                                            </DropdownMenu>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {paginatedItems.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-10 text-center">
                                                    <p className="text-sm text-slate-500">No team members match your search.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                                <p className="text-xs text-slate-500">Page {memberPage} of {memberTotalPages}</p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setMemberPage((prev) => Math.max(1, prev - 1))}
                                        disabled={memberPage === 1}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    >Prev</button>
                                    <button
                                        onClick={() => setMemberPage((prev) => Math.min(memberTotalPages, prev + 1))}
                                        disabled={memberPage >= memberTotalPages}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    >Next</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Roles tab */}
            {activeTab === 'roles' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {roles.map((role) => (
                        <div key={role.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${role.color.split(' ')[0]}`}>
                                    <Shield className={`w-6 h-6 ${role.color.split(' ')[1]}`} />
                                </div>
<div className="relative">
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg outline-none data-[state=open]:bg-slate-100 data-[state=open]:text-slate-600">
                <MoreVertical className="w-4 h-4" />
            </button>
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
            <DropdownMenuContent align="end" className="w-44 z-[100] bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                <DropdownMenuItem
                    onClick={() => openRoleModal(role)}
                    className="flex items-center gap-2 cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-700 outline-none w-full"
                >
                    <Edit2 className="w-4 h-4" />
                    Edit Role
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => duplicateRole(role)}
                    className="flex items-center gap-2 cursor-pointer px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-700 outline-none w-full"
                >
                    <Copy className="w-4 h-4" />
                    Duplicate Role
                </DropdownMenuItem>

                <DropdownMenuItem
                    disabled={role.usersCount > 0}
                    onClick={async () => {
                        const ok = await confirm({
                            title: `Delete "${role.name}"?`,
                            description: 'This action cannot be undone.',
                            confirmLabel: 'Delete Role',
                        });

                        if (!ok) return;

                        try {
                            await db.deleteRole(role.id);
                            queryClient.invalidateQueries({
                                queryKey: queryKeys.teams.roles(eventId),
                            });
                            toast.success('Role deleted');
                        } catch {
                            toast.error('Failed to delete role');
                        }
                    }}
                    className={`flex items-center gap-2 cursor-pointer px-4 py-2 text-sm outline-none w-full data-[disabled]:opacity-50 ${
                        role.usersCount > 0
                            ? 'text-slate-400'
                            : 'text-red-600 hover:bg-red-50 focus:text-red-600 focus:bg-red-50'
                    }`}
                >
                    <Trash2 className="w-4 h-4" />
                    Delete Role
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenuPortal>
    </DropdownMenu>
</div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{role.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                                <span>{role.usersCount} users</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span>{role.permissions.includes('all') ? 'Full Access' : `${role.permissions.length} permissions`}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex -space-x-2 mb-6">
                                    {[...Array(Math.min(4, role.usersCount))].map((_, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                    ))}
                                    {role.usersCount > 4 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                            +{role.usersCount - 4}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => openRoleModal(role)} className="w-full py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors mt-auto">
                                Edit Permissions
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => openRoleModal()}
                        className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all min-h-[250px]"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="font-bold">Create New Role</span>
                    </button>
                </div>
            )}

            {/* Change Role Modal */}
            <Modal isOpen={isChangeRoleModalOpen} onClose={() => setIsChangeRoleModalOpen(false)} title="Change Role">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Change role for <strong>{changingMember?.name}</strong></p>
                    <select
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={newRoleId}
                        onChange={e => setNewRoleId(e.target.value)}
                    >
                        {rawRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                        <Button variant="ghost" onClick={() => setIsChangeRoleModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                if (changingMember && newRoleId) {
                                    const oldRole = roles.find(r => r.id === changingMember.roleId);
                                    const newRole = roles.find(r => r.id === newRoleId);
                                    const oldRoleName = oldRole?.name || 'Member';
                                    const roleName = newRole?.name || 'Member';
                                    const newPerms = newRole?.permissions || [];
                                    
                                    roleChangeMutation.mutate({ 
                                        memberId: changingMember.memberId, 
                                        roleId: newRoleId,
                                        email: changingMember.email,
                                        userName: changingMember.name,
                                        roleName,
                                        programTitle: eventId ? eventTitle : 'the organization',
                                        oldRoleName,
                                        newPermissions: newPerms
                                    });
                                }
                            }}
                            disabled={roleChangeMutation.isPending}
                        >
                            {roleChangeMutation.isPending ? 'Saving…' : 'Save'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Invite Modal */}
            <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Add User">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">User email addresses</label>
                        <div className="w-full border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 p-2 min-h-[96px]">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {inviteEmailBlocks.map((email) => (
                                    <span
                                        key={email}
                                        className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-2 py-1"
                                    >
                                        {email}
                                        <button
                                            type="button"
                                            onClick={() => removeInviteEmailBlock(email)}
                                            className="text-indigo-500 hover:text-indigo-700"
                                            aria-label={`Remove ${email}`}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                className="w-full px-2 py-1 text-sm outline-none"
                                placeholder="Type an email and press Enter…"
                                value={inviteEmailDraft}
                                onChange={(e) => setInviteEmailDraft(e.target.value)}
                                onKeyDown={handleInviteDraftKeyDown}
                                onBlur={commitInviteEmailDraft}
                                onPaste={handleInviteDraftPaste}
                            />
                            <p className="text-[11px] text-slate-500 px-2 pt-1">Press Enter, comma, or Tab to add each email.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Access scope</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setInviteScope('program')}
                                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${inviteScope === 'program'
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                            >
                                <span className="font-semibold block">This event only</span>
                                <span className="text-xs text-slate-500">Access limited to {eventTitle}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setInviteScope('organization')}
                                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${inviteScope === 'organization'
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                            >
                                <span className="font-semibold block">Whole organization</span>
                                <span className="text-xs text-slate-500">Access to all events in this org</span>
                            </button>
                        </div>
                    </div>
<div className="flex items-center justify-between mb-1">
   <label className="text-sm font-semibold text-slate-700">
      Assign Role
   </label>

   <button
      type="button"
      onClick={() => {
         setEditingRole({
            id: '',
            name: '',
            permissions: [],
         });
         setIsRoleModalOpen(true);
      }}
      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
   >
      + New Role
   </button>
</div>

<select
   className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
   value={inviteRoleId || ''}
   onChange={(e) => setInviteRoleId(e.target.value)}
>
   <option value="">Select a role...</option>
   {roles.map(r => (
      <option key={r.id} value={r.id}>
         {r.name}
      </option>
   ))}
</select>
                    <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-500">
                        An invite email will be sent. If email delivery fails, you can copy the invite link from the Pending Invitations section.
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendInvites} disabled={isBulkInviting || inviteMutation.isPending}>
                            {(isBulkInviting || inviteMutation.isPending) ? 'Sending…' : 'Send Invites'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Role Editor Modal */}
            <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title={isPersistedUuid(editingRole.id) ? "Edit Role" : "Create New Role"}>
                <form onSubmit={handleCreateRole} className="space-y-6">
                    <div>
  <label className="block text-sm font-semibold text-slate-700 mb-3">
    Start with a preset
  </label>

  <div className="grid grid-cols-2 gap-3">
    {ROLE_PRESETS.map((preset) => (
      <button
        key={preset.key}
        type="button"
        onClick={() =>
          setEditingRole({
            ...editingRole,
            name: preset.name,
            permissions: preset.permissions,
            color: preset.color,
          })
        }
        className="group p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left"
      >
        <div className="flex items-start gap-3">
          <div className="text-xl">{preset.icon}</div>

          <div className="min-w-0">
            <h4 className="font-semibold text-slate-900 group-hover:text-indigo-700">
              {preset.name}
            </h4>

            <p className="text-xs text-slate-500 mt-1">
              {preset.description}
            </p>

            <div className="mt-2 text-xs font-medium text-indigo-600">
              {preset.permissions.length} permissions
            </div>
          </div>
        </div>
      </button>
    ))}
  </div>
</div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Role Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. Marketing Manager"
                            value={editingRole.name}
                            onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-3">Permissions</label>
                        {editingRole.permissions?.includes('all') ? (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                                <Shield className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                                <h4 className="font-bold text-indigo-900">Administrator Access</h4>
                                <p className="text-xs text-indigo-700 mb-3">This role has full access to all features.</p>
                                <button type="button" onClick={() => setEditingRole({ ...editingRole, permissions: [] })} className="text-xs font-bold underline text-indigo-600 hover:text-indigo-800">
                                    Switch to granular permissions
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                                {PERMISSION_GROUPS.map((group) => (
                                    <div key={group.label}>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">{group.label}</h4>
                                        <div className="space-y-2">
                                            {group.items.map((perm) => (
                                                <label key={perm.key} className="flex items-center cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mr-3"
                                                        checked={editingRole.permissions?.includes(perm.key)}
                                                        onChange={() => togglePermission(perm.key)}
                                                    />
                                                    <span className="text-sm text-slate-700">{perm.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                        {!editingRole.permissions?.includes('all') && (
                            <button type="button" onClick={() => setEditingRole({ ...editingRole, permissions: ['all'] })} className="text-xs text-slate-400 hover:text-indigo-600 font-medium">
                                Grant Full Admin Access
                            </button>
                        )}
                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" onClick={() => setIsRoleModalOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Role</Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
