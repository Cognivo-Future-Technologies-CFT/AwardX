
import React from 'react';
import { Modal } from '../Modal';
import { Submission } from '../../services/models';
import { User, Mail, Calendar, Tag, FileText, CheckCircle, XCircle, Clock, Gavel, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SubmissionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    submission: Submission | null;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({ isOpen, onClose, submission }) => {
    if (!submission) return null;

    const statusColors: any = {
        'Shortlisted': 'text-purple-600 bg-purple-50 border-purple-100',
        'Accepted': 'text-green-600 bg-green-50 border-green-100',
        'Rejected': 'text-red-600 bg-red-50 border-red-100',
        'Pending': 'text-slate-600 bg-slate-50 border-slate-100',
        'Under Review': 'text-blue-600 bg-blue-50 border-blue-100',
    };

    const responses = submission.submissionData?.responses || {};
    const hasResponses = Object.keys(responses).length > 0;

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
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusColors[submission.status]}`}>
                                {submission.status}
                            </span>
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
                                            {jid.substring(0, 8)}...
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
                        </h4>
                        <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                            {hasResponses ? (
                                Object.entries(responses).map(([key, value]: [string, any]) => (
                                    <div key={key} className="group">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex justify-between group-hover:text-indigo-500 transition-colors">
                                            <span>{key.replace(/_/g, ' ')}</span>
                                            {typeof value === 'string' && value.startsWith('http') && <ExternalLink className="w-3 h-3" />}
                                        </div>
                                        <div className="text-sm text-slate-700 bg-white p-3 rounded-xl border border-slate-200 group-hover:border-indigo-100 group-hover:bg-indigo-50/20 transition-all shadow-sm">
                                            {typeof value === 'string' ? (
                                                value.startsWith('http') ? (
                                                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all inline-flex items-center gap-1">
                                                        {value}
                                                    </a>
                                                ) : value
                                            ) : JSON.stringify(value)}
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
                    <button
                        className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                        Edit Submission
                    </button>
                </div>
            </div>
        </Modal>
    );
};
