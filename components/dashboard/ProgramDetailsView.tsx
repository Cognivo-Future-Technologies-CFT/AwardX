
import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import { Program } from '../../services/demoDb';
import { Button } from '../Button';
import { Calendar, Image as ImageIcon, Type, Link as LinkIcon, Save, AlertCircle } from 'lucide-react';

interface ProgramDetailsViewProps {
    activeEvent: Program | null;
}

export const ProgramDetailsView: React.FC<ProgramDetailsViewProps> = ({ activeEvent }) => {
    const [formData, setFormData] = useState<Partial<Program>>({
        title: '',
        description: '', // Program interface in demoDb might not have description, but DB does. I need to check interface.
        deadline: '',
        status: 'Draft',
        slug: '',
        coverImageUrl: '',
        category: 'General',
        visibility: 'Public'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (activeEvent) {
            setFormData({
                title: activeEvent.title,
                deadline: activeEvent.deadline,
                status: activeEvent.status,
                slug: activeEvent.slug,
                description: activeEvent.description,
                coverImageUrl: activeEvent.coverImageUrl,
                visibility: activeEvent.visibility,
                category: activeEvent.category
            });
        }
    }, [activeEvent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeEvent) return;

        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            await db.updateProgram({
                ...activeEvent,
                ...formData as Program
            });
            setSuccessMessage('Program details updated successfully.');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to update program.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!activeEvent) {
        return <div>No active event selected.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Program Details</h1>
                <p className="text-slate-500">Manage the core details of your award program.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">

                {/* Basic Info Section */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Basic Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-slate-700">Program Title</label>
                            <div className="relative">
                                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="e.g. Annual Design Awards 2024"
                                />
                            </div>
                        </div>


                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-slate-700">Deadline</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    required
                                    value={formData.deadline}
                                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-slate-700">URL Slug</label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={formData.slug || ''}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="e.g. design-awards-2024"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-semibold text-slate-700">Industry Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            >
                                <option>Design</option>
                                <option>Technology</option>
                                <option>Business</option>
                                <option>Arts</option>
                                <option>Education</option>
                                <option>Health</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-700">Description</label>
                        <textarea
                            rows={4}
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                            placeholder="Describe your program..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-semibold text-slate-700">Cover Image URL</label>
                        <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={formData.coverImageUrl || ''}
                                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </section>

                {/* Status Section */}
                <section className="space-y-4 pt-4">
                    <div className="flex flex-col md:flex-row gap-8">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 mb-4">Status</h2>
                            <div className="flex gap-4">
                                {['Draft', 'Active', 'Completed'].map((status) => (
                                    <label key={status} className="flex items-center cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="status"
                                            value={status}
                                            checked={formData.status === status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                            className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span className="ml-2 text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{status}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-900 mb-4">Visibility</h2>
                            <div className="flex gap-4">
                                {['Public', 'Private'].map((vis) => (
                                    <label key={vis} className="flex items-center cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="visibility"
                                            value={vis}
                                            checked={formData.visibility === vis}
                                            onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                                            className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span className="ml-2 text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{vis}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feedback Messages */}
                {error && (
                    <div className="flex items-center gap-2 p-4 text-red-700 bg-red-50 rounded-lg border border-red-100">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {successMessage && (
                    <div className="flex items-center gap-2 p-4 text-green-700 bg-green-50 rounded-lg border border-green-100">
                        <Save className="w-5 h-5 shrink-0" />
                        <p className="text-sm">{successMessage}</p>
                    </div>
                )}

                <div className="pt-6 flex justify-end">
                    <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
                        {isLoading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};
