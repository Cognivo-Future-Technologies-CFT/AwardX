import React, { useState, useEffect } from 'react';
import { Footer } from '../Footer';
import { Button } from '../Button';
import { programs, auth, programPages } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Trophy, Users, ArrowRight, Share2, MapPin, Globe, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { SectionPreview } from '../dashboard/builder/SectionBlocks';
import { useNavigate, useParams } from 'react-router-dom';

interface Category {
    id: string;
    title: string;
    description?: string;
    parent_id: string | null;
    children?: Category[];
}

export const PublicProgramPage: React.FC = () => {
    const navigate = useNavigate();
    const { slug: slugParam } = useParams<{ slug?: string }>();
    const [program, setProgram] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('about');
    const [openCategory, setOpenCategory] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [sections, setSections] = useState<any[]>([]);

    const [categoryTree, setCategoryTree] = useState<Category[]>([]);

    const buildCategoryTree = (flatCategories: any[]): Category[] => {
        const categoryMap: Record<string, Category> = {};
        const tree: Category[] = [];

        // First pass: create all category objects
        flatCategories.forEach(cat => {
            categoryMap[cat.id] = { ...cat, children: [] };
        });

        // Second pass: build the tree
        flatCategories.forEach(cat => {
            if (cat.parent_id && categoryMap[cat.parent_id]) {
                categoryMap[cat.parent_id].children?.push(categoryMap[cat.id]);
            } else {
                tree.push(categoryMap[cat.id]);
            }
        });

        return tree;
    };

    useEffect(() => {
        const checkAuth = async () => {
            const { session } = await auth.getSession();
            setIsAuthenticated(!!session);
        };
        checkAuth();

        const fetchProgram = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const id = params.get('id');
                const slug = slugParam || null;

                if (!id && !slug) {
                    setError('Program ID is required');
                    setIsLoading(false);
                    return;
                }

                let programResult;
                if (slug) {
                    programResult = await programs.getBySlug(slug);
                } else {
                    programResult = await programs.getPublicById(id!);
                }

                const [programData, sectionsData, configData] = await Promise.all([
                    Promise.resolve(programResult),
                    programResult.data?.id 
                        ? programPages.getSections(programResult.data.id)
                        : Promise.resolve({ data: null }),
                    programResult.data?.id
                        ? programPages.getConfig(programResult.data.id)
                        : Promise.resolve({ data: null }),
                ]);

                if (programData.error) throw programData.error;
                if (!programData.data) throw new Error('Program not found');

                if (!configData?.data?.is_published) {
                    throw new Error('This program page is not published yet.');
                }

                setProgram(programData.data);

                // If sections exist, use them. Otherwise we might fall back to default template
                // But for "reflection" purposes, we only show what's saved.
                // If nothing saved, and builder initializes defaults, user must SAVE in builder first.
                // Or we can default here too? Let's just show saved sections.
                if (sectionsData.data) {
                    setSections(sectionsData.data);
                }

            } catch (err: any) {
                console.error('Error fetching program:', err);
                setError(err.message || 'Failed to load program');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProgram();
    }, [slugParam]);

    const handleSectionNavigate = (target: string) => {
        if (!target) return;
        const path = target.startsWith('/') ? target : `/${target}`;
        navigate(path);
    };

    const handleApply = () => {
        if (!program) return;

        // Check if user is logged in
        if (!isAuthenticated) {
            // Store return URL/action
            const currentUrl = window.location.href;
            sessionStorage.setItem('returnUrl', currentUrl);
            sessionStorage.setItem('pendingAction', `apply:${program.id}`);
            navigate('/login');
            return;
        }

        // Redirect to form submission or application flow
        // For now, we'll assume there's a default form or we use the first form available
        // Ideally we'd fetch the specific form for this program
        navigate('/dashboard');
    };

    const CategoryNode: React.FC<{
        category: Category;
        isOpen: boolean;
        onToggle: () => void;
        level: number;
        openCategory: string | null;
        setOpenCategory: (id: string | null) => void;
    }> = ({ category, isOpen, onToggle, level, openCategory, setOpenCategory }) => {
        const hasChildren = category.children && category.children.length > 0;

        return (
            <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-indigo-300 ${level > 0 ? 'ml-6 mt-2' : ''}`}>
                <button
                    onClick={onToggle}
                    className="w-full p-4 flex items-center justify-between text-left group"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${level === 0 ? 'bg-indigo-600' : 'bg-slate-400'}`} />
                        <h5 className={`font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight ${level > 0 ? 'text-sm' : ''}`}>
                            {category.title}
                        </h5>
                    </div>
                    {(category.description || hasChildren) && (
                        isOpen ? (
                            <ChevronUp className="w-4 h-4 text-indigo-600" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                        )
                    )}
                </button>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                        >
                            <div className={`px-4 pb-4 pt-2 border-t border-slate-50`}>
                                {category.description && (
                                    <p className="text-slate-600 leading-relaxed text-sm mb-4 italic">
                                        {category.description}
                                    </p>
                                )}
                                {hasChildren && (
                                    <div className="space-y-2">
                                        {category.children!.map((child) => (
                                            <CategoryNode
                                                key={child.id}
                                                category={child}
                                                isOpen={openCategory === child.id}
                                                onToggle={() => setOpenCategory(openCategory === child.id ? null : child.id)}
                                                level={level + 1}
                                                openCategory={openCategory}
                                                setOpenCategory={setOpenCategory}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !program) {
        return (
            <div className="min-h-screen bg-white">
                <div className="container mx-auto px-4 py-32 text-center">
                    <div className="text-red-500 mb-4">
                        <AlertCircle className="w-16 h-16 mx-auto" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">Program Not Found</h1>
                    <p className="text-slate-600 mb-8">{error || "We couldn't find the program you're looking for."}</p>
                    <Button onClick={() => navigate('/')}>Go Home</Button>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'about', label: 'About' },
        { id: 'timeline', label: 'Timeline & Rounds' },
        { id: 'prizes', label: 'Prizes & Rewards' },
        { id: 'contact', label: 'Contact' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
            <div className="flex-grow">
                {sections.length > 0 ? (
                    sections.map(section => (
                        <div key={section.id} id={section.section_type}>
                            <SectionPreview section={section} onNavigate={handleSectionNavigate} />
                        </div>
                    ))
                ) : (
                    <div className="py-32 text-center">
                        <h2 className="text-2xl font-bold text-slate-700">Program page not yet configured.</h2>
                        <p className="text-slate-500 mt-2">Please use the Page Builder to set up the event overview.</p>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};
