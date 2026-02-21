import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, Play, CheckCircle2, Trophy } from 'lucide-react';
import { Button } from './Button';
import { motion, useScroll, useTransform } from 'framer-motion';

export const Hero: React.FC = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const brandingY = useTransform(scrollYProgress, [0, 1], [0, 50]);

  // Typing Effect Logic
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);

  const phrases = [
    "Awards & Growth", 
    "Employee Recognition", 
    "Creative Excellence", 
    "Innovation Challenges"
  ];

  useEffect(() => {
    const handleTyping = () => {
      const i = loopNum % phrases.length;
      const fullText = phrases[i];

      setText(isDeleting 
        ? fullText.substring(0, text.length - 1) 
        : fullText.substring(0, text.length + 1)
      );

      setTypingSpeed(isDeleting ? 50 : 150);

      if (!isDeleting && text === fullText) {
        setTimeout(() => setIsDeleting(true), 2000); // Pause at end
      } else if (isDeleting && text === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, typingSpeed, phrases]);

  return (
    <section ref={ref} className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-background">
      {/* Background Branding */}
      <motion.div 
        style={{ y: brandingY }}
        className="absolute top-20 left-1/2 -translate-x-1/2 text-[18vw] font-black text-slate-50 opacity-80 pointer-events-none select-none z-0 tracking-tighter font-display"
      >
        AwardX
      </motion.div>

      {/* Abstract Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[30%] -right-[10%] w-[80%] h-[80%] bg-gradient-to-br from-indigo-100/50 to-purple-100/50 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute top-[20%] -left-[10%] w-[60%] h-[60%] bg-gradient-to-tr from-cyan-100/50 to-blue-100/50 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute bottom-0 right-0 w-full h-[500px] bg-gradient-to-t from-white via-white to-transparent z-10"></div>
        <div className="absolute inset-0 grid-bg-light opacity-[0.6] z-0"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-8">
          
          {/* Left Content */}
          <motion.div 
            className="lg:w-1/2 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-indigo-100 bg-white/80 backdrop-blur-sm text-indigo-700 text-sm font-bold tracking-wide mb-8 shadow-sm">
              <span className="flex h-2 w-2 mr-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
              </span>
              AWARDX V2.0 IS LIVE
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1] min-h-[3.3em] lg:min-h-[auto] font-display">
              The OS for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500">
                {text}
                <span className="border-r-4 border-indigo-600 ml-1 animate-pulse"></span>
              </span>
            </h1>
            
            <p className="mt-4 text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
              Launch world-class award programs, automate judging, and amplify your reach. 
              The all-in-one platform for modern competitions.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
              <Button variant="primary" size="lg" className="w-full sm:w-auto font-bold shadow-indigo-500/25 rounded-full px-8">
                Start Free Trial 
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button variant="white" size="lg" className="w-full sm:w-auto font-bold rounded-full px-8">
                <Play className="mr-2 w-4 h-4 fill-slate-900" /> Watch Demo
              </Button>
            </div>

            <div className="mt-10 flex items-center justify-center lg:justify-start space-x-6 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {['A','B','C','D'].map((letter, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                ))}
              </div>
              <div>
                <span className="font-bold text-slate-900">2,000+</span> organizations joined AwardX
              </div>
            </div>
          </motion.div>

          {/* Right Visuals - Parallax Elements */}
          <div className="lg:w-1/2 relative h-[500px] w-full max-w-xl lg:max-w-none mx-auto">
            {/* Background Blob */}
            <motion.div 
              style={{ y: y1 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gradient-to-r from-cyan-400 to-indigo-400 rounded-full blur-[80px] opacity-20" 
            />

            {/* Main Dashboard Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute inset-0 z-10"
              style={{ perspective: '1000px' }}
            >
              <div className="w-full h-full bg-white rounded-[2rem] shadow-2xl shadow-indigo-900/10 border border-slate-200 overflow-hidden relative transform transition-transform hover:scale-[1.02] duration-500 group">
                {/* Header */}
                <div className="h-12 border-b border-slate-100 flex items-center px-6 gap-2 bg-slate-50/50 justify-between">
                   <div className="flex gap-2">
                     <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                     <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                   </div>
                   <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">AWARDX DASHBOARD</div>
                </div>
                
                {/* Body Content Placeholder - Abstract Dashboard */}
                <div className="p-8 relative">
                  
                  <div className="flex gap-6 mb-8">
                     <div className="w-1/3">
                        <div className="h-3 w-16 bg-slate-100 rounded mb-3"></div>
                        <div className="h-10 w-24 bg-slate-900 rounded-lg"></div>
                     </div>
                     <div className="w-1/3">
                        <div className="h-3 w-16 bg-slate-100 rounded mb-3"></div>
                        <div className="h-10 w-24 bg-slate-900 rounded-lg"></div>
                     </div>
                     <div className="w-1/3">
                        <div className="h-3 w-16 bg-slate-100 rounded mb-3"></div>
                        <div className="h-10 w-24 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200"></div>
                     </div>
                  </div>
                  <div className="h-48 w-full bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group-hover:border-indigo-100 transition-colors">
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-indigo-500/10 to-transparent"></div>
                    <svg className="w-full h-full" preserveAspectRatio="none">
                      <path d="M0,100 C150,80 300,120 450,60 C600,0 750,40 900,20 L900,200 L0,200 Z" fill="url(#gradient)" className="opacity-20"/>
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating Elements - Parallax */}
            <motion.div style={{ y: y2 }} className="absolute -top-10 -right-10 z-20">
              <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 w-52 animate-float">
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-2.5 bg-green-100 rounded-xl text-green-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Status</div>
                    <div className="text-sm font-bold text-slate-900">Live</div>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-green-500 h-full w-full"></div>
                </div>
              </div>
            </motion.div>

            <motion.div style={{ y: y3 }} className="absolute -bottom-5 -left-5 z-30">
              <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 w-64 animate-float animation-delay-2000">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-purple-100 rounded-xl text-purple-600">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Top Candidate</div>
                    <div className="text-sm font-bold text-slate-900">Sarah Jenkins</div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
};