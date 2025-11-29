import React from 'react';
import { Testimonial } from '../types';
import { Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const testimonials: Testimonial[] = [
  {
    name: "Sarah Jenkins",
    role: "Director of Awards",
    company: "Design Institute",
    content: "AwardX cut our administrative time by 70%. The WhatsApp integration for notifying nominees was a game changer for our engagement rates.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
  },
  {
    name: "David Chen",
    role: "Event Manager",
    company: "TechGlobal Summit",
    content: "The judging interface is incredibly intuitive. Our 50+ international judges required zero training to get started. Highly recommended.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
  },
  {
    name: "Elena Rodriguez",
    role: "Marketing Lead",
    company: "Creative Arts Council",
    content: "We switched from a custom solution to AwardX. The portfolio generation feature gave our winners valuable exposure we couldn't offer before.",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
  }
];

export const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-32 bg-white relative">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 -skew-x-12 z-0 opacity-50"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-slate-900 mb-20 font-display">
          Trusted by leading <span className="text-indigo-600">organizations</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative"
            >
              <div className="absolute top-6 right-8 text-indigo-100">
                <Quote className="w-12 h-12 fill-current" />
              </div>
              
              <div className="flex items-center mb-6 relative z-10">
                <img 
                  src={t.avatar} 
                  alt={t.name} 
                  className="w-14 h-14 rounded-full border-2 border-white shadow-md mr-4 object-cover"
                />
                <div>
                  <h4 className="text-slate-900 font-bold font-display">{t.name}</h4>
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">{t.company}</p>
                </div>
              </div>
              <p className="text-slate-600 italic leading-relaxed relative z-10">"{t.content}"</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};