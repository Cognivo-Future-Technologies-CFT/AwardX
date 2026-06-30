import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Download, ChevronLeft, ChevronRight, Eye, LayoutDashboard, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import { preRegistrationService, PreRegistrationData } from '../../services/preRegistration';


export const AdminPreRegistrationsList: React.FC = () => {
  const [data, setData] = useState<PreRegistrationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');
  const navigate = useNavigate();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await preRegistrationService.getRegistrations();
      setData(result || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data.length) return;
    
    const exportData = data.map(item => ({
      'Date': item.created_at ? new Date(item.created_at).toLocaleDateString() : '',
      'Status': item.status || 'New',
      'Full Name': item.full_name || '',
      'Email': item.email || '',
      'Phone': item.phone || '',
      'Country': item.country || '',
      'Role': item.role || '',
      'Organization Name': item.org_name || item.organization || '',
      'Website': item.website || '',
      'Employees Count': item.employees_count || '',
      'Industry': item.industry || '',
      'Runs Awards?': item.runs_awards ? 'Yes' : 'No',
      'Award Categories': item.award_categories || '',
      'Estimated Nominations': item.estimated_nominations || '',
      'Estimated Judges': item.estimated_judges || '',
      'Expected Launch Month': item.expected_launch_month || '',
      'Current Workflow': item.current_workflow || '',
      'Biggest Pain Point': item.biggest_pain_point || '',
      'Join Beta': item.join_beta ? 'Yes' : 'No',
      'Schedule Demo': item.schedule_demo ? 'Yes' : 'No',
      'Design Partner': item.design_partner ? 'Yes' : 'No',
      'UTM Source': item.utm_source || '',
      'UTM Campaign': item.utm_campaign || '',
      'Referral Code': item.referral_code || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pre-Registrations');
    
    // Auto-size columns slightly
    const colWidths = Object.keys(exportData[0]).map(() => ({ wch: 15 }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `AwardX_PreRegistrations_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredData = data
    .filter(item => {
      const matchSearch = (item.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (item.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter ? item.status === statusFilter : true;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || '').getTime();
      const dateB = new Date(b.created_at || '').getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-700';
      case 'Contacted': return 'bg-amber-100 text-amber-700';
      case 'Demo Scheduled': return 'bg-purple-100 text-purple-700';
      case 'Qualified': return 'bg-emerald-100 text-emerald-700';
      case 'Converted': return 'bg-indigo-100 text-indigo-700';
      case 'Rejected': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="flex flex-col font-sans h-full">
      <div className="flex-1 w-full h-full p-2">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Pre-Registrations</h1>
            <p className="text-slate-500">Manage early access requests and beta signups.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between bg-slate-50/50">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                <option value="">All Statuses</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Demo Scheduled">Demo Scheduled</option>
                <option value="Qualified">Qualified</option>
                <option value="Converted">Converted</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-semibold transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Applicant</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 cursor-pointer" onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
                    <div className="flex items-center gap-2">
                      Date {sortOrder === 'desc' ? '↓' : '↑'}
                    </div>
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                      Loading records...
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No registrations found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{item.full_name}</div>
                        <div className="text-sm text-slate-500">{item.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700">{item.role || '-'}</div>
                        <div className="text-xs text-slate-500">{item.organization || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(item.created_at || '').toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/admin/pre-registrations/${item.id}`)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-sm text-slate-500">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
