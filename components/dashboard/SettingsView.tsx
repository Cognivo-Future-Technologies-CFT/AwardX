
import React, { useState } from 'react';
import { Button } from '../Button';
import { User, CreditCard, Bell, Shield, Globe } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');

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
             {activeTab === 'profile' && (
                <div className="space-y-6 max-w-lg">
                   <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Profile Information</h2>
                   
                   <div className="flex items-center gap-4 mb-6">
                      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" alt="" className="w-20 h-20 rounded-full border-4 border-slate-100" />
                      <div>
                         <Button variant="outline" size="sm">Change Avatar</Button>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                         <input type="text" defaultValue="Sarah Jenkins" className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                      </div>
                      <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                         <input type="email" defaultValue="sarah@company.com" className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                      </div>
                      <div>
                         <label className="block text-sm font-semibold text-slate-700 mb-1">Job Title</label>
                         <input type="text" defaultValue="Program Director" className="w-full px-4 py-2 border border-slate-200 rounded-lg" />
                      </div>
                   </div>

                   <div className="pt-4">
                      <Button>Save Changes</Button>
                   </div>
                </div>
             )}

             {activeTab === 'billing' && (
                <div className="space-y-6">
                   <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Current Plan</h2>
                   
                   <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex justify-between items-center">
                      <div>
                         <div className="text-indigo-900 font-bold text-lg">Pro Plan</div>
                         <div className="text-indigo-600 text-sm">$299/month • Renews on Dec 1st</div>
                      </div>
                      <Button variant="white" size="sm">Manage Subscription</Button>
                   </div>

                   <h3 className="font-bold text-slate-900 mt-8 mb-4">Payment Methods</h3>
                   <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-6 bg-slate-800 rounded flex items-center justify-center text-white text-[10px] font-bold">VISA</div>
                         <div>
                            <div className="text-sm font-bold text-slate-900">•••• 4242</div>
                            <div className="text-xs text-slate-500">Expires 12/25</div>
                         </div>
                      </div>
                      <button className="text-sm text-indigo-600 font-semibold hover:underline">Edit</button>
                   </div>
                </div>
             )}

             {/* Placeholder for other tabs */}
             {['notifications', 'security', 'domain'].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <SettingsViewIcon tab={activeTab} />
                   </div>
                   <h3 className="text-lg font-bold text-slate-900 capitalize">{activeTab} Settings</h3>
                   <p className="text-slate-500">This section is coming soon.</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

const SettingsViewIcon = ({ tab }: { tab: string }) => {
   if (tab === 'notifications') return <Bell className="w-8 h-8 text-slate-400" />;
   if (tab === 'security') return <Shield className="w-8 h-8 text-slate-400" />;
   return <Globe className="w-8 h-8 text-slate-400" />;
};
