
import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import { PERMISSIONS, Role, TeamMember, Program } from '../../services/models';
import { auth } from '../../services/supabase';
import { Plus, UserPlus, Shield, MoreVertical, Search, Filter, Trash2, Edit2, CheckCircle2, UserCog } from 'lucide-react';
import { Button } from '../Button';
import { UserHoverCard } from '../UserHoverCard';
import { Modal } from '../Modal';
import { sendTeamInviteEmail } from '../../services/email';

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

export const TeamsView: React.FC<TeamsViewProps> = ({ activeEvent }) => {
    const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [inviteEmails, setInviteEmails] = useState('');
    const [inviteRoleId, setInviteRoleId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Modals
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

    // Role Editing State
    const [editingRole, setEditingRole] = useState<Partial<Role>>({
        name: '',
        permissions: [],
        color: 'bg-slate-100 text-slate-700'
    });

    if (!activeEvent) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                Select a program to manage team roles.
            </div>
        );
    }

    useEffect(() => {
        refreshData();
    }, [activeEvent?.id]);

    const refreshData = async () => {
        setError(null);
        if (!activeEvent?.id) return;
        const { user } = await auth.getUser();
        setCurrentUserId(user?.id || null);

        const [loadedMembers, loadedRoles] = await Promise.all([
            db.getTeamMembers(activeEvent.id),
            db.getRoles(activeEvent.id),
        ]);

        // Derive usersCount by role name
        const counts = loadedMembers.reduce<Record<string, number>>((acc, m) => {
            acc[m.role] = (acc[m.role] || 0) + 1;
            return acc;
        }, {});

        setMembers(loadedMembers);
        setRoles(loadedRoles.map(r => ({ ...r, usersCount: counts[r.name] || 0 })));

        // Default invite role to first available role
        if (!inviteRoleId && loadedRoles[0]?.id) {
            setInviteRoleId(loadedRoles[0].id);
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole.name) return;

        try {
            setError(null);
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
                    programId: activeEvent?.id,
                });
            }

            await refreshData();
            setIsRoleModalOpen(false);
            setEditingRole({ name: '', permissions: [], color: 'bg-slate-100 text-slate-700' });
        } catch (e: any) {
            setError(e?.message || 'Failed to save role');
        }
    };

    const openRoleModal = (role?: Role) => {
        if (role) {
            setEditingRole({ ...role });
        } else {
            setEditingRole({ name: '', permissions: [], color: 'bg-slate-100 text-slate-700' });
        }
        setIsRoleModalOpen(true);
    };

    const togglePermission = (key: string) => {
        const current = editingRole.permissions || [];
        if (current.includes('all')) {
            // If 'all' was selected, clear it and select just this one (switching to granular mode)
            setEditingRole({ ...editingRole, permissions: [key] });
            return;
        }

        if (current.includes(key)) {
            setEditingRole({ ...editingRole, permissions: current.filter(p => p !== key) });
        } else {
            setEditingRole({ ...editingRole, permissions: [...current, key] });
        }
    };

    const handleSendInvites = async () => {
        const emails = inviteEmails
            .split(/[,\n]/g)
            .map(s => s.trim())
            .filter(Boolean);

        if (emails.length === 0) return;
        if (!inviteRoleId) return;
        if (!activeEvent?.id) return;

        try {
            setError(null);
            const roleName = roles.find(r => r.id === inviteRoleId)?.name;
            for (const email of emails) {
                await db.addTeamMemberByEmail(email, inviteRoleId, activeEvent.id);
                await sendTeamInviteEmail({
                    email,
                    roleName,
                    programTitle: activeEvent.title || 'your workspace',
                });
            }
            setInviteEmails('');
            setIsInviteModalOpen(false);
        } catch (e: any) {
            setError(e?.message || 'Failed to add users');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
                    <p className="text-slate-500">
                        Manage your team members, roles, and granular permissions.
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                        <button
                            onClick={() => setActiveTab('members')}
                            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'members' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Members
                        </button>
                        <button
                            onClick={() => setActiveTab('roles')}
                            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${activeTab === 'roles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Roles & Permissions
                        </button>
                    </div>
                    <Button className="flex items-center gap-2" onClick={() => setIsInviteModalOpen(true)}>
                        <UserPlus className="w-4 h-4" /> Add User
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 text-sm">
                    {error}
                </div>
            )}

            {activeTab === 'members' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50/50">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Search team members..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 text-slate-600">
                            <Filter className="w-4 h-4" /> Role
                        </button>
                    </div>

                    <table className="w-full text-left border-collapse">
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
                            {members.map((member) => (
                                <tr key={member.memberId} className={`hover:bg-slate-50 transition-colors ${currentUserId && member.userId === currentUserId ? 'bg-indigo-50/30' : ''}`}>
                                    <td className="p-4 pl-6">
                                        <UserHoverCard user={member}>
                                            <div className="flex items-center gap-3 cursor-pointer group">
                                                <img src={member.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover group-hover:border-indigo-200 transition-colors" />
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                                                        {member.name}
                                                        {currentUserId && member.userId === currentUserId && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">You</span>}
                                                    </div>
                                                    <div className="text-slate-500 text-xs">{member.email}</div>
                                                </div>
                                            </div>
                                        </UserHoverCard>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold border ${member.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                member.role === 'Judge' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                    'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${member.status === 'Active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                            <span className="text-sm text-slate-600">{member.status}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-500">
                                        {member.lastActive}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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
                                <span>
                                    {role.permissions.includes('all') ? 'Full Access' : `${role.permissions.length} permissions`}
                                </span>
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

                            <button
                                onClick={() => openRoleModal(role)}
                                className="w-full py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors mt-auto"
                            >
                                Edit Permissions
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={() => openRoleModal()}
                        className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all min-h-[250px]"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-indigo-100">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="font-bold">Create New Role</span>
                    </button>
                </div>
            )}

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
                            value={inviteRoleId}
                            onChange={(e) => setInviteRoleId(e.target.value)}
                        >
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-500">
                        This will immediately add existing users (who already signed up) to your workspace in Supabase.
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSendInvites}>Add Users</Button>
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
                                <button
                                    type="button"
                                    onClick={() => setEditingRole({ ...editingRole, permissions: [] })}
                                    className="text-xs font-bold underline text-indigo-600 hover:text-indigo-800"
                                >
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
                            <button
                                type="button"
                                onClick={() => setEditingRole({ ...editingRole, permissions: ['all'] })}
                                className="text-xs text-slate-400 hover:text-indigo-600 font-medium"
                            >
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
