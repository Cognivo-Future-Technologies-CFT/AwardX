import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { UseCases } from './components/UseCases';
import { FeatureScroll } from './components/FeatureScroll';
import { Timeline } from './components/Timeline';
import { AnalyticsPreview } from './components/AnalyticsPreview';
import { Testimonials } from './components/Testimonials';
import { Pricing } from './components/Pricing';
import { Footer } from './components/Footer';
import { Button } from './components/Button';
import { motion, AnimatePresence } from 'framer-motion';

// Import New Pages & Components
import { FeaturesPage } from './components/pages/FeaturesPage';
import { HowItWorksPage } from './components/pages/HowItWorksPage';
import { StoriesPage } from './components/pages/StoriesPage';
import { PricingPage } from './components/pages/PricingPage';
import { SignupPage } from './components/pages/SignupPage';
import { LoginPage } from './components/pages/LoginPage';
import { ProductShowcase } from './components/ProductShowcase';
import { Dashboard } from './components/dashboard/Dashboard';
import { AuthCallback } from './components/AuthCallback';
import { WorkflowPage } from './components/pages/WorkflowPage';
import { auth } from './services/supabase';

const CTASection = () => (
  <section className="py-32 relative overflow-hidden bg-white">
    <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-slate-900 rounded-[3rem] p-12 md:p-24 relative overflow-hidden shadow-2xl shadow-indigo-900/20"
      >
        {/* Background Patterns */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* Branding Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[15rem] font-black text-white opacity-[0.03] select-none pointer-events-none font-display">
            AWARDX
        </div>
        
        <div className="relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight font-display">
            Ready to launch your <br/>awards program?
          </h2>
          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Join 2,000+ organizations using AwardX to celebrate excellence, manage entries, and grow their community.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button variant="white" size="lg" className="px-10 py-4 text-lg font-bold rounded-full">Get Started Free</Button>
            <Button variant="outline" size="lg" className="px-10 py-4 text-lg border-slate-600 text-slate-300 hover:text-white hover:border-white rounded-full">Contact Sales</Button>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(() => {
    // Check URL on initial load for workflow page
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'workflow') {
      return 'workflow';
    }
    return 'home';
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check auth state on mount and listen for changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session, error } = await auth.getSession();
        if (error) {
          console.error('Error checking auth:', error);
          setIsCheckingAuth(false);
          return;
        }
        if (session) {
          // User is authenticated, redirect to dashboard if on home/login/signup
          if (['home', 'login', 'signup'].includes(currentPage)) {
            setCurrentPage('dashboard');
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const authStateChangeResult = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setCurrentPage('dashboard');
      } else if (event === 'SIGNED_OUT') {
        setCurrentPage('home');
      }
    });

    // Only unsubscribe if we have a valid subscription
    const subscription = authStateChangeResult?.data?.subscription;
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const isCallback = window.location.hash.includes('access_token') || 
                       window.location.hash.includes('error');
    
    if (isCallback && currentPage === 'home') {
      setCurrentPage('auth-callback');
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'workflow':
        return <WorkflowPage />;
      case 'features':
        return <FeaturesPage />;
      case 'how-it-works':
        return <HowItWorksPage />;
      case 'stories':
        return <StoriesPage />;
      case 'pricing':
        return <PricingPage />;
      case 'demo':
      case 'dashboard':
        return <Dashboard onLogout={() => setCurrentPage('home')} />;
      case 'home':
      default:
        return (
          <>
            <Hero />
            <FeatureScroll />
            <ProductShowcase />
            <UseCases />
            <Features />
            <AnalyticsPreview />
            <Timeline />
            <Testimonials />
            <Pricing />
            <CTASection />
          </>
        );
    }
  };

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if Supabase is configured - show error if not
  const checkSupabaseConfig = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return !!(url && key);
  };

  if (!checkSupabaseConfig() && currentPage !== 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md mx-4 bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Configuration Required</h2>
          <p className="text-slate-600 mb-4">
            Supabase environment variables are not configured. Please create a <code className="bg-slate-100 px-2 py-1 rounded">.env</code> file with:
          </p>
          <div className="bg-slate-100 rounded-lg p-4 text-left text-sm font-mono mb-4">
            <div>VITE_SUPABASE_URL=...</div>
            <div>VITE_SUPABASE_ANON_KEY=...</div>
            <div>VITE_SITE_URL=...</div>
          </div>
          <button
            onClick={() => setCurrentPage('home')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Handle OAuth callback
  if (currentPage === 'auth-callback') {
    return (
      <AuthCallback
        onSuccess={() => {
          setCurrentPage('dashboard');
          // Clear hash from URL
          window.history.replaceState(null, '', window.location.pathname);
        }}
        onError={(error) => {
          console.error('Auth error:', error);
          setCurrentPage('login');
          // Clear hash from URL
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  if (currentPage === 'signup') {
    return <SignupPage onNavigate={setCurrentPage} />;
  }

  if (currentPage === 'login') {
    return <LoginPage onNavigate={setCurrentPage} />;
  }
  
  // Render Workflow page without Header/Footer wrapping
  if (currentPage === 'workflow') {
    return <WorkflowPage />;
  }

  // Render Demo/Dashboard without Header/Footer wrapping
  if (currentPage === 'demo' || currentPage === 'dashboard') {
    return (
      <Dashboard 
        onLogout={async () => {
          await auth.signOut();
          setCurrentPage('home');
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-500/30 selection:text-indigo-900">
      <Header onNavigate={setCurrentPage} currentPage={currentPage} />
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

export default App;