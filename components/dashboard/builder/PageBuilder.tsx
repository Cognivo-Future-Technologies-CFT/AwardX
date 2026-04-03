import React, { useEffect, useMemo, useState } from 'react';
import { programPages, programs, storage } from '../../../services/supabase';
import { DEFAULT_TEMPLATE, SectionPreview } from './SectionBlocks';
import { Save, Rocket, Monitor, Smartphone, Check, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { Button } from '../../Button';

interface PageBuilderProps {
    programId: string;
}

interface SetupFormData {
    programName: string;
    tagline: string;
    startDate: string;
    location: string;
    primaryCta: string;
    secondaryCta: string;
    aboutLead: string;
    aboutDescription: string;
}

const dedupeTemplate = (template: any[]) => {
    const seen = new Set<string>();
    return template.filter((item) => {
        if (seen.has(item.type)) return false;
        seen.add(item.type);
        return true;
    });
};

const safeClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const getSectionType = (section: any) => section.section_type || section.type;

const deriveFormData = (sections: any[], fallbackProgramTitle: string): SetupFormData => {
    const hero = sections.find((section) => getSectionType(section) === 'hero');
    const about = sections.find((section) => getSectionType(section) === 'about');

    return {
        programName: hero?.content?.title || fallbackProgramTitle || 'My Award Program',
        tagline: hero?.content?.subtitle || 'Celebrating innovation, excellence and impact.',
        startDate: hero?.content?.date || 'Coming Soon',
        location: hero?.content?.location || 'TBA',
        primaryCta: hero?.content?.primaryCtaText || 'Nominate Now',
        secondaryCta: hero?.content?.secondaryCtaText || 'Register / Attend',
        aboutLead: about?.content?.lead || 'Tell your audience what this event is about and why it matters.',
        aboutDescription:
            about?.content?.description ||
            '<p>Share your event story, eligibility highlights, and key reasons to participate.</p>',
    };
};

const isSetupComplete = (formData: SetupFormData): boolean => {
    return Object.values(formData).every((value) => value.trim().length > 0);
};

const applyCoreFields = (section: any, formData: SetupFormData) => {
    const type = getSectionType(section);
    const content = safeClone(section.content || {});

    if (type === 'navbar') {
        content.logo_text = formData.programName;
        content.cta_text = formData.primaryCta;
    }

    if (type === 'hero') {
        content.title = formData.programName;
        content.subtitle = formData.tagline;
        content.date = formData.startDate;
        content.location = formData.location;
        content.primaryCtaText = formData.primaryCta;
        content.secondaryCtaText = formData.secondaryCta;
    }

    if (type === 'about') {
        content.title = `About ${formData.programName}`;
        content.lead = formData.aboutLead;
        content.description = formData.aboutDescription;
    }

    if (type === 'cta') {
        content.title = `Ready for ${formData.programName}?`;
        content.primaryCtaText = formData.primaryCta;
        content.secondaryCtaText = formData.secondaryCta;
    }

    if (type === 'timeline' && Array.isArray(content.dates) && content.dates[3]) {
        content.dates[3].value = formData.startDate;
    }

    return {
        ...section,
        content,
    };
};

const buildSeedSections = (programId: string, existingSections: any[], formData: SetupFormData) => {
    const template = dedupeTemplate(DEFAULT_TEMPLATE);
    const existingByType = new Map<string, any>();

    existingSections.forEach((section) => {
        const type = getSectionType(section);
        if (!existingByType.has(type)) {
            existingByType.set(type, section);
        }
    });

    return template.map((tpl, index) => {
        const existing = existingByType.get(tpl.type);
        const seed = {
            id: existing?.id || `temp-generated-${tpl.type}-${Date.now()}-${index}`,
            program_id: programId,
            section_type: tpl.type,
            title: existing?.title || tpl.label,
            content: safeClone(existing?.content || tpl.content || {}),
            settings: safeClone(existing?.settings || tpl.settings || {}),
            sort_order: index,
            is_visible: existing?.is_visible ?? true,
        };

        return applyCoreFields(seed, formData);
    });
};

const isImageLikeKey = (key: string) => /(image|logo|avatar|cover|background|banner|photo|icon|url)$/i.test(key);

const replaceAtPath = (source: any, path: (string | number)[], nextValue: any): any => {
    if (path.length === 0) return nextValue;
    const [head, ...rest] = path;

    if (Array.isArray(source)) {
        const index = Number(head);
        const next = [...source];
        next[index] = replaceAtPath(next[index], rest, nextValue);
        return next;
    }

    const next = { ...(source || {}) };
    next[head] = replaceAtPath(next[head], rest, nextValue);
    return next;
};

const removeArrayItem = (source: any[], index: number) => source.filter((_, i) => i !== index);

const defaultForValue = (value: any) => {
    if (Array.isArray(value)) return value.length && typeof value[0] === 'object' ? {} : '';
    if (typeof value === 'number') return 0;
    if (typeof value === 'boolean') return false;
    return '';
};

export const PageBuilder: React.FC<PageBuilderProps> = ({ programId }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [isPublished, setIsPublished] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [programSlug, setProgramSlug] = useState<string | null>(null);
    const [formData, setFormData] = useState<SetupFormData>({
        programName: '',
        tagline: '',
        startDate: '',
        location: '',
        primaryCta: '',
        secondaryCta: '',
        aboutLead: '',
        aboutDescription: '',
    });
    const [editableSections, setEditableSections] = useState<any[]>([]);
    const [isPreviewEnabled, setIsPreviewEnabled] = useState(false);
    const [activeView, setActiveView] = useState<'setup' | 'preview'>('setup');
    const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [configRes, sectionsRes, programRes] = await Promise.all([
                    programPages.getConfig(programId),
                    programPages.getSections(programId),
                    programs.getById(programId),
                ]);

                const loadedSections = sectionsRes.data || [];
                const initialForm = deriveFormData(loadedSections, programRes.data?.title || '');
                const seeded = buildSeedSections(programId, loadedSections, initialForm);

                const initialPanels: Record<string, boolean> = {};
                seeded.forEach((section, idx) => {
                    initialPanels[section.section_type] = idx < 2;
                });

                setConfig(configRes.data || { theme_settings: {} });
                setIsPublished(!!configRes.data?.is_published);
                setProgramSlug(programRes.data?.slug || null);
                setFormData(initialForm);
                setEditableSections(seeded);
                setOpenPanels(initialPanels);
                setIsPreviewEnabled(isSetupComplete(initialForm));
                setActiveView('setup');
            } catch (error) {
                console.error('Error loading page setup:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [programId]);

    const completed = isSetupComplete(formData);

    const handleFieldChange = (field: keyof SetupFormData, value: string) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            setEditableSections((sections) => sections.map((section) => applyCoreFields(section, next)));
            return next;
        });
    };

    const updateSectionValue = (sectionType: string, target: 'content' | 'settings', path: (string | number)[], value: any) => {
        setEditableSections((prev) =>
            prev.map((section) => {
                if (section.section_type !== sectionType) return section;
                return {
                    ...section,
                    [target]: replaceAtPath(section[target] || {}, path, value),
                };
            }),
        );
    };

    const addArrayItem = (sectionType: string, target: 'content' | 'settings', path: (string | number)[], sampleValue: any) => {
        setEditableSections((prev) =>
            prev.map((section) => {
                if (section.section_type !== sectionType) return section;
                const current = path.reduce((acc: any, key: any) => (acc ? acc[key] : undefined), section[target] || {});
                const nextArray = Array.isArray(current) ? [...current, defaultForValue(sampleValue)] : [defaultForValue(sampleValue)];
                return {
                    ...section,
                    [target]: replaceAtPath(section[target] || {}, path, nextArray),
                };
            }),
        );
    };

    const removeArrayItemAt = (sectionType: string, target: 'content' | 'settings', path: (string | number)[], index: number) => {
        setEditableSections((prev) =>
            prev.map((section) => {
                if (section.section_type !== sectionType) return section;
                const current = path.reduce((acc: any, key: any) => (acc ? acc[key] : undefined), section[target] || {});
                if (!Array.isArray(current)) return section;
                return {
                    ...section,
                    [target]: replaceAtPath(section[target] || {}, path, removeArrayItem(current, index)),
                };
            }),
        );
    };

    const saveAll = async (publish: boolean) => {
        const basePayload = {
            ...(config || {}),
            is_published: publish ? true : !!config?.is_published,
            published_at: publish ? new Date().toISOString() : config?.published_at || null,
        };

        const { data: updatedConfig, error: configError } = await programPages.createOrUpdateConfig(programId, basePayload);
        if (configError) throw configError;

        const savePromises = editableSections.map((section, index) =>
            programPages.saveSection({
                ...section,
                sort_order: index,
            }),
        );

        const results = await Promise.all(savePromises);
        const nextSections = results.map((result) => result.data).filter(Boolean);
        setEditableSections(nextSections);
        setConfig(updatedConfig || basePayload);

        if (publish) {
            setIsPublished(true);
        }
    };

    const handleSaveDraft = async () => {
        if (!completed || isSaving || isPublishing) return;
        setIsSaving(true);
        try {
            await saveAll(false);
            setIsPreviewEnabled(true);
            setActiveView('preview');
            alert('Details saved. Your preview is ready.');
        } catch (error) {
            console.error('Error saving draft:', error);
            alert('Failed to save details.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async () => {
        if (!completed || isSaving || isPublishing) return;
        setIsPublishing(true);
        try {
            await saveAll(true);
            setIsPreviewEnabled(true);
            setActiveView('preview');
            alert('Page published successfully.');
        } catch (error) {
            console.error('Error publishing page:', error);
            alert('Failed to publish page.');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleCopyShareLink = async () => {
        const baseUrl = window.location.origin;
        const shareUrl = programSlug
            ? `${baseUrl}/program/${encodeURIComponent(programSlug)}`
            : `${baseUrl}/program?id=${programId}`;

        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }

        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
    };

    const renderValueEditor = (
        sectionType: string,
        target: 'content' | 'settings',
        path: (string | number)[],
        keyName: string,
        value: any,
    ): React.ReactNode => {
        const label = keyName
            .replace(/([A-Z])/g, ' $1')
            .replace(/[_-]/g, ' ')
            .replace(/^./, (char) => char.toUpperCase());

        if (typeof value === 'string') {
            const multiline = value.length > 90 || value.includes('<') || value.includes('\n');
            return (
                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600">{label}</label>
                    {multiline ? (
                        <textarea
                            rows={4}
                            value={value}
                            onChange={(e) => updateSectionValue(sectionType, target, path, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    ) : (
                        <input
                            value={value}
                            onChange={(e) => updateSectionValue(sectionType, target, path, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    )}
                    {isImageLikeKey(keyName) && (
                        <div className="space-y-2">
                            <label className="block text-[11px] font-medium text-slate-500">Upload image file</label>
                            <input
                                type="file"
                                accept="image/*"
                                className="block w-full text-xs text-slate-500"
                                disabled={uploadingField === `${sectionType}:${target}:${path.join('.')}`}
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const fieldId = `${sectionType}:${target}:${path.join('.')}`;
                                    setUploadingField(fieldId);
                                    try {
                                        const { url, error } = await storage.uploadProgramPageAsset(file, programId, sectionType, keyName);
                                        if (error || !url) {
                                            throw error || new Error('Upload failed');
                                        }
                                        updateSectionValue(sectionType, target, path, url);
                                    } catch (error) {
                                        console.error('Upload failed:', error);
                                        alert('Could not upload image. Check storage bucket/policies and try again.');
                                    } finally {
                                        setUploadingField(null);
                                        e.target.value = '';
                                    }
                                }}
                            />
                            {uploadingField === `${sectionType}:${target}:${path.join('.')}` && (
                                <p className="text-[11px] text-indigo-600">Uploading...</p>
                            )}
                        </div>
                    )}
                </div>
            );
        }

        if (typeof value === 'number') {
            return (
                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-600">{label}</label>
                    <input
                        type="number"
                        value={Number.isFinite(value) ? value : 0}
                        onChange={(e) => updateSectionValue(sectionType, target, path, Number(e.target.value || 0))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            );
        }

        if (typeof value === 'boolean') {
            return (
                <label className="flex items-center justify-between gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
                    <span className="text-xs font-semibold text-slate-700">{label}</span>
                    <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => updateSectionValue(sectionType, target, path, e.target.checked)}
                        className="h-4 w-4"
                    />
                </label>
            );
        }

        if (Array.isArray(value)) {
            return (
                <div className="space-y-3 border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</h5>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => addArrayItem(sectionType, target, path, value[0] ?? '')}
                        >
                            Add Item
                        </Button>
                    </div>
                    {value.length === 0 && <p className="text-xs text-slate-500">No items yet.</p>}
                    {value.map((item, index) => (
                        <div key={`${String(path.join('.'))}-${index}`} className="border border-slate-100 rounded-lg p-3 space-y-3 bg-white">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-slate-500">Item {index + 1}</span>
                                <button
                                    type="button"
                                    className="text-[11px] font-semibold text-red-600"
                                    onClick={() => removeArrayItemAt(sectionType, target, path, index)}
                                >
                                    Remove
                                </button>
                            </div>
                            {typeof item === 'object' && item !== null ? (
                                <div className="space-y-3">
                                    {Object.entries(item).map(([childKey, childValue]) => (
                                        <div key={childKey}>{renderValueEditor(sectionType, target, [...path, index, childKey], childKey, childValue)}</div>
                                    ))}
                                </div>
                            ) : (
                                renderValueEditor(sectionType, target, [...path, index], `${label} ${index + 1}`, item)
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        if (typeof value === 'object' && value !== null) {
            return (
                <div className="space-y-3 border border-slate-200 rounded-lg p-3">
                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(value).map(([childKey, childValue]) => (
                            <div key={childKey} className="md:col-span-1">
                                {renderValueEditor(sectionType, target, [...path, childKey], childKey, childValue)}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };

    const previewSections = useMemo(() => editableSections.filter((section) => section.is_visible !== false), [editableSections]);

    if (isLoading) {
        return <div className="p-12 text-center">Loading page setup...</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] min-h-0 bg-slate-100">
            <div className="bg-white border-b border-slate-200 px-3 md:px-6 py-3 flex flex-wrap justify-between items-center gap-2 shadow-sm z-10">
                <div className="flex items-center gap-2">
                    {activeView === 'preview' && (
                        <Button
                            variant="outline"
                            onClick={() => setActiveView('setup')}
                            type="button"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Edit
                        </Button>
                    )}
                    <h1 className="text-lg font-bold text-slate-800">Program Page Setup</h1>
                </div>

                <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                    {activeView === 'preview' && (
                        <>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button
                                    onClick={() => setPreviewMode('desktop')}
                                    className={`p-2.5 rounded ${previewMode === 'desktop' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="Desktop Preview"
                                    type="button"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setPreviewMode('mobile')}
                                    className={`p-2.5 rounded ${previewMode === 'mobile' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    title="Mobile Preview"
                                    type="button"
                                >
                                    <Smartphone className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}

                    <Button
                        variant="outline"
                        onClick={handleCopyShareLink}
                        disabled={!isPublished}
                        title={isPublished ? 'Copy public page link' : 'Publish first to share publicly'}
                    >
                        {shareCopied ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : null}
                        {shareCopied ? 'Link Copied' : 'Copy Public Link'}
                    </Button>

                    <Button onClick={handleSaveDraft} disabled={!completed || isSaving || isPublishing}>
                        <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Draft'}
                    </Button>

                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handlePublish}
                        disabled={!completed || isPublishing || isSaving}
                    >
                        <Rocket className="w-4 h-4 mr-2" /> {isPublishing ? 'Publishing...' : isPublished ? 'Published' : 'Publish'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
                {activeView === 'setup' ? (
                    <div className="w-full max-w-none bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-5">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Fill Program Details</h2>
                            <p className="text-sm text-slate-500 mt-1">Everything is editable from forms below, including image uploads and section content.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Program Name *</label>
                                <input
                                    value={formData.programName}
                                    onChange={(e) => handleFieldChange('programName', e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Tagline *</label>
                                <input
                                    value={formData.tagline}
                                    onChange={(e) => handleFieldChange('tagline', e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Event Date *</label>
                                    <input
                                        value={formData.startDate}
                                        onChange={(e) => handleFieldChange('startDate', e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Location *</label>
                                    <input
                                        value={formData.location}
                                        onChange={(e) => handleFieldChange('location', e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Primary CTA *</label>
                                    <input
                                        value={formData.primaryCta}
                                        onChange={(e) => handleFieldChange('primaryCta', e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Secondary CTA *</label>
                                    <input
                                        value={formData.secondaryCta}
                                        onChange={(e) => handleFieldChange('secondaryCta', e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">About Lead *</label>
                                <textarea
                                    rows={3}
                                    value={formData.aboutLead}
                                    onChange={(e) => handleFieldChange('aboutLead', e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">About Description (HTML allowed) *</label>
                                <textarea
                                    rows={5}
                                    value={formData.aboutDescription}
                                    onChange={(e) => handleFieldChange('aboutDescription', e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="button"
                                onClick={() => {
                                    if (completed) {
                                        setIsPreviewEnabled(true);
                                        setActiveView('preview');
                                    }
                                }}
                                disabled={!completed}
                                className="w-full"
                            >
                                Continue to Preview
                            </Button>
                            {!completed && <p className="text-xs text-amber-600 mt-2">Complete required setup fields to continue to preview.</p>}
                        </div>

                        <div className="pt-4 border-t border-slate-200 space-y-3">
                            <h3 className="text-sm font-bold text-slate-800">Full Section Editor</h3>
                            {editableSections.map((section) => {
                                const isOpen = !!openPanels[section.section_type];
                                return (
                                    <div key={section.section_type} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                        <button
                                            type="button"
                                            onClick={() => setOpenPanels((prev) => ({ ...prev, [section.section_type]: !isOpen }))}
                                            className="w-full px-4 py-3 flex items-center justify-between text-left bg-slate-50"
                                        >
                                            <span className="text-sm font-semibold text-slate-800">{section.title || section.section_type}</span>
                                            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                        </button>

                                        {isOpen && (
                                            <div className="p-4 space-y-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Section Title</label>
                                                    <input
                                                        value={section.title || ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            setEditableSections((prev) =>
                                                                prev.map((item) =>
                                                                    item.section_type === section.section_type ? { ...item, title: value } : item,
                                                                ),
                                                            );
                                                        }}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                    />
                                                </div>

                                                <label className="flex items-center justify-between gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50">
                                                    <span className="text-xs font-semibold text-slate-700">Visible in preview</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={section.is_visible !== false}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setEditableSections((prev) =>
                                                                prev.map((item) =>
                                                                    item.section_type === section.section_type ? { ...item, is_visible: checked } : item,
                                                                ),
                                                            );
                                                        }}
                                                        className="h-4 w-4"
                                                    />
                                                </label>

                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Content</h4>
                                                    {Object.entries(section.content || {}).map(([key, value]) => (
                                                        <div key={key}>{renderValueEditor(section.section_type, 'content', [key], key, value)}</div>
                                                    ))}
                                                </div>

                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Settings</h4>
                                                    {Object.keys(section.settings || {}).length === 0 && (
                                                        <p className="text-xs text-slate-500">No settings available for this section.</p>
                                                    )}
                                                    {Object.entries(section.settings || {}).map(([key, value]) => (
                                                        <div key={key}>{renderValueEditor(section.section_type, 'settings', [key], key, value)}</div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-none min-h-0">
                        {!isPreviewEnabled ? (
                            <div className="h-full min-h-[380px] bg-white rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 flex items-center justify-center p-8 text-center">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-700">Preview Locked</h3>
                                    <p className="mt-2 text-sm">Complete the setup form to unlock preview.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-2 md:p-3 overflow-auto max-h-[calc(100vh-140px)]">
                                <div className={`w-full transition-all duration-300 overflow-hidden bg-white ${previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-none'}`}>
                                    {previewSections.map((section) => (
                                        <div key={section.id} id={section.section_type}>
                                            <SectionPreview section={section} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
