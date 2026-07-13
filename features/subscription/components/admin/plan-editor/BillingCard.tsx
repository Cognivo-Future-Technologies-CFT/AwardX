import React from 'react';

interface BillingCardProps {
  title: string;
  price: number;
  cycle: string;
  description?: string;
  isActive?: boolean;
}

export const BillingCard: React.FC<BillingCardProps> = ({ title, price, cycle, description, isActive }) => {
  return (
    <div className={`p-6 rounded-2xl border transition-all ${
      isActive 
        ? 'border-indigo-500 bg-indigo-50/30 shadow-md ring-1 ring-indigo-500' 
        : 'border-slate-200 bg-white shadow-sm'
    }`}>
      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</h4>
      <div className="flex items-end gap-1 mb-2">
        <span className="text-4xl font-extrabold text-slate-900">${price}</span>
        <span className="text-slate-500 pb-1">/{cycle}</span>
      </div>
      {description && <p className="text-sm text-slate-600">{description}</p>}
    </div>
  );
};
