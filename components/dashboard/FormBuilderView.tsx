import React, { useState, useEffect } from 'react';
import { FormBuilder, FormField } from './FormBuilder';
import { db, Program } from '../../services/demoDb';
import { Save, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from '../Button';
import { Modal } from '../Modal';

interface FormBuilderViewProps {
  activeEvent: Program | null;
}

interface SavedForm {
  id: string;
  name: string;
  programId: string;
  fields: FormField[];
  createdAt: string;
}

export const FormBuilderView: React.FC<FormBuilderViewProps> = ({ activeEvent }) => {
  const [savedForms, setSavedForms] = useState<SavedForm[]>([]);
  const [currentForm, setCurrentForm] = useState<FormField[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    loadSavedForms();
  }, [activeEvent]);

  const loadSavedForms = () => {
    if (!activeEvent) return;
    const forms = db.getForms(activeEvent.id);
    const formsWithFields = forms.map(form => {
      const fields = db.getFormFields(form.id);
      return {
        id: form.id,
        name: form.name,
        programId: form.programId,
        fields: fields.map((f: any) => ({
          id: f.id,
          type: f.fieldType,
          label: f.label,
          placeholder: f.placeholder || undefined,
          required: f.isRequired,
          options: f.options || undefined,
          validation: f.validationRules || undefined,
        })),
        createdAt: form.createdAt || form.updatedAt,
      };
    });
    setSavedForms(formsWithFields);
  };

  const handleSave = (fields: FormField[]) => {
    setCurrentForm(fields);
    if (selectedFormId) {
      // Update existing form
      db.saveFormFields(selectedFormId, fields);
      const form = db.getFormById(selectedFormId);
      if (form) {
        db.saveForm({
          id: form.id,
          programId: form.programId,
          name: form.name,
          description: form.description,
          formType: form.formType,
          isActive: form.isActive,
        });
      }
      loadSavedForms();
    } else {
      // New form - open modal to get name
      setIsSaveModalOpen(true);
    }
  };

  const handleSaveNewForm = () => {
    if (!activeEvent || !formName.trim()) return;

    const newForm = db.saveForm({
      programId: activeEvent.id,
      name: formName,
      description: '',
      formType: 'submission',
      isActive: true,
    });

    // Save form fields
    db.saveFormFields(newForm.id, currentForm);

    setFormName('');
    setIsSaveModalOpen(false);
    setSelectedFormId(newForm.id);
    loadSavedForms();
  };

  const handleLoadForm = (form: SavedForm) => {
    setCurrentForm(form.fields);
    setSelectedFormId(form.id);
    setIsCreatingNew(false);
  };

  const handleDeleteForm = (formId: string) => {
    if (!window.confirm('Are you sure you want to delete this form?')) return;

    db.deleteForm(formId);

    if (selectedFormId === formId) {
      setSelectedFormId(null);
      setCurrentForm([]);
    }
    loadSavedForms();
  };

  const handleNewForm = () => {
    setCurrentForm([]);
    setSelectedFormId(null);
    setIsCreatingNew(true);
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Form Builder</h1>
          <p className="text-slate-500">Create and manage custom submission forms using Form Bricks</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleNewForm}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Form
          </Button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Sidebar - Saved Forms */}
        <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-4 overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Saved Forms</h3>
          {savedForms.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No saved forms yet</p>
              <p className="text-xs mt-1">Create your first form!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedForms.map((form) => (
                <div
                  key={form.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                    selectedFormId === form.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                  onClick={() => handleLoadForm(form)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">{form.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(form.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteForm(form.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Form Builder */}
        <div className="flex-1 min-w-0">
          <FormBuilder
            onSave={handleSave}
            initialFields={currentForm}
          />
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
              placeholder="e.g. Submission Form 2024"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewForm} disabled={!formName.trim()}>
              <Save className="w-4 h-4 mr-2" />
              Save Form
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

