import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { adminService, AdminSystemUser } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../Button';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSuperAdmin, setFilterSuperAdmin] = useState<string>('all'); // all, yes, no
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [sortField, setSortField] = useState<'created_at' | 'name'>('created_at');
  
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-system-users'],
    queryFn: adminService.getSystemUsers,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isSuperAdmin }: { id: string; isSuperAdmin: boolean }) => 
      adminService.setSuperAdminStatus(id, isSuperAdmin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update super admin status');
    }
  });

  const handleToggleSuperAdmin = (targetUser: AdminSystemUser) => {
    if (targetUser.id === currentUser?.id) {
      toast.error("You cannot revoke your own super admin access.");
      return;
    }
    
    const action = targetUser.is_super_admin ? 'revoke' : 'grant';
    if (!window.confirm(`Are you sure you want to ${action} Super Admin access for ${targetUser.full_name || 'this user'}?`)) {
      return;
    }

    toast.promise(toggleMutation.mutateAsync({ id: targetUser.id, isSuperAdmin: !targetUser.is_super_admin }), {
      loading: 'Updating permissions...',
      success: `Successfully updated ${targetUser.full_name || 'user'}`,
      error: 'Failed to update permissions',
    });
  };

  const filteredUsers = (users || [])
    .filter(u => {
      const name = (u.full_name || '').toLowerCase();
      const matchSearch = name.includes(searchQuery.toLowerCase());
      const matchFilter = filterSuperAdmin === 'all' ? true : filterSuperAdmin === 'yes' ? u.is_super_admin : !u.is_super_admin;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortField === 'name') {
        const nameA = (a.full_name || '').toLowerCase();
        const nameB = (b.full_name || '').toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getOrgName = (u: AdminSystemUser) => {
    if (!u.organizations || u.organizations.length === 0) return '-';
    if (u.organizations.length === 1) return u.organizations[0].organization.name;
    return `${u.organizations[0].organization.name} (+${u.organizations.length - 1})`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4 bg-slate-50/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <div className="flex gap-3">
          <select 
            value={filterSuperAdmin} 
            onChange={e => { setFilterSuperAdmin(e.target.value); setPage(1); }}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
          >
            <option value="all">All Roles</option>
            <option value="yes">Super Admins</option>
            <option value="no">Regular Users</option>
          </select>
          <select 
            value={`${sortField}-${sortOrder}`}
            onChange={e => {
              const [f, o] = e.target.value.split('-');
              setSortField(f as 'created_at' | 'name');
              setSortOrder(o as 'asc' | 'desc');
            }}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 font-medium uppercase tracking-wider text-xs border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Organization</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Created At</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                  <p className="text-slate-500">Loading system users...</p>
                </td>
              </tr>
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <Search className="w-6 h-6 text-slate-400" />
                  </div>
                  No users found matching your criteria.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{u.full_name || 'Unknown User'}</div>
                    <div className="text-slate-500 text-xs text-slate-400 font-mono mt-1" title="User ID">ID: {u.id.substring(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700">{getOrgName(u)}</span>
                  </td>
                  <td className="px-6 py-4">
                    {u.is_super_admin ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                        <Shield className="w-3.5 h-3.5" />
                        Super Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      variant={u.is_super_admin ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleSuperAdmin(u)}
                      disabled={u.id === currentUser?.id || toggleMutation.isPending}
                      className={u.is_super_admin ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' : ''}
                      title={u.id === currentUser?.id ? "You cannot modify your own access" : ""}
                    >
                      {u.is_super_admin ? 'Revoke Admin' : 'Grant Admin'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{(page - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(page * itemsPerPage, filteredUsers.length)}</span> of <span className="font-bold text-slate-900">{filteredUsers.length}</span> results
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
