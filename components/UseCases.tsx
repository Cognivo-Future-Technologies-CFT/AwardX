import React, { useRef, useState, useEffect } from 'react';
import {
  Rocket, DollarSign, BookOpen, FileText, Users, Palette,
  ArrowRight, ArrowLeft, X,
  Video, GitBranch, Flag, Calculator, Shield,
  CheckCircle, BarChart2, Layers, Mail, EyeOff,
  Upload, Send, Calendar, Search, RefreshCw,
  LayoutDashboard, Star, Heart, List, Film,
  Globe, Lock, Sparkles, Zap, Award, UserCheck,
  Users2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Logo } from './Logo';

/* ─────────────────────────────── Types ───────────────────────────────── */

type FeatureItem = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

type CaseItem = {
  title: string;
  shortTitle: string;
  category: string;
  description: string;
  cardGradient: string;
  modalBg: string;
  accentHex: string;
  icon: React.ComponentType<{ className?: string }>;
  features: FeatureItem[];
};

/* ─────────────────────────────── Data ────────────────────────────────── */

const cases: CaseItem[] = [
  {
    title: 'Accelerator & Incubator Programs',
    shortTitle: 'Accelerators',
    category: 'Startups',
    description:
      'Dynamic pitch workflows, collaborative team applications, and multi-stage evaluation funnels — built for the pace of startups.',
    cardGradient: 'from-violet-600 via-purple-600 to-indigo-700',
    modalBg: 'linear-gradient(135deg, #1e1035 0%, #2d1b69 50%, #0f0c29 100%)',
    accentHex: '#a78bfa',
    icon: Rocket,
    features: [
      {
        icon: Users2,
        title: 'Co-Founder Workspaces',
        description:
          'Multiple team members can co-edit and submit a single application collaboratively in real time without conflicts.',
      },
      {
        icon: Video,
        title: 'Pitch Deck & Video Support',
        description:
          'Secure hosting and inline viewing for presentation files, business plans, and investor-grade pitch videos.',
      },
      {
        icon: UserCheck,
        title: 'Mentor Matching',
        description:
          'Assign specific applications to evaluators based on industry expertise for precise, domain-relevant feedback.',
      },
      {
        icon: GitBranch,
        title: 'Multi-Stage Funnels',
        description:
          'Customizable workflows that move startups from initial screening through interview rounds to final selection.',
      },
      {
        icon: Flag,
        title: 'Milestone Tracking',
        description:
          'Post-acceptance dashboards to track each startup\'s KPIs, progress, and reporting obligations over time.',
      },
    ],
  },
  {
    title: 'Grants & Funding',
    shortTitle: 'Grants',
    category: 'Finance',
    description:
      'Strict oversight, financial accountability, and unbiased evaluation for every stage of grant allocation.',
    cardGradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    modalBg: 'linear-gradient(135deg, #042f2e 0%, #065f46 50%, #083344 100%)',
    accentHex: '#34d399',
    icon: DollarSign,
    features: [
      {
        icon: Calculator,
        title: 'Budget Proposal Builders',
        description:
          'Standardized forms with calculation fields for applicants to submit detailed, verified line-item budgets.',
      },
      {
        icon: Shield,
        title: 'Automated COI Management',
        description:
          'Workflows that force reviewers to declare conflicts of interest and automatically lock them out of linked applications.',
      },
      {
        icon: CheckCircle,
        title: 'Compliance & Eligibility Screeners',
        description:
          'Logic gates that reject applications early if they fail geographical, legal, or organisational eligibility criteria.',
      },
      {
        icon: BarChart2,
        title: 'Post-Award Reporting',
        description:
          'Integrated portals to collect milestone updates, financial receipts, and impact data after disbursement.',
      },
      {
        icon: Layers,
        title: 'Multi-Tier Financial Review',
        description:
          'Separate, independent review phases for scientific/impact evaluation and detailed financial audits.',
      },
    ],
  },
  {
    title: 'Academic Admissions',
    shortTitle: 'Admissions',
    category: 'Education',
    description:
      'Standardized records, robust privacy controls, and secure third-party endorsements for academic institutions.',
    cardGradient: 'from-blue-600 via-indigo-600 to-violet-600',
    modalBg: 'linear-gradient(135deg, #0c1445 0%, #1e3a8a 50%, #312e81 100%)',
    accentHex: '#60a5fa',
    icon: BookOpen,
    features: [
      {
        icon: Mail,
        title: 'Blind Reference Collection',
        description:
          'Email referees a secure, one-time link to upload recommendation letters — no account registration required.',
      },
      {
        icon: EyeOff,
        title: 'PII Masking',
        description:
          'Hide name, gender, and address from review committees automatically to guarantee unbiased, equitable scoring.',
      },
      {
        icon: Upload,
        title: 'Transcript Verification',
        description:
          'Secure upload portals for official academic records, transcripts, and standardised test scores.',
      },
      {
        icon: Send,
        title: 'Bulk Status Updates',
        description:
          'Send templated acceptance, rejection, or waitlist emails to thousands of applicants in a single action.',
      },
      {
        icon: Calendar,
        title: 'Interview Scheduling',
        description:
          'Calendar integration allowing shortlisted candidates to self-book interview slots with admissions officers.',
      },
    ],
  },
  {
    title: 'Abstracts & Journals',
    shortTitle: 'Journals',
    category: 'Research',
    description:
      'Rigorous double-blind peer-review workflows for complex academic manuscripts and conference proceedings.',
    cardGradient: 'from-rose-500 via-pink-600 to-fuchsia-600',
    modalBg: 'linear-gradient(135deg, #3b0764 0%, #831843 50%, #4c0519 100%)',
    accentHex: '#f472b6',
    icon: FileText,
    features: [
      {
        icon: Search,
        title: 'Double-Blind Peer Review Routing',
        description:
          'The system automatically hides the author\'s identity from reviewers and reviewer identities from authors.',
      },
      {
        icon: RefreshCw,
        title: 'Revision Workflows',
        description:
          'Cyclical pipeline where editors request changes and authors easily resubmit updated manuscript versions.',
      },
      {
        icon: CheckCircle,
        title: 'Co-Author Sign-offs',
        description:
          'All listed co-authors must approve a manuscript electronically before it can reach final submission.',
      },
      {
        icon: LayoutDashboard,
        title: 'Editorial Dashboards',
        description:
          'High-level views for editors-in-chief to monitor every submission\'s status across a journal issue or track.',
      },
      {
        icon: Globe,
        title: 'Plagiarism Detection Integration',
        description:
          'API hooks that connect submissions to standard academic integrity and originality-checking services on submit.',
      },
    ],
  },
  {
    title: 'Personnel & Fellowships',
    shortTitle: 'Fellowships',
    category: 'Professional',
    description:
      'Nomination-driven workflows built on professional reputation, peer endorsements, and executive review.',
    cardGradient: 'from-amber-500 via-orange-500 to-red-500',
    modalBg: 'linear-gradient(135deg, #431407 0%, #7c2d12 50%, #4d1a04 100%)',
    accentHex: '#fb923c',
    icon: Award,
    features: [
      {
        icon: Star,
        title: 'Third-Party Nominations',
        description:
          'Portals where anyone can nominate a peer, triggering an automated invite to complete their candidate profile.',
      },
      {
        icon: Heart,
        title: 'Endorsement Portfolios',
        description:
          'Collect and aggregate multiple letters of support into a single, beautifully formatted candidate profile.',
      },
      {
        icon: List,
        title: 'Executive Summaries',
        description:
          'Condensed one-page views that let busy executives or board members quickly review top-ranked candidates.',
      },
      {
        icon: Layers,
        title: 'Resume & CV Parsing',
        description:
          'Tools that standardise uploaded professional histories into structured data for side-by-side comparison.',
      },
    ],
  },
  {
    title: 'Creative Contests',
    shortTitle: 'Creative',
    category: 'Arts & Media',
    description:
      'Highly visual contests with public voting galleries, multimedia intake, and IP-protecting watermarking.',
    cardGradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
    modalBg: 'linear-gradient(135deg, #2e0749 0%, #7d1260 50%, #450920 100%)',
    accentHex: '#e879f9',
    icon: Palette,
    features: [
      {
        icon: Film,
        title: 'High-Capacity Multimedia Intake',
        description:
          'Infrastructure to accept, transcode, and host large video files, high-resolution images, and audio tracks.',
      },
      {
        icon: Sparkles,
        title: 'Visual Jury Portals',
        description:
          'A visual-first grading interface where judges view artwork or watch videos inline while entering scores.',
      },
      {
        icon: Globe,
        title: 'Public Voting Galleries',
        description:
          'Secure, beautifully designed public pages where anyone can browse entries and cast their votes.',
      },
      {
        icon: Lock,
        title: 'Fraud Prevention',
        description:
          'CAPTCHA, email verification, and social-login requirements prevent vote botting during public phases.',
      },
      {
        icon: Zap,
        title: 'Watermarking',
        description:
          'Automatic digital watermarks protect artists\' intellectual property while their work is under review.',
      },
    ],
  },
];

/* ─────────────────── Detail Overlay ──────────────────── */

const featureVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

const DetailOverlay: React.FC<{ item: CaseItem; onClose: () => void }> = ({ item, onClose }) => {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.96 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-5xl my-8 mx-4 rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: item.modalBg }}
      >
        {/* Floating orbs */}
        <div
          className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full opacity-25 blur-[80px] pointer-events-none"
          style={{ background: item.accentHex }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-[360px] h-[360px] rounded-full opacity-15 blur-[60px] pointer-events-none"
          style={{ background: item.accentHex }}
        />
        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 p-8 md:p-14">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md border"
                style={{ background: `${item.accentHex}22`, borderColor: `${item.accentHex}44` }}
              >
                <item.icon className="w-7 h-7" style={{ color: item.accentHex }} />
              </div>
              <span
                className="text-xs font-black tracking-[0.2em] uppercase px-4 py-1.5 rounded-full border"
                style={{ color: item.accentHex, borderColor: `${item.accentHex}44`, background: `${item.accentHex}14` }}
              >
                {item.category}
              </span>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mb-5"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {item.title}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-lg text-white/60 max-w-2xl leading-relaxed font-medium"
            >
              {item.description}
            </motion.p>

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 h-px origin-left"
              style={{ background: `linear-gradient(to right, ${item.accentHex}66, transparent)` }}
            />
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {item.features.map((feature, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={featureVariants}
                initial="hidden"
                animate="visible"
                className="group relative rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: `${item.accentHex}0d`,
                  borderColor: `${item.accentHex}22`,
                }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10"
                  style={{ background: `${item.accentHex}20` }}
                />

                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border"
                  style={{ background: `${item.accentHex}18`, borderColor: `${item.accentHex}33` }}
                >
                  <feature.icon className="w-5 h-5" style={{ color: item.accentHex }} />
                </div>

                <h3 className="text-base font-bold text-white mb-2 leading-tight">
                  {feature.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed font-medium">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex items-center justify-between"
          >
            <p className="text-xs text-white/30 font-semibold uppercase tracking-widest">
              AwardX Platform — {item.category} Solution
            </p>
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-sm font-bold text-white/40 hover:text-white/80 transition-colors"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─────────────────── Main Component ──────────────────── */

export const UseCases: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState<CaseItem | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -440 : 440,
        behavior: 'smooth',
      });
    }
  };

  return (
    <>
      <section className="py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 flex items-end justify-between">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight font-display">
              Built for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Every Industry
              </span>
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl">
              The platform adapts to your specific needs — whether you're running a grant programme, a creative contest, or an academic journal.
            </p>
          </div>

          <div className="hidden md:flex space-x-2">
            <button
              onClick={() => scroll('left')}
              className="p-3 rounded-full border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-3 rounded-full border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <ArrowRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-12 px-4 sm:px-6 lg:px-8 scrollbar-hide"
          style={{ scrollPaddingLeft: '2rem' }}
        >
          {cases.map((item, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveItem(item)}
              className={`snap-center shrink-0 w-[85vw] md:w-[360px] h-[500px] relative group rounded-3xl overflow-hidden cursor-pointer select-none`}
            >
              {/* Background gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.cardGradient} transition-all duration-500`}
              />

              {/* Noise overlay */}
              <div
                className="absolute inset-0 opacity-20"
                style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
              />

              {/* Floating inner glow */}
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

              {/* Content */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between text-white z-10">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-bold tracking-widest uppercase opacity-70 border border-white/30 px-3 py-1 rounded-full">
                    {item.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black mb-3 leading-tight tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-white/75 leading-relaxed mb-6 text-sm border-l-2 border-white/30 pl-4">
                    {item.description}
                  </p>
                  <div className="flex items-center text-sm font-bold tracking-wide group/btn">
                    <span className="mr-2">Explore features</span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Branding watermark */}
              <div className="absolute -bottom-4 -right-4 opacity-10 select-none pointer-events-none rotate-[-10deg]">
                <Logo size="2xl" />
              </div>
            </motion.div>
          ))}

          {/* Build-your-own card */}
          <div className="snap-center shrink-0 w-[85vw] md:w-[360px] h-[500px] bg-slate-900 rounded-3xl p-8 flex flex-col justify-center items-center text-center relative overflow-hidden border border-slate-800">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }} />
            <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Need something custom?</h3>
            <p className="text-slate-400 mb-8 relative z-10">
              Fork the repo, extend the plugin API, or open a discussion. Every workflow ships from the community.
            </p>
            <Button variant="white" className="relative z-10">Open a Discussion</Button>
          </div>
        </div>
      </section>

      {/* Detail Overlay */}
      <AnimatePresence>
        {activeItem && (
          <DetailOverlay
            item={activeItem}
            onClose={() => setActiveItem(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};