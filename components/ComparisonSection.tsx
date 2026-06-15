import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  X,
  Check,
  FileSpreadsheet,
  Mail,
  CreditCard,
  Gavel,
  LayoutTemplate,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const fragmented = [
  { icon: LayoutTemplate, label: 'Typeform / Google Forms', pain: 'Entry intake only' },
  { icon: FileSpreadsheet, label: 'Sheets + Airtable', pain: 'Manual tracking' },
  { icon: Gavel, label: 'Jury portal add-on', pain: 'Separate login' },
  { icon: Mail, label: 'Mailchimp / Resend', pain: 'Disconnected campaigns' },
  { icon: CreditCard, label: 'Stripe checkout link', pain: 'No program context' },
];

const unified = [
  'One entry form tied to categories & rounds',
  'Submissions table with bulk advance & export',
  'Judge portal via signed token link',
  'Reach campaigns with merge tags',
  'Razorpay entry fees in the same flow',
  'Public program page & voting at /program/:slug',
];

export const ComparisonSection: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="py-28 relative overflow-hidden bg-gradient-to-b from-white via-slate-50/80 to-white">
      <div className="absolute inset-0 grid-bg-light opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-r from-rose-100/30 via-indigo-100/40 to-emerald-100/30 blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.span
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-rose-600 text-xs font-bold tracking-widest uppercase mb-6 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Why one workspace wins
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            className="text-4xl md:text-5xl font-bold text-slate-900 font-display tracking-tight mb-5"
          >
            Five tools stitched together{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">
              vs. one repo
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.08 }}
            className="text-lg text-slate-600"
          >
            Most award programs duct-tape forms, spreadsheets, email, and payments.
            AwardX ships the full pipeline in a single codebase you can audit.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* Fragmented stack */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="relative rounded-3xl border border-rose-200/80 bg-gradient-to-br from-rose-50/80 to-orange-50/50 p-7 md:p-8 overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest text-rose-500/80 px-2.5 py-1 rounded-full bg-rose-100/80 border border-rose-200">
              Typical stack
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-6 font-display">The patchwork approach</h3>
            <ul className="space-y-3">
              {fragmented.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.li
                    key={item.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.2 + i * 0.06 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/70 border border-rose-100 shadow-sm"
                  >
                    <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{item.label}</div>
                      <div className="text-xs text-rose-600/80">{item.pain}</div>
                    </div>
                    <X className="w-4 h-4 text-rose-400 shrink-0" />
                  </motion.li>
                );
              })}
            </ul>
            <p className="mt-6 text-sm text-slate-500 border-t border-rose-100 pt-5">
              Data lives in five places. Rounds don&apos;t sync. Judges get lost emails.
            </p>
          </motion.div>

          {/* Unified */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="relative rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-7 md:p-8 overflow-hidden shadow-2xl shadow-indigo-900/20"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest text-emerald-300 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30">
              AwardX
            </div>
            <h3 className="relative text-xl font-bold text-white mb-6 font-display">End-to-end in one workspace</h3>
            <ul className="relative space-y-2.5">
              {unified.map((line, i) => (
                <motion.li
                  key={line}
                  initial={{ opacity: 0, x: 12 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.28 + i * 0.05 }}
                  className="flex items-start gap-2.5 text-sm text-slate-200"
                >
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </span>
                  <span>{line}</span>
                </motion.li>
              ))}
            </ul>
            <div className="relative mt-8 pt-5 border-t border-white/10 flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <ArrowRight className="w-4 h-4" />
              Clone once. Run every program season.
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
