import React, { useMemo } from 'react';
import { Modal } from '../Modal';
import { Submission } from '../../services/models';
import { useQuery } from '@tanstack/react-query';
import { forms as formsService } from '../../services/supabase';
import { User, Mail, Calendar, Tag, FileText, CheckCircle, XCircle, Clock, Gavel, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { extractSubmissionResponses, getSubmissionFormId } from '../../lib/submissionFormData';

interface SubmissionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    submission: Submission | null;
    /** Map of judgeId → judge name for display; falls back to truncated ID if absent */
    judgeNameById?: Map<string, string>;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({ isOpen, onClose, submission, judgeNameById }) => {
    if (!submission) return null;

    const statusConfig: any = {
        'Shortlisted': { color: 'text-purple-600 bg-purple-50 border-purple-100', icon: <Gavel className="w-3 h-3" /> },
        'Accepted': { color: 'text-green-600 bg-green-50 border-green-100', icon: <CheckCircle className="w-3 h-3" /> },
        'Rejected': { color: 'text-red-600 bg-red-50 border-red-100', icon: <XCircle className="w-3 h-3" /> },
        'Pending': { color: 'text-slate-600 bg-slate-50 border-slate-100', icon: <Clock className="w-3 h-3" /> },
        'Under Review': { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Clock className="w-3 h-3" /> },
    };

    const paymentStatusConfig: any = {
        'paid': { color: 'text-green-600 bg-green-50 border-green-100', label: 'Paid' },
        'pending': { color: 'text-amber-600 bg-amber-50 border-amber-100', label: 'Payment Pending' },
        'failed': { color: 'text-red-600 bg-red-50 border-red-100', label: 'Payment Failed' },
    };

    const submissionData = (submission.submissionData || {}) as Record<string, any>;
    const formId = getSubmissionFormId(submissionData);
    const actualResponses = extractSubmissionResponses(submissionData);

    // Load form fields to resolve field IDs → labels
    const { data: formFieldsData } = useQuery({
        queryKey: ['form-fields-for-modal', formId],
        queryFn: async () => {
            if (!formId) return [];
            const { data } = await formsService.getFields(formId);
            return data || [];
        },
        enabled: !!formId && isOpen,
        staleTime: 5 * 60_000,
    });

    // Build field ID → label mapping
    const fieldLabelMap = useMemo(() => {
        const map = new Map<string, { label: string; type: string }>();
        if (formFieldsData) {
            for (const field of formFieldsData) {
                map.set(field.id, { label: field.label || field.field_key || field.id, type: field.type || field.field_type || 'text' });
            }
        }
        return map;
    }, [formFieldsData]);

    // Filter out metadata keys and prepare display entries
    const displayEntries = useMemo(() => {
        return Object.entries(actualResponses)
            .map(([key, value]) => {
                const fieldInfo = fieldLabelMap.get(key);
                const label = fieldInfo?.label || key.replace(/_/g, ' ');
                const type = fieldInfo?.type || 'text';
                return { key, label, value, type };
            });
    }, [actualResponses, fieldLabelMap]);

    const hasResponses = displayEntries.length > 0;

    const renderValue = (value: any, type: string) => {
        if (value === null || value === undefined || value === '') {
            return <span className="text-slate-400 italic">No response</span>;
        }
        if (Array.isArray(value)) {
            return (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((v, i) => (
                        <span key={i} className="inline-flex px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-100">
                            {String(v)}
                        </span>
                    ))}
                </div>
            );
        }
        if (typeof value === 'string' && value.startsWith('http')) {
            if (type === 'file' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value)) {
                return (
                    <div className="space-y-2">
                        <img src={value} alt="Upload" className="max-w-full h-auto max-h-40 rounded-lg border border-slate-200 object-cover" />
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs inline-flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> View full file
                        </a>
                    </div>
                );
            }
            return (
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all inline-flex items-center gap-1">
                    {value} <ExternalLink className="w-3 h-3" />
                </a>
            );
        }
        if (typeof value === 'boolean') {
            return value ? (
                <span className="inline-flex items-center gap-1.5 text-green-700"><CheckCircle className="w-3.5 h-3.5" /> Yes</span>
            ) : (
                <span className="inline-flex items-center gap-1.5 text-red-600"><XCircle className="w-3.5 h-3.5" /> No</span>
            );
        }
        if (typeof value === 'object') {
            return <pre className="text-xs bg-slate-50 p-2 rounded-lg overflow-auto max-h-32">{JSON.stringify(value, null, 2)}</pre>;
        }
        return <span>{String(value)}</span>;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Submission Details">
            <div className="space-y-8">
                {/* Header/Hero Section */}
                <div className="flex flex-col md:flex-row gap-6 items-start pb-6 border-b border-slate-100">
                    <div className="relative group">
                        <img
                            src={submission.image}
                            alt={submission.title}
                            className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-lg"
                        />
                        <div className="absolute inset-0 rounded-2xl bg-black/5 group-hover:bg-transparent transition-colors" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${(statusConfig[submission.status] || statusConfig['Pending']).color}`}>
                                {(statusConfig[submission.status] || statusConfig['Pending']).icon}
                                {submission.status}
                            </span>
                            {submission.paymentStatus && (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${(paymentStatusConfig[String(submission.paymentStatus).toLowerCase()] || paymentStatusConfig['pending']).color}`}>
                                    {(paymentStatusConfig[String(submission.paymentStatus).toLowerCase()] || paymentStatusConfig['pending']).label}
                                </span>
                            )}
                            <span className="text-xs text-slate-400 font-medium">#{submission.id.split('-')[1]}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 leading-tight">{submission.title}</h2>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                <User className="w-4 h-4 text-indigo-500" />
                                {submission.applicant}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                {submission.date}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Tabs/Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Main Info */}
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Tag className="w-3 h-3" /> Core Information
                            </h4>
                            <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
                                <div className="flex justify-between items-center py-2 border-b border-slate-200/50 last:border-0">
                                    <span className="text-sm text-slate-500">Category</span>
                                    <span className="text-sm font-bold text-slate-900">{submission.category}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-200/50 last:border-0">
                                    <span className="text-sm text-slate-500">Average Score</span>
                                    <span className="text-sm font-bold text-slate-900">{submission.score || '--'}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-200/50 last:border-0">
                                    <span className="text-sm text-slate-500">Public Votes</span>
                                    <span className="text-sm font-bold text-indigo-600">{submission.votes || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Gavel className="w-3 h-3" /> Assigned Judges
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {(submission.assignedJudges || []).length > 0 ? (
                                    submission.assignedJudges?.map((jid) => (
                                        <div key={jid} className="px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-sm text-slate-600 shadow-sm hover:border-indigo-200 transition-colors cursor-default">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            {judgeNameById?.get(jid) ?? `${jid.substring(0, 8)}…`}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-slate-400 italic bg-slate-50 w-full p-4 rounded-xl border border-dashed border-slate-200 text-center">
                                        No judges assigned to this entry yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Form Responses */}
                    <div className="space-y-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileText className="w-3 h-3" /> Form Responses
                            {displayEntries.length > 0 && (
                                <span className="ml-auto text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {displayEntries.length} fields
                                </span>
                            )}
                        </h4>
                        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {hasResponses ? (
                                displayEntries.map(({ key, label, value, type }) => (
                                    <div key={key} className="group">
                                        <div className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 flex items-center justify-between group-hover:text-indigo-500 transition-colors">
                                            <span className="truncate">{label}</span>
                                            {type && <span className="text-[9px] font-medium text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">{type}</span>}
                                        </div>
                                        <div className="text-sm text-slate-700 bg-white p-3 rounded-xl border border-slate-200 group-hover:border-indigo-100 group-hover:bg-indigo-50/20 transition-all shadow-sm">
                                            {renderValue(value, type)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-sm">No detailed form responses available.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};
