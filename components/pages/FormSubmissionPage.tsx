import React, { useState, useEffect } from 'react';
import { Button } from '../Button';

import { FormField, FormPage, FormTheme } from '../dashboard/FormBuilder';
import { db } from '../../services/database';
import { auth } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FormSubmissionPageProps {
  onNavigate: (page: string) => void;
  formId?: string;
}

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

export const FormSubmissionPage: React.FC<FormSubmissionPageProps> = ({ onNavigate, formId: propFormId }) => {
  // Get formId from URL params or props
  const getFormIdFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('formId') || propFormId || window.location.search.split('formId=')[1]?.split('&')[0];
    } catch (e) {
      console.error('Error getting formId from URL:', e);
      return propFormId || null;
    }
  };

  const [formId, setFormId] = useState<string | null>(() => {
    try {
      return propFormId || getFormIdFromUrl();
    } catch (e) {
      console.error('Error initializing formId:', e);
      return propFormId || null;
    }
  });

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formPages, setFormPages] = useState<FormPage[]>([]);
  const [theme, setTheme] = useState<FormTheme>(defaultTheme);
  const [formTitle, setFormTitle] = useState('');
  const [programId, setProgramId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setIsError] = useState<string | null>(null);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication for personalization, but allow public access
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsCheckingAuth(true);

        // Small delay to ensure session is loaded after redirect
        await new Promise(resolve => setTimeout(resolve, 100));

        const { session } = await auth.getSession();

        setIsAuthenticated(!!session);
        setIsCheckingAuth(false);
      } catch (err) {
        console.error('Error checking auth:', err);
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
      }
    };

    checkAuth();

    // Also listen for auth state changes
    const { data } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
        setIsCheckingAuth(false);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      }
    });

    return () => {
      if (data?.subscription) {
        data.subscription.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only load form if authenticated
    if (isCheckingAuth) return;

    const currentFormId = formId || getFormIdFromUrl();
    if (!currentFormId) {
      setIsError('Form ID is required');
      setIsLoading(false);
      return;
    }

    const loadForm = async () => {
      try {
        setIsLoading(true);

        // Load form data directly from supabase (public access)
        if (!supabase) {
          setIsError('Database connection failed');
          setIsLoading(false);
          return;
        }

        const { data: form, error: formError } = await supabase
          .from('program_forms')
          .select('*')
          .eq('id', currentFormId)
          .single();

        if (formError || !form) {
          setIsError('Form not found');
          setIsLoading(false);
          return;
        }

        if (!form.is_active) {
          setIsError('This nomination form is not published yet.');
          setIsLoading(false);
          return;
        }

        setFormTitle(form.title || 'Form');
        setProgramId(form.program_id);
        setFormPages(form.pages || [{ id: 'page-1', title: 'Page 1', order: 0 }]);
        setTheme(form.theme || defaultTheme);

        // Load form fields
        const fields = await db.getFormFields(currentFormId);
        if (fields) {
          const mappedFields = (fields as any[]).map((f: any) => {
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
          });
          setFormFields(mappedFields);
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading form:', err);
        setIsError(err.message || 'Failed to load form');
        setIsLoading(false);
      }
    };

    loadForm();
  }, [isCheckingAuth, formId]);

  const currentPage = formPages[currentPageIdx] || formPages[0];
  const pageFields = formFields.filter(f => f.pageId === currentPage?.id);
  const isLastPage = currentPageIdx === formPages.length - 1;

  const handleLogout = async () => {
    await auth.signOut();
    onNavigate('home');
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const validatePage = () => {
    for (const field of pageFields) {
      if (field.required && !formData[field.id]) {
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validatePage()) {
      alert('Please fill in all required fields');
      return;
    }
    if (currentPageIdx < formPages.length - 1) {
      setCurrentPageIdx(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentPageIdx > 0) {
      setCurrentPageIdx(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validatePage()) {
      alert('Please fill in all required fields');
      return;
    }

    const currentFormId = formId || getFormIdFromUrl();
    if (!currentFormId) {
      alert('Form ID is required');
      return;
    }

    try {
      setIsSubmitting(true);
      // Submit form data to backend - saved in submissions table
      await db.submitFormResponse(currentFormId, formData);
      setIsSubmitted(true);
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('Form submission error:', err);
      alert('Failed to submit form: ' + (err.message || 'Unknown error'));
      setIsSubmitting(false);
    }
  };

  const renderFieldInput = (field: FormField) => {
    const value = formData[field.id] || '';
    const style = {
      borderColor: theme.borderColor,
      borderRadius: theme.borderRadius,
      color: theme.textColor,
      fontFamily: theme.fontFamily,
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            required={field.required}
            className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-y"
            style={style}
          />
        );
      case 'select':
        return (
          <div className="relative">
            <select
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              className="w-full p-3 pr-10 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
              style={style}
            >
              <option value="">{field.placeholder || 'Select an option...'}</option>
              {field.options?.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name={field.id}
                  value={opt}
                  checked={value === opt}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  className="w-4 h-4 text-indigo-600"
                />
                <span style={{ color: theme.textColor }}>{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((opt, i) => (
              <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(opt)}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? value : [];
                    const updated = e.target.checked
                      ? [...current, opt]
                      : current.filter(v => v !== opt);
                    handleInputChange(field.id, updated);
                  }}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span style={{ color: theme.textColor }}>{opt}</span>
              </label>
            ))}
          </div>
        );
      default:
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full p-3 border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            style={style}
          />
        );
    }
  };

  // Show loading while checking authentication
  // Only show this if we haven't redirected to login yet
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Error</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button onClick={() => onNavigate('home')}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    try {
      return (
        <div className="min-h-screen bg-white">
          <div className="min-h-[60vh] flex items-center justify-center px-4">

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md"
            >
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Thank You!</h2>
              <p className="text-lg text-slate-600">Your form has been submitted successfully.</p>
            </motion.div>
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering success page:', error);
      // Fallback rendering if Header/Footer fail
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Thank You!</h2>
            <p className="text-lg text-slate-600">Your form has been submitted successfully.</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ backgroundColor: theme.backgroundColor }}>
      <div className="min-h-[80vh] flex flex-col justify-center py-12 px-4">

        <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden" style={{ borderRadius: theme.borderRadius }}>
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="p-8 md:p-12 lg:p-16">
            <div className="mb-8">

              <h1 className="text-3xl font-bold mb-3" style={{ color: theme.textColor, fontFamily: theme.fontFamily }}>
                {currentPage?.title || formTitle}
              </h1>
              {currentPage?.description && (
                <p className="text-lg opacity-70" style={{ color: theme.textColor }}>
                  {currentPage.description}
                </p>
              )}
              {formPages.length > 1 && (
                <div className="mt-4 text-sm text-slate-500">
                  Step {currentPageIdx + 1} of {formPages.length}
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-6">
                  {pageFields.map(field => (
                    <div key={field.id}>
                      <label className="block text-sm font-semibold mb-2" style={{ color: theme.textColor }}>
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      {renderFieldInput(field)}
                      {field.helpText && (
                        <p className="text-xs mt-2 opacity-60" style={{ color: theme.textColor }}>
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 pt-6 border-t border-slate-200 flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentPageIdx === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>

              {isLastPage ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{ backgroundColor: theme.primaryColor, color: theme.buttonTextColor }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  style={{ backgroundColor: theme.primaryColor, color: theme.buttonTextColor }}
                >
                  Next Step <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
