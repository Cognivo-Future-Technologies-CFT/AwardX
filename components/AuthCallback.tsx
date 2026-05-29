import React, { useEffect, useState } from 'react';
import { auth, refreshUserCache, supabase } from '../services/supabase';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!supabase) {
      setStatus('error');
      setErrorMessage('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    let settled = false;
    const finishSuccess = async () => {
      if (settled) return;
      settled = true;
      await refreshUserCache();
      setStatus('success');
      setTimeout(() => {
        const postAuthRedirect = sessionStorage.getItem('postAuthRedirect');
        if (postAuthRedirect) {
          sessionStorage.removeItem('postAuthRedirect');
          navigate(postAuthRedirect, { replace: true });
          return;
        }
        navigate('/dashboard', { replace: true });
      }, 1000);
    };

    const finishError = (message: string) => {
      if (settled) return;
      settled = true;
      setStatus('error');
      setErrorMessage(message);
    };

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const oauthError =
      hashParams.get('error_description') ||
      queryParams.get('error_description') ||
      hashParams.get('error') ||
      queryParams.get('error');
    if (oauthError) {
      finishError(oauthError);
      return;
    }

    // Wait for Supabase to finish parsing the OAuth/magic-link URL (detectSessionInUrl).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) {
        await finishSuccess();
      }
    });

    const timeout = window.setTimeout(async () => {
      if (settled) return;
      const { session, error } = await auth.getSession();
      if (error) {
        finishError(error.message || 'Authentication failed');
        return;
      }
      if (session) {
        await finishSuccess();
        return;
      }
      finishError('No session found. Please try signing in again.');
    }, 8000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4"
      >
        <div className="flex flex-col items-center text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Completing sign in...</h2>
              <p className="text-slate-500">Please wait while we complete your authentication.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Success!</h2>
              <p className="text-slate-500">Redirecting you to the dashboard...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-600 mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Error</h2>
              <p className="text-slate-500 mb-4">{errorMessage}</p>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Return to Home
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

