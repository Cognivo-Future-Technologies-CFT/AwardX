import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Testimonials } from '../Testimonials';
import { Button } from '../Button';
import { Film, GraduationCap, Building2, Palette, Heart, type LucideIcon } from 'lucide-react';
import { marketResearchCaseStudy, CASE_STUDY_SLUG } from '@/lib/caseStudies';

const UseCaseBlock = ({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-center">
    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
      <Icon className="w-6 h-6" />
    </div>
    <h4 className="font-bold text-slate-900 mb-2">{title}</h4>
    <p className="text-sm text-slate-500">{desc}</p>
  </div>
);

export const StoriesPage: React.FC = () => {
  const study = marketResearchCaseStudy;

  return (
    <div className="pt-24 pb-20 bg-slate-50 min-h-screen">
      <section className="text-center max-w-4xl mx-auto px-4 mb-20">
        <p className="font-accent text-lg text-indigo-700 italic mb-4">Industry research</p>
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 font-display tracking-tight">
          Stories from Our Community
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          How organizers and industry research shape the future of award management.
        </p>
      </section>

      {/* Featured case study — PDF market research */}
      <section className="max-w-7xl mx-auto px-4 mb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row group"
        >
          <div
            className={`lg:w-2/5 bg-gradient-to-br ${study.color} p-10 text-white flex flex-col justify-between relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold tracking-widest uppercase mb-4">
                {study.industry}
              </span>
              <h2 className="text-3xl font-bold font-display leading-tight">{study.title}</h2>
              <p className="mt-4 font-accent text-base text-white/85 italic leading-relaxed">
                {study.subtitle}
              </p>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-6">
              {study.stats.slice(0, 2).map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl md:text-3xl font-bold font-display tabular-nums">
                    {stat.value}
                  </div>
                  <div className="text-xs opacity-80 mt-1 leading-snug">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-3/5 p-10 flex flex-col justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4 font-display">Executive Summary</h3>
              <p className="text-slate-600 leading-relaxed mb-8">{study.description}</p>

              <div className="bg-white p-6 rounded-2xl border border-indigo-50 shadow-sm relative">
                <span className="font-accent text-6xl absolute top-2 left-4 text-indigo-100 leading-none select-none">
                  &ldquo;
                </span>
                <p className="font-accent text-slate-700 italic relative z-10 pl-4 text-lg leading-relaxed">
                  {study.quote}
                </p>
                <div className="mt-5 pl-4 border-t border-slate-100 pt-4">
                  <div className="text-sm font-bold text-slate-900 font-display">{study.author}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{study.authorRole}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Link to={`/stories/${CASE_STUDY_SLUG}`}>
                <Button variant="outline" size="sm">
                  Read Full Case Study
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="max-w-5xl mx-auto px-4 mb-32">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12 font-display">
          Trusted across every sector
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <UseCaseBlock icon={Film} title="Film Festivals" desc="Screener links & time-coded comments" />
          <UseCaseBlock icon={GraduationCap} title="Grants" desc="Financial aid & research proposals" />
          <UseCaseBlock icon={Building2} title="Corporate" desc="Internal awards & innovation hacks" />
          <UseCaseBlock icon={Palette} title="Creative" desc="Design, photo & art portfolios" />
          <UseCaseBlock icon={Heart} title="Non-Profit" desc="Fundraising & community impact" />
        </div>
      </section>

      <div className="bg-white py-12 rounded-3xl mx-4 shadow-sm border border-slate-100">
        <Testimonials />
      </div>

      <section className="py-20 text-center px-4">
        <h2 className="text-3xl font-bold text-slate-900 mb-4 font-display">Want your program featured here?</h2>
        <p className="text-slate-500 mb-8">Join the community of world-class organizers.</p>
        <Button variant="outline">Contact Us</Button>
      </section>
    </div>
  );
};
