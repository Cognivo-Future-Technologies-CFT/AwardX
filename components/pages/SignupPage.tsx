import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Check, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { auth } from '../../services/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import { sanitizeRedirectPath, storePostAuthRedirect } from '../../lib/safeRedirect';
import { Logo } from '../Logo';

function humanizeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('user already registered') || m.includes('already exists')) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (m.includes('password') && (m.includes('weak') || m.includes('short') || m.includes('characters'))) {
    return "Please choose a stronger password — at least 8 characters with a mix of letters and numbers.";
  }
  if (m.includes('email') && m.includes('invalid')) {
    return "Please enter a valid email address.";
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


export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const nextPath = sanitizeRedirectPath(params.get('next'), '');

  React.useEffect(() => {
    const teamInviteToken = params.get('teamInviteToken');
    if (teamInviteToken) {
      navigate(`/team-invite/${teamInviteToken}`, { replace: true });
    }
  }, [navigate, params]);
  const [showPassword, setShowPassword] = React.useState(false);
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleSignup = async () => {
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
      // If successful, redirect will happen via OAuth callback
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with Google');
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
       if (nextPath) {
        storePostAuthRedirect(nextPath);
      }
      const { error: authError } = await auth.signUp(email, password, { full_name: fullName });
      if (authError) {
        setError(humanizeAuthError(authError.message));
        setIsLoading(false);
      } else {
        // Successfully signed up
        navigate(nextPath || '/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col px-6 sm:px-12 lg:px-20 xl:px-32 py-12 relative overflow-y-auto">
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
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 font-display tracking-tight">Create your account</h1>
            <p className="text-slate-500 text-lg">Join 2,000+ organizations running world-class awards.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Social Auth */}
          <div className="mb-8">
            <button
              onClick={handleGoogleSignup}
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

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSignup}>
             <div className="space-y-1.5">
               <label className="block text-sm font-semibold text-slate-700">Full Name</label>
               <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <User className="h-5 w-5 text-slate-400" />
                 </div>
                 <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed" 
                  placeholder="Sarah Jenkins" 
                 />
               </div>
             </div>
             
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
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed" 
                  placeholder="sarah@company.com" 
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
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed" 
                  placeholder="Create a strong password" 
                 />
                 <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                 >
                   {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                 </button>
               </div>
               {(() => {
                 const score = (() => {
                   if (!password) return 0;
                   let s = 0;
                   if (password.length >= 8) s++;
                   if (password.length >= 12) s++;
                   if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
                   if (/\d/.test(password)) s++;
                   if (/[^A-Za-z0-9]/.test(password)) s++;
                   return Math.min(s, 4);
                 })();
                 const labels = ['', 'Very weak', 'Weak', 'Medium', 'Strong'];
                 const colors = ['bg-slate-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
                 const textColors = ['text-slate-500', 'text-red-600', 'text-orange-600', 'text-yellow-600', 'text-green-600'];
                 return (
                   <>
                     <div className="flex gap-2 mt-2">
                       {[0, 1, 2, 3].map((i) => (
                         <div
                           key={i}
                           className={`h-1 flex-1 rounded-full ${i < score ? colors[score] : 'bg-slate-200'}`}
                         ></div>
                       ))}
                     </div>
                     <p className={`text-xs ${textColors[score]}`}>
                       {password ? `${labels[score]} strength` : 'Enter a password'}
                     </p>
                   </>
                 );
               })()}
             </div>

             <div className="flex items-center pt-2 pb-2">
                <input id="terms" type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
                <label htmlFor="terms" className="ml-2 block text-sm text-slate-600">
                  I agree to the <a href="#" className="text-indigo-600 hover:text-indigo-700 font-semibold">Terms</a> and <a href="#" className="text-indigo-600 hover:text-indigo-700 font-semibold">Privacy Policy</a>
                </label>
             </div>

             <button 
               type="submit" 
               disabled={isLoading}
               className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
             >
                {isLoading ? 'Creating account...' : 'Create Account'}
             </button>
          </form>

           <p className="mt-8 text-center text-sm text-slate-500">
             Already have an account? <button onClick={() => navigate(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login')} className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Log in</button>
           </p>
        </motion.div>
        
        <div className="mt-12 text-xs text-slate-400 text-center">
          &copy; {new Date().getFullYear()}
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
         {/* Abstract Background */}
         <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-indigo-500/20 to-purple-500/20 rounded-full blur-[120px] mix-blend-screen -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-cyan-500/10 to-blue-500/10 rounded-full blur-[100px] mix-blend-screen translate-y-1/3 -translate-x-1/3"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
         </div>

         {/* Floating Card Showcase */}
         <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2, duration: 0.6 }}
           className="relative z-10 w-full max-w-md"
         >
           {/* Glassmorphic Card */}
           <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"></div>
              
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-indigo-400 overflow-hidden">
                       <Logo size="xs" />
                    </div>
                    <div>
                       <div className="text-white font-bold text-sm">Assistant</div>
                       <div className="text-indigo-200 text-xs">Just now</div>
                    </div>
                 </div>
                 <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-300 text-xs font-bold">
                    Shortlisted
                 </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2 leading-tight">
                 Submission Successful! <span className="inline-block animate-bounce">🎉</span>
              </h3>
              <p className="text-slate-300 mb-6 text-sm leading-relaxed">
                 Your entry for <span className="text-white font-semibold">"Digital Innovation Awards 2024"</span> has been received and automatically categorized.
              </p>

              <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex items-center gap-4">
                 <div className="w-12 h-12 bg-white rounded-lg flex-shrink-0 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-indigo-500/20 group-hover:bg-transparent transition-colors"></div>
                    <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80" alt="Thumbnail" className="object-cover w-full h-full" />
                 </div>
                 <div>
                    <div className="text-white text-sm font-semibold mb-1">Project_Alpha_v2.pdf</div>
                    <div className="text-slate-400 text-xs">12.5 MB • Uploaded via API</div>
                 </div>
                 <div className="ml-auto">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                       <Check className="w-3 h-3 text-white" />
                    </div>
                 </div>
              </div>
           </div>

           {/* Floating Decor Elements */}
           <motion.div 
             animate={{ y: [0, -10, 0] }}
             transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
             className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl shadow-black/20"
           >
              <div className="flex items-center gap-3">
                 <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                       <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                         <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                       </div>
                    ))}
                 </div>
                 <div className="text-xs font-bold text-slate-900">3 Judges Viewing</div>
              </div>
           </motion.div>
         </motion.div>
         
         <div className="absolute bottom-12 text-center">
            <p className="text-slate-400 text-sm max-w-sm mx-auto italic">
              "This platform transformed how we handle our 5,000+ yearly submissions. It's simply beautiful."
            </p>
            <p className="text-slate-500 text-xs mt-3 font-bold uppercase tracking-widest">Global Design Awards</p>
         </div>
      </div>
    </div>
  );
};
