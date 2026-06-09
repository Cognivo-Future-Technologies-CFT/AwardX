import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  GripVertical, Trash2, Settings, Eye, Save, Plus, Type, FileText,
  ImageIcon, Link2, List, Calendar, Mail, CheckSquare, Radio,
  MoreVertical, ArrowUp, ArrowDown, X, AlertCircle, Palette, Layers,
  ChevronLeft, ChevronRight, Layout, Edit3, Move, ChevronDown, Award,
  CheckCircle, XCircle, CreditCard, PanelLeftClose, PanelRightClose
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
  onPublish?: (fields: FormField[], pages: FormPage[], theme: FormTheme) => void;
  isPublished?: boolean;
  initialFields?: FormField[];
  initialPages?: FormPage[];
  initialTheme?: FormTheme;
  isSaving?: boolean;
  paymentConfigured?: boolean;
  paymentProvider?: string;
  elementsPanelOpen?: boolean;
  propertiesPanelOpen?: boolean;
  onElementsPanelOpenChange?: (open: boolean) => void;
  onPropertiesPanelOpenChange?: (open: boolean) => void;
  awardOptions?: string[];
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
  },
  {
    group: 'Advanced',
    items: [
      { type: 'payment', label: 'Payment', icon: CreditCard, description: 'Collect fees via Razorpay' },
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
  onPublish,
  isPublished,
  initialFields = [],
  initialPages,
  initialTheme = defaultTheme,
  isSaving = false,
  paymentConfigured = false,
  paymentProvider,
  elementsPanelOpen = true,
  propertiesPanelOpen = false,
  onElementsPanelOpenChange,
  onPropertiesPanelOpenChange,
  awardOptions = [],
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
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);

  const [isPreview, setIsPreview] = useState(false);
  const [previewPageIdx, setPreviewPageIdx] = useState(0);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // --- Undo / Redo history ------------------------------------------------
  type Snapshot = { fields: FormField[]; pages: FormPage[]; theme: FormTheme };
  const historyRef  = useRef<Snapshot[]>([]);
  const futureRef   = useRef<Snapshot[]>([]);
  const skipHistory = useRef(false); // prevent re-recording on undo/redo restore

  /** Call after any user-driven mutation to record a snapshot */
  const pushHistory = useCallback(() => {
    if (skipHistory.current) return;
    // Capture *current* React state values by reading refs that we keep in sync
    // We schedule via functional state updates to get the latest committed values
    setFields(f => {
      setPages(p => {
        setTheme(t => {
          historyRef.current.push({ fields: f, pages: p, theme: t });
          if (historyRef.current.length > 60) historyRef.current.shift();
          futureRef.current = [];       // new action clears redo stack
          return t;
        });
        return p;
      });
      return f;
    });
  }, []);

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setFields(f => { futureRef.current.push({ fields: f, pages: [], theme: defaultTheme }); return f; });
    // Store current as redo entry, then restore
    setFields(cur => { setPages(cp => { setTheme(ct => {
      futureRef.current[futureRef.current.length - 1] = { fields: cur, pages: cp, theme: ct };
      return ct;
    }); return cp; }); return cur; });
    skipHistory.current = true;
    setFields(prev.fields);
    setPages(prev.pages);
    setTheme(prev.theme);
    skipHistory.current = false;
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    setFields(cur => { setPages(cp => { setTheme(ct => {
      historyRef.current.push({ fields: cur, pages: cp, theme: ct });
      return ct;
    }); return cp; }); return cur; });
    skipHistory.current = true;
    setFields(next.fields);
    setPages(next.pages);
    setTheme(next.theme);
    skipHistory.current = false;
  }, []);

  // Keyboard shortcut listener — Cmd/Ctrl+Z = undo, Cmd/Ctrl+Y or Cmd/Ctrl+Shift+Z = redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);
  // -------------------------------------------------------------------------

  // --- Effects ---
  useEffect(() => {
    if (initialPages && initialPages.length > 0) {
      setPages(initialPages);
      setSelectedPageId(prev => {
        if (!initialPages.find(p => p.id === prev)) return initialPages[0].id;
        return prev;
      });
    } else {
      const defaultPages = [{ id: 'page-1', title: 'Page 1', order: 0 }];
      setPages(defaultPages);
      setSelectedPageId('page-1');
    }
  }, [initialPages]);

  useEffect(() => {
    setFields(initialFields || []);
    setSelectedFieldId(null);
  }, [initialFields]);

  useEffect(() => {
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
    getCurrentFormData: () => ({ fields, pages, theme }),
  }));

  // --- Actions ---
  // --- Actions (each mutating action records a history snapshot first) ---
  const addField = (type: string) => {
    if (type === 'award_selector') {
      const existingAwardField = fields.find((field) => field.type === 'award_selector');
      if (existingAwardField) {
        setSelectedFieldId(existingAwardField.id);
        return;
      }
    }

    // Payment field: show popup if not configured
    if (type === 'payment' && !paymentConfigured) {
      setShowPaymentPopup(true);
      return;
    }

    pushHistory();
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
        ? { options: awardOptions.length > 0 ? awardOptions : ['General'] }
        : {}),
    };
    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    pushHistory();
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    pushHistory();
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const duplicateField = (field: FormField, e?: React.MouseEvent) => {
    if (field.type === 'award_selector') {
      return;
    }
    e?.stopPropagation();
    pushHistory();
    const newField = { ...field, id: `field-${Date.now()}`, label: `${field.label} (Copy)` };
    setFields(prev => [...prev, newField]);
  };

  const addPage = () => {
    pushHistory();
    const newPage: FormPage = {
      id: `page-${Date.now()}`,
      title: `Page ${pages.length + 1}`,
      order: pages.length,
    };
    setPages(prev => [...prev, newPage]);
    setSelectedPageId(newPage.id);
  };

  const deletePage = async (pageId: string) => {
    if (pages.length <= 1) return;
    const ok = await confirmDialog({
      title: 'Delete page?',
      description: 'Are you sure? This page and all form elements on it will be permanently deleted. This cannot be undone.',
      confirmLabel: 'Delete Page',
    });
    if (!ok) return;
    pushHistory();
    const remaining = pages
      .filter(p => p.id !== pageId)
      .map((p, idx) => ({ ...p, order: idx }));
    const firstId = remaining[0].id;
    setPages(remaining);
    setFields(prev => prev.filter(f => f.pageId !== pageId));
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
    pushHistory();
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
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <select
              disabled={isReadOnly}
              className="w-full p-3 pl-10 pr-10 border border-indigo-200 rounded-xl bg-indigo-50/30 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium"
              style={style}
            >
              <option value="" disabled>{field.placeholder || 'Select award category...'}</option>
              {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className={`relative ${!paymentConfigured ? 'opacity-40 pointer-events-none' : ''}`}>
            <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-xl p-6 text-center">
              <CreditCard className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-emerald-800">Payment Collection</p>
              <p className="text-xs text-emerald-600 mt-1">Submission fee will be collected via {paymentProvider || 'Razorpay'}</p>
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
        <div 
          onClick={() => {
            setSelectedFieldId('page-description');
            onPropertiesPanelOpenChange?.(true);
          }}
          className={`bg-white rounded-xl p-8 mb-6 relative overflow-hidden group transition-all border-2 cursor-pointer ${
            selectedFieldId === 'page-description'
              ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20 z-10'
              : 'border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <input 
            value={pages.find(p => p.id === selectedPageId)?.title || ''}
            onChange={e => {
              const newPages = pages.map(p => p.id === selectedPageId ? { ...p, title: e.target.value } : p);
              setPages(newPages);
            }}
            className="text-3xl font-bold text-slate-800 w-full outline-none placeholder:text-slate-300 bg-transparent mb-2 border-none focus:border-none focus:shadow-none"
            placeholder="Page Title"
          />
          <input
            value={pages.find(p => p.id === selectedPageId)?.description || ''}
            onChange={e => {
              const newPages = pages.map(p => p.id === selectedPageId ? { ...p, description: e.target.value } : p);
              setPages(newPages);
            }}
            className="text-slate-500 w-full outline-none placeholder:text-slate-300 text-lg px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 hover:border-slate-300 focus:border-slate-300 focus:bg-white transition-all focus:shadow-none"
            placeholder="Add a description for this page..."
          />

          {pages.length > 1 && (
            <div className="absolute top-4 right-4 flex gap-2" onClick={e => e.stopPropagation()}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deletePage(selectedPageId);
                }} 
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" 
                title="Delete Page"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
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
                      onPropertiesPanelOpenChange?.(true);
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
                            onClick={(e) => {
                              e.stopPropagation();
                              updateField(field.id, { required: !field.required });
                            }}
                            className={`p-1.5 rounded-md shadow-sm transition-all text-xs font-semibold ${field.required ? 'bg-red-50 text-red-500' : 'hover:text-orange-600 hover:bg-orange-50'}`}
                            title={field.required ? 'Mark optional' : 'Mark required'}
                          >
                            <span className="text-[10px] px-0.5">{field.required ? 'REQ' : 'OPT'}</span>
                          </button>
                          <button
                            onClick={(e) => duplicateField(field, e)}
                            className="p-1.5 hover:text-indigo-600 hover:bg-white rounded-md shadow-sm transition-all"
                            title="Duplicate"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
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
                        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
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
                        {field.type === 'award_selector' && (
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-2.5 py-2 font-medium">
                              Award options are synced from program award categories. Toggle REQ/OPT to make this field required or optional.
                            </p>
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

  const collapseElementsPanel = () => onElementsPanelOpenChange?.(false);
  const collapsePropertiesPanel = () => onPropertiesPanelOpenChange?.(false);

  return (
    <div className="flex flex-col xl:flex-row h-full min-h-0 bg-slate-50 font-sans">
      {ConfirmDialogNode}
      {/* 1. Left Sidebar: Toolkit */}
      <div
        className={`flex-shrink-0 overflow-hidden transition-[width,max-height,opacity] duration-300 ease-in-out ${
          elementsPanelOpen
            ? 'w-full xl:w-72 max-h-[42vh] xl:max-h-none opacity-100'
            : 'w-0 max-h-0 xl:max-h-none opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex h-full w-full xl:w-72 flex-col border-b border-slate-200 bg-white shadow-xl shadow-slate-200/50 xl:border-b-0 xl:border-r" data-demo-target="form-elements-panel">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Layout className="h-5 w-5 text-indigo-600" />
            Form Elements
          </h2>
          <button
            type="button"
            onClick={collapseElementsPanel}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Collapse form elements"
            aria-label="Collapse form elements"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
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
      </div>

      {/* 2. Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-[48vh] bg-[#F8FAFC]">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-3 sm:px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-sm font-bold text-slate-700">Form Builder</h3>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <div className="flex items-center gap-1 sm:gap-2 bg-white border border-slate-200 rounded-lg px-1.5 sm:px-2 py-1 max-w-full overflow-x-auto">
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
              <button
                onClick={addPage}
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-indigo-600"
                title="Add Page"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => deletePage(selectedPageId)}
                disabled={pages.length <= 1}
                className="w-8 h-8 rounded-md flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:text-slate-300 transition-colors"
                title={pages.length <= 1 ? "Cannot delete the only page" : "Delete current page"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden sm:block h-6 w-px bg-slate-200 mx-1" />

            {/* Undo / Redo */}
            <button
              type="button"
              onClick={undo}
              disabled={historyRef.current.length === 0}
              title="Undo (Ctrl/⌘ Z)"
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6" /><path d="M3 13A9 9 0 1 0 5.2 5.2" />
              </svg>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={futureRef.current.length === 0}
              title="Redo (Ctrl/⌘ Y)"
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 7v6h-6" /><path d="M21 13A9 9 0 1 1 18.8 5.2" />
              </svg>
            </button>

            <div className="hidden sm:block h-6 w-px bg-slate-200 mx-1" />

            <Button variant="ghost" onClick={() => setIsPreview(true)}>
              <Eye className="w-4 h-4 mr-2" /> Preview
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving} className="shadow-lg shadow-indigo-500/20">
              <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Form'}
            </Button>
            {onPublish && (
              <Button
                variant={isPublished ? 'outline' : 'primary'}
                onClick={() => onPublish(fields, pages, theme)}
                className={isPublished ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'}
              >
                {isPublished ? (
                  <><XCircle className="w-4 h-4 mr-2" /> Unpublish</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Publish</>
                )}
              </Button>
            )}
                    </div>
                  </div>

        {/* Builder Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative" data-demo-target="form-preview-canvas">
          {renderEditCanvas()}
                    </div>
                  </div>

      {/* 3. Right Sidebar: Properties */}
      <div
        className={`flex-shrink-0 overflow-hidden transition-[width,max-height,opacity] duration-300 ease-in-out ${
          propertiesPanelOpen
            ? 'w-full xl:w-80 max-h-[42vh] xl:max-h-none opacity-100'
            : 'w-0 max-h-0 xl:max-h-none opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex h-full w-full xl:w-80 flex-col border-t border-slate-200 bg-white shadow-xl shadow-slate-200/50 xl:border-l xl:border-t-0">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-800">
            Field Properties
          </h2>
          <button
            type="button"
            onClick={collapsePropertiesPanel}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="Collapse field properties"
            aria-label="Collapse field properties"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {selectedFieldId === 'page-description' ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Page Title</label>
                <input
                  type="text"
                  value={pages.find(p => p.id === selectedPageId)?.title || ''}
                  onChange={e => {
                    const newPages = pages.map(p => p.id === selectedPageId ? { ...p, title: e.target.value } : p);
                    setPages(newPages);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-semibold text-slate-800"
                  placeholder="e.g. Page 1"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Description Text</label>
                <textarea
                  value={pages.find(p => p.id === selectedPageId)?.description || ''}
                  onChange={e => {
                    const newPages = pages.map(p => p.id === selectedPageId ? { ...p, description: e.target.value } : p);
                    setPages(newPages);
                  }}
                  rows={5}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none font-normal text-slate-800"
                  placeholder="Add a description for this page..."
                />
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <div>
                  <span className="text-sm font-semibold text-slate-700 block">Required</span>
                  <span className="text-[10px] text-slate-400 font-medium">Compulsory for every page</span>
                </div>
                <button
                  type="button"
                  disabled
                  className="relative h-7 w-12 rounded-full transition-colors shrink-0 bg-indigo-600 opacity-60 cursor-not-allowed"
                >
                  <span className="absolute top-1 left-0 h-5 w-5 rounded-full bg-white shadow translate-x-6" />
                </button>
              </div>
            </div>
          ) : selectedFieldId && fields.find(f => f.id === selectedFieldId) ? (() => {
            const field = fields.find(f => f.id === selectedFieldId)!;
            return (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={e => updateField(field.id, { label: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Placeholder</label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={e => updateField(field.id, { placeholder: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="Enter placeholder text..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Help Text</label>
                  <input
                    type="text"
                    value={field.helpText || ''}
                    onChange={e => updateField(field.id, { helpText: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="Additional guidance for this field..."
                  />
                </div>
                <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white">
                  <span className="text-sm font-medium text-slate-700">Required</span>
                  <button
                    type="button"
                    onClick={() => updateField(field.id, { required: !field.required })}
                    className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${field.required ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-1 left-0 h-5 w-5 rounded-full bg-white shadow transition-transform ${field.required ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {field.type === 'text' || field.type === 'textarea' || field.type === 'number' ? (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Validation</label>
                    {field.type === 'number' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Min</label>
                          <input type="number" value={field.validation?.min ?? ''} onChange={e => updateField(field.id, { validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined } })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Max</label>
                          <input type="number" value={field.validation?.max ?? ''} onChange={e => updateField(field.id, { validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined } })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Min Length</label>
                          <input type="number" value={field.validation?.min ?? ''} onChange={e => updateField(field.id, { validation: { ...field.validation, min: e.target.value ? Number(e.target.value) : undefined } })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Max Length</label>
                          <input type="number" value={field.validation?.max ?? ''} onChange={e => updateField(field.id, { validation: { ...field.validation, max: e.target.value ? Number(e.target.value) : undefined } })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Settings className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No field selected</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[180px]">Click on a form field in the canvas to edit its properties here.</p>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Payment Not Configured Popup */}
      {showPaymentPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 max-w-sm w-full mx-4 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mx-auto">
              <CreditCard className="w-7 h-7 text-amber-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Payment Not Configured</h3>
              <p className="text-sm text-slate-500">
                You need to set up a payment provider (Razorpay, Stripe, or PayPal) in your program settings before adding a payment field.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setShowPaymentPopup(false);
                  // Navigate to settings/billing via dispatching a navigation event
                  window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'program-details' }));
                }}
                className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Go to Billing &amp; Plan Settings
              </button>
              <button
                onClick={() => setShowPaymentPopup(false)}
                className="w-full px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
