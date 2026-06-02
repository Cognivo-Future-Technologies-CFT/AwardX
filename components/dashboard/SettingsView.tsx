
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../Button';
import { User, CreditCard, Bell, Shield, Globe, Wallet, Keyboard, Plug, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { IntegrationsPanel } from './IntegrationsPanel';
import { db } from '../../services/database';
import { auth, storage } from '../../services/supabase';
import { Program } from '../../services/models';

interface SettingsViewProps {
  activeEvent?: Program | null;
  onDeleteEvent?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ activeEvent, onDeleteEvent }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [userSettings, setUserSettings] = useState<any>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [billingProvider, setBillingProvider] = useState<'Stripe' | 'Razorpay'>('Stripe');
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [billingCurrency, setBillingCurrency] = useState('USD');
  const [billingFee, setBillingFee] = useState(0);
  const [billingPublicKey, setBillingPublicKey] = useState('');
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [integrationMessage, setIntegrationMessage] = useState<string | null>(null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeStatusDetails, setStripeStatusDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManagePrograms, setCanManagePrograms] = useState(false);
  const [confirmEventName, setConfirmEventName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const buildPresetAvatar = (seed: string, bg: string, fg: string) => {
    const initial = (seed || 'U').trim().charAt(0).toUpperCase() || 'U';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' fill='${bg}'/><circle cx='60' cy='46' r='24' fill='${fg}' fill-opacity='0.9'/><path d='M20 112c4-23 21-37 40-37s36 14 40 37' fill='${fg}' fill-opacity='0.9'/><text x='60' y='108' text-anchor='middle' font-family='Arial, sans-serif' font-size='16' fill='white' opacity='0.85'>${initial}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const avatarPresets = useMemo(
    () => [
      buildPresetAvatar('A', '#4f46e5', '#c7d2fe'),
      buildPresetAvatar('B', '#0f766e', '#99f6e4'),
      buildPresetAvatar('C', '#be123c', '#fecdd3'),
      buildPresetAvatar('D', '#4338ca', '#ddd6fe'),
      buildPresetAvatar('E', '#1d4ed8', '#bfdbfe'),
      buildPresetAvatar('F', '#7c3aed', '#e9d5ff'),
      buildPresetAvatar('G', '#b45309', '#fde68a'),
      buildPresetAvatar('H', '#166534', '#bbf7d0'),
    ],
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'billing') {
      setActiveTab('billing');
    }
    if (tab === 'integrations') {
      setActiveTab('integrations');
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data: prof, error: profErr }, { data: orgData, error: orgErr }, { data: us, error: usErr }, allPrograms, canManage] = await Promise.all([
          db.getProfile(),
          db.getOrganization(),
          db.getUserSettings(),
          db.getPrograms(),
          db.canManagePrograms(),
        ]);
        if (profErr) throw profErr;
        if (orgErr) throw orgErr;
        if (usErr) {
          // user_settings is optional; ignore missing
        }
        setProfile(prof);
        setOrg(orgData);
        setUserSettings(us || { notifications: {}, preferences: {} });
        setPrograms(allPrograms || []);
        setCanManagePrograms(canManage);

        const queryProgramId = params.get('programId') || '';
        const defaultProgramId = queryProgramId || activeEvent?.id || allPrograms?.[0]?.id || '';
        setSelectedProgramId(defaultProgramId);
      } catch (e: any) {
        setError(e?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeEvent?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeState = params.get('stripe');
    if (stripeState === 'connected') {
      setConnectMessage('Stripe account onboarding completed. Save billing settings to finalize.');
      setStripeConnected(true);
    }
  }, []);

  useEffect(() => {
    const selectedProgram = programs.find((p) => p.id === selectedProgramId);
    if (!selectedProgram) {
      return;
    }

    const paymentConfig = selectedProgram.paymentConfig;
    if (!paymentConfig) {
      setBillingProvider('Stripe');
      setBillingEnabled(false);
      setBillingCurrency('USD');
      setBillingFee(0);
      setBillingPublicKey('');
      return;
    }

    setBillingProvider(paymentConfig.provider === 'Razorpay' ? 'Razorpay' : 'Stripe');
    setBillingEnabled(!!paymentConfig.enabled);
    setBillingCurrency(paymentConfig.currency || (paymentConfig.provider === 'Razorpay' ? 'INR' : 'USD'));
    setBillingFee(Number(paymentConfig.fee || 0));
    setBillingPublicKey(paymentConfig.publicKey || '');
    setStripeConnected(!!paymentConfig.connected);
  }, [programs, selectedProgramId]);

  const refreshStripeStatus = async () => {
    if (!selectedProgramId) {
      setError('Please select a program first.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/payments/stripe-connect-status?programId=${selectedProgramId}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to refresh Stripe account status');
      }

      setStripeConnected(!!payload.connected);
      setStripeStatusDetails(payload);
      setConnectMessage(payload.connected
        ? 'Stripe account is fully connected and ready for live processing.'
        : 'Stripe account status updated. Complete any pending requirements to finish onboarding.');

      const refreshed = await db.getPrograms();
      setPrograms(refreshed || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to refresh Stripe account status');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeState = params.get('stripe');
    if ((stripeState === 'connected' || stripeState === 'refresh') && activeTab === 'billing' && selectedProgramId) {
      refreshStripeStatus();
    }
  }, [activeTab, selectedProgramId]);

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

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;
    const userId = profile?.id;
    if (!userId) {
      setError('Unable to upload avatar: missing user profile id.');
      return;
    }

    setAvatarUploading(true);
    setError(null);
    try {
      const { url, error: uploadError } = await storage.uploadAvatar(file, userId);
      if (uploadError || !url) {
        throw uploadError || new Error('Avatar upload failed');
      }

      setProfile((p: any) => ({ ...(p || {}), avatar_url: url }));
      setShowAvatarPicker(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
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

  const saveBillingConfig = async () => {
    const selectedProgram = programs.find((p) => p.id === selectedProgramId);
    if (!selectedProgram) {
      setError('Select a program before saving billing settings.');
      return;
    }

    setSaving(true);
    setError(null);
    setConnectMessage(null);

    try {
      await db.updateProgram({
        ...selectedProgram,
        paymentConfig: {
          enabled: billingEnabled,
          provider: billingProvider,
          currency: billingCurrency,
          fee: Number(billingFee) || 0,
          connected: billingProvider === 'Stripe'
            ? (stripeConnected || selectedProgram.paymentConfig?.connected || false)
            : true,
          publicKey: billingPublicKey || undefined,
        },
      });

      const refreshed = await db.getPrograms();
      setPrograms(refreshed || []);
      setConnectMessage('Billing settings saved.');
    } catch (e: any) {
      setError(e?.message || 'Failed to save billing settings');
    } finally {
      setSaving(false);
    }
  };

  const connectStripeAccount = () => {
    if (!selectedProgramId) {
      setError('Please select a program first.');
      return;
    }
    window.location.href = `/api/payments/stripe-connect-start?programId=${selectedProgramId}`;
  };

  const refreshPrograms = async () => {
    const refreshed = await db.getPrograms();
    setPrograms(refreshed || []);
  };

  const handleDeleteProgram = async () => {
    if (!activeEvent || !canManagePrograms || isDeleting) return;
    if (confirmEventName !== activeEvent.title) {
      setError('Confirmation name does not match event name.');
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await db.deleteProgram(activeEvent.id);
      if (onDeleteEvent) {
        onDeleteEvent();
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to delete event');
      setIsDeleting(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'domain', label: 'Domain & Branding', icon: Globe },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  ];

  const shortcutGroups = [
    {
      title: 'Global',
      items: [
        { keys: 'Cmd/Ctrl + K', action: 'Open universal search' },
        { keys: '?', action: 'Open this shortcut guide' },
        { keys: 'Esc', action: 'Close search or dialogs' },
      ],
    },
    {
      title: 'Navigation',
      items: [
        { keys: 'g then o', action: 'Go to Overview' },
        { keys: 'g then b', action: 'Open Overview Page' },
        { keys: 'g then p', action: 'Open Program Details' },
        { keys: 'g then f', action: 'Open Form Builder' },
        { keys: 'g then s', action: 'Open Settings' },
        { keys: 'g then t', action: 'Open Teams & Roles' },
        { keys: 'g then a', action: 'Open Analytics' },
        { keys: 'g then r', action: 'Open Reach' },
        { keys: 'g then l', action: 'Open Audit Logs' },
        { keys: 'g then j', action: 'Open Judging' },
      ],
    },
    {
      title: 'Working faster',
      items: [
        { keys: 'Search + Enter', action: 'Jump to the top result' },
        { keys: 'Click a result', action: 'Navigate directly to that item or view' },
        { keys: 'Use tabs', action: 'Switch between settings sections quickly' },
      ],
    },
  ];

  return (
     <div className="w-full min-h-[calc(100vh-10rem)] space-y-6">
       <div className="flex flex-col gap-2">
         <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
         <p className="text-slate-500 max-w-3xl">Manage your account preferences and program configuration.</p>
       </div>

       {error && (
         <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-3 text-sm">
           {error}
         </div>
       )}

       {integrationMessage && (
         <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
           {integrationMessage}
         </div>
       )}

       <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[calc(100vh-14rem)]">
         {/* Sidebar Tabs */}
         <div className="w-full xl:w-auto bg-slate-50/60 border-r border-slate-200 p-2 xl:p-3">
             {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors mb-1 ${
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
           <div className="min-w-0 p-5 md:p-8 xl:p-10">
             {loading && (
               <div className="text-sm text-slate-500">Loading settings…</div>
             )}

             {activeTab === 'profile' && (
               <div className="space-y-6 w-full max-w-4xl">
                   <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Profile Information</h2>
                   
                   <div className="flex items-center gap-4 mb-6">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full border-4 border-slate-100 object-cover" />
                      ) : (
                        <div className="w-20 h-20 rounded-full border-4 border-slate-100 bg-indigo-600 flex items-center justify-center">
                          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                      )}
                      <div className="space-y-2">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setShowAvatarPicker((prev) => !prev)}
                           disabled={avatarUploading}
                         >
                           {showAvatarPicker ? 'Close Avatar Picker' : 'Change Avatar'}
                         </Button>
                         {avatarUrl && (
                           <button
                             type="button"
                             onClick={() => setProfile((p: any) => ({ ...(p || {}), avatar_url: '' }))}
                             className="block text-xs text-slate-500 hover:text-slate-700"
                           >
                             Remove avatar
                           </button>
                         )}
                      </div>
                   </div>

                   {showAvatarPicker && (
                     <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-2">Upload avatar</label>
                         <input
                           type="file"
                           accept="image/*"
                           disabled={avatarUploading}
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               void handleAvatarUpload(file);
                             }
                             e.target.value = '';
                           }}
                           className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-100"
                         />
                         {avatarUploading && <p className="mt-2 text-xs text-indigo-600">Uploading avatar...</p>}
                       </div>

                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-2">Choose a preset avatar</label>
                         <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                           {avatarPresets.map((preset) => {
                             const selected = profile?.avatar_url === preset;
                             return (
                               <button
                                 key={preset}
                                 type="button"
                                 onClick={() => setProfile((p: any) => ({ ...(p || {}), avatar_url: preset }))}
                                 className={`rounded-full p-0.5 border-2 transition-colors ${selected ? 'border-indigo-500' : 'border-transparent hover:border-slate-300'}`}
                                 title="Select avatar"
                               >
                                 <img src={preset} alt="Preset avatar" className="h-12 w-12 rounded-full object-cover" />
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     </div>
                   )}

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
                      <Button onClick={saveProfile} disabled={loading || saving || avatarUploading}>
                        {saving ? 'Saving…' : 'Save Changes'}
                      </Button>
                   </div>
                </div>
             )}

             {activeTab === 'integrations' && (
               <IntegrationsPanel
                 programs={programs}
                 selectedProgramId={selectedProgramId}
                 onProgramChange={setSelectedProgramId}
                 loading={loading}
                 onError={setError}
                 onSuccess={setIntegrationMessage}
                 onProgramsUpdated={refreshPrograms}
               />
             )}

             {activeTab === 'billing' && (
               <div className="space-y-6 w-full max-w-6xl">
                   <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Current Plan</h2>
                   
                   <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                         <div className="text-indigo-900 font-bold text-lg">{(org?.plan || 'starter').toString().toUpperCase()} Plan</div>
                         <div className="text-indigo-600 text-sm">Plan is loaded from your organization record in Supabase.</div>
                      </div>
                      <Button variant="white" size="sm" disabled>Manage Subscription</Button>
                   </div>

                   <h3 className="font-bold text-slate-900 mt-8 mb-4">Organization</h3>
                   <div className="border border-slate-200 rounded-xl p-4 space-y-3 w-full max-w-2xl">
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

                   <h3 className="font-bold text-slate-900 mt-8 mb-4">Payment Providers</h3>
                   <div className="border border-slate-200 rounded-xl p-4 space-y-4 w-full max-w-4xl">
                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">Program</label>
                       <select
                         value={selectedProgramId}
                         onChange={(e) => setSelectedProgramId(e.target.value)}
                         className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                         disabled={loading || programs.length === 0}
                       >
                         {programs.map((program) => (
                           <option key={program.id} value={program.id}>{program.title}</option>
                         ))}
                       </select>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Provider</label>
                         <select
                           value={billingProvider}
                           onChange={(e) => {
                             const provider = e.target.value === 'Razorpay' ? 'Razorpay' : 'Stripe';
                             setBillingProvider(provider);
                             if (provider === 'Razorpay' && billingCurrency === 'USD') {
                               setBillingCurrency('INR');
                             }
                           }}
                           className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                           disabled={loading}
                         >
                           <option value="Stripe">Stripe</option>
                           <option value="Razorpay">Razorpay</option>
                         </select>
                       </div>

                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Currency</label>
                         <select
                           value={billingCurrency}
                           onChange={(e) => setBillingCurrency(e.target.value)}
                           className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                           disabled={loading}
                         >
                           {billingProvider === 'Razorpay' ? (
                             <>
                               <option value="INR">INR</option>
                               <option value="USD">USD</option>
                             </>
                           ) : (
                             <>
                               <option value="USD">USD</option>
                               <option value="EUR">EUR</option>
                               <option value="GBP">GBP</option>
                               <option value="CAD">CAD</option>
                             </>
                           )}
                         </select>
                       </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Submission Fee</label>
                         <div className="relative">
                           <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input
                             type="number"
                             min="0"
                             step="0.01"
                             value={billingFee}
                             onChange={(e) => setBillingFee(Number(e.target.value) || 0)}
                             className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg"
                             disabled={loading}
                           />
                         </div>
                       </div>

                       <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Enable payments</label>
                         <button
                           type="button"
                           onClick={() => setBillingEnabled((prev) => !prev)}
                           className={`relative mt-1 h-8 w-14 rounded-full transition-colors ${billingEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                           aria-label="Toggle payment collection"
                         >
                           <span className={`absolute top-1 block h-6 w-6 rounded-full bg-white transition-transform ${billingEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                         </button>
                       </div>
                     </div>

                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">
                         {billingProvider === 'Razorpay' ? 'Razorpay Key ID' : 'Provider Public Key'}
                       </label>
                       <input
                         type="text"
                         value={billingPublicKey}
                         onChange={(e) => setBillingPublicKey(e.target.value)}
                         className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                         placeholder={billingProvider === 'Razorpay' ? 'rzp_live_xxx' : 'pk_live_xxx'}
                         disabled={loading}
                       />
                     </div>

                     {billingProvider === 'Stripe' && (
                       <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                         <p className="text-sm text-slate-600 mb-3">Connect Stripe Express account for payouts and live processing.</p>
                         <div className="flex flex-wrap items-center gap-2">
                           <Button variant="outline" onClick={connectStripeAccount} disabled={!selectedProgramId || saving}>
                             Connect Stripe Account
                           </Button>
                           <Button variant="outline" onClick={refreshStripeStatus} disabled={!selectedProgramId || saving}>
                             Refresh Stripe Status
                           </Button>
                         </div>
                         {stripeStatusDetails && (
                           <div className="mt-3 text-xs text-slate-600 space-y-1">
                             <p>Charges Enabled: {stripeStatusDetails.chargesEnabled ? 'Yes' : 'No'}</p>
                             <p>Payouts Enabled: {stripeStatusDetails.payoutsEnabled ? 'Yes' : 'No'}</p>
                             {stripeStatusDetails.disabledReason && (
                               <p>Disabled Reason: {stripeStatusDetails.disabledReason}</p>
                             )}
                             {(stripeStatusDetails.requirementsDue || []).length > 0 && (
                               <p>Pending Requirements: {(stripeStatusDetails.requirementsDue || []).join(', ')}</p>
                             )}
                           </div>
                         )}
                       </div>
                     )}

                     {connectMessage && (
                       <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                         {connectMessage}
                       </div>
                     )}

                     <div className="pt-2">
                       <Button onClick={saveBillingConfig} disabled={loading || saving || !selectedProgramId}>
                         {saving ? 'Saving…' : 'Save Billing Settings'}
                       </Button>
                     </div>
                   </div>
                </div>
             )}

             {activeTab === 'notifications' && (
               <div className="space-y-6 w-full max-w-4xl">
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
               <div className="space-y-6 w-full max-w-4xl">
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
               <div className="space-y-6 w-full max-w-4xl">
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

                 {canManagePrograms && activeEvent && (
                   <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50/50 p-6 space-y-4">
                     <div className="flex items-start gap-3">
                       <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                         <AlertTriangle className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="text-base font-bold text-rose-950">Danger Zone: Delete Event</h3>
                         <p className="text-sm text-rose-700 mt-1 leading-relaxed">
                           Permanently delete this event (<span className="font-semibold">{activeEvent.title}</span>), including all categories, forms, submissions, and judging configurations. This action is irreversible.
                         </p>
                       </div>
                     </div>

                     <div className="border-t border-rose-200/60 pt-4 space-y-3">
                       <p className="text-xs text-rose-800 font-medium">
                         To confirm deletion, please type the exact name of the event: <span className="font-bold select-all bg-rose-100/80 px-1.5 py-0.5 rounded border border-rose-200">{activeEvent.title}</span>
                       </p>
                       <div className="flex flex-col sm:flex-row gap-3">
                         <input
                           type="text"
                           value={confirmEventName}
                           onChange={(e) => setConfirmEventName(e.target.value)}
                           placeholder="Type event name to confirm"
                           disabled={isDeleting}
                           className="flex-1 px-4 py-2 border border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-none rounded-lg text-sm bg-white"
                         />
                         <motion.button
                           whileTap={{ scale: 0.98 }}
                           onClick={handleDeleteProgram}
                           disabled={isDeleting || confirmEventName !== activeEvent.title}
                           className={`inline-flex items-center justify-center rounded-lg font-medium px-5 py-2 text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm ${
                             confirmEventName === activeEvent.title && !isDeleting
                               ? 'bg-rose-600 hover:bg-rose-700'
                               : 'bg-slate-300 cursor-not-allowed'
                           }`}
                         >
                           {isDeleting ? 'Deleting...' : 'Delete Event'}
                         </motion.button>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             )}

             {activeTab === 'shortcuts' && (
               <div className="space-y-6 w-full max-w-6xl">
                 <div className="space-y-2">
                   <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Shortcut Guide</h2>
                   <p className="text-sm text-slate-500 max-w-3xl">
                     Use these shortcuts to move through the app faster and launch the universal search from anywhere.
                   </p>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                   {shortcutGroups.map((group) => (
                     <div key={group.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                       <h3 className="text-sm font-bold text-slate-900 mb-4">{group.title}</h3>
                       <div className="space-y-3">
                         {group.items.map((item) => (
                           <div key={`${group.title}:${item.keys}`} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 px-3 py-3">
                             <div className="min-w-0">
                               <div className="font-semibold text-slate-900 text-sm">{item.action}</div>
                             </div>
                             <kbd className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                               {item.keys}
                             </kbd>
                           </div>
                         ))}
                       </div>
                     </div>
                   ))}
                 </div>

                 <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4 text-sm text-indigo-900">
                   <strong>Universal search:</strong> type a program, submission, person, role, notification, log, category, or form name. The search bar will surface the closest match and let you jump directly there.
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
