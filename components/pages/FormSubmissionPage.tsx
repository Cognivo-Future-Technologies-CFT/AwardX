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
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Award, ChevronDown, AlertCircle, Github, UploadCloud, FileIcon, ImageIcon, Sparkles } from 'lucide-react';
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

// ─────────────────────────────────────────────────────────────────────────
// PRESENTATION-ONLY HELPERS
// These are purely derived/UI helpers. They do not introduce new state,
// new data flow, or new mutations — they only categorize EXISTING
// formFields into wizard "steps" for layout/UI purposes.
// ─────────────────────────────────────────────────────────────────────────

type WizardStepId = 'profile' | 'award' | 'media' | 'review';

interface WizardStepDef {
  id: WizardStepId;
  label: string;
  description: string;
}

const WIZARD_STEPS: WizardStepDef[] = [
  { id: 'profile', label: 'Basic Info', description: 'Contact & profile details' },
  { id: 'award', label: 'Award Info', description: 'Category & award questions' },
  { id: 'media', label: 'Uploads', description: 'Supporting media & files' },
  { id: 'review', label: 'Review', description: 'Confirm & submit' },
];

const PROFILE_FIELD_KEYWORDS = [
  'name', 'email', 'phone', 'contact', 'organization', 'organisation',
  'designation', 'website', 'linkedin', 'company', 'affiliation', 'job title',
];

const ACCENT_GREEN = '#059669';

const isFullWidthField = (field: FormField) =>
  ['textarea', 'radio', 'checkbox', 'select', 'award_selector', 'file', 'image'].includes(field.type);

const SECTION_TITLES = {
  profile: "Basic Information",
  award: "Award Information",
  media: "Supporting Evidence",
  review: "Review & Submit",
};

const getFieldWizardStep = (field: FormField) => {
  switch (field.type) {
    // Basic Information
    case 'email':
      return 'profile';

    case 'text':
    case 'number':
    case 'date':
    case 'url':
      return 'profile';

    // Award Information
    case 'textarea':
    case 'select':
    case 'radio':
    case 'checkbox':
    case 'award_selector':
      return 'award';

    // Supporting Evidence
    case 'file':
    case 'image':
      return 'media';

    default:
      return 'award';
  }
};

const formatFieldValue = (field: FormField, value: any): string => {
  if (!hasFieldValue(value)) return '—';
  if (field.type === 'file' || field.type === 'image') {
    const fileState = typeof value === 'object' && value !== null ? value : {};
    return fileState.name || 'Uploaded file';
  }
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const hasFieldValue = (value: any) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value != null && value !== '';
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
          const { session, user } = await auth.getSession();
          if (!session) {
            const returnUrl = `${window.location.pathname}${window.location.search}`;
            navigate(`/login?next=${encodeURIComponent(returnUrl)}`);
            return;
          }
          const identities = user?.identities || [];
          const hasGithub =
            identities.some((i) => i.provider === 'github') ||
            user?.app_metadata?.provider === 'github';
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

  
const fieldsByStep = useMemo(() => {
  const grouped = {
    profile: [] as FormField[],
    award: [] as FormField[],
    media: [] as FormField[],
  };

  formFields.forEach((field) => {
    const step = getFieldWizardStep(field);
    grouped[step].push(field);
  });

  return grouped;
}, [formFields]);

  const wizardStepCount = WIZARD_STEPS.length;
  const wizardStepIndex = Math.min(currentFieldIdx, wizardStepCount - 1);
  const currentWizardStep = WIZARD_STEPS[wizardStepIndex];
  const isReviewStep = currentWizardStep.id === 'review';
  const isLastStep = wizardStepIndex >= wizardStepCount - 1;
  const accentColor = theme.primaryColor && theme.primaryColor !== '#6366f1'
    ? theme.primaryColor
    : ACCENT_GREEN;

  useEffect(() => {
    setCurrentFieldIdx((prev) => Math.min(prev, wizardStepCount - 1));
  }, [formFields.length, wizardStepCount]);

  const validateCurrentStep = () => {
    if (isReviewStep) return true;
    const stepId = currentWizardStep.id as Exclude<WizardStepId, 'review'>;
    const stepFields = fieldsByStep[stepId];
    for (const field of stepFields) {
      if (field.required && !hasFieldValue(formData[field.id])) {
        return false;
      }
    }
    return true;
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
      toast.error('Please fill in all required fields in this section');
      return;
    }
    if (wizardStepIndex < wizardStepCount - 1) {
      setCurrentFieldIdx((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (wizardStepIndex > 0) {
      setCurrentFieldIdx((prev) => prev - 1);
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

    const inputBaseClass =
      'w-full px-4 py-3.5 sm:px-5 sm:py-4 bg-white hover:bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-[20px] outline-none transition-all duration-300 text-[16px] text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-md focus:ring-4 focus:ring-emerald-500/10';

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
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-3">
            {field.options?.map((opt, i) => {
              const isSelected = value === opt;
              return (
                <label key={i} className={`flex items-center gap-4 p-4 sm:p-5 rounded-[20px] border-2 cursor-pointer transition-all duration-200 group ${isSelected ? 'border-emerald-500 bg-emerald-50/70 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'}`}>
                  <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors ${isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
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
                  <span className="text-[16px] font-medium text-slate-900">{opt}</span>
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
                <label key={i} className={`flex items-center gap-4 p-4 sm:p-5 rounded-[20px] border-2 cursor-pointer transition-all duration-200 group ${isSelected ? 'border-emerald-500 bg-emerald-50/70 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm'}`}>
                  <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-colors ${isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 group-hover:border-slate-400'}`}>
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
                  <span className="text-[16px] font-medium text-slate-900">{opt}</span>
                </label>
              );
            })}
          </div>
        );
      case 'award_selector':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {(field.options || []).map((opt, i) => {
              const isSelected = value === opt;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleInputChange(field.id, opt)}
                  className={`relative flex items-center gap-3 p-4 sm:p-5 rounded-[20px] border-2 text-left transition-all duration-200 ${isSelected ? 'border-emerald-500 bg-emerald-50/80 shadow-md ring-1 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}
                  style={{ fontFamily: theme.fontFamily }}
                >
                  <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Award className="w-5 h-5" />
                  </div>
                  <span className={`text-[15px] font-semibold leading-snug ${isSelected ? 'text-emerald-900' : 'text-slate-700'}`}>{opt}</span>
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 absolute top-3 right-3" />
                  )}
                </button>
              );
            })}
            {(!field.options || field.options.length === 0) && (
              <div className="col-span-full text-sm text-slate-400 italic p-4">No award categories available.</div>
            )}
          </div>
        );
      case 'file': {
        const fileState: { name?: string; url?: string; uploading?: boolean; error?: string } =
          typeof value === 'object' && value !== null ? value : {};
        return (
          <div className="relative space-y-3">
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
            {!fileState.url && !fileState.uploading && (
              <label
                htmlFor={`file-${field.id}`}
                className="flex flex-col items-center justify-center gap-3 min-h-[220px] sm:min-h-[260px] px-6 py-10 bg-gradient-to-b from-slate-50 to-white border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-[20px] cursor-pointer transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-[20px] bg-emerald-100 flex items-center justify-center">
                  <UploadCloud className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-800">
                    {field.placeholder || 'Upload Supporting Files'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Drop files or click to upload</p>
                  <p className="text-xs text-slate-400 mt-2">SVG, PNG, JPG, PDF or GIF (max 10 MB)</p>
                </div>
                {fileState.error && (
                  <p className="text-xs text-red-500">{fileState.error}</p>
                )}
              </label>
            )}
            {fileState.uploading && (
              <div className="rounded-[20px] border-2 border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <FileIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{fileState.name || 'Uploading file…'}</p>
                    <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-[45%] bg-emerald-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Uploading…</p>
                  </div>
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin flex-shrink-0" />
                </div>
              </div>
            )}
            {fileState.url && (
              <div className="rounded-[20px] border-2 border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <FileIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-950 truncate">{fileState.name}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Uploaded successfully</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <label
                    htmlFor={`file-${field.id}`}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-emerald-300 bg-white text-sm font-semibold text-emerald-800 hover:bg-emerald-50 cursor-pointer transition-colors"
                  >
                    Replace
                  </label>
                  <button
                    type="button"
                    onClick={() => handleInputChange(field.id, '')}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'image': {
        const imageState: {
          name?: string;
          url?: string;
          uploading?: boolean;
          error?: string;
        } = typeof value === 'object' && value !== null ? value : {};

        return (
          <div className="relative space-y-3">
            <input
              type="file"
              accept="image/*"
              id={`image-${field.id}`}
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                handleInputChange(field.id, {
                  name: file.name,
                  uploading: true,
                });

                const tempId = `temp-${Date.now()}`;

                const { path, bucket, error } =
                  await storage.uploadSubmissionFile(file, tempId);

                if (error || !path) {
                  handleInputChange(field.id, {
                    error: (error as any)?.message || 'Upload failed',
                  });

                  toast.error(
                    'Image upload failed: ' +
                      ((error as any)?.message || 'Unknown error')
                  );

                  return;
                }

                const { data: urlData } = (supabase as any)
                  .storage
                  .from(bucket || 'media')
                  .getPublicUrl(path);

                handleInputChange(field.id, {
                  name: file.name,
                  url: urlData?.publicUrl || path,
                });
              }}
            />

            {!imageState.url && !imageState.uploading && (
              <label
                htmlFor={`image-${field.id}`}
                className="flex flex-col items-center justify-center gap-3 min-h-[220px] sm:min-h-[260px] px-6 py-10 bg-gradient-to-b from-slate-50 to-white border-2 border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30 rounded-[20px] cursor-pointer transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-[20px] bg-emerald-100 flex items-center justify-center">
                  <ImageIcon className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-800">Upload image, or drag and drop</p>
                  <p className="text-xs text-slate-400 mt-2">PNG, JPG, JPEG, SVG, WEBP</p>
                </div>
                {imageState.error && (
                  <p className="text-xs text-red-500">{imageState.error}</p>
                )}
              </label>
            )}

            {imageState.uploading && (
              <div className="rounded-[20px] border-2 border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{imageState.name || 'Uploading image…'}</p>
                    <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full w-[45%] bg-emerald-500 rounded-full animate-pulse" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Uploading…</p>
                  </div>
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin flex-shrink-0" />
                </div>
              </div>
            )}

            {imageState.url && (
              <div className="rounded-[20px] border-2 border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center overflow-hidden">
                    <img src={imageState.url} alt={imageState.name || 'Uploaded image'} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-950 truncate">{imageState.name}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Uploaded successfully</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <label
                    htmlFor={`image-${field.id}`}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-emerald-300 bg-white text-sm font-semibold text-emerald-800 hover:bg-emerald-50 cursor-pointer transition-colors"
                  >
                    Replace
                  </label>
                  <button
                    type="button"
                    onClick={() => handleInputChange(field.id, '')}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
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

  const renderFieldBlock = (field: FormField, fullWidth = false) => (
    <div
      key={field.id}
      className={`group flex flex-col items-start w-full ${fullWidth ? 'md:col-span-2' : ''}`}
    >
      <label
        className="block text-[15px] sm:text-base font-semibold text-slate-800 mb-2.5 group-focus-within:text-emerald-700 transition-colors tracking-tight w-full"
        style={{ fontFamily: theme.fontFamily }}
      >
        {field.label} {field.required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {renderFieldInput(field)}
      {field.helpText && (
        <p className="text-[13px] mt-2 text-slate-500" style={{ fontFamily: theme.fontFamily }}>
          {field.helpText}
        </p>
      )}
    </div>
  );

const renderSectionFields = (fields: FormField[]) => {
  if (fields.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
        No fields in this section.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className={`
            ${isFullWidthField(field) ? 'md:col-span-2' : ''}
            pb-8
            border-b border-slate-100
            last:border-b-0
          `}
        >
          {renderFieldBlock(field, isFullWidthField(field))}
        </div>
      ))}
    </div>
  );
};

  const renderReviewSection = (title: string, fields: FormField[]) => {
    if (fields.length === 0) return null;

    return (
      <section className="rounded-[20px] border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>
        <dl className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[minmax(140px,220px)_1fr] gap-1 sm:gap-4 py-2 border-b border-slate-100 last:border-0">
              <dt className="text-sm font-medium text-slate-500">{field.label}</dt>
              <dd className="text-sm font-semibold text-slate-900 break-words">
                {formatFieldValue(field, formData[field.id])}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    );
  };

  const renderStepContent = () => {
    switch (currentWizardStep.id) {
      case 'profile':
        return renderSectionFields(fieldsByStep.profile?? []);
      case 'award':
        return renderSectionFields(fieldsByStep.award?? []);
      case 'media':
        return renderSectionFields(fieldsByStep.media?? []);
      case 'review':
        return (
          <div className="space-y-5">
            {renderReviewSection('Basic Information', fieldsByStep.profile)}
            {renderReviewSection('Award Information', fieldsByStep.award)}
            {renderReviewSection('Uploaded Media', fieldsByStep.media)}

            {paymentConfig?.enabled && Number(paymentConfig?.fee || 0) > 0 && (
              <section className="rounded-[20px] border border-emerald-200 bg-emerald-50/50 p-5 sm:p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Payment</h3>
                <p className="text-sm text-slate-600 mb-4">
                  A submission fee is required before your entry is finalized.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[16px] bg-white border border-emerald-100 px-4 py-4">
                  <div>
                    <p className="text-sm text-slate-500">Amount due</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {paymentConfig.currency} {Number(paymentConfig.fee || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-sm text-slate-500">
                    Provider: {paymentConfig.provider}
                    {!paymentConfig.connected && (
                      <span className="block text-amber-600 mt-1">Payment provider not connected</span>
                    )}
                  </div>
                </div>
              </section>
            )}

            {showRequirements && requiredFields.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-[20px] bg-slate-50 p-5 sm:p-6 border border-slate-100"
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[16px] font-semibold text-slate-900">Before you submit</p>
                    <p className="text-[14px] text-slate-500 mt-1">Complete required items to avoid deadline risk.</p>
                  </div>
                  <button
                    onClick={dismissRequirements}
                    className="text-[14px] font-medium text-emerald-700 hover:text-emerald-900 bg-white px-4 py-2 rounded-full shadow-sm hover:shadow transition-all"
                    type="button"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(completedRequiredCount / requiredFields.length) * 100}%` }}
                  />
                </div>
                <ul className="space-y-2.5">
                  {requiredFields.slice(0, 6).map((field) => {
                    const filled = hasFieldValue(formData[field.id]);
                    return (
                      <li key={field.id} className="flex items-center gap-3 text-[14px]">
                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${filled ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-transparent'}`}>
                          {filled && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <span className={filled ? 'text-slate-900' : 'text-slate-400'}>{field.label}</span>
                      </li>
                    );
                  })}
                  {requiredFields.length > 6 && (
                    <li className="text-[14px] text-slate-400 pl-8">...and {requiredFields.length - 6} more</li>
                  )}
                </ul>
              </motion.div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50/30">
        <div className="text-center">
          <div className="w-16 h-16 rounded-[20px] bg-white shadow-lg flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
          <p className="text-slate-600 font-medium">Loading form...</p>
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/40 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md bg-white rounded-[32px] shadow-xl border border-slate-100 p-12"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Thank You!</h2>
            <p className="text-lg text-slate-600">{paymentMessage || 'Your form has been submitted successfully.'}</p>
          </motion.div>
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
    <div
      className="min-h-screen w-full font-sans selection:bg-emerald-100 selection:text-emerald-900 transition-colors duration-500 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pb-28 sm:pb-10"
      style={{ backgroundColor: theme.backgroundColor !== '#ffffff' ? theme.backgroundColor : undefined }}
    >
      <div className="w-full max-w-[1040px] mx-auto py-5 sm:py-8 px-4 sm:px-6 lg:px-8">

        {paymentState === 'cancelled' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 flex items-start gap-3 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-base tracking-tight">Payment Cancelled</p>
              <p className="text-sm opacity-80 mt-1">
                {paymentMessage || 'Your draft is safe. Submit again when you are ready to complete payment.'}
              </p>
            </div>
          </motion.div>
        )}

        <div className="bg-white rounded-[5px] shadow-xl border border-slate-100 overflow-hidden w-full">
          <div className="px-4 sm:px-8 lg:px-10 pt-6 sm:pt-8 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Submission</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900" style={{ fontFamily: theme.fontFamily }}>
              {formTitle}
            </h1>

          </div>

          {/* Desktop / tablet wizard progress */}
      {/* Premium Segmented Progress */}

<div className="px-6 sm:px-8 lg:px-10 py-6 border-b border-slate-100 bg-white">
  <div className="flex items-center justify-between mb-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Submission Progress
      </p>
      <p className="text-sm text-slate-500 mt-1">
        {Math.round(((wizardStepIndex + 1) / WIZARD_STEPS.length) * 100)}% Complete
      </p>
    </div>

    <div className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1">
      <span className="text-xs font-semibold text-emerald-700">
        Step {wizardStepIndex + 1}/{WIZARD_STEPS.length}
      </span>
    </div>
  </div>

  <div className="flex gap-2">
    {WIZARD_STEPS.map((_, idx) => {
      const completed = idx < wizardStepIndex;
      const active = idx === wizardStepIndex;

      return (
        <motion.div
          key={idx}
          layout
          className={`
            h-2.5 flex-1 rounded-full transition-all duration-500
            ${
              completed
                ? "bg-emerald-600"
                : active
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                : "bg-slate-200"
            }
          `}
        />
      );
    })}
  </div>
</div>



         <div className="px-4 sm:px-8 lg:px-10 py-6 sm:py-8 pb-32 sm:pb-8">
<div className="mb-12 sm:mb-14">
  <div className="flex items-center gap-3 mb-2">
    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
      <Sparkles className="w-5 h-5 text-emerald-600" />
    </div>

    <div>
      <h2 className="text-2xl font-bold text-slate-900">
        {SECTION_TITLES[currentWizardStep.id]}
      </h2>

      <p className="text-sm text-slate-500">
        {currentWizardStep.id === 'profile' &&
          'Provide your contact and profile information'}

        {currentWizardStep.id === 'award' &&
          'Tell us about your achievements and award submission'}

        {currentWizardStep.id === 'media' &&
          'Upload supporting documents and media'}

        {currentWizardStep.id === 'review' &&
          'Review your submission before finalizing'}
      </p>
    </div>
  </div>
</div>
            {/* {requiredFields.length > 0 && !isReviewStep && (
              <div className="mb-6 rounded-[16px] bg-slate-50 border border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                  <span>Overall progress</span>
                  <span>{completedRequiredCount}/{requiredFields.length} required</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(completedRequiredCount / requiredFields.length) * 100}%`,
                      backgroundColor: accentColor,
                    }}
                  />
                </div>
              </div>
            )} */}


            <AnimatePresence mode="wait">
              <motion.div
                key={currentWizardStep.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >


                {formFields.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
                    No questions found in this form.
                  </div>
                ) : (
                  renderStepContent()
                )}
              </motion.div>
            </AnimatePresence>

            

            <div className="hidden sm:flex mt-8 pt-6 border-t border-slate-100 items-center justify-between gap-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={wizardStepIndex === 0}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold ${wizardStepIndex === 0 ? 'opacity-40' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>

              <div className="text-[13px] text-slate-400 font-medium text-center">
                {saveState === 'saving' && 'Saving draft...'}
                {saveState === 'saved' && `Saved${lastSavedAt ? ` at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}
                {saveState === 'error' && <span className="text-rose-500">Save failed</span>}
              </div>

              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="rounded-full px-7 py-2.5 text-sm font-bold shadow-md min-w-[140px]"
                  style={{ backgroundColor: accentColor, color: theme.buttonTextColor || '#fff' }}
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
                  className="rounded-full px-7 py-2.5 text-sm font-bold shadow-md min-w-[120px]"
                  style={{ backgroundColor: accentColor, color: theme.buttonTextColor || '#fff' }}
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky footer actions */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-[999] border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-[1040px] mx-auto flex flex-col gap-2">
          <div className="text-[12px] text-slate-400 font-medium text-center">
            {saveState === 'saving' && 'Saving draft...'}
            {saveState === 'saved' && `Saved${lastSavedAt ? ` at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}
            {saveState === 'error' && <span className="text-rose-500">Save failed</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={wizardStepIndex === 0}
              className={`w-full rounded-[16px] py-3 text-sm font-semibold ${wizardStepIndex === 0 ? 'opacity-40' : 'text-slate-700 border border-slate-200'}`}
            >
              Back
            </Button>
            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full rounded-[16px] py-3 text-sm font-bold shadow-md"
                style={{ backgroundColor: accentColor, color: theme.buttonTextColor || '#fff' }}
              >
                {isSubmitting
                  ? 'Submitting...'
                  : paymentConfig?.enabled && Number(paymentConfig?.fee || 0) > 0
                    ? `Pay ${Number(paymentConfig.fee || 0).toFixed(2)}`
                    : 'Submit'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="w-full rounded-[16px] py-3 text-sm font-bold shadow-md"
                style={{ backgroundColor: accentColor, color: theme.buttonTextColor || '#fff' }}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};