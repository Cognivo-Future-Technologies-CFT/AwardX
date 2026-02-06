import React, { useState, useEffect } from 'react';
import {
    LayoutTemplate, Info, Calendar, Users, Award, HelpCircle,
    Megaphone, Image, Type, CheckCircle2, ListOrdered,
    History, Zap, MapPin, Search, ArrowRight, Clock, Globe, TrendingUp, ArrowDown, Heart, Eye as EyeIcon, MessageSquare
} from 'lucide-react';
import { db } from '../../../services/database';
import { AnimatePresence, motion } from 'framer-motion';
import { Submission } from '../../../services/models';

export interface SectionDef {
    type: string;
    label: string;
    icon: React.ElementType;
    defaultContent: any;
    defaultSettings: any;
}

export const sectionDefs: SectionDef[] = [
    {
        type: 'hero',
        label: 'Hero Section',
        icon: LayoutTemplate,
        defaultContent: {
            title: 'AMS AwardX 2026',
            subtitle: 'Celebrating Innovation, Excellence & Impact Across Industries',
            date: 'October 24-26, 2026',
            location: 'Grand Convention Center, New Delhi',
            primaryCtaText: 'Nominate Now',
            primaryCtaLink: '#',
            secondaryCtaText: 'Register / Attend',
            secondaryCtaLink: '#',
            tertiaryCtaText: 'View Categories',
            tertiaryCtaLink: '#',
            backgroundImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=2070'
        },
        defaultSettings: {
            align: 'center', // left, center
            overlayOpacity: 0.6,
            height: 'large', // medium, large, full
            showCountdown: true
        }
    },
    {
        type: 'about',
        label: 'About Event',
        icon: Info,
        defaultContent: {
            title: 'About AMS AwardX',
            lead: 'A premier recognition platform designed to honor outstanding achievements across technology, business, innovation, and social impact.',
            description: '<p>AMS AwardX is designed for students, startups, corporates, and innovators. What makes it unique is our comprehensive evaluation framework and global network of mentors.</p>',
            image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=2069'
        },
        defaultSettings: {
            layout: 'split_right', // split_left, split_right, full
            backgroundColor: 'white'
        }
    },
    {
        type: 'highlights',
        label: 'Event Highlights',
        icon: Zap,
        defaultContent: {
            title: 'Event Highlights / Key Benefits',
            subtitle: 'Unlock opportunities for growth and recognition',
            items: [
                { title: 'National/Global Recognition', description: 'Showcase your work on an international stage', icon: 'Globe' },
                { title: 'Certified Awards & Titles', description: 'Receive prestigious industry certification', icon: 'Award' },
                { title: 'Networking with Industry Leaders', description: 'Connect with 500+ visionaries', icon: 'Users' },
                { title: 'Media & Digital Exposure', description: 'Featured in top tier media outlets', icon: 'Megaphone' },
                { title: 'Career & Business Opportunities', description: 'Accelerate your professional journey', icon: 'TrendingUp' }
            ]
        },
        defaultSettings: {
            style: 'cards', // cards, list, icons
            columns: 3,
            backgroundColor: 'slate-50'
        }
    },
    {
        type: 'categories',
        label: 'Categories Snapshot',
        icon: Award,
        defaultContent: {
            title: 'Award Categories',
            subtitle: 'A preview of our major category groups',
            items: [
                { title: 'Technology Awards', description: 'Recognizing digital innovation' },
                { title: 'Startup & Business Awards', description: 'Celebrating entrepreneurial spirit' },
                { title: 'Student Excellence', description: 'Nurturing future leaders' },
                { title: 'Social Impact', description: 'Honoring community contribution' }
            ],
            ctaText: 'Explore All Categories',
            ctaLink: '#'
        },
        defaultSettings: {
            columns: 4,
            showIcons: true
        }
    },
    {
        type: 'process',
        label: 'How It Works',
        icon: ListOrdered,
        defaultContent: {
            title: 'How The Event Works (Process Flow)',
            subtitle: 'Simple steps to recognition',
            steps: [
                { title: 'Nomination Submission', description: 'Submit your entry via our portal' },
                { title: 'Screening & Eligibility Check', description: 'Internal review of submissions' },
                { title: 'Jury Evaluation', description: 'Expert review by industry leaders' },
                { title: 'Shortlisting', description: 'Finalists announced to the public' },
                { title: 'Final Results & Award Ceremony', description: 'Grand celebration of winners' }
            ]
        },
        defaultSettings: {
            style: 'timeline', // timeline, steps, cards
            backgroundColor: 'white'
        }
    },
    {
        type: 'eligibility',
        label: 'Eligibility',
        icon: CheckCircle2,
        defaultContent: {
            title: 'Eligibility & Who Can Apply',
            description: 'Open to a wide range of participants',
            items: [
                'Individuals / Teams / Organizations',
                'No specific age limits for general categories',
                'Open to participants from India & Globally',
                'Specific Student vs Professional tracks available'
            ]
        },
        defaultSettings: {
            style: 'list', // list, cards
            backgroundColor: 'slate-50'
        }
    },
    {
        type: 'timeline',
        label: 'Important Dates',
        icon: Calendar,
        defaultContent: {
            title: 'Important Dates',
            subtitle: 'Key milestones in your journey',
            dates: [
                { label: 'Nominations Open', value: 'Coming Soon' },
                { label: 'Last Date to Apply', value: 'TBA' },
                { label: 'Shortlist Announcement', value: 'TBA' },
                { label: 'Final Event Date', value: 'October 24, 2026' }
            ]
        },
        defaultSettings: {
            layout: 'horizontal', // vertical, horizontal
            backgroundColor: 'white'
        }
    },
    {
        type: 'jury',
        label: 'Jury Panel',
        icon: Users,
        defaultContent: {
            title: 'Jury / Panel Preview',
            subtitle: 'Evaluated by industry veterans',
            items: [
                { name: 'Featured Expert', role: 'CEO', company: 'Innovation Hub', image: '' },
                { name: 'Industry Leader', role: 'Director', company: 'Tech Corp', image: '' }
            ],
            ctaText: 'View Full Jury',
            ctaLink: '#'
        },
        defaultSettings: {
            layout: 'grid', // grid, carousel
            backgroundColor: 'slate-50'
        }
    },
    {
        type: 'past_editions',
        label: 'Past Editions',
        icon: History,
        defaultContent: {
            title: 'Past Edition Highlights',
            subtitle: 'Our legacy of impact and excellence',
            stats: [
                { value: '5K+', label: 'Participants' },
                { value: '50+', label: 'Winners' },
                { value: '20+', label: 'Cities Represented' }
            ],
            testimonials: [
                { quote: "An incredible platform for recognition.", author: "Past Winner" }
            ]
        },
        defaultSettings: {
            showStats: true,
            showTestimonials: true,
            backgroundColor: 'indigo-900'
        }
    },
    {
        type: 'sponsors',
        label: 'Sponsors',
        icon: Image,
        defaultContent: {
            title: 'Sponsors & Partners',
            subtitle: 'Supported by leading organizations',
            categories: [
                { name: 'Title Sponsor', sponsors: [] },
                { name: 'Powered By', sponsors: [] },
                { name: 'Media Partners', sponsors: [] }
            ]
        },
        defaultSettings: {
            grayscale: true,
            size: 'medium'
        }
    },
    {
        type: 'faq',
        label: 'FAQs',
        icon: HelpCircle,
        defaultContent: {
            title: 'FAQs Section',
            subtitle: 'Common questions answered',
            faqs: [
                { question: 'Is there a nomination fee?', answer: 'Please check specific category details.' },
                { question: 'Can I apply to multiple categories?', answer: 'Yes, you can apply to all relevant categories.' },
                { question: 'How are winners selected?', answer: 'Through a rigorous multi-stage jury process.' }
            ]
        },
        defaultSettings: {
            accordion: true,
            backgroundColor: 'slate-50'
        }
    },
    {
        type: 'cta',
        label: 'Final CTA',
        icon: Megaphone,
        defaultContent: {
            title: 'Final Call to Action',
            subtitle: 'Ready to be recognized?',
            primaryCtaText: 'Nominate Now',
            primaryCtaLink: '#',
            secondaryCtaText: 'Register to Attend',
            secondaryCtaLink: '#',
            tertiaryCtaText: 'Contact Us',
            tertiaryCtaLink: '#'
        },
        defaultSettings: {
            variant: 'gradient', // primary, dark, gradient
            align: 'center'
        }
    },
    {
        type: 'custom',
        label: 'Custom Text',
        icon: Type,
        defaultContent: {
            content: '<h2>Custom Section</h2><p>Add any content you want here.</p>'
        },
        defaultSettings: {
            padding: 'medium'
        }
    },
    {
        type: 'navbar',
        label: 'Navigation Bar',
        icon: LayoutTemplate,
        defaultContent: {
            logo_text: 'AMS AwardX',
            logo_url: '',
            links: [
                { label: 'About', url: '#about' },
                { label: 'Timeline', url: '#timeline' },
                { label: 'Categories', url: '#categories' },
                { label: 'FAQ', url: '#faq' }
            ],
            cta_text: 'Nominate Now',
            cta_url: '#cta'
        },
        defaultSettings: {
            sticky: true,
            transparent: true,
            theme: 'dark' // dark, light
        }
    },
    {
        type: 'voting',
        label: 'Public Voting',
        icon: Globe,
        defaultContent: {
            title: 'Public Voting Gallery',
            subtitle: 'Cast your vote for the most innovative projects.',
            ctaText: 'Voting Details',
            ctaLink: '#'
        },
        defaultSettings: {
            layout: 'grid', // grid, masonry
            columns: 3,
            backgroundColor: 'slate-900',
            showVotes: true,
            allowMultiple: false
        }
    }
];

// Sub-component for Voting Gallery
const VotingGallery: React.FC<{ programId: string; settings: any }> = ({ programId, settings }) => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [votedIds, setVotedIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (!programId) return;
            try {
                const subs = await db.getPublicSubmissions(programId);
                setSubmissions(subs);
            } catch (error) {
                console.error('Failed to fetch submissions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSubmissions();
    }, [programId]);

    const handleVote = async (submissionId: string) => {
        if (votedIds.includes(submissionId)) return;

        try {
            await db.vote(submissionId);
            setVotedIds(prev => [...prev, submissionId]);
            setSubmissions(subs => subs.map(s =>
                s.id === submissionId ? { ...s, votes: (s.votes || 0) + 1 } : s
            ));
        } catch (error) {
            console.error('Vote failed:', error);
        }
    };

    if (loading) return (
        <div className="py-32 flex flex-col items-center justify-center gap-6">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-white/30 uppercase tracking-[0.3em] font-bold text-xs animate-pulse">Loading Entries</p>
        </div>
    );

    if (submissions.length === 0) return (
        <div className="py-32 text-center">
            <Globe className="w-12 h-12 text-white/10 mx-auto mb-6" />
            <p className="text-white/30 uppercase tracking-[0.2em] font-medium">No shortlisted entries available for voting yet.</p>
        </div>
    );

    const columns = settings?.columns || 3;

    return (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} gap-10`}>
            {submissions.map((sub, idx) => (
                <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="group relative bg-[#0f0f0f] border border-white/5 rounded-[32px] overflow-hidden hover:border-white/20 transition-all duration-700 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]"
                >
                    <div className="aspect-[5/4] relative overflow-hidden">
                        <img
                            src={sub.image}
                            alt={sub.title}
                            className="w-full h-full object-cover grayscale opacity-50 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent opacity-90" />

                        <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                            <span className="px-4 py-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[10px] uppercase tracking-widest text-white font-bold leading-none">
                                {sub.category}
                            </span>
                        </div>
                    </div>

                    <div className="p-8 pt-2">
                        <h4 className="text-2xl font-bold text-white mb-2 leading-tight group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                            {sub.title}
                        </h4>
                        <p className="text-[11px] text-white/30 mb-8 uppercase tracking-[0.2em] font-bold">Participant: {sub.applicant}</p>

                        <div className="flex items-center justify-between gap-4 pt-6 border-t border-white/5">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${votedIds.includes(sub.id) ? 'bg-blue-500 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                    <Heart className={`w-5 h-5 transition-transform duration-500 ${votedIds.includes(sub.id) ? 'fill-white text-white scale-110' : 'text-white/20 group-hover:scale-110'}`} />
                                </div>
                                <div className="space-y-0.5">
                                    <div className="text-xl font-bold text-white tracking-widest tabular-nums leading-none">
                                        {(sub.votes || 0).toLocaleString()}
                                    </div>
                                    <div className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-extrabold">Votes</div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleVote(sub.id)}
                                disabled={votedIds.includes(sub.id)}
                                className={`flex-1 h-12 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-500 px-4 ${votedIds.includes(sub.id)
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-white text-black hover:bg-blue-500 hover:text-white active:scale-95 shadow-lg'
                                    }`}
                            >
                                {votedIds.includes(sub.id) ? 'Confirmed' : 'Cast Vote'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

// Preview Components with Professional Design
export const SectionPreview: React.FC<{ section: any; onNavigate?: (page: string) => void }> = ({ section, onNavigate }) => {
    // Handle both 'type' (frontend state) and 'section_type' (database response)
    const type = section.type || section.section_type;
    const { content, settings } = section;

    const handleNavigation = (e: React.MouseEvent, url: string | undefined) => {
        if (!url || url === '#' || url === '') return;

        e.preventDefault();
        e.stopPropagation();

        if (url.startsWith('#')) {
            const element = document.getElementById(url.substring(1));
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } else if (url.startsWith('http')) {
            window.open(url, '_blank');
        } else if (onNavigate) {
            onNavigate(url);
        }
    };

    switch (type) {
        case 'voting':
            return (
                <div id={section.id} className={`py-32 px-6 md:px-12 bg-[#0a0a0a] relative overflow-hidden`}>
                    {/* Background Accents */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px]" />
                        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px]" />
                    </div>

                    <div className="max-w-7xl mx-auto relative z-10">
                        <div className="text-center mb-24">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-bold uppercase tracking-[0.3em] mb-8"
                            >
                                <Globe className="w-3 h-3" /> Public Choice Awards
                            </motion.div>
                            <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 uppercase tracking-tighter leading-none italic">
                                {content?.title || 'Public Voting Gallery'}
                            </h2>
                            <p className="text-white/40 text-lg uppercase tracking-widest max-w-2xl mx-auto">
                                {content?.subtitle || 'Cast your vote for the most innovative projects.'}
                            </p>
                        </div>

                        <VotingGallery programId={section.program_id} settings={settings} />

                        {content?.ctaText && (
                            <div className="mt-24 text-center">
                                <button
                                    onClick={(e) => handleNavigation(e, content?.ctaLink)}
                                    className="inline-flex items-center gap-4 group"
                                >
                                    <span className="text-white/30 uppercase tracking-[0.4em] text-[10px] font-bold group-hover:text-white transition-colors">
                                        {content.ctaText}
                                    </span>
                                    <div className="w-12 h-px bg-white/20 group-hover:w-20 group-hover:bg-blue-500 transition-all duration-700" />
                                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-blue-500 group-hover:translate-x-2 transition-all" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );

        case 'navbar':
            return (
                <nav className={`w-full z-50 transition-all ${settings?.sticky ? 'sticky top-0' : 'relative'} ${settings?.theme === 'dark' ? 'bg-[#0a0a0a] border-b border-white/10 text-white' : 'bg-white text-slate-900 shadow-sm'} px-6 py-4 mb-0`}>
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {content?.logo_url ? (
                                <img src={content.logo_url} alt="Logo" className="h-8 md:h-10" />
                            ) : (
                                <span className="text-xl font-bold tracking-tighter uppercase">{content?.logo_text || 'FUTURE STACK'}</span>
                            )}
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            {(content?.links || []).map((link: any, i: number) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    onClick={(e) => handleNavigation(e, link.url)}
                                    className="text-sm font-medium hover:text-blue-400 transition-colors uppercase tracking-wide"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            {content?.cta_text && (
                                <button
                                    onClick={(e) => handleNavigation(e, content.cta_url || '#cta')}
                                    className={`hidden sm:block px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 ${settings?.theme === 'dark' ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/40' : 'bg-blue-600 text-white shadow-blue-200'}`}
                                >
                                    {content.cta_text}
                                </button>
                            )}
                            {/* Mobile Menu Icon Placeholder */}
                            <div className="md:hidden text-2xl">☰</div>
                        </div>
                    </div>
                </nav>
            );

        case 'hero':
            return (
                <div className={`relative w-full overflow-hidden ${settings?.height === 'full' ? 'min-h-[85vh]' : 'min-h-[600px]'} bg-[#0a0a0a] text-white group flex flex-col justify-center`}>
                    {/* Background & Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src={content?.backgroundImage || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=2070"}
                            alt="Hero"
                            className="w-full h-full object-cover opacity-60 mix-blend-overlay transition-transform duration-1000 transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a0a0a]/40 to-[#0a0a0a]"></div>
                        {/* Abstract 3D shape overlay simulation */}
                        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                    </div>

                    {/* Content */}
                    <div className={`relative z-10 w-full px-6 md:px-12 py-20 ${settings?.align === 'center' ? 'text-center items-center' : 'text-left items-start'}`}>
                        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
                            {content?.date && (
                                <div className="inline-flex items-center gap-3 border border-white/20 bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium text-blue-300 uppercase tracking-widest mb-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                    <span>{content.date}</span>
                                    {content.location && <span className="text-white/40">|</span>}
                                    {content.location && <span>{content.location}</span>}
                                </div>
                            )}

                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-white">
                                {content?.title || 'FUTURE STACK'}
                            </h1>

                            <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto font-light leading-relaxed">
                                {content?.subtitle || 'Architecting the next decade of digital ecosystems.'}
                            </p>

                            <div className={`flex flex-col sm:flex-row gap-4 pt-8 ${settings?.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                                {content?.primaryCtaText && (
                                    <button
                                        onClick={(e) => handleNavigation(e, content.primaryCtaLink || '#cta')}
                                        className="bg-white text-black px-8 py-4 rounded-full font-bold uppercase tracking-wider hover:bg-blue-50 transition-all transform hover:-translate-y-1 shadow-xl hover:shadow-white/20 flex items-center justify-center gap-2"
                                    >
                                        {content.primaryCtaText} <ArrowRight className="w-4 h-4" />
                                    </button>
                                )}
                                {content?.secondaryCtaText && (
                                    <button
                                        onClick={(e) => handleNavigation(e, content.secondaryCtaLink || '#')}
                                        className="bg-transparent border border-white/30 text-white px-8 py-4 rounded-full font-bold uppercase tracking-wider hover:bg-white/10 transition-all flex items-center justify-center"
                                    >
                                        {content.secondaryCtaText}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Scroll Indicator */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce text-white/30">
                        <ArrowDown className="w-6 h-6" />
                    </div>
                </div>
            );

        case 'about':
            return (
                <div className={`py-20 px-6 md:px-12 ${settings?.backgroundColor === 'slate-50' ? 'bg-slate-50' : 'bg-white'}`}>
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                        {/* Left Content */}
                        <div className="lg:col-span-7 order-2 lg:order-1 pt-4">
                            <span className="text-blue-600 font-bold tracking-widest text-xs uppercase mb-4 block">Our Mission</span>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tight">{content?.title}</h2>
                            <p className="text-xl text-slate-900 mb-6 font-medium leading-relaxed">{content?.lead}</p>
                            <div className="text-slate-600 leading-relaxed text-lg space-y-4" dangerouslySetInnerHTML={{ __html: content?.description }} />
                        </div>

                        {/* Right Sidebar Widgets */}
                        <div className="lg:col-span-5 order-1 lg:order-2 space-y-8">
                            {/* Secure Access Card */}
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
                                <h3 className="text-lg font-bold text-slate-900 mb-6">Secure Access</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div>
                                            <div className="font-bold text-slate-900">Early Bird</div>
                                            <div className="text-xs text-slate-500">Full access (2 Days)</div>
                                        </div>
                                        <div className="text-blue-600 font-bold">$199</div>
                                    </div>
                                    <div className="flex justify-between items-center p-4 rounded-xl border border-dashed border-slate-200 opacity-60">
                                        <div>
                                            <div className="font-bold text-slate-900">Standard</div>
                                            <div className="text-xs text-slate-500">Regular admission</div>
                                        </div>
                                        <div className="text-slate-900 font-bold">$299</div>
                                    </div>
                                    <div className="flex justify-between items-center p-4 rounded-xl border border-dashed border-slate-200 opacity-60">
                                        <div>
                                            <div className="font-bold text-slate-900">VIP Access</div>
                                            <div className="text-xs text-slate-500">Backstage + Dinner</div>
                                        </div>
                                        <div className="text-slate-900 font-bold">$599</div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleNavigation(e, '#cta')}
                                    className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl uppercase tracking-wider text-sm transition-colors shadow-lg shadow-blue-200"
                                >
                                    Book Experience
                                </button>
                            </div>

                            {/* Location Card */}
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Location</h3>
                                <div className="h-48 bg-slate-100 rounded-xl overflow-hidden relative mb-4 group">
                                    <img
                                        src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=600"
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                        alt="Map"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg text-blue-600 animate-bounce">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h4 className="font-bold text-slate-900">{content?.location || 'Bangalore Convention Centre'}</h4>
                                    <p className="text-sm text-slate-500 mb-4">{content?.date || 'October 24-26, 2026'}</p>
                                    <button
                                        onClick={(e) => handleNavigation(e, 'https://maps.google.com')}
                                        className="text-blue-600 text-xs font-bold uppercase tracking-widest border border-blue-100 px-4 py-2 rounded-full hover:bg-blue-50 transition-colors"
                                    >
                                        Get Directions
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );

        case 'highlights':
            return (
                <div className={`py-24 px-6 md:px-12 ${settings?.backgroundColor ? `bg-${settings.backgroundColor}` : 'bg-slate-50'}`}>
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-16">
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">{content?.title || 'Summit Highlights'}</h2>
                            {content?.subtitle && <p className="text-lg text-slate-500 max-w-2xl">{content.subtitle}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {(content?.items || []).map((item: any, idx: number) => (
                                <div key={idx} className="group bg-white p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-100 transition-opacity transform group-hover:scale-110 duration-500">
                                        <Zap className="w-24 h-24 text-blue-100" />
                                    </div>
                                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-500">
                                        <div className="text-white font-bold text-lg">
                                            {/* Icon placeholder */}
                                            {idx + 1}
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors relative z-10">
                                        {item.title}
                                    </h3>
                                    <p className="text-slate-500 leading-relaxed relative z-10">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        case 'categories':
            return (
                <div className="py-24 px-6 md:px-12 bg-white">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">{content?.title || 'Competition Tracks'}</h2>
                                <p className="text-lg text-slate-500 max-w-xl">{content?.subtitle || 'Deep dive into specific domains.'}</p>
                            </div>
                            {content?.ctaText && (
                                <button
                                    onClick={(e) => handleNavigation(e, content.ctaLink || '#')}
                                    className="text-blue-600 font-bold hover:text-blue-800 transition-colors flex items-center gap-2 group"
                                >
                                    {content.ctaText} <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                        </div>
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${settings?.columns || 2} gap-6`}>
                            {(content?.items || [1, 2, 3, 4]).map((item: any, i: number) => (
                                <div key={i} className="group bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all hover:bg-white hover:shadow-xl relative overflow-hidden">
                                    <div className="absolute top-4 right-4 text-slate-200 group-hover:text-blue-100 transition-colors">
                                        <LayoutTemplate className="w-16 h-16" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Track {i + 1}</div>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">{item.title || `Track ${i + 1}`}</h3>
                                        <p className="text-slate-500">{item.description || 'Description of the award category.'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'process':
            return (
                <div className="py-24 px-6 md:px-12 bg-slate-900 text-white">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-20">
                            <div className="inline-block px-4 py-1 rounded-full border border-white/20 bg-white/5 text-blue-300 text-xs font-bold uppercase tracking-widest mb-6">Process Flow</div>
                            <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-6">{content?.title || 'How It Works'}</h2>
                            <p className="text-slate-400 max-w-2xl mx-auto text-lg">{content?.subtitle || 'Your journey from application to recognition.'}</p>
                        </div>

                        <div className="space-y-4">
                            {(content?.steps || []).map((step: any, i: number) => (
                                <div key={i} className="group flex flex-col md:flex-row gap-6 md:gap-12 p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors items-start md:items-center">
                                    <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-purple-600 opacity-50 group-hover:opacity-100 transition-opacity">
                                        {String(i + 1).padStart(2, '0')}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
                                        <p className="text-slate-400">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'eligibility':
            return (
                <div className="py-24 px-6 md:px-12 bg-white">
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-12">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">{content?.title}</h2>
                            <p className="text-lg text-slate-500">{content?.description}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            {(content?.items || []).map((item: string, i: number) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    </div>
                                    <span className="text-slate-700 font-medium text-lg leading-snug">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'timeline':
            return (
                <div className="py-20 px-6 md:px-12 bg-white">
                    <div className="max-w-6xl mx-auto bg-black rounded-[3rem] p-10 md:p-20 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-12 mb-16">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="font-bold tracking-widest uppercase text-xs text-slate-400">Timeline</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black tracking-tighter">{content?.title || 'Countdown to the Future'}</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                            {(content?.dates && content.dates.length > 0 ? content.dates : [1, 2, 3, 4]).map((date: any, i: number) => (
                                <div key={i} className="border-l border-white/20 pl-6 py-2">
                                    <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">{date.value || 'TBA'}</div>
                                    <div className="text-xl font-bold text-white leading-tight">{date.label || `Milestone ${i + 1}`}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'jury':
            return (
                <div className="py-24 px-6 md:px-12 bg-slate-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-16 text-center md:text-left">
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">{content?.title || 'The Jury Panel'}</h2>
                            <p className="text-lg text-slate-500 max-w-2xl">{content?.subtitle || 'Evaluated by industry veterans.'}</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
                            {(content?.items || [1, 2, 3, 4]).map((member: any, i: number) => (
                                <div key={i} className="group flex flex-col items-start">
                                    <div className="w-full aspect-square bg-slate-200 rounded-2xl overflow-hidden mb-6 relative">
                                        {member.image ? (
                                            <img src={member.image} alt={member.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                                                <Users className="w-12 h-12 opacity-20" />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 leading-tight">{member.name || `Juror ${i + 1}`}</h3>
                                    <p className="text-sm text-slate-500 font-medium mb-1">{member.role || 'Title'}</p>
                                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{member.company || 'Company'}</p>
                                </div>
                            ))}
                        </div>
                        {content?.ctaText && (
                            <div className="mt-16 text-center">
                                <button
                                    onClick={(e) => handleNavigation(e, content.ctaLink || '#')}
                                    className="px-8 py-3 bg-white border border-slate-200 rounded-full font-bold text-slate-900 hover:bg-black hover:text-white hover:border-black transition-all"
                                >
                                    {content.ctaText}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );

        case 'past_editions':
            return (
                <div className="py-24 px-6 md:px-12 bg-white">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-8">{content?.title || 'Previous Impact'}</h2>
                                <div className="grid grid-cols-2 gap-6">
                                    {(content?.stats || []).map((stat: any, i: number) => (
                                        <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <div className="text-3xl md:text-4xl font-black text-slate-900 mb-1">{stat.value}</div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900 rounded-2xl aspect-square p-8 flex items-end text-white">
                                    <span className="font-bold text-xl">2024 Highlights</span>
                                </div>
                                <div className="bg-blue-600 rounded-2xl aspect-square p-8 flex items-end text-white relative overflow-hidden">
                                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 opacity-20" />
                                    <span className="font-bold text-xl relative z-10">Winners Gallery</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );

        case 'sponsors':
            return (
                <div className="py-24 px-6 md:px-12 bg-white border-t border-slate-100">
                    <div className="max-w-7xl mx-auto text-center">
                        <h2 className="text-2xl font-bold text-slate-900 mb-12 uppercase tracking-widest">{content?.title || 'Our Partners'}</h2>
                        <div className="flex flex-wrap justify-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
                            {/* Simplify sponsor rendering for preview */}
                            <div className="text-2xl font-black text-slate-300">CLOUDONE</div>
                            <div className="text-2xl font-black text-slate-300">DATASTREAM</div>
                            <div className="text-2xl font-black text-slate-300">NEXTGEN</div>
                            <div className="text-2xl font-black text-slate-300">HORIZON</div>
                        </div>
                    </div>
                </div>
            );

        case 'faq':
            return (
                <div className={`py-24 px-6 md:px-12 ${settings?.backgroundColor === 'slate-50' ? 'bg-slate-50' : 'bg-white'}`}>
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">{content?.title || 'Frequently Asked'}</h2>
                            <p className="text-lg text-slate-600">{content?.subtitle}</p>
                        </div>
                        <div className="space-y-4">
                            {(content?.faqs && content.faqs.length > 0 ? content.faqs : [1, 2, 3]).map((faq: any, i: number) => (
                                <div key={i} className="bg-white border-b border-slate-200 py-6">
                                    <div className="flex justify-between items-center cursor-pointer group">
                                        <span className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{faq.question || `Question ${i + 1}?`}</span>
                                        <ArrowDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                    {faq.answer && (
                                        <div className="text-slate-600 leading-relaxed pt-3 pr-8">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'cta':
            const isGradient = settings?.variant === 'gradient';
            const isDark = settings?.variant === 'dark';
            return (
                <div className={`py-32 px-6 md:px-12 text-center relative overflow-hidden ${isGradient ? 'bg-gradient-to-r from-blue-600 to-indigo-900' : isDark ? 'bg-black' : 'bg-blue-600'} text-white`}>
                    <div className="relative z-10 max-w-4xl mx-auto">
                        <h2 className="text-4xl md:text-7xl font-black tracking-tighter mb-8">{content?.title || 'Ready to Shape the Future?'}</h2>
                        <p className="text-xl opacity-80 mb-12 max-w-2xl mx-auto">{content?.subtitle || 'Join the most innovative minds in the industry.'}</p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button
                                onClick={(e) => handleNavigation(e, content?.primaryCtaLink || '#')}
                                className="px-10 py-5 bg-white text-black rounded-full font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors text-lg"
                            >
                                {content?.primaryCtaText || 'Nominate Now'}
                            </button>
                        </div>
                    </div>
                </div>
            );

        case 'custom':
            return (
                <div className={`py-20 px-6 md:px-12 ${settings?.backgroundColor === 'slate-50' ? 'bg-slate-50' : 'bg-white'}`}>
                    <div
                        className="max-w-4xl mx-auto prose prose-slate prose-lg"
                        dangerouslySetInnerHTML={{ __html: content?.content }}
                        onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.tagName === 'A') {
                                handleNavigation(e as unknown as React.MouseEvent, (target as HTMLAnchorElement).getAttribute('href') || undefined);
                            }
                        }}
                    />
                </div>
            );

        default:
            return (
                <div className="p-12 bg-white rounded-lg border border-slate-200 min-h-[200px] flex flex-col items-center justify-center">
                    <span className="text-slate-400 font-medium mb-3 uppercase tracking-widest text-xs">{sectionDefs.find(s => s.type === type)?.label || 'Generic Section'}</span>
                    <h3 className="text-3xl font-bold text-slate-900">{content?.title || 'Section Title'}</h3>
                </div>
            );
    }
};

export const DEFAULT_TEMPLATE = [
    {
        type: 'navbar',
        label: 'Navigation Bar',
        content: {
            logo_text: 'AMS AwardX',
            links: [
                { label: 'About', url: '#about' },
                { label: 'Highlights', url: '#highlights' },
                { label: 'Flow', url: '#process' },
                { label: 'FAQ', url: '#faq' }
            ],
            cta_text: 'Nominate Now',
            cta_url: '#cta'
        },
        settings: { sticky: true, theme: 'dark' }
    },
    {
        type: 'hero',
        label: 'Hero Section',
        content: {
            title: 'AMS AwardX 2026',
            subtitle: 'Celebrating Innovation, Excellence & Impact Across Industries',
            date: 'October 24-26, 2026',
            location: 'Grand Convention Center, New Delhi',
            primaryCtaText: 'Nominate Now',
            secondaryCtaText: 'Register / Attend',
            tertiaryCtaText: 'View Categories',
            backgroundImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=2070'
        },
        settings: { height: 'full', align: 'center', overlayOpacity: 0.6 }
    },
    {
        type: 'about',
        label: 'About Event',
        content: {
            title: 'About AMS AwardX',
            lead: 'A premier recognition platform designed to honor outstanding achievements across technology, business, innovation, and social impact.',
            description: '<p>AMS AwardX is designed for students, startups, corporates, and innovators. What makes it unique is our comprehensive evaluation framework and global network of mentors.</p>',
            image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=2069'
        },
        settings: { layout: 'split_right', backgroundColor: 'white' }
    },
    {
        type: 'highlights',
        label: 'Event Highlights',
        content: {
            title: 'Event Highlights / Key Benefits',
            subtitle: 'Unlock opportunities for growth and recognition',
            items: [
                { title: 'National/Global Recognition', description: 'Showcase your work on an international stage', icon: 'Globe' },
                { title: 'Certified Awards & Titles', description: 'Receive prestigious industry certification', icon: 'Award' },
                { title: 'Networking with Industry Leaders', description: 'Connect with 500+ visionaries', icon: 'Users' },
                { title: 'Media & Digital Exposure', description: 'Featured in top tier media outlets', icon: 'Megaphone' },
                { title: 'Career & Business Opportunities', description: 'Accelerate your professional journey', icon: 'TrendingUp' }
            ]
        },
        settings: { style: 'cards', columns: 3, backgroundColor: 'slate-50' }
    },
    {
        type: 'categories',
        label: 'Categories Snapshot',
        content: {
            title: 'Award Categories',
            subtitle: 'Recognizing excellence in diverse fields',
            items: [
                { title: 'Technology Awards', description: 'Recognizing digital innovation' },
                { title: 'Startup & Business Awards', description: 'Celebrating entrepreneurial spirit' },
                { title: 'Student Excellence', description: 'Nurturing future leaders' },
                { title: 'Social Impact', description: 'Honoring community contribution' }
            ],
            ctaText: 'Explore All Categories'
        },
        settings: { columns: 4, showIcons: true }
    },
    {
        type: 'process',
        label: 'How It Works',
        content: {
            title: 'How The Event Works (Process Flow)',
            subtitle: 'Simple steps to recognition',
            steps: [
                { title: 'Nomination Submission', description: 'Submit your entry via our portal' },
                { title: 'Screening & Eligibility Check', description: 'Internal review of submissions' },
                { title: 'Jury Evaluation', description: 'Expert review by industry leaders' },
                { title: 'Shortlisting', description: 'Finalists announced to the public' },
                { title: 'Final Results & Award Ceremony', description: 'Grand celebration of winners' }
            ]
        },
        settings: { style: 'timeline', backgroundColor: 'white' }
    },
    {
        type: 'eligibility',
        label: 'Eligibility',
        content: {
            title: 'Eligibility & Who Can Apply',
            description: 'Open to a wide range of participants',
            items: [
                'Individuals / Teams / Organizations',
                'No specific age limits for general categories',
                'Open to participants from India & Globally',
                'Specific Student vs Professional tracks available'
            ]
        },
        settings: { style: 'list', backgroundColor: 'slate-50' }
    },
    {
        type: 'timeline',
        label: 'Important Dates',
        content: {
            title: 'Important Dates',
            subtitle: 'Key milestones in your journey',
            dates: [
                { label: 'Nominations Open', value: 'Coming Soon' },
                { label: 'Last Date to Apply', value: 'TBA' },
                { label: 'Shortlist Announcement', value: 'TBA' },
                { label: 'Final Event Date', value: 'October 24, 2026' }
            ]
        },
        settings: { layout: 'horizontal', backgroundColor: 'white' }
    },
    {
        type: 'jury',
        label: 'Jury Panel',
        content: {
            title: 'Jury / Panel Preview',
            subtitle: 'Evaluated by industry veterans',
            items: [
                { name: 'Featured Expert', role: 'CEO', company: 'Innovation Hub', image: '' },
                { name: 'Industry Leader', role: 'Director', company: 'Tech Corp', image: '' }
            ],
            ctaText: 'View Full Jury'
        },
        settings: { layout: 'grid', backgroundColor: 'slate-50' }
    },
    {
        type: 'past_editions',
        label: 'Past Editions',
        content: {
            title: 'Past Edition Highlights',
            subtitle: 'Our legacy of impact and excellence',
            stats: [
                { value: '5K+', label: 'Participants' },
                { value: '50+', label: 'Winners' },
                { value: '20+', label: 'Cities Represented' }
            ],
            testimonials: [
                { quote: "An incredible platform for recognition.", author: "Past Winner" }
            ]
        },
        settings: { showStats: true, showTestimonials: true, backgroundColor: 'indigo-900' }
    },
    {
        type: 'sponsors',
        label: 'Sponsors',
        content: {
            title: 'Sponsors & Partners',
            subtitle: 'Supported by leading organizations',
            categories: [
                { name: 'Title Sponsor', sponsors: [] },
                { name: 'Powered By', sponsors: [] },
                { name: 'Media Partners', sponsors: [] }
            ]
        },
        settings: { grayscale: true, size: 'medium' }
    },
    {
        type: 'faq',
        label: 'FAQs',
        content: {
            title: 'FAQs Section',
            subtitle: 'Common questions answered',
            faqs: [
                { question: 'Is there a nomination fee?', answer: 'Please check specific category details.' },
                { question: 'Can I apply to multiple categories?', answer: 'Yes, you can apply to all relevant categories.' },
                { question: 'How are winners selected?', answer: 'Through a rigorous multi-stage jury process.' }
            ]
        },
        settings: { accordion: true, backgroundColor: 'slate-50' }
    },
    {
        type: 'cta',
        label: 'Final CTA',
        content: {
            title: 'Final Call to Action',
            subtitle: 'Ready to be recognized?',
            primaryCtaText: 'Nominate Now',
            primaryCtaLink: '#',
            secondaryCtaText: 'Register to Attend',
            secondaryCtaLink: '#',
            tertiaryCtaText: 'Contact Us',
            tertiaryCtaLink: '#'
        },
        settings: { variant: 'gradient', align: 'center' }
    },
    {
        type: 'custom',
        label: 'Custom Text',
        content: {
            content: '<h2>Custom Section</h2><p>Add any content you want here.</p>'
        },
        settings: { padding: 'medium' }
    },
    {
        type: 'navbar',
        label: 'Navigation Bar',
        content: {
            logo_text: 'AMS AwardX',
            links: [
                { label: 'About', url: '#about' },
                { label: 'Timeline', url: '#timeline' },
                { label: 'Categories', url: '#categories' },
                { label: 'FAQ', url: '#faq' }
            ],
            cta_text: 'Nominate Now',
            cta_url: '#cta'
        },
        settings: { sticky: true, transparent: true, theme: 'dark' }
    }
];
