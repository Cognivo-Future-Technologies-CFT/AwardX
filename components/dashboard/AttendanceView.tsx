import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Users, Mail, Trash2, Check, RefreshCw, Plus, 
  Camera, X, Search, CheckCircle, Clock, AlertCircle, Sparkles, AlertTriangle
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Program } from '../../services/models';
import { 
  getAttendanceList, 
  addParticipant, 
  syncFromSubmissions, 
  deleteParticipant, 
  sendQrPass, 
  sendBulkQrPasses,
  scanParticipantQr
} from '../../services/attendance';

interface AttendanceViewProps {
  activeEvent: Program | null;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ activeEvent }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'present' | 'absent'>('all');
  
  // Modal states
  const [showScanner, setShowScanner] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ name: '', email: '' });
  
  // Action loaders
  const [syncing, setSyncing] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Scanner states
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [scanning, setScanning] = useState(false);

  const fetchRecords = async () => {
    if (!activeEvent) return;
    try {
      setLoading(true);
      const data = await getAttendanceList(activeEvent.id);
      setRecords(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load attendance list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [activeEvent]);

  // Set up and teardown html5-qrcode scanner
  useEffect(() => {
    if (!showScanner) {
      setScanResult(null);
      setScanning(false);
      return;
    }

    setScanning(true);
    const scanner = new Html5QrcodeScanner(
      'attendance-qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
      /* verbose= */ false
    );

    const onScanSuccess = async (decodedText: string) => {
      // Decode decodedText - check if it is a full URL or a raw token
      let token = decodedText.trim();
      if (token.includes('token=')) {
        const urlParams = new URLSearchParams(token.split('?')[1]);
        token = urlParams.get('token') || token;
      }

      try {
        setScanResult(null);
        const result = await scanParticipantQr(token);
        if (result.ok) {
          setScanResult({
            type: 'success',
            message: `Successfully checked in: ${result.participant.name} (${result.participant.email})`
          });
          toast.success(`Checked in ${result.participant.name}`);
          fetchRecords(); // Refresh list
        }
      } catch (error: any) {
        setScanResult({
          type: 'error',
          message: error.message || 'Failed to verify QR code'
        });
        toast.error('Verification failed');
      }
    };

    scanner.render(onScanSuccess, (error) => {
      // Silent error logging to avoid console noise
    });

    return () => {
      scanner.clear().catch((err) => {
        console.warn('Failed to clear scanner on unmount:', err);
      });
    };
  }, [showScanner]);

  const handleSync = async () => {
    if (!activeEvent) return;
    try {
      setSyncing(true);
      const res = await syncFromSubmissions(activeEvent.id);
      toast.success(res.message);
      fetchRecords();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync submissions');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    try {
      setSyncing(true);
      await addParticipant(activeEvent.id, newParticipant.name, newParticipant.email);
      toast.success('Participant added successfully');
      setNewParticipant({ name: '', email: '' });
      setShowAddModal(false);
      fetchRecords();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add participant');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this participant?')) return;
    try {
      setProcessingId(id);
      await deleteParticipant(id);
      toast.success('Participant removed');
      fetchRecords();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete record');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendQr = async (id: string, name: string) => {
    try {
      setProcessingId(id);
      await sendQrPass(id);
      toast.success(`QR check-in pass sent to ${name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send pass email');
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendAll = async () => {
    if (!activeEvent) return;
    if (!window.confirm(`Are you sure you want to send unique QR passes to all ${records.length} participants? This will send emails in background.`)) return;
    try {
      setSendingBulk(true);
      const res = await sendBulkQrPasses(activeEvent.id);
      toast.success(res.message);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send bulk passes');
    } finally {
      setSendingBulk(false);
    }
  };

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken) return;
    try {
      setScanResult(null);
      const result = await scanParticipantQr(manualToken.trim());
      if (result.ok) {
        setScanResult({
          type: 'success',
          message: `Successfully checked in: ${result.participant.name} (${result.participant.email})`
        });
        toast.success(`Checked in ${result.participant.name}`);
        setManualToken('');
        fetchRecords();
      }
    } catch (error: any) {
      setScanResult({
        type: 'error',
        message: error.message || 'Invalid or unrecognized check-in token'
      });
      toast.error('Check-in failed');
    }
  };

  // Stats calculation
  const totalCount = records.length;
  const presentCount = records.filter(r => r.status === 'present').length;
  const pendingCount = records.filter(r => r.status === 'pending').length;

  // Search & Filter
  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Attendance Pass</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage participants check-in, broadcast email passes, and scan QR passes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing || loading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Submissions
          </button>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700"
          >
            <Plus className="w-4 h-4" />
            Add Participant
          </button>

          <button 
            onClick={handleSendAll}
            disabled={sendingBulk || records.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors text-sm font-semibold disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            Email Pass to All
          </button>
          
          <button 
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition-all font-bold text-sm"
          >
            <Camera className="w-4 h-4" />
            Scan QR Code
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalCount}</div>
            <div className="text-xs text-slate-500 font-medium">Total Registered</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{presentCount}</div>
            <div className="text-xs text-slate-500 font-medium">Checked In (Present)</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{pendingCount}</div>
            <div className="text-xs text-slate-500 font-medium">Pending Check-in</div>
          </div>
        </div>
      </div>

      {/* Roster Controls & Search */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        
        {/* Filter bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {(['all', 'pending', 'present'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                  statusFilter === filter 
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {filter === 'all' ? 'Show All' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Table list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-3"></div>
            <p className="text-sm text-slate-500 font-medium">Loading attendance roster...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-900 font-bold text-lg">No participants found</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto mt-1">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search criteria or filters.' 
                : 'Sync submissions or add custom participants manually to build your attendance roster.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Checked In At</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">{record.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 font-mono">{record.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                        record.status === 'present' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {record.status === 'present' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {record.status === 'present' ? 'Present' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-500">
                        {record.marked_at 
                          ? new Date(record.marked_at).toLocaleString() 
                          : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSendQr(record.id, record.name)}
                          disabled={processingId === record.id}
                          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                          title="Send Check-In QR Pass"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          disabled={processingId === record.id}
                          className="p-2 border border-slate-200 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Remove Participant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-900 font-display">Add Participant</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddParticipant} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text"
                  required
                  value={newParticipant.name}
                  onChange={(e) => setNewParticipant({...newParticipant, name: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                <input 
                  type="email"
                  required
                  value={newParticipant.email}
                  onChange={(e) => setNewParticipant({...newParticipant, email: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="john@company.com"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  {syncing ? 'Adding...' : 'Add Participant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-lg text-slate-900 font-display">Scan Attendance Pass</h2>
              </div>
              <button 
                onClick={() => setShowScanner(false)}
                className="p-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Scan Result Alert */}
              {scanResult && (
                <div className={`p-4 border rounded-xl flex items-start gap-3 ${
                  scanResult.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {scanResult.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">{scanResult.type === 'success' ? 'Pass Verified' : 'Check-In Failed'}</h3>
                    <p className="text-xs mt-1 leading-relaxed">{scanResult.message}</p>
                  </div>
                </div>
              )}

              {/* Camera Reader Area */}
              <style>{`
                #attendance-qr-reader button {
                  background-color: #4f46e5 !important;
                  color: white !important;
                  border: none !important;
                  padding: 8px 16px !important;
                  border-radius: 8px !important;
                  font-weight: 600 !important;
                  margin: 8px auto !important;
                  cursor: pointer !important;
                  display: block !important;
                  font-size: 14px !important;
                  transition: background-color 0.2s !important;
                  font-family: inherit !important;
                }
                #attendance-qr-reader button:hover {
                  background-color: #4338ca !important;
                }
                #attendance-qr-reader a {
                  color: #818cf8 !important;
                  font-weight: 600 !important;
                  cursor: pointer !important;
                  text-decoration: underline !important;
                  display: inline-block !important;
                  margin-top: 8px !important;
                }
                #attendance-qr-reader {
                  border: none !important;
                  color: #94a3b8 !important;
                }
                #attendance-qr-reader__status_span {
                  color: #94a3b8 !important;
                  font-size: 14px !important;
                }
                #attendance-qr-reader__header_message {
                  color: #94a3b8 !important;
                  font-size: 14px !important;
                }
              `}</style>
              <div className="relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                {scanning && (
                  <div className="absolute inset-0 bg-transparent pointer-events-none z-10 flex flex-col justify-between p-4">
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-t-4 border-l-4 border-indigo-600"></div>
                      <div className="w-6 h-6 border-t-4 border-r-4 border-indigo-600"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-b-4 border-l-4 border-indigo-600"></div>
                      <div className="w-6 h-6 border-b-4 border-r-4 border-indigo-600"></div>
                    </div>
                  </div>
                )}
                <div id="attendance-qr-reader" className="w-full h-full overflow-hidden bg-black"></div>
              </div>

              {/* Manual Entry Fallback */}
              <form onSubmit={handleManualCheckIn} className="pt-4 border-t border-slate-100 flex gap-2">
                <input 
                  type="text"
                  placeholder="Enter QR token or check-in key manually..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  Verify Key
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
