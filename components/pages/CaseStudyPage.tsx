import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, ExternalLink } from 'lucide-react';
import { Button } from '../Button';
import { getCaseStudyBySlug } from '@/lib/caseStudies';

export const CaseStudyPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const study = slug ? getCaseStudyBySlug(slug) : undefined;
  const [activeSection, setActiveSection] = useState(study?.sections[0]?.id ?? '');

  useEffect(() => {
    if (!study) return;

    const observers: IntersectionObserver[] = [];
    study.sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(section.id);
        },
        { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [study]);

  if (!study) {
    return <Navigate to="/stories" replace />;
  }

  const published = new Date(study.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="pt-24 pb-24 bg-[#faf9f7] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
        <Link
          to="/stories"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors tracking-wide"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to stories
        </Link>
      </div>

      {/* Editorial hero */}
      <header className="relative border-b border-slate-200/80 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(99,102,241,0.12),transparent)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="font-accent text-sm md:text-base text-indigo-700 italic mb-5">
              {study.subtitle}
            </p>
            <span className="inline-block px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500 mb-6">
              {study.industry}
            </span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.08] max-w-4xl">
              {study.title}
            </h1>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {published}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                {study.readTime}
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-medium text-slate-700">{study.author}</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
          >
            {study.stats.map((stat) => (
              <div key={stat.label} className="bg-white px-5 py-6 text-center">
                <div className="font-display text-2xl md:text-3xl font-bold text-slate-900 tabular-nums tracking-tight">
                  {stat.value}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-1.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12 xl:gap-20">
          {/* Table of contents */}
          <aside className="hidden lg:block">
            <nav className="sticky top-28">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 mb-4">
                Contents
              </p>
              <ul className="space-y-1 border-l border-slate-200">
                {study.sections.map((section, i) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={`block pl-4 py-2 text-sm border-l-2 -ml-px transition-colors ${
                        activeSection === section.id
                          ? 'border-indigo-600 text-indigo-700 font-semibold'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span className="font-accent text-xs text-slate-400 mr-2 not-italic">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Article */}
          <article className="min-w-0">
            <p className="font-accent text-xl md:text-2xl text-slate-700 leading-relaxed mb-14 pb-14 border-b border-slate-200">
              {study.description}
            </p>

            {study.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-28 mb-16 md:mb-20 pb-16 md:pb-20 border-b border-slate-200/80 last:border-0 last:pb-0"
              >
                <div className="flex items-baseline gap-4 mb-6">
                  <span className="font-accent text-3xl text-indigo-200 italic shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                    {section.heading}
                  </h2>
                </div>

                {section.paragraphs.map((p) => (
                  <p
                    key={p.slice(0, 56)}
                    className="text-[17px] text-slate-600 leading-[1.8] mb-5 font-sans"
                  >
                    {p}
                  </p>
                ))}

                {section.gapItems && (
                  <div className="mt-8 space-y-4">
                    {section.gapItems.map((gap, i) => (
                      <div
                        key={gap.title}
                        className="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm"
                      >
                        <h3 className="font-display text-lg font-bold text-slate-900 mb-2 flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold flex items-center justify-center shrink-0">
                            {i + 2}
                          </span>
                          {gap.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed pl-11">{gap.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {section.scenarios && (
                  <div className="mt-10 grid gap-5 md:grid-cols-1">
                    {section.scenarios.map((scenario) => (
                      <div
                        key={scenario.title}
                        className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-7 md:p-8 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-600">
                          {scenario.tag}
                        </span>
                        <h3 className="font-display text-xl font-bold text-slate-900 mt-2 mb-3">
                          {scenario.title}
                        </h3>
                        <p className="font-accent text-lg text-slate-600 italic leading-relaxed mb-5">
                          {scenario.description}
                        </p>
                        <ul className="space-y-2">
                          {scenario.requirements.map((req) => (
                            <li
                              key={req}
                              className="flex items-start gap-2.5 text-sm text-slate-700"
                            >
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {section.competitors && (
                  <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-5 py-4 text-left font-display font-semibold tracking-wide">
                            Player
                          </th>
                          <th className="px-5 py-4 text-left font-display font-semibold tracking-wide">
                            Positioning
                          </th>
                          <th className="px-5 py-4 text-left font-display font-semibold tracking-wide">
                            Strengths
                          </th>
                          <th className="px-5 py-4 text-left font-display font-semibold tracking-wide">
                            Likely gap
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {section.competitors.map((row, i) => (
                          <tr
                            key={row.player}
                            className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                          >
                            <td className="px-5 py-4 font-display font-semibold text-slate-900 whitespace-nowrap">
                              {row.player}
                            </td>
                            <td className="px-5 py-4 text-slate-600">{row.positioning}</td>
                            <td className="px-5 py-4 text-slate-600">{row.strengths}</td>
                            <td className="px-5 py-4 text-slate-600">{row.likelyGap}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}

            {/* Closing quote */}
            <blockquote className="mt-16 relative rounded-3xl bg-slate-900 text-white p-10 md:p-14 overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
              <span className="font-accent text-8xl text-white/10 absolute top-4 left-8 leading-none select-none">
                &ldquo;
              </span>
              <p className="relative font-accent text-xl md:text-2xl italic leading-relaxed text-slate-100 max-w-3xl">
                {study.quote}
              </p>
              <footer className="relative mt-8 pt-8 border-t border-white/10">
                <p className="font-display font-bold text-white">{study.author}</p>
                <p className="text-sm text-slate-400 mt-1">{study.authorRole}</p>
                <div className="flex flex-wrap gap-4 mt-4">
                  {study.authorLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-indigo-300 hover:text-white transition-colors"
                    >
                      {link.label}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>
              </footer>
            </blockquote>
          </article>
        </div>
      </div>

      <section className="py-12 text-center px-4 border-t border-slate-200 bg-white">
        <Link to="/stories">
          <Button variant="outline">Back to stories</Button>
        </Link>
      </section>
    </div>
  );
};
