import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ChevronRight, ChevronLeft, Building2, User, Sparkles, ClipboardList, Rocket } from 'lucide-react';
import { Button } from './Button';
import { preRegistrationService } from '../services/preRegistration';
import { toast } from 'sonner';

interface PreRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreRegistrationModal: React.FC<PreRegistrationModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    // Personal Details
    fullName: '',
    email: '',
    phone: '',
    country: '',
    role: '',

    // Organization Details
    orgName: '',
    website: '',
    employeesCount: '',
    industry: '',

    // Award Program
    runsAwards: '', // Yes/No
    awardCategories: '',
    estimatedNominations: '',
    estimatedJudges: '',
    expectedLaunchMonth: '',

    // Current Workflow
    currentWorkflow: '',
    biggestPainPoint: '',

    // Early Access
    joinBeta: false,
    scheduleDemo: false,
    designPartner: false,

    // Marketing & Consent
    referralCode: '',
    consentUpdates: false,
    consentTerms: false,
  });

  const updateForm = (key: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 4));
  const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

  const handleClose = () => {
    if (!isSuccess && (formData.fullName || formData.email || formData.orgName)) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
    setTimeout(() => {
      setStep(1);
      setIsSuccess(false);
      setFormData({
        fullName: '', email: '', phone: '', country: '', role: '',
        orgName: '', website: '', employeesCount: '', industry: '',
        runsAwards: '', awardCategories: '', estimatedNominations: '', estimatedJudges: '', expectedLaunchMonth: '',
        currentWorkflow: '', biggestPainPoint: '',
        joinBeta: false, scheduleDemo: false, designPartner: false,
        referralCode: '', consentUpdates: false, consentTerms: false,
      });
    }, 300);
  };

  const getUTMParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
    };
  };

  const handleSubmit = async () => {
    if (!formData.consentTerms) {
      toast.error('You must agree to the Privacy Policy and Terms.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const utms = getUTMParams();
      const userAgent = window.navigator.userAgent;
      let deviceType = 'Desktop';
      if (/Mobi|Android/i.test(userAgent)) deviceType = 'Mobile';
      else if (/Tablet|iPad/i.test(userAgent)) deviceType = 'Tablet';

      await preRegistrationService.createRegistration({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        country: formData.country || undefined,
        role: formData.role || undefined,
        
        org_name: formData.orgName || undefined,
        website: formData.website || undefined,
        employees_count: formData.employeesCount || undefined,
        industry: formData.industry || undefined,

        runs_awards: formData.runsAwards === 'Yes',
        award_categories: formData.awardCategories || undefined,
        estimated_nominations: formData.estimatedNominations || undefined,
        estimated_judges: formData.estimatedJudges || undefined,
        expected_launch_month: formData.expectedLaunchMonth || undefined,

        current_workflow: formData.currentWorkflow || undefined,
        biggest_pain_point: formData.biggestPainPoint || undefined,

        join_beta: formData.joinBeta,
        schedule_demo: formData.scheduleDemo,
        design_partner: formData.designPartner,

        referral_code: formData.referralCode || undefined,
        utm_source: utms.source,
        utm_medium: utms.medium,
        utm_campaign: utms.campaign,
        device_type: deviceType,
        browser: userAgent,

        updates_consent: formData.consentUpdates,
        privacy_consent: formData.consentTerms,
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Registration failed:', err);
      toast.error(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-none px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">AwardX Early Access</h2>
                  <p className="text-sm text-slate-500 font-medium">Join our exclusive beta program</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 relative">
              {isSuccess ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                    className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6"
                  >
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 font-display tracking-tight">Registration Complete!</h3>
                  <p className="text-slate-600 mb-8 leading-relaxed">
                    Thank you for your interest in AwardX. We've received your details and will be in touch shortly regarding early access and our beta program.
                  </p>
                  <Button onClick={handleClose} size="lg" className="px-8">
                    Close Window
                  </Button>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  {/* Progress Indicator */}
                  <div className="flex items-center justify-center mb-10 relative">
                    <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-100 -z-10 -translate-y-1/2"></div>
                    
                    <div className="flex justify-between w-full">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 relative bg-white px-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                            step > i ? 'bg-indigo-600 text-white' : 
                            step === i ? 'bg-indigo-100 text-indigo-700 ring-4 ring-indigo-50' : 
                            'bg-slate-100 text-slate-400'
                          }`}>
                            {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
                          </div>
                          <span className={`text-[11px] font-semibold uppercase tracking-wider absolute -bottom-6 whitespace-nowrap ${
                            step >= i ? 'text-indigo-900' : 'text-slate-400'
                          }`}>
                            {i === 1 ? 'Details' : i === 2 ? 'Program' : i === 3 ? 'Workflow' : 'Consent'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Form Steps */}
                  <div className="mt-16 pb-8">
                    {step === 1 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div>
                          <div className="flex items-center gap-3 text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-3">
                            <User className="w-5 h-5 text-indigo-500" /> Personal Details
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
                              <input type="text" required value={formData.fullName} onChange={e => updateForm('fullName', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" placeholder="John Doe" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address *</label>
                              <input type="email" required value={formData.email} onChange={e => updateForm('email', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" placeholder="john@example.com" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
                              <input type="tel" value={formData.phone} onChange={e => updateForm('phone', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" placeholder="+1 (555) 000-0000" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Country</label>
                              <input type="text" value={formData.country} onChange={e => updateForm('country', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" placeholder="United States" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your Role</label>
                              <select value={formData.role} onChange={e => updateForm('role', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all appearance-none">
                                <option value="">Select your role...</option>
                                <option value="Award Organizer">Award Organizer</option>
                                <option value="Company">Company</option>
                                <option value="University">University</option>
                                <option value="Government">Government</option>
                                <option value="NGO">NGO</option>
                                <option value="Event Organizer">Event Organizer</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-3 text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-3">
                            <Building2 className="w-5 h-5 text-indigo-500" /> Organization Details
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Organization Name *</label>
                              <input type="text" required value={formData.orgName} onChange={e => updateForm('orgName', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" placeholder="Acme Corp" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Website</label>
                              <input type="url" value={formData.website} onChange={e => updateForm('website', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" placeholder="https://example.com" />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Number of Employees</label>
                              <select value={formData.employeesCount} onChange={e => updateForm('employeesCount', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all appearance-none">
                                <option value="">Select size...</option>
                                <option value="1-10">1-10</option>
                                <option value="11-50">11-50</option>
                                <option value="51-200">51-200</option>
                                <option value="201-500">201-500</option>
                                <option value="500+">500+</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Industry</label>
                              <input type="text" value={formData.industry} onChange={e => updateForm('industry', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" placeholder="e.g. Technology, Education" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {step === 2 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="flex items-center gap-3 text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-3">
                          <Rocket className="w-5 h-5 text-indigo-500" /> Award Program
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Do you currently run awards?</label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="runsAwards" value="Yes" checked={formData.runsAwards === 'Yes'} onChange={e => updateForm('runsAwards', e.target.value)} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                                <span className="text-slate-700">Yes</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="runsAwards" value="No" checked={formData.runsAwards === 'No'} onChange={e => updateForm('runsAwards', e.target.value)} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                                <span className="text-slate-700">No</span>
                              </label>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Number of award categories</label>
                            <input type="number" min="0" value={formData.awardCategories} onChange={e => updateForm('awardCategories', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" placeholder="e.g. 10" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estimated nominations</label>
                            <input type="number" min="0" value={formData.estimatedNominations} onChange={e => updateForm('estimatedNominations', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" placeholder="e.g. 500" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estimated judges</label>
                            <input type="number" min="0" value={formData.estimatedJudges} onChange={e => updateForm('estimatedJudges', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" placeholder="e.g. 20" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expected launch month</label>
                            <select value={formData.expectedLaunchMonth} onChange={e => updateForm('expectedLaunchMonth', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all appearance-none">
                              <option value="">Select month...</option>
                              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {step === 3 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="flex items-center gap-3 text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-3">
                          <ClipboardList className="w-5 h-5 text-indigo-500" /> Current Workflow & Challenges
                        </div>
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-3">Current Workflow</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {['Manual (Excel)', 'Google Forms', 'Existing software', 'Other'].map(wf => (
                                <label key={wf} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.currentWorkflow === wf ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                                  <input type="radio" name="currentWorkflow" value={wf} checked={formData.currentWorkflow === wf} onChange={e => updateForm('currentWorkflow', e.target.value)} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                                  <span className="font-medium">{wf}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-3">Biggest Pain Point</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {['Managing nominations', 'Judge assignment', 'Scoring', 'Public voting', 'Communication', 'Reporting'].map(pp => (
                                <label key={pp} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.biggestPainPoint === pp ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                                  <input type="radio" name="biggestPainPoint" value={pp} checked={formData.biggestPainPoint === pp} onChange={e => updateForm('biggestPainPoint', e.target.value)} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                                  <span className="font-medium">{pp}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {step === 4 && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                        <div>
                          <div className="flex items-center gap-3 text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-3">
                            <Sparkles className="w-5 h-5 text-indigo-500" /> Early Access & Consent
                          </div>
                          
                          <div className="space-y-4 mb-8">
                            <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-indigo-300 transition-colors">
                              <div className="pt-1"><input type="checkbox" checked={formData.joinBeta} onChange={e => updateForm('joinBeta', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></div>
                              <div><div className="font-bold text-slate-900">Join Beta Program</div><div className="text-sm text-slate-500 mt-1">Get early access to the platform before the public release.</div></div>
                            </label>
                            <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-indigo-300 transition-colors">
                              <div className="pt-1"><input type="checkbox" checked={formData.scheduleDemo} onChange={e => updateForm('scheduleDemo', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></div>
                              <div><div className="font-bold text-slate-900">Schedule Demo</div><div className="text-sm text-slate-500 mt-1">We'll reach out to schedule a personalized walkthrough.</div></div>
                            </label>
                            <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-indigo-300 transition-colors">
                              <div className="pt-1"><input type="checkbox" checked={formData.designPartner} onChange={e => updateForm('designPartner', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></div>
                              <div><div className="font-bold text-slate-900">Become Design Partner</div><div className="text-sm text-slate-500 mt-1">Help shape the future of AwardX and get lifetime benefits.</div></div>
                            </label>
                          </div>
                          
                          <div className="space-y-4">
                            <label className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                              <div className="pt-1"><input type="checkbox" checked={formData.consentUpdates} onChange={e => updateForm('consentUpdates', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></div>
                              <div><div className="font-bold text-slate-900">I agree to receive product updates.</div></div>
                            </label>
                            <label className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                              <div className="pt-1"><input type="checkbox" required checked={formData.consentTerms} onChange={e => updateForm('consentTerms', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /></div>
                              <div><div className="font-bold text-slate-900">I agree to the Privacy Policy and Terms. *</div></div>
                            </label>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {!isSuccess && (
              <div className="flex-none px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  {step > 1 && (
                    <Button variant="secondary" onClick={handlePrev} disabled={isSubmitting} className="gap-2">
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  {step < 4 ? (
                    <Button onClick={handleNext} disabled={!formData.fullName || !formData.email || !formData.orgName} className="gap-2">
                      Continue <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={isSubmitting || !formData.consentTerms} variant="primary">
                      {isSubmitting ? 'Submitting...' : 'Complete Registration'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
