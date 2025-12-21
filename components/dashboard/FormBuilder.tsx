import React, { useState, useCallback } from 'react';
import { GripVertical, Trash2, Settings, Eye, Save, Plus, Type, FileText, ImageIcon, Link2, List, Calendar, Mail, CheckSquare, Radio } from 'lucide-react';
import { Button } from '../Button';
import { motion, AnimatePresence } from 'framer-motion';

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface FormBuilderProps {
  onSave?: (fields: FormField[]) => void;
  initialFields?: FormField[];
}

const fieldTypes = [
  { type: 'text', label: 'Short Text', icon: Type },
  { type: 'textarea', label: 'Long Text', icon: FileText },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'number', label: 'Number', icon: Type },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'select', label: 'Dropdown', icon: List },
  { type: 'radio', label: 'Radio', icon: Radio },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'file', label: 'File Upload', icon: ImageIcon },
  { type: 'url', label: 'URL / Link', icon: Link2 },
];

export const FormBuilder: React.FC<FormBuilderProps> = ({ onSave, initialFields = [] }) => {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [draggedField, setDraggedField] = useState<string | null>(null);

  const addField = (type: string) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: fieldTypes.find(ft => ft.type === type)?.label || 'Field',
      required: false,
      ...(type === 'select' || type === 'radio' ? { options: ['Option 1', 'Option 2'] } : {}),
    };
    setFields([...fields, newField]);
    setSelectedField(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedField === id) {
      setSelectedField(null);
    }
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...fields];
    const [removed] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, removed);
    setFields(newFields);
  };

  const handleDragStart = (fieldType: string) => {
    setDraggedField(fieldType);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedField) {
      addField(draggedField);
      setDraggedField(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSave = () => {
    if (onSave) {
      onSave(fields);
    }
  };

  const renderFieldEditor = () => {
    const field = fields.find(f => f.id === selectedField);
    if (!field) return null;

    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900">Field Settings</h3>
          <button
            onClick={() => setSelectedField(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Label</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => updateField(field.id, { label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {(field.type === 'text' || field.type === 'email' || field.type === 'url') && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Placeholder</label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        )}

        {(field.type === 'select' || field.type === 'radio') && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Options</label>
            {(field.options || []).map((option, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(field.options || [])];
                    newOptions[idx] = e.target.value;
                    updateField(field.id, { options: newOptions });
                  }}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={() => {
                    const newOptions = field.options?.filter((_, i) => i !== idx) || [];
                    updateField(field.id, { options: newOptions });
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
                updateField(field.id, { options: newOptions });
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              + Add Option
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`required-${field.id}`}
            checked={field.required}
            onChange={(e) => updateField(field.id, { required: e.target.checked })}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor={`required-${field.id}`} className="text-xs font-medium text-slate-700">
            Required field
          </label>
        </div>
      </div>
    );
  };

  const renderPreviewField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <input
            type={field.type}
            placeholder={field.placeholder}
            disabled
            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50"
          />
        );
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder}
            disabled
            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 h-24 resize-none"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            placeholder={field.placeholder}
            disabled
            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            disabled
            className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50"
          />
        );
      case 'select':
        return (
          <select disabled className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50">
            <option>Select an option...</option>
            {field.options?.map((opt, idx) => (
              <option key={idx}>{opt}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-2">
                <input type="radio" disabled className="text-indigo-600" />
                <span className="text-sm text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled className="rounded text-indigo-600" />
            <span className="text-sm text-slate-700">Checkbox option</span>
          </label>
        );
      case 'file':
        return (
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50">
            <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
            <span className="text-sm text-slate-500">Drag files here or click to upload</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Toolbox */}
      <div className="w-64 flex-shrink-0 space-y-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Form Bricks</h4>
          </div>
          <p className="text-xs text-slate-500 mb-4">Drag or click to add form fields</p>
          <div className="space-y-2">
            {fieldTypes.map((fieldType) => (
              <div
                key={fieldType.type}
                draggable
                onDragStart={() => handleDragStart(fieldType.type)}
                onClick={() => addField(fieldType.type)}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 hover:border-indigo-200 hover:bg-white hover:shadow-sm cursor-pointer transition-all group"
              >
                <fieldType.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                <span className="text-sm font-medium text-slate-700">{fieldType.label}</span>
              </div>
            ))}
          </div>
        </div>

        {selectedField && renderFieldEditor()}
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-8 overflow-y-auto min-h-[600px] relative">
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button
            size="sm"
            variant="white"
            onClick={() => setIsPreview(!isPreview)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {isPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Form
          </Button>
        </div>

        <div
          className="max-w-2xl mx-auto space-y-4"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <AnimatePresence>
            {fields.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-32 border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl flex flex-col items-center justify-center text-indigo-400 text-sm font-medium gap-2"
              >
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded bg-indigo-400"></div>
                  <div className="w-3 h-3 rounded bg-indigo-300"></div>
                  <div className="w-3 h-3 rounded bg-indigo-200"></div>
                </div>
                <p className="font-semibold">Drop Form Bricks here</p>
                <p className="text-xs text-indigo-300">or click on a brick to add</p>
              </motion.div>
            ) : (
              fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`bg-white p-6 rounded-xl border-2 shadow-sm relative group transition-colors ${
                    selectedField === field.id
                      ? 'border-indigo-500 bg-indigo-50/30'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                  onClick={() => !isPreview && setSelectedField(field.id)}
                >
                  {!isPreview && (
                    <>
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2 cursor-grab text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteField(field.id);
                        }}
                        className="absolute top-4 right-4 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderPreviewField(field)}
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {!isPreview && fields.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-20 border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl flex items-center justify-center text-indigo-400 text-xs font-medium gap-2"
            >
              <Plus className="w-4 h-4" />
              Drop new Form Brick here
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

