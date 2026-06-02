import React, { useEffect, useState } from 'react';
import { programPages, programs, storage } from '../../../services/supabase';
import { db } from '../../../services/database';
import { Save, Rocket, Check, X, Info, ExternalLink } from 'lucide-react';
import { Button } from '../../Button';
import { getProgramMediaAssets, invalidateOverviewCache } from '../../../services/overviewApi';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PageBuilderProps { programId: string; }

// ─── Helpers ────────────────────────────────────────────────────────────────

const safeClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function findSection(sections: any[], type: string) {
    return sections.find(s => (s.section_type || s.type) === type);
}

function makeHeroSection(programId: string, id?: string) {
    return {
        id: id || `temp-hero-${Date.now()}`,
        program_id: programId,
        section_type: 'hero',
        title: 'Hero',
        content: { subtitle: '', backgroundImage: '', primaryCtaText: 'Nominate Now', primaryCtaLink: '#' },
        settings: {},
        sort_order: 0,
        is_visible: true,
    };
}

function makeAboutSection(programId: string, id?: string) {
    return {
        id: id || `temp-about-${Date.now()}`,
        program_id: programId,
        section_type: 'about',
        title: 'About',
        content: { title: '', lead: '', body: '' },
        settings: {},
        sort_order: 1,
        is_visible: true,
    };
}

// ─── Label ───────────────────────────────────────────────────────────────────

const Label: React.FC<{ children: React.ReactNode; hint?: string; required?: boolean }> = ({ children, hint, required }) => (
    <label className="block">
        <span className="text-xs font-semibold text-slate-700">
            {children}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
        </span>
        {hint && <span className="text-xs text-slate-400 font-normal ml-1.5">— {hint}</span>}
    </label>
);

// ─── PageBuilder ─────────────────────────────────────────────────────────────

export const PageBuilder: React.FC<PageBuilderProps> = ({ programId }) => {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [isPublished, setIsPublished] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [programSlug, setProgramSlug] = useState<string | null>(null);
    const [savedOk, setSavedOk] = useState(false);
    const [publishAttempted, setPublishAttempted] = useState(false);

    // ── 4 fields ─────────────────────────────────────────────────────────────
    const [coverImage, setCoverImage] = useState('');
    const [tagline, setTagline] = useState('');
    const [aboutLead, setAboutLead] = useState('');
    const [aboutBody, setAboutBody] = useState('');
    const [primaryCta, setPrimaryCta] = useState('Nominate Now');
    const [nominationFormId, setNominationFormId] = useState('');

    // ── Infrastructure ────────────────────────────────────────────────────────
    const [coverImageUploading, setCoverImageUploading] = useState(false);
    const [heroSection, setHeroSection] = useState<any>(null);
    const [aboutSection, setAboutSection] = useState<any>(null);
    const [availableForms, setAvailableForms] = useState<Array<{ id: string; title: string }>>([]);
    const [mediaAssets, setMediaAssets] = useState<Array<{ name: string; url: string | null }>>([]);
    const hasNominationForm = nominationFormId.trim().length > 0;

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const [configRes, sectionsRes, programRes, formsRes] = await Promise.all([
                    programPages.getConfig(programId),
                    programPages.getSections(programId),
                    programs.getById(programId),
                    db.getForms(programId),
                ]);

                const loadedSections = sectionsRes.data || [];
                const hero = findSection(loadedSections, 'hero') || makeHeroSection(programId);
                const about = findSection(loadedSections, 'about') || makeAboutSection(programId);

                setConfig(configRes.data || {});
                setIsPublished(!!configRes.data?.is_published);
                setProgramSlug(programRes.data?.slug || null);
                setHeroSection(hero);
                setAboutSection(about);
                const rawCover = hero.content?.backgroundImage || programRes.data?.cover_image_url || '';
                let resolvedCover = rawCover;
                if (rawCover && !/^https?:\/\//i.test(rawCover)) {
                    try {
                        const assets = await getProgramMediaAssets(programId);
                        const match = assets.find(
                            (asset) =>
                                asset.url === rawCover ||
                                asset.name === rawCover ||
                                asset.url?.includes(rawCover) ||
                                asset.name?.includes(rawCover),
                        );
                        resolvedCover = match?.url || rawCover;
                    } catch {
                        resolvedCover = rawCover;
                    }
                }
                setCoverImage(resolvedCover);
                setTagline(hero.content?.subtitle || '');
                setPrimaryCta(hero.content?.primaryCtaText || 'Nominate Now');
                setAboutLead(about.content?.lead || '');
                setAboutBody(about.content?.body || about.content?.description || programRes.data?.description || '');
                setAvailableForms((formsRes || []).map((f: any) => ({ id: f.id, title: f.title })));

                const ctaLink = String(hero.content?.primaryCtaLink || '');
                const m = ctaLink.match(/\/form\/([^/?#]+)/);
                if (m?.[1]) setNominationFormId(m[1]);
            } catch (err) {
                console.error('PageBuilder load error:', err);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [programId]);

    useEffect(() => {
        if (authLoading || !isAuthenticated) return;
        getProgramMediaAssets(programId)
            .then(assets => setMediaAssets((assets || []).filter((a: any) => !!a?.url)))
            .catch((err) => console.warn('PageBuilder: failed to load media assets', err));
    }, [programId, isAuthenticated, authLoading]);

    // ── Save ──────────────────────────────────────────────────────────────────
    const buildSections = () => {
        const ctaLink = nominationFormId ? `/form/${nominationFormId}?requireSignIn=1&source=nominate` : '#';
        const hero = safeClone(heroSection || makeHeroSection(programId));
        hero.content = {
            ...hero.content,
            backgroundImage: coverImage,
            subtitle: tagline,
            primaryCtaText: primaryCta || 'Nominate Now',
            primaryCtaLink: ctaLink,
        };
        const about = safeClone(aboutSection || makeAboutSection(programId));
        about.content = {
            ...about.content,
            lead: aboutLead,
            body: aboutBody,
            description: aboutBody,
        };
        return [hero, about];
    };

    const saveAll = async (publish: boolean) => {
        const basePayload = {
            ...(config || {}),
            is_published: publish ? true : !!config?.is_published,
            published_at: publish ? new Date().toISOString() : config?.published_at || null,
        };

        const { data: updatedConfig, error: configErr } = await programPages.createOrUpdateConfig(programId, basePayload);
        if (configErr) throw configErr;

        const sections = buildSections();
        const results = await Promise.all(sections.map((s, i) => programPages.saveSection({ ...s, sort_order: i })));
        const saved = results.map(r => r.data).filter(Boolean);
        if (saved.length >= 2) {
            const savedHero = saved.find((s: any) => s.section_type === 'hero');
            const savedAbout = saved.find((s: any) => s.section_type === 'about');
            if (savedHero) setHeroSection(savedHero);
            if (savedAbout) setAboutSection(savedAbout);
        }
        setConfig(updatedConfig || basePayload);
        if (publish) setIsPublished(true);

        void invalidateOverviewCache(programId).catch((err) => {
            console.warn('PageBuilder: failed to invalidate public overview cache', err);
        });
    };

    const handleSave = async () => {
        if (isSaving || isPublishing) return;
        setIsSaving(true);
        try {
            await saveAll(false);
            setSavedOk(true);
            setTimeout(() => setSavedOk(false), 2500);
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (isSaving || isPublishing) return;
        setPublishAttempted(true);
        if (!hasNominationForm) {
            alert('Select a nomination form before publishing the landing page.');
            return;
        }
        setIsPublishing(true);
        try {
            await saveAll(true);
            setSavedOk(true);
            setTimeout(() => setSavedOk(false), 2500);
        } catch (err) {
            console.error('Publish error:', err);
            alert('Failed to publish. Please try again.');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleCopyShareLink = async () => {
        const url = programSlug
            ? `${window.location.origin}/program/${encodeURIComponent(programSlug)}`
            : `${window.location.origin}/program?id=${programId}`;
        try { await navigator.clipboard.writeText(url); } catch {
            const ta = document.createElement('textarea');
            ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
        }
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
    };

    const handlePreview = () => {
        const url = programSlug
            ? `${window.location.origin}/program/${encodeURIComponent(programSlug)}`
            : `${window.location.origin}/program?id=${programId}`;
        window.open(url, '_blank', 'noopener');
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                <p className="text-sm text-slate-500 mt-3">Loading page editor…</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] min-h-0 bg-slate-100">

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-2 flex-wrap shadow-sm z-10">
                <div className="flex items-center gap-2.5">
                    <h1 className="text-base font-bold text-slate-800">Landing Page</h1>
                    {isPublished && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Live</span>
                    )}
                    {savedOk && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Saved
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {isPublished && (
                        <button onClick={handlePreview} type="button"
                            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" /> Preview
                        </button>
                    )}
                    <Button variant="outline" onClick={handleCopyShareLink} disabled={!isPublished} title={isPublished ? 'Copy public link' : 'Publish first to copy link'}>
                        {shareCopied ? <><Check className="w-4 h-4 mr-1.5 text-emerald-600" />Copied</> : 'Copy Link'}
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || isPublishing}>
                        <Save className="w-4 h-4 mr-1.5" />
                        {isSaving ? 'Saving…' : 'Save Draft'}
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handlePublish} disabled={isPublishing || isSaving}>
                        <Rocket className="w-4 h-4 mr-1.5" />
                        {isPublishing ? 'Publishing…' : isPublished ? 'Republish' : 'Publish'}
                    </Button>
                </div>
            </div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8">
                <div className="w-full max-w-xl mx-auto space-y-5 pb-12">

                    {/* Auto-pull notice */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3.5 flex items-start gap-3">
                        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-indigo-800">
                            <span className="font-semibold">Award categories, rounds, and key dates</span> auto-populate from your program settings.
                            Just add a cover image, tagline, and link the nomination form.
                        </p>
                    </div>

                    {/* ── Card 1: Cover Image ─────────────────────────────── */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Cover Image</h3>
                            <p className="text-xs text-slate-500 mt-0.5">The hero background visitors see first</p>
                        </div>

                        {coverImage ? (
                            <div className="relative rounded-xl overflow-hidden h-44 bg-slate-100 group">
                                <img src={coverImage} alt="Cover" className="w-full h-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                <button type="button" onClick={() => setCoverImage('')}
                                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors" title="Remove">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-10 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                                <span className="text-3xl">🖼️</span>
                                <span className="text-sm font-medium text-slate-600 hover:text-indigo-600">
                                    {coverImageUploading ? 'Uploading…' : 'Click to upload'}
                                </span>
                                <span className="text-xs text-slate-400">PNG, JPG, WebP — recommended 1600×900px</span>
                                <input type="file" accept="image/*" className="hidden"
                                    onChange={async e => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setCoverImageUploading(true);
                                        try {
                                            const { url, error } = await storage.uploadProgramPageAsset(file, programId, 'hero', 'backgroundImage');
                                            if (error || !url) throw error || new Error('Upload failed');
                                            setCoverImage(url);
                                        } catch { alert('Image upload failed. Check storage settings.'); }
                                        finally { setCoverImageUploading(false); e.target.value = ''; }
                                    }} />
                            </label>
                        )}

                        <div className="flex gap-2">
                            <input value={coverImage} onChange={e => setCoverImage(e.target.value)}
                                placeholder="Or paste an image URL…"
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            {mediaAssets.length > 0 && (
                                <select value={coverImage} onChange={e => setCoverImage(e.target.value)}
                                    className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none max-w-[160px]">
                                    <option value="">Media library…</option>
                                    {mediaAssets.map(a => <option key={a.name} value={a.url || ''}>{a.name}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* ── Card 2: Tagline ─────────────────────────────────── */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Tagline</h3>
                            <p className="text-xs text-slate-500 mt-0.5">One-liner shown below the program title in the hero</p>
                        </div>
                        <input value={tagline} onChange={e => setTagline(e.target.value)}
                            placeholder="e.g. Celebrating innovation, excellence &amp; impact"
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>

                    {/* ── Card 3: About ───────────────────────────────────── */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">About &amp; Description</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Tell visitors what this program is about</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label hint="bold intro sentence">One-liner</Label>
                            <input value={aboutLead} onChange={e => setAboutLead(e.target.value)}
                                placeholder="e.g. The region's most prestigious awards for business excellence."
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none mt-1.5" />
                        </div>
                        <div className="space-y-1.5">
                            <Label hint="HTML supported">Full Description</Label>
                            <textarea rows={5} value={aboutBody} onChange={e => setAboutBody(e.target.value)}
                                placeholder="Give visitors the full picture — background, purpose, what to expect…"
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none mt-1.5" />
                        </div>
                    </div>

                    {/* ── Card 4: Nomination Form ──────────────────────────── */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Nomination Button <span className="text-rose-500">*</span></h3>
                            <p className="text-xs text-slate-500 mt-0.5">Which form opens when visitors click "Nominate Now"</p>
                        </div>

                        {availableForms.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                No forms found. Create a nomination form in the Forms section first.
                            </div>
                        ) : (
                            <select value={nominationFormId} onChange={e => setNominationFormId(e.target.value)}
                                aria-invalid={publishAttempted && !hasNominationForm}
                                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 outline-none bg-white ${
                                    publishAttempted && !hasNominationForm
                                        ? 'border-rose-300 focus:ring-rose-500'
                                        : 'border-slate-200 focus:ring-indigo-500'
                                }`}>
                                <option value="">Select a nomination form…</option>
                                {availableForms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                            </select>
                        )}
                        {publishAttempted && !hasNominationForm && (
                            <p className="text-xs font-medium text-rose-600">
                                Select a nomination form before publishing.
                            </p>
                        )}

                        <div className="flex items-center gap-3">
                            <input value={primaryCta} onChange={e => setPrimaryCta(e.target.value)}
                                placeholder="Button text (e.g. Nominate Now)"
                                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                            <div className="flex-shrink-0 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg whitespace-nowrap pointer-events-none">
                                {primaryCta || 'Nominate Now'} →
                            </div>
                        </div>
                    </div>

                    {/* Publish CTA */}
                    {!isPublished && (
                        <button type="button" onClick={handlePublish} disabled={isPublishing || isSaving}
                            className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60">
                            <Rocket className="w-4 h-4" />
                            {isPublishing ? 'Publishing…' : 'Publish Landing Page'}
                        </button>
                    )}
                    {isPublished && (
                        <button type="button" onClick={handlePreview}
                            className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center justify-center gap-2">
                            <ExternalLink className="w-4 h-4" /> Open Live Landing Page
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
