import React from 'react';
import { Invoice } from '../types';
import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceTableProps {
  invoices: Invoice[];
  className?: string;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, className = '' }) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="pb-3 text-xs font-semibold text-slate-500 uppercase">Invoice</th>
            <th className="pb-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
            <th className="pb-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
            <th className="pb-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            <th className="pb-3 text-xs font-semibold text-slate-500 uppercase text-right">Download</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                No invoices available.
              </td>
            </tr>
          ) : (
            invoices.map((invoice) => (
              <tr key={invoice.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-900">{invoice.number}</span>
                  </div>
                </td>
                <td className="py-4 text-sm text-slate-600">
                  {format(new Date(invoice.date), 'MMM d, yyyy')}
                </td>
                <td className="py-4 text-sm font-medium text-slate-900">
                  {invoice.amount === 0 ? 'Free' : `$${invoice.amount.toFixed(2)}`}
                </td>
                <td className="py-4">
                  <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                    invoice.status === 'OPEN' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
