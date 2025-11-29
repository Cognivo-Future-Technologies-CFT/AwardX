import React, { useRef } from 'react';
import { Camera, Code, Mic2, Palette, Rocket, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './Button';

const cases = [
  {
    title: "Design Awards",
    category: "Visual Arts",
    description: "Handle high-res image uploads (RAW, TIFF) and visual portfolios with zero compression loss.",
    gradient: "from-pink-500 to-rose-500",
    icon: Palette,
  },
  {
    title: "Startup Pitch",
    category: "Business",
    description: "Secure deck management, video pitch submissions, and multi-stage VC judging workflows.",
    gradient: "from-blue-500 to-cyan-500",
    icon: Rocket,
  },
  {
    title: "Film Festivals",
    category: "Media",
    description: "Streamlined video handling, private screener links, and time-stamped judging comments.",
    gradient: "from-purple-500 to-indigo-500",
    icon: Camera,
  },
  {
    title: "Hackathons",
    category: "Technology",
    description: "Direct GitHub integration, team formation tools, and code repository scanning.",
    gradient: "from-emerald-500 to-teal-500",
    icon: Code,
  },
  {
    title: "Music Contests",
    category: "Audio",
    description: "Lossless audio player integration, public voting rounds, and Spotify embedding.",
    gradient: "from-orange-500 to-amber-500",
    icon: Mic2,
  }
];

export const UseCases: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 flex items-end justify-between">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight font-display">Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Every Industry</span></h2>
          <p className="text-lg text-slate-500 max-w-2xl">
            AwardX adapts to your specific needs, whether you're running a local art show or a global tech summit.
          </p>
        </div>
        
        <div className="hidden md:flex space-x-2">
            <button onClick={() => scroll('left')} className="p-3 rounded-full border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button onClick={() => scroll('right')} className="p-3 rounded-full border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all">
                <ArrowRight className="w-5 h-5 text-slate-600" />
            </button>
        </div>
      </div>

      {/* Snapping Carousel */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 px-4 sm:px-6 lg:px-8 scrollbar-hide"
        style={{ scrollPaddingLeft: '2rem' }}
      >
        {cases.map((item, index) => (
            <div 
                key={index}
                className="snap-center shrink-0 w-[85vw] md:w-[400px] h-[500px] relative group rounded-3xl overflow-hidden cursor-pointer"
            >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-90 transition-all duration-500 group-hover:scale-105`}></div>
                
                {/* Abstract overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                
                {/* Content */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between text-white z-10">
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                            <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xs font-bold tracking-widest uppercase opacity-70 border border-white/30 px-3 py-1 rounded-full">AwardX {item.category}</span>
                    </div>

                    <div>
                        <h3 className="text-3xl font-bold mb-4 font-display leading-tight">{item.title}</h3>
                        <p className="text-white/80 leading-relaxed mb-8 text-sm border-l-2 border-white/30 pl-4">
                            {item.description}
                        </p>
                        <div className="flex items-center text-sm font-bold tracking-wide group/btn">
                            Explore Template <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>

                {/* Branding Watermark */}
                <div className="absolute -bottom-4 -right-4 text-6xl font-black text-white opacity-10 select-none pointer-events-none rotate-[-10deg] font-display">
                    AWARDX
                </div>
            </div>
        ))}
        
        {/* Call to Action Card */}
        <div className="snap-center shrink-0 w-[85vw] md:w-[400px] h-[500px] bg-slate-900 rounded-3xl p-8 flex flex-col justify-center items-center text-center relative overflow-hidden border border-slate-800">
             <div className="absolute inset-0 grid-bg-light opacity-10"></div>
             <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Have a unique use case?</h3>
             <p className="text-slate-400 mb-8 relative z-10">Our API allows you to build custom workflows for any competition type.</p>
             <Button variant="white" className="relative z-10">Contact Sales</Button>
        </div>
      </div>
    </section>
  );
};