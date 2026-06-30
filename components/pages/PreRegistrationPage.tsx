import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle2, ArrowRight, Building, Award, Code, Globe, User, ShieldCheck } from 'lucide-react';
import { preRegistrationService, PreRegistrationData } from '../../services/preRegistration';

const STEPS = [
  { id: 1, title: 'Personal Details', icon: User },
  { id: 2, title: 'Qualification', icon: ShieldCheck },
  { id: 3, title: 'Product Questions', icon: Code },
  { id: 4, title: 'Organization', icon: Building },
  { id: 5, title: 'Award Program', icon: Award },
  { id: 6, title: 'Early Access', icon: Globe },
  { id: 7, title: 'Consent', icon: CheckCircle2 }
]; // Marketing is hidden

export const PreRegistrationPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState<Partial<PreRegistrationData>>({
    full_name: '', email: '', phone: '', country: '', organization: '', role: '',
    interest_reason: '', referral_source: '', user_type: '',
    use_case: '', team_size: '', estimated_users: '', current_tool: '', biggest_challenge: '',
    org_name: '', website: '', industry: '', employees_count: '',
    runs_awards: false, award_categories: '', estimated_nominations: '', estimated_judges: '', expected_launch_month: '', current_workflow: '', biggest_pain_point: '',
    join_beta: true, lifetime_discount: true, pilot_customer: false, schedule_demo: false, design_partner: false,
    referral_code: '', utm_source: '', utm_medium: '', utm_campaign: '', device_type: '', browser: '',
    updates_consent: false, privacy_consent: false
  });

  useEffect(() => {
    // Detect marketing data automatically
    const searchParams = new URLSearchParams(window.location.search);
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('SamsungBrowser')) browser = 'Samsung Internet';
    else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
    else if (ua.includes('Trident')) browser = 'Internet Explorer';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';

    let deviceType = 'Desktop';
    if (/Mobi|Android/i.test(ua)) deviceType = 'Mobile';
    else if (/Tablet|iPad/i.test(ua)) deviceType = 'Tablet';

    setFormData(prev => ({
      ...prev,
      utm_source: searchParams.get('utm_source') || '',
      utm_medium: searchParams.get('utm_medium') || '',
      utm_campaign: searchParams.get('utm_campaign') || '',
      referral_code: searchParams.get('ref') || '',
      device_type: deviceType,
      browser: browser
    }));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    setErrorMsg('');
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.full_name) return 'Full Name is required.';
      if (!formData.email) return 'Email is required.';
      if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Invalid email format.';
    }
    if (currentStep === 7) {
      if (!formData.privacy_consent) return 'You must agree to the Privacy Policy to proceed.';
      if (!formData.updates_consent) return 'You must agree to receive updates to proceed.';
    }
    return '';
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 7));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep();
    if (err) {
      setErrorMsg(err);
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await preRegistrationService.createRegistration(formData as PreRegistrationData);
      setIsSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during submission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white max-w-lg w-full rounded-3xl p-10 shadow-2xl shadow-indigo-900/10 text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">You're on the list!</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Thank you for registering your interest in AwardX. We've recorded your preferences and will be in touch soon with updates and early access invitations.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
          >
            Return to Homepage
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Steps */}
        <div className="hidden md:flex flex-col w-64 shrink-0 pt-10">
          <h1 className="text-2xl font-bold text-slate-900 mb-8">Pre-Registration</h1>
          <div className="space-y-2">
            {STEPS.map((step) => {
              const active = currentStep === step.id;
              const completed = currentStep > step.id;
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                    active ? 'border-indigo-600 bg-indigo-600 text-white' :
                    completed ? 'border-emerald-500 bg-emerald-500 text-white' :
                    'border-slate-200 bg-transparent text-slate-400'
                  }`}>
                    {completed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-sm font-semibold ${
                    active ? 'text-indigo-900' :
                    completed ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col mt-4 md:mt-10">
          <div className="p-8 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {errorMsg && (
                  <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl font-medium border border-red-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {errorMsg}
                  </div>
                )}
                
                {/* Step 1: Personal Details */}
                {currentStep === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Personal Details</h2>
                      <p className="text-slate-500 mt-1">Let's start with your basic information.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                      <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Jane Doe" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="jane@example.com" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="+1 (555) 000-0000" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Country</label>
                        <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="United States" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                        <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                          <option value="">Select a role...</option>
                          <option value="Award Organizer">Award Organizer</option>
                          <option value="Company">Company</option>
                          <option value="University">University</option>
                          <option value="Government">Government</option>
                          <option value="NGO">NGO</option>
                          <option value="Event Organizer">Event Organizer</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Qualification Questions */}
                {currentStep === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Qualification</h2>
                      <p className="text-slate-500 mt-1">Tell us a bit about your background.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Which best describes you?</label>
                      <select name="user_type" value={formData.user_type} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="">Select an option...</option>
                        <option value="Student">Student</option>
                        <option value="Startup">Startup</option>
                        <option value="Company">Company</option>
                        <option value="Freelancer">Freelancer</option>
                        <option value="NGO">NGO</option>
                        <option value="Government">Government</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Why are you interested?</label>
                      <textarea name="interest_reason" value={formData.interest_reason} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="I'm looking for a better way to run my annual hackathon..."></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">How did you hear about us?</label>
                      <input type="text" name="referral_source" value={formData.referral_source} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Twitter, Google search, friend, etc." />
                    </div>
                  </div>
                )}

                {/* Step 3: Product Questions */}
                {currentStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Product Questions</h2>
                      <p className="text-slate-500 mt-1">Help us understand your use case.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">What will you use AwardX for?</label>
                      <textarea name="use_case" value={formData.use_case} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Estimated Team Size</label>
                        <input type="text" name="team_size" value={formData.team_size} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 5-10" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Estimated Users</label>
                        <input type="text" name="estimated_users" value={formData.estimated_users} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 500+" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Current Tool Used</label>
                      <input type="text" name="current_tool" value={formData.current_tool} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Google Forms" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Biggest Challenge Today</label>
                      <textarea name="biggest_challenge" value={formData.biggest_challenge} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                    </div>
                  </div>
                )}

                {/* Step 4: Organization Details */}
                {currentStep === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Organization Details</h2>
                      <p className="text-slate-500 mt-1">Information about your company or group.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Organization Name</label>
                      <input type="text" name="org_name" value={formData.org_name} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Website</label>
                      <input type="url" name="website" value={formData.website} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Industry</label>
                        <input type="text" name="industry" value={formData.industry} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Number of Employees</label>
                        <input type="text" name="employees_count" value={formData.employees_count} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Award Program */}
                {currentStep === 5 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Award Program</h2>
                      <p className="text-slate-500 mt-1">Details about the program you plan to run.</p>
                    </div>
                    
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input type="checkbox" name="runs_awards" checked={formData.runs_awards} onChange={handleChange} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                      <span className="font-semibold text-slate-800">I currently run awards</span>
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Number of Categories</label>
                        <input type="text" name="award_categories" value={formData.award_categories} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 10" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Expected Launch Month</label>
                        <input type="text" name="expected_launch_month" value={formData.expected_launch_month} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. October" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Estimated Nominations</label>
                        <input type="text" name="estimated_nominations" value={formData.estimated_nominations} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 1000" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Estimated Judges</label>
                        <input type="text" name="estimated_judges" value={formData.estimated_judges} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 50" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Current Workflow</label>
                      <select name="current_workflow" value={formData.current_workflow} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="">Select...</option>
                        <option value="Manual (Excel)">Manual (Excel)</option>
                        <option value="Google Forms">Google Forms</option>
                        <option value="Existing Software">Existing Software</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Biggest Pain Point</label>
                      <select name="biggest_pain_point" value={formData.biggest_pain_point} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="">Select...</option>
                        <option value="Managing Nominations">Managing Nominations</option>
                        <option value="Judge Assignment">Judge Assignment</option>
                        <option value="Scoring">Scoring</option>
                        <option value="Public Voting">Public Voting</option>
                        <option value="Communication">Communication</option>
                        <option value="Reporting">Reporting</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Step 6: Early Access */}
                {currentStep === 6 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Early Access Options</h2>
                      <p className="text-slate-500 mt-1">How would you like to interact with AwardX?</p>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="font-semibold text-slate-800 block">Join Beta Program</span>
                          <span className="text-xs text-slate-500">Get early access to unreleased features.</span>
                        </div>
                        <input type="checkbox" name="join_beta" checked={formData.join_beta} onChange={handleChange} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                      </label>
                      
                      <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="font-semibold text-slate-800 block">Lifetime Discount</span>
                          <span className="text-xs text-slate-500">Secure a discount for early adopters.</span>
                        </div>
                        <input type="checkbox" name="lifetime_discount" checked={formData.lifetime_discount} onChange={handleChange} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                      </label>

                      <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="font-semibold text-slate-800 block">Become Pilot Customer</span>
                          <span className="text-xs text-slate-500">Work closely with our team to launch your program.</span>
                        </div>
                        <input type="checkbox" name="pilot_customer" checked={formData.pilot_customer} onChange={handleChange} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                      </label>

                      <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="font-semibold text-slate-800 block">Schedule a Demo</span>
                          <span className="text-xs text-slate-500">Book a 1-on-1 walkthrough with a founder.</span>
                        </div>
                        <input type="checkbox" name="schedule_demo" checked={formData.schedule_demo} onChange={handleChange} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                      </label>

                      <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="font-semibold text-slate-800 block">Design Partner</span>
                          <span className="text-xs text-slate-500">Shape the future of the product with feedback.</span>
                        </div>
                        <input type="checkbox" name="design_partner" checked={formData.design_partner} onChange={handleChange} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                      </label>
                    </div>
                  </div>
                )}

                {/* Step 7: Consent */}
                {currentStep === 7 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">Almost Done</h2>
                      <p className="text-slate-500 mt-1">Review your consent preferences to finish.</p>
                    </div>
                    
                    <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input type="checkbox" name="updates_consent" checked={formData.updates_consent} onChange={handleChange} className="w-5 h-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div>
                        <span className="font-semibold text-slate-800 block">I agree to receive product updates. *</span>
                        <span className="text-sm text-slate-500 mt-1 block">We'll only send important announcements regarding AwardX launches and beta invites.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input type="checkbox" name="privacy_consent" checked={formData.privacy_consent} onChange={handleChange} className="w-5 h-5 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" />
                      <div>
                        <span className="font-semibold text-slate-800 block">I agree to the Privacy Policy and Terms. *</span>
                        <span className="text-sm text-slate-500 mt-1 block">By checking this, you agree to our data handling and terms of service.</span>
                      </div>
                    </label>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="border-t border-slate-100 p-6 bg-slate-50 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1 || isSubmitting}
              className={`px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-600 hover:bg-slate-200 bg-slate-100'}`}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {currentStep < 7 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-md transition-colors"
              >
                Next Step <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-md transition-colors disabled:opacity-70"
              >
                {isSubmitting ? 'Submitting...' : 'Complete Registration'}
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
