import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Gavel, Zap, Users, Share2, Globe, CreditCard, Bot, Shield, 
  CheckCircle2, XCircle, ArrowRight 
} from 'lucide-react';
import { Button } from '../Button';

const FeatureBlock = ({ icon: Icon, title, items, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-indigo-100 transition-all duration-300 group overflow-hidden relative"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-5 rounded-bl-[100px] pointer-events-none group-hover:opacity-10 transition-opacity`}></div>
    
    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-6 text-white shadow-lg`}>
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-6 font-display">{title}</h3>
    <ul className="space-y-3">
      {items.map((item: string, idx: number) => (
        <li key={idx} className="flex items-start text-sm text-slate-600">
          <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </motion.div>
);

const AbstractMockup = () => (
  <div className="w-full h-full bg-slate-900 rounded-xl p-4 overflow-hidden relative border border-slate-700 shadow-2xl">
     <div className="flex gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
     </div>
     <div className="flex gap-4 h-full">
        <div className="w-16 h-full bg-slate-800/50 rounded-lg flex flex-col gap-2 p-2">
           <div className="w-full h-8 bg-indigo-500 rounded mb-2"></div>
           {[1,2,3,4].map(i => <div key={i} className="w-full h-8 bg-slate-800 rounded"></div>)}
        </div>
        <div className="flex-1 h-full bg-slate-800/30 rounded-lg p-4">
           <div className="flex justify-between mb-4">
              <div className="w-32 h-6 bg-slate-700 rounded"></div>
              <div className="w-24 h-6 bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center rounded border border-indigo-500/30">Active Round</div>
           </div>
           <div className="grid grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="h-24 bg-slate-700/50 rounded-lg border border-slate-700"></div>
              ))}
           </div>
        </div>
     </div>
  </div>
);

export const FeaturesPage: React.FC = () => {
  return (
    <div className="pt-24 pb-20 bg-slate-50 min-h-screen">
      {/* Hero */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-24 text-center">
         <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="relative z-10 py-16"
         >
           <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight leading-tight font-display">
             Everything You Need to Run <br/>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500">Powerful Awards</span>
           </h1>
           <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
             AwardX brings submissions, judging, CRM, social campaigns, and automation into one unified platform. Stop juggling spreadsheets.
           </p>
           <div className="flex flex-col sm:flex-row justify-center gap-4">
             <Button size="lg" className="shadow-xl shadow-indigo-500/30">Try AwardX Free</Button>
             <Button variant="outline" size="lg" className="bg-white">Book a Demo</Button>
           </div>
         </motion.div>

         {/* Abstract Dashboard Mockup */}
         <motion.div 
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2, duration: 0.8 }}
           className="relative max-w-5xl mx-auto h-[400px] md:h-[600px] mt-10"
         >
           <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10"></div>
           <AbstractMockup />
         </motion.div>
      </section>

      {/* Feature Categories */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureBlock 
            icon={FileText} 
            title="Submission Management" 
            color="from-blue-500 to-indigo-500"
            items={[
              "Custom form builder with drag & drop",
              "File uploads (images, video, PDFs, ZIP)",
              "Multi-category submissions",
              "Auto-save drafts & Deadline protection",
              "Real-time applicant dashboards"
            ]}
          />
          <FeatureBlock 
            icon={Gavel} 
            title="Multi-Round Judging" 
            color="from-purple-500 to-pink-500"
            items={[
              "Customizable scorecards & criteria",
              "Blind/open judging modes",
              "Weighted scoring algorithms",
              "Conflict-of-interest safeguards",
              "Judge activity analytics & comments"
            ]}
          />
          <FeatureBlock 
            icon={Zap} 
            title="Workflow Automation" 
            color="from-amber-400 to-orange-500"
            items={[
              "Auto-reminders for entrants & judges",
              "Trigger-based email/WhatsApp messages",
              "Automated shortlisting rules",
              "Auto-generated PDF reports",
              "Status-based webhooks"
            ]}
          />
          <FeatureBlock 
            icon={Users} 
            title="CRM System" 
            color="from-emerald-400 to-green-600"
            items={[
              "Unified contact management",
              "Applicant/judge/creator detailed profiles",
              "Tagging, segmentation & filters",
              "Internal notes & communication logs",
              "Automated follow-up pipelines"
            ]}
          />
          <FeatureBlock 
            icon={Share2} 
            title="Social & Ad Campaigns" 
            color="from-indigo-400 to-cyan-500"
            items={[
              "WhatsApp automated campaigns",
              "Meta Ads (FB/IG) integration",
              "Auto-post winners to socials",
              "Scheduled multi-platform announcements",
              "Referral tracking"
            ]}
          />
          <FeatureBlock 
            icon={Globe} 
            title="Public Display" 
            color="from-rose-400 to-red-500"
            items={[
              "Public winner galleries",
              "Verified public voting systems",
              "SEO-optimized entry pages",
              "Creator portfolios",
              "Custom domain support"
            ]}
          />
          <FeatureBlock 
            icon={CreditCard} 
            title="Payment & Monetization" 
            color="from-slate-700 to-slate-900"
            items={[
              "Global entry fee collection",
              "Coupon code management",
              "Early-bird pricing tiers",
              "Automated invoices & receipts",
              "Revenue analytics dashboard"
            ]}
          />
          <FeatureBlock 
            icon={Bot} 
            title="AI-Powered Tools" 
            color="from-fuchsia-500 to-purple-600"
            items={[
              "AI judging assistant & summaries",
              "Auto-category prediction for entries",
              "Duplicate/suspicious entry detection",
              "Content moderation AI",
              "Plagiarism checker"
            ]}
          />
          <FeatureBlock 
            icon={Shield} 
            title="Security & Admin" 
            color="from-blue-600 to-blue-800"
            items={[
              "Granular role-based access control",
              "Audit logs for every action",
              "Encrypted storage (SOC2 Compliant)",
              "Two-factor authentication",
              "Hourly backups & recovery"
            ]}
          />
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4 font-display">Why AwardX Wins</h2>
          <p className="text-slate-500">See how we stack up against the competition.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="p-6 text-slate-500 font-medium">Feature</th>
                  <th className="p-6 text-indigo-600 font-bold text-lg bg-indigo-50/50">AwardX</th>
                  <th className="p-6 text-slate-600 font-semibold">Zealous</th>
                  <th className="p-6 text-slate-600 font-semibold">AwardForce</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Automated WhatsApp", nomify: true, zealous: false, awardforce: false },
                  { feature: "Built-in CRM", nomify: true, zealous: false, awardforce: false },
                  { feature: "Ads Automation", nomify: true, zealous: false, awardforce: false },
                  { feature: "AI Judging Assistant", nomify: true, zealous: false, awardforce: "Limited" },
                  { feature: "Multi-round Judging", nomify: true, zealous: true, awardforce: true },
                  { feature: "Submission Management", nomify: true, zealous: true, awardforce: true },
                  { feature: "Verified Public Voting", nomify: true, zealous: true, awardforce: true },
                  { feature: "Revenue Dashboard", nomify: true, zealous: "Basic", awardforce: true },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-6 font-medium text-slate-700">{row.feature}</td>
                    <td className="p-6 bg-indigo-50/30">
                      <div className="flex items-center text-indigo-600 font-bold">
                        <CheckCircle2 className="w-5 h-5 mr-2" /> Yes
                      </div>
                    </td>
                    <td className="p-6 text-slate-500">
                      {row.zealous === true ? <CheckCircle2 className="w-5 h-5" /> : 
                       row.zealous === false ? <XCircle className="w-5 h-5 text-slate-300" /> : row.zealous}
                    </td>
                    <td className="p-6 text-slate-500">
                      {row.awardforce === true ? <CheckCircle2 className="w-5 h-5" /> : 
                       row.awardforce === false ? <XCircle className="w-5 h-5 text-slate-300" /> : row.awardforce}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 text-center">
        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 max-w-6xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-900/50 to-purple-900/50 opacity-50"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
              Run your competition in half the time,<br/> with twice the results.
            </h2>
            <div className="flex justify-center gap-4 mt-8">
               <Button variant="white" size="lg">Try AwardX Now</Button>
               <Button variant="outline" size="lg" className="border-slate-600 text-slate-300 hover:bg-slate-800">Watch Demo</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};