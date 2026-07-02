import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { adminService, AdminSystemUser } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../Button';
import { Modal } from '../Modal';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  
  const [targetUser, setTargetUser] = useState<AdminSystemUser | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  // Existing Super Admins Query
  const { data: superAdmins = [], isLoading: isLoadingSuperAdmins } = useQuery({
    queryKey: ['admin-super-admins'],
    queryFn: adminService.getSuperAdmins,
  });

  // Search Mutation
  const searchMutation = useMutation({
    mutationFn: (q: string) => adminService.searchUsers(q),
    onError: (error: any) => {
      toast.error(error.message || 'Failed to search users');
    }
  });

  // Grant Mutation
  const grantMutation = useMutation({
    mutationFn: (userId: string) => adminService.grantSuperAdmin(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-super-admins'] });
      setShowGrantModal(false);
      toast.success('Super Admin access granted successfully');
      // Update local search result if applicable
      if (searchMutation.data) {
        const userInSearch = searchMutation.data.find(u => u.id === userId);
        if (userInSearch) {
          userInSearch.is_super_admin = true;
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to grant access');
      setShowGrantModal(false);
    }
  });

  // Revoke Mutation
  const revokeMutation = useMutation({
    mutationFn: (userId: string) => adminService.revokeSuperAdmin(userId),
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['admin-super-admins'] });
      setShowRevokeModal(false);
      toast.success('Super Admin access revoked successfully');
      // Update local search result if applicable
      if (searchMutation.data) {
        const userInSearch = searchMutation.data.find(u => u.id === userId);
        if (userInSearch) {
          userInSearch.is_super_admin = false;
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to revoke access');
      setShowRevokeModal(false);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    searchMutation.mutate(searchInput);
  };

  const getOrgName = (u: AdminSystemUser) => {
    if (!u.organizations || u.organizations.length === 0) return '-';
    if (u.organizations.length === 1) return u.organizations[0].organization.name;
    return `${u.organizations[0].organization.name} (+${u.organizations.length - 1})`;
  };

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Grant Super Admin Access
        </h2>
        <form onSubmit={handleSearch} className="flex gap-4 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Email, Name, or User ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <Button type="submit" disabled={searchMutation.isPending || !searchInput.trim()}>
            {searchMutation.isPending ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {/* Search Results */}
        {searchMutation.data && (
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Search Results</h3>
            {searchMutation.data.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
                No users found matching your query.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {searchMutation.data.map(user => (
                  <div key={user.id} className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-slate-900 truncate">{user.full_name || 'Unknown User'}</div>
                      <div className="text-sm text-slate-500 truncate mb-4">{user.email || 'No email provided'}</div>
                      
                      <div className="space-y-2 text-sm text-slate-600 mb-6">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Organization</span>
                          <span className="font-medium truncate ml-2">{getOrgName(user)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Super Admin</span>
                          {user.is_super_admin ? (
                            <span className="flex items-center gap-1 text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded text-xs">
                              <CheckCircle className="w-3.5 h-3.5" /> Yes
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded text-xs">
                              <XCircle className="w-3.5 h-3.5" /> No
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      {user.is_super_admin ? (
                        <Button 
                          variant="danger" 
                          className="w-full" 
                          disabled={user.id === currentUser?.id}
                          onClick={() => { setTargetUser(user); setShowRevokeModal(true); }}
                        >
                          Revoke Access
                        </Button>
                      ) : (
                        <Button 
                          variant="primary" 
                          className="w-full"
                          onClick={() => { setTargetUser(user); setShowGrantModal(true); }}
                        >
                          Grant Super Admin
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Existing Super Admins Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Existing Super Admins</h2>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
            {superAdmins.length} Active
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-medium uppercase tracking-wider text-xs border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Granted By</th>
                <th className="px-6 py-4">Granted At</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingSuperAdmins ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                    <p className="text-slate-500">Loading super admins...</p>
                  </td>
                </tr>
              ) : superAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No Super Admins found.
                  </td>
                </tr>
              ) : (
                superAdmins.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{u.full_name || 'Unknown User'}</div>
                      <div className="text-slate-500 text-xs text-slate-400 font-mono mt-1" title="User ID">ID: {u.id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">{u.email || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {u.granted_by_user?.full_name || u.granted_by_user?.email || 'System'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {u.super_admin_granted_at ? (
                        new Date(u.super_admin_granted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      ) : (
                        <span title="Granted before tracking was enabled" className="text-slate-400 italic">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="danger"
                        size="sm"
                        onClick={() => { setTargetUser(u); setShowRevokeModal(true); }}
                        disabled={u.id === currentUser?.id || revokeMutation.isPending}
                        title={u.id === currentUser?.id ? "You cannot revoke your own access" : ""}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modals */}
      {targetUser && (
        <>
          <Modal isOpen={showGrantModal} onClose={() => setShowGrantModal(false)} title="Grant Super Admin Access">
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-4 rounded-xl flex gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
                <div className="text-sm">
                  <p className="font-bold mb-1">You are about to grant unrestricted privileges to:</p>
                  <p className="font-medium">{targetUser.full_name}</p>
                  <p className="text-indigo-600/80 mb-2">{targetUser.email}</p>
                  <p>This user will gain access to all Super Admin features, including the ability to manage other Super Admins.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" className="flex-1" onClick={() => setShowGrantModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1" 
                  onClick={() => grantMutation.mutate(targetUser.id)}
                  disabled={grantMutation.isPending}
                >
                  {grantMutation.isPending ? 'Granting...' : 'Grant Access'}
                </Button>
              </div>
            </div>
          </Modal>

          <Modal isOpen={showRevokeModal} onClose={() => setShowRevokeModal(false)} title="Revoke Super Admin Access">
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl flex gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <div className="text-sm">
                  <p className="font-bold mb-1">You are about to revoke privileges from:</p>
                  <p className="font-medium">{targetUser.full_name}</p>
                  <p className="text-red-600/80 mb-2">{targetUser.email}</p>
                  <p>This user will immediately lose all Super Admin access.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="secondary" className="flex-1" onClick={() => setShowRevokeModal(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="danger" 
                  className="flex-1" 
                  onClick={() => revokeMutation.mutate(targetUser.id)}
                  disabled={revokeMutation.isPending}
                >
                  {revokeMutation.isPending ? 'Revoking...' : 'Revoke Access'}
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};
