import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Database, Server, Layers, Scale, GitBranch } from 'lucide-react';

const items = [
  { icon: Database, label: 'SQL migrations', value: '30+' },
  { icon: Server, label: 'API routers', value: '19' },
  { icon: Layers, label: 'Dashboard views', value: '39' },
  { icon: GitBranch, label: 'Round types', value: '5' },
  { icon: Scale, label: 'License', value: 'AGPL-3.0' },
];

export const StatStrip: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <section ref={ref} className="relative -mt-6 pb-4 z-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-2xl shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)] overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.08 + i * 0.05, duration: 0.4 }}
                  className="flex flex-col items-center justify-center gap-1.5 px-4 py-5 text-center group hover:bg-slate-50/80 transition-colors"
                >
                  <Icon className="w-4 h-4 text-indigo-500/80 group-hover:text-indigo-600 transition-colors" />
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 font-display tabular-nums tracking-tight">
                    {item.value}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
