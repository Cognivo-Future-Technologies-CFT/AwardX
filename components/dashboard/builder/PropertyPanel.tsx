import React from 'react';
import { SectionDef, sectionDefs } from './SectionBlocks';
import { Button } from '../../Button';
import { Trash2, ArrowUp, ArrowDown, ExternalLink, Plus } from 'lucide-react';

interface PropertyPanelProps {
    section: any | null;
    onChange: (updates: any) => void;
    onDelete: (id: string) => void;
    onMoveUp: (id: string) => void;
    onMoveDown: (id: string) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ section, onChange, onDelete, onMoveUp, onMoveDown }) => {
    if (!section) {
        return (
            <div className="p-6 text-center text-slate-500">
                <p>Select a section to edit its properties.</p>
            </div>
        );
    }

    const def: SectionDef | undefined = sectionDefs.find((s) => s.type === section.section_type);

    if (!def) {
        return <div className="p-6">Unknown section type</div>;
    }

    const handleContentChange = (key: string, value: any) => {
        onChange({
            ...section,
            content: { ...section.content, [key]: value }
        });
    };

    const handleSettingsChange = (key: string, value: any) => {
        onChange({
            ...section,
            settings: { ...section.settings, [key]: value }
        });
    };

    return (
        <div className="h-full bg-white border-l border-slate-200 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 sticky top-0 bg-white z-10 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">{def.label} Settings</h3>
                <div className="flex gap-1">
                    <button onClick={() => onMoveUp(section.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Move Up"><ArrowUp className="w-4 h-4" /></button>
                    <button onClick={() => onMoveDown(section.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Move Down"><ArrowDown className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(section.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Common Fields */}
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">Internal Name</label>
                    <input
                        type="text"
                        value={section.title || ''}
                        onChange={(e) => onChange({ ...section, title: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="Section Name"
                    />
                </div>

                <hr className="border-slate-100" />

                {/* Content Fields */}
                <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Content</h4>

                    {def.defaultContent.title !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                            <input
                                type="text"
                                value={section.content?.title || ''}
                                onChange={(e) => handleContentChange('title', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            />
                        </div>
                    )}

                    {def.defaultContent.logo_text !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Logo Text</label>
                            <input
                                type="text"
                                value={section.content?.logo_text || ''}
                                onChange={(e) => handleContentChange('logo_text', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            />
                        </div>
                    )}

                    {def.defaultContent.logo_url !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Logo URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={section.content?.logo_url || ''}
                                    onChange={(e) => handleContentChange('logo_url', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    )}

                    {def.defaultContent.date !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Date Text</label>
                            <input
                                type="text"
                                value={section.content?.date || ''}
                                onChange={(e) => handleContentChange('date', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            />
                        </div>
                    )}

                    {def.defaultContent.location !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
                            <input
                                type="text"
                                value={section.content?.location || ''}
                                onChange={(e) => handleContentChange('location', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            />
                        </div>
                    )}

                    {def.defaultContent.subtitle !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Subtitle</label>
                            <textarea
                                value={section.content?.subtitle || ''}
                                onChange={(e) => handleContentChange('subtitle', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                rows={2}
                            />
                        </div>
                    )}

                    {def.defaultContent.content !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Body Content (HTML)</label>
                            <textarea
                                value={section.content?.content || section.content?.description || ''}
                                onChange={(e) => handleContentChange(section.content?.content !== undefined ? 'content' : 'description', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm font-mono text-xs"
                                rows={6}
                            />
                        </div>
                    )}

                    {def.defaultContent.lead !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Lead Text</label>
                            <textarea
                                value={section.content?.lead || ''}
                                onChange={(e) => handleContentChange('lead', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                rows={3}
                            />
                        </div>
                    )}

                    {def.defaultContent.image !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Main Image URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={section.content?.image || ''}
                                    onChange={(e) => handleContentChange('image', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                />
                                <button className="px-2 border rounded hover:bg-slate-50" title="Open Image" onClick={() => window.open(section.content?.image, '_blank')}><ExternalLink className="w-4 h-4 text-slate-400" /></button>
                            </div>
                        </div>
                    )}

                    {def.defaultContent.primaryCtaText !== undefined && (
                        <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Button</h5>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text text-[10px] font-medium text-slate-600 mb-1">Label</label>
                                    <input
                                        type="text"
                                        value={section.content?.primaryCtaText || ''}
                                        onChange={(e) => handleContentChange('primaryCtaText', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text text-[10px] font-medium text-slate-600 mb-1">Link</label>
                                    <input
                                        type="text"
                                        value={section.content?.primaryCtaLink || ''}
                                        onChange={(e) => handleContentChange('primaryCtaLink', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {def.defaultContent.secondaryCtaText !== undefined && (
                        <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secondary Button</h5>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text text-[10px] font-medium text-slate-600 mb-1">Label</label>
                                    <input
                                        type="text"
                                        value={section.content?.secondaryCtaText || ''}
                                        onChange={(e) => handleContentChange('secondaryCtaText', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text text-[10px] font-medium text-slate-600 mb-1">Link</label>
                                    <input
                                        type="text"
                                        value={section.content?.secondaryCtaLink || ''}
                                        onChange={(e) => handleContentChange('secondaryCtaLink', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {def.defaultContent.tertiaryCtaText !== undefined && (
                        <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tertiary Button</h5>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text text-[10px] font-medium text-slate-600 mb-1">Label</label>
                                    <input
                                        type="text"
                                        value={section.content?.tertiaryCtaText || ''}
                                        onChange={(e) => handleContentChange('tertiaryCtaText', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text text-[10px] font-medium text-slate-600 mb-1">Link</label>
                                    <input
                                        type="text"
                                        value={section.content?.tertiaryCtaLink || ''}
                                        onChange={(e) => handleContentChange('tertiaryCtaLink', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {def.defaultContent.ctaText !== undefined && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Link Text</label>
                                <input
                                    type="text"
                                    value={section.content?.ctaText || ''}
                                    onChange={(e) => handleContentChange('ctaText', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Link URL</label>
                                <input
                                    type="text"
                                    value={section.content?.ctaLink || ''}
                                    onChange={(e) => handleContentChange('ctaLink', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {def.defaultContent.cta_text !== undefined && (
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">CTA Text</label>
                                <input
                                    type="text"
                                    value={section.content?.cta_text || ''}
                                    onChange={(e) => handleContentChange('cta_text', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">CTA URL</label>
                                <input
                                    type="text"
                                    value={section.content?.cta_url || ''}
                                    onChange={(e) => handleContentChange('cta_url', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {def.defaultContent.backgroundImage !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Background Image URL</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={section.content?.backgroundImage || ''}
                                    onChange={(e) => handleContentChange('backgroundImage', e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                />
                                <button className="px-2 border rounded hover:bg-slate-50" title="Open Image" onClick={() => window.open(section.content?.backgroundImage, '_blank')}><ExternalLink className="w-4 h-4 text-slate-400" /></button>
                            </div>
                        </div>
                    )}

                    {/* Array-based content: Items, Steps, Stats, Dates, etc. */}
                    {['items', 'steps', 'stats', 'dates', 'faqs', 'categories', 'testimonials', 'links'].map(arrayKey => {
                        const items = section.content?.[arrayKey];
                        if (!Array.isArray(items)) return null;

                        return (
                            <div key={arrayKey} className="space-y-3 pt-2">
                                <div className="flex justify-between items-end">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{arrayKey}</h4>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[10px] border-dashed"
                                        onClick={() => {
                                            const newItem = def.defaultContent[arrayKey]?.[0] || {};
                                            handleContentChange(arrayKey, [...items, { ...newItem }]);
                                        }}
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Add {arrayKey.slice(0, -1)}
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 relative group/item">
                                            <button
                                                onClick={() => {
                                                    const newItems = [...items];
                                                    newItems.splice(idx, 1);
                                                    handleContentChange(arrayKey, newItems);
                                                }}
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity shadow-sm border border-red-200 hover:bg-red-200"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>

                                            <div className="space-y-2">
                                                {typeof item === 'string' ? (
                                                    <input
                                                        type="text"
                                                        value={item}
                                                        onChange={(e) => {
                                                            const newItems = [...items];
                                                            newItems[idx] = e.target.value;
                                                            handleContentChange(arrayKey, newItems);
                                                        }}
                                                        className="w-full px-2 py-1.5 border rounded-md text-[11px]"
                                                    />
                                                ) : (
                                                    Object.keys(item).map(fieldKey => {
                                                        if (fieldKey === 'image') return (
                                                            <div key={fieldKey}>
                                                                <label className="block text-[10px] font-medium text-slate-500 mb-0.5 capitalize">{fieldKey}</label>
                                                                <input
                                                                    type="text"
                                                                    value={item[fieldKey] || ''}
                                                                    onChange={(e) => {
                                                                        const newItems = [...items];
                                                                        newItems[idx] = { ...item, [fieldKey]: e.target.value };
                                                                        handleContentChange(arrayKey, newItems);
                                                                    }}
                                                                    className="w-full px-2 py-1.5 border rounded-md text-[11px]"
                                                                    placeholder="Image URL"
                                                                />
                                                            </div>
                                                        );
                                                        if (fieldKey === 'sponsors') return (
                                                            <div key={fieldKey} className="pt-2 border-t border-slate-200 mt-2">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Sponsors List</label>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newItems = [...items];
                                                                            newItems[idx] = { ...item, sponsors: [...(item.sponsors || []), { name: '', image: '' }] };
                                                                            handleContentChange(arrayKey, newItems);
                                                                        }}
                                                                        className="text-indigo-500 text-[10px] font-bold"
                                                                    >+ Add Sponsor</button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {(item.sponsors || []).map((s: any, sIdx: number) => (
                                                                        <div key={sIdx} className="flex gap-1 items-center bg-white p-1 rounded border border-slate-100">
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Name"
                                                                                value={s.name || ''}
                                                                                onChange={(e) => {
                                                                                    const newItems = [...items];
                                                                                    const newSponsors = [...(item.sponsors || [])];
                                                                                    newSponsors[sIdx] = { ...s, name: e.target.value };
                                                                                    newItems[idx] = { ...item, sponsors: newSponsors };
                                                                                    handleContentChange(arrayKey, newItems);
                                                                                }}
                                                                                className="flex-1 px-1.5 py-1 border rounded text-[10px]"
                                                                            />
                                                                            <button
                                                                                onClick={() => {
                                                                                    const newItems = [...items];
                                                                                    const newSponsors = [...(item.sponsors || [])];
                                                                                    newSponsors.splice(sIdx, 1);
                                                                                    newItems[idx] = { ...item, sponsors: newSponsors };
                                                                                    handleContentChange(arrayKey, newItems);
                                                                                }}
                                                                                className="text-red-400 hover:text-red-600"
                                                                            ><Trash2 className="w-3 h-3" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );

                                                        return (
                                                            <div key={fieldKey}>
                                                                <label className="block text-[10px] font-medium text-slate-500 mb-0.5 capitalize">{fieldKey.replace('_', ' ')}</label>
                                                                {fieldKey === 'description' || fieldKey === 'answer' || fieldKey === 'quote' ? (
                                                                    <textarea
                                                                        value={item[fieldKey] || ''}
                                                                        onChange={(e) => {
                                                                            const newItems = [...items];
                                                                            newItems[idx] = { ...item, [fieldKey]: e.target.value };
                                                                            handleContentChange(arrayKey, newItems);
                                                                        }}
                                                                        className="w-full px-2 py-1.5 border rounded-md text-[11px]"
                                                                        rows={2}
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        value={item[fieldKey] || ''}
                                                                        onChange={(e) => {
                                                                            const newItems = [...items];
                                                                            newItems[idx] = { ...item, [fieldKey]: e.target.value };
                                                                            handleContentChange(arrayKey, newItems);
                                                                        }}
                                                                        className="w-full px-2 py-1.5 border rounded-md text-[11px]"
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Handle 'categories' array separately for Sponsors section */}
                    {section.type === 'sponsors' && section.content?.categories && (
                        <div className="space-y-3 pt-2">
                            {/* This is handled by the generic loop above if 'categories' is added to the keys list */}
                        </div>
                    )}
                </div>

                <hr className="border-slate-100" />

                {/* Settings Fields */}
                <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Appearance</h4>

                    {def.defaultSettings.align !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Alignment</label>
                            <select
                                value={section.settings?.align || 'center'}
                                onChange={(e) => handleSettingsChange('align', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                            </select>
                        </div>
                    )}

                    {def.defaultSettings.height !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Height</label>
                            <select
                                value={section.settings?.height || 'medium'}
                                onChange={(e) => handleSettingsChange('height', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                                <option value="full">Full Screen</option>
                            </select>
                        </div>
                    )}

                    {def.defaultSettings.backgroundColor !== undefined && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Background Color</label>
                            <select
                                value={section.settings?.backgroundColor || 'white'}
                                onChange={(e) => handleSettingsChange('backgroundColor', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                                <option value="white">White</option>
                                <option value="slate-50">Light Gray</option>
                                <option value="slate-900">Dark</option>
                                <option value="indigo-50">Indigo Tint</option>
                            </select>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
