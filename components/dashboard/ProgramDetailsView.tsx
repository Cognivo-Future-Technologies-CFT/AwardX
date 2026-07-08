
import React, { useEffect, useState } from 'react';
import { db } from '../../services/database';
import { Program } from '../../services/models';
import { Button } from '../Button';
import { programPages, programs, storage } from '../../services/supabase';
import { getProgramMediaAssets, invalidateOverviewCache } from '../../services/overviewApi';
import { useAuth } from '../../contexts/AuthContext';
import {
    Calendar,
    FileCheck,
    Image as ImageIcon,
    Type,
    Link as LinkIcon,
    Save,
    AlertCircle,
    Rocket,
    Check,
    X,
    Info,
    ExternalLink,
    Globe,
    Settings2,
    Sparkles,
    Users,
} from 'lucide-react';
import { todayDateString } from '../../lib/utils';

interface ProgramDetailsViewProps {
    activeEvent: Program | null;
}

const safeClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function findSection(sections: any[], type: string) {
    return sections.find((s) => (s.section_type || s.type) === type);
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

const FieldLabel: React.FC<{ children: React.ReactNode; hint?: string; required?: boolean }> = ({
    children,
    hint,
    required,
}) => (
    <label className="block">
        <span className="text-sm font-semibold text-slate-700">
            {children}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
        </span>
        {hint && <span className="text-xs text-slate-400 font-normal ml-1.5">— {hint}</span>}
    </label>
);

const SectionCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description?: string;
    children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0">
                {icon}
            </div>
            <div>
                <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
            </div>
        </div>
        <div className="p-5 space-y-4">{children}</div>
    </section>
);

export const ProgramDetailsView: React.FC<ProgramDetailsViewProps> = ({ activeEvent }) => {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const programId = activeEvent?.id || '';

    const [formData, setFormData] = useState<Partial<Program>>({
        title: '',
        description: '',
        deadline: '',
        status: 'Draft',
        slug: '',
        coverImageUrl: '',
        category: 'General',
        visibility: 'Public',
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [publishAttempted, setPublishAttempted] = useState(false);

    const [config, setConfig] = useState<any>(null);
    const [isPublished, setIsPublished] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [programSlug, setProgramSlug] = useState<string | null>(null);

    const [coverImage, setCoverImage] = useState('');
    const [tagline, setTagline] = useState('');
    const [aboutLead, setAboutLead] = useState('');
    const [aboutBody, setAboutBody] = useState('');
    const [primaryCta, setPrimaryCta] = useState('Nominate Now');
    const [nominationFormId, setNominationFormId] = useState('');

    const [coverImageUploading, setCoverImageUploading] = useState(false);
    const [heroSection, setHeroSection] = useState<any>(null);
    const [aboutSection, setAboutSection] = useState<any>(null);
    const [availableForms, setAvailableForms] = useState<Array<{ id: string; title: string }>>([]);
    const [mediaAssets, setMediaAssets] = useState<Array<{ name: string; url: string | null }>>([]);

    const hasNominationForm = nominationFormId.trim().length > 0;

    useEffect(() => {
        if (!activeEvent) return;
        setFormData({
            title: activeEvent.title,
            deadline: activeEvent.deadline,
            status: activeEvent.status,
            slug: activeEvent.slug,
            description: activeEvent.description,
            coverImageUrl: activeEvent.coverImageUrl,
            visibility: activeEvent.visibility,
            category: activeEvent.category,
            applicationMode: activeEvent.applicationMode || 'standard',
            requireGithubAuth: activeEvent.requireGithubAuth ?? false,
            allowMultipleSubmissions: activeEvent.allowMultipleSubmissions ?? false,
            maxSubmissions: activeEvent.maxSubmissions ?? 2,
            submissionMode: activeEvent.submissionMode || 'individual',
            minTeamSize: activeEvent.minTeamSize ?? 2,
            maxTeamSize: activeEvent.maxTeamSize ?? 5,
        });
    }, [activeEvent]);

    useEffect(() => {
        if (!programId) return;

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
                setProgramSlug(programRes.data?.slug || activeEvent?.slug || null);
                setHeroSection(hero);
                setAboutSection(about);

                const rawCover = hero.content?.backgroundImage || programRes.data?.cover_image_url || activeEvent?.coverImageUrl || '';
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
                setAboutBody(
                    about.content?.body ||
                        about.content?.description ||
                        programRes.data?.description ||
                        activeEvent?.description ||
                        '',
                );
                setAvailableForms((formsRes || []).map((f: any) => ({ id: f.id, title: f.title })));

                const ctaLink = String(hero.content?.primaryCtaLink || '');
                const match = ctaLink.match(/\/form\/([^/?#]+)/);
                if (match?.[1]) setNominationFormId(match[1]);
            } catch (err) {
                console.error('ProgramDetailsView load error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [programId, activeEvent?.slug, activeEvent?.coverImageUrl, activeEvent?.description]);

    useEffect(() => {
        if (authLoading || !isAuthenticated || !programId) return;
        getProgramMediaAssets(programId)
            .then((assets) => setMediaAssets((assets || []).filter((a: any) => !!a?.url)))
            .catch((err) => console.warn('ProgramDetailsView: failed to load media assets', err));
    }, [programId, isAuthenticated, authLoading]);

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

    const saveLandingPage = async (publish: boolean) => {
        const basePayload = {
            ...(config || {}),
            is_published: publish ? true : !!config?.is_published,
            published_at: publish ? new Date().toISOString() : config?.published_at || null,
        };

        const { data: updatedConfig, error: configErr } = await programPages.createOrUpdateConfig(programId, basePayload);
        if (configErr) throw configErr;

        const sections = buildSections();
        const results = await Promise.all(sections.map((s, i) => programPages.saveSection({ ...s, sort_order: i })));
        const saved = results.map((r) => r.data).filter(Boolean);
        if (saved.length >= 2) {
            const savedHero = saved.find((s: any) => s.section_type === 'hero');
            const savedAbout = saved.find((s: any) => s.section_type === 'about');
            if (savedHero) setHeroSection(savedHero);
            if (savedAbout) setAboutSection(savedAbout);
        }
        setConfig(updatedConfig || basePayload);
        if (publish) setIsPublished(true);

        void invalidateOverviewCache(programId).catch((err) => {
            console.warn('ProgramDetailsView: failed to invalidate public overview cache', err);
        });
    };

    const saveProgram = async () => {
        if (!activeEvent) return;
        await db.updateProgram({
            ...activeEvent,
            ...formData,
            coverImageUrl: coverImage || formData.coverImageUrl,
            description: aboutBody || formData.description,
        } as Program);
    };

    const handleSave = async () => {
        if (!activeEvent || isSaving || isPublishing) return;

        setIsSaving(true);
        setError('');
        setSuccessMessage('');

        try {
            await Promise.all([saveProgram(), saveLandingPage(false)]);
            setSuccessMessage('Program details saved successfully.');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to save program details.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!activeEvent || isSaving || isPublishing) return;

        setPublishAttempted(true);
        if (!hasNominationForm) {
            setError('Select a nomination form before publishing the landing page.');
            return;
        }

        setIsPublishing(true);
        setError('');
        setSuccessMessage('');

        try {
            await Promise.all([saveProgram(), saveLandingPage(true)]);
            setSuccessMessage('Landing page published successfully.');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to publish landing page.');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleCopyShareLink = async () => {
        const url = programSlug
            ? `${window.location.origin}/program/${encodeURIComponent(programSlug)}`
            : `${window.location.origin}/program?id=${programId}`;
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
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

    if (!activeEvent) {
        return <div className="p-8 text-slate-500">No active event selected.</div>;
    }

    if (isLoading) {
        return (
            <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                <p className="text-sm text-slate-500 mt-3">Loading program details…</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-10rem)]">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-2xl font-bold text-slate-900">Program Details</h1>
                            {isPublished && (
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    Landing page live
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Configure your program settings and public landing page in one place.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {isPublished && (
                            <button
                                onClick={handlePreview}
                                type="button"
                                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" /> Preview
                            </button>
                        )}
                        <Button variant="outline" onClick={handleCopyShareLink} disabled={!isPublished} title={isPublished ? 'Copy public link' : 'Publish first to copy link'}>
                            {shareCopied ? (
                                <>
                                    <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                                    Copied
                                </>
                            ) : (
                                'Copy Link'
                            )}
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || isPublishing}>
                            <Save className="w-4 h-4 mr-1.5" />
                            {isSaving ? 'Saving…' : 'Save Changes'}
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handlePublish}
                            disabled={isPublishing || isSaving}
                        >
                            <Rocket className="w-4 h-4 mr-1.5" />
                            {isPublishing ? 'Publishing…' : isPublished ? 'Republish' : 'Publish Page'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-6 pb-12 px-4 md:px-6 lg:px-8 mt-6">
                {/* Info banner */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3.5 flex items-start gap-3">
                    <Info className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-800">
                        <span className="font-semibold">Award categories, rounds, and key dates</span> auto-populate on your
                        public landing page. Set up program basics on the left and customize the visitor-facing page on the right.
                    </p>
                </div>

                {(error || successMessage) && (
                    <div
                        className={`flex items-center gap-2 p-4 rounded-lg border ${
                            error
                                ? 'text-red-700 bg-red-50 border-red-100'
                                : 'text-green-700 bg-green-50 border-green-100'
                        }`}
                    >
                        {error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <Check className="w-5 h-5 shrink-0" />}
                        <p className="text-sm">{error || successMessage}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    {/* Program settings */}
                    <div className="xl:col-span-2 space-y-6">
                        <SectionCard
                            icon={<Settings2 className="w-4 h-4" />}
                            title="Basic Information"
                            description="Core program metadata and identifiers"
                        >
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <FieldLabel required>Program Title</FieldLabel>
                                    <div className="relative mt-1.5">
                                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="e.g. Annual Design Awards 2026"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <FieldLabel>Deadline</FieldLabel>
                                        <div className="relative mt-1.5">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                            <input
                                                type="date"
                                                value={formData.deadline || ''}
                                                min={todayDateString()}
                                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <FieldLabel>Industry Category</FieldLabel>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full mt-1.5 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        >
                                            <option>Design</option>
                                            <option>Technology</option>
                                            <option>Business</option>
                                            <option>Arts</option>
                                            <option>Education</option>
                                            <option>Health</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <FieldLabel hint="used in the public URL">URL Slug</FieldLabel>
                                    <div className="relative mt-1.5">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={formData.slug || ''}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="e.g. design-awards-2026"
                                        />
                                    </div>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard
                            icon={<Globe className="w-4 h-4" />}
                            title="Status & Visibility"
                            description="Control program lifecycle and access"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 mb-3">Status</p>
                                    <div className="flex flex-wrap gap-3">
                                        {['Draft', 'Active', 'Completed'].map((status) => (
                                            <label key={status} className="flex items-center cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    value={status}
                                                    checked={formData.status === status}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Program['status'] })}
                                                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                                />
                                                <span className="ml-2 text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                                                    {status}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-slate-700 mb-3">Visibility</p>
                                    <div className="flex flex-wrap gap-3">
                                        {['Public', 'Private'].map((vis) => (
                                            <label key={vis} className="flex items-center cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="visibility"
                                                    value={vis}
                                                    checked={formData.visibility === vis}
                                                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as Program['visibility'] })}
                                                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                                />
                                                <span className="ml-2 text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                                                    {vis}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard
                            icon={<Type className="w-4 h-4" />}
                            title="Application Mode"
                            description="How applicants submit entries"
                        >
                            <div className="space-y-4">
                                <div>
                                    <FieldLabel>How applicants apply</FieldLabel>
                                    <select
                                        value={formData.applicationMode || 'standard'}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                applicationMode: e.target.value as 'standard' | 'hackathon',
                                                requireGithubAuth:
                                                    e.target.value === 'hackathon' ? true : formData.requireGithubAuth,
                                            })
                                        }
                                        className="w-full mt-1.5 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="standard">Standard (open form)</option>
                                        <option value="hackathon">Hackathon (GitHub application)</option>
                                    </select>
                                </div>

                                <label className="flex items-center justify-between cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <div>
                                        <span className="text-sm font-semibold text-slate-900">Require GitHub sign-in</span>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Applicants must authenticate with GitHub to apply
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFormData({
                                                ...formData,
                                                requireGithubAuth: !formData.requireGithubAuth,
                                            })
                                        }
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            formData.requireGithubAuth ? 'bg-indigo-600' : 'bg-slate-300'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                                formData.requireGithubAuth ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </label>

                                <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                                    Public voting and DIDIT KYC are configured per round under{' '}
                                    <strong>Schedule &amp; Rounds</strong>. Connect DIDIT in{' '}
                                    <strong>Settings → Integrations</strong> first.
                                </p>
                            </div>
                        </SectionCard>

                        <SectionCard
                            icon={<FileCheck className="w-4 h-4" />}
                            title="Submission Settings"
                            description="Control how many times participants can submit"
                        >
                            <div className="space-y-4">
                                <label className="flex items-center justify-between cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <div>
                                        <span className="text-sm font-semibold text-slate-900">Allow Multiple Submissions</span>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Let participants submit more than one application
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVal = !formData.allowMultipleSubmissions;
                                            setFormData({
                                                ...formData,
                                                allowMultipleSubmissions: newVal,
                                                maxSubmissions: newVal ? Math.max(2, formData.maxSubmissions ?? 2) : 1,
                                            });
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            formData.allowMultipleSubmissions ? 'bg-indigo-600' : 'bg-slate-300'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                                                formData.allowMultipleSubmissions ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </label>

                                {formData.allowMultipleSubmissions && (
                                    <div className="space-y-1.5 pl-2">
                                        <FieldLabel hint="minimum 2">Maximum Submissions Per Participant</FieldLabel>
                                        <input
                                            type="number"
                                            min={2}
                                            value={formData.maxSubmissions ?? 2}
                                            onChange={(e) => {
                                                const val = Math.max(2, parseInt(e.target.value) || 2);
                                                setFormData({ ...formData, maxSubmissions: val });
                                            }}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <p className="text-xs text-slate-400">
                                            Maximum number of completed submissions a participant can make for this program.
                                        </p>
                                    </div>
                                )}

                                {!formData.allowMultipleSubmissions && (
                                    <p className="text-xs text-slate-400">
                                        Each participant may submit only one completed application.
                                    </p>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard
                            icon={<Users className="w-4 h-4" />}
                            title="Submission Mode"
                            description="Individual or team-based submissions"
                        >
                            <div className="space-y-4">
                                <div>
                                    <FieldLabel>Submission Type</FieldLabel>
                                    <select
                                        value={formData.submissionMode || 'individual'}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                submissionMode: e.target.value as 'individual' | 'group',
                                            })
                                        }
                                        className="w-full mt-1.5 px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="individual">Individual (one person per submission)</option>
                                        <option value="group">Group / Team (team lead submits for the group)</option>
                                    </select>
                                </div>

                                {formData.submissionMode === 'group' && (
                                    <div className="space-y-4 pl-2 border-l-2 border-indigo-200 ml-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <FieldLabel>Min Team Size</FieldLabel>
                                                <input
                                                    type="number"
                                                    min={2}
                                                    max={formData.maxTeamSize || 50}
                                                    value={formData.minTeamSize ?? 2}
                                                    onChange={(e) => {
                                                        const val = Math.max(2, parseInt(e.target.value) || 2);
                                                        setFormData({ ...formData, minTeamSize: val });
                                                    }}
                                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <FieldLabel>Max Team Size</FieldLabel>
                                                <input
                                                    type="number"
                                                    min={formData.minTeamSize || 2}
                                                    max={50}
                                                    value={formData.maxTeamSize ?? 5}
                                                    onChange={(e) => {
                                                        const val = Math.max(formData.minTeamSize || 2, parseInt(e.target.value) || 5);
                                                        setFormData({ ...formData, maxTeamSize: Math.min(val, 50) });
                                                    }}
                                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            The team lead creates a team and shares an invite code. Members join using the code.
                                            The team lead's submission counts as the team's submission. Teams have a private chat
                                            that expires after the announcement round ends.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    </div>

                    {/* Landing page */}
                    <div className="xl:col-span-3 space-y-6">
                        <SectionCard
                            icon={<ImageIcon className="w-4 h-4" />}
                            title="Cover Image"
                            description="The hero background visitors see first"
                        >
                            {coverImage && /^https?:\/\//i.test(coverImage) ? (
                                <div className="relative rounded-xl overflow-hidden h-48 bg-slate-100 group">
                                    <img
                                        src={coverImage}
                                        alt="Cover"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    <button
                                        type="button"
                                        onClick={() => setCoverImage('')}
                                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                                        title="Remove"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-10 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                                    <span className="text-3xl">🖼️</span>
                                    <span className="text-sm font-medium text-slate-600 hover:text-indigo-600">
                                        {coverImageUploading ? 'Uploading…' : 'Click to upload cover image'}
                                    </span>
                                    <span className="text-xs text-slate-400">PNG, JPG, WebP — recommended 1600×900px</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setCoverImageUploading(true);
                                            try {
                                                const { url, error: uploadError } = await storage.uploadProgramPageAsset(
                                                    file,
                                                    programId,
                                                    'hero',
                                                    'backgroundImage',
                                                );
                                                if (uploadError || !url) throw uploadError || new Error('Upload failed');
                                                setCoverImage(url);
                                            } catch {
                                                setError('Image upload failed. Check storage settings.');
                                            } finally {
                                                setCoverImageUploading(false);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </label>
                            )}

                            <div className="flex gap-2">
                                <input
                                    value={coverImage}
                                    onChange={(e) => setCoverImage(e.target.value)}
                                    placeholder="Or paste an image URL…"
                                    className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                {mediaAssets.length > 0 && (
                                    <select
                                        value={coverImage}
                                        onChange={(e) => setCoverImage(e.target.value)}
                                        className="px-3 py-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none max-w-[160px]"
                                    >
                                        <option value="">Media library…</option>
                                        {mediaAssets.map((a) => (
                                            <option key={a.name} value={a.url || ''}>
                                                {a.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard
                            icon={<Sparkles className="w-4 h-4" />}
                            title="Tagline"
                            description="One-liner shown below the program title in the hero"
                        >
                            <input
                                value={tagline}
                                onChange={(e) => setTagline(e.target.value)}
                                placeholder="e.g. Celebrating innovation, excellence & impact"
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </SectionCard>

                        <SectionCard
                            icon={<Type className="w-4 h-4" />}
                            title="About & Description"
                            description="Tell visitors what this program is about"
                        >
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <FieldLabel hint="bold intro sentence">One-liner</FieldLabel>
                                    <input
                                        value={aboutLead}
                                        onChange={(e) => setAboutLead(e.target.value)}
                                        placeholder="e.g. The region's most prestigious awards for business excellence."
                                        className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel hint="HTML supported">Full Description</FieldLabel>
                                    <textarea
                                        rows={6}
                                        value={aboutBody}
                                        onChange={(e) => setAboutBody(e.target.value)}
                                        placeholder="Give visitors the full picture — background, purpose, what to expect…"
                                        className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard
                            icon={<LinkIcon className="w-4 h-4" />}
                            title="Nomination Button"
                            description="Which form opens when visitors click the CTA"
                        >
                            <div className="space-y-4">
                                {availableForms.length === 0 ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        No forms found. Create a nomination form in the Form Builder first.
                                    </div>
                                ) : (
                                    <select
                                        value={nominationFormId}
                                        onChange={(e) => setNominationFormId(e.target.value)}
                                        aria-invalid={publishAttempted && !hasNominationForm}
                                        className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 outline-none bg-white ${
                                            publishAttempted && !hasNominationForm
                                                ? 'border-rose-300 focus:ring-rose-500'
                                                : 'border-slate-200 focus:ring-indigo-500'
                                        }`}
                                    >
                                        <option value="">Select a nomination form…</option>
                                        {availableForms.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.title}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {publishAttempted && !hasNominationForm && (
                                    <p className="text-xs font-medium text-rose-600">
                                        Select a nomination form before publishing.
                                    </p>
                                )}

                                <div className="flex items-center gap-3">
                                    <input
                                        value={primaryCta}
                                        onChange={(e) => setPrimaryCta(e.target.value)}
                                        placeholder="Button text (e.g. Nominate Now)"
                                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <div className="flex-shrink-0 px-4 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg whitespace-nowrap pointer-events-none">
                                        {primaryCta || 'Nominate Now'} →
                                    </div>
                                </div>
                            </div>
                        </SectionCard>
                    </div>
                </div>
            </div>
        </div>
    );
};
