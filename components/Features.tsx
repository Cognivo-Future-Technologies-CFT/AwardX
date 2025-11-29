import React from 'react';
import { 
  Trophy, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Zap,
  Globe,
  Wand2,
} from 'lucide-react';
import { motion } from 'framer-motion';

const FeatureCard = ({ title, description, icon: Icon, className = "", delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className={`bg-white hover:bg-slate-50 p-8 rounded-3xl border border-slate-200 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-900/5 hover:border-indigo-100 group relative overflow-hidden ${className}`}
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-md transition-all duration-300 group-hover:border-indigo-200">
        <Icon className="w-6 h-6 text-indigo-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3 font-display">{title}</h3>
      <p className="text-slate-600 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  </motion.div>
);

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-indigo-600 font-bold tracking-wider text-xs uppercase mb-3 block"
          >
            Powered by AwardX OS
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 tracking-tight font-display"
          >
            Everything you need for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">world-class competitions</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
          {/* Bento Grid Layout */}
          
          {/* Large Card 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-2 bg-slate-900 rounded-3xl p-10 relative overflow-hidden group text-white"
          >
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full"></div>
             
             {/* Watermark */}
             <div className="absolute top-6 right-6 text-white/5 font-bold text-xl tracking-widest uppercase font-display">AwardX Engine</div>

             <div className="relative z-10 flex flex-col md:flex-row items-start gap-8 h-full">
               <div className="flex-1">
                 <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                   <Trophy className="w-6 h-6 text-indigo-300" />
                 </div>
                 <h3 className="text-2xl font-bold mb-4 font-display">Multi-round Judging</h3>
                 <p className="text-slate-300 text-lg leading-relaxed">
                   Create complex judging pipelines with weighted criteria, recusal management, and automatic scoring aggregation.
                 </p>
               </div>
               
               <div className="w-full md:w-1/2 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm self-center transform translate-y-4 md:translate-y-0 group-hover:-translate-y-2 transition-transform duration-500 shadow-2xl">
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold">J{i}</div>
                           <div className="h-2 w-16 bg-white/20 rounded"></div>
                        </div>
                        <div className="text-xs font-mono text-indigo-300">9.{i}/10</div>
                      </div>
                    ))}
                  </div>
               </div>
             </div>
          </motion.div>

          <FeatureCard 
            title="Smart CRM" 
            description="Manage nominees, judges, and partners in one unified place with detailed profiles."
            icon={Users}
            delay={0.1}
          />

          <FeatureCard 
            title="WhatsApp Ads" 
            description="Automate entry reminders and announcements directly on WhatsApp."
            icon={MessageSquare}
            delay={0.2}
          />

          <FeatureCard 
            title="Deep Analytics" 
            description="Real-time dashboards for demographics and performance metrics."
            icon={BarChart3}
            delay={0.3}
          />

          <FeatureCard 
            title="Automation" 
            description="Trigger webhooks and emails based on submission status."
            icon={Zap}
            delay={0.4}
          />

           {/* Large Card 2 */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-10 border border-indigo-100 relative overflow-hidden group"
           >
             <div className="flex flex-col md:flex-row-reverse items-center gap-8 h-full">
               <div className="flex-1">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
                   <Wand2 className="w-6 h-6" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 mb-4 font-display">AI-Powered Portfolios</h3>
                 <p className="text-slate-600 text-lg leading-relaxed">
                   Automatically generate stunning, SEO-optimized public portfolio pages for your nominees with one click.
                 </p>
               </div>
               <div className="w-full md:w-1/2 perspective-1000">
                  <div className="bg-white rounded-xl shadow-xl shadow-indigo-100 border border-slate-200 p-4 transform rotate-y-12 rotate-x-6 group-hover:rotate-0 transition-transform duration-700">
                    <div className="flex gap-4 mb-4">
                      <div className="w-1/3 h-24 bg-slate-100 rounded-lg animate-pulse"></div>
                      <div className="w-2/3 space-y-2">
                        <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                        <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
                        <div className="mt-4 flex gap-2">
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-1 rounded">AwardX Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>
             </div>
          </motion.div>

          <FeatureCard 
            title="Social Login" 
            description="One-click login via Google, Facebook, LinkedIn."
            icon={Globe}
            delay={0.5}
          />
        </div>
      </div>
    </section>
  );
};