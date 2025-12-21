import React, { useState } from 'react';
import { Program } from '../../services/demoDb';
import { 
  FileText, Settings, LayoutTemplate, CreditCard, 
  CheckCircle2, Circle, ChevronRight, Plus, GripVertical, GripHorizontal,
  Type, Image as ImageIcon, Link2, List, Calendar, Mail, Phone, Move,
  UploadCloud, ShieldCheck, UserCircle, Layers, AlertCircle, FileCheck
} from 'lucide-react';
import { Button } from '../Button';
import { FormBuilderWithSelector } from './FormBuilderWithSelector';

interface SubmissionProcessViewProps {
  activeEvent: Program | null;
}

const steps = [
  { id: 'guidelines', label: 'Guidelines', icon: FileText, status: 'completed' },
  { id: 'submission', label: 'Submission Config', icon: Settings, status: 'active' },
  { id: 'form', label: 'Form Builder', icon: LayoutTemplate, status: 'pending' },
  { id: 'fees', label: 'Fees', icon: CreditCard, status: 'pending' },
];

const formFields = [
  { type: 'text', label: 'Short Text', icon: Type },
  { type: 'textarea', label: 'Long Text', icon: FileText },
  { type: 'file', label: 'File Upload', icon: ImageIcon },
  { type: 'link', label: 'URL / Link', icon: Link2 },
  { type: 'select', label: 'Dropdown', icon: List },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'email', label: 'Email', icon: Mail },
];

export const SubmissionProcessView: React.FC<SubmissionProcessViewProps> = ({ activeEvent }) => {
  const [activeStep, setActiveStep] = useState('submission');
  
  // Configuration State
  const [config, setConfig] = useState({
    project: {
        shortDesc: true,
        category: true,
        role: true,
        longDesc: false,
        keywords: true
    },
    uploads: {
        images: true,
        video: true,
        pdf: true,
        embeds: true,
        min: 1,
        max: 5
    },
    itemMetadata: {
        title: true,
        description: true,
        year: true,
        dimensions: false,
        price: false,
        medium: false
    },
    compliance: {
        terms: true,
        originality: true,
        copyright: false
    },
    profile: {
        social: true,
        portfolio: true
    },
    advanced: {
        cv: false,
        budget: false,
        references: false
    }
  });

  const toggleConfig = (section: keyof typeof config, key: string) => {
      setConfig(prev => ({
          ...prev,
          [section]: {
              ...prev[section],
              [key]: !((prev[section] as any)[key])
          }
      }));
  };

  const ConfigToggle = ({ 
      label, 
      description, 
      checked, 
      onChange 
  }: { label: string, description?: string, checked: boolean, onChange: () => void }) => (
    <div 
        onClick={onChange}
        className={`flex items-center justify-between p-4 border rounded-xl transition-all cursor-pointer ${
            checked 
            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
            : 'bg-white border-slate-200 hover:border-indigo-100 hover:bg-slate-50'
        }`}
    >
        <div className="pr-4">
            <div className={`font-bold text-sm ${checked ? 'text-indigo-900' : 'text-slate-900'}`}>{label}</div>
            {description && <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</div>}
        </div>
        <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
    </div>
  );

  const SectionHeader = ({ icon: Icon, title, description }: any) => (
      <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <Icon className="w-5 h-5" />
              </div>
              {title}
          </h3>
          {description && <p className="text-sm text-slate-500 ml-10">{description}</p>}
      </div>
  );

  const renderContent = () => {
    switch (activeStep) {
      case 'guidelines':
        return (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
               <h3 className="text-lg font-bold text-slate-900 mb-4">Submission Guidelines</h3>
               <p className="text-slate-500 text-sm mb-6">
                  Provide clear instructions for applicants. This content will appear on the public submission portal.
               </p>
               
               <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                  <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-2">
                     <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 font-bold text-xs">B</button>
                     <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 italic text-xs">I</button>
                     <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 underline text-xs">U</button>
                     <div className="w-px bg-slate-300 h-4 self-center mx-1"></div>
                     <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 text-xs">H1</button>
                     <button className="p-1.5 hover:bg-slate-200 rounded text-slate-600 text-xs">H2</button>
                  </div>
                  <textarea 
                    className="w-full p-4 h-64 outline-none text-slate-700 text-sm resize-none bg-white"
                    defaultValue={`# Submission Requirements\n\n1. All work must be original.\n2. Files must be high-resolution (300dpi).\n3. Provide a brief description (max 500 words).\n\nGood luck!`}
                  />
               </div>
               
               <div className="mt-6 flex justify-end">
                  <Button>Save Guidelines</Button>
               </div>
            </div>
          </div>
        );
      case 'submission':
        return (
          <div className="space-y-8 pb-20">
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Submission Configuration</h2>
                        <p className="text-slate-500 text-sm">Define the core metadata and assets required for each entry.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">Reset Defaults</Button>
                        <Button size="sm">Save Config</Button>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* 1. Project-Level Information */}
                    <section>
                        <SectionHeader icon={Layers} title="Project Information" description="High-level metadata describing the project as a whole." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
                            <ConfigToggle 
                                label="Project Title" 
                                description="Required for all submissions."
                                checked={true} 
                                onChange={() => {}} // Always required
                            />
                            <ConfigToggle 
                                label="Short Description" 
                                description="Brief overview (max 280 chars)."
                                checked={config.project.shortDesc} 
                                onChange={() => toggleConfig('project', 'shortDesc')}
                            />
                            <ConfigToggle 
                                label="Category / Discipline" 
                                description="Allow users to select a field."
                                checked={config.project.category} 
                                onChange={() => toggleConfig('project', 'category')}
                            />
                            <ConfigToggle 
                                label="Role of Applicant" 
                                description="e.g. Lead Designer, Director."
                                checked={config.project.role} 
                                onChange={() => toggleConfig('project', 'role')}
                            />
                            <ConfigToggle 
                                label="Long Description" 
                                description="Extended concept statement."
                                checked={config.project.longDesc} 
                                onChange={() => toggleConfig('project', 'longDesc')}
                            />
                            <ConfigToggle 
                                label="Keywords / Tags" 
                                description="Helps with jury discoverability."
                                checked={config.project.keywords} 
                                onChange={() => toggleConfig('project', 'keywords')}
                            />
                        </div>
                    </section>

                    {/* 2. Works / Uploads */}
                    <section>
                        <SectionHeader icon={UploadCloud} title="Works & Uploads" description="The core creative assets being submitted." />
                        <div className="pl-10 space-y-4">
                            <div className="flex gap-4 mb-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Min Items</label>
                                    <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={config.uploads.min} onChange={(e) => setConfig({...config, uploads: {...config.uploads, min: parseInt(e.target.value)}})} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Max Items</label>
                                    <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={config.uploads.max} onChange={(e) => setConfig({...config, uploads: {...config.uploads, max: parseInt(e.target.value)}})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ConfigToggle label="Allow Images" description="JPG, PNG, WEBP (Max 50MB)" checked={config.uploads.images} onChange={() => toggleConfig('uploads', 'images')} />
                                <ConfigToggle label="Allow Video Files" description="MP4, MOV (Max 500MB)" checked={config.uploads.video} onChange={() => toggleConfig('uploads', 'video')} />
                                <ConfigToggle label="Allow PDF Documents" description="For decks and reports." checked={config.uploads.pdf} onChange={() => toggleConfig('uploads', 'pdf')} />
                                <ConfigToggle label="External Embeds" description="YouTube, Vimeo, SoundCloud links." checked={config.uploads.embeds} onChange={() => toggleConfig('uploads', 'embeds')} />
                            </div>
                        </div>
                    </section>

                    {/* 3. Work-Level Metadata */}
                    <section>
                        <SectionHeader icon={List} title="Item Details" description="Metadata required for each individual uploaded item." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
                            <ConfigToggle label="Item Title & Caption" checked={config.itemMetadata.title} onChange={() => toggleConfig('itemMetadata', 'title')} />
                            <ConfigToggle label="Creation Year" checked={config.itemMetadata.year} onChange={() => toggleConfig('itemMetadata', 'year')} />
                            <ConfigToggle label="Dimensions & Material" description="Relevant for physical art/products." checked={config.itemMetadata.dimensions} onChange={() => toggleConfig('itemMetadata', 'dimensions')} />
                            <ConfigToggle label="Price / Value" description="For sales or insurance purposes." checked={config.itemMetadata.price} onChange={() => toggleConfig('itemMetadata', 'price')} />
                        </div>
                    </section>

                    {/* 4. Compliance */}
                    <section>
                        <SectionHeader icon={ShieldCheck} title="Eligibility & Compliance" description="Mandatory confirmations for valid entry." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
                            <ConfigToggle label="Originality Confirmation" description="I certify this is my own work." checked={config.compliance.originality} onChange={() => toggleConfig('compliance', 'originality')} />
                            <ConfigToggle label="Terms & Conditions" description="Agree to event rules." checked={config.compliance.terms} onChange={() => toggleConfig('compliance', 'terms')} />
                            <ConfigToggle label="Copyright Clearance" description="Permission for public display." checked={config.compliance.copyright} onChange={() => toggleConfig('compliance', 'copyright')} />
                        </div>
                    </section>

                    {/* 5. Applicant Profile */}
                    <section>
                        <SectionHeader icon={UserCircle} title="Applicant Profile" description="Additional details beyond account registration." />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-10">
                            <ConfigToggle label="Social Media Links" description="Instagram, LinkedIn, X." checked={config.profile.social} onChange={() => toggleConfig('profile', 'social')} />
                            <ConfigToggle label="Website / Portfolio" description="Link to external portfolio." checked={config.profile.portfolio} onChange={() => toggleConfig('profile', 'portfolio')} />
                        </div>
                    </section>

                    {/* 6. Advanced */}
                    <section>
                        <SectionHeader icon={FileCheck} title="Advanced Fields" description="Specific requirements for grants/residencies." />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-10">
                            <ConfigToggle label="CV / Resume" description="PDF Upload." checked={config.advanced.cv} onChange={() => toggleConfig('advanced', 'cv')} />
                            <ConfigToggle label="Budget Breakdown" description="Table for grant requests." checked={config.advanced.budget} onChange={() => toggleConfig('advanced', 'budget')} />
                            <ConfigToggle label="References" description="Contact info for referees." checked={config.advanced.references} onChange={() => toggleConfig('advanced', 'references')} />
                        </div>
                    </section>
                </div>
             </div>
          </div>
        );
      case 'form':
        return (
          <FormBuilderWithSelector
            activeEvent={activeEvent}
            onFormSelect={(formId) => {
              // Store selected form for submission process
              if (activeEvent) {
                localStorage.setItem(`selected_form_${activeEvent.id}`, formId);
              }
            }}
          />
        );
      case 'fees':
        return (
           <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center min-h-[400px] flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-sm">
                 <CreditCard className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Configure Entry Fees</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                 Monetize your awards program by charging an entry fee. We support Stripe, PayPal, and Razorpay with instant settlement.
              </p>
              <Button size="lg" className="shadow-lg shadow-indigo-200">Setup Payments</Button>
           </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-140px)]">
      {/* Light Sidebar Navigation */}
      <div className="w-full lg:w-72 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col shrink-0">
         <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-lg">Submission Process</h2>
            <p className="text-xs text-slate-500 mt-1">Configure the intake flow.</p>
         </div>
         <div className="flex-1 p-3 space-y-1 overflow-y-auto">
            {steps.map((step) => (
               <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                     activeStep === step.id 
                     ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' 
                     : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
               >
                  <div className="flex items-center gap-3">
                     <step.icon className={`w-4 h-4 ${activeStep === step.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                     <div className="flex items-center gap-3">
                        {step.label}
                     </div>
                  </div>
                  {step.status === 'completed' && activeStep !== step.id ? (
                     <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                  ) : (
                     <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                  )}
               </button>
            ))}
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-hide">
         {renderContent()}
      </div>
    </div>
  );
};