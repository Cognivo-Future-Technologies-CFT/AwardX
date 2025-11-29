import React from 'react';
import { motion } from 'framer-motion';
import { Testimonials } from '../Testimonials';
import { Button } from '../Button';
import { Film, GraduationCap, Building2, Palette, Heart } from 'lucide-react';

const CaseStudy = ({ title, industry, description, stats, quote, author, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row group"
  >
    <div className={`lg:w-2/5 bg-gradient-to-br ${color} p-10 text-white flex flex-col justify-between relative overflow-hidden`}>
       <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>
       <div>
         <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold tracking-widest uppercase mb-4">{industry}</span>
         <h3 className="text-3xl font-bold font-display leading-tight">{title}</h3>
       </div>
       <div className="mt-12 space-y-4">
          {stats.map((stat: any, i: number) => (
            <div key={i}>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm opacity-80">{stat.label}</div>
            </div>
          ))}
       </div>
    </div>
    
    <div className="lg:w-3/5 p-10 flex flex-col justify-between bg-slate-50/50">
       <div>
         <h4 className="text-lg font-bold text-slate-900 mb-4">The Challenge</h4>
         <p className="text-slate-600 leading-relaxed mb-8">{description}</p>
         
         <div className="bg-white p-6 rounded-2xl border border-indigo-50 shadow-sm relative">
            <span className="text-6xl absolute top-4 left-4 text-indigo-100 font-serif leading-none select-none">"</span>
            <p className="text-slate-700 italic relative z-10 pl-4">{quote}</p>
            <div className="mt-4 flex items-center pl-4">
               <div className="w-8 h-8 bg-slate-200 rounded-full mr-3"></div>
               <div className="text-sm font-bold text-slate-900">{author}</div>
            </div>
         </div>
       </div>
       
       <div className="mt-8 flex justify-end">
         <Button variant="outline" size="sm">Read Full Story</Button>
       </div>
    </div>
  </motion.div>
);

const UseCaseBlock = ({ icon: Icon, title, desc }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-center">
        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
            <Icon className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-slate-900 mb-2">{title}</h4>
        <p className="text-sm text-slate-500">{desc}</p>
    </div>
);

export const StoriesPage: React.FC = () => {
  return (
    <div className="pt-24 pb-20 bg-slate-50 min-h-screen">
      
      {/* Hero */}
      <section className="text-center max-w-4xl mx-auto px-4 mb-20">
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 font-display">Stories from Our Community</h1>
        <p className="text-xl text-slate-600">
          How organizers across industries use AwardX to run seamless, high-impact programs.
        </p>
      </section>

      {/* Featured Case Studies */}
      <section className="max-w-7xl mx-auto px-4 space-y-12 mb-32">
        <CaseStudy 
          title="Scaling the Indie Film Awards"
          industry="Film Festival"
          color="from-rose-500 to-orange-500"
          description="The IFA faced a logistical nightmare managing 4,000+ video files via Dropbox and email. Judging took 3 months. AwardX streamlined the entire ingestion pipeline."
          quote="We cut our administrative time by 70% in the first year alone. The playback engine for judges is flawless."
          author="Marcus Thorne, Festival Director"
          stats={[
            { value: "4,000+", label: "Video Submissions" },
            { value: "-70%", label: "Admin Time" }
          ]}
        />

        <CaseStudy 
          title="Global Tech Innovation Challenge"
          industry="Corporate"
          color="from-blue-600 to-indigo-600"
          description="TechGiant Co needed a secure way to collect pitch decks and proprietary code from startups across 30 countries, with strict IP protection for judges."
          quote="The security features and conflict-of-interest checks gave our legal team the confidence to move forward."
          author="Sarah Jenkins, VP Innovation"
          stats={[
            { value: "30", label: "Countries Represented" },
            { value: "100%", label: "Uptime & Security" }
          ]}
        />
        
        <CaseStudy 
          title="NextGen Art Scholarship"
          industry="Education"
          color="from-emerald-500 to-teal-500"
          description="A university grant program struggled with messy paper applications. AwardX digitized the process and added a public voting round to engage students."
          quote="The public voting gallery went viral on campus. We had 50,000 votes in a week."
          author="Dr. Elena Rodriguez, Dean of Arts"
          stats={[
            { value: "50k", label: "Public Votes" },
            { value: "3x", label: "Applicant Growth" }
          ]}
        />
      </section>

      {/* Use Cases Grid */}
      <section className="max-w-5xl mx-auto px-4 mb-32">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12 font-display">Trusted across every sector</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <UseCaseBlock icon={Film} title="Film Festivals" desc="Screener links & time-coded comments" />
              <UseCaseBlock icon={GraduationCap} title="Grants" desc="Financial aid & research proposals" />
              <UseCaseBlock icon={Building2} title="Corporate" desc="Internal awards & innovation hacks" />
              <UseCaseBlock icon={Palette} title="Creative" desc="Design, photo & art portfolios" />
              <UseCaseBlock icon={Heart} title="Non-Profit" desc="Fundraising & community impact" />
          </div>
      </section>

      {/* Existing Testimonials Component */}
      <div className="bg-white py-12 rounded-3xl mx-4 shadow-sm border border-slate-100">
        <Testimonials />
      </div>

      {/* CTA */}
      <section className="py-20 text-center px-4">
         <h2 className="text-3xl font-bold text-slate-900 mb-4 font-display">Want your program featured here?</h2>
         <p className="text-slate-500 mb-8">Join the community of world-class organizers.</p>
         <Button variant="outline">Contact Us</Button>
      </section>

    </div>
  );
};