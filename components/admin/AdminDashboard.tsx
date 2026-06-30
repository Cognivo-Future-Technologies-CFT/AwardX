import React from 'react';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Admin Dashboard</h1>
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
