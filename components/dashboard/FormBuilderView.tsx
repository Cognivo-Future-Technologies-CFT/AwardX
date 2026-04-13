import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FormBuilder, FormField, FormPage, FormTheme, FormBuilderRef } from './FormBuilder';
import { db } from '../../services/database';
import { Program } from '../../services/models';
import { Save, FileText, Plus, Trash2, CheckCircle2, XCircle, X, Link2, Copy, Check } from 'lucide-react';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { useConfirm } from '../ConfirmDialog';

interface FormBuilderViewProps {
  activeEvent: Program | null;
}

interface SavedForm {
  id: string;
  name: string;
  programId: string;
  fields: FormField[];
  pages?: FormPage[];
  theme?: FormTheme;
  isActive: boolean;
  createdAt: string;
}

const ensureMandatoryAwardSelector = (
  fields: FormField[],
  pages: FormPage[],
  awardOptions: string[],
): FormField[] => {
  const firstPageId = pages[0]?.id || 'page-1';
  const options = awardOptions.length > 0 ? awardOptions : ['General'];
  const existing = fields.find((field) => field.type === 'award_selector');

  const mandatoryAwardField: FormField = existing
    ? {
        ...existing,
        label: existing.label || 'Award Selection',
        placeholder: existing.placeholder || 'Select award category...',
        required: true,
        pageId: existing.pageId || firstPageId,
        options,
      }
    : {
        id: `field-award-selector-${Date.now()}`,
        type: 'award_selector',
        label: 'Award Selection',
        placeholder: 'Select award category...',
        required: true,
        options,
        pageId: firstPageId,
      };

  const nonAwardFields = fields.filter((field) => field.type !== 'award_selector');
  return [mandatoryAwardField, ...nonAwardFields];
};

const mapDbFieldToFormField = (f: any): FormField => {
  const cfg = f.config || {};
  return {
    id: f.id,
    type: f.type,
    label: f.label,
    placeholder: cfg.placeholder || undefined,
    required: !!f.required,
    options: cfg.options || undefined,
    pageId: cfg.pageId || 'page-1',
    validation: cfg.validation || undefined,
  };
};

const mapFormFieldToDbPayload = (f: FormField, idx: number) => ({
  label: f.label,
  type: f.type,
  required: !!f.required,
  config: {
    placeholder: f.placeholder,
    options: f.options,
    pageId: f.pageId,
    validation: f.validation,
  },
  sort_order: idx,
});

export const FormBuilderView: React.FC<FormBuilderViewProps> = ({ activeEvent }) => {
  const { confirm, ConfirmDialogNode } = useConfirm();
  const [savedForms, setSavedForms] = useState<SavedForm[]>([]);
  const [currentForm, setCurrentForm] = useState<FormField[]>([]);
  const [currentPages, setCurrentPages] = useState<FormPage[]>([]);
  const [currentTheme, setCurrentTheme] = useState<FormTheme | undefined>(undefined);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [formBuilderKey, setFormBuilderKey] = useState(0);
  const formBuilderRef = useRef<FormBuilderRef>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);
  const [awardOptions, setAwardOptions] = useState<string[]>([]);

  useEffect(() => {
    setPortalTarget(document.getElementById('dashboard-header-actions'));
  }, []);

  useEffect(() => {
    loadSavedForms();
    void (async () => {
      if (!activeEvent) return;
      const categories = await db.getCategories(activeEvent.id);
      // Build parent->child hierarchy for award options
      const parentCategories = categories.filter(c => !c.parentId);
      const childMap = new Map<string, typeof categories>();
      categories.forEach(c => {
        if (c.parentId) {
          const children = childMap.get(c.parentId) || [];
          children.push(c);
          childMap.set(c.parentId, children);
        }
      });

      const hierarchicalOptions: string[] = [];
      parentCategories.forEach(parent => {
        const children = childMap.get(parent.id) || [];
        if (children.length > 0) {
          // Add children under parent prefix
          children.forEach(child => {
            hierarchicalOptions.push(`${parent.title} \u2192 ${child.title}`);
          });
        } else {
          hierarchicalOptions.push(parent.title);
        }
      });

      // Also add orphan categories (children without visible parents)
      const allParentIds = new Set(parentCategories.map(p => p.id));
      categories.forEach(c => {
        if (c.parentId && !allParentIds.has(c.parentId)) {
          hierarchicalOptions.push(c.title);
        }
      });

      setAwardOptions(hierarchicalOptions.length > 0 ? hierarchicalOptions : categories.map(c => c.title));
    })();
  }, [activeEvent]);

  const loadSavedForms = async () => {
    if (!activeEvent) return;
    const forms = await db.getForms(activeEvent.id);
    const formsWithFields: SavedForm[] = await Promise.all(
      (forms as any[]).map(async (form: any) => {
        const fields = await db.getFormFields(form.id);
        return {
          id: form.id,
          name: form.title,
          programId: form.program_id,
          fields: (fields as any[]).map(mapDbFieldToFormField),
          pages: form.pages || undefined,
          theme: form.theme || undefined,
          isActive: !!form.is_active,
          createdAt: form.created_at || form.updated_at || new Date().toISOString(),
        };
      })
    );
    setSavedForms(formsWithFields);
  };

  const handleSave = async (fields: FormField[], pages: FormPage[], theme: FormTheme) => {
    // Prevent duplicate saves
    if (isSaving) return;

    const normalizedFields = ensureMandatoryAwardSelector(fields, pages, awardOptions);
    setCurrentForm(normalizedFields);
    setCurrentPages(pages);
    setCurrentTheme(theme);

    if (selectedFormId) {
      // Update existing form
      setIsSaving(true);
      setSaveMessage(null);
      try {
        await db.updateForm(selectedFormId, { pages, theme });
        await db.replaceFormFields(selectedFormId, normalizedFields.map(mapFormFieldToDbPayload));
        await loadSavedForms();
        setSaveMessage({ type: 'success', text: 'Form saved successfully!' });
        setTimeout(() => setSaveMessage(null), 5000);
      } catch (error: any) {
        setSaveMessage({ type: 'error', text: error?.message || 'Failed to save form. Please try again.' });
        setTimeout(() => setSaveMessage(null), 5000);
      } finally {
        setIsSaving(false);
      }
    } else {
      // New form - open modal to get name
      setIsSaveModalOpen(true);
    }
  };

  const handlePublishFromBuilder = async (fields: FormField[], pages: FormPage[], theme: FormTheme) => {
    if (!selectedFormId) {
      // Save first if no form selected
      handleSave(fields, pages, theme);
      return;
    }

    const targetForm = savedForms.find(f => f.id === selectedFormId);
    if (!targetForm) return;

    setSaveMessage(null);
    try {
      // Save the form first
      const normalizedFields = ensureMandatoryAwardSelector(fields, pages, awardOptions);
      await db.updateForm(selectedFormId, { pages, theme, is_active: !targetForm.isActive });
      await db.replaceFormFields(selectedFormId, normalizedFields.map(mapFormFieldToDbPayload));
      await loadSavedForms();
      setSaveMessage({
        type: 'success',
        text: targetForm.isActive ? 'Form unpublished.' : 'Form saved and published!'
      });
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error?.message || 'Failed to publish form.' });
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const handleSaveNewForm = async () => {
    if (!activeEvent || !formName.trim() || isSaving) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const newForm = await db.createForm({
        program_id: activeEvent.id,
        title: formName,
        description: '',
        is_active: false,
      });

      await db.updateForm((newForm as any).id, { pages: currentPages, theme: currentTheme });
      const normalizedFields = ensureMandatoryAwardSelector(currentForm, currentPages, awardOptions);
      await db.replaceFormFields((newForm as any).id, normalizedFields.map(mapFormFieldToDbPayload));

      setFormName('');
      setIsSaveModalOpen(false);
      setSelectedFormId((newForm as any).id);
      await loadSavedForms();
      setSaveMessage({ type: 'success', text: `Form "${formName}" saved successfully!` });
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error?.message || 'Failed to save form. Please try again.' });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadForm = (form: SavedForm) => {
    const normalizedFields = ensureMandatoryAwardSelector(form.fields, form.pages || currentPages || [], awardOptions);
    setCurrentForm(normalizedFields);
    setCurrentPages(form.pages || []);
    setCurrentTheme(form.theme);
    setSelectedFormId(form.id);
    setIsCreatingNew(false);
    // Force remount when loading a different form
    setFormBuilderKey(prev => prev + 1);
  };

  const handleDeleteForm = async (formId: string) => {
    const name = savedForms.find(f => f.id === formId)?.name || 'this form';
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description: 'This removes all form fields and settings. Existing submissions are not affected.',
      confirmLabel: 'Delete form',
    });
    if (!ok) return;

    setDeleteMessage(null);
    try {
      const formName = name;
      await db.deleteForm(formId);

      if (selectedFormId === formId) {
        setSelectedFormId(null);
        setCurrentForm([]);
      }
      await loadSavedForms();
      setDeleteMessage({ type: 'success', text: `Form "${formName}" deleted successfully!` });
      setTimeout(() => setDeleteMessage(null), 5000);
    } catch (error: any) {
      setDeleteMessage({ type: 'error', text: error?.message || 'Failed to delete form. Please try again.' });
      setTimeout(() => setDeleteMessage(null), 5000);
    }
  };

  const handleCopyLink = async (formId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetForm = savedForms.find(form => form.id === formId);
    if (!targetForm?.isActive) {
      setSaveMessage({ type: 'error', text: 'Publish the form to enable sharing.' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    try {
      const baseUrl = window.location.origin;
      const formLink = `${baseUrl}/form/${formId}`;
      
      await navigator.clipboard.writeText(formLink);
      setCopiedFormId(formId);
      setTimeout(() => setCopiedFormId(null), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const baseUrl = window.location.origin;
      const formLink = `${baseUrl}/form/${formId}`;
      const textArea = document.createElement('textarea');
      textArea.value = formLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedFormId(formId);
      setTimeout(() => setCopiedFormId(null), 2000);
    }
  };

  const handleTogglePublish = async (formId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetForm = savedForms.find(form => form.id === formId);
    if (!targetForm) return;

    setSaveMessage(null);
    try {
      await db.updateForm(formId, { is_active: !targetForm.isActive });
      await loadSavedForms();
      setSaveMessage({
        type: 'success',
        text: targetForm.isActive ? 'Form unpublished.' : 'Form published.'
      });
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error?.message || 'Failed to update publish status.' });
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const handleNewForm = () => {
    // Save current form if there are unsaved changes
    if (formBuilderRef.current) {
      const currentData = formBuilderRef.current.getCurrentFormData();
      const hasFormData = currentData.fields.length > 0;

      if (hasFormData && selectedFormId) {
        void (async () => {
          await db.updateForm(selectedFormId, { pages: currentData.pages, theme: currentData.theme });
          const normalizedFields = ensureMandatoryAwardSelector(currentData.fields, currentData.pages, awardOptions);
          await db.replaceFormFields(selectedFormId, normalizedFields.map(mapFormFieldToDbPayload));
          await loadSavedForms();
        })();
      }
    }
    
    // Clear and create new form
    setCurrentForm([]);
    setCurrentPages([]);
    setCurrentTheme(undefined);
    setSelectedFormId(null);
    setIsCreatingNew(true);
    // Force remount of FormBuilder to ensure complete reset
    setFormBuilderKey(prev => prev + 1);
  };

  if (!activeEvent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-slate-500">Please select a program to build forms</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {ConfirmDialogNode}
      {/* Success/Error Messages */}
      {(saveMessage || deleteMessage) && (
        <div className="px-4 py-2 z-50">
          {saveMessage && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-lg shadow-md ${
              saveMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {saveMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{saveMessage.text}</span>
              </div>
              <button
                onClick={() => setSaveMessage(null)}
                className="ml-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {deleteMessage && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-lg shadow-md mt-2 ${
              deleteMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {deleteMessage.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">{deleteMessage.text}</span>
              </div>
              <button
                onClick={() => setDeleteMessage(null)}
                className="ml-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header and Controls Portal */}
      {portalTarget && createPortal(
        <div className="hidden md:flex items-center gap-4">
          {/* Add any other header items here if needed, currently reusing the space for primary actions */}
          <Button
            variant="primary" // Changed to primary for better visibility in header
            onClick={handleNewForm}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Form Link
          </Button>
        </div>,
        portalTarget
      )}

      <div className="flex flex-col lg:flex-row h-full min-h-0">
        {/* Sidebar - Saved Forms List */}
        <div className="w-full lg:w-72 lg:flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col z-10 max-h-[38vh] lg:max-h-none">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
            <h3 className="text-sm font-bold text-slate-800">Saved Forms</h3>
            <button onClick={handleNewForm} className="p-1.5 hover:bg-slate-50 hover:text-indigo-600 rounded-lg text-slate-400 transition-colors" title="Create New Form">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {savedForms.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No forms found</p>
                <p className="text-xs text-slate-400 mt-1">Create a new form to get started</p>
              </div>
            ) : (
              savedForms.map((form) => (
                <div
                  key={form.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all group relative ${selectedFormId === form.id
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/10'
                    : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  onClick={() => handleLoadForm(form)}
                >
                  <div className="pr-6">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-semibold truncate ${selectedFormId === form.id ? 'text-indigo-900' : 'text-slate-700'}`}>{form.name}</h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${form.isActive
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                        {form.isActive ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500 font-medium">
                        {form.fields.length} Qs
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(form.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => handleTogglePublish(form.id, e)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                      title={form.isActive ? 'Unpublish form' : 'Publish form'}
                    >
                      {form.isActive ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleCopyLink(form.id, e)}
                      className={`p-1.5 rounded-md transition-all ${form.isActive
                        ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        : 'text-slate-300 cursor-not-allowed'
                        }`}
                      title={form.isActive ? 'Copy form link' : 'Publish to enable link'}
                      disabled={!form.isActive}
                    >
                      {copiedFormId === form.id ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteForm(form.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                      title="Delete form"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Form Builder Area */}
        <div className="flex-1 min-w-0 h-full min-h-[48vh]">
          {selectedFormId || isCreatingNew ? (
            <FormBuilder
              key={formBuilderKey}
              ref={formBuilderRef}
              onSave={handleSave}
              onPublish={handlePublishFromBuilder}
              isPublished={savedForms.find(f => f.id === selectedFormId)?.isActive}
              initialFields={currentForm}
              initialPages={currentPages.length > 0 ? currentPages : undefined}
              initialTheme={currentTheme}
              isSaving={isSaving}
            />
          ) : (
            <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-center p-8">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                <FileText className="w-8 h-8 text-indigo-500/50" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">Select a Form</h3>
              <p className="max-w-xs mx-auto text-sm">Select a form from the sidebar to edit it, or create a new form to get started.</p>
              <Button className="mt-6" onClick={handleNewForm}>
                <Plus className="w-4 h-4 mr-2" /> Create New Form
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Save Form"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Form Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Employee Evaluation 2024"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewForm} disabled={!formName.trim() || isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Form'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

