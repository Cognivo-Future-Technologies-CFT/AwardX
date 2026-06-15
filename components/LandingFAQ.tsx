import React, { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GITHUB_REPO } from '@/lib/brand';

const faqs = [
  {
    q: 'Is this actually open source?',
    a: 'Yes. The full stack — Vite frontend, Express API, and Supabase migrations — lives in one public GitHub repo under AGPL-3.0. You can fork it, self-host it, and read every line of authorization logic.',
  },
  {
    q: 'What do I need to self-host?',
    a: 'A Supabase project (Postgres + Auth + Storage), a Node 20+ host for the Express API, and any static host for the Vite build. Resend, Razorpay, and Didit are optional integrations you wire up in Settings.',
  },
  {
    q: 'How is this different from Typeform + a spreadsheet?',
    a: 'Forms are only the first step. AwardX connects entries to multi-round judging, judge token links, public voting, paid submissions, email campaigns, and a public program microsite — all sharing the same database and audit log.',
  },
  {
    q: 'Can I run hackathons, grants, and fellowships — not just awards?',
    a: 'Absolutely. The platform supports any program with structured intake, review rounds, and outcomes. The landing page headline rotates through awards, hackathons, grants, competitions, and fellowships for a reason.',
  },
  {
    q: 'Where does authorization happen?',
    a: 'In two places by design: Postgres RLS for direct client reads, and Express middleware for privileged mutations. The service-role key never ships to the browser.',
  },
];

export const LandingFAQ: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section ref={ref} className="py-28 bg-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-50/60 to-transparent pointer-events-none" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-indigo-600 text-xs font-bold tracking-widest uppercase mb-6"
          >
            <HelpCircle className="w-3.5 h-3.5" /> FAQ
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="text-4xl md:text-5xl font-bold text-slate-900 font-display tracking-tight mb-4"
          >
            Questions before you fork?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.08 }}
            className="text-slate-600"
          >
            Or read the full setup guide in{' '}
            <Link to="/docs" className="text-indigo-600 font-semibold hover:text-indigo-700">
              the docs
            </Link>
            {' '}and browse{' '}
            <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:text-indigo-700">
              the repo
            </a>
            .
          </motion.p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.1 + i * 0.05 }}
                className={`rounded-2xl border transition-colors ${
                  isOpen ? 'border-indigo-200 bg-indigo-50/40 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-slate-900 text-sm md:text-base pr-2">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
