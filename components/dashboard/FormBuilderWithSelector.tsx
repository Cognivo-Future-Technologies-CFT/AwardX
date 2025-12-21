import React, { useState, useEffect } from 'react';
import { FormBuilder, FormField } from './FormBuilder';
import { db, Program } from '../../services/demoDb';
import { FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../Button';

interface FormBuilderWithSelectorProps {
  activeEvent: Program | null;
  onFormSelect?: (formId: string) => void;
}

export const FormBuilderWithSelector: React.FC<FormBuilderWithSelectorProps> = ({ activeEvent, onFormSelect }) => {
  const [savedForms, setSavedForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [currentFormFields, setCurrentFormFields] = useState<FormField[]>([]);

  useEffect(() => {
    if (activeEvent) {
      loadSavedForms();
      // Load previously selected form
      const savedFormId = localStorage.getItem(`selected_form_${activeEvent.id}`);
      if (savedFormId) {
        loadForm(savedFormId);
      }
    }
  }, [activeEvent]);

  const loadSavedForms = () => {
    if (!activeEvent) return;
    const forms = db.getForms(activeEvent.id);
    setSavedForms(forms);
  };

  const loadForm = (formId: string) => {
    const fields = db.getFormFields(formId);
    const formFields: FormField[] = fields.map((f: any) => ({
      id: f.id,
      type: f.fieldType,
      label: f.label,
      placeholder: f.placeholder || undefined,
      required: f.isRequired,
      options: f.options || undefined,
      validation: f.validationRules || undefined,
    }));
    setCurrentFormFields(formFields);
    setSelectedFormId(formId);
    if (onFormSelect) {
      onFormSelect(formId);
    }
  };

  const handleFormSelect = (formId: string) => {
    loadForm(formId);
  };

  const handleSave = (fields: FormField[]) => {
    if (selectedFormId) {
      db.saveFormFields(selectedFormId, fields);
      setCurrentFormFields(fields);
    }
  };

  if (!activeEvent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">Please select a program</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Form Selector Sidebar */}
      <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-4 overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">Select Nomination Form</h3>
          <p className="text-xs text-slate-500">Choose a form to use for submissions. Forms are created in the Form Builder.</p>
        </div>

        {savedForms.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No forms available</p>
            <p className="text-xs mt-1">Create forms in the Form Builder section</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedForms.map((form) => {
              const fields = db.getFormFields(form.id);
              const isSelected = selectedFormId === form.id;
              
              return (
                <div
                  key={form.id}
                  onClick={() => handleFormSelect(form.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-slate-900">{form.name}</h4>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {fields.length} field{fields.length !== 1 ? 's' : ''}
                      </p>
                      {form.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{form.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-500 mb-2 text-center">
            Need to create a new form?
          </p>
          <p className="text-xs text-slate-400 text-center">
            Go to <strong>Form Builder</strong> in the sidebar
          </p>
        </div>
      </div>

      {/* Form Builder */}
      <div className="flex-1 min-w-0">
        {selectedFormId ? (
          <FormBuilder
            onSave={handleSave}
            initialFields={currentFormFields}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <div className="text-center max-w-md">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No Form Selected</h3>
              <p className="text-sm text-slate-500 mb-4">
                Select a form from the sidebar to view and edit it, or create a new form in the Form Builder.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

