import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { AlertCircle, CalendarDays, ChevronDown, Trophy, ArrowRight, Award, Sparkles, Layers3 } from 'lucide-react';
import { getPublicOverviewByProgramId, getPublicOverviewBySlug } from '../../services/overviewApi';
import { resolveMediaPublicUrl } from '../../services/supabase';
import { queryKeys } from '../../services/queryKeys';
import { Footer } from '../Footer';
import { type PublicPagePayload } from './PublicPageSections';

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return 'TBA';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return dateStr; }
}

function calcTimeLeft(deadline?: string | null) {
    if (!deadline) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
    };
}

function useCountdown(deadline?: string | null) {
    const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(deadline));
    useEffect(() => {
        if (!deadline) return;
        const id = setInterval(() => setTimeLeft(calcTimeLeft(deadline)), 1000);
        return () => clearInterval(id);
    }, [deadline]);
    return timeLeft;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const CountdownBadge: React.FC<{ deadline?: string }> = ({ deadline }) => {
    const { days, hours, minutes, seconds, expired } = useCountdown(deadline);
    if (!deadline || expired) return null;
    return (
        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-3 rounded-2xl">
            {([['d', days], ['h', hours], ['m', minutes], ['s', seconds]] as [string, number][]).map(([unit, val]) => (
                <div key={unit} className="text-center min-w-[2rem]">
                    <div className="text-2xl font-extrabold text-white tabular-nums leading-none">{String(val).padStart(2, '0')}</div>
                    <div className="text-[10px] text-white/60 uppercase tracking-wider mt-0.5">{unit}</div>
                </div>
            ))}
        </div>
    );
};

const StickyNav: React.FC<{ title: string; nominateUrl: string; ctaText: string }> = ({ title, nominateUrl, ctaText }) => {
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 80);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, []);
    return (
        <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                <span className={`font-bold text-base truncate transition-colors duration-300 ${scrolled ? 'text-slate-900' : 'text-white drop-shadow'}`}>
                    {title}
                </span>
                <a href={nominateUrl}
                    className="flex-shrink-0 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-full transition-colors shadow-md">
                    {ctaText}
                </a>
            </div>
        </nav>
    );
};

const FaqAccordion: React.FC<{ items: any[] }> = ({ items }) => {
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    return (
        <div className="space-y-2">
            {items.map((item, i) => (
                <div key={item.id || i} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button type="button" onClick={() => setOpenIdx(openIdx === i ? null : i)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                        <span className="font-semibold text-slate-900 text-sm pr-4">{item.question}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${openIdx === i ? 'rotate-180' : ''}`} />
                    </button>
                    {openIdx === i && (
                        <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                            {item.answer}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const PublicProgramPage: React.FC = () => {
    const { slug: slugParam } = useParams<{ slug?: string }>();
    const params = new URLSearchParams(window.location.search);
    const programId = params.get('id');

    const { data, isLoading, error } = useQuery<PublicPagePayload | null>({
        queryKey: slugParam
            ? queryKeys.overview.publicBySlug(slugParam)
            : queryKeys.overview.publicByProgramId(programId || 'missing'),
        queryFn: async () => {
            if (slugParam) return getPublicOverviewBySlug(slugParam);
            if (programId) return getPublicOverviewByProgramId(programId);
            throw new Error('Program ID or slug is required');
        },
        retry: false,
    });

    const categories = data?.awards || [];
    const categoryHierarchy = useMemo(() => {
        const normalized = categories.map((cat: any, index: number) => ({
            ...cat,
            _key: String(cat?.id ?? `category-${index}`),
            _title: cat?.title || cat?.name || 'Untitled Category',
            _description: cat?.description || '',
            _parentKey: cat?.parent_id != null
                ? String(cat.parent_id)
                : cat?.parentId != null
                    ? String(cat.parentId)
                    : '',
        }));

        const byKey = new Map<string, any>();
        normalized.forEach((cat: any) => byKey.set(cat._key, cat));

        const roots: any[] = [];
        const childrenByParent: Record<string, any[]> = {};

        normalized.forEach((cat: any) => {
            if (cat._parentKey && byKey.has(cat._parentKey)) {
                if (!childrenByParent[cat._parentKey]) childrenByParent[cat._parentKey] = [];
                childrenByParent[cat._parentKey].push(cat);
            } else {
                roots.push(cat);
            }
        });

        return { roots, childrenByParent };
    }, [categories]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400" />
            </div>
        );
    }

    if (error || !data?.program) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center px-4">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Program Not Found</h1>
                    <p className="text-slate-500">{(error as Error)?.message || "We couldn't find this program."}</p>
                </div>
            </div>
        );
    }

    // ── Derive values from sections + payload ──────────────────────────────────
    const sections = data.sections || [];
    const heroSection = sections.find((s: any) => s.section_type === 'hero');
    const aboutSection = sections.find((s: any) => s.section_type === 'about');

    const coverImage: string =
        resolveMediaPublicUrl(heroSection?.content?.backgroundImage || data.program.cover_image_url) || '';
    const tagline: string = heroSection?.content?.subtitle || '';
    const rawCtaLink = heroSection?.content?.primaryCtaLink || '';
    const nominateUrl: string =
        rawCtaLink && rawCtaLink !== '#'
            ? rawCtaLink
            : data.program.active_form_id
                ? `/form/${data.program.active_form_id}`
                : '#';
    const nominateButtonText: string = heroSection?.content?.primaryCtaText || 'Nominate Now';

    const aboutLead: string = aboutSection?.content?.lead || '';
    const aboutBody: string = aboutSection?.content?.body || aboutSection?.content?.description || data.program.description || '';

    const deadline: string | undefined = (data.schedule as any)?.deadline || data.program.deadline;
    const rounds = data.rounds || [];
    const milestones: any[] = (data.schedule as any)?.milestones || [];
    const faqs = data.faqs || [];
    const sponsors = data.sponsors || [];

    const hasAbout = !!(aboutLead || aboutBody);
    const hasCategories = categories.length > 0;
    const hasRounds = rounds.length > 0;
    const hasDates = milestones.length > 0 || !!deadline;
    const hasFaqs = faqs.length > 0;
    const hasSponsors = sponsors.length > 0;

    const countLeafAwards = (nodeKey: string): number => {
        const children = categoryHierarchy.childrenByParent[nodeKey] || [];
        if (children.length === 0) return 1;
        return children.reduce((sum: number, child: any) => sum + countLeafAwards(child._key), 0);
    };

    const countAllNestedNodes = (nodeKey: string): number => {
        const children = categoryHierarchy.childrenByParent[nodeKey] || [];
        return children.reduce((sum: number, child: any) => sum + 1 + countAllNestedNodes(child._key), 0);
    };

    const totalAwardEntries = categoryHierarchy.roots.reduce(
        (sum: number, root: any) => sum + countLeafAwards(root._key),
        0,
    );
    const totalNestedNodes = categoryHierarchy.roots.reduce(
        (sum: number, root: any) => sum + countAllNestedNodes(root._key),
        0,
    );

    const renderCategoryLevel = (parentKey: string, depth = 1): React.ReactNode => {
        const nodes = categoryHierarchy.childrenByParent[parentKey] || [];
        if (nodes.length === 0) return null;

        const headingByDepth: Record<number, string> = {
            1: 'Subcategories',
            2: 'Awards',
        };
        const heading = headingByDepth[depth] || 'More Categories';

        return (
            <div className={depth > 1 ? 'mt-3 ml-4 border-l-2 border-indigo-100/80 pl-4' : ''}>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.14em] mb-2">{heading}</p>
                <ul className="space-y-2">
                    {nodes.map((node: any) => {
                        const childNodes = categoryHierarchy.childrenByParent[node._key] || [];
                        const hasChildren = childNodes.length > 0;
                        const awardCount = countLeafAwards(node._key);

                        return (
                            <li key={node._key} className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-800 truncate">{node._title}</p>
                                        {node._description && (
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{node._description}</p>
                                        )}
                                    </div>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${
                                        hasChildren
                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    }`}>
                                        <Award className="w-3 h-3" />
                                        {hasChildren ? `${awardCount} awards` : 'Award'}
                                    </span>
                                </div>
                                {hasChildren && renderCategoryLevel(node._key, depth + 1)}
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-white font-sans antialiased">
            <StickyNav title={data.program.title} nominateUrl={nominateUrl} ctaText={nominateButtonText} />

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="relative min-h-[580px] md:min-h-[660px] flex items-end overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-slate-900">
                    {coverImage && (
                        <img src={coverImage} alt="" className="w-full h-full object-cover opacity-65" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />
                </div>

                <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 pb-16 pt-28">
                    {deadline && (
                        <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
                            <CalendarDays className="w-3.5 h-3.5" />
                            Deadline: {formatDate(deadline)}
                        </div>
                    )}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight max-w-4xl">
                        {data.program.title}
                    </h1>
                    {tagline && (
                        <p className="mt-4 text-lg md:text-xl text-white/75 max-w-2xl leading-relaxed">{tagline}</p>
                    )}
                    <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
                        <a href={nominateUrl}
                            className="inline-flex items-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-base font-bold rounded-xl transition-colors shadow-2xl">
                            {nominateButtonText}
                            <ArrowRight className="w-4 h-4" />
                        </a>
                        <CountdownBadge deadline={deadline} />
                    </div>
                </div>
            </section>

            {/* ── Stats bar ────────────────────────────────────────────────── */}
            {(hasCategories || hasRounds || deadline) && (
                <section className="bg-slate-900 text-white border-t border-white/5">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap gap-8 justify-center sm:justify-start">
                        {hasCategories && (
                            <div className="flex items-center gap-2.5">
                                <Trophy className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                <span className="text-2xl font-bold tabular-nums">{categories.length}</span>
                                <span className="text-slate-400 text-sm">Award {categories.length === 1 ? 'Category' : 'Categories'}</span>
                            </div>
                        )}
                        {hasRounds && (
                            <div className="flex items-center gap-2.5">
                                <span className="text-2xl font-bold tabular-nums">{rounds.length}</span>
                                <span className="text-slate-400 text-sm">Program {rounds.length === 1 ? 'Round' : 'Rounds'}</span>
                            </div>
                        )}
                        {deadline && (
                            <div className="flex items-center gap-2.5">
                                <CalendarDays className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                <span className="text-slate-300 text-sm">Closes <strong className="text-white font-semibold">{formatDate(deadline)}</strong></span>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── About ────────────────────────────────────────────────────── */}
            {hasAbout && (
                <section className="py-16 md:py-24">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6">
                        <h2 className="text-3xl font-bold text-slate-900 mb-6">About the Program</h2>
                        {aboutLead && (
                            <p className="text-xl text-slate-700 font-medium leading-relaxed mb-5">{aboutLead}</p>
                        )}
                        {aboutBody && (
                            <div className="prose prose-slate prose-lg max-w-none text-slate-600"
                                dangerouslySetInnerHTML={{ __html: aboutBody }} />
                        )}
                    </div>
                </section>
            )}

            {/* ── Award Categories ─────────────────────────────────────────── */}
            {hasCategories && (
                <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <div className="mb-8 rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8 relative overflow-hidden">
                            <div className="absolute inset-y-0 right-0 w-56 bg-gradient-to-l from-indigo-50/80 to-transparent pointer-events-none" />
                            <div className="relative">
                                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 mb-3">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Awards Directory
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Award Categories</h2>
                                <p className="text-slate-500 mt-2 text-base">
                                Recognizing excellence across {categories.length} {categories.length === 1 ? 'category' : 'categories'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.14em]">Primary Categories</p>
                                <p className="text-3xl font-black text-slate-900 mt-1 leading-none">{categoryHierarchy.roots.length}</p>
                            </div>
                            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white px-4 py-3.5 shadow-sm">
                                <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.14em]">Total Award Entries</p>
                                <p className="text-3xl font-black text-indigo-700 mt-1 leading-none">{totalAwardEntries}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.14em] flex items-center gap-1.5">
                                    <Layers3 className="w-3.5 h-3.5" />
                                    Nested Structure
                                </p>
                                <p className="text-3xl font-black text-slate-900 mt-1 leading-none">
                                    {totalNestedNodes}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {categoryHierarchy.roots.map((root: any) => {
                                const children = categoryHierarchy.childrenByParent[root._key] || [];
                                const totalRootAwards = countLeafAwards(root._key);
                                return (
                                    <details key={root._key} className="group bg-white rounded-2xl border border-slate-200 open:border-indigo-300 open:shadow-md overflow-hidden transition-all">
                                        <summary className="list-none cursor-pointer flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/70 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                                    <Trophy className="w-4 h-4" />
                                                </span>
                                                <div className="min-w-0">
                                                    <span className="text-base font-bold text-slate-900 truncate block">{root._title}</span>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em]">
                                                            {children.length} subcategories
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.12em]">
                                                            {totalRootAwards} awards
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
                                        </summary>

                                        {(root._description || children.length > 0) && (
                                            <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50/40">
                                                {root._description && (
                                                    <p className="text-sm text-slate-500 leading-relaxed">{root._description}</p>
                                                )}

                                                {children.length > 0 && renderCategoryLevel(root._key)}
                                            </div>
                                        )}
                                    </details>
                                );
                            })}
                        </div>
                        <div className="mt-10 text-center">
                            <a href={nominateUrl}
                                className="inline-flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors text-sm">
                                {nominateButtonText} <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Program Rounds ───────────────────────────────────────────── */}
            {hasRounds && (
                <section className="py-16 md:py-24">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6">
                        <div className="mb-10">
                            <h2 className="text-3xl font-bold text-slate-900">Program Rounds</h2>
                            <p className="text-slate-500 mt-2">How the evaluation process works, step by step</p>
                        </div>
                        <div>
                            {rounds.map((round: any, i: number) => {
                                const isActive = ['active', 'open'].includes(round.status);
                                const isComplete = ['completed', 'closed'].includes(round.status);
                                return (
                                    <div key={round.id || i} className="flex gap-5">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm ${
                                                isComplete ? 'bg-emerald-600 text-white' :
                                                isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                                                'bg-slate-200 text-slate-600'
                                            }`}>
                                                {i + 1}
                                            </div>
                                            {i < rounds.length - 1 && (
                                                <div className="w-px flex-1 bg-slate-200 my-2 min-h-[1.5rem]" />
                                            )}
                                        </div>
                                        <div className="pb-7 pt-1.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="font-bold text-slate-900">{round.title}</h3>
                                                {isActive && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wide">Active</span>
                                                )}
                                                {isComplete && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">Complete</span>
                                                )}
                                            </div>
                                            {round.description && (
                                                <p className="text-sm text-slate-500 leading-relaxed">{round.description}</p>
                                            )}
                                            {(round.start_date || round.end_date) && (
                                                <p className="text-xs text-slate-400 mt-1.5">
                                                    {[round.start_date && formatDate(round.start_date), round.end_date && formatDate(round.end_date)].filter(Boolean).join(' — ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Important Dates ──────────────────────────────────────────── */}
            {hasDates && (
                <section className="py-16 md:py-24 bg-slate-50">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6">
                        <h2 className="text-3xl font-bold text-slate-900 mb-10">Important Dates</h2>
                        <div className="space-y-3">
                            {milestones.map((m: any, i: number) => (
                                <div key={m.id || i} className="flex items-start gap-4 bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <CalendarDays className="w-4 h-4 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">{m.title || m.name}</p>
                                        <p className="text-sm text-indigo-600 font-medium mt-0.5">
                                            {formatDate(m.date || m.deadline || m.due_date)}
                                        </p>
                                        {m.description && <p className="text-xs text-slate-500 mt-1">{m.description}</p>}
                                    </div>
                                </div>
                            ))}
                            {deadline && (
                                <div className="flex items-start gap-4 bg-indigo-600 rounded-xl p-4">
                                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <CalendarDays className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">Application Deadline</p>
                                        <p className="text-sm text-indigo-200 font-medium mt-0.5">{formatDate(deadline)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* ── FAQs ─────────────────────────────────────────────────────── */}
            {hasFaqs && (
                <section className="py-16 md:py-24">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6">
                        <h2 className="text-3xl font-bold text-slate-900 mb-10">Frequently Asked Questions</h2>
                        <FaqAccordion items={faqs} />
                    </div>
                </section>
            )}

            {/* ── Sponsors ─────────────────────────────────────────────────── */}
            {hasSponsors && (
                <section className="py-12 bg-slate-50 border-t border-slate-100">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">Sponsors &amp; Partners</p>
                        <div className="flex flex-wrap gap-8 items-center justify-center">
                            {sponsors.map((s: any, i: number) => (
                                <div key={s.id || i} className="opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
                                    {s.logo_url ? (
                                        <img src={s.logo_url} alt={s.name} className="h-8 object-contain" />
                                    ) : (
                                        <span className="text-sm font-bold text-slate-600">{s.name}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Bottom CTA ───────────────────────────────────────────────── */}
            <section className="py-20 md:py-28 bg-indigo-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-800" />
                <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                        Ready to be recognized?
                    </h2>
                    <p className="text-indigo-200 text-lg mb-10">
                        {deadline
                            ? `Applications close ${formatDate(deadline)}. Don't miss your chance.`
                            : "Don't miss your chance to apply."}
                    </p>
                    <a href={nominateUrl}
                        className="inline-flex items-center gap-3 px-10 py-4 bg-white text-indigo-700 font-bold text-base rounded-xl hover:bg-indigo-50 transition-colors shadow-2xl">
                        {nominateButtonText}
                        <ArrowRight className="w-5 h-5" />
                    </a>
                </div>
            </section>

            <Footer />
        </div>
    );
};
