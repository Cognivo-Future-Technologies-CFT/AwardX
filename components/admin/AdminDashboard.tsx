import React from 'react';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Admin Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Total System Users</h3>
          <p className="text-3xl font-bold text-slate-900">--</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Active Organizations</h3>
          <p className="text-3xl font-bold text-slate-900">--</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Platform Revenue</h3>
          <p className="text-3xl font-bold text-slate-900">--</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Welcome to the AwardX Platform Admin</h2>
        <p className="text-slate-500 max-w-lg mx-auto">
          Manage system-wide settings, view pre-registrations for incoming organizations, and monitor platform health.
        </p>
      </div>
    </div>
  );
};
