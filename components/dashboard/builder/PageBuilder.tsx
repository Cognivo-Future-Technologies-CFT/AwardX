import React, { useState, useEffect } from 'react';
import { programPages } from '../../../services/supabase';
import { sectionDefs, SectionPreview, DEFAULT_TEMPLATE } from './SectionBlocks';
import { PropertyPanel } from './PropertyPanel';
import { Reorder, useDragControls } from 'framer-motion';
import { Save, Plus, GripVertical, Rocket, Eye, Monitor, Smartphone, Tablet, LayoutTemplate } from 'lucide-react';
import { Button } from '../../Button';

interface PageBuilderProps {
    programId: string;
}

export const PageBuilder: React.FC<PageBuilderProps> = ({ programId }) => {
    const [sections, setSections] = useState<any[]>([]);
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

    useEffect(() => {
        loadData();
    }, [programId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [configRes, sectionsRes] = await Promise.all([
                programPages.getConfig(programId),
                programPages.getSections(programId)
            ]);

            setConfig(configRes.data || { theme_settings: {} });

            // Auto-populate if empty
            if (!sectionsRes.data || sectionsRes.data.length === 0) {
                // Map the default template to include necessary IDs and program_id
                const initializedSections = DEFAULT_TEMPLATE.map((def, index) => ({
                    id: `temp-init-${Date.now()}-${index}`,
                    program_id: programId,
                    section_type: def.type,
                    title: def.label,
                    content: def.content,
                    settings: def.settings,
                    sort_order: index,
                    is_visible: true
                }));
                // We're not saving to DB yet, just initializing state. User must click Save.
                // Or: we could auto-save. For now, let's just show it in the builder.
                setSections(initializedSections);
            } else {
                setSections(sectionsRes.data || []);
            }

        } catch (error) {
            console.error('Error loading builder data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSection = (type: string) => {
        const def = sectionDefs.find(s => s.type === type);
        if (!def) return;

        const newSection = {
            id: `temp-${Date.now()}`, // Temp ID
            program_id: programId,
            section_type: type,
            title: def.label,
            content: { ...def.defaultContent },
            settings: { ...def.defaultSettings },
            sort_order: sections.length,
            is_visible: true
        };

        setSections([...sections, newSection]);
        setSelectedSectionId(newSection.id);
    };

    const handleUpdateSection = (updatedSection: any) => {
        setSections(sections.map(s => s.id === updatedSection.id ? updatedSection : s));
    };

    const handleDeleteSection = async (id: string) => {
        if (confirm('Are you sure you want to delete this section?')) {
            // If it's a temp ID, just remove from state
            if (id.startsWith('temp-')) {
                setSections(sections.filter(s => s.id !== id));
            } else {
                // Delete from DB immediately or wait for save? 
                // Let's delete immediately for simplicity in this MVP logic or handle in save.
                // Better: Remove from UI, track deletions.
                // For now: Just remove from UI, and delete from DB if confirmed.
                await programPages.deleteSection(id);
                setSections(sections.filter(s => s.id !== id));
            }
            if (selectedSectionId === id) setSelectedSectionId(null);
        }
    };

    const handleMove = (id: string, direction: 'up' | 'down') => {
        const index = sections.findIndex(s => s.id === id);
        if (index === -1) return;

        const newSections = [...sections];
        if (direction === 'up' && index > 0) {
            [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
        } else if (direction === 'down' && index < sections.length - 1) {
            [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        }

        // Update sort orders
        const reordered = newSections.map((s, i) => ({ ...s, sort_order: i }));
        setSections(reordered);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Save Config
            await programPages.createOrUpdateConfig(programId, config);

            // 2. Save Sections
            // We need to save each section. For new ones (temp-), DB will generate ID.
            // Ideally we should process them sequentially or in parallel.

            // Note: Re-assign sort orders based on current array index
            const sectionsToSave = sections.map((s, index) => ({
                ...s,
                sort_order: index
            }));

            const savePromises = sectionsToSave.map(s => programPages.saveSection(s));
            const results = await Promise.all(savePromises);

            // Update local state with returned data (especially for new IDs)
            const newSectionsState = results.map(r => r.data).filter(Boolean);
            setSections(newSectionsState);

            alert('Changes saved successfully!');
        } catch (error) {
            console.error('Error saving:', error);
            alert('Failed to save changes.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-12 text-center">Loading builder...</div>;
    }

    const selectedSection = sections.find(s => s.id === selectedSectionId);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100">
            {/* Top Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-10">
                <h1 className="text-lg font-bold text-slate-800">Page Builder</h1>

                <div className="flex items-center gap-4">
                    {/* Preview Toggles */}
                    <div className="flex bg-slate-100 rounded-lg p-1 mr-4">
                        <button
                            onClick={() => setPreviewMode('desktop')}
                            className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Desktop View"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPreviewMode('tablet')}
                            className={`p-2 rounded ${previewMode === 'tablet' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Tablet View"
                        >
                            <Tablet className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setPreviewMode('mobile')}
                            className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Mobile View"
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                    </div>

                    <Button variant="outline" className="mr-2" onClick={() => window.open(`/?page=program&id=${programId}`, '_blank')}>
                        <Eye className="w-4 h-4 mr-2" /> Live Preview
                    </Button>

                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Draft'}
                    </Button>

                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                        <Rocket className="w-4 h-4 mr-2" /> Publish
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Toolbox */}
                <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto flex-shrink-0">
                    <div className="p-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Add Section</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {sectionDefs.map(def => (
                                <button
                                    key={def.type}
                                    onClick={() => handleAddSection(def.type)}
                                    className="flex items-center p-3 text-left border border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                >
                                    <def.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mr-3" />
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-900">{def.label}</span>
                                    <Plus className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 text-indigo-600" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center - Canvas */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center">
                    <div
                        className={`bg-white shadow-xl min-h-[800px] transition-all duration-300 ${previewMode === 'mobile' ? 'w-[375px]' :
                            previewMode === 'tablet' ? 'w-[768px]' :
                                'w-full max-w-5xl'
                            }`}
                    >
                        {/* Empty State */}
                        {sections.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-200 m-8 rounded-xl">
                                <LayoutTemplate className="w-12 h-12 mb-4" />
                                <p>Your page is empty. Add sections from the sidebar.</p>
                            </div>
                        )}

                        <Reorder.Group axis="y" values={sections} onReorder={setSections} className="space-y-0 relative">
                            {sections.map((section) => (
                                <Reorder.Item key={section.id} value={section} className="relative group">
                                    {/* Hover Controls */}
                                    <div className={`absolute top-0 right-0 left-0 bottom-0 z-10 border-2 pointer-events-none transition-opacity ${selectedSectionId === section.id ? 'border-indigo-500 opacity-100' : 'border-transparent opacity-0 group-hover:opacity-100 group-hover:border-indigo-200'}`}>
                                        <div className="absolute top-2 right-2 pointer-events-auto flex items-center gap-2">
                                            <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded shadow">{section.title}</span>
                                        </div>
                                    </div>

                                    {/* Click to Select */}
                                    <div className="relative" onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSectionId(section.id);
                                    }}>
                                        <SectionPreview section={section} />
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                    </div>
                </div>

                {/* Right Sidebar - Properties */}
                <div className="w-80 bg-white border-l border-slate-200 flex-shrink-0">
                    <PropertyPanel
                        section={selectedSection}
                        onChange={handleUpdateSection}
                        onDelete={handleDeleteSection}
                        onMoveUp={(id) => handleMove(id, 'up')}
                        onMoveDown={(id) => handleMove(id, 'down')}
                    />
                </div>
            </div>
        </div>
    );
};
