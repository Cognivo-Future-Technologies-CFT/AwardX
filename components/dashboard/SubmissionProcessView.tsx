
import React, { useState } from 'react';
import { Program } from '../../services/demoDb';
import { 
  FileText, Settings, LayoutTemplate, CreditCard, 
  CheckCircle2, Circle, ChevronRight, Plus, GripVertical, GripHorizontal
} from 'lucide-react';
import { Button } from '../Button';

interface SubmissionProcessViewProps {
  activeEvent: Program | null;
}

const steps = [
  { id: 'guidelines', label: 'Guidelines', icon: FileText, status: 'completed' },
  { id: 'submission', label: 'Submission', icon: Settings, status: 'completed' },
  { id: 'form', label: 'Form', icon: LayoutTemplate, status: 'completed' },
  { id: 'fees', label: 'Fees', icon: CreditCard, status: 'pending' },
];

export const SubmissionProcessView: React.FC<SubmissionProcessViewProps> = ({ activeEvent }) => {
  const [activeStep, setActiveStep] = useState('guidelines');

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
          <div className="space-y-6">
             <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6">General Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                   <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                      <input type="datetime-local" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" defaultValue="2024-09-01T09:00" />
                   </div>
                   <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Deadline</label>
                      <input type="datetime-local" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" defaultValue="2024-12-31T23:59" />
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                      <div>
                         <div className="font-bold text-slate-900 text-sm">Allow Editing</div>
                         <div className="text-xs text-slate-500">Applicants can edit submissions after submitting until deadline.</div>
                      </div>
                      <input type="checkbox" className="toggle accent-indigo-600" defaultChecked />
                   </div>
                   <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                      <div>
                         <div className="font-bold text-slate-900 text-sm">Multiple Entries</div>
                         <div className="text-xs text-slate-500">Allow users to submit more than one entry.</div>
                      </div>
                      <input type="checkbox" className="toggle accent-indigo-600" defaultChecked />
                   </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                   <Button>Update Settings</Button>
                </div>
             </div>
          </div>
        );
      case 'form':
        return (
           <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <div>
                    <h3 className="text-lg font-bold text-slate-900">Form Builder</h3>
                    <p className="text-slate-500 text-sm">Drag and drop fields to customize your submission form.</p>
                 </div>
                 <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Field</Button>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 min-h-[400px]">
                 {['Project Title', 'Description', 'Category Selection', 'Main Image Upload', 'Video Link'].map((field, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 cursor-move hover:border-indigo-300 hover:shadow-md transition-all group">
                       <GripVertical className="w-5 h-5 text-slate-300 group-hover:text-indigo-400" />
                       <div className="flex-1 font-medium text-slate-700">{field}</div>
                       <div className="flex items-center gap-4">
                          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded">Required</div>
                          <button className="text-slate-400 hover:text-indigo-600 text-sm font-medium">Edit</button>
                       </div>
                    </div>
                 ))}
                 <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:bg-white hover:border-indigo-300 cursor-pointer transition-all hover:text-indigo-500">
                    <Plus className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm font-medium">Drag fields here or click to add</span>
                 </div>
              </div>
           </div>
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
      {/* Dark Sidebar Navigation */}
      <div className="w-full lg:w-72 bg-[#1e293b] rounded-2xl shadow-xl overflow-hidden flex flex-col text-slate-300">
         <div className="p-6 border-b border-slate-700/50">
            <h2 className="font-bold text-white text-lg">Submission Process</h2>
            <p className="text-xs text-slate-400 mt-1">Configure the intake flow.</p>
         </div>
         <div className="flex-1 p-3 space-y-1 overflow-y-auto">
            {steps.map((step) => (
               <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                     activeStep === step.id 
                     ? 'bg-slate-800 text-white shadow-lg border border-slate-700' 
                     : 'hover:bg-slate-800/50 hover:text-white'
                  }`}
               >
                  <div className="flex items-center gap-3">
                     <GripHorizontal className="w-4 h-4 text-slate-600" />
                     <div className="flex items-center gap-3">
                        {step.label}
                     </div>
                  </div>
                  {step.status === 'completed' ? (
                     <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                  ) : (
                     <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                  )}
               </button>
            ))}
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-2">
         {renderContent()}
      </div>
    </div>
  );
};
