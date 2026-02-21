
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../Button';
import { User, CreditCard, Bell, Shield, Globe } from 'lucide-react';
import { db } from '../../services/database';
import { auth } from '../../services/supabase';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: prof, error: profErr }, { data: orgData, error: orgErr }, { data: us, error: usErr }] = await Promise.all([
          db.getProfile(),
          db.getOrganization(),
          db.getUserSettings(),
        ]);
        if (profErr) throw profErr;
        if (orgErr) throw orgErr;
        if (usErr) {
          // user_settings is optional; ignore missing
        }
        setProfile(prof);
        setOrg(orgData);
        setUserSettings(us || { notifications: {}, preferences: {} });
      } catch (e: any) {
        setError(e?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const email = useMemo(() => profile?.email || '', [profile]);
  const avatarUrl = useMemo(
    () => profile?.avatar_url || '',
    [profile, email]
  );

  const updateNotification = async (key: string, value: boolean) => {
    const next = {
      ...(userSettings || {}),
      notifications: {
        ...(userSettings?.notifications || {}),
        [key]: value,
      },
    };
    setUserSettings(next);
    try {
      await db.updateUserSettings({ notifications: next.notifications });
    } catch (e: any) {
      setError(e?.message || 'Failed to update notification settings');
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      await db.updateProfile({
        full_name: profile?.full_name || null,
        job_title: profile?.job_title || null,
        timezone: profile?.timezone || 'UTC',
        avatar_url: profile?.avatar_url || null,
        phone: profile?.phone || null,
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const saveOrganization = async () => {
    setSaving(true);
    setError(null);
    try {
      await db.updateOrganization({
        name: org?.name || null,
        website: org?.website || null,
        industry: org?.industry || null,
        logo_url: org?.logo_url || null,
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to save organization settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'domain', label: 'Domain & Branding', icon: Globe },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">Manage your account preferences and program configuration.</p>
       </div>

       {error && (
         <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 text-sm">
           {error}
         </div>
       )}

       <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 bg-slate-50/50 border-r border-slate-200 p-2">
             {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-1 ${
                     activeTab === tab.id 
                     ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' 
                     : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                   <tab.icon className="w-4 h-4" />
                   {tab.label}
                </button>
             ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-8">
             {loading && (
               <div className="text-sm text-slate-500">Loading settings…</div>
             )}

             {activeTab === 'profile' && (
                <div className="space-y-6 max-w-lg">
                   <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Profile Information</h2>
                   
                   <div className="flex items-center gap-4 mb-6">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full border-4 border-slate-100 object-cover" />
                      ) : (
                        <div className="w-20 h-20 rounded-full border-4 border-slate-100 bg-indigo-600 flex items-center justify-center">
                          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                      )}
                      <div>
                         <Button variant="outline" size="sm" disabled>
                           Change Avatar
                         </Button>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                         <input
                           type="text"
                           value={profile?.full_name || ''}
                           onChange={(e) => setProfile((p: any) => ({ ...(p || {}), full_name: e.target.value }))}
                           className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                           disabled={loading}
                         />
                      </div>
                      <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                         <input
                           type="email"
                           value={email}
                           className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50"
                           disabled
                         />
                      </div>
                      <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Job Title</label>
                         <input
                           type="text"
                           value={profile?.job_title || ''}
                           onChange={(e) => setProfile((p: any) => ({ ...(p || {}), job_title: e.target.value }))}
                           className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                           disabled={loading}
                         />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Timezone</label>
                        <input
                          type="text"
                          value={profile?.timezone || 'UTC'}
                          onChange={(e) => setProfile((p: any) => ({ ...(p || {}), timezone: e.target.value }))}
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                          disabled={loading}
                        />
                      </div>
                   </div>

                   <div className="pt-4">
                      <Button onClick={saveProfile} disabled={loading || saving}>
                        {saving ? 'Saving…' : 'Save Changes'}
                      </Button>
                   </div>
                </div>
             )}

             {activeTab === 'billing' && (
                <div className="space-y-6">
                   <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Current Plan</h2>
                   
                   <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex justify-between items-center">
                      <div>
                         <div className="text-indigo-900 font-bold text-lg">{(org?.plan || 'starter').toString().toUpperCase()} Plan</div>
                         <div className="text-indigo-600 text-sm">Plan is loaded from your organization record in Supabase.</div>
                      </div>
                      <Button variant="white" size="sm" disabled>Manage Subscription</Button>
                   </div>

                   <h3 className="font-bold text-slate-900 mt-8 mb-4">Organization</h3>
                   <div className="border border-slate-200 rounded-xl p-4 space-y-3 max-w-xl">
                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">Organization Name</label>
                       <input
                         type="text"
                         value={org?.name || ''}
                         onChange={(e) => setOrg((o: any) => ({ ...(o || {}), name: e.target.value }))}
                         className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                         disabled={loading}
                       />
                     </div>
                     <div className="pt-2">
                       <Button onClick={saveOrganization} disabled={loading || saving}>
                         {saving ? 'Saving…' : 'Save Organization'}
                       </Button>
                     </div>
                   </div>
                </div>
             )}

             {activeTab === 'notifications' && (
               <div className="space-y-6 max-w-xl">
                 <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Notifications</h2>

                 <div className="space-y-4">
                   <ToggleRow
                     label="Email updates"
                     description="Product updates and important account notices."
                     checked={!!userSettings?.notifications?.email_updates}
                     onChange={(v) => updateNotification('email_updates', v)}
                     disabled={loading}
                   />
                   <ToggleRow
                     label="Submission alerts"
                     description="Get notified when new submissions arrive."
                     checked={!!userSettings?.notifications?.submission_alerts}
                     onChange={(v) => updateNotification('submission_alerts', v)}
                     disabled={loading}
                   />
                   <ToggleRow
                     label="Message notifications"
                     description="Notify me when I receive a new message."
                     checked={!!userSettings?.notifications?.message_alerts}
                     onChange={(v) => updateNotification('message_alerts', v)}
                     disabled={loading}
                   />
                 </div>
               </div>
             )}

             {activeTab === 'domain' && (
               <div className="space-y-6 max-w-xl">
                 <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Domain & Branding</h2>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Website</label>
                     <input
                       type="text"
                       value={org?.website || ''}
                       onChange={(e) => setOrg((o: any) => ({ ...(o || {}), website: e.target.value }))}
                       className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                       disabled={loading}
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Industry</label>
                     <input
                       type="text"
                       value={org?.industry || ''}
                       onChange={(e) => setOrg((o: any) => ({ ...(o || {}), industry: e.target.value }))}
                       className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                       disabled={loading}
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Logo URL</label>
                     <input
                       type="text"
                       value={org?.logo_url || ''}
                       onChange={(e) => setOrg((o: any) => ({ ...(o || {}), logo_url: e.target.value }))}
                       className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                       disabled={loading}
                     />
                   </div>
                   <div className="pt-2">
                     <Button onClick={saveOrganization} disabled={loading || saving}>
                       {saving ? 'Saving…' : 'Save Branding'}
                     </Button>
                   </div>
                 </div>
               </div>
             )}

             {activeTab === 'security' && (
               <div className="space-y-6 max-w-xl">
                 <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Security</h2>
                 <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                   <div>
                     <div className="font-semibold text-slate-900">Signed in as</div>
                     <div className="text-sm text-slate-500">{email || '—'}</div>
                   </div>
                   <Button
                     variant="outline"
                     onClick={async () => {
                       setSaving(true);
                       setError(null);
                       const { error } = await auth.signOut();
                       if (error) setError(error.message);
                       setSaving(false);
                     }}
                     disabled={saving}
                   >
                     Sign out
                   </Button>
                 </div>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4 border border-slate-200 rounded-xl p-4 bg-white">
    <div className="min-w-0">
      <div className="font-semibold text-slate-900">{label}</div>
      <div className="text-sm text-slate-500">{description}</div>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`shrink-0 w-12 h-7 rounded-full border transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-200 border-slate-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      aria-pressed={checked}
      aria-label={label}
    >
      <span
        className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  </div>
);
