import React from 'react';
import { ClipboardList, Gavel, Award, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  {
    id: 1,
    title: "Setup & Launch",
    description: "Build your custom form, define categories, and set up entry fees in minutes.",
    icon: ClipboardList
  },
  {
    id: 2,
    title: "Accept Submissions",
    description: "Entrants upload images, videos, and PDFs via a seamless, mobile-optimized portal.",
    icon: Share2
  },
  {
    id: 3,
    title: "Review & Judge",
    description: "Assign judges to specific categories. They score entries privately on any device.",
    icon: Gavel
  },
  {
    id: 4,
    title: "Announce & Celebrate",
    description: "Showcase winners with auto-generated galleries and instant social sharing.",
    icon: Award
  }
];

export const Timeline: React.FC = () => {
  return (
    <section id="how-it-works" className="py-32 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 font-display">How AwardX Works</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">From concept to ceremony, our platform handles the complexity.</p>
        </div>

        <div className="relative">
          {/* Connector Line */}
          <div className="hidden lg:block absolute top-12 left-0 w-full h-0.5 bg-slate-200"></div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-8">
            {steps.map((step, index) => (
              <motion.div 
                key={index} 
                className="relative group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                {/* Mobile Connector */}
                {index !== steps.length - 1 && (
                  <div className="lg:hidden absolute top-24 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-slate-200"></div>
                )}

                {/* Icon Wrapper */}
                <div className="relative flex items-center justify-center w-24 h-24 mx-auto bg-white border-4 border-slate-50 rounded-full z-10 mb-8 shadow-xl shadow-slate-200/50 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-8 h-8 text-indigo-600" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-white">
                    {step.id}
                  </div>
                </div>

                <div className="text-center px-4">
                  <h3 className="text-xl font-bold text-slate-900 mb-3 font-display">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};