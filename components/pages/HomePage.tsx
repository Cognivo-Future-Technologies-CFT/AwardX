import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Github, BookOpen, ArrowRight } from 'lucide-react';
import { Hero } from '../Hero';
import { FeatureScroll } from '../FeatureScroll';
import { ProductShowcase } from '../ProductShowcase';
import { UseCases } from '../UseCases';
import { Features } from '../Features';
import { AnalyticsPreview } from '../AnalyticsPreview';
import { Timeline } from '../Timeline';
import { Testimonials } from '../Testimonials';
import { OpenSourceShowcase } from '../OpenSourceShowcase';
import { StatStrip } from '../StatStrip';
import { ComparisonSection } from '../ComparisonSection';
import { LandingFAQ } from '../LandingFAQ';
import { Button } from '../Button';
import { Logo } from '../Logo';
import { GITHUB_REPO } from '@/lib/brand';

const CTASection = () => (
  <section className="py-32 relative overflow-hidden bg-white">
    <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="cta-glow-border bg-slate-900 rounded-[3rem] p-12 md:p-24 relative overflow-hidden shadow-2xl shadow-indigo-900/20"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/30 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none">
          <Logo size="watermark" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-xs font-bold tracking-widest uppercase mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Built in public on GitHub
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight font-display">
            Clone the repo. <br />Run your awards.
          </h2>
          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Vite frontend, Express API, Supabase backend &mdash; the whole stack lives in one repo.
            Read the docs first, then fork it.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 text-lg font-bold rounded-full bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-xl"
            >
              <Github className="w-5 h-5" /> View on GitHub
            </a>
            <Link to="/docs">
              <Button
                variant="outline"
                size="lg"
                className="px-10 py-4 text-lg border-slate-600 text-slate-300 hover:text-white hover:border-white rounded-full inline-flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5" /> Read the Docs
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export const HomePage: React.FC = () => {
  return (
    <>
      <Hero />
      <StatStrip />
      <FeatureScroll />
      <ComparisonSection />
      <ProductShowcase />
      <UseCases />
      <Features />
      <AnalyticsPreview />
      <Timeline />
      <Testimonials />
      <OpenSourceShowcase />
      <LandingFAQ />
      <CTASection />
    </>
  );
};
