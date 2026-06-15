import React from 'react';
import {
    Gavel, Trophy, FileText, Search, Bell, Shield, Activity,
    Vote, Mail, BarChart3, CalendarClock, Users, LayoutTemplate,
    CreditCard, ShieldCheck, KeyRound, Award, Database, Globe,
    LucideIcon
} from 'lucide-react';

/* Each tag references a feature that actually exists in the codebase. */

const row1 = [
    { icon: Gavel, label: "Multi-round Judging" },
    { icon: CalendarClock, label: "Schedule & Rounds" },
    { icon: FileText, label: "Submissions Table" },
    { icon: LayoutTemplate, label: "Form Builder" },
    { icon: BarChart3, label: "Analytics" },
    { icon: Shield, label: "Teams & Roles" },
    { icon: Activity, label: "Audit Logs" },
    { icon: Trophy, label: "Awards" },
];

const row2 = [
    { icon: Vote, label: "Public Voting" },
    { icon: Mail, label: "Reach Campaigns" },
    { icon: KeyRound, label: "Judge Portal" },
    { icon: Search, label: "⌘K Universal Search" },
    { icon: CreditCard, label: "Razorpay Payments" },
    { icon: ShieldCheck, label: "Didit KYC" },
    { icon: Bell, label: "Resend Email" },
    { icon: Users, label: "Categories" },
    { icon: Award, label: "Leaderboard" },
    { icon: Database, label: "Realtime Updates" },
    { icon: Globe, label: "Public Program Pages" },
];

interface FeatureTagProps {
    icon: LucideIcon;
    label: string;
}

const FeatureTag: React.FC<FeatureTagProps> = ({ icon: Icon, label }) => (
    <div className="relative flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_8px_20px_rgba(15,23,42,0.06)] whitespace-nowrap min-w-[200px] hover:bg-white/80 hover:shadow-[0_10px_30px_rgba(99,102,241,0.15)] hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-300 group overflow-hidden">
        {/* Glass top highlight */}
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        <div className="p-2 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-white/80 shadow-sm group-hover:from-indigo-50 group-hover:to-purple-50 transition-colors">
            <Icon className="w-4 h-4 text-slate-600 group-hover:text-indigo-600 transition-colors" />
        </div>
        <span className="font-semibold text-slate-700 group-hover:text-slate-900 text-sm">{label}</span>
    </div>
);

export const FeatureScroll: React.FC = () => {
    return (
        <section className="py-20 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden border-y border-slate-100/80 relative">
            {/* Subtle background grid */}
            <div className="absolute inset-0 grid-bg-light opacity-30 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[200px] bg-gradient-to-r from-indigo-100/40 via-purple-100/40 to-cyan-100/40 blur-[80px] pointer-events-none" />

            <div className="text-center mb-10 px-4 relative z-10">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600 mb-3">Shipped in the repo today</p>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 font-display tracking-tight">
                    Every capability, one codebase
                </h2>
                <p className="text-sm text-slate-500 mt-2">Hover to pause · each tag maps to a real dashboard view</p>
            </div>

            <div className="pause-on-hover flex flex-col gap-6 relative z-10">
                {/* Row 1 - Scroll Left */}
                <div className="relative flex overflow-x-hidden">
                    <div className="animate-scroll flex space-x-6 px-4">
                        {[...row1, ...row1, ...row1, ...row1].map((item, idx) => (
                            <FeatureTag key={`r1-${idx}`} icon={item.icon} label={item.label} />
                        ))}
                    </div>
                </div>

                {/* Row 2 - Scroll Right */}
                <div className="relative flex overflow-x-hidden">
                    <div className="animate-scroll-reverse flex space-x-6 px-4">
                        {[...row2, ...row2, ...row2, ...row2].map((item, idx) => (
                            <FeatureTag key={`r2-${idx}`} icon={item.icon} label={item.label} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Gradient Overlays to smooth edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-white via-white/80 to-transparent z-20"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-white via-white/80 to-transparent z-20"></div>
        </section>
    );
};
