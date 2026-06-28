import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Mail, Lock, Eye, EyeOff, Gavel, Star, TrendingUp } from 'lucide-react';
import { auth } from '../../services/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import { consumePostAuthRedirect, sanitizeRedirectPath, storePostAuthRedirect } from '../../lib/safeRedirect';
import { useRequestLock } from '../../hooks/useRequestLock';
import { Logo } from '../Logo';

function humanizeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials') || m.includes('wrong password')) {
    return "That email and password combination doesn't match. Check your spelling or reset your password.";
  }
  if (m.includes('email not confirmed')) {
    return "Please check your inbox and click the confirmation link we sent you.";
  }
  if (m.includes('user not found') || m.includes('no user found')) {
    return "We couldn't find an account with that email. Try signing up instead.";
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (m.includes('network') || m.includes('fetch')) {
    return "Connection error. Check your internet and try again.";
  }
  return "Something went wrong. Please try again or contact support.";
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);


export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const nextPath = sanitizeRedirectPath(params.get('next') || params.get('redirect'), '');

  React.useEffect(() => {
    const teamInviteToken = params.get('teamInviteToken');
    if (teamInviteToken) {
      navigate(`/team-invite/${teamInviteToken}`, { replace: true });
    }
  }, [navigate, params]);
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const runLocked = useRequestLock();

  const handleGoogleLogin = async () => {
    await runLocked(async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (nextPath) {
          storePostAuthRedirect(nextPath);
        }
        const { error: authError } = await auth.signInWithProvider('google');
        if (authError) {
          setError(humanizeAuthError(authError.message));
          setIsLoading(false);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to sign in with Google');
        setIsLoading(false);
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    await runLocked(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { error: authError } = await auth.signIn(email, password);
        if (authError) {
          setError(humanizeAuthError(authError.message));
          setIsLoading(false);
        } else {
          const returnUrl = sessionStorage.getItem('formReturnUrl') || sessionStorage.getItem('postAuthRedirect');
          if (returnUrl) {
            sessionStorage.removeItem('formReturnUrl');
            sessionStorage.removeItem('postAuthRedirect');
            window.location.href = sanitizeRedirectPath(returnUrl);
          } else if (nextPath) {
            navigate(nextPath);
          } else {
            navigate('/dashboard');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to sign in');
        setIsLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      
      {/* Left Panel - Visual Showcase (Reversed from Signup) */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12 order-1">
         {/* Abstract Background */}
         <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-200 h-200 bg-linear-to-b from-indigo-500/20 to-purple-500/20 rounded-full blur-[120px] mix-blend-screen -translate-y-1/2 -translate-x-1/2"></div>
          <div className="absolute bottom-0 right-0 w-150 h-150 bg-gradient-to-t from-cyan-500/10 to-blue-500/10 rounded-full blur-[100px] mix-blend-screen translate-y-1/3 translate-x-1/3"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
         </div>

         {/* Floating Card Animation */}
         <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2, duration: 0.6 }}
           className="relative z-10 w-full max-w-md"
         >
           {/* Glassmorphic Card - Judge View */}
           <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500"></div>
              
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center border-2 border-cyan-400">
                       <Gavel className="w-5 h-5 text-white" />
                    </div>
                    <div>
                       <div className="text-white font-bold text-sm">Judge Dashboard</div>
                       <div className="text-cyan-200 text-xs">Live Scoring</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-1 bg-slate-900/50 px-3 py-1 rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-slate-300 text-xs font-bold">Active Round</span>
                 </div>
              </div>

              <div className="space-y-4">
                 {/* Score Item 1 */}
                 <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          9.8
                       </div>
                       <div>
                          <div className="text-white text-sm font-semibold">Innovation</div>
                          <div className="text-slate-400 text-xs">Weighted 40%</div>
                       </div>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-400" />
                 </div>

                 {/* Score Item 2 */}
                 <div className="bg-slate-900/40 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          9.5
                       </div>
                       <div>
                          <div className="text-white text-sm font-semibold">Execution</div>
                          <div className="text-slate-400 text-xs">Weighted 30%</div>
                       </div>
                    </div>
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                 </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-end">
                 <div>
                    <div className="text-xs text-slate-400 mb-1">Total Score</div>
                    <div className="text-3xl font-bold text-white tracking-tight">96.5<span className="text-lg text-slate-500 font-normal">/100</span></div>
                 </div>
                 <button className="bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
                    Submit Score
                 </button>
              </div>
           </div>
         </motion.div>
         
         <div className="absolute bottom-12 text-center w-full">
            <p className="text-slate-400 text-sm italic">
              "The most intuitive judging experience on the market."
            </p>
         </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 sm:px-12 lg:px-20 xl:px-32 py-12 relative overflow-y-auto order-2">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-12">
           <button 
            onClick={() => navigate('/')} 
            className="flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium text-sm group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back
          </button>
          
          <div className="lg:hidden">
             <Logo size="lg" />
          </div>
        </div>

        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
           className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full"
        >
          {/* Logo - Desktop only */}
          <div className="hidden lg:block mb-10">
             <Logo size="2xl" />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 font-display tracking-tight">Welcome back</h1>
            <p className="text-slate-500 text-lg">Log in to manage your submissions and judging.</p>
          </div>

          {/* Social Auth */}
          <div className="mb-8">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all focus:ring-2 focus:ring-slate-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-slate-700"
            >
               <GoogleIcon />
               Continue with Google
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-400 font-medium">Or continue with email</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
             <div className="space-y-1.5">
               <label className="block text-sm font-semibold text-slate-700">Work Email</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Mail className="h-5 w-5 text-slate-400" />
                 </div>
                 <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed" 
                  placeholder="name@company.com" 
                  required
                 />
               </div>
             </div>
             
             <div className="space-y-1.5">
               <label className="block text-sm font-semibold text-slate-700">Password</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Lock className="h-5 w-5 text-slate-400" />
                 </div>
                 <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed" 
                  placeholder="Enter your password"
                  required
                 />
                 <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                 >
                   {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                 </button>
               </div>
             </div>

             <div className="flex items-center justify-end pt-2 pb-2">
                <div className="text-sm">
                  <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">Forgot password?</a>
                </div>
             </div>

             <button 
               type="submit" 
               disabled={isLoading}
               className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
             >
                {isLoading ? 'Signing in...' : 'Log In'}
             </button>
          </form>

           <p className="mt-8 text-center text-sm text-slate-500">
             Don't have an account? <button onClick={() => navigate('/signup')} className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Sign up</button>
           </p>
        </motion.div>
        
        <div className="mt-12 text-xs text-slate-400 text-center">
          &copy; {new Date().getFullYear()}
        </div>
      </div>

    </div>
  );
};