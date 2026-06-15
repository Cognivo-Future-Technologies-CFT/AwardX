import React from 'react';
import { Testimonial } from '../types';
import { Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const trustedOrganizations = [
  {
    name: 'Global Tamil Awards',
    logo: '/partners/global-tamil-awards.png',
    logoClassName: 'h-14 md:h-16 w-auto object-contain',
  },
  {
    name: 'THE RISE',
    logo: null,
    textMark: (
      <span className="inline-flex flex-col items-start leading-none">
        <span className="text-[10px] font-semibold tracking-[0.35em] text-amber-600/90 uppercase">The</span>
        <span className="text-xl md:text-2xl font-black tracking-[0.08em] text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600">
          RISE
        </span>
      </span>
    ),
  },
  { name: 'Design Institute', textMark: <span className="text-sm md:text-base font-bold text-slate-700">Design Institute</span> },
  { name: 'TechGlobal Summit', textMark: <span className="text-sm md:text-base font-bold text-slate-700">TechGlobal Summit</span> },
  { name: 'Creative Arts Council', textMark: <span className="text-sm md:text-base font-bold text-slate-700">Creative Arts Council</span> },
];

const testimonials: Testimonial[] = [
  {
    name: 'Dr. K. Venkatesh',
    role: 'Program Director',
    company: 'Global Tamil Awards · THE RISE',
    content:
      'Global Tamil Awards moved off legacy award software that was costing us six times more for half the capability. We cut total program cost by one-sixth while running a larger cycle with faster judging, cleaner submissions, and a public voting stage that outperformed every vendor we evaluated.',
    avatar: '',
  },
  {
    name: 'Sarah Jenkins',
    role: 'Director of Awards',
    company: 'Design Institute',
    content:
      'This platform cut our administrative time by 70%. The WhatsApp integration for notifying nominees was a game changer for our engagement rates.',
    avatar: '',
  },
  {
    name: 'David Chen',
    role: 'Event Manager',
    company: 'TechGlobal Summit',
    content:
      'The judging interface is incredibly intuitive. Our 50+ international judges required zero training to get started. Highly recommended.',
    avatar: '',
  },
];

export const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-32 bg-white relative">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 -skew-x-12 z-0 opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-slate-900 mb-6 font-display">
          Trusted by leading <span className="text-indigo-600">organizations</span>
        </h2>
        <p className="text-center text-slate-500 max-w-2xl mx-auto mb-14">
          From global cultural awards to corporate innovation programs — organizers run high-stakes cycles on the platform every season.
        </p>

        <div className="mb-20 rounded-3xl border border-slate-100 bg-slate-50/80 px-6 py-8 md:px-10 overflow-hidden">
          <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-400 mb-8">
            Trusted by organizations worldwide
          </p>
          <div className="relative pause-on-hover">
            <div className="flex animate-scroll-marquee gap-x-14 md:gap-x-20 w-max">
              {[...trustedOrganizations, ...trustedOrganizations].map((org, idx) => (
                <div
                  key={`${org.name}-${idx}`}
                  className="flex items-center justify-center min-h-[4rem] min-w-[140px] opacity-90 hover:opacity-100 transition-opacity shrink-0"
                  title={org.name}
                >
                  {org.logo ? (
                    <img src={org.logo} alt={org.name} className={org.logoClassName} draggable={false} />
                  ) : (
                    org.textMark
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 via-transparent to-purple-50/0 group-hover:from-indigo-50/60 group-hover:to-purple-50/40 transition-colors duration-500 pointer-events-none" />
              <div className="absolute top-6 right-8 text-indigo-100">
                <Quote className="w-12 h-12 fill-current" />
              </div>

              <div className="flex items-center mb-6 relative z-10">
                {t.avatar ? (
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-14 h-14 rounded-full border-2 border-white shadow-md mr-4 object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-white shadow-md mr-4 bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-slate-900 font-bold font-display">{t.name}</h4>
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">{t.company}</p>
                </div>
              </div>
              <p className="text-slate-600 italic leading-relaxed relative z-10">&ldquo;{t.content}&rdquo;</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
