import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, HelpCircle, ArrowRight, Zap } from 'lucide-react';
import { Button } from '../Button';

const ComparisonRow = ({ feature, starter, pro, enterprise }: any) => (
  <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
    <td className="p-4 py-6 text-sm font-medium text-slate-700 w-1/4">{feature}</td>
    <td className="p-4 py-6 text-center text-sm text-slate-500 w-1/4">
      {typeof starter === 'boolean' ? (starter ? <Check className="w-5 h-5 mx-auto text-green-500"/> : <X className="w-5 h-5 mx-auto text-slate-300"/>) : starter}
    </td>
    <td className="p-4 py-6 text-center text-sm font-bold text-indigo-600 w-1/4 bg-indigo-50/10">
      {typeof pro === 'boolean' ? (pro ? <Check className="w-5 h-5 mx-auto text-indigo-600"/> : <X className="w-5 h-5 mx-auto text-slate-300"/>) : pro}
    </td>
    <td className="p-4 py-6 text-center text-sm text-slate-500 w-1/4">
      {typeof enterprise === 'boolean' ? (enterprise ? <Check className="w-5 h-5 mx-auto text-green-500"/> : <X className="w-5 h-5 mx-auto text-slate-300"/>) : enterprise}
    </td>
  </tr>
);

export const PricingPage: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <div className="pt-24 pb-20 bg-slate-50 min-h-screen">
      
      {/* Hero */}
      <section className="text-center max-w-4xl mx-auto px-4 mb-16">
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 font-display">Flexible Pricing for Every Program</h1>
        <p className="text-xl text-slate-600 mb-8">
          Only pay for what you need. No hidden charges.
        </p>

        <div className="flex items-center justify-center space-x-4">
            <span className={`text-sm ${!isAnnual ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="w-16 h-8 bg-slate-200 rounded-full relative transition-colors focus:outline-none shadow-inner"
            >
              <div className={`absolute top-1 w-6 h-6 bg-white shadow-md rounded-full transition-all duration-300 ${isAnnual ? 'left-9' : 'left-1'}`}></div>
            </button>
            <span className={`text-sm ${isAnnual ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>Annual <span className="text-green-600 text-xs bg-green-100 px-2 py-0.5 rounded-full ml-1 font-bold">Save 20%</span></span>
        </div>
      </section>

      {/* Tiers */}
      <section className="max-w-7xl mx-auto px-4 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg flex flex-col hover:-translate-y-1 transition-transform">
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">Starter</h3>
            <p className="text-sm text-slate-500 mb-6 h-10">Perfect for small competitions and local awards.</p>
            <div className="text-4xl font-extrabold text-slate-900 mb-8">
               {isAnnual ? '$79' : '$99'}<span className="text-base font-normal text-slate-500">/mo</span>
            </div>
            <Button variant="outline" className="w-full mb-8">Start Free Trial</Button>
            <ul className="space-y-3 mb-8 flex-1">
               {["Up to 250 entries", "Basic Form Builder", "1 Category", "3 Judges", "Email Support", "Standard Gallery"].map((f,i) => (
                 <li key={i} className="flex items-center text-sm text-slate-600">
                    <Check className="w-4 h-4 text-green-500 mr-3" /> {f}
                 </li>
               ))}
               <li className="flex items-center text-sm text-slate-400">
                    <X className="w-4 h-4 text-slate-300 mr-3" /> No CRM
               </li>
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col relative scale-105 z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-4 py-1 rounded-b-lg shadow-lg">
                MOST POPULAR
            </div>
            <h3 className="text-xl font-bold text-white mb-2 mt-4 font-display">Growth</h3>
            <p className="text-sm text-slate-400 mb-6 h-10">For growing organizations needing automation.</p>
            <div className="text-4xl font-extrabold text-white mb-8">
               {isAnnual ? '$239' : '$299'}<span className="text-base font-normal text-slate-500">/mo</span>
            </div>
            <Button variant="white" className="w-full mb-8">Start Free Trial</Button>
            <ul className="space-y-3 mb-8 flex-1">
               {["Unlimited Entries", "Unlimited Judges", "WhatsApp Campaigns", "Multi-round Judging", "CRM System", "Remove AwardX Branding", "Priority Support"].map((f,i) => (
                 <li key={i} className="flex items-center text-sm text-slate-300">
                    <Check className="w-4 h-4 text-indigo-400 mr-3" /> {f}
                 </li>
               ))}
            </ul>
          </div>

          {/* Enterprise */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg flex flex-col hover:-translate-y-1 transition-transform">
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">Enterprise</h3>
            <p className="text-sm text-slate-500 mb-6 h-10">Full control for large-scale global programs.</p>
            <div className="text-4xl font-extrabold text-slate-900 mb-8">
               Custom
            </div>
            <Button variant="outline" className="w-full mb-8">Contact Sales</Button>
            <ul className="space-y-3 mb-8 flex-1">
               {["Everything in Pro", "White-label Solution", "Custom API Access", "Dedicated Success Manager", "SLA & Contract Billing", "Custom Reporting", "AI Judging Suite"].map((f,i) => (
                 <li key={i} className="flex items-center text-sm text-slate-600">
                    <Check className="w-4 h-4 text-green-500 mr-3" /> {f}
                 </li>
               ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="max-w-5xl mx-auto px-4 mb-32">
        <h2 className="text-2xl font-bold mb-8 text-center font-display">Compare Plans</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                 <th className="p-4 text-left text-slate-500 font-medium">Features</th>
                 <th className="p-4 text-center text-slate-900 font-bold">Starter</th>
                 <th className="p-4 text-center text-indigo-600 font-bold">Growth</th>
                 <th className="p-4 text-center text-slate-900 font-bold">Enterprise</th>
              </tr>
            </thead>
            <tbody>
               <ComparisonRow feature="Submissions" starter="250" pro="Unlimited" enterprise="Unlimited" />
               <ComparisonRow feature="Categories" starter="1" pro="Unlimited" enterprise="Unlimited" />
               <ComparisonRow feature="Judging Rounds" starter="1" pro="Unlimited" enterprise="Unlimited" />
               <ComparisonRow feature="CRM" starter={false} pro={true} enterprise={true} />
               <ComparisonRow feature="WhatsApp Automation" starter={false} pro={true} enterprise={true} />
               <ComparisonRow feature="AI Judging" starter={false} pro="Add-on" enterprise={true} />
               <ComparisonRow feature="Team Members" starter="1" pro="5" enterprise="Unlimited" />
               <ComparisonRow feature="Custom Domain" starter={false} pro={false} enterprise={true} />
               <ComparisonRow feature="API Access" starter={false} pro={false} enterprise={true} />
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 mb-32">
        <h2 className="text-3xl font-bold text-center mb-12 font-display">Frequently Asked Questions</h2>
        <div className="space-y-6">
           {[
             { q: "What counts as a submission?", a: "A submission is a single entry record. Drafts do not count towards your limit." },
             { q: "Do you take transaction fees?", a: "We charge 2% on entry fees for Starter/Growth plans. 0% for Enterprise." },
             { q: "Can I upgrade later?", a: "Yes, you can upgrade or downgrade your plan at any time." },
             { q: "Do judges need accounts?", a: "Yes, but judge accounts are free and do not count towards your team member limits." },
           ].map((faq, i) => (
             <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="font-bold text-slate-900 mb-2 flex items-center">
                  <HelpCircle className="w-5 h-5 text-indigo-500 mr-2" />
                  {faq.q}
                </h4>
                <p className="text-slate-600 pl-7 text-sm leading-relaxed">{faq.a}</p>
             </div>
           ))}
        </div>
      </section>

      {/* Enterprise Banner */}
      <section className="px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-12 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
           <h2 className="text-3xl font-bold mb-4 relative z-10 font-display">Need custom pricing?</h2>
           <p className="text-slate-300 mb-8 relative z-10">We offer volume discounts for educational institutions and non-profits.</p>
           <Button variant="white" className="relative z-10">Contact Enterprise Sales</Button>
        </div>
      </section>

    </div>
  );
};