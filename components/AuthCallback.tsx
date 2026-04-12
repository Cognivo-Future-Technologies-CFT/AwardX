import React, { useEffect, useState } from 'react';
import { auth, refreshUserCache } from '../services/supabase';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash using auth helper
        const { session, error } = await auth.getSession();
        
        if (error) {
          throw error;
        }

        if (session) {
          // Session exists, authentication successful
          // Refresh user cache to get latest org info
          await refreshUserCache();
          
          setStatus('success');
          
          // Wait a moment to show success state, then redirect
          setTimeout(() => {
            const postAuthRedirect = sessionStorage.getItem('postAuthRedirect');
            if (postAuthRedirect) {
              sessionStorage.removeItem('postAuthRedirect');
              navigate(postAuthRedirect, { replace: true });
              return;
            }
            navigate('/dashboard', { replace: true });
          }, 1000);
        } else {
          // No session found, check URL for error
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const errorDescription = hashParams.get('error_description');
          
          if (errorDescription) {
            throw new Error(errorDescription);
          }
          
          throw new Error('No session found. Please try signing in again.');
        }
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.message || 'Authentication failed');
      }
    };

    handleAuthCallback();
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

