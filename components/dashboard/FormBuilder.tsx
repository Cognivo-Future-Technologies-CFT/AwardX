import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  GripVertical, Trash2, Settings, Eye, Save, Plus, Type, FileText,
  ImageIcon, Link2, List, Calendar, Mail, CheckSquare, Radio,
  MoreVertical, ArrowUp, ArrowDown, X, AlertCircle, Palette, Layers,
  ChevronLeft, ChevronRight, Layout, Edit3, Move, ChevronDown, Award
} from 'lucide-react';
import { Button } from '../Button';
import { useConfirm } from '../ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
  pageId: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface FormPage {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export interface FormTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  buttonTextColor: string;
  borderRadius: string;
  fontFamily: string;
}

interface FormBuilderProps {
  onSave?: (fields: FormField[], pages: FormPage[], theme: FormTheme) => void;
  initialFields?: FormField[];
  initialPages?: FormPage[];
  initialTheme?: FormTheme;
  isSaving?: boolean;
}

export interface FormBuilderRef {
  getCurrentFormData: () => { fields: FormField[]; pages: FormPage[]; theme: FormTheme };
}

const fieldTypes = [
  {
    group: 'Essentials',
    items: [
      { type: 'text', label: 'Short Text', icon: Type, description: 'Names, titles, etc.' },
      { type: 'textarea', label: 'Long Text', icon: FileText, description: 'Essays, bios, etc.' },
      { type: 'email', label: 'Email', icon: Mail, description: 'Contact email' },
      { type: 'date', label: 'Date', icon: Calendar, description: 'Event dates' },
    ]
  },
  {
    group: 'Choices',
    items: [
      { type: 'select', label: 'Dropdown', icon: List, description: 'Select one from list' },
      { type: 'radio', label: 'Single Choice', icon: Radio, description: 'Radio buttons' },
      { type: 'checkbox', label: 'Multi Choice', icon: CheckSquare, description: 'Checkboxes' },
    ]
  },
  {
    group: 'Media & More',
    items: [
      { type: 'file', label: 'File Upload', icon: ImageIcon, description: 'Images, Docs, PDF' },
      { type: 'url', label: 'Website', icon: Link2, description: 'External links' },
      { type: 'number', label: 'Number', icon: Layout, description: 'Quantities, scores' },
      { type: 'award_selector', label: 'Award Selector', icon: Award, description: 'Pick award category' },
    ]
  }
];

const defaultTheme: FormTheme = {
  primaryColor: '#6366f1',
  secondaryColor: '#818cf8',
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  borderColor: '#e2e8f0',
  buttonTextColor: '#ffffff',
  borderRadius: '0.5rem',
  fontFamily: 'Inter, sans-serif',
};

export const FormBuilder = forwardRef<FormBuilderRef, FormBuilderProps>(({
  onSave,
  initialFields = [],
  initialPages,
  initialTheme = defaultTheme,
  isSaving = false
}, ref) => {
  const { confirm: confirmDialog, ConfirmDialogNode } = useConfirm();
  // --- State ---
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [pages, setPages] = useState<FormPage[]>(
    initialPages && initialPages.length > 0 
      ? initialPages 
      : [{ id: 'page-1', title: 'Page 1', order: 0 }]
  );
  const [theme, setTheme] = useState<FormTheme>(initialTheme);

  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string>(pages[0]?.id || 'page-1');

  const [isPreview, setIsPreview] = useState(false);
  const [previewPageIdx, setPreviewPageIdx] = useState(0);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // --- Effects ---
  useEffect(() => {
    if (initialPages && initialPages.length > 0) {
      setPages(initialPages);
      // Ensure specific page selection logic allows for correct ID
      setSelectedPageId(prev => {
        if (!initialPages.find(p => p.id === prev)) {
          return initialPages[0].id;
        }
        return prev;
      });
    } else {
      // Reset to default page when initialPages is empty or undefined
      const defaultPages = [{ id: 'page-1', title: 'Page 1', order: 0 }];
      setPages(defaultPages);
      setSelectedPageId('page-1');
    }
  }, [initialPages]);

  useEffect(() => {
    // Always set fields, even if empty array (to reset state)
    setFields(initialFields || []);
    setSelectedFieldId(null);
  }, [initialFields]);

  useEffect(() => {
    // Always set theme, reset to default if undefined
    setTheme(initialTheme || defaultTheme);
  }, [initialTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(coarsePointer || hasTouch);
  }, []);

  // Expose current form data via ref
  useImperativeHandle(ref, () => ({
    getCurrentFormData: () => ({
      fields,
      pages,
      theme
    })
  }));

  // --- Actions ---
  const addField = (type: string) => {
    const fieldDef = fieldTypes.flatMap(g => g.items).find(t => t.type === type);
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: fieldDef?.label || 'New Field',
      placeholder: '',
      helpText: '',
      required: false,
      pageId: selectedPageId,
      ...(type === 'select' || type === 'radio' || type === 'checkbox'
        ? { options: ['Option 1', 'Option 2', 'Option 3'] }
        : type === 'award_selector'
        ? { options: ['Best Picture', 'Best Director', 'Best Actor'] }
        : {}),
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFields(fields.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const duplicateField = (field: FormField, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newField = {
      ...field,
      id: `field-${Date.now()}`,
      label: `${field.label} (Copy)`
    };
    setFields([...fields, newField]);
  };

  const addPage = () => {
    const newPage: FormPage = {
      id: `page-${Date.now()}`,
      title: `Page ${pages.length + 1}`,
      order: pages.length,
    };
    setPages([...pages, newPage]);
    setSelectedPageId(newPage.id);
  };

  const deletePage = async (pageId: string) => {
    if (pages.length <= 1) return;
    const ok = await confirmDialog({
      title: 'Delete page?',
      description: 'All fields on this page will be moved to the first page.',
      confirmLabel: 'Delete page',
    });
    if (!ok) return;

    const remaining = pages.filter(p => p.id !== pageId);
    const firstId = remaining[0].id;

    setPages(remaining);
    setFields(fields.map(f => f.pageId === pageId ? { ...f, pageId: firstId } : f));
    setSelectedPageId(firstId);
  };

  const handleSave = () => {
    if (onSave) onSave(fields, pages, theme);
  };

  // Drag and Drop handlers with live reordering (like mobile app icons)
  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    setDraggedFieldId(fieldId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', fieldId);
    // Set drag image opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnter = (e: React.DragEvent, targetFieldId: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedFieldId || draggedFieldId === targetFieldId) return;

    const draggedIndex = fields.findIndex(f => f.id === draggedFieldId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    setDragOverIndex(targetIndex);

    // Live reorder: move fields in real-time as you drag
    const newFields = [...fields];
    const [removed] = newFields.splice(draggedIndex, 1);
    newFields.splice(targetIndex, 0, removed);

    setFields(newFields);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Small threshold to prevent flickering when moving between child elements
    const threshold = 10;
    if (x < rect.left - threshold || x > rect.right + threshold || 
        y < rect.top - threshold || y > rect.bottom + threshold) {
      // Don't clear immediately - wait a bit to prevent flicker
      setTimeout(() => {
        // Only clear if mouse is still outside
        const currentRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const currentX = e.clientX;
        const currentY = e.clientY;
        if (currentX < currentRect.left - threshold || currentX > currentRect.right + threshold || 
            currentY < currentRect.top - threshold || currentY > currentRect.bottom + threshold) {
          setDragOverIndex(null);
        }
      }, 50);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Fields are already in correct position from live reordering
    setDragOverIndex(null);
    setDraggedFieldId(null);
  };

  const handleDragEnd = () => {
    setDraggedFieldId(null);
    setDragOverIndex(null);
    // Reset any drag styling
    const elements = document.querySelectorAll('[data-dragged-field]');
    elements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.opacity = '';
        el.removeAttribute('data-dragged-field');
      }
    });
  };

  const moveFieldOnPage = (fieldId: string, direction: 'up' | 'down') => {
    const pageFields = fields.filter((f) => f.pageId === selectedPageId);
    const currentIndex = pageFields.findIndex((f) => f.id === fieldId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= pageFields.length) return;

    const sourceField = pageFields[currentIndex];
    const targetField = pageFields[targetIndex];
    const sourceGlobalIndex = fields.findIndex((f) => f.id === sourceField.id);
    const targetGlobalIndex = fields.findIndex((f) => f.id === targetField.id);
    if (sourceGlobalIndex === -1 || targetGlobalIndex === -1) return;

    const reordered = [...fields];
    const [moved] = reordered.splice(sourceGlobalIndex, 1);
    reordered.splice(targetGlobalIndex, 0, moved);
    setFields(reordered);
  };

  // --- Rendering ---

  const renderFieldInput = (field: FormField, isReadOnly = false) => {
    const style = {
      borderColor: isReadOnly ? theme.borderColor : undefined,
      borderRadius: theme.borderRadius,
      fontFamily: theme.fontFamily,
    };

    switch (field.type) {
      case 'textarea':
        return <textarea disabled={isReadOnly} className="w-full p-3 border rounded-md bg-white/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-y min-h-[100px]" placeholder={field.placeholder} style={style} />;
      case 'select':
        return (
          <div className="relative">
            <select 
              disabled={isReadOnly} 
              className="w-full p-3 pr-10 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" 
              style={style}
            >
              <option value="" disabled>{field.placeholder || 'Select an option...'}</option>
              {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        );
      case 'radio':
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                <input type={field.type} name={field.id} disabled={isReadOnly} className="w-4 h-4 accent-indigo-500" />
                <span className="text-sm text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'file':
        return (
          <div className="border-2 border-dashed rounded-lg p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer" style={{ borderColor: theme.borderColor, borderRadius: theme.borderRadius }}>
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-500">
              <ImageIcon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-600">Click to upload line</p>
            <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF (max. 5MB)</p>
          </div>
        );
      case 'award_selector':
        return (
          <div className="relative">
            <select
              disabled={isReadOnly}
              className="w-full p-3 pr-10 border border-slate-200 rounded-lg bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              style={style}
            >
              <option value="" disabled>{field.placeholder || 'Select award category...'}</option>
              {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
              <Award className="w-4 h-4 text-amber-500" />
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        );
      default:
        return <input type={field.type} disabled={isReadOnly} className="w-full p-3 border rounded-md bg-white/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder={field.placeholder} style={style} />;
    }
  };

  const renderEditCanvas = () => {
    const activeFields = fields.filter(f => f.pageId === selectedPageId);

        return (
      <div className="max-w-3xl mx-auto pb-20">
        {/* Page Header */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <input 
            value={pages.find(p => p.id === selectedPageId)?.title || ''}
            onChange={e => {
              const newPages = pages.map(p => p.id === selectedPageId ? { ...p, title: e.target.value } : p);
              setPages(newPages);
            }}
            className="text-3xl font-bold text-slate-800 w-full outline-none placeholder:text-slate-300 bg-transparent mb-2"
            placeholder="Page Title"
          />
          <input
            value={pages.find(p => p.id === selectedPageId)?.description || ''}
            onChange={e => {
              const newPages = pages.map(p => p.id === selectedPageId ? { ...p, description: e.target.value } : p);
              setPages(newPages);
            }}
            className="text-slate-500 w-full outline-none placeholder:text-slate-300 bg-transparent text-lg"
            placeholder="Add a description for this page..."
          />

          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button onClick={() => deletePage(selectedPageId)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete Page">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Fields List */}
        <div className="space-y-4 min-h-[400px]">
          {activeFields.length === 0 ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center opacity-50">
              <Layout className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700">Empty Page</h3>
              <p className="text-slate-500 max-w-sm mx-auto">Select elements from the sidebar to start building your form.</p>
        </div>
          ) : (
            <AnimatePresence mode='popLayout'>
              {activeFields.map((field, index) => {
                const isDragging = draggedFieldId === field.id;
                const isDragOver = dragOverIndex === index && !isDragging;
                
                return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: isDragging ? 0.5 : 1, 
                    y: 0,
                    scale: isDragging ? 0.98 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    layout: { 
                      duration: 0.3, 
                      ease: [0.25, 0.1, 0.25, 1] // Smooth easing for mobile-like feel
                    },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 }
                  }}
                  key={field.id}
                  data-dragged-field={isDragging ? field.id : undefined}
                  onClick={() => {
                    // Prevent click selection during/right after drag
                    if (!draggedFieldId && !dragOverIndex) {
                      setSelectedFieldId(field.id);
                    }
                  }}
                  draggable={!isTouchDevice}
                  onDragStartCapture={(e: React.DragEvent) => {
                    if (isTouchDevice) return;
                    handleDragStart(e, field.id);
                  }}
                  onDragEnter={(e: React.DragEvent) => {
                    if (isTouchDevice) return;
                    handleDragEnter(e, field.id, index);
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  className={`
                            relative bg-white rounded-xl border-2 transition-colors cursor-grab active:cursor-grabbing group
                            ${selectedFieldId === field.id && !isDragging
                      ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20 z-10'
                      : 'border-transparent hover:border-slate-200 shadow-sm hover:shadow-md'
                    }
                            ${isDragging ? 'z-50 opacity-50 cursor-grabbing' : ''}
                            ${isDragOver ? 'ring-2 ring-indigo-300 ring-offset-2 border-indigo-200' : ''}
                        `}
                >
                  <div className="p-6">
                    <div className="mb-3 flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        {selectedFieldId === field.id ? (
                          <input
                            value={field.label}
                            onChange={e => { e.stopPropagation(); updateField(field.id, { label: e.target.value }); }}
                            onClick={e => e.stopPropagation()}
                            className="text-sm font-semibold text-slate-800 block mb-1 w-full bg-transparent border-b-2 border-indigo-400 outline-none focus:border-indigo-600 pb-0.5"
                            placeholder="Field label..."
                            autoFocus
                          />
                        ) : (
                        <label className="text-sm font-semibold text-slate-800 block mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        )}
                        {selectedFieldId !== field.id && field.helpText && <p className="text-xs text-slate-500">{field.helpText}</p>}
                    </div>

                      {selectedFieldId === field.id && (
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 text-slate-400 ml-2 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); updateField(field.id, { required: !field.required }); }}
                            className={`p-1.5 rounded-md shadow-sm transition-all text-xs font-semibold ${field.required ? 'bg-red-50 text-red-500' : 'hover:text-orange-600 hover:bg-orange-50'}`}
                            title={field.required ? 'Mark optional' : 'Mark required'}
                          >
                            <span className="text-[10px] px-0.5">{field.required ? 'REQ' : 'OPT'}</span>
                          </button>
                          <button onClick={(e) => duplicateField(field, e)} className="p-1.5 hover:text-indigo-600 hover:bg-white rounded-md shadow-sm transition-all" title="Duplicate"><Edit3 className="w-3.5 h-3.5" /></button>
                          {isTouchDevice && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveFieldOnPage(field.id, 'up');
                                }}
                                className="p-1.5 hover:text-indigo-600 hover:bg-white rounded-md shadow-sm transition-all"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveFieldOnPage(field.id, 'down');
                                }}
                                className="p-1.5 hover:text-indigo-600 hover:bg-white rounded-md shadow-sm transition-all"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button onClick={(e) => deleteField(field.id, e)} className="p-1.5 hover:text-red-500 hover:bg-white rounded-md shadow-sm transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
                      )}
            </div>

                    {selectedFieldId === field.id ? (
                      <div className="space-y-3" onClick={e => e.stopPropagation()}>
                        <div>
                          <input
                            value={field.placeholder || ''}
                            onChange={e => updateField(field.id, { placeholder: e.target.value })}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="Placeholder text..."
                          />
                        </div>
                        <div>
                          <input
                            value={field.helpText || ''}
                            onChange={e => updateField(field.id, { helpText: e.target.value })}
                            className="w-full p-2 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            placeholder="Help text (optional)..."
                          />
                        </div>
                        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox' || field.type === 'award_selector') && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Options</span>
                            {field.options?.map((opt, i) => (
                              <div key={i} className="flex gap-1.5">
                                <input
                                  value={opt}
                                  onChange={e => {
                                    const newOpts = [...(field.options || [])];
                                    newOpts[i] = e.target.value;
                                    updateField(field.id, { options: newOpts });
                                  }}
                                  className="flex-1 p-1.5 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                                />
                                <button
                                  onClick={() => {
                                    const newOpts = field.options?.filter((_, idx) => idx !== i);
                                    updateField(field.id, { options: newOpts });
                                  }}
                                  className="p-1.5 text-slate-300 hover:text-red-500 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => updateField(field.id, { options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-1"
                            >
                              <Plus className="w-3 h-3" /> Add Option
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                    <div className="pointer-events-none opacity-75">
                      {renderFieldInput(field)}
                    </div>
                    )}
      </div>

                  {/* Drag Handle Indicator */}
                  {!isTouchDevice && (
                    <div
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 cursor-move p-1"
                      draggable
                      onDragStart={(e: React.DragEvent) => {
                        e.stopPropagation();
                        handleDragStart(e, field.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
                );
              })}
            </AnimatePresence>
            )}
          </div>

        {/* Add Page Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={addPage}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all hover:shadow-md"
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-indigo-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500">
              <Plus className="w-4 h-4" />
          </div>
            <span className="font-medium text-sm">Add New Page</span>
          </button>
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    const currentPage = pages[previewPageIdx];
    const pageFields = fields.filter(f => f.pageId === currentPage.id);
    const isFirst = previewPageIdx === 0;
    const isLast = previewPageIdx === pages.length - 1;

    return (
      <div className="max-w-2xl mx-auto my-10 bg-white shadow-2xl rounded-2xl overflow-hidden min-h-[600px] flex flex-col" style={{ borderRadius: theme.borderRadius }}>
        <div className="h-2" style={{ background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})` }} />
        <div className="p-8 md:p-12 flex-1">
          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-3" style={{ color: theme.textColor, fontFamily: theme.fontFamily }}>{currentPage.title}</h2>
            {currentPage.description && <p className="text-lg opacity-70" style={{ color: theme.textColor }}>{currentPage.description}</p>}
                    </div>

          <div className="space-y-8">
            {pageFields.map(field => (
              <div key={field.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <label className="block text-sm font-semibold mb-2" style={{ color: theme.textColor }}>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                {renderFieldInput(field, false)}
                {field.helpText && <p className="text-xs mt-2 opacity-60" style={{ color: theme.textColor }}>{field.helpText}</p>}
                        </div>
            ))}
                        </div>
                      </div>

        <div className="p-8 border-t bg-slate-50 flex justify-between items-center" style={{ borderColor: theme.borderColor }}>
                        <Button
            variant="ghost"
            disabled={isFirst}
            onClick={() => setPreviewPageIdx(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
          <div className="text-xs font-semibold text-slate-400 tracking-wider">
            STEP {previewPageIdx + 1} OF {pages.length}
                      </div>
                        <Button 
            variant={isLast ? 'primary' : 'outline'}
            onClick={() => isLast ? null : setPreviewPageIdx(p => p + 1)}
            style={isLast ? { backgroundColor: theme.primaryColor, color: theme.buttonTextColor } : {}}
          >
            {isLast ? 'Submit Application' : 'Next Step'}
            {!isLast && <ChevronRight className="w-4 h-4 ml-2" />}
                        </Button>
                </div>
              </div>
    );
  };

  if (isPreview) {
                    return (
      <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
        {/* Preview Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Eye className="w-5 h-5" />
                      </div>
            <div>
              <h3 className="font-bold text-slate-800">Preview Mode</h3>
              <p className="text-xs text-slate-500">Test your form experience</p>
                    </div>
                  </div>
          <Button variant="outline" onClick={() => setIsPreview(false)}>
            <X className="w-4 h-4 mr-2" /> Exit Preview
          </Button>
                  </div>
        <div className="p-6">
          {renderPreview()}
                </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-50 font-sans">
      {ConfirmDialogNode}
      {/* 1. Left Sidebar: Toolkit */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl shadow-slate-200/50">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layout className="w-5 h-5 text-indigo-600" />
            Form Elements
          </h2>
          </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-8">
          {fieldTypes.map(group => (
            <div key={group.group}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">{group.group}</h3>
              <div className="grid gap-3">
                {group.items.map(item => (
                  <button
                    key={item.type}
                    onClick={() => addField(item.type)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-all group text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors">
                      <item.icon className="w-4 h-4" />
        </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-700 group-hover:text-indigo-900">{item.label}</div>
                      <div className="text-[10px] text-slate-400">{item.description}</div>
      </div>
                  </button>
                ))}
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Toolbar */}
        <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-700">Form Builder</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-4 bg-white border border-slate-200 rounded-lg px-2 py-1">
              {pages.map(page => (
                          <button
                  key={page.id}
                  onClick={() => setSelectedPageId(page.id)}
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-all ${selectedPageId === page.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  {page.order + 1}
                          </button>
              ))}
              <button onClick={addPage} className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-indigo-600">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

            <div className="h-6 w-px bg-slate-200 mx-2" />

            <Button variant="ghost" onClick={() => setIsPreview(true)}>
              <Eye className="w-4 h-4 mr-2" /> Preview
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving} className="shadow-lg shadow-indigo-500/20">
              <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Form'}
            </Button>
                    </div>
                  </div>

        {/* Builder Area */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {renderEditCanvas()}
                    </div>
                  </div>

      {/* 3. Right Sidebar: Properties */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col z-20 shadow-xl shadow-slate-200/50">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
            Theme Settings
          </h2>
                  </div>

        <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
                  <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-500 uppercase">Brand Colors</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Primary</label>
                    <div className="flex items-center gap-2 border p-2 rounded-lg">
                      <input type="color" value={theme.primaryColor} onChange={e => setTheme({ ...theme, primaryColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                      <span className="text-xs font-mono">{theme.primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Secondary</label>
                    <div className="flex items-center gap-2 border p-2 rounded-lg">
                      <input type="color" value={theme.secondaryColor} onChange={e => setTheme({ ...theme, secondaryColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                      <span className="text-xs font-mono">{theme.secondaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Background</label>
                    <div className="flex items-center gap-2 border p-2 rounded-lg">
                      <input type="color" value={theme.backgroundColor} onChange={e => setTheme({ ...theme, backgroundColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                      <span className="text-xs font-mono">{theme.backgroundColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Text</label>
                    <div className="flex items-center gap-2 border p-2 rounded-lg">
                      <input type="color" value={theme.textColor} onChange={e => setTheme({ ...theme, textColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                      <span className="text-xs font-mono">{theme.textColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Border</label>
                    <div className="flex items-center gap-2 border p-2 rounded-lg">
                      <input type="color" value={theme.borderColor} onChange={e => setTheme({ ...theme, borderColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                      <span className="text-xs font-mono">{theme.borderColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Button Text</label>
                    <div className="flex items-center gap-2 border p-2 rounded-lg">
                      <input type="color" value={theme.buttonTextColor} onChange={e => setTheme({ ...theme, buttonTextColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                      <span className="text-xs font-mono">{theme.buttonTextColor}</span>
                    </div>
                  </div>
                    </div>
                  </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Text Typography</label>
                <div className="relative">
                  <select
                    value={theme.fontFamily}
                    onChange={e => setTheme({ ...theme, fontFamily: e.target.value })}
                    className="w-full p-3 pr-10 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer hover:border-slate-300 shadow-sm"
                  >
                    <option value="Inter, sans-serif">Inter (Modern)</option>
                    <option value="serif">Serif (Elegant)</option>
                    <option value="monospace">Monospace (Technical)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
                </div>

                  <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Style</label>
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors shadow-sm">
                  <span className="text-sm font-medium text-slate-700">Rounded Corners</span>
                  <div className="relative">
                    <select
                      value={theme.borderRadius}
                      onChange={e => setTheme({ ...theme, borderRadius: e.target.value })}
                      className="text-sm pr-8 pl-3 py-1.5 border-none bg-transparent text-right font-semibold text-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none cursor-pointer appearance-none hover:text-indigo-700 transition-colors"
                    >
                      <option value="0px">None</option>
                      <option value="0.5rem">Medium</option>
                      <option value="1rem">Large</option>
                      <option value="9999px">Full</option>
                    </select>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                  </div>
                    </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
});
