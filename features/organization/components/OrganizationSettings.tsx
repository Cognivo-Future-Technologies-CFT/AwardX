import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Globe, Clock, Languages, Check, Eye, EyeOff, 
  Save, X, ShieldAlert, Archive, Trash2, Search, Filter, 
  ChevronLeft, ChevronRight, UploadCloud, AlertCircle
} from 'lucide-react';
import { Organization, OrganizationAuditLog } from '../../../services/models';
import { db as databaseService, PaginatedResult } from '../../../services/database';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import { toast } from 'sonner';

// Reusable Switch Component
const Switch = ({ checked, onChange, label, description }: { checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string }) => (
  <div className="flex items-center justify-between">
    <div>
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      {description && <div className="text-xs text-slate-500 mt-0.5">{description}</div>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
        checked ? 'bg-emerald-500' : 'bg-slate-200'
      }`}
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

interface OrganizationSettingsProps {
  organization: Organization;
  onUpdate?: () => void;
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({ organization, onUpdate }) => {
  // --- Form State ---
  const [formData, setFormData] = useState({
    name: organization.name || '',
    website: organization.website || '',
    industry: organization.industry || '',
    timezone: organization.timezone || 'UTC',
    language: organization.language || 'en',
    defaultEventVisibility: organization.defaultEventVisibility || 'private',
    autosaveEnabled: organization.autosaveEnabled ?? true,
    emailNotifications: organization.emailNotifications ?? true,
  });

  const [isSaving, setIsSaving] = useState(false);
  
  // Track if any changes have been made
  const isDirty = useMemo(() => {
    return (
      formData.name !== (organization.name || '') ||
      formData.website !== (organization.website || '') ||
      formData.industry !== (organization.industry || '') ||
      formData.timezone !== (organization.timezone || 'UTC') ||
      formData.language !== (organization.language || 'en') ||
      formData.defaultEventVisibility !== (organization.defaultEventVisibility || 'private') ||
      formData.autosaveEnabled !== (organization.autosaveEnabled ?? true) ||
      formData.emailNotifications !== (organization.emailNotifications ?? true)
    );
  }, [formData, organization]);

  // --- Audit Logs State ---
  const [logs, setLogs] = useState<PaginatedResult<OrganizationAuditLog>>({
    items: [], total: 0, page: 1, pageSize: 5, hasMore: false
  });
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [logSearch, setLogSearch] = useState('');
  const [debouncedLogSearch, setDebouncedLogSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedLogSearch(logSearch), 300);
    return () => clearTimeout(timer);
  }, [logSearch]);

  const loadLogs = useCallback(async (page: number) => {
    setIsLogsLoading(true);
    try {
      const result = await databaseService.getOrganizationAuditLogs(organization.id, {
        page,
        pageSize: 5,
        searchQuery: debouncedLogSearch
      });
      setLogs(result);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLogsLoading(false);
    }
  }, [organization.id, debouncedLogSearch]);

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  // --- Danger Zone State ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Handlers ---
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await databaseService.updateOrganization({
        name: formData.name,
        website: formData.website,
        industry: formData.industry,
        timezone: formData.timezone,
        language: formData.language,
        default_event_visibility: formData.defaultEventVisibility,
        autosave_enabled: formData.autosaveEnabled,
        email_notifications: formData.emailNotifications,
      });
      toast.success('Organization settings updated successfully');
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update organization settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: organization.name || '',
      website: organization.website || '',
      industry: organization.industry || '',
      timezone: organization.timezone || 'UTC',
      language: organization.language || 'en',
      defaultEventVisibility: organization.defaultEventVisibility || 'private',
      autosaveEnabled: organization.autosaveEnabled ?? true,
      emailNotifications: organization.emailNotifications ?? true,
    });
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmationText !== organization.name) return;
    setIsDeleting(true);
    try {
      // Dummy deletion for now since we just want the UI behavior
      await new Promise(res => setTimeout(res, 1000));
      toast.success('Organization deleted');
      setIsDeleteModalOpen(false);
      // Typically we would redirect to a workspace selector here
    } catch (err) {
      toast.error('Failed to delete organization');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 relative">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Settings</h2>
        <p className="text-slate-500 mt-1">Configure your workspace preferences and details.</p>
      </div>

      <div className="space-y-8">
        {/* 1. General Card */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-semibold text-slate-900">General</h3>
            <p className="text-sm text-slate-500">Configure your organization's basic information.</p>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Logo Upload area (dummy) */}
              <div className="flex-shrink-0 flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer group">
                  <UploadCloud className="w-8 h-8 group-hover:text-emerald-500 transition-colors" />
                </div>
                <span className="text-xs font-semibold text-slate-500">Upload Logo</span>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Organization Name</label>
                  <input
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none transition-all"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none transition-all"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Industry</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none transition-all"
                    value={formData.industry}
                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                  >
                    <option value="">Select industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Education">Education</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Non-Profit">Non-Profit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Time Zone</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none transition-all"
                    value={formData.timezone}
                    onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">EST (New York)</option>
                    <option value="America/Los_Angeles">PST (Los Angeles)</option>
                    <option value="Europe/London">GMT (London)</option>
                    <option value="Asia/Tokyo">JST (Tokyo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Language</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none transition-all"
                    value={formData.language}
                    onChange={e => setFormData({ ...formData, language: e.target.value })}
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Workspace Preferences Card */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-semibold text-slate-900">Workspace Preferences</h3>
            <p className="text-sm text-slate-500">Configure organization-wide defaults.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Default Event Visibility</label>
                  <div className="flex gap-4 mt-2">
                    <label className={`flex-1 flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${formData.defaultEventVisibility === 'public' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="visibility" value="public" className="sr-only" checked={formData.defaultEventVisibility === 'public'} onChange={() => setFormData({ ...formData, defaultEventVisibility: 'public' })} />
                      <Globe className={`w-5 h-5 ${formData.defaultEventVisibility === 'public' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-sm font-semibold">Public</div>
                        <div className="text-xs text-slate-500 mt-0.5">Visible on search engines</div>
                      </div>
                    </label>
                    <label className={`flex-1 flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${formData.defaultEventVisibility === 'private' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="visibility" value="private" className="sr-only" checked={formData.defaultEventVisibility === 'private'} onChange={() => setFormData({ ...formData, defaultEventVisibility: 'private' })} />
                      <EyeOff className={`w-5 h-5 ${formData.defaultEventVisibility === 'private' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-sm font-semibold">Private</div>
                        <div className="text-xs text-slate-500 mt-0.5">Invite only access</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="space-y-6 md:pl-6 md:border-l border-slate-100">
                <Switch 
                  label="Auto-save Drafts" 
                  description="Automatically save changes in the form builder and editor"
                  checked={formData.autosaveEnabled} 
                  onChange={(v) => setFormData({ ...formData, autosaveEnabled: v })} 
                />
                <hr className="border-slate-100" />
                <Switch 
                  label="Email Notifications" 
                  description="Receive daily summaries of workspace activity"
                  checked={formData.emailNotifications} 
                  onChange={(v) => setFormData({ ...formData, emailNotifications: v })} 
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Audit Logs Card */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Audit Logs</h3>
              <p className="text-sm text-slate-500">View recent activity performed within this organization.</p>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                placeholder="Search logs..." 
                className="w-full sm:w-64 pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-300 outline-none"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">Time</th>
                  <th className="px-6 py-3 whitespace-nowrap">User</th>
                  <th className="px-6 py-3 whitespace-nowrap">Action</th>
                  <th className="px-6 py-3 whitespace-nowrap">Resource</th>
                  <th className="px-6 py-3 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLogsLoading ? (
                  [1,2,3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    </tr>
                  ))
                ) : logs.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
                        <Filter className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No logs found matching your criteria</p>
                    </td>
                  </tr>
                ) : (
                  logs.items.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-xs">
                        {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap font-medium text-slate-900">{log.user}</td>
                      <td className="px-6 py-3 whitespace-nowrap">{log.action}</td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
                          {log.resourceType}: {log.resourceName}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {!isLogsLoading && logs.total > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Showing {((logs.page - 1) * logs.pageSize) + 1} to {Math.min(logs.page * logs.pageSize, logs.total)} of {logs.total} results
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => loadLogs(logs.page - 1)}
                  disabled={logs.page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => loadLogs(logs.page + 1)}
                  disabled={!logs.hasMore}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* 4. Danger Zone Card */}
        <section className="bg-white border border-red-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-red-100 bg-red-50/50">
            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" /> Danger Zone
            </h3>
            <p className="text-sm text-red-700/80">Destructive actions that cannot be easily undone.</p>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-900">Transfer Ownership</h4>
                  <p className="text-sm text-slate-500 mt-0.5">Transfer this organization to another user.</p>
                </div>
                <Button variant="ghost" className="border border-slate-200 text-slate-700 hover:bg-slate-50">Transfer</Button>
              </div>
              <hr className="border-red-100" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-900">Archive Organization</h4>
                  <p className="text-sm text-slate-500 mt-0.5">Make the organization read-only. Can be restored.</p>
                </div>
                <Button variant="ghost" className="border border-amber-200 text-amber-700 hover:bg-amber-50">Archive</Button>
              </div>
              <hr className="border-red-100" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-slate-900">Delete Organization</h4>
                  <p className="text-sm text-slate-500 mt-0.5">Permanently delete this organization and all its data.</p>
                </div>
                <Button 
                  variant="ghost" 
                  className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-200 font-semibold"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  Delete Organization
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Sticky Save Bar */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-2xl"
          >
            <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700">
              <span className="text-sm font-medium">You have unsaved changes.</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Delete Organization"
      >
        <form onSubmit={handleDelete} className="space-y-4">
          <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm border border-red-100 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <p>
              This action <strong>cannot</strong> be undone. This will permanently delete the <strong>{organization.name}</strong> organization, events, and all associated data.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Please type <span className="font-bold select-none">{organization.name}</span> to confirm.
            </label>
            <input
              required
              type="text"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-300 outline-none"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              disabled={isDeleting}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button 
              type="submit" 
              disabled={deleteConfirmationText !== organization.name || isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 border-transparent shadow-sm"
            >
              {isDeleting ? 'Deleting...' : 'Delete Organization'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
