import React from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, FilePlus, Share, Layers, Gavel, Trophy,
  Megaphone, UserCheck, Vote
} from 'lucide-react';
import { Button } from '../Button';

const StepCard = ({ number, icon: Icon, title, items, isLast }: any) => (
  <div className="flex gap-8 relative">
    {/* Timeline Line */}
    {!isLast && (
      <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 to-slate-100 hidden md:block"></div>
    )}
    
    <div className="hidden md:flex flex-col items-center shrink-0 relative z-10">
      <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30">
        {number}
      </div>
    </div>

    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className="flex-1 bg-white p-8 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/50 mb-12 relative overflow-hidden group hover:border-indigo-200 transition-colors"
    >
       <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
         <Icon className="w-32 h-32 text-indigo-600" />
       </div>

       <div className="flex items-center gap-4 mb-6">
         <div className="md:hidden w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-lg">
           {number}
         </div>
         <h3 className="text-2xl font-bold text-slate-900 font-display">{title}</h3>
       </div>

       <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {items.map((item: string, idx: number) => (
           <li key={idx} className="flex items-center text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-3"></div>
             {item}
           </li>
         ))}
       </ul>
    </motion.div>
  </div>
);

const AdvancedFlowCard = ({ icon: Icon, title, items }: any) => (
  <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 border border-white/10">
      <Icon className="w-6 h-6 text-indigo-300" />
    </div>
    <h3 className="text-xl font-bold mb-4">{title}</h3>
    <ul className="space-y-3">
      {items.map((item: string, i: number) => (
        <li key={i} className="text-slate-400 text-sm flex items-center">
          <span className="w-1 h-1 bg-indigo-400 rounded-full mr-2"></span>
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="pt-24 pb-20 bg-white min-h-screen">
      {/* Hero */}
      <section className="text-center max-w-4xl mx-auto px-4 mb-20">
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 font-display">How AwardX Works</h1>
        <p className="text-xl text-slate-600">
          A simple, end-to-end workflow for running any competition or award. <br/>
          From concept to ceremony in one platform.
        </p>
      </section>

      {/* Main Workflow Steps */}
      <section className="max-w-5xl mx-auto px-4 mb-32">
        <div className="space-y-4">
          <StepCard 
            number="1"
            icon={Settings}
            title="Create Your Program"
            items={[
              "Set title, description, & categories",
              "Customize branding & colors",
              "Add eligibility rules & T&Cs",
              "Configure timelines & deadlines",
              "Add entry fees (optional)"
            ]}
          />
          <StepCard 
            number="2"
            icon={FilePlus}
            title="Build the Submission Form"
            items={[
              "Drag & drop custom fields",
              "Enable media uploads (Video/Images)",
              "Add 'Work Details' & 'Personal Info' sections",
              "Preview form in real-time"
            ]}
          />
          <StepCard 
            number="3"
            icon={Share}
            title="Accept Submissions"
            items={[
              "Applicants submit with social login",
              "Auto-confirmation via Email/WhatsApp",
              "Real-time analytics dashboard",
              "Strict deadline enforcement"
            ]}
          />
          <StepCard 
            number="4"
            icon={Layers}
            title="Organize & Filter"
            items={[
              "Auto-tag entries based on content",
              "Group by category or status",
              "Filter by completion scores",
              "Bulk actions (Move, Update Status)"
            ]}
          />
          <StepCard 
            number="5"
            icon={Gavel}
            title="Multi-Round Judging"
            items={[
              "Assign judges to specific categories",
              "Blind or Open judging modes",
              "Scorecards + weighted criteria",
              "AI-powered insights & ranking"
            ]}
          />
          <StepCard 
            number="6"
            icon={Trophy}
            title="Shortlist & Announce"
            items={[
              "Publish winners instantly",
              "Generate public SEO gallery",
              "Auto-post to Instagram/Facebook",
              "Send WhatsApp winner announcements"
            ]}
            isLast={true}
          />
        </div>
      </section>

      {/* Advanced Flows */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-4">
           <div className="text-center mb-16">
             <h2 className="text-4xl font-bold text-slate-900 mb-4 font-display">Power Users? We got you.</h2>
             <p className="text-slate-500">Advanced flows for complex requirements.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <AdvancedFlowCard 
               icon={Megaphone}
               title="Automated Ad Campaigns"
               items={[
                 "Retarget incomplete submissions",
                 "Run awareness campaigns on Meta",
                 "Promote your event to lookalikes"
               ]}
             />
             <AdvancedFlowCard 
               icon={UserCheck}
               title="CRM Integration"
               items={[
                 "Track high-value leads",
                 "Manage email conversations",
                 "Auto-follow-up pipelines"
               ]}
             />
             <AdvancedFlowCard 
               icon={Vote}
               title="Public Voting"
               items={[
                 "Enable a dedicated voting round",
                 "IP restrictions & fraud detection",
                 "Show live vote leaderboards"
               ]}
             />
           </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center px-4">
         <h2 className="text-3xl font-bold text-slate-900 mb-8 font-display">Ready to streamline your workflow?</h2>
         <Button size="lg" className="px-12">Start Your First Program</Button>
      </section>
    </div>
  );
};