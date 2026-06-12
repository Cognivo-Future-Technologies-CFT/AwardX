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
import { getEffectivePaymentProgramId, normalizeIntegrationSources } from '../../lib/programIntegrations';
import { storePostAuthRedirect, sanitizeRedirectPath } from '../../lib/safeRedirect';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Award, ChevronDown, AlertCircle, Github, UploadCloud, X, FileIcon } from 'lucide-react';
import { storage } from '../../services/supabase';
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

const syncAwardSelectorOptions = (
  fields: FormField[],
  awardOptions: string[],
): FormField[] => {
  const options = awardOptions.length > 0 ? awardOptions : ['General'];
  return fields.map((field) =>
    field.type === 'award_selector'
      ? {
          ...field,
          label: field.label || 'Award Selection',
          placeholder: field.placeholder || 'Select award category...',
          options,
        }
      : field,
  );
};

const buildHierarchicalAwardOptions = (rows: Array<{ id: string; title: string; parent_id: string | null }>) => {
  const validRows = rows
    .map((row) => ({
      id: String(row.id || '').trim(),
      title: String(row.title || '').trim(),
      parent_id: row.parent_id ? String(row.parent_id) : null,
    }))
    .filter((row) => row.id && row.title);

  const parentRows = validRows.filter((row) => !row.parent_id);
  const childrenByParent = new Map<string, Array<{ id: string; title: string; parent_id: string | null }>>();

  validRows.forEach((row) => {
    if (!row.parent_id) return;
    const children = childrenByParent.get(row.parent_id) || [];
    children.push(row);
    childrenByParent.set(row.parent_id, children);
  });

  const options: string[] = [];
  parentRows.forEach((parent) => {
    const children = childrenByParent.get(parent.id) || [];
    if (children.length === 0) {
      options.push(parent.title);
      return;
    }
    children.forEach((child) => {
      options.push(`${parent.title} -> ${child.title}`);
    });
  });

  const parentIds = new Set(parentRows.map((row) => row.id));
  validRows.forEach((row) => {
    if (row.parent_id && !parentIds.has(row.parent_id)) {
      options.push(row.title);
    }
  });

  if (options.length > 0) {
    return Array.from(new Set(options));
  }

  return Array.from(new Set(validRows.map((row) => row.title)));
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
  const [currentFieldIdx, setCurrentFieldIdx] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showRequirements, setShowRequirements] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [paymentState, setPaymentState] = useState<'idle' | 'success' | 'cancelled'>('idle');
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [applicationMode, setApplicationMode] = useState<'standard' | 'hackathon'>('standard');
  const [requireGithubAuth, setRequireGithubAuth] = useState(false);
  const [kycEnabled, setKycEnabled] = useState(false);
  // Whether the current visitor is signed in (any provider).
  // Forms load for everyone; sign-in is only required at submit time.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const needsGithubApplication = applicationMode === 'hackathon' || requireGithubAuth;

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
    const payment = params.get('payment');
    const sessionId = params.get('session_id');
    const submissionId = params.get('submission_id');

    if (payment === 'success' && sessionId && submissionId) {
      void (async () => {
        try {
          const verifyResponse = await fetch('/api/payments/stripe-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, submissionId }),
          });
          const verifyPayload = await verifyResponse.json();
          if (!verifyResponse.ok) {
            throw new Error(verifyPayload?.error || 'Payment verification failed');
          }
          setIsSubmitted(true);
          setPaymentState('success');
          setPaymentMessage('Payment confirmed. Your submission has been received successfully.');
        } catch (error: any) {
          setPaymentState('cancelled');
          setPaymentMessage(error?.message || 'Payment could not be verified. Contact support if you were charged.');
        }
      })();
      return;
    }

    if (payment === 'success') {
      setPaymentState('cancelled');
      setPaymentMessage('Payment could not be verified automatically. Contact support if you were charged.');
    }
    if (payment === 'cancelled') {
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

        // Check current session — form loads regardless, but we track auth state
        // so we can gate submission (not form viewing) for unauthenticated users.
        const { session } = await auth.getSession();
        setIsAuthenticated(!!session);

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

        const { data: programRow } = await supabase
          .from('programs')
          .select('application_mode, require_github_auth, kyc_enabled, active_form_id, status, integration_sources')
          .eq('id', form.program_id)
          .maybeSingle();

        if (programRow?.active_form_id && programRow.active_form_id !== currentFormId) {
          setIsError('This form is not the active submission form for this program.');
          setIsLoading(false);
          return;
        }

        if (programRow?.status && programRow.status !== 'active') {
          setIsError('Submissions are not yet open. This program is not live.');
          setIsLoading(false);
          return;
        }

        const mode = (programRow?.application_mode as 'standard' | 'hackathon') || 'standard';
        const githubRequired = programRow?.require_github_auth ?? mode === 'hackathon';
        setApplicationMode(mode);
        setRequireGithubAuth(githubRequired);
        setKycEnabled(!!programRow?.kyc_enabled);

        if (githubRequired || mode === 'hackathon') {
          const { session } = await auth.getSession();
          if (!session) {
            const returnUrl = `${window.location.pathname}${window.location.search}`;
            navigate(`/login?next=${encodeURIComponent(returnUrl)}`);
            return;
          }
          const { user: ghUser } = await auth.getUser();
          const identities = ghUser?.identities || [];
          const hasGithub =
            identities.some((i: any) => i.provider === 'github') ||
            ghUser?.app_metadata?.provider === 'github';
          if (!hasGithub) {
            setIsError('github_required');
            setIsLoading(false);
            return;
          }
        }

        const { data: categoryRows } = await supabase
          .from('categories')
          .select('id, title, parent_id')
          .eq('program_id', form.program_id)
          .order('title', { ascending: true });

        const awardOptions = buildHierarchicalAwardOptions(
          (categoryRows || []) as Array<{ id: string; title: string; parent_id: string | null }>,
        );

        const paymentProgramId = getEffectivePaymentProgramId(
          form.program_id,
          normalizeIntegrationSources(programRow?.integration_sources),
        );

        const { data: paymentConfigRow } = await supabase
          .from('program_payment_configs_public')
          .select('enabled, provider, currency, fee_amount, connected, public_key')
          .eq('program_id', paymentProgramId)
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
          const normalizedFields = syncAwardSelectorOptions(mappedFields, awardOptions);
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
          if (draft.current_page > 0) setCurrentFieldIdx(draft.current_page);
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
          current_page: currentFieldIdx,
        });
        setLastSavedAt(new Date());
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 2000); // 2s debounce
    return () => clearTimeout(timer);
  }, [formData, currentFieldIdx, formId, isLoading, isSubmitted]);

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

  const stepFields = formFields;
  const stepCount = Math.max(1, stepFields.length);
  const safeStepIndex = Math.min(currentFieldIdx, Math.max(stepCount - 1, 0));
  const currentField = stepFields[safeStepIndex] || null;
  const currentPage = formPages.find((page) => page.id === currentField?.pageId) || formPages[0] || null;
  const isLastStep = safeStepIndex >= stepCount - 1;

  useEffect(() => {
    setCurrentFieldIdx((prev) => Math.min(prev, Math.max(stepFields.length - 1, 0)));
  }, [stepFields.length]);

  const hasFieldValue = (value: any) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return value != null && value !== '';
  };

  const validateCurrentStep = () => {
    if (!currentField) return true;
    if (!currentField.required) return true;
    return hasFieldValue(formData[currentField.id]);
  };

  const validateAllRequired = () => {
    for (const field of requiredFields) {
      if (!hasFieldValue(formData[field.id])) {
        return false;
      }
    }
    return true;
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (saveState !== 'saving') {
      setSaveState('idle');
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (safeStepIndex < stepCount - 1) {
      setCurrentFieldIdx(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (safeStepIndex > 0) {
      setCurrentFieldIdx(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!validateAllRequired()) {
      toast.error('Please complete all required questions before submitting.');
      return;
    }

    // Re-check auth at submit time (session may have changed since load).
    const { session } = await auth.getSession();
    if (!session) {
      setIsAuthenticated(false);
      setShowSignInPrompt(true);
      return;
    }
    setIsAuthenticated(true);

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
    const inputBaseClass = "w-full p-5 bg-[#F2F2F7] hover:bg-[#E5E5EA] focus:bg-white border-2 border-transparent focus:border-indigo-400 rounded-[20px] outline-none transition-all duration-300 text-[18px] text-[#1C1C1E] placeholder:text-[#C7C7CC] shadow-sm focus:shadow-md";

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            required={field.required}
            className={`${inputBaseClass} resize-y min-h-[160px]`}
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
              <ChevronDown className="w-5 h-5 text-[#AEAEB2]" />
            </div>
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-4">
            {field.options?.map((opt, i) => {
              const isSelected = value === opt;
              return (
                <label key={i} className={`flex items-center gap-5 p-5 rounded-[20px] border-2 cursor-pointer transition-all duration-300 group hover:-translate-y-0.5 ${isSelected ? 'border-indigo-600 bg-[#F0F5FF]' : 'border-[#E5E5EA] hover:border-[#D1D1D6] bg-white hover:shadow-sm'}`}>
                  <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border-[2.5px] transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-[#C7C7CC] group-hover:border-[#AEAEB2]'}`}>
                    {isSelected && <div className="w-3 h-3 rounded-full bg-white" />}
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
                  <span className="text-[18px] font-semibold text-[#1C1C1E]">{opt}</span>
                </label>
              );
            })}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-4">
            {field.options?.map((opt, i) => {
              const isSelected = Array.isArray(value) && value.includes(opt);
              return (
                <label key={i} className={`flex items-center gap-5 p-5 rounded-[20px] border-2 cursor-pointer transition-all duration-300 group hover:-translate-y-0.5 ${isSelected ? 'border-indigo-600 bg-[#F0F5FF]' : 'border-[#E5E5EA] hover:border-[#D1D1D6] bg-white hover:shadow-sm'}`}>
                  <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-[8px] border-[2.5px] transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-[#C7C7CC] group-hover:border-[#AEAEB2]'}`}>
                    {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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
                  <span className="text-[18px] font-semibold text-[#1C1C1E]">{opt}</span>
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
              className={`${inputBaseClass} appearance-none cursor-pointer pr-20 font-bold text-indigo-900 bg-indigo-50/50 hover:bg-indigo-50 border-indigo-100 focus:border-indigo-400`}
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
      case 'file': {
        const fileState: { name?: string; url?: string; uploading?: boolean; error?: string } =
          typeof value === 'object' && value !== null ? value : {};
        return (
          <div className="relative">
            <input
              type="file"
              id={`file-${field.id}`}
              className="sr-only"
              required={field.required && !fileState.url}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                handleInputChange(field.id, { name: file.name, uploading: true });
                const tempId = `temp-${Date.now()}`;
                const { path, bucket, error } = await storage.uploadSubmissionFile(file, tempId);
                if (error || !path) {
                  handleInputChange(field.id, { error: (error as any)?.message || 'Upload failed' });
                  toast.error('File upload failed: ' + ((error as any)?.message || 'Unknown error'));
                  return;
                }
                const { data: urlData } = (supabase as any).storage.from(bucket || 'media').getPublicUrl(path);
                handleInputChange(field.id, { name: file.name, url: urlData?.publicUrl || path });
              }}
            />
            {fileState.url ? (
              <div className="flex items-center gap-3 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-[20px]">
                <FileIcon className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-indigo-900 truncate">{fileState.name}</span>
                <button
                  type="button"
                  onClick={() => handleInputChange(field.id, '')}
                  className="text-indigo-400 hover:text-indigo-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <label
                htmlFor={`file-${field.id}`}
                className="flex flex-col items-center justify-center gap-3 p-8 bg-[#F2F2F7] hover:bg-[#E5E5EA] border-2 border-dashed border-[#C7C7CC] hover:border-indigo-400 rounded-[20px] cursor-pointer transition-all duration-300"
              >
                {fileState.uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <span className="text-sm text-slate-500">Uploading…</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-slate-400" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        {field.placeholder || 'Click to upload a file'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG, PDF or GIF (max 10 MB)</p>
                    </div>
                    {fileState.error && (
                      <p className="text-xs text-red-500">{fileState.error}</p>
                    )}
                  </>
                )}
              </label>
            )}
          </div>
        );
      }
      default:
        return (
          <input
            type={field.type}
            value={typeof value === 'string' ? value : ''}
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
    if (error === 'github_required') {
      const returnUrl = `${window.location.pathname}${window.location.search}`;
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-white shadow-xl">
            <Github className="w-14 h-14 mx-auto mb-4 text-white" />
            <h2 className="text-2xl font-bold mb-2">GitHub application required</h2>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              This hackathon uses application-based entry. Sign in with your GitHub account to
              verify your developer identity and submit your project.
            </p>
            <Button
              onClick={async () => {
                storePostAuthRedirect(returnUrl);
                await auth.signInWithProvider('github');
              }}
              className="w-full bg-white text-slate-900 hover:bg-slate-100"
            >
              <Github className="w-4 h-4 mr-2 inline" />
              Continue with GitHub
            </Button>
          </div>
        </div>
      );
    }

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
    <div className="min-h-screen w-full font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-500" style={{ backgroundColor: theme.backgroundColor !== '#ffffff' ? theme.backgroundColor : '#F5F5F7' }}>
      <div className="w-full max-w-[1400px] mx-auto py-6 sm:py-10 px-4 sm:px-8 lg:px-12 min-h-screen flex flex-col justify-center">

        {paymentState === 'cancelled' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 mx-auto w-full max-w-4xl rounded-[20px] border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900 flex items-start gap-4 shadow-sm">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-lg tracking-tight">Payment Cancelled</p>
              <p className="text-[16px] opacity-80 mt-1">{paymentMessage || 'Your draft is safe. Submit again when you are ready to complete payment.'}</p>
            </div>
          </motion.div>
        )}

        <div className="mb-10 px-4 max-w-4xl mx-auto w-full">
          <div className="flex justify-between items-end mb-4">
            <span className="text-[13px] font-bold tracking-widest text-[#86868B] uppercase">Question {safeStepIndex + 1} of {stepCount}</span>
            <span className="text-[15px] font-semibold text-[#1D1D1F]">{Math.round(((safeStepIndex + 1) / stepCount) * 100)}% Completed</span>
          </div>
          <div className="w-full h-2.5 bg-slate-200/60 rounded-full overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${((safeStepIndex + 1) / stepCount) * 100}%`, backgroundColor: theme.primaryColor || '#007AFF' }}
            />
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] md:rounded-[40px] shadow-sm md:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] border border-slate-200/60 overflow-hidden relative w-full lg:max-w-6xl mx-auto"
        >
          <div className="p-6 sm:p-14 md:p-20 flex flex-col items-center">
            <div className="mb-10 w-full max-w-4xl">
              <div className="mb-8 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={safeStepIndex === 0}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold ${safeStepIndex === 0 ? 'opacity-40' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'}`}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>

                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#86868B]">
                  {currentPage?.title || formTitle}
                </div>

                {isLastStep ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="rounded-full px-6 py-2.5 text-sm font-bold"
                    style={{ backgroundColor: theme.primaryColor || '#007AFF', color: theme.buttonTextColor || '#fff' }}
                  >
                    {isSubmitting
                      ? 'Submitting...'
                      : paymentConfig?.enabled && Number(paymentConfig?.fee || 0) > 0
                        ? `Pay ${paymentConfig.currency} ${Number(paymentConfig.fee || 0).toFixed(2)}`
                        : 'Submit'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="rounded-full px-6 py-2.5 text-sm font-bold"
                    style={{ backgroundColor: theme.primaryColor || '#007AFF', color: theme.buttonTextColor || '#fff' }}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[#1D1D1F] mb-4" style={{ fontFamily: theme.fontFamily }}>
                {formTitle}
              </h1>
              {currentPage?.description && (
                <p className="text-lg md:text-xl text-[#86868B] leading-relaxed max-w-3xl" style={{ fontFamily: theme.fontFamily }}>
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
                key={currentField?.id || safeStepIndex}
                initial={{ opacity: 0, x: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-2xl"
              >
                {currentField ? (
                  <div className="group flex flex-col items-start w-full">
                    <label className="block text-[22px] md:text-[26px] font-bold text-[#1D1D1F] mb-5 ml-1 group-focus-within:text-indigo-600 transition-colors tracking-tight w-full" style={{ fontFamily: theme.fontFamily }}>
                      {currentField.label} {currentField.required && <span className="text-rose-500 ml-1">*</span>}
                    </label>
                    {renderFieldInput(currentField)}
                    {currentField.helpText && (
                      <p className="text-[14px] mt-2.5 ml-1 text-[#86868B]" style={{ fontFamily: theme.fontFamily }}>
                        {currentField.helpText}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    No questions found in this form.
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-16 pt-8 w-full max-w-4xl border-t border-slate-100 space-y-4">
              {/* Draft-save indicator */}
              <div className="flex justify-center items-center">
                <div className="text-[14px] text-[#86868B] font-medium text-center">
                  {saveState === 'saving' && 'Saving draft...'}
                  {saveState === 'saved' && `Saved${lastSavedAt ? ` at ${lastSavedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}`}
                  {saveState === 'error' && <span className="text-rose-500">Save failed</span>}
                </div>
              </div>

              {/* Sign-in prompt — shown inline when user tries to submit without a session */}
              {showSignInPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[20px] border border-indigo-200 bg-indigo-50 px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="flex-1">
                    <p className="text-[16px] font-bold text-indigo-900">Sign in to submit your response</p>
                    <p className="text-[14px] text-indigo-700 mt-1">
                      Your answers are saved. Sign in with any account and you'll be brought straight back here.
                    </p>
                  </div>
                  <a
                    href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                    className="flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
                  >
                    Sign in
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </motion.div>
              )}

              {/* Persistent soft nudge for visitors who haven't signed in yet */}
              {!isAuthenticated && !showSignInPrompt && (
                <p className="text-center text-[13px] text-[#AEAEB2]">
                  You'll need to{' '}
                  <a
                    href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                    className="text-indigo-500 hover:text-indigo-700 font-semibold underline underline-offset-2 transition-colors"
                  >
                    sign in
                  </a>
                  {' '}to submit your response.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
