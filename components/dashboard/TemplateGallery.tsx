import React from 'react';
import { Camera, Code, Mic2, Palette, Rocket, ArrowRight, Paintbrush, Building2, GraduationCap, Heart, Trophy } from 'lucide-react';

const templates = [
  {
    title: "Photography Awards",
    category: "Creative Arts",
    desc: "Pre-configured for high-res image uploads, gallery view judging, and technical metadata collection.",
    icon: Camera,
    color: "bg-rose-500",
    gradient: "from-rose-500 to-orange-500"
  },
  {
    title: "Startup Pitch Competition",
    category: "Business",
    desc: "Multi-stage workflow including deck upload, video pitch, and VC scorecard criteria.",
    icon: Rocket,
    color: "bg-blue-500",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    title: "Hackathon 2024",
    category: "Technology",
    desc: "GitHub integration ready. Includes team formation logic and code review parameters.",
    icon: Code,
    color: "bg-emerald-500",
    gradient: "from-emerald-500 to-teal-500"
  },
  {
    title: "Design Excellence",
    category: "Design",
    desc: "Perfect for UX/UI, Graphic, and Product design awards. Portfolio focused submission form.",
    icon: Palette,
    color: "bg-purple-500",
    gradient: "from-purple-500 to-indigo-500"
  },
  {
    title: "Employee Recognition",
    category: "Corporate",
    desc: "Internal awards template with peer nomination flow and value-based judging criteria.",
    icon: Building2,
    color: "bg-slate-700",
    gradient: "from-slate-700 to-slate-900"
  },
  {
    title: "Academic Grant",
    category: "Education",
    desc: "Rigorous research proposal submission flow with blind reviewing capabilities.",
    icon: GraduationCap,
    color: "bg-amber-500",
    gradient: "from-amber-500 to-orange-500"
  }
];

export const TemplateGallery: React.FC = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Program Templates</h1>
        <p className="text-slate-500">Launch a new competition in seconds with pre-built workflows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((template, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group cursor-pointer flex flex-col h-full">
            <div className={`h-32 bg-gradient-to-r ${template.gradient} relative overflow-hidden`}>
               <div className="absolute inset-0 bg-black/10"></div>
               <div className="absolute -bottom-6 -right-6 text-white/10 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                  <template.icon size={120} />
               </div>
               <div className="absolute top-6 left-6 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg">
                  <template.icon size={24} />
               </div>
            </div>
            
            <div className="p-6 flex flex-col flex-1">
               <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white ${template.color} bg-opacity-90`}>
                     {template.category}
                  </span>
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{template.title}</h3>
               <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">
                  {template.desc}
               </p>
               
               <button className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center justify-center gap-2">
                  Use Template <ArrowRight size={14} />
               </button>
            </div>
          </div>
        ))}
        
        {/* Custom Card */}
        <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-8 text-center hover:bg-slate-100 hover:border-slate-400 transition-colors cursor-pointer min-h-[300px]">
           <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4 text-slate-400">
              <Trophy size={32} />
           </div>
           <h3 className="text-lg font-bold text-slate-900 mb-2">Build from Scratch</h3>
           <p className="text-sm text-slate-500 max-w-xs">
              Start with a blank canvas and configure your custom workflow, forms, and rounds.
           </p>
        </div>
      </div>
    </div>
  );
};
