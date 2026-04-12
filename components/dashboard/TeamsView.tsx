
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db, PendingInvite } from '../../services/database';
import { PERMISSIONS, Role, TeamMember, Program } from '../../services/models';
import { auth, getCurrentOrgId } from '../../services/supabase';
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
import { TableSkeleton } from '../SkeletonLoader';

const PERMISSION_GROUPS = [
    {
        label: "Submissions & Entries",
        items: [
            { key: PERMISSIONS.VIEW_SUBMISSIONS, label: "View Submissions" },
            { key: PERMISSIONS.MANAGE_SUBMISSIONS, label: "Manage Status (Accept/Reject)" },
            { key: PERMISSIONS.MANAGE_FORMS, label: "Edit Submission Forms" },
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
            { key: PERMISSIONS.MANAGE_REACH, label: "Social Media Automation" },
            { key: PERMISSIONS.VIEW_LOGS, label: "View Audit Logs" },
        ]
    }
];

interface TeamsViewProps {
    activeEvent?: Program | null;
}

// ── Pending invitation row ────────────────────────────────────────────────────

const PendingInviteRow: React.FC<{
    invite: PendingInvite;
    siteOrigin: string;
    programTitle: string;
    onResend: (invite: PendingInvite) => void;
    onRevoke: (invite: PendingInvite) => void;
    resending: boolean;
    revoking: boolean;
}> = ({ invite, siteOrigin, programTitle, onResend, onRevoke, resending, revoking }) => {
    const [copied, setCopied] = useState(false);
    const inviteLink = `${siteOrigin}/team-invite/${invite.token}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            toast.success('Invite link copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy — use the link below');
        }
    };

    const sentAgo = (() => {
        const diff = Date.now() - new Date(invite.createdAt).getTime();
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor(diff / 3600000);
        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        return 'just now';
    })();

    return (
        <tr className="hover:bg-amber-50/30 transition-colors bg-amber-50/10">
            {/* Member (email placeholder) */}
            <td className="p-4 pl-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                        <div className="font-semibold text-slate-800 text-sm">{invite.email}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> Invited {sentAgo}
                        </div>
                    </div>
                </div>
            </td>

            {/* Role */}
            <td className="p-4">
                {invite.roleName ? (
                    <span className="px-2 py-1 rounded-md text-xs font-bold border bg-slate-50 text-slate-600 border-slate-100">
                        {invite.roleName}
                    </span>
                ) : (
                    <span className="text-xs text-slate-400">—</span>
                )}
            </td>

            {/* Status */}
            <td className="p-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-sm text-amber-700 font-medium">Pending</span>
                </div>
            </td>

            {/* Invite link + copy */}
            <td className="p-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={copyLink}
                        title="Copy invite link"
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            copied
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50'
                        }`}
                    >
                        {copied ? (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</>
                        ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copy link</>
                        )}
                    </button>
                </div>
            </td>

            {/* Actions */}
            <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => onResend(invite)}
                        disabled={resending}
                        title="Resend invite email"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all disabled:opacity-50"
                    >
                        {resending ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Resend
                    </button>
                    <button
                        onClick={() => onRevoke(invite)}
                        disabled={revoking}
                        title="Revoke invite"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-red-500 hover:border-red-300 hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                        <X className="w-3.5 h-3.5" />
                        Revoke
                    </button>
                </div>
            </td>
        </tr>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const TeamsView: React.FC<TeamsViewProps> = ({ activeEvent }) => {
    const { confirm, ConfirmDialogNode } = useConfirm();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteRoleId, setInviteRoleId] = useState<string>('');
    const [memberSearch, setMemberSearch] = useState('');
    const [memberPage, setMemberPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [resendingId, setResendingId] = useState<string | null>(null);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [requestTraces, setRequestTraces] = useState<EmailApiRequestTrace[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);
    const eventId = activeEvent?.id ?? '';
    const eventTitle = activeEvent?.title || 'your workspace';

    const appendRequestTrace = (trace: EmailApiRequestTrace) => {
        setRequestTraces((prev) => [trace, ...prev].slice(0, 40));
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

    // Close menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Load current user + org
    useEffect(() => {
        auth.getUser().then(({ user }) => setCurrentUserId(user?.id || null));
        getCurrentOrgId().then((id) => setOrgId(id));
    }, []);

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

    const { data: persistedRequestTraces = [] } = useQuery({
        queryKey: queryKeys.invites.requestTraces(orgId ?? '', eventId),
        queryFn: () => db.getInviteRequestTraces(eventId, { days: 7, limit: 40 }),
        enabled: !!orgId && !!eventId,
        staleTime: 15_000,
    });

    const { data: rawRoles = [] } = useQuery({
        queryKey: queryKeys.teams.roles(eventId),
        queryFn: () => db.getRoles(eventId),
        enabled: !!eventId,
        staleTime: 5 * 60_000,
    });

    const roles: Role[] = rawRoles.map(r => ({
        ...r,
        usersCount: members.filter(m => m.role === r.name).length,
    }));

    useEffect(() => {
        if (!inviteRoleId && rawRoles[0]?.id) setInviteRoleId(rawRoles[0].id);
    }, [rawRoles]);

    useEffect(() => {
        setRequestTraces(persistedRequestTraces);
    }, [persistedRequestTraces]);

    // ── Mutations ──────────────────────────────────────────────────────────────
    const inviteMutation = useMutation({
        mutationFn: async (vars: { email: string; roleId: string }) => {
            const roleName = rawRoles.find(r => r.id === vars.roleId)?.name;
            const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');
            const result: any = await sendTeamInviteEmail({
                email: vars.email,
                roleId: vars.roleId,
                roleName,
                programTitle: eventTitle,
                programId: eventId,
            }, { onTrace: appendRequestTrace });
            return result || { ok: true, emailSent: true };
        },
        onError: (error) => {
            const message = error instanceof Error ? error.message : 'An unexpected error occurred';
            toast.error(`Error: ${message}`);
        },
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.teams.members(eventId) });
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.invites.pending(orgId) });
            }
            if (result?.emailSent === false) {
                toast.warning(`Invite created — email not sent. Use "Resend" or copy the link.`);
            } else {
                toast.success('Invite sent. They will be added after accepting.');
            }
            setInviteEmails('');
            setIsInviteModalOpen(false);
        },
    });

    const removeMutation = useMutation({
        mutationFn: (memberId: string) => db.removeTeamMember(memberId),
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
        mutationFn: (vars: { memberId: string; roleId: string }) =>
            db.updateTeamMemberRole(vars.memberId, vars.roleId, eventId),
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

    const handleClearRequestTraces = async () => {
        if (!eventId) return;
        try {
            await db.clearInviteRequestTraces(eventId);
            setRequestTraces([]);
            if (orgId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.invites.requestTraces(orgId, eventId) });
            }
        } catch (err) {
            console.warn('Failed to clear invite request traces:', err);
            setRequestTraces([]);
        }
    };

    // ── Role editor ────────────────────────────────────────────────────────────
    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole.name) return;
        try {
            if (editingRole.id) {
                await db.updateRole({
                    id: editingRole.id,
                    name: editingRole.name,
                    color: editingRole.color,
                    permissions: editingRole.permissions || [],
                });
            } else {
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

    const handleSendInvites = () => {
        const emails = inviteEmails
            .split(/[,\n]/g)
            .map(s => s.trim())
            .filter(Boolean);

        if (emails.length === 0) { toast.error('Please enter at least one email address'); return; }
        if (!inviteRoleId) { toast.error('Please select a role'); return; }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = emails.filter(e => !emailRegex.test(e));
        if (invalidEmails.length > 0) {
            toast.error(`Invalid email format: ${invalidEmails.slice(0, 2).join(', ')}${invalidEmails.length > 2 ? '…' : ''}`);
            return;
        }

        for (const email of emails) {
            inviteMutation.mutate({ email, roleId: inviteRoleId });
        }
    };

    // ── Pagination ─────────────────────────────────────────────────────────────
    const membersPerPage = 10;
    const filteredMembers = members.filter((member) => {
        const q = memberSearch.trim().toLowerCase();
        if (!q) return true;
        return (
            member.name.toLowerCase().includes(q) ||
            member.email.toLowerCase().includes(q) ||
            member.role.toLowerCase().includes(q)
        );
    });
    const memberTotalPages = Math.max(1, Math.ceil(filteredMembers.length / membersPerPage));
    const paginatedMembers = filteredMembers.slice((memberPage - 1) * membersPerPage, memberPage * membersPerPage);

    useEffect(() => { setMemberPage(1); }, [memberSearch]);

    const siteOrigin = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');

    // Filter pending invites for this program (or org-level invites)
    const filteredPendingInvites = pendingInvites.filter(
        inv => !inv.programId || inv.programId === eventId
    );

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

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-800">Outgoing Invite Requests</h2>
                    <button
                        type="button"
                        onClick={handleClearRequestTraces}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                    >
                        Clear
                    </button>
                </div>
                {requestTraces.length === 0 ? (
                    <p className="text-xs text-slate-500 mt-2">No invite requests captured yet.</p>
                ) : (
                    <div className="mt-3 space-y-2 max-h-56 overflow-auto pr-1">
                        {requestTraces.map((trace, idx) => (
                            <div key={`${trace.startedAt}-${trace.url}-${idx}`} className="rounded-lg border border-slate-200 p-2 bg-slate-50/50">
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                    <span className="font-semibold text-slate-700">{trace.method} {trace.path}</span>
                                    <span className={`px-1.5 py-0.5 rounded font-semibold ${trace.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {trace.status ?? 'NETWORK'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-700 mt-1 break-all">{trace.url}</p>
                                <p className="text-[11px] text-slate-600 mt-1 break-all">
                                    body: {JSON.stringify(trace.requestBody)}
                                </p>
                                {trace.error && <p className="text-[11px] text-rose-700 mt-1">{trace.error}</p>}
                                <p className="text-[10px] text-slate-500 mt-1">Attempt {trace.attempt} at {new Date(trace.startedAt).toLocaleTimeString()}</p>
                            </div>
                        ))}
                    </div>
                )}
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
                                <button className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 text-slate-600 w-full sm:w-auto">
                                    <Filter className="w-4 h-4" /> Role
                                </button>
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
                                        {paginatedMembers.map((member) => (
                                            <tr key={member.memberId} className={`hover:bg-slate-50 transition-colors ${currentUserId && member.userId === currentUserId ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="p-4 pl-6">
                                                    <UserHoverCard user={member}>
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
                                                    <span className={`px-2 py-1 rounded-md text-xs font-bold border ${member.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                        member.role === 'Judge' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                            'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                                        {member.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${member.status === 'Active' ? 'bg-green-500' : member.status === 'Pending' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                                                        <span className="text-sm text-slate-600">{member.status}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm text-slate-500">{member.lastActive}</td>
                                                <td className="p-4 text-right">
                                                    <div className="relative flex justify-end" ref={openMenuId === member.memberId ? menuRef : undefined}>
                                                        <button
                                                            onClick={() => setOpenMenuId(prev => prev === member.memberId ? null : member.memberId)}
                                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                        {openMenuId === member.memberId && (
                                                            <div className="absolute right-0 top-9 z-10 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                                                                <button
                                                                    onClick={() => {
                                                                        setChangingMember(member);
                                                                        setNewRoleId(member.roleId ?? rawRoles[0]?.id ?? '');
                                                                        setIsChangeRoleModalOpen(true);
                                                                        setOpenMenuId(null);
                                                                    }}
                                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                                >
                                                                    <UserCog className="w-4 h-4" /> Change Role
                                                                </button>
                                                                {(!currentUserId || member.userId !== currentUserId) && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            setOpenMenuId(null);
                                                                            const ok = await confirm({ title: 'Remove member?', description: `Remove ${member.name} from this program?`, confirmLabel: 'Remove' });
                                                                            if (ok) removeMutation.mutate(member.memberId);
                                                                        }}
                                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" /> Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {paginatedMembers.length === 0 && (
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

                    {/* Pending Invitations */}
                    {(invitesLoading || filteredPendingInvites.length > 0) && (
                        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                    <h3 className="font-bold text-slate-800 text-sm">
                                        Pending Invitations
                                    </h3>
                                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {filteredPendingInvites.length}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 hidden sm:block">
                                    These people have been invited but haven't accepted yet.
                                </p>
                            </div>

                            {invitesLoading ? (
                                <div className="p-6">
                                    <TableSkeleton rows={2} columns={5} />
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[900px] text-left border-collapse">
                                        <thead>
                                            <tr className="bg-amber-50/40 border-b border-amber-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                <th className="p-4 pl-6">Invitee</th>
                                                <th className="p-4">Role</th>
                                                <th className="p-4">Status</th>
                                                <th className="p-4 flex items-center gap-1.5">
                                                    <Link2 className="w-3.5 h-3.5" /> Invite Link
                                                </th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-amber-50">
                                            {filteredPendingInvites.map((invite) => (
                                                <PendingInviteRow
                                                    key={invite.id}
                                                    invite={invite}
                                                    siteOrigin={siteOrigin}
                                                    programTitle={activeEvent.title}
                                                    onResend={handleResend}
                                                    onRevoke={handleRevoke}
                                                    resending={resendingId === invite.id}
                                                    revoking={revokingId === invite.id}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Info banner */}
                            <div className="px-6 py-3 border-t border-amber-100 bg-amber-50/30 flex items-start gap-2 text-xs text-amber-700">
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span>
                                    Invite links expire when revoked or re-sent. Each invitee must sign in with the exact email address the invite was sent to.
                                </span>
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
                                <button onClick={() => openRoleModal(role)} className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-slate-100 rounded-lg">
                                    <Edit2 className="w-4 h-4" />
                                </button>
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
                                    roleChangeMutation.mutate({ memberId: changingMember.memberId, roleId: newRoleId });
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
                        <textarea
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                            placeholder="Enter emails separated by commas or new lines…"
                            value={inviteEmails}
                            onChange={(e) => setInviteEmails(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Assign Role</label>
                        <select
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={inviteRoleId || ''}
                            onChange={(e) => setInviteRoleId(e.target.value)}
                        >
                            <option value="">Select a role...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-500">
                        An invite email will be sent. If email delivery fails, you can copy the invite link from the Pending Invitations section.
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendInvites} disabled={inviteMutation.isPending}>
                            {inviteMutation.isPending ? 'Sending…' : 'Send Invites'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Role Editor Modal */}
            <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title={editingRole.id ? "Edit Role" : "Create New Role"}>
                <form onSubmit={handleCreateRole} className="space-y-6">
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
