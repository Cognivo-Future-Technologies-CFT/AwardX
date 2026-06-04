import React from 'react';
import { motion } from 'framer-motion';
import { Folder, Upload, Users, Globe, Layout, ArrowRight, MessageSquare, Plus, FileText, Check } from 'lucide-react';

export const ProductShowcase: React.FC = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 font-display max-w-2xl">
            The <span className="text-indigo-600">complete platform</span> for award excellence
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl">
            Unlock seamless workflows with the world's most trusted platform for creating and distributing awards at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,auto)]">
          
          {/* Card 1: Large Blue (Span 3) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-3 bg-sky-100 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden group min-h-[400px]"
          >
             <div className="relative z-10 max-w-lg">
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 font-display">
                  Transform entries to galleries instantly
                </h3>
                <p className="text-slate-700 mb-8 text-lg">
                  Turn static submissions into exceptional interactive public showcases with just a few clicks.
                </p>
                <button className="text-slate-900 font-bold underline decoration-2 decoration-slate-900/30 hover:decoration-slate-900 transition-all">
                  Discover galleries
                </button>
             </div>

             {/* UI Mockup */}
             <div className="mt-8 md:mt-0 md:absolute md:top-12 md:right-12 w-full md:w-[600px]">
                <div className="bg-white rounded-2xl shadow-xl shadow-sky-900/10 p-6 transform group-hover:scale-[1.02] transition-transform duration-500">
                    {/* Drag Drop Area */}
                    <div className="border-2 border-dashed border-sky-200 rounded-xl bg-sky-50/50 h-64 flex flex-col items-center justify-center relative">
                        <div className="absolute top-4 left-4 flex gap-2">
                           <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 transform -rotate-6">
                              <FileText className="w-5 h-5 text-red-400" />
                           </div>
                           <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 transform rotate-3">
                              <div className="w-5 h-5 bg-blue-400 rounded-sm"></div>
                           </div>
                        </div>

                        <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4 text-sky-600">
                           <Folder className="w-8 h-8 fill-current" />
                        </div>
                        <p className="text-slate-500 font-medium">Drag & drop source materials or choose file</p>
                    </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute -left-8 top-1/2 bg-white p-4 rounded-xl shadow-lg border border-slate-100 max-w-[200px] hidden md:block animate-float">
                   <div className="text-xs font-bold text-slate-400 uppercase mb-2">Portfolio Template</div>
                   <div className="h-2 w-full bg-slate-100 rounded mb-2"></div>
                   <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
                </div>
             </div>
          </motion.div>

          {/* Card 2: Purple (Span 1) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-violet-100 rounded-[2.5rem] p-8 flex flex-col justify-between overflow-hidden group min-h-[400px]"
          >
             <div className="relative h-48 w-full mb-6">
                 {/* UI Mockup: Avatars/Comments */}
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg w-full max-w-[280px] border border-white/50 transform group-hover:-translate-y-2 transition-transform duration-500">
                       <div className="flex -space-x-2 mb-4 justify-center">
                          {[1,2,3,4].map(i => (
                             <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                             </div>
                          ))}
                          <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-900 text-white flex items-center justify-center text-xs font-bold">+2</div>
                       </div>
                       <button className="w-full bg-white border border-slate-200 rounded-full py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 flex items-center justify-center">
                          Request Review
                       </button>
                    </div>
                 </div>
             </div>

             <div>
               <h3 className="text-2xl font-bold text-slate-900 mb-3 font-display">Work better, together</h3>
               <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                 Request, review, and resolve judge feedback throughout your award cycle—all in one place.
               </p>
               <button className="text-slate-900 font-bold text-sm underline decoration-2 decoration-slate-900/30 hover:decoration-slate-900 transition-all">
                 Discover collaboration
               </button>
             </div>
          </motion.div>

          {/* Card 3: Green (Span 1) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-emerald-100 rounded-[2.5rem] p-8 flex flex-col justify-between overflow-hidden group min-h-[400px]"
          >
             <div className="relative h-48 w-full mb-6 flex items-center justify-center">
                 {/* UI Mockup: Workflow Menu */}
                 <div className="bg-white rounded-xl shadow-xl shadow-emerald-900/5 p-4 w-64 transform rotate-2 group-hover:rotate-0 transition-transform duration-500">
                    <div className="space-y-2">
                       <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <div className="flex items-center gap-3">
                             <FileText className="w-4 h-4 text-slate-400" />
                             <span className="text-sm font-semibold text-slate-700">LMS Export</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                       </div>
                       <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <div className="flex items-center gap-3">
                             <Globe className="w-4 h-4 text-slate-400" />
                             <span className="text-sm font-semibold text-slate-700">Web</span>
                          </div>
                          <Layout className="w-4 h-4 text-slate-400" />
                       </div>
                    </div>
                 </div>
             </div>

             <div>
               <h3 className="text-2xl font-bold text-slate-900 mb-3 font-display">Cut delays out of delivery</h3>
               <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                 Share and track judging results without toggling between tools or managing complex integrations.
               </p>
               <button className="text-slate-900 font-bold text-sm underline decoration-2 decoration-slate-900/30 hover:decoration-slate-900 transition-all">
                 Discover distribution
               </button>
             </div>
          </motion.div>

          {/* Card 4: Orange (Span 1) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-orange-100 rounded-[2.5rem] p-8 flex flex-col justify-between overflow-hidden group min-h-[400px]"
          >
             <div className="relative h-48 w-full mb-6 flex items-center justify-center">
                 {/* UI Mockup: Language Selector */}
                 <div className="bg-white rounded-xl shadow-xl shadow-orange-900/5 w-64 overflow-hidden transform group-hover:scale-105 transition-transform duration-500">
                    <div className="p-3 border-b border-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wide">Source Language</div>
                    <div className="p-3 bg-sky-50 flex items-center gap-3">
                        <span className="bg-black text-white text-[10px] font-bold px-1 rounded">EN</span>
                        <span className="text-sm font-semibold text-slate-900">English</span>
                    </div>
                    <div className="p-3 border-b border-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wide mt-2">Translations</div>
                    <div className="p-2 space-y-1">
                        <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                           <span className="text-sm text-slate-700">Arabic</span>
                           <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">19</span>
                        </div>
                        <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded">
                           <span className="text-sm text-slate-700">Chinese (Simplified)</span>
                           <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">42</span>
                        </div>
                    </div>
                 </div>
             </div>

             <div>
               <h3 className="text-2xl font-bold text-slate-900 mb-3 font-display">Scale across language and location</h3>
               <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                 Translate your award portal into 80+ languages for effortless global distribution.
               </p>
               <button className="text-slate-900 font-bold text-sm underline decoration-2 decoration-slate-900/30 hover:decoration-slate-900 transition-all">
                 Discover scale
               </button>
             </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};