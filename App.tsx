
import React, { useState } from 'react';
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[15rem] font-black text-white opacity-[0.03] select-none pointer-events-none">
            NOMIFY
        </div>
        
        <div className="relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight font-display">
            Ready to launch your <br/>awards program?
          </h2>
          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Join 2,000+ organizations using Nomify to celebrate excellence, manage entries, and grow their community.
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
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
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

  if (currentPage === 'signup') {
    return <SignupPage onNavigate={setCurrentPage} />;
  }

  if (currentPage === 'login') {
    return <LoginPage onNavigate={setCurrentPage} />;
  }
  
  // Render Demo/Dashboard without Header/Footer wrapping
  if (currentPage === 'demo' || currentPage === 'dashboard') {
     return <Dashboard onLogout={() => setCurrentPage('home')} />;
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
