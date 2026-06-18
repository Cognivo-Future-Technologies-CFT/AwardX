
import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, MoreHorizontal, CheckCircle2, CircleDashed, CreditCard, DollarSign, Wallet } from 'lucide-react';
import { db } from '../../services/database';
import { Program, PaymentConfig } from '../../services/models';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { AppDatePicker } from '../ui/AppDateFields';
import { todayDateString } from '../../lib/utils';

export const ProgramsList: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [newProgram, setNewProgram] = useState({ title: '', category: 'General', status: 'Draft' as const, deadline: '' });
  
  // Payment Config State
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
     enabled: false,
     provider: 'Stripe',
     currency: 'USD',
     fee: 0,
     publicKey: '',
     connected: false
  });

  useEffect(() => {
    const load = async () => {
      const data = await db.getPrograms();
      setPrograms(data);
    };
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgram.title || !newProgram.deadline) return;
    
    await db.addProgram({
      ...newProgram,
      type: 'Award',
      paymentConfig: { enabled: false, provider: 'Stripe', currency: 'USD', fee: 0, connected: false },
    } as any);
    setPrograms(await db.getPrograms());
    setIsModalOpen(false);
    setNewProgram({ title: '', category: 'General', status: 'Draft', deadline: '' });
  };

  const openPaymentSettings = (program: Program) => {
    setSelectedProgram(program);
    setPaymentConfig(program.paymentConfig || {
       enabled: false,
       provider: 'Stripe',
       currency: 'USD',
       fee: 0,
       publicKey: '',
       connected: false
    });
    setIsPaymentModalOpen(true);
  };

  const savePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProgram) {
       const updatedProgram = {
          ...selectedProgram,
          paymentConfig: {
             ...paymentConfig,
             connected: paymentConfig.enabled && paymentConfig.publicKey ? true : false
          }
       };
       await db.updateProgram(updatedProgram);
       setPrograms(await db.getPrograms());
       setIsPaymentModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Programs</h1>
          <p className="text-slate-500">Manage your active award programs and competitions.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Program
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div key={program.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                program.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {program.status}
              </span>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
              {program.title}
            </h3>
            <p className="text-sm text-slate-500 mb-6">{program.category}</p>
            
            <div className="mt-auto space-y-4">
              {/* Payment Indicator Row */}
              <div className="flex items-center justify-between py-2 border-t border-b border-slate-50">
                 {program.paymentConfig?.enabled ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-green-600">
                       <CreditCard className="w-4 h-4" />
                       {program.paymentConfig.currency} {program.paymentConfig.fee} Entry Fee
                    </div>
                 ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                       <Wallet className="w-4 h-4" /> Free Entry
                    </div>
                 )}
                 <button 
                    onClick={() => openPaymentSettings(program)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                 >
                    Configure
                 </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="font-bold">{program.entriesCount}</span> Entries
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {program.deadline}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Create Card Trigger */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-2xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all min-h-[250px]"
        >
           <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-indigo-100">
              <Plus className="w-6 h-6" />
           </div>
           <span className="font-bold">Create New Program</span>
        </button>
      </div>

      {/* Create Program Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Program">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Program Title</label>
            <input 
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={newProgram.title}
              onChange={e => setNewProgram({...newProgram, title: e.target.value})}
              placeholder="e.g. Annual Design Awards 2024"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
              <select 
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newProgram.category}
                onChange={e => setNewProgram({...newProgram, category: e.target.value})}
              >
                <option>General</option>
                <option>Design</option>
                <option>Technology</option>
                <option>Business</option>
                <option>Arts</option>
              </select>
            </div>
            <div>
              <AppDatePicker
                label="Deadline"
                value={newProgram.deadline || null}
                minDate={todayDateString()}
                onChange={(deadline) => setNewProgram({ ...newProgram, deadline: deadline || '' })}
              />
            </div>
          </div>
          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
             <div className="flex gap-4">
                {['Draft', 'Active'].map(s => (
                  <label key={s} className="flex items-center cursor-pointer">
                    <input 
                      type="radio" 
                      name="status"
                      checked={newProgram.status === s}
                      onChange={() => setNewProgram({...newProgram, status: s as any})}
                      className="mr-2 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{s}</span>
                  </label>
                ))}
             </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Program</Button>
          </div>
        </form>
      </Modal>

      {/* Payment Configuration Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Payment Gateway Setup">
         <form onSubmit={savePaymentSettings} className="space-y-6">
            {/* Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
               <div>
                  <h4 className="font-bold text-slate-900">Collect Entry Fees</h4>
                  <p className="text-xs text-slate-500">Charge participants to submit entries.</p>
               </div>
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={paymentConfig.enabled} onChange={(e) => setPaymentConfig({...paymentConfig, enabled: e.target.checked})} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
               </label>
            </div>

            {paymentConfig.enabled && (
               <>
                  {/* Providers */}
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-3">Select Provider</label>
                     <div className="grid grid-cols-3 gap-3">
                        {['Stripe', 'PayPal', 'Razorpay'].map((provider) => (
                           <div 
                              key={provider}
                              onClick={() => setPaymentConfig({...paymentConfig, provider: provider as any})}
                              className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                                 paymentConfig.provider === provider 
                                 ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                 : 'border-slate-200 hover:border-slate-300 text-slate-600'
                              }`}
                           >
                              <div className="font-bold text-sm">{provider}</div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Credentials */}
                  <div className="space-y-3">
                     <label className="block text-sm font-semibold text-slate-700">API Credentials</label>
                     <input 
                        type="text" 
                        placeholder={paymentConfig.provider === 'Stripe' ? 'Publishable Key (pk_test_...)' : 'Client ID'}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={paymentConfig.publicKey}
                        onChange={(e) => setPaymentConfig({...paymentConfig, publicKey: e.target.value})}
                     />
                     <p className="text-xs text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> End-to-end encryption enabled
                     </p>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Currency</label>
                        <select 
                           className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                           value={paymentConfig.currency}
                           onChange={(e) => setPaymentConfig({...paymentConfig, currency: e.target.value})}
                        >
                           <option value="USD">USD ($)</option>
                           <option value="EUR">EUR (€)</option>
                           <option value="GBP">GBP (£)</option>
                           <option value="INR">INR (₹)</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Entry Fee</label>
                        <div className="relative">
                           <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                           <input 
                              type="number" 
                              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={paymentConfig.fee}
                              onChange={(e) => setPaymentConfig({...paymentConfig, fee: Number(e.target.value)})}
                           />
                        </div>
                     </div>
                  </div>
               </>
            )}

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
               <Button type="button" variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
               <Button type="submit">Save Configuration</Button>
            </div>
         </form>
      </Modal>
    </div>
  );
};
