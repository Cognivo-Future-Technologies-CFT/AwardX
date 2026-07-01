import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FormBuilder, FormField, FormPage, FormTheme, FormBuilderRef } from './FormBuilder';
import { db } from '../../services/database';
import { Program } from '../../services/models';
import { queryKeys } from '../../services/queryKeys';
import { Save, CheckCircle2, XCircle, X, Link2, Copy, Check, Layout, Settings, AlertTriangle } from 'lucide-react';
import { FloatingPanelToggle } from './formBuilder/FloatingPanelToggle';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { isAutoAssignJudging, getCategorySelectorLabels } from '../../lib/judgingType';

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

type PendingFormSave = {
  fields: FormField[];
  pages: FormPage[];
  theme: FormTheme;
  intent: 'update' | 'create' | 'publish';
};

const hasAwardSelectorField = (fields: FormField[]) =>
  fields.some((field) => field.type === 'award_selector');

const syncAwardSelectorOptions = (
  fields: FormField[],
  awardOptions: string[],
  isAutoAssign: boolean,
): FormField[] => {
  const labels = getCategorySelectorLabels(isAutoAssign);
  const options = awardOptions.length > 0 ? awardOptions : ['General'];
  return fields.map((field) =>
    field.type === 'award_selector'
      ? {
          ...field,
          label: field.label || labels.defaultLabel,
          placeholder: field.placeholder || labels.defaultPlaceholder,
          required: isAutoAssign ? true : field.required,
          options,
        }
      : field,
  );
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
  ...(f.id && !f.id.startsWith('field-') ? { id: f.id } : {}),
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
  const queryClient = useQueryClient();
  const isAutoAssign = isAutoAssignJudging(activeEvent?.judgingType);
  const selectorLabels = getCategorySelectorLabels(isAutoAssign);
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
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);
  const [awardOptions, setAwardOptions] = useState<string[]>([]);
  const [elementsPanelOpen, setElementsPanelOpen] = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'form-open-elements') {
        setElementsPanelOpen(true);
      }
    };
    window.addEventListener('demo-action', handler);
    return () => window.removeEventListener('demo-action', handler);
  }, []);
  const [propertiesPanelOpen, setPropertiesPanelOpen] = useState(false);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [isLoadingForms, setIsLoadingForms] = useState(true);
  const [awardSelectorWarningOpen, setAwardSelectorWarningOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<PendingFormSave | null>(null);

  useEffect(() => {
    if (!activeEvent?.id) {
      setActiveFormId(null);
      return;
    }
    void db.getActiveFormForProgram(activeEvent.id).then(setActiveFormId);
  }, [activeEvent?.id]);

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

  const loadSavedForms = async (forceReload = false) => {
    if (!activeEvent) return;

    setIsLoadingForms(true);
    try {
      let forms = await db.getForms(activeEvent.id);
      if (forms.length === 0) {
        const created = await db.createForm({
          program_id: activeEvent.id,
          title: `${activeEvent.title} Submission Form`,
          description: '',
          is_active: false,
        });
        await db.setActiveFormForProgram(activeEvent.id, (created as any).id);
        forms = [created as any];
      }

      const primaryForm = (forms as any[]).find((form) => form.id === activeFormId) || (forms as any[])[0];
      if (!primaryForm) return;

      const fields = await db.getFormFields(primaryForm.id);
      const singleForm: SavedForm = {
        id: primaryForm.id,
        name: primaryForm.title,
        programId: primaryForm.program_id,
        fields: (fields as any[]).map(mapDbFieldToFormField),
        pages: primaryForm.pages || undefined,
        theme: primaryForm.theme || undefined,
        isActive: !!primaryForm.is_active,
        createdAt: primaryForm.created_at || primaryForm.updated_at || new Date().toISOString(),
      };

      setSavedForms([singleForm]);
      if (forceReload || !selectedFormId || selectedFormId !== singleForm.id) {
        handleLoadForm(singleForm);
      }
    } finally {
      setIsLoadingForms(false);
    }
  };

  const persistExistingForm = async (fields: FormField[], pages: FormPage[], theme: FormTheme) => {
    if (!selectedFormId) return;

    const normalizedFields = syncAwardSelectorOptions(fields, awardOptions, isAutoAssign);
    setCurrentForm(normalizedFields);
    setCurrentPages(pages);
    setCurrentTheme(theme);

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await db.updateForm(selectedFormId, { pages, theme });
      await db.replaceFormFields(selectedFormId, normalizedFields.map(mapFormFieldToDbPayload));
      await loadSavedForms(true);
      setSaveMessage({ type: 'success', text: 'Form saved successfully!' });
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error?.message || 'Failed to save form. Please try again.' });
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const publishExistingForm = async (fields: FormField[], pages: FormPage[], theme: FormTheme) => {
    if (!selectedFormId) return;

    const targetForm = savedForms.find((form) => form.id === selectedFormId);
    if (!targetForm) return;

    const normalizedFields = syncAwardSelectorOptions(fields, awardOptions, isAutoAssign);
    setSaveMessage(null);
    try {
      await db.updateForm(selectedFormId, { pages, theme, is_active: !targetForm.isActive });
      await db.replaceFormFields(selectedFormId, normalizedFields.map(mapFormFieldToDbPayload));
      if (!targetForm.isActive && activeEvent?.id) {
        await db.setActiveFormForProgram(activeEvent.id, selectedFormId);
        setActiveFormId(selectedFormId);
        await queryClient.invalidateQueries({ queryKey: queryKeys.programForms.active(activeEvent.id) });
      }
      await loadSavedForms(true);
      setSaveMessage({
        type: 'success',
        text: targetForm.isActive ? 'Form unpublished.' : 'Form saved and published!',
      });
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error: any) {
      setSaveMessage({ type: 'error', text: error?.message || 'Failed to publish form.' });
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  const beginSaveFlow = (
    fields: FormField[],
    pages: FormPage[],
    theme: FormTheme,
    intent: PendingFormSave['intent'],
  ) => {
    const normalizedFields = syncAwardSelectorOptions(fields, awardOptions, isAutoAssign);
    setCurrentForm(normalizedFields);
    setCurrentPages(pages);
    setCurrentTheme(theme);

    if (!hasAwardSelectorField(normalizedFields)) {
      if (isAutoAssign) {
        setSaveMessage({
          type: 'error',
          text: selectorLabels.missingFieldMessage,
        });
        setTimeout(() => setSaveMessage(null), 6000);
        return;
      }
      setPendingSave({ fields: normalizedFields, pages, theme, intent });
      setAwardSelectorWarningOpen(true);
      return;
    }

    if (intent === 'update') {
      void persistExistingForm(normalizedFields, pages, theme);
      return;
    }
    if (intent === 'create') {
      setIsSaveModalOpen(true);
      return;
    }
    void publishExistingForm(normalizedFields, pages, theme);
  };

  const handleAwardWarningContinue = () => {
    if (!pendingSave) {
      setAwardSelectorWarningOpen(false);
      return;
    }

    const { fields, pages, theme, intent } = pendingSave;
    setAwardSelectorWarningOpen(false);
    setPendingSave(null);

    if (intent === 'update') {
      void persistExistingForm(fields, pages, theme);
      return;
    }
    if (intent === 'create') {
      setIsSaveModalOpen(true);
      return;
    }
    void publishExistingForm(fields, pages, theme);
  };

  const handleSave = async (fields: FormField[], pages: FormPage[], theme: FormTheme) => {
    if (isSaving) return;
    beginSaveFlow(fields, pages, theme, selectedFormId ? 'update' : 'create');
  };

  const handlePublishFromBuilder = async (fields: FormField[], pages: FormPage[], theme: FormTheme) => {
    if (!selectedFormId) {
      handleSave(fields, pages, theme);
      return;
    }

    beginSaveFlow(fields, pages, theme, 'publish');
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
      const normalizedFields = syncAwardSelectorOptions(currentForm, awardOptions, isAutoAssign);
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
    const normalizedFields = syncAwardSelectorOptions(form.fields, awardOptions, isAutoAssign);
    setCurrentForm(normalizedFields);
    setCurrentPages(form.pages || []);
    setCurrentTheme(form.theme);
    setSelectedFormId(form.id);
    setIsCreatingNew(false);
    setFormBuilderKey(prev => prev + 1);
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
      {saveMessage && (
        <div className="px-4 py-2 z-50">
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
        </div>
      )}

      {/* Header and Controls Portal */}
      {portalTarget && createPortal(
        <div className="hidden md:flex items-center gap-4">
          {selectedFormId && (
            <button
              type="button"
              onClick={(e) => handleCopyLink(selectedFormId, e as any)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {copiedFormId === selectedFormId ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
              {copiedFormId === selectedFormId ? 'Copied' : 'Copy form link'}
            </button>
          )}
        </div>,
        portalTarget
      )}

      <div className="relative flex flex-col lg:flex-row h-full min-h-0 flex-1" data-demo-target="form-builder-canvas">
        <div className="relative flex-1 min-w-0 min-h-[48vh]">
          {!elementsPanelOpen && (selectedFormId || isCreatingNew) && (
            <FloatingPanelToggle
              side="left"
              label="Form Elements"
              icon={<Layout className="h-3.5 w-3.5" />}
              onClick={() => setElementsPanelOpen(true)}
              className="top-[28%]"
            />
          )}
          {!propertiesPanelOpen && (selectedFormId || isCreatingNew) && (
            <FloatingPanelToggle
              side="right"
              label="Field Properties"
              icon={<Settings className="h-3.5 w-3.5" />}
              onClick={() => setPropertiesPanelOpen(true)}
              className="top-[28%]"
            />
          )}

          {isLoadingForms ? (
            <div className="h-full bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
              Loading form…
            </div>
          ) : selectedFormId || isCreatingNew ? (
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
              paymentConfigured={!!(activeEvent?.paymentConfig?.enabled && activeEvent?.paymentConfig?.publicKey)}
              paymentProvider={activeEvent?.paymentConfig?.provider || 'Razorpay'}
              elementsPanelOpen={elementsPanelOpen}
              propertiesPanelOpen={propertiesPanelOpen}
              onElementsPanelOpenChange={setElementsPanelOpen}
              onPropertiesPanelOpenChange={setPropertiesPanelOpen}
              awardOptions={awardOptions}
              isAutoAssignJudging={isAutoAssign}
            />
          ) : null}
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

      <Modal
        isOpen={awardSelectorWarningOpen}
        onClose={() => {
          setAwardSelectorWarningOpen(false);
          setPendingSave(null);
        }}
        title={selectorLabels.missingFieldTitle}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Applicants won&apos;t be able to choose a category.</p>
              <p className="text-amber-900/80">{selectorLabels.missingFieldMessage}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setAwardSelectorWarningOpen(false);
                setPendingSave(null);
              }}
            >
              Go back
            </Button>
            <Button onClick={handleAwardWarningContinue} disabled={isSaving}>
              Continue anyway
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

