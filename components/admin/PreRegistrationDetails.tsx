import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, User, Briefcase, Settings, Target, Info, MessageSquare } from 'lucide-react';
import { preRegistrationService, PreRegistrationData } from '../../services/preRegistration';


export const AdminPreRegistrationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PreRegistrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [status, setStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (id) fetchData(id);
  }, [id]);

  const fetchData = async (recordId: string) => {
    setIsLoading(true);
    try {
      const result = await preRegistrationService.getRegistrationById(recordId);
      setData(result);
      setStatus(result.status || 'New');
      setAdminNotes(result.admin_notes || '');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await preRegistrationService.updateRegistration(id, {
        status,
        admin_notes: adminNotes
      });
      // Optionally show a toast here
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <h2 className="text-xl font-semibold text-slate-800">Record not found</h2>
        <button onClick={() => navigate('/admin/pre-registrations')} className="text-indigo-600 font-medium">Go back</button>
      </div>
    );
  }

  const Section = ({ title, icon: Icon, children }: any) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <Icon className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
        {children}
      </div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string | boolean | null }) => {
    if (value === undefined || value === null || value === '') return null;
    
    let displayValue: React.ReactNode = String(value);
    if (typeof value === 'boolean') {
      displayValue = value ? (
        <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold uppercase">Yes</span>
      ) : (
        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase">No</span>
      );
    }

    return (
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</dt>
        <dd className="text-sm font-medium text-slate-900 whitespace-pre-wrap">{displayValue}</dd>
      </div>
    );
  };

  return (
    <div className="flex flex-col font-sans h-full">
      <div className="flex-1 w-full h-full p-2 pb-24">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/pre-registrations')} className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 shadow-sm">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{data.full_name}</h1>
              <p className="text-sm text-slate-500">{data.email} &middot; Applied {new Date(data.created_at || '').toLocaleDateString()}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Section title="Personal & Org Details" icon={User}>
              <Field label="Full Name" value={data.full_name} />
              <Field label="Email" value={data.email} />
              <Field label="Phone" value={data.phone} />
              <Field label="Country" value={data.country} />
              <Field label="Role" value={data.role} />
              <Field label="Organization" value={data.organization} />
              <Field label="Org Name (Extended)" value={data.org_name} />
              <Field label="Website" value={data.website} />
              <Field label="Industry" value={data.industry} />
              <Field label="Employees" value={data.employees_count} />
            </Section>

            <Section title="Qualification & Product Fit" icon={Target}>
              <Field label="User Type" value={data.user_type} />
              <Field label="Referral Source" value={data.referral_source} />
              <div className="md:col-span-2"><Field label="Interest Reason" value={data.interest_reason} /></div>
              
              <Field label="Current Tool" value={data.current_tool} />
              <Field label="Team Size" value={data.team_size} />
              <Field label="Est. Users" value={data.estimated_users} />
              <div className="md:col-span-2"><Field label="Use Case" value={data.use_case} /></div>
              <div className="md:col-span-2"><Field label="Biggest Challenge" value={data.biggest_challenge} /></div>
            </Section>

            <Section title="Award Program Details" icon={Briefcase}>
              <Field label="Currently Runs Awards?" value={data.runs_awards} />
              <Field label="Categories" value={data.award_categories} />
              <Field label="Est. Nominations" value={data.estimated_nominations} />
              <Field label="Est. Judges" value={data.estimated_judges} />
              <Field label="Expected Launch" value={data.expected_launch_month} />
              <Field label="Current Workflow" value={data.current_workflow} />
              <Field label="Pain Point" value={data.biggest_pain_point} />
            </Section>

            <Section title="System & Marketing Info" icon={Info}>
              <Field label="Join Beta" value={data.join_beta} />
              <Field label="Design Partner" value={data.design_partner} />
              <Field label="Pilot Customer" value={data.pilot_customer} />
              <Field label="Schedule Demo" value={data.schedule_demo} />
              <Field label="Lifetime Discount" value={data.lifetime_discount} />
              <Field label="Referral Code" value={data.referral_code} />
              <Field label="UTM Source" value={data.utm_source} />
              <Field label="UTM Campaign" value={data.utm_campaign} />
              <Field label="Browser" value={data.browser} />
              <Field label="Device" value={data.device_type} />
              <Field label="Updates Consent" value={data.updates_consent} />
              <Field label="Privacy Consent" value={data.privacy_consent} />
            </Section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-32">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="w-5 h-5 text-slate-500" />
                <h3 className="text-lg font-bold text-slate-900">Management</h3>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Lead Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Demo Scheduled">Demo Scheduled</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" /> Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={8}
                    placeholder="Add internal notes here..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
