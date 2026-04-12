import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '../Button';
import { useNavigate, useParams } from 'react-router-dom';

import { FormField, FormPage, FormTheme } from '../dashboard/FormBuilder';
import { db } from '../../services/database';
import { submissionDrafts, formAnalytics } from '../../services/database';
import { auth } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { PaymentConfig } from '../../services/models';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Award, ChevronDown, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const ensureMandatoryAwardSelectorField = (
  fields: FormField[],
  pages: FormPage[],
  awardOptions: string[],
): FormField[] => {
  const firstPageId = pages[0]?.id || 'page-1';
  const options = awardOptions.length > 0 ? awardOptions : ['General'];
  const existing = fields.find((field) => field.type === 'award_selector');

  const mandatoryField: FormField = existing
    ? {
        ...existing,
        label: existing.label || 'Award Selection',
        placeholder: existing.placeholder || 'Select award category...',
        required: true,
        options,
        pageId: existing.pageId || firstPageId,
      }
    : {
        id: `award-selector-mandatory-${Date.now()}`,
        type: 'award_selector',
        label: 'Award Selection',
        placeholder: 'Select award category...',
        required: true,
        options,
        pageId: firstPageId,
      };

  const nonAwardFields = fields.filter((field) => field.type !== 'award_selector');
  return [mandatoryField, ...nonAwardFields];
};

export const FormSubmissionPage: React.FC = () => {
  const navigate = useNavigate();
  const { formId: formIdParam } = useParams<{ formId?: string }>();

  const getRequireSignInFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('requireSignIn') === '1' || params.get('source') === 'nominate';
    } catch {
      return false;
    }
  };

  // Get formId from URL params or props
  const getFormIdFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      return formIdParam || params.get('formId') || window.location.search.split('formId=')[1]?.split('&')[0];
    } catch (e) {
      console.error('Error getting formId from URL:', e);
      return formIdParam || null;
    }
  };

  const [formId] = useState<string | null>(() => {
    try {
      return getFormIdFromUrl();
    } catch (e) {
      console.error('Error initializing formId:', e);
      return formIdParam || null;
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
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showRequirements, setShowRequirements] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentState, setPaymentState] = useState<'idle' | 'success' | 'cancelled'>('idle');
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  const completeSubmissionSideEffects = async (currentFormId: string) => {
    const { user } = await auth.getUser();
    formAnalytics.track({ form_id: currentFormId, event_type: 'complete', user_id: user?.id }).catch(() => {});
    submissionDrafts.delete(currentFormId, user?.id).catch(() => {});
  };

  const loadRazorpayScript = async (): Promise<boolean> => {
    if ((window as any).Razorpay) return true;

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setIsSubmitted(true);
      setPaymentState('success');
      setPaymentMessage('Payment confirmed. Your submission has been received successfully.');
    }
    if (params.get('payment') === 'cancelled') {
      setPaymentState('cancelled');
      setPaymentMessage('Payment was cancelled. You can submit again to complete payment.');
    }
  }, []);

  useEffect(() => {
    const currentFormId = formId || getFormIdFromUrl();
    if (!currentFormId) {
      setIsError('Form ID is required');
      setIsLoading(false);
      return;
    }

    const loadForm = async () => {
      try {
        setIsLoading(true);

        if (getRequireSignInFromUrl()) {
          const { session } = await auth.getSession();
          if (!session) {
            const returnUrl = `${window.location.pathname}${window.location.search}`;
            navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
            return;
          }
        }

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
          setIsError('Submissions are not yet open. Check back when the program is published.');
          setIsLoading(false);
          return;
        }

        setFormTitle(form.title || 'Form');
        setProgramId(form.program_id);
        setFormPages(form.pages || [{ id: 'page-1', title: 'Page 1', order: 0 }]);
        setTheme(form.theme || defaultTheme);

        const { data: categoryRows } = await supabase
          .from('categories')
          .select('title')
          .eq('program_id', form.program_id)
          .order('title', { ascending: true });

        const awardOptions = Array.from(
          new Set((categoryRows || []).map((row: any) => String(row.title || '').trim()).filter(Boolean)),
        );

        const { data: paymentConfigRow } = await supabase
          .from('program_payment_configs')
          .select('*')
          .eq('program_id', form.program_id)
          .maybeSingle();

        if (paymentConfigRow) {
          const provider = String(paymentConfigRow.provider || 'stripe').toLowerCase();
          setPaymentConfig({
            enabled: !!paymentConfigRow.enabled,
            provider: provider === 'paypal' ? 'PayPal' : provider === 'razorpay' ? 'Razorpay' : 'Stripe',
            currency: paymentConfigRow.currency || 'USD',
            fee: Number(paymentConfigRow.fee_amount) || 0,
            connected: !!paymentConfigRow.connected,
            publicKey: paymentConfigRow.public_key || undefined,
          });
        } else {
          setPaymentConfig(null);
        }

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
          const pages = form.pages || [{ id: 'page-1', title: 'Page 1', order: 0 }];
          const normalizedFields = ensureMandatoryAwardSelectorField(mappedFields, pages, awardOptions);
          setFormFields(normalizedFields);

          // Prefill identity fields where labels/types match and values are empty.
          const { user } = await auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', user.id)
              .maybeSingle();

            const fullName = String(profile?.full_name || user.user_metadata?.full_name || '').trim();
            const email = String(profile?.email || user.email || '').trim();

            setFormData((prev) => {
              const next = { ...prev };
              for (const field of normalizedFields) {
                const currentValue = next[field.id];
                if (currentValue != null && String(currentValue).trim() !== '') continue;

                const label = String(field.label || '').toLowerCase();
                if (field.type === 'email' && email) {
                  next[field.id] = email;
                } else if ((label.includes('name') || label.includes('full name')) && fullName) {
                  next[field.id] = fullName;
                } else if (label.includes('email') && email) {
                  next[field.id] = email;
                } else if (label.includes('user id')) {
                  next[field.id] = user.id;
                }
              }
              return next;
            });
          }
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading form:', err);
        setIsError(err.message || 'Failed to load form');
        setIsLoading(false);
      }
    };

    loadForm();
  }, [formId, formIdParam]);

  // Restore draft data after form loads
  useEffect(() => {
    if (!formId || isLoading || formFields.length === 0) return;
    const restoreDraft = async () => {
      try {
        const { user } = await auth.getUser();
        const sessionId = sessionStorage.getItem('draft_session') || `anon-${Date.now()}`;
        if (!sessionStorage.getItem('draft_session')) sessionStorage.setItem('draft_session', sessionId);

        const { data: draft } = await submissionDrafts.get(formId, user?.id, user ? undefined : sessionId);
        if (draft?.draft_data && Object.keys(draft.draft_data).length > 0) {
          setFormData(draft.draft_data);
          if (draft.current_page > 0) setCurrentPageIdx(draft.current_page);
        }

        // Track form view
        formAnalytics.track({ form_id: formId, event_type: 'view', user_id: user?.id, session_id: sessionId }).catch(() => {});
      } catch {
        // Non-critical
      }
    };
    restoreDraft();
  }, [formId, isLoading, formFields.length]);

  useEffect(() => {
    if (!formId) return;
    const key = `requirements_dismissed_${formId}`;
    const dismissed = sessionStorage.getItem(key) === 'true';
    setShowRequirements(!dismissed);
  }, [formId]);

  // Auto-save draft on data change (debounced)
  useEffect(() => {
    if (!formId || isLoading || isSubmitted || Object.keys(formData).length === 0) return;
    setSaveState('saving');
    const timer = setTimeout(async () => {
      try {
        const { user } = await auth.getUser();
        const sessionId = sessionStorage.getItem('draft_session');
        await submissionDrafts.save({
          form_id: formId,
          user_id: user?.id,
          session_id: user ? undefined : (sessionId || undefined),
          draft_data: formData,
          current_page: currentPageIdx,
        });
        setLastSavedAt(new Date());
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 2000); // 2s debounce
    return () => clearTimeout(timer);
  }, [formData, currentPageIdx, formId, isLoading, isSubmitted]);

  const requiredFields = useMemo(() => formFields.filter(f => !!f.required), [formFields]);
  const completedRequiredCount = useMemo(() => {
    return requiredFields.filter((field) => {
      const value = formData[field.id];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      return value != null && value !== '';
    }).length;
  }, [requiredFields, formData]);

  const dismissRequirements = () => {
    if (!formId) return;
    sessionStorage.setItem(`requirements_dismissed_${formId}`, 'true');
    setShowRequirements(false);
  };

  const currentPage = formPages[currentPageIdx] || formPages[0];
  const pageFields = formFields.filter(f => f.pageId === currentPage?.id);
  const isLastPage = currentPageIdx === formPages.length - 1;

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (saveState !== 'saving') {
      setSaveState('idle');
    }
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
      toast.error('Please fill in all required fields');
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
      toast.error('Please fill in all required fields');
      return;
    }

    const currentFormId = formId || getFormIdFromUrl();
    if (!currentFormId) {
      toast.error('Form ID is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const paymentRequired = !!(paymentConfig?.enabled && (paymentConfig?.fee || 0) > 0 && programId);

      const submission: any = await db.submitFormResponse(currentFormId, formData, paymentRequired
        ? {
            paymentRequired: true,
            paymentAmount: Number(paymentConfig?.fee || 0),
          }
        : undefined);

      if (paymentRequired && submission?.id && programId) {
        const checkoutResponse = await fetch('/api/payments/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submissionId: submission.id,
            programId,
            formId: currentFormId,
            currency: paymentConfig?.currency || 'USD',
          }),
        });

        const checkoutPayload = await checkoutResponse.json();
        if (!checkoutResponse.ok) {
          throw new Error(checkoutPayload?.error || 'Failed to initialize payment checkout');
        }

        if (checkoutPayload.provider === 'razorpay') {
          const scriptLoaded = await loadRazorpayScript();
          if (!scriptLoaded) {
            throw new Error('Unable to load Razorpay checkout script.');
          }

          const options = {
            key: checkoutPayload.keyId,
            amount: checkoutPayload.amount,
            currency: checkoutPayload.currency,
            name: checkoutPayload.name,
            description: checkoutPayload.description,
            order_id: checkoutPayload.orderId,
            handler: async (response: any) => {
              const verifyResponse = await fetch('/api/payments/razorpay-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  submissionId: submission.id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });

              const verifyPayload = await verifyResponse.json();
              if (!verifyResponse.ok) {
                throw new Error(verifyPayload?.error || 'Razorpay payment verification failed');
              }

              await completeSubmissionSideEffects(currentFormId);
              setPaymentState('success');
              setPaymentMessage('Payment completed and submission received.');
              setIsSubmitted(true);
            },
            modal: {
              ondismiss: () => {
                setPaymentState('cancelled');
                setPaymentMessage('Payment was cancelled. Your draft is saved. You can submit again anytime.');
              },
            },
            notes: checkoutPayload.notes,
            prefill: checkoutPayload.prefill,
            theme: { color: theme.primaryColor },
          };

          const razorpay = new (window as any).Razorpay(options);
          razorpay.open();
          return;
        }

        if (!checkoutPayload?.url) {
          throw new Error('Missing checkout URL for Stripe payment');
        }

        window.location.href = checkoutPayload.url;
        return;
      }

      await completeSubmissionSideEffects(currentFormId);

      setIsSubmitted(true);
      setPaymentState('idle');
      setPaymentMessage(null);
    } catch (err: any) {
      console.error('Form submission error:', err);
      toast.error('Failed to submit form: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldInput = (field: FormField) => {
    const value = formData[field.id] || '';
    
    // Apple-style base input class
    const inputBaseClass = "w-full p-4 bg-[#F2F2F7] hover:bg-[#E5E5EA] focus:bg-white border-2 border-transparent focus:border-slate-300 rounded-[16px] outline-none transition-all duration-200 text-[17px] text-[#1C1C1E] placeholder:text-[#8E8E93]";

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            required={field.required}
            className={`${inputBaseClass} resize-y min-h-[120px]`}
            style={{ 
              fontFamily: theme.fontFamily 
            }}
          />
        );
      case 'select':
        return (
          <div className="relative">
            <select
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              className={`${inputBaseClass} appearance-none cursor-pointer pr-12`}
              style={{ fontFamily: theme.fontFamily }}
            >
              <option value="">{field.placeholder || 'Select an option...'}</option>
              {field.options?.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-5 h-5 text-[#8E8E93]" />
            </div>
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-3">
            {field.options?.map((opt, i) => {
              const isSelected = value === opt;
              return (
                <label key={i} className={`flex items-center gap-4 p-4 rounded-[16px] border-2 cursor-pointer transition-all duration-200 ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-[#F2F2F7] hover:border-[#E5E5EA] bg-white'}`}>
                  <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-[#C7C7CC]'}`}>
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </div>
                  <input
                    type="radio"
                    name={field.id}
                    value={opt}
                    checked={isSelected}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.required}
                    className="sr-only"
                  />
                  <span className="text-[17px] font-medium text-[#1C1C1E]">{opt}</span>
                </label>
              );
            })}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-3">
            {field.options?.map((opt, i) => {
              const isSelected = Array.isArray(value) && value.includes(opt);
              return (
                <label key={i} className={`flex items-center gap-4 p-4 rounded-[16px] border-2 cursor-pointer transition-all duration-200 ${isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-[#F2F2F7] hover:border-[#E5E5EA] bg-white'}`}>
                  <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-[6px] border-2 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-[#C7C7CC]'}`}>
                    {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const current = Array.isArray(value) ? value : [];
                      const updated = e.target.checked
                        ? [...current, opt]
                        : current.filter(v => v !== opt);
                      handleInputChange(field.id, updated);
                    }}
                    className="sr-only"
                  />
                  <span className="text-[17px] font-medium text-[#1C1C1E]">{opt}</span>
                </label>
              );
            })}
          </div>
        );
      case 'award_selector':
        return (
          <div className="relative">
            <select
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
              className={`${inputBaseClass} appearance-none cursor-pointer pr-12 font-semibold text-indigo-900 bg-indigo-50/50 hover:bg-indigo-50 border-indigo-100 focus:border-indigo-300`}
              style={{ fontFamily: theme.fontFamily }}
            >
              <option value="">{field.placeholder || 'Select award category...'}</option>
              {field.options?.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              <ChevronDown className="w-5 h-5 text-indigo-400" />
            </div>
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
            className={inputBaseClass}
            style={{ fontFamily: theme.fontFamily }}
          />
        );
    }
  };

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
            <Button onClick={() => navigate('/')}>Go Home</Button>
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
              <p className="text-lg text-slate-600">{paymentMessage || 'Your form has been submitted successfully.'}</p>
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
    <div className="min-h-screen font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-500" style={{ backgroundColor: theme.backgroundColor !== '#ffffff' ? theme.backgroundColor : '#F5F5F7' }}>
      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col justify-center">

        {paymentState === 'cancelled' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 flex items-start gap-4 shadow-sm">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-lg tracking-tight">Payment Cancelled</p>
              <p className="text-[15px] opacity-80 mt-1">{paymentMessage || 'Your draft is safe. Submit again when you are ready to complete payment.'}</p>
            </div>
          </motion.div>
        )}

        {formPages.length > 1 && (
          <div className="mb-8 px-2">
            <div className="flex justify-between items-end mb-3">
              <span className="text-sm font-semibold tracking-wide text-[#86868B] uppercase">Step {currentPageIdx + 1} of {formPages.length}</span>
              <span className="text-sm font-medium text-[#1D1D1F]">{Math.round(((currentPageIdx) / formPages.length) * 100)}% Completed</span>
            </div>
            <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${((currentPageIdx + 1) / formPages.length) * 100}%`, backgroundColor: theme.primaryColor || '#007AFF' }}
              />
            </div>
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] md:rounded-[40px] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border border-slate-100/50 overflow-hidden relative"
        >
          <div className="p-8 sm:p-12 md:p-14">
            <div className="mb-10">
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4" style={{ fontFamily: theme.fontFamily }}>
                {currentPage?.title || formTitle}
              </h1>
              {currentPage?.description && (
                <p className="text-lg md:text-xl text-[#86868B] leading-relaxed max-w-2xl" style={{ fontFamily: theme.fontFamily }}>
                  {currentPage.description}
                </p>
              )}
              
              {showRequirements && requiredFields.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-8 rounded-[20px] bg-[#F5F5F7] p-6 border border-[#E5E5EA]">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-[17px] font-semibold text-[#1D1D1F]">Before you submit</p>
                      <p className="text-[15px] text-[#86868B] mt-1">Complete required items to avoid deadline risk.</p>
                    </div>
                    <button
                      onClick={dismissRequirements}
                      className="text-[15px] font-medium text-indigo-600 hover:text-indigo-800 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow transition-all"
                      type="button"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="w-full h-1.5 bg-[#E5E5EA] rounded-full mb-4 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(completedRequiredCount / requiredFields.length) * 100}%` }} />
                  </div>
                  <ul className="space-y-2.5">
                    {requiredFields.slice(0, 5).map((field) => {
                      const value = formData[field.id];
                      const filled = Array.isArray(value)
                        ? value.length > 0
                        : typeof value === 'string'
                          ? value.trim().length > 0
                          : value != null && value !== '';
                      return (
                        <li key={field.id} className="flex items-center gap-3 text-[15px]">
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${filled ? 'bg-emerald-500 text-white' : 'bg-[#E5E5EA] text-transparent'}`}>
                            {filled && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          <span className={filled ? 'text-[#1D1D1F]' : 'text-[#86868B]'}>{field.label}</span>
                        </li>
                      );
                    })}
                    {requiredFields.length > 5 && (
                      <li className="text-[15px] text-[#86868B] pl-8">...and {requiredFields.length - 5} more</li>
                    )}
                  </ul>
                </motion.div>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentPageIdx}
                initial={{ opacity: 0, x: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="space-y-8">
                  {pageFields.map(field => (
                    <div key={field.id} className="group">
                      <label className="block text-[17px] font-semibold text-[#1D1D1F] mb-3 ml-1 group-focus-within:text-indigo-600 transition-colors" style={{ fontFamily: theme.fontFamily }}>
                        {field.label} {field.required && <span className="text-rose-500 ml-1">*</span>}
                      </label>
                      {renderFieldInput(field)}
                      {field.helpText && (
                        <p className="text-[14px] mt-2.5 ml-1 text-[#86868B]" style={{ fontFamily: theme.fontFamily }}>
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-12 pt-8 flex flex-col-reverse sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start gap-4">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentPageIdx === 0}
                  className={`px-6 py-3.5 rounded-full text-[17px] font-medium transition-all ${currentPageIdx === 0 ? 'opacity-0 pointer-events-none' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'}`}
                >
                  <ChevronLeft className="w-5 h-5 mr-1" /> Back
                </Button>
                
                <div className="sm:hidden text-[14px] text-[#86868B] font-medium">
                  {saveState === 'saving' && 'Saving...'}
                  {saveState === 'saved' && 'Saved'}
                </div>
              </div>

              <div className="flex items-center gap-6 w-full sm:w-auto">
                <div className="hidden sm:block text-[14px] text-[#86868B] font-medium">
                  {saveState === 'saving' && 'Saving draft...'}
                  {saveState === 'saved' && `Saved${lastSavedAt ? ` at ${lastSavedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}`}
                  {saveState === 'error' && <span className="text-rose-500">Save failed</span>}
                </div>

                {isLastPage ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-10 py-4 rounded-full text-[17px] font-semibold tracking-wide transition-all shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none min-w-[160px]"
                    style={{ backgroundColor: theme.primaryColor || '#007AFF', color: theme.buttonTextColor || '#fff' }}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" /> Submitting
                      </div>
                    ) : (
                      paymentConfig?.enabled && Number(paymentConfig?.fee || 0) > 0
                        ? `Pay ${paymentConfig.currency} ${Number(paymentConfig.fee || 0).toFixed(2)}`
                        : 'Submit Application'
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="w-full sm:w-auto px-10 py-4 rounded-full text-[17px] font-semibold tracking-wide transition-all shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none min-w-[160px]"
                    style={{ backgroundColor: theme.primaryColor || '#007AFF', color: theme.buttonTextColor || '#fff' }}
                  >
                    Next Step <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
