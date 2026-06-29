import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, ArrowLeft, Loader2, Sparkles, QrCode } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { scanParticipantQr, ScanResult } from '../../services/attendance';

export const AttendanceScanPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse token from query string
  const params = new URLSearchParams(location.search);
  const token = params.get('token');

  useEffect(() => {
    // If auth is still loading, wait
    if (authLoading) return;

    // If not authenticated, redirect to login page with this route as redirect parameter
    if (!isAuthenticated) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
      navigate(redirectUrl, { replace: true });
      return;
    }

    // Check if token exists
    if (!token) {
      setError('Invalid URL: Missing check-in token.');
      setLoading(false);
      return;
    }

    // Call API to scan and verify
    const verifyPass = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await scanParticipantQr(token);
        setResult(res);
      } catch (err: any) {
        setError(err.message || 'Failed to scan pass. Make sure you are an authorized organizer for this event.');
      } finally {
        setLoading(false);
      }
    };

    verifyPass();
  }, [isAuthenticated, authLoading, token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] translate-y-1/2 translate-x-1/2"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white w-full max-w-md rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-8 text-center"
      >
        
        {/* Logo Branding */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-slate-900 tracking-tight text-lg">AwardX Check-In</span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Verifying Check-In Pass</h2>
              <p className="text-sm text-slate-500 mt-1">Please wait while we validate the attendance code...</p>
            </div>
          </div>
        ) : error ? (
          <div className="py-6 space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-9 h-9" />
            </div>
            
            <div>
              <h2 className="font-bold text-slate-900 text-xl font-display">Verification Failed</h2>
              <p className="text-sm text-slate-600 mt-3 px-4 leading-relaxed">{error}</p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-900 font-semibold text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Home Page
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {/* Success Animation Container */}
            <div className="relative">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm relative z-10">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-emerald-500/10 rounded-full blur-md"></div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full mb-3 uppercase tracking-wide">
                <Sparkles className="w-3 h-3" /> Check-In Successful
              </span>
              <h2 className="font-bold text-slate-900 text-2xl font-display mt-1">{result?.participant.name}</h2>
              <p className="text-sm text-slate-500 font-mono mt-1">{result?.participant.email}</p>
            </div>

            {/* Event Details Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-2.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Event</span>
                <span className="text-slate-800 truncate max-w-xs">{result?.programTitle}</span>
              </div>
              <div className="w-full h-px bg-slate-200/60"></div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-600">Checked In (Present)</span>
              </div>
              <div className="w-full h-px bg-slate-200/60"></div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Checked At</span>
                <span className="text-slate-600">
                  {result?.participant.markedAt 
                    ? new Date(result.participant.markedAt).toLocaleString() 
                    : new Date().toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
