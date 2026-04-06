/**
 * PublicPageSections.tsx
 *
 * Clean, production-grade renderers for every public landing page section type.
 * Zero hardcoded content — all text comes from section.content (editable in the
 * builder) or from the live API payload (for auto-populated sections).
 */

import React, { useState, useEffect } from 'react';
import {
    Calendar, Clock, Trophy, ChevronRight, ArrowRight,
    ChevronDown, CheckCircle2, Star, Users, Zap, Award,
    ExternalLink, Info,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ProgramRound {
    id: string;
    title: string;
    description?: string;
    status: string;
    type: string;
    start_date: string;
    end_date: string;
    sort_order: number;
}

export interface ProgramAward {
    id: string;
    title: string;
    description?: string;
    parent_id: string | null;
}

export interface ProgramMilestone {
    id: string;
    title: string;
    date?: string;
    description?: string;
    is_visible?: boolean;
}

export interface ProgramSponsor {
    id: string;
    name: string;
    logo_url?: string;
    website_url?: string;
    tier?: string;
    tier_label?: string;
    is_active?: boolean;
}

export interface ProgramFaq {
    id: string;
    question: string;
    answer: string;
    is_visible?: boolean;
}

export interface PublicPagePayload {
    program: {
        id: string;
        title: string;
        description?: string;
        timezone?: string;
        deadline?: string;
        cover_image_url?: string;
    };
    sections: any[];
    rounds: ProgramRound[];
    awards: ProgramAward[];
    sponsors: ProgramSponsor[];
    faqs: ProgramFaq[];
    schedule: {
        deadline?: string;
        timezone?: string;
        milestones: ProgramMilestone[];
    };
}

export interface PublicSection {
    id: string;
    section_type: string;
    title?: string;
    subtitle?: string;
    content: Record<string, any>;
    settings: Record<string, any>;
    is_visible: boolean;
    sort_order: number;
    program_id: string;
}

// ─── Section Catalogue (used by builder) ───────────────────────────────────

export interface SectionCatalogEntry {
    type: string;
    label: string;
    emoji: string;
    description: string;
    isAuto: boolean;
    defaultContent: Record<string, any>;
    defaultSettings: Record<string, any>;
}

export const SECTION_CATALOG: SectionCatalogEntry[] = [
    {
        type: 'about',
        label: 'About',
        emoji: '📖',
        description: 'Introduce your program with a headline and body text',
        isAuto: false,
        defaultContent: { title: 'About the Program', lead: '', body: '' },
        defaultSettings: {},
    },
    {
        type: 'auto_categories',
        label: 'Award Categories',
        emoji: '🏆',
        description: 'Auto-populated from your program categories',
        isAuto: true,
        defaultContent: { title: 'Award Categories', subtitle: '' },
        defaultSettings: {},
    },
    {
        type: 'auto_rounds',
        label: 'Program Rounds',
        emoji: '🔄',
        description: 'Auto-populated from your program rounds',
        isAuto: true,
        defaultContent: { title: 'Program Rounds', subtitle: '' },
        defaultSettings: {},
    },
    {
        type: 'auto_key_dates',
        label: 'Important Dates',
        emoji: '📅',
        description: 'Auto-populated from milestones & deadline',
        isAuto: true,
        defaultContent: { title: 'Important Dates', subtitle: '' },
        defaultSettings: {},
    },
    {
        type: 'auto_faqs',
        label: 'FAQs (Auto)',
        emoji: '❓',
        description: 'Auto-populated from the FAQs you configured',
        isAuto: true,
        defaultContent: { title: 'Frequently Asked Questions', subtitle: '' },
        defaultSettings: {},
    },
    {
        type: 'auto_sponsors',
        label: 'Sponsors (Auto)',
        emoji: '🤝',
        description: 'Auto-populated from your sponsors list',
        isAuto: true,
        defaultContent: { title: 'Sponsors & Partners', subtitle: '' },
        defaultSettings: {},
    },
    {
        type: 'highlights',
        label: 'Why Apply / Benefits',
        emoji: '⚡',
        description: 'Custom benefit cards',
        isAuto: false,
        defaultContent: {
            title: 'Why Participate',
            subtitle: '',
            items: [{ title: 'Recognition', description: 'Describe this benefit.' }],
        },
        defaultSettings: {},
    },
    {
        type: 'process',
        label: 'How It Works',
        emoji: '🪜',
        description: 'Step-by-step process guide',
        isAuto: false,
        defaultContent: {
            title: 'How It Works',
            subtitle: '',
            steps: [{ title: 'Submit Application', description: 'Fill out the nomination form.' }],
        },
        defaultSettings: {},
    },
    {
        type: 'eligibility',
        label: 'Who Can Apply',
        emoji: '✅',
        description: 'Eligibility criteria as a checklist',
        isAuto: false,
        defaultContent: {
            title: 'Who Can Apply',
            subtitle: '',
            items: ['Open to individuals, teams, and organizations'],
        },
        defaultSettings: {},
    },
    {
        type: 'faq',
        label: 'FAQs (Manual)',
        emoji: '💬',
        description: 'Manually add Q&A pairs',
        isAuto: false,
        defaultContent: {
            title: 'Frequently Asked Questions',
            items: [{ question: 'Who can apply?', answer: 'Please refer to the eligibility section.' }],
        },
        defaultSettings: {},
    },
    {
        type: 'rich_text',
        label: 'Text Block',
        emoji: '📝',
        description: 'Custom HTML / rich text section',
        isAuto: false,
        defaultContent: { title: '', body: '<p>Add your content here.</p>' },
        defaultSettings: {},
    },
    {
        type: 'terms',
        label: 'Terms & Conditions',
        emoji: '📋',
        description: 'Program rules, terms, and conditions',
        isAuto: false,
        defaultContent: { title: 'Terms & Conditions', body: '<p>Add your terms here.</p>' },
        defaultSettings: {},
    },
    {
        type: 'cta',
        label: 'Call to Action',
        emoji: '📣',
        description: 'Prominent section to drive nominations',
        isAuto: false,
        defaultContent: {
            title: "Ready to be recognized?",
            subtitle: "Don't miss your chance to apply.",
            buttonText: 'Nominate Now',
        },
        defaultSettings: {},
    },
    {
        type: 'sponsors',
        label: 'Sponsors (Manual)',
        emoji: '🌐',
        description: 'Manually add sponsor logos and links',
        isAuto: false,
        defaultContent: {
            title: 'Sponsors & Partners',
            subtitle: '',
            items: [],
        },
        defaultSettings: {},
    },
];

// Default template for new programs
export const PUBLIC_PAGE_DEFAULT_TEMPLATE: Array<{ type: string; defaultContent: Record<string, any>; defaultSettings: Record<string, any> }> = [
    {
        type: 'hero',
        defaultContent: { subtitle: '', backgroundImage: '', primaryCtaText: 'Nominate Now', primaryCtaLink: '#' },
        defaultSettings: {},
    },
    ...['about', 'auto_categories', 'auto_rounds', 'auto_key_dates', 'cta'].map(type => {
        const entry = SECTION_CATALOG.find(c => c.type === type)!;
        return { type, defaultContent: entry.defaultContent, defaultSettings: entry.defaultSettings };
    }),
];

// ─── Utilities ──────────────────────────────────────────────────────────────

export function formatDate(dateStr?: string | null): string {
    if (!dateStr) return 'TBA';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', {
            day: 'numeric', month: 'long', year: 'numeric',
        });
    } catch {
        return 'TBA';
    }
}

export function useCountdown(deadline?: string | null) {
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

    useEffect(() => {
        if (!deadline) return;
        const target = new Date(deadline).getTime();
        const update = () => {
            const diff = target - Date.now();
            if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
            setTimeLeft({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
            });
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [deadline]);

    return timeLeft;
}

const ROUND_STATUS: Record<string, { label: string; cls: string }> = {
    active: { label: 'Open Now', cls: 'bg-emerald-100 text-emerald-700' },
    completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-500' },
    pending: { label: 'Upcoming', cls: 'bg-indigo-50 text-indigo-600' },
    upcoming: { label: 'Upcoming', cls: 'bg-indigo-50 text-indigo-600' },
};

function SectionWrapper({ id, bg = 'bg-white', children, className = '' }: { id?: string; bg?: string; children: React.ReactNode; className?: string }) {
    return (
        <section id={id} className={`py-16 px-4 ${bg} ${className}`}>
            <div className="max-w-6xl mx-auto">{children}</div>
        </section>
    );
}

function SectionHeading({ title, subtitle }: { title?: string; subtitle?: string }) {
    if (!title) return null;
    return (
        <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-slate-500 mt-2 text-base">{subtitle}</p>}
        </div>
    );
}

// ─── Individual Section Renderers ───────────────────────────────────────────

interface SectionProps {
    section: PublicSection;
    payload: PublicPagePayload;
    nominateUrl: string;
    nominateButtonText: string;
}

// HERO
function HeroSection({ section, payload, nominateUrl, nominateButtonText }: SectionProps) {
    const { content } = section;
    const [navScrolled, setNavScrolled] = useState(false);

    useEffect(() => {
        const fn = () => setNavScrolled(window.scrollY > 60);
        window.addEventListener('scroll', fn, { passive: true });
        return () => window.removeEventListener('scroll', fn);
    }, []);

    const deadline = payload.schedule?.deadline || payload.program.deadline;
    const countdown = useCountdown(deadline);
    const coverImage = content.backgroundImage || payload.program.cover_image_url;
    const tagline = content.subtitle;
    const hasLink = nominateUrl && nominateUrl !== '#';

    // Stats bar data
    const topCategories = (payload.awards || []).filter(a => !a.parent_id);
    const rounds = payload.rounds || [];

    return (
        <>
            {/* Sticky nav */}
            <nav
                aria-label="Site navigation"
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? 'bg-slate-900/95 backdrop-blur shadow-lg' : 'bg-transparent'}`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                    <span className="text-white font-bold text-base sm:text-lg truncate">{payload.program.title}</span>
                    {hasLink && (
                        <a href={nominateUrl} className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors">
                            {nominateButtonText}
                        </a>
                    )}
                </div>
            </nav>

            {/* Hero */}
            <div
                className="relative min-h-[88vh] flex items-center justify-center text-center px-4"
                style={{
                    background: coverImage
                        ? `linear-gradient(rgba(8,8,25,0.62) 0%, rgba(8,8,25,0.74) 100%), url(${coverImage}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4338ca 100%)',
                }}
            >
                <div className="relative z-10 max-w-3xl mx-auto pt-24 pb-16">
                    {deadline && (
                        <div className="inline-flex items-center gap-1.5 bg-white/10 text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm border border-white/20">
                            <Clock className="w-3.5 h-3.5" />
                            Deadline: {formatDate(deadline)}
                        </div>
                    )}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-5 leading-tight">
                        {payload.program.title}
                    </h1>
                    {tagline && (
                        <p className="text-lg sm:text-xl text-white/75 mb-8 max-w-2xl mx-auto leading-relaxed">{tagline}</p>
                    )}

                    {countdown && deadline && (
                        <div className="flex justify-center gap-3 mb-9" aria-label="Countdown to deadline">
                            {([
                                { value: countdown.days, label: 'Days' },
                                { value: countdown.hours, label: 'Hours' },
                                { value: countdown.minutes, label: 'Min' },
                                { value: countdown.seconds, label: 'Sec' },
                            ] as const).map(({ value, label }) => (
                                <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 min-w-[62px]">
                                    <div className="text-2xl font-bold text-white tabular-nums leading-none">{String(value).padStart(2, '0')}</div>
                                    <div className="text-[11px] text-white/55 font-medium mt-1">{label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {hasLink ? (
                        <a href={nominateUrl} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base sm:text-lg px-9 py-4 rounded-full transition-colors shadow-xl shadow-indigo-900/50">
                            {nominateButtonText} <ArrowRight className="w-5 h-5" aria-hidden />
                        </a>
                    ) : (
                        <div className="inline-flex items-center gap-2 bg-white/10 text-white/50 font-bold text-base sm:text-lg px-9 py-4 rounded-full border border-white/20 cursor-not-allowed">
                            {nominateButtonText}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats bar */}
            {(topCategories.length > 0 || rounds.length > 0 || deadline) && (
                <div className="bg-slate-900 text-white">
                    <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-3 divide-x divide-white/10 text-center">
                        {topCategories.length > 0 && (
                            <div className="px-4 py-5">
                                <div className="text-2xl font-extrabold text-indigo-400">{topCategories.length}</div>
                                <div className="text-xs text-slate-400 mt-1">Award Categories</div>
                            </div>
                        )}
                        {rounds.length > 0 && (
                            <div className="px-4 py-5">
                                <div className="text-2xl font-extrabold text-indigo-400">{rounds.length}</div>
                                <div className="text-xs text-slate-400 mt-1">Program Rounds</div>
                            </div>
                        )}
                        {deadline && (
                            <div className="px-4 py-5 col-span-2 sm:col-span-1">
                                <div className="text-sm font-bold text-indigo-400">{formatDate(deadline)}</div>
                                <div className="text-xs text-slate-400 mt-1">Application Deadline</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

// ABOUT
function AboutSection({ section }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    // Support both old (description) and new (body) field names
    const body = content.body || content.description;
    const lead = content.lead;

    if (!lead && !body) return null;

    return (
        <SectionWrapper id="about" bg="bg-white">
            <div className="max-w-3xl mx-auto text-center">
                {title && <h2 className="text-3xl font-bold text-slate-900 mb-4">{title}</h2>}
                {lead && <p className="text-lg text-slate-700 font-medium mb-4 leading-relaxed">{lead}</p>}
                {body && (
                    <div
                        className="text-slate-500 prose prose-slate max-w-none text-left"
                        dangerouslySetInnerHTML={{ __html: body }}
                    />
                )}
            </div>
        </SectionWrapper>
    );
}

// AUTO CATEGORIES
function AutoCategoriesSection({ section, payload, nominateUrl, nominateButtonText }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle || section.subtitle;
    const topCategories = (payload.awards || []).filter(a => !a.parent_id);

    if (topCategories.length === 0) return null;

    return (
        <SectionWrapper id="categories" bg="bg-slate-50">
            <SectionHeading title={title} subtitle={subtitle || `Submit across ${topCategories.length} categor${topCategories.length === 1 ? 'y' : 'ies'}`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topCategories.map((award) => (
                    <div key={award.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-indigo-200 transition-all group">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors">
                            <Trophy className="w-5 h-5 text-indigo-600" aria-hidden />
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">{award.title}</h3>
                        {award.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{award.description}</p>
                        )}
                    </div>
                ))}
            </div>
            {nominateUrl && nominateUrl !== '#' && (
                <div className="text-center mt-8">
                    <a href={nominateUrl} className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold hover:text-indigo-700 text-sm">
                        View all categories &amp; apply <ChevronRight className="w-4 h-4" aria-hidden />
                    </a>
                </div>
            )}
        </SectionWrapper>
    );
}

// AUTO ROUNDS
function AutoRoundsSection({ section, payload }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle || section.subtitle;
    const rounds = [...(payload.rounds || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    if (rounds.length === 0) return null;

    return (
        <SectionWrapper id="rounds" bg="bg-white">
            <SectionHeading title={title} subtitle={subtitle} />
            <div className="max-w-4xl mx-auto relative">
                <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-indigo-100 hidden sm:block" aria-hidden />
                <ol className="space-y-5">
                    {rounds.map((round, index) => {
                        const status = ROUND_STATUS[round.status] || ROUND_STATUS.upcoming;
                        return (
                            <li key={round.id} className="flex gap-4 sm:gap-6">
                                <div className="relative flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm z-10 shadow-md shadow-indigo-200">
                                    {index + 1}
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <div>
                                            <h3 className="font-bold text-slate-900">{round.title}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {formatDate(round.start_date)} – {formatDate(round.end_date)}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${status.cls}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    {round.description && (
                                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{round.description}</p>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </SectionWrapper>
    );
}

// AUTO KEY DATES
function AutoKeyDatesSection({ section, payload }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle || section.subtitle;
    const deadline = payload.schedule?.deadline || payload.program.deadline;
    const milestones = (payload.schedule?.milestones || []).filter(m => m.is_visible !== false);

    if (!deadline && milestones.length === 0) return null;

    return (
        <SectionWrapper id="key-dates" bg="bg-slate-50">
            <SectionHeading title={title} subtitle={subtitle} />
            <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-4">
                {deadline && (
                    <div className="bg-indigo-600 text-white rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-indigo-200" aria-hidden />
                            <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Application Deadline</span>
                        </div>
                        <p className="font-bold text-lg">{formatDate(deadline)}</p>
                        {payload.program.timezone && (
                            <p className="text-xs text-indigo-200 mt-1">{payload.program.timezone}</p>
                        )}
                    </div>
                )}
                {milestones.map(m => (
                    <div key={m.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-indigo-400" aria-hidden />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{m.title}</span>
                        </div>
                        <p className="font-bold text-slate-900">{formatDate(m.date)}</p>
                        {m.description && <p className="text-xs text-slate-500 mt-1">{m.description}</p>}
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}

// AUTO FAQS
function AutoFaqsSection({ section, payload }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle || section.subtitle;
    const faqs = (payload.faqs || []).filter(f => f.is_visible !== false);
    const [openIdx, setOpenIdx] = useState<number | null>(null);

    if (faqs.length === 0) return null;

    return (
        <SectionWrapper id="faqs" bg="bg-white">
            <SectionHeading title={title} subtitle={subtitle} />
            <div className="max-w-3xl mx-auto space-y-2">
                {faqs.map((faq, i) => (
                    <div key={faq.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setOpenIdx(openIdx === i ? null : i)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left bg-white hover:bg-slate-50 transition-colors"
                            aria-expanded={openIdx === i}
                        >
                            <span className="font-semibold text-slate-900 text-sm pr-4">{faq.question}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} aria-hidden />
                        </button>
                        {openIdx === i && (
                            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
                                <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}

// AUTO SPONSORS
function AutoSponsorsSection({ section, payload }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle || section.subtitle;
    const sponsors = (payload.sponsors || []).filter(s => s.is_active !== false);

    if (sponsors.length === 0) return null;

    return (
        <SectionWrapper id="sponsors" bg="bg-slate-50">
            <SectionHeading title={title} subtitle={subtitle} />
            <div className="flex flex-wrap justify-center items-center gap-8">
                {sponsors.map(s => (
                    <div key={s.id} className="flex flex-col items-center gap-2">
                        {s.logo_url ? (
                            s.website_url ? (
                                <a href={s.website_url} target="_blank" rel="noopener noreferrer" title={s.name}>
                                    <img src={s.logo_url} alt={s.name} className="h-12 max-w-[140px] object-contain grayscale hover:grayscale-0 transition-all" />
                                </a>
                            ) : (
                                <img src={s.logo_url} alt={s.name} className="h-12 max-w-[140px] object-contain grayscale" />
                            )
                        ) : (
                            <span className="text-sm font-semibold text-slate-700">{s.name}</span>
                        )}
                        {s.tier_label && <span className="text-xs text-slate-400">{s.tier_label}</span>}
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}

// HIGHLIGHTS
function HighlightsSection({ section }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle || section.subtitle;
    const items: Array<{ title: string; description?: string }> = content.items || [];

    if (items.length === 0) return null;

    return (
        <SectionWrapper id={`section-${section.id}`} bg="bg-white">
            <SectionHeading title={title} subtitle={subtitle} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((item, i) => (
                    <div key={i} className="border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                            <Zap className="w-4 h-4 text-indigo-600" aria-hidden />
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                        {item.description && <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>}
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}

// PROCESS
function ProcessSection({ section }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle || section.subtitle;
    const steps: Array<{ title: string; description?: string }> = content.steps || [];

    if (steps.length === 0) return null;

    return (
        <SectionWrapper id={`section-${section.id}`} bg="bg-slate-50">
            <SectionHeading title={title} subtitle={subtitle} />
            <div className="max-w-3xl mx-auto">
                <ol className="space-y-5">
                    {steps.map((step, i) => (
                        <li key={i} className="flex gap-4">
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                {i + 1}
                            </div>
                            <div className="pt-1">
                                <h3 className="font-bold text-slate-900">{step.title}</h3>
                                {step.description && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{step.description}</p>}
                            </div>
                        </li>
                    ))}
                </ol>
            </div>
        </SectionWrapper>
    );
}

// ELIGIBILITY
function EligibilitySection({ section }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle || section.subtitle;
    const items: string[] = content.items || [];

    if (items.length === 0) return null;

    return (
        <SectionWrapper id={`section-${section.id}`} bg="bg-white">
            <SectionHeading title={title} subtitle={subtitle} />
            <div className="max-w-2xl mx-auto">
                <ul className="space-y-3" role="list">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" aria-hidden />
                            <span className="text-slate-700 text-sm">{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </SectionWrapper>
    );
}

// FAQ (manual)
function FaqSection({ section }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    // Support both content.items and content.faqs (legacy)
    const items: Array<{ question: string; answer: string }> = content.items || content.faqs || [];
    const [openIdx, setOpenIdx] = useState<number | null>(null);

    if (items.length === 0) return null;

    return (
        <SectionWrapper id={`section-${section.id}`} bg="bg-slate-50">
            <SectionHeading title={title} />
            <div className="max-w-3xl mx-auto space-y-2">
                {items.map((item, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setOpenIdx(openIdx === i ? null : i)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left bg-white hover:bg-slate-50 transition-colors"
                            aria-expanded={openIdx === i}
                        >
                            <span className="font-semibold text-slate-900 text-sm pr-4">{item.question}</span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} aria-hidden />
                        </button>
                        {openIdx === i && (
                            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
                                <p className="text-sm text-slate-600 leading-relaxed">{item.answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}

// RICH TEXT
function RichTextSection({ section }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const body = content.body || content.content;

    if (!body) return null;

    return (
        <SectionWrapper id={`section-${section.id}`} bg="bg-white">
            <div className="max-w-3xl mx-auto">
                {title && <h2 className="text-2xl font-bold text-slate-900 mb-6">{title}</h2>}
                <div
                    className="prose prose-slate max-w-none text-slate-600"
                    dangerouslySetInnerHTML={{ __html: body }}
                />
            </div>
        </SectionWrapper>
    );
}

// TERMS
function TermsSection({ section }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title || 'Terms & Conditions';
    const body = content.body;

    if (!body) return null;

    return (
        <SectionWrapper id={`section-${section.id}`} bg="bg-slate-50">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">{title}</h2>
                <div
                    className="prose prose-slate max-w-none text-slate-600 text-sm"
                    dangerouslySetInnerHTML={{ __html: body }}
                />
            </div>
        </SectionWrapper>
    );
}

// SPONSORS (manual)
function SponsorsSection({ section }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle || section.subtitle;
    const items: Array<{ name: string; logoUrl?: string; websiteUrl?: string }> = content.items || [];

    if (items.length === 0) return null;

    return (
        <SectionWrapper id={`section-${section.id}`} bg="bg-white">
            <SectionHeading title={title} subtitle={subtitle} />
            <div className="flex flex-wrap justify-center items-center gap-10">
                {items.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        {s.logoUrl ? (
                            s.websiteUrl ? (
                                <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" title={s.name}>
                                    <img src={s.logoUrl} alt={s.name} className="h-12 max-w-[140px] object-contain grayscale hover:grayscale-0 transition-all" />
                                </a>
                            ) : (
                                <img src={s.logoUrl} alt={s.name} className="h-12 max-w-[140px] object-contain grayscale" />
                            )
                        ) : (
                            <span className="text-sm font-semibold text-slate-700 px-4 py-2 border border-slate-200 rounded-lg">{s.name}</span>
                        )}
                    </div>
                ))}
            </div>
        </SectionWrapper>
    );
}

// CTA
function CtaSection({ section, nominateUrl, nominateButtonText }: SectionProps) {
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle;
    const buttonText = content.buttonText || content.primaryCtaText || nominateButtonText;
    const ctaLink = nominateUrl && nominateUrl !== '#' ? nominateUrl : content.primaryCtaLink;
    const hasLink = ctaLink && ctaLink !== '#';

    if (!title && !hasLink) return null;

    return (
        <section id={`section-${section.id}`} className="py-20 px-4 bg-indigo-600">
            <div className="max-w-2xl mx-auto text-center">
                {title && <h2 className="text-3xl font-bold text-white mb-3">{title}</h2>}
                {subtitle && <p className="text-indigo-200 mb-8 text-base leading-relaxed">{subtitle}</p>}
                {hasLink && (
                    <a href={ctaLink} className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold text-base sm:text-lg px-10 py-4 rounded-full hover:bg-indigo-50 transition-colors shadow-xl">
                        {buttonText} <ArrowRight className="w-5 h-5" aria-hidden />
                    </a>
                )}
            </div>
        </section>
    );
}

// LEGACY: old section types from existing programs (categories, process, timeline, highlights)
function LegacySection({ section, payload, nominateUrl, nominateButtonText }: SectionProps) {
    const type = section.section_type;
    const { content } = section;
    const title = content.title || section.title;
    const subtitle = content.subtitle || section.subtitle;

    // Map old section types to new renderers where possible
    if (type === 'categories') {
        // Old categories section has static content.items — render as highlights grid
        const items: Array<{ title: string; description?: string }> = content.items || [];
        if (items.length === 0) return null;
        return (
            <SectionWrapper id={`section-${section.id}`} bg="bg-slate-50">
                <SectionHeading title={title} subtitle={subtitle} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                            <Trophy className="w-5 h-5 text-indigo-500 mb-3" aria-hidden />
                            <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                            {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                        </div>
                    ))}
                </div>
                {content.ctaText && nominateUrl && nominateUrl !== '#' && (
                    <div className="text-center mt-6">
                        <a href={nominateUrl} className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold hover:text-indigo-700 text-sm">
                            {content.ctaText} <ChevronRight className="w-4 h-4" aria-hidden />
                        </a>
                    </div>
                )}
            </SectionWrapper>
        );
    }

    if (type === 'process') {
        const steps: Array<{ title: string; description?: string }> = content.steps || [];
        return (
            <SectionWrapper id={`section-${section.id}`} bg="bg-slate-50">
                <SectionHeading title={title} subtitle={subtitle} />
                <div className="max-w-3xl mx-auto">
                    <ol className="space-y-5">
                        {steps.map((step, i) => (
                            <li key={i} className="flex gap-4">
                                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                                    {i + 1}
                                </div>
                                <div className="pt-1">
                                    <h3 className="font-bold text-slate-900">{step.title}</h3>
                                    {step.description && <p className="text-sm text-slate-500 mt-1">{step.description}</p>}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </SectionWrapper>
        );
    }

    if (type === 'timeline') {
        const dates: Array<{ label: string; value: string }> = content.dates || [];
        if (dates.length === 0) return null;
        return (
            <SectionWrapper id={`section-${section.id}`} bg="bg-slate-50">
                <SectionHeading title={title} subtitle={subtitle} />
                <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-4">
                    {dates.map((d, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-indigo-400" aria-hidden />
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{d.label}</span>
                            </div>
                            <p className="font-bold text-slate-900">{d.value}</p>
                        </div>
                    ))}
                </div>
            </SectionWrapper>
        );
    }

    if (type === 'highlights') {
        const items: Array<{ title: string; description?: string }> = content.items || [];
        return (
            <SectionWrapper id={`section-${section.id}`} bg="bg-white">
                <SectionHeading title={title} subtitle={subtitle} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {items.map((item, i) => (
                        <div key={i} className="border border-slate-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
                            <Zap className="w-5 h-5 text-indigo-500 mb-3" aria-hidden />
                            <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                            {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                        </div>
                    ))}
                </div>
            </SectionWrapper>
        );
    }

    if (type === 'eligibility') {
        const items: string[] = content.items || [];
        return (
            <SectionWrapper id={`section-${section.id}`} bg="bg-slate-50">
                <SectionHeading title={title} subtitle={subtitle || content.description} />
                <div className="max-w-2xl mx-auto">
                    <ul className="space-y-3" role="list">
                        {items.map((item, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" aria-hidden />
                                <span className="text-slate-700 text-sm">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </SectionWrapper>
        );
    }

    if (type === 'faq') {
        const items: Array<{ question: string; answer: string }> = content.faqs || content.items || [];
        const proxy: PublicSection = { ...section, section_type: 'faq', content: { ...content, items } };
        return <FaqSection section={proxy} payload={{} as any} nominateUrl={nominateUrl} nominateButtonText={nominateButtonText} />;
    }

    if (type === 'custom') {
        const body = content.content || content.body;
        if (!body) return null;
        return (
            <SectionWrapper id={`section-${section.id}`} bg="bg-white">
                <div className="max-w-3xl mx-auto prose prose-slate" dangerouslySetInnerHTML={{ __html: body }} />
            </SectionWrapper>
        );
    }

    return null;
}

// ─── Main Dispatcher ────────────────────────────────────────────────────────

export const PublicSectionRenderer: React.FC<SectionProps> = (props) => {
    const { section } = props;
    const type = section.section_type;

    if (section.is_visible === false) return null;

    switch (type) {
        case 'hero': return <HeroSection {...props} />;
        case 'about': return <AboutSection {...props} />;
        case 'auto_categories': return <AutoCategoriesSection {...props} />;
        case 'auto_rounds': return <AutoRoundsSection {...props} />;
        case 'auto_key_dates': return <AutoKeyDatesSection {...props} />;
        case 'auto_faqs': return <AutoFaqsSection {...props} />;
        case 'auto_sponsors': return <AutoSponsorsSection {...props} />;
        case 'highlights': return <HighlightsSection {...props} />;
        case 'process': return <ProcessSection {...props} />;
        case 'eligibility': return <EligibilitySection {...props} />;
        case 'faq': return <FaqSection {...props} />;
        case 'rich_text': return <RichTextSection {...props} />;
        case 'terms': return <TermsSection {...props} />;
        case 'sponsors': return <SponsorsSection {...props} />;
        case 'cta': return <CtaSection {...props} />;
        // Legacy section types from old builder
        case 'categories':
        case 'process_legacy':
        case 'timeline':
        case 'eligibility_legacy':
        case 'custom':
        case 'navbar': // skip navbar — we render our own sticky nav
            if (type === 'navbar') return null;
            return <LegacySection {...props} />;
        default:
            return <LegacySection {...props} />;
    }
};
