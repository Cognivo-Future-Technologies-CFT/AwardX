import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../../services/supabase';
import { getSupabaseClient } from '../../services/supabaseClient';
import {
  invalidateSessionCache,
  refreshSessionFromAuth,
  setCachedSession,
  subscribeAuthState,
} from '../../services/userContext';
import { Logo } from '../Logo';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingLink, setIsVerifyingLink] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsVerifyingLink(false);
      setError('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    let settled = false;
    invalidateSessionCache();

    const markReady = (session: Awaited<ReturnType<typeof refreshSessionFromAuth>>) => {
      if (settled || !session) return;
      settled = true;
      setCachedSession(session);
      setLinkValid(true);
      setIsVerifyingLink(false);
    };

    const markInvalid = (message: string) => {
      if (settled) return;
      settled = true;
      setLinkValid(false);
      setIsVerifyingLink(false);
      setError(message);
    };

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const oauthError =
      hashParams.get('error_description') ||
      queryParams.get('error_description') ||
      hashParams.get('error') ||
      queryParams.get('error');
    if (oauthError) {
      markInvalid(oauthError);
      return;
    }

    const unsubscribe = subscribeAuthState(async (event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        markReady(session);
      }
    });

    const timeout = window.setTimeout(async () => {
      if (settled) return;
      const session = await refreshSessionFromAuth();
      if (session) {
        markReady(session);
        return;
      }
      markInvalid('This reset link is invalid or has expired. Request a new one.');
    }, 8000);

    return () => {
      unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await auth.updatePassword(password);
      if (updateError) throw updateError;
      setSuccess(true);
      window.setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Request a new link
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter and confirm your new password below.
            </p>
          </div>

          {isVerifyingLink ? (
            <div className="py-8 text-center text-sm text-slate-500">Verifying your reset link...</div>
          ) : success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Password updated</h2>
              <p className="text-sm text-slate-500">Redirecting you to login...</p>
            </motion.div>
          ) : !linkValid ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error || 'This reset link is invalid or has expired.'}
              </p>
              <Link
                to="/forgot-password"
                className="block w-full py-3 text-center bg-slate-900 text-white rounded-xl font-bold text-base"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  New password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-base shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
