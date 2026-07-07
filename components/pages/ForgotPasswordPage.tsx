import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { auth } from '../../services/supabase';
import { Link } from 'react-router-dom';
import { humanizeAuthError } from '../../lib/authErrors';
import { Logo } from '../Logo';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: resetError } = await auth.resetPassword(email);
      if (resetError) throw resetError;
      setSent(true);
      setCooldownSeconds(60);
    } catch (err: any) {
      const message = humanizeAuthError(err?.message || 'Failed to send reset email. Please try again.');
      setError(message);
      if (message.toLowerCase().includes('wait')) {
        setCooldownSeconds(60);
      }
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
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Check your email</h2>
              <p className="text-sm text-slate-500">
                We've sent a password reset link to <strong className="text-slate-700">{email}</strong>.
                Click the link in the email to reset your password.
              </p>
              <button
                type="button"
                onClick={() => { setSent(false); setError(null); }}
                disabled={cooldownSeconds > 0}
                className="mt-6 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {cooldownSeconds > 0 ? `Send another email in ${cooldownSeconds}s` : 'Send another email'}
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || cooldownSeconds > 0}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-base shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isLoading
                  ? 'Sending...'
                  : cooldownSeconds > 0
                    ? `Try again in ${cooldownSeconds}s`
                    : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
