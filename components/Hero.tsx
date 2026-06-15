import React, { useRef, useEffect, useState } from 'react';
import { Github, ArrowRight, FileText, Gavel, Vote, CreditCard, Trophy, ChevronDown } from 'lucide-react';
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GITHUB_REPO } from '@/lib/brand';
import { isLandingOnly } from '@/lib/landingOnly';
import { Logo } from './Logo';

// ── Brand marks ──────────────────────────────────────────────────────────────
// Inline SVGs traced from each brand's public mark. Kept monochrome where the
// tile is colored, full-color where the tile is white — matches the visual
// rhythm of the Veris reference (mix of colored and white tiles).

const SupabaseMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 109 113" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M63.7 110.3c-2.9 3.6-8.7 1.6-8.8-3l-1.2-67.6h45.5c8.3 0 12.9 9.5 7.8 16L63.7 110.3z" fill="currentColor" />
    <path d="M45.3 2.6c2.9-3.6 8.7-1.6 8.8 3l.5 67.6H9.7c-8.3 0-12.9-9.5-7.8-16L45.3 2.6z" fill="currentColor" opacity="0.55" />
  </svg>
);

const StripeMark: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/stripe.svg" alt="Stripe" className={className} draggable={false} />
);

const RazorpayMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.4 4.3l-2.6 9.6 6.4-2.5 4.5-11.4-8.3 4.3zM5.8 32l3.5-13H4.6L0 32h5.8zm9.7-13l3.8-14.3-8.4 4.3L4 32h11.5l3.7-13H15.5z" />
  </svg>
);

const ResendMark: React.FC<{ className?: string }> = ({ className }) => (
  <img src="/resend.svg" alt="Resend" className={className} draggable={false} />
);

const ReactMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="-11.5 -10.23 23 20.46" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="0" cy="0" r="2.05" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1" fill="none">
      <ellipse rx="11" ry="4.2" />
      <ellipse rx="11" ry="4.2" transform="rotate(60)" />
      <ellipse rx="11" ry="4.2" transform="rotate(120)" />
    </g>
  </svg>
);

const VercelMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 76 65" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M37.6 0L75.2 65H0L37.6 0z" />
  </svg>
);

// ── Tile config ──────────────────────────────────────────────────────────────

type Variant = 'white' | 'solid' | 'wordmark';
type OrbitNode = {
  label: string;
  pos: string;
  delay: number;
  variant: Variant;
  size: 'sm' | 'md' | 'lg';
  // Tracks parallax depth — outer tiles drift more than inner ones.
  depth: number;
  accent: string;
  mark: React.FC<{ className?: string }>;
};

const orbitNodes: OrbitNode[] = [
  { label: 'Supabase', pos: 'top-[10%] left-[4%]',    delay: 0.15, variant: 'white',    size: 'lg', depth: 28, accent: 'text-emerald-500', mark: SupabaseMark },
  { label: 'Stripe',   pos: 'top-[2%] right-[6%]',    delay: 0.25, variant: 'wordmark', size: 'md', depth: 36, accent: '',                  mark: StripeMark   },
  { label: 'React',    pos: 'top-[38%] left-[-2%]',   delay: 0.35, variant: 'white',    size: 'md', depth: 18, accent: 'text-[#58C4DC]',    mark: ReactMark    },
  { label: 'Resend',   pos: 'top-[36%] right-[-4%]',  delay: 0.45, variant: 'wordmark', size: 'lg', depth: 22, accent: '',                  mark: ResendMark   },
  { label: 'Razorpay', pos: 'bottom-[10%] left-[6%]', delay: 0.55, variant: 'solid',    size: 'md', depth: 32, accent: 'bg-[#0D2366]',      mark: RazorpayMark },
  { label: 'Vercel',   pos: 'bottom-[4%] right-[6%]', delay: 0.65, variant: 'white',    size: 'sm', depth: 40, accent: 'text-slate-900',    mark: VercelMark   },
];

const SIZE_CLASS: Record<OrbitNode['size'], { square: string; wide: string; mark: string; wordmark: string }> = {
  sm: { square: 'w-14 h-14 rounded-2xl',            wide: 'w-[104px] h-[52px] rounded-[18px] px-3', mark: 'w-6 h-6', wordmark: 'h-6'  },
  md: { square: 'w-16 h-16 rounded-2xl',            wide: 'w-[120px] h-[60px] rounded-[20px] px-4', mark: 'w-7 h-7', wordmark: 'h-7'  },
  lg: { square: 'w-[72px] h-[72px] rounded-[22px]', wide: 'w-[136px] h-[68px] rounded-[22px] px-4', mark: 'w-8 h-8', wordmark: 'h-8'  },
};

const OrbitTile: React.FC<{
  node: OrbitNode;
  parallaxX: ReturnType<typeof useMotionValue<number>>;
  parallaxY: ReturnType<typeof useMotionValue<number>>;
}> = ({ node, parallaxX, parallaxY }) => {
  const sz = SIZE_CLASS[node.size];
  const Mark = node.mark;
  const isSolid = node.variant === 'solid';
  const isWord = node.variant === 'wordmark';
  const tileShape = isWord ? sz.wide : sz.square;
  const markSize = isWord ? sz.wordmark + ' w-auto' : sz.mark;

  // Outer tiles get more parallax drift than inner ones.
  const x = useTransform(parallaxX, (v) => v * node.depth);
  const y = useTransform(parallaxY, (v) => v * node.depth);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: node.delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ x, y }}
      className={`absolute ${node.pos} hidden md:block`}
      aria-hidden="true"
    >
      <div
        title={node.label}
        className={`${tileShape} ${
          isSolid
            ? `${node.accent} shadow-[0_14px_36px_-10px_rgba(15,23,42,0.32)]`
            : 'bg-white border border-slate-200/80 shadow-[0_12px_32px_-10px_rgba(15,23,42,0.18)]'
        } flex items-center justify-center animate-float backdrop-blur-sm overflow-hidden transition-transform duration-300 hover:scale-110`}
        style={{ animationDelay: `${node.delay}s` }}
      >
        <Mark className={`${markSize} ${isWord ? '' : isSolid ? 'text-white' : node.accent} object-contain`} />
      </div>
    </motion.div>
  );
};

// ── Rotating headline word ───────────────────────────────────────────────────
const ROTATING_WORDS = ['awards', 'hackathons', 'grants', 'competitions', 'fellowships'] as const;

const RotatingWord: React.FC = () => {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setI((p) => (p + 1) % ROTATING_WORDS.length), 2400);
    return () => window.clearInterval(id);
  }, [reduce]);

  const word = ROTATING_WORDS[i];

  // popLayout removes the exiting word from flow so the container width
  // animates smoothly; a soft spring is used so the surrounding headline
  // ("Run your …") eases into the new width instead of snapping.
  const layoutSpring = { type: 'spring' as const, stiffness: 140, damping: 22, mass: 0.9 };

  return (
    <motion.span
      layout
      transition={layoutSpring}
      className="relative inline-flex items-baseline align-baseline overflow-hidden"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={word}
          layout
          initial={reduce ? { opacity: 0 } : { y: '55%', opacity: 0, filter: 'blur(8px)' }}
          animate={reduce ? { opacity: 1 } : { y: '0%', opacity: 1, filter: 'blur(0px)' }}
          exit={reduce ? { opacity: 0 } : { y: '-55%', opacity: 0, filter: 'blur(8px)' }}
          transition={{
            y: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
            opacity: { duration: 0.55, ease: 'easeOut' },
            filter: { duration: 0.55, ease: 'easeOut' },
            layout: layoutSpring,
          }}
          className="whitespace-nowrap bg-clip-text text-transparent animate-silver-shimmer"
          style={{
            backgroundImage:
              'linear-gradient(110deg, #64748b 0%, #64748b 46%, #e2e8f0 49%, #ffffff 50%, #e2e8f0 51%, #64748b 54%, #64748b 100%)',
            backgroundSize: '250% 100%',
            WebkitTextStroke: '0.4px rgba(100, 116, 139, 0.35)',
          }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
};

// ── Capabilities strip ───────────────────────────────────────────────────────
const CAPABILITIES = [
  { icon: FileText,  label: 'Entries'   },
  { icon: Gavel,     label: 'Judging'   },
  { icon: Vote,      label: 'Voting'    },
  { icon: CreditCard,label: 'Payments'  },
  { icon: Trophy,    label: 'Winners'   },
];

export const Hero: React.FC = () => {
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const dashY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const ringsY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const ringsOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.3]);

  // Mouse-driven parallax for rings + tiles. Normalized to [-0.5, 0.5].
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const mx = useSpring(mxRaw, { stiffness: 60, damping: 18, mass: 0.6 });
  const my = useSpring(myRaw, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      mxRaw.set((e.clientX - r.left) / r.width - 0.5);
      myRaw.set((e.clientY - r.top) / r.height - 0.5);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [mxRaw, myRaw, reduce]);

  const ringsX = useTransform(mx, (v) => v * -30);
  const ringsXY = useTransform(my, (v) => v * -30);

  const dashRotateX = useTransform(my, (v) => v * 6);
  const dashRotateY = useTransform(mx, (v) => v * -6);

  return (
    <section ref={ref} className="relative pt-28 pb-24 lg:pt-36 overflow-hidden bg-white">
      {/* Subtle grid texture for premium depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)',
        }}
      />

      {/* Concentric dotted rings — Veris-style backdrop with scroll + mouse parallax */}
      <motion.div
        style={{ y: ringsY, opacity: ringsOpacity }}
        className="pointer-events-none absolute inset-0 flex items-start justify-center"
        aria-hidden="true"
      >
        <motion.div
          style={{ x: ringsX, y: ringsXY }}
          className="relative mt-20 w-[1400px] h-[1400px] max-w-none"
        >
          {[260, 420, 580, 740, 900, 1080].map((size, idx) => (
            <div
              key={size}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-slate-200"
              style={{
                width: size,
                height: size,
                animation: reduce ? undefined : `spin ${60 + idx * 20}s linear infinite ${idx % 2 ? 'reverse' : ''}`,
              }}
            />
          ))}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-indigo-100/50 via-transparent to-cyan-100/50 blur-3xl" />
        </motion.div>
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-4xl mx-auto pt-6 pb-2">
          {orbitNodes.map((n) => (
            <OrbitTile key={n.label} node={n} parallaxX={mx} parallaxY={my} />
          ))}

          {/* Brand mark */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex justify-center mb-8"
          >
            <Logo size="home" />
          </motion.div>

          {/* Eyebrow */}
          <motion.a
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            href={GITHUB_REPO}
            target="_blank"
            rel="noreferrer"
            className="group mx-auto mb-7 flex w-fit items-center gap-2.5 rounded-full border border-slate-200 bg-white/80 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
          >
            <span className="flex -space-x-1.5">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white" />
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white" />
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 border-2 border-white" />
            </span>
            <span className="text-slate-900 font-bold">Built in public</span>
            <span className="text-slate-500">on GitHub</span>
            <Github className="w-3.5 h-3.5 text-slate-400 transition-transform group-hover:rotate-12" />
          </motion.a>

          {/* Headline with rotating word */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="text-center text-[44px] sm:text-6xl lg:text-7xl font-bold tracking-[-0.03em] text-slate-900 leading-[1.05] font-display"
          >
            {/* Line wrapper is layout-animated so "Run your" glides with the
                width change instead of snapping when the word swaps. */}
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 140, damping: 22, mass: 0.9 }}
              className="inline-flex items-baseline justify-center flex-wrap gap-x-[0.3em]"
            >
              <motion.span layout>Run your</motion.span>
              <RotatingWord />
            </motion.span>
            <br className="hidden sm:block" />
            end-to-end, in one workspace.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 mx-auto max-w-2xl text-center text-base sm:text-lg text-slate-500 leading-relaxed"
          >
            Build the entry form, configure rounds and judges, collect public votes,
            charge for entries, and announce winners &mdash; without bolting together five tools.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-slate-900 px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_6px_24px_-6px_rgba(15,23,42,0.45)] hover:bg-slate-800 transition-colors"
            >
              <Github className="w-4 h-4 relative" />
              <span className="relative">View GitHub</span>
              <ArrowRight className="w-4 h-4 relative transition-transform group-hover:translate-x-0.5" />
            </a>
            {!isLandingOnly && (
              <button
                type="button"
                onClick={() => navigate('/demo?autoplay=1')}
                className="group inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-7 py-3.5 text-[15px] font-semibold text-slate-900 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                See Live Demo
              </button>
            )}
          </motion.div>

          {/* Capability strip — what's in the box, no fabricated metrics */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-500"
          >
            {CAPABILITIES.map(({ icon: Icon, label }, i) => (
              <React.Fragment key={label}>
                {i > 0 && <span aria-hidden className="hidden sm:inline-block h-1 w-1 rounded-full bg-slate-300" />}
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-600">{label}</span>
                </span>
              </React.Fragment>
            ))}
          </motion.div>

          {/* Mobile-only mini integrations row (tiles are hidden on mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="md:hidden mt-8 flex items-center justify-center gap-3"
            aria-label="Built with"
          >
            {orbitNodes.slice(0, 5).map((n) => {
              const Mark = n.mark;
              return (
                <div
                  key={n.label}
                  title={n.label}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center"
                >
                  <Mark className={`w-5 h-5 ${n.variant === 'solid' ? 'text-slate-900' : n.accent}`} />
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Dashboard screenshot with browser chrome */}
        <motion.div
          style={{
            y: dashY,
            rotateX: reduce ? 0 : dashRotateX,
            rotateY: reduce ? 0 : dashRotateY,
            transformPerspective: 1200,
          }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
          className="relative mt-16 sm:mt-20 mx-auto max-w-6xl"
        >
          {/* Stacked glow */}
          <div className="absolute -inset-x-8 -bottom-10 h-40 bg-gradient-to-t from-indigo-300/40 via-purple-200/25 to-transparent blur-3xl rounded-[3rem] pointer-events-none" />
          <div className="absolute inset-x-12 -bottom-6 h-24 bg-gradient-to-t from-cyan-200/30 via-transparent to-transparent blur-2xl rounded-[3rem] pointer-events-none" />

          <div className="relative rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.4)] overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <span className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  awardx.one
                  <span className="text-slate-400">/dashboard</span>
                </div>
              </div>
              <div className="w-12" />
            </div>

            <div className="relative">
              <img
                src="/hero-dashboard.png"
                alt="Events dashboard showing program tiles and key metrics"
                className="block w-full h-auto select-none"
                draggable={false}
              />
              {/* Fade dissolve */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent" />
            </div>
          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.a
          href="#features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-14 mx-auto flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors group"
          aria-label="Scroll to features"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest">Explore</span>
          <ChevronDown className="w-5 h-5 animate-bounce-soft group-hover:text-indigo-500" />
        </motion.a>
      </div>
    </section>
  );
};
