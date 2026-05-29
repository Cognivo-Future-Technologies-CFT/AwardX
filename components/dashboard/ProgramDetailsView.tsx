
import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import { PaymentConfig, Program } from '../../services/models';
import { Button } from '../Button';
import { Calendar, Image as ImageIcon, Type, Link as LinkIcon, Save, AlertCircle, CreditCard, DollarSign, CheckCircle } from 'lucide-react';
import { AppDatePicker } from '../ui/AppDateFields';

interface ProgramDetailsViewProps {
    activeEvent: Program | null;
}

export const ProgramDetailsView: React.FC<ProgramDetailsViewProps> = ({ activeEvent }) => {
    const defaultPaymentConfig: PaymentConfig = {
        enabled: false,
        provider: 'Stripe',
        currency: 'USD',
        fee: 0,
        connected: false,
        publicKey: '',
    };

    const [formData, setFormData] = useState<Partial<Program>>({
        title: '',
        description: '', // Program interface in demoDb might not have description, but DB does. I need to check interface.
        deadline: '',
        status: 'Draft',
        slug: '',
        coverImageUrl: '',
        category: 'General',
        visibility: 'Public',
        paymentConfig: defaultPaymentConfig,
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
                category: activeEvent.category,
                paymentConfig: {
                    ...defaultPaymentConfig,
                    ...(activeEvent.paymentConfig || {}),
                },
                applicationMode: activeEvent.applicationMode || 'standard',
                requireGithubAuth: activeEvent.requireGithubAuth ?? false,
            });
        }
    }, [activeEvent]);

    const paymentConfig = formData.paymentConfig || defaultPaymentConfig;

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
        <div className="w-full min-h-[calc(100vh-10rem)] space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Program Details</h1>
                <p className="text-slate-500">Manage the core details of your award program.</p>
            </div>

            <form onSubmit={handleSubmit} className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-8 space-y-6">

                {/* Basic Info Section */}
                <section className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Basic Information</h2>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                            <AppDatePicker
                                label="Deadline"
                                value={formData.deadline || null}
                                onChange={(deadline) => setFormData({ ...formData, deadline: deadline || '' })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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

                <section className="space-y-4 pt-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Application mode</h2>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">How applicants apply</label>
                            <select
                                value={formData.applicationMode || 'standard'}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    applicationMode: e.target.value as 'standard' | 'hackathon',
                                    requireGithubAuth: e.target.value === 'hackathon' ? true : formData.requireGithubAuth,
                                })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="standard">Standard (open form)</option>
                                <option value="hackathon">Hackathon (GitHub application)</option>
                            </select>
                        </div>
                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <span className="text-sm font-semibold text-slate-900">Require GitHub sign-in</span>
                                <p className="text-xs text-slate-500">Applicants must authenticate with GitHub to apply</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({
                                    ...formData,
                                    requireGithubAuth: !formData.requireGithubAuth,
                                })}
                                className={`relative h-7 w-12 rounded-full transition-colors ${formData.requireGithubAuth ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${formData.requireGithubAuth ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </label>
                        <p className="text-xs text-slate-500 border-t border-slate-200 pt-3">
                            Public voting and DIDIT KYC are configured per round under{' '}
                            <strong>Schedule &amp; Rounds</strong> when the round type is Public Voting.
                            Connect DIDIT in <strong>Settings → Integrations</strong> first.
                        </p>
                    </div>
                </section>

                <section className="space-y-4 pt-4">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Payment Configuration</h2>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-indigo-600" />
                                    Collect submission fees
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Enable checkout before final submission confirmation.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({
                                    ...formData,
                                    paymentConfig: { ...paymentConfig, enabled: !paymentConfig.enabled },
                                })}
                                className={`relative h-7 w-12 rounded-full transition-colors ${paymentConfig.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                aria-label="Toggle payment collection"
                            >
                                <span
                                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${paymentConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Provider</label>
                                <select
                                    value={paymentConfig.provider}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        paymentConfig: { ...paymentConfig, provider: e.target.value as PaymentConfig['provider'] },
                                    })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                >
                                    <option value="Stripe">Stripe</option>
                                    <option value="PayPal">PayPal</option>
                                    <option value="Razorpay">Razorpay</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Currency</label>
                                <select
                                    value={paymentConfig.currency}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        paymentConfig: { ...paymentConfig, currency: e.target.value },
                                    })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                    <option value="CAD">CAD</option>
                                    <option value="INR">INR</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Submission Fee</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={paymentConfig.fee}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            paymentConfig: { ...paymentConfig, fee: Number(e.target.value) || 0 },
                                        })}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Public Key (optional)</label>
                            <input
                                type="text"
                                value={paymentConfig.publicKey || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    paymentConfig: { ...paymentConfig, publicKey: e.target.value },
                                })}
                                placeholder="pk_live_..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>

                        {paymentConfig.provider === 'Razorpay' && (
                          <div className="space-y-4 pt-2">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Razorpay Key ID</label>
                              <input
                                type="text"
                                value={paymentConfig.publicKey || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  paymentConfig: { ...paymentConfig, publicKey: e.target.value },
                                })}
                                placeholder="rzp_live_..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Razorpay Key Secret</label>
                              <input
                                type="password"
                                value={paymentConfig.secretKey || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  paymentConfig: { ...paymentConfig, secretKey: e.target.value },
                                })}
                                placeholder="••••••••••••"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              />
                              <p className="text-xs text-slate-500 mt-1">Found in your Razorpay Dashboard &rarr; Settings &rarr; API Keys</p>
                            </div>
                            <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                              paymentConfig.publicKey && paymentConfig.secretKey
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>
                              {paymentConfig.publicKey && paymentConfig.secretKey ? (
                                <>
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                  <div>
                                    <p className="text-sm font-semibold">Razorpay configured</p>
                                    <p className="text-xs opacity-75">Payment collection is ready</p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-5 h-5 text-amber-600" />
                                  <div>
                                    <p className="text-sm font-semibold">Razorpay not configured</p>
                                    <p className="text-xs opacity-75">Add both Key ID and Key Secret to enable payments</p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
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
