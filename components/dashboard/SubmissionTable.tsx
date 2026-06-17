
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '../ConfirmDialog';
import { Filter, Download, Eye, ImageIcon, Calendar, Search, ChevronDown, ChevronLeft, ChevronRight, User, UserX, Plus, Trash2, CheckCircle, XCircle, Gavel, ArrowUpDown, MoreVertical, Sparkles, LayoutTemplate, AlertCircle, ExternalLink } from 'lucide-react';

import { db } from '../../services/database';
import { Program, Submission } from '../../services/models';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { motion, AnimatePresence } from 'framer-motion';
import { SubmissionReviewSheet } from './SubmissionReviewSheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '../SkeletonLoader';
import { realtime } from '../../services/supabase';
import { queryKeys } from '../../services/queryKeys';
import { getProgramFormSetupState } from '../../lib/programFormSetup';

const StatusBadge = ({ status }: { status: string }) => {
   const variants: Record<string, { container: string; icon: React.ReactNode; dot: string }> = {
      'Shortlisted': {
         container: 'bg-purple-50 text-purple-700 border-purple-100/50',
         icon: <Gavel className="w-3 h-3" />,
         dot: 'bg-purple-400'
      },
      'Accepted': {
         container: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
         icon: <CheckCircle className="w-3 h-3" />,
         dot: 'bg-emerald-400'
      },
      'Rejected': {
         container: 'bg-rose-50 text-rose-700 border-rose-100/50',
         icon: <XCircle className="w-3 h-3" />,
         dot: 'bg-rose-400'
      },
      'Pending': {
         container: 'bg-slate-50 text-slate-600 border-slate-200/50',
         icon: <Calendar className="w-3 h-3" />,
         dot: 'bg-slate-400'
      },
      'Under Review': {
         container: 'bg-blue-50 text-blue-700 border-blue-100/50',
         icon: <Search className="w-3 h-3" />,
         dot: 'bg-blue-400'
      },
   };

   const variant = variants[status] || variants['Pending'];

   return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border leading-none tracking-tight ${variant.container}`}>
         {variant.icon}
         {status}
      </span>
   );
};

interface SubmissionTableProps {
   activeEvent?: Program | null;
   onNavigate?: (view: string) => void;
}

type FormFieldColumn = {
   id: string;
   label: string;
   type: string;
};

const getSubmissionResponses = (sub: Submission): Record<string, unknown> => {
   const data = sub.submissionData || {};
   if (data.responses && typeof data.responses === 'object') {
      return data.responses as Record<string, unknown>;
   }
   return data as Record<string, unknown>;
};

const formatSubmissionFieldValue = (value: unknown): string => {
   if (value == null || value === '') return '—';
   if (Array.isArray(value)) return value.join(', ');
   if (typeof value === 'object') return JSON.stringify(value);
   return String(value);
};

const DISPLAY_FIELD_TYPES = new Set([
   'text',
   'textarea',
   'email',
   'phone',
   'number',
   'select',
   'radio',
   'checkbox',
   'url',
   'date',
   'time',
   'datetime',
   'country',
   'currency',
   'rating',
   'tags',
   'multi_select',
   'multiselect',
   'award_selector',
   'file',
   'image',
   'video',
   'link',
]);

const FILE_FIELD_TYPES = new Set(['file', 'image', 'video']);

const renderFieldCell = (type: string, value: unknown): React.ReactNode => {
console.log('FIELD TYPE:', type);
console.log('FIELD VALUE:', value);

if (typeof value === 'object' && value !== null) {
  console.log('FIELD OBJECT:', JSON.stringify(value, null, 2));
}
   if (value == null || value === '') return <span className="text-slate-300">—</span>;

   // File-like values may be { url, name } or string URLs
   if (FILE_FIELD_TYPES.has(type)) {
      const items: Array<{ url?: string; name?: string }> = Array.isArray(value)
         ? value.map((v) => (typeof v === 'string' ? { url: v, name: v } : v))
         : typeof value === 'string'
         ? [{ url: value, name: value }]
         : [value as any];

      return (
         <div className="flex items-center gap-1.5">
            {items.slice(0, 3).map((item, idx) => {
               const url = item?.url || (typeof item === 'string' ? item : undefined);
               const name = item?.name || url?.split('/').pop() || `file ${idx + 1}`;
if (type === 'image' && url) {
  return (
    <a
      key={idx}
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 text-[11px] font-semibold text-slate-700 hover:text-indigo-700 max-w-[180px] truncate"
      title={name}
    >
      <ImageIcon className="w-3 h-3 shrink-0" />
      <span className="truncate">{name}</span>
    </a>
  );
}
               return (
                  <a
                     key={idx}
                     href={url}
                     target="_blank"
                     rel="noreferrer"
                     className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 text-[11px] font-semibold text-slate-700 hover:text-indigo-700 max-w-[140px] truncate"
                     title={name}
                  >
                     <ExternalLink className="w-3 h-3 shrink-0" />
                     <span className="truncate">{name}</span>
                  </a>
               );
            }
            )}
            {items.length > 3 && (
               <span className="text-[10px] font-bold text-slate-500">+{items.length - 3}</span>
            )}
         </div>
      );
   }

   if (type === 'url' || type === 'link') {
      const href = String(value);
      return (
         <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 max-w-[180px] truncate"
         >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{href.replace(/^https?:\/\//, '')}</span>
         </a>
      );
   }

   if (type === 'date' || type === 'datetime') {
      const d = new Date(String(value));
      if (!isNaN(d.getTime())) {
         return <span className="text-[12px] font-medium text-slate-700">{d.toLocaleDateString()}</span>;
      }
   }

   if (Array.isArray(value)) {
      return (
         <div className="flex flex-wrap gap-1 max-w-[220px]">
            {(value as unknown[]).slice(0, 4).map((v, i) => (
               <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  {String(v)}
               </span>
            ))}
            {(value as unknown[]).length > 4 && (
               <span className="text-[10px] font-bold text-slate-500">+{(value as unknown[]).length - 4}</span>
            )}
         </div>
      );
   }

   if (typeof value === 'boolean') {
      return value ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-300" />;
   }

   if (typeof value === 'object') {
      return <span className="text-[11px] font-mono text-slate-500 max-w-[180px] truncate inline-block">{JSON.stringify(value)}</span>;
   }

   return <span className="text-[12px] text-slate-700">{String(value)}</span>;
};

// Renders an editable input for a single form field inside the manual-entry modal.
// All state is controlled via the `value` / `onChange` parameters.
const renderManualEntryField = (
   field: { id: string; label: string; type: string; required?: boolean; config?: Record<string, unknown> },
   value: unknown,
   onChange: (val: unknown) => void,
): React.ReactNode => {
   const opts: string[] = (field.config?.options as string[] | undefined) || [];
   const placeholder = (field.config?.placeholder as string | undefined) || '';
   const cls =
      'w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-sm transition-all';

   switch (field.type) {
      case 'textarea':
         return (
            <textarea
               className={`${cls} h-auto py-3 min-h-[80px] resize-none`}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder || `Enter ${field.label.toLowerCase()}…`}
               required={field.required}
            />
         );

      case 'select':
      case 'award_selector':
         return (
            <select
               className={`${cls} bg-white`}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value)}
               required={field.required}
            >
               <option value="">Select an option…</option>
               {opts.map((opt) => (
                  <option key={opt} value={opt}>
                     {opt}
                  </option>
               ))}
            </select>
         );

      case 'radio':
         return (
            <div className="space-y-2 pt-1">
               {opts.map((opt) => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer">
                     <input
                        type="radio"
                        name={`field-${field.id}`}
                        value={opt}
                        checked={value === opt}
                        onChange={() => onChange(opt)}
                        className="w-4 h-4 accent-indigo-600"
                     />
                     <span className="text-sm font-medium text-slate-700">{opt}</span>
                  </label>
               ))}
            </div>
         );

      case 'checkbox':
      case 'multi_select':
      case 'multiselect': {
         const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
         const toggleOpt = (opt: string) => {
            const next = selected.includes(opt)
               ? selected.filter((v) => v !== opt)
               : [...selected, opt];
            onChange(next);
         };
         return (
            <div className="space-y-2 pt-1">
               {opts.map((opt) => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer">
                     <input
                        type="checkbox"
                        checked={selected.includes(opt)}
                        onChange={() => toggleOpt(opt)}
                        className="w-4 h-4 rounded accent-indigo-600"
                     />
                     <span className="text-sm font-medium text-slate-700">{opt}</span>
                  </label>
               ))}
            </div>
         );
      }

      case 'date':
         return (
            <input
               type="date"
               className={cls}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value)}
               required={field.required}
            />
         );

      case 'time':
         return (
            <input
               type="time"
               className={cls}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value)}
               required={field.required}
            />
         );

      case 'number':
      case 'currency':
         return (
            <input
               type="number"
               className={cls}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value !== '' ? Number(e.target.value) : '')}
               placeholder={placeholder || '0'}
               required={field.required}
            />
         );

      case 'rating':
         return (
            <input
               type="number"
               min="1"
               max="5"
               className={cls}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value !== '' ? Number(e.target.value) : '')}
               placeholder="1 – 5"
               required={field.required}
            />
         );

      case 'url':
      case 'link':
      case 'file':
      case 'image':
      case 'video':
         return (
            <input
               type="url"
               className={cls}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder || 'https://'}
               required={field.required}
            />
         );

      case 'email':
         return (
            <input
               type="email"
               className={cls}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder || 'email@example.com'}
               required={field.required}
            />
         );

      case 'phone':
         return (
            <input
               type="tel"
               className={cls}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder || '+1 234 567 8900'}
               required={field.required}
            />
         );

      default: // text, country, tags, etc.
         return (
            <input
               type="text"
               className={cls}
               value={String(value ?? '')}
               onChange={(e) => onChange(e.target.value)}
               placeholder={placeholder || `Enter ${field.label.toLowerCase()}…`}
               required={field.required}
            />
         );
   }
};

export const SubmissionTable: React.FC<SubmissionTableProps> = ({ activeEvent, onNavigate }) => {
   const queryClient = useQueryClient();
   const { confirm, ConfirmDialogNode } = useConfirm();
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isJudgeModalOpen, setIsJudgeModalOpen] = useState(false);
   const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
   const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
   const [newSub, setNewSub] = useState<{
      applicantName: string;
      applicantEmail: string;
      status: Submission['status'];
      responses: Record<string, unknown>;
   }>({ applicantName: '', applicantEmail: '', status: 'Pending', responses: {} });
   const [selectedIds, setSelectedIds] = useState<string[]>([]);
   const [selectedJudgesForBulk, setSelectedJudgesForBulk] = useState<string[]>([]);
   const [isBulkProcessing, setIsBulkProcessing] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [debouncedSearch, setDebouncedSearch] = useState('');
   const [page, setPage] = useState(1);
   const pageSize = 15;

   useEffect(() => {
      const timer = window.setTimeout(() => {
         setDebouncedSearch(searchTerm.trim());
      }, 300);

      return () => {
         window.clearTimeout(timer);
      };
   }, [searchTerm]);

   useEffect(() => {
      setPage(1);
   }, [debouncedSearch, activeEvent?.id]);

   useEffect(() => {
      setSelectedIds([]);
   }, [page]);

   const formsQuery = useQuery({
      queryKey: queryKeys.forms.byProgram(activeEvent?.id ?? ''),
      queryFn: () => db.getForms(activeEvent!.id),
      enabled: !!activeEvent?.id,
      staleTime: 30_000,
   });

   const activeFormQuery = useQuery({
      queryKey: queryKeys.programForms.active(activeEvent?.id ?? ''),
      queryFn: () => db.getActiveFormForProgram(activeEvent!.id),
      enabled: !!activeEvent?.id,
      staleTime: 30_000,
   });

   const forms = formsQuery.data || [];
   const activeFormId = activeFormQuery.data ?? activeEvent?.activeFormId ?? null;
   const formSetup = getProgramFormSetupState(forms, activeFormId);
   const canViewSubmissions = formSetup.status === 'ready';

   const formFieldsQuery = useQuery({
      queryKey: queryKeys.forms.fields(activeFormId ?? ''),
      queryFn: () => db.getFormFields(activeFormId!),
      enabled: !!activeFormId,
      staleTime: 30_000,
   });

   const responseColumns = useMemo<FormFieldColumn[]>(() => {
      const fields = (formFieldsQuery.data || []) as Array<{ id: string; label: string; type: string }>;
      // Show every field from the active form; the table scrolls horizontally to fit.
      return fields
         .filter((field) => DISPLAY_FIELD_TYPES.has(field.type))
         .map((field) => ({
            id: field.id,
            label: field.label,
            type: field.type,
         }));
   }, [formFieldsQuery.data]);

   const submissionsQuery = useQuery({
      queryKey: queryKeys.submissions.paginated(activeEvent?.id ?? 'all', page, debouncedSearch),
      queryFn: () => db.getSubmissionsPaginated({
         programId: activeEvent?.id,
         formId: activeFormId,
         page,
         pageSize,
         search: debouncedSearch,
      }),
      enabled: !!activeEvent?.id && canViewSubmissions,
      staleTime: 30_000,
   });

   const judgesQuery = useQuery({
      queryKey: queryKeys.judges.all(activeEvent?.id ?? 'all'),
      queryFn: () => db.getJudges(activeEvent?.id),
      staleTime: 30_000,
   });

   useEffect(() => {
      if (!activeEvent?.id) return;

      const channel = realtime.subscribeToSubmissions(activeEvent.id, () => {
         queryClient.invalidateQueries({ queryKey: queryKeys.submissions.paginated(activeEvent.id, page, debouncedSearch) });
      });

      return () => {
         realtime.unsubscribe(channel);
      };
   }, [activeEvent?.id, queryClient, page, debouncedSearch]);

   useEffect(() => {
      if (submissionsQuery.isError) {
         const message =
            submissionsQuery.error instanceof Error
               ? submissionsQuery.error.message
               : 'Failed to load submissions';
         toast.error(message);
      }
   }, [submissionsQuery.isError, submissionsQuery.error]);

   const submissions = submissionsQuery.data?.items || [];
   const judges = judgesQuery.data || [];
   const total = submissionsQuery.data?.total || 0;
   const totalPages = Math.max(1, Math.ceil(total / pageSize));
   const tableColumnCount = 8 + responseColumns.length;
   const isLoading = submissionsQuery.isLoading || judgesQuery.isLoading;
   const isSearching = debouncedSearch.length > 0;

   const visiblePageNumbers = useMemo(() => {
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, start + 4);
      return Array.from({ length: end - start + 1 }).map((_, idx) => start + idx);
   }, [page, totalPages]);

   const showingStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
   const showingEnd = Math.min(page * pageSize, total);

   const refreshSubmissions = async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.submissions.paginated(activeEvent?.id ?? 'all', page, debouncedSearch) });
      setSelectedIds([]);
   };

   const renderFormSetupGate = () => {
      if (formsQuery.isLoading || activeFormQuery.isLoading) {
         return (
            <div className="flex flex-1 items-center justify-center p-12">
               <TableSkeleton rows={4} columns={1} />
            </div>
         );
      }

      if (formSetup.status === 'no_forms') {
         return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
               <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <LayoutTemplate className="h-8 w-8" />
               </div>
               <div className="max-w-md space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">Create a submission form first</h2>
                  <p className="text-sm text-slate-500">
                     Submissions are collected through your program form. Build one in Form Builder, then select it for this event.
                  </p>
               </div>
               <Button onClick={() => onNavigate?.('templates')}>
                  <Plus className="mr-2 h-4 w-4" /> Create Form
               </Button>
            </div>
         );
      }

      if (formSetup.status === 'no_selection' || formSetup.status === 'invalid_selection') {
         return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
               <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <AlertCircle className="h-8 w-8" />
               </div>
               <div className="max-w-md space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">Select a submission form</h2>
                  <p className="text-sm text-slate-500">{formSetup.message}</p>
               </div>
               <Button onClick={() => onNavigate?.('templates')}>
                  <LayoutTemplate className="mr-2 h-4 w-4" /> Go to Form Builder
               </Button>
            </div>
         );
      }

      if (formSetup.status === 'unpublished') {
         return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
               <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <AlertCircle className="h-8 w-8" />
               </div>
               <div className="max-w-md space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">Publish your submission form</h2>
                  <p className="text-sm text-slate-500">{formSetup.message}</p>
               </div>
               <Button onClick={() => onNavigate?.('templates')}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Publish Form
               </Button>
            </div>
         );
      }

      return null;
   };

   const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSub.applicantName.trim()) return;
      if (!activeEvent?.id) {
         toast.error('Select a program before creating a submission');
         return;
      }

      // Derive a display title from form responses (look for a title-like field) or fall back to applicant name
      const rawFields = (formFieldsQuery.data || []) as Array<{ id: string; label: string; type: string }>;
      const titleField = rawFields.find(
         (f) => /title|project|submission/i.test(f.label) && (f.type === 'text' || f.type === 'textarea'),
      );
      const title =
         (titleField && String(newSub.responses[titleField.id] ?? '').trim()) ||
         newSub.applicantName.trim();

      try {
         await db.addSubmission({
            title,
            applicant: newSub.applicantName.trim(),
            applicantEmail: newSub.applicantEmail.trim(),
            category: 'General',
            status: newSub.status,
            programId: activeEvent.id,
            responses: newSub.responses,
         });
         await refreshSubmissions();
         setIsModalOpen(false);
         setNewSub({ applicantName: '', applicantEmail: '', status: 'Pending', responses: {} });
         toast.success('Submission created');
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Failed to create submission';
         toast.error(message);
      }
   };

   const handleView = (submission: Submission) => {
      setSelectedSubmission(submission);
      setIsDetailModalOpen(true);
   };

   const toggleSelection = (id: string) => {
      setSelectedIds(prev =>
         prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
   };

   const toggleSelectAll = () => {
      if (selectedIds.length === submissions.length) {
         setSelectedIds([]);
      } else {
         setSelectedIds(submissions.map(s => s.id));
      }
   };

   const handleBulkAction = async (action: 'Accept' | 'Reject' | 'Delete' | 'Shortlist' | 'AssignJudge' | 'UnassignJudge') => {
      if (selectedIds.length === 0) return;

      if (action === 'AssignJudge') {
         setIsJudgeModalOpen(true);
         return;
      }

      if (action === 'UnassignJudge') {
         setIsBulkProcessing(true);
         try {
            await db.unassignJudgesFromSubmissions(selectedIds);
            await refreshSubmissions();
         } finally {
            setIsBulkProcessing(false);
         }
         return;
      }

      if (action === 'Delete') {
         const ok = await confirm({
           title: `Delete ${selectedIds.length} submission${selectedIds.length > 1 ? 's' : ''}?`,
           description: 'This action cannot be undone. All associated data including scores and judge comments will be removed.',
           confirmLabel: `Delete ${selectedIds.length} submission${selectedIds.length > 1 ? 's' : ''}`,
         });
         if (!ok) return;
      }

      if (!activeEvent?.id) {
         toast.error('Select a program before updating submissions');
         return;
      }

      setIsBulkProcessing(true);
      try {
         if (action === 'Delete') {
            await db.deleteSubmissions(selectedIds, activeEvent.id);
         } else {
            const statusMap: any = { 'Accept': 'Accepted', 'Reject': 'Rejected', 'Shortlist': 'Shortlisted' };
            await db.bulkUpdateSubmissions(selectedIds, { status: statusMap[action] } as any, activeEvent.id);
         }
         await refreshSubmissions();
      } catch (error) {
         const message = error instanceof Error ? error.message : 'Bulk action failed';
         toast.error(message);
      } finally {
         setIsBulkProcessing(false);
      }
   };

   const handleAssignJudges = async () => {
      if (selectedJudgesForBulk.length > 0 && selectedIds.length > 0) {
         await db.assignJudgesToSubmissions(selectedIds, selectedJudgesForBulk);
         await refreshSubmissions();
         setIsJudgeModalOpen(false);
         setSelectedJudgesForBulk([]);
      }
   };

   const handleExportCsv = async () => {
      const exported = await db.getSubmissionsPaginated({
         programId: activeEvent?.id,
         formId: activeFormId,
         page: 1,
         pageSize: 1000,
         search: debouncedSearch,
      });

      if (exported.items.length === 0) {
         return;
      }

      const header = [
         'applicant',
         'category',
         'status',
         'score',
         'date',
         ...responseColumns.map((column) => column.label),
      ];
      const rows = exported.items.map((item) => {
         const responses = getSubmissionResponses(item);
         return [
            item.applicant,
            item.category,
            item.status,
            item.score ?? '',
            item.date,
            ...responseColumns.map((column) => formatSubmissionFieldValue(responses[column.id])),
         ];
      });

      const csv = [header, ...rows]
         .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
         .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeEvent?.title || 'submissions'}-export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
   };

   return (
      <div data-demo-target="demo-submissions-table" className="flex h-full min-h-0 w-full flex-col gap-4 px-4 pb-6 pt-4 lg:px-6">
         {ConfirmDialogNode}
         {/* Header */}
         <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1">
               <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Submission workspace
               </div>
               <h1 className="text-2xl font-black tracking-tight text-slate-950 lg:text-3xl">Submissions</h1>
               <p className="text-sm text-slate-500">
                  Review entries, assess status, and take action across the full program table.
               </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
               <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-700">{total}</div>
                  <div className="leading-tight">
                     <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</div>
                     <div className="text-xs font-semibold text-slate-700">{selectedIds.length} selected</div>
                  </div>
               </div>
               <button
                  onClick={handleExportCsv}
                  className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
               >
                  <Download className="h-4 w-4 text-slate-400" /> Export CSV
               </button>
               <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={!canViewSubmissions}
                  className="flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
               >
                  <Plus className="h-4 w-4" /> Add Submission
               </button>
            </div>
         </div>

         {canViewSubmissions && formSetup.activeForm && (
            <div className="flex shrink-0 items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
               <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Submission form</p>
                  <p className="truncate text-sm font-semibold text-slate-800">{formSetup.activeForm.title || 'Untitled form'}</p>
               </div>
               <button
                  type="button"
                  onClick={() => onNavigate?.('templates')}
                  className="shrink-0 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
               >
                  Edit form
               </button>
            </div>
         )}

         <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!canViewSubmissions ? (
               renderFormSetupGate()
            ) : (
            <>
            {/* Premium Toolbar */}
            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center">
               <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                     type="text"
                     placeholder="Search projects, applicants, or IDs..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm font-medium placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
               </div>
               <div className="flex gap-2">
                  <button className="h-11 px-4 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 font-bold flex items-center gap-2.5 hover:bg-slate-50 transition-all hover:border-slate-300">
                     <Filter className="w-4 h-4 text-slate-500" />
                     Filter
                     <span className="w-5 h-5 bg-slate-100 text-slate-500 rounded-md text-[10px] flex items-center justify-center ml-1">0</span>
                     <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button className="h-11 w-11 bg-white border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-all">
                     <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  </button>
               </div>
            </div>

            {/* Mobile Card List */}
            <div className="min-h-0 flex-1 overflow-y-auto md:hidden divide-y divide-slate-100">
               {isLoading && (
                  <div className="p-4">
                     <TableSkeleton rows={4} columns={1} />
                  </div>
               )}
               {!isLoading && submissions.map((sub) => (
                  <div key={sub.id} className="p-4 space-y-3">
                     <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                           <input
                              type="checkbox"
                              className="mt-1 w-4.5 h-4.5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                              checked={selectedIds.includes(sub.id)}
                              onChange={() => toggleSelection(sub.id)}
                           />
                           <div className="min-w-0">
                              <button
                                 onClick={() => handleView(sub)}
                                 className="block truncate text-left text-sm font-extrabold text-slate-900 hover:text-indigo-600"
                              >
                                 {sub.title}
                              </button>
                              <p className="mt-0.5 truncate text-xs text-slate-500">{sub.applicant}</p>
                           </div>
                        </div>
                        <StatusBadge status={sub.status} />
                     </div>

                     <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                           <p className="font-bold uppercase tracking-wide text-slate-500">Category</p>
                           <p className="mt-1 font-semibold text-slate-700">{sub.category}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                           <p className="font-bold uppercase tracking-wide text-slate-500">Score</p>
                           <p className="mt-1 font-semibold text-slate-700">{sub.score ? `${sub.score}/100` : '--'}</p>
                        </div>
                     </div>

                     <div className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-500">
                           {(sub.assignedJudges || []).length} judge{(sub.assignedJudges || []).length === 1 ? '' : 's'} assigned
                        </p>
                        <button
                           onClick={() => handleView(sub)}
                           className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
                        >
                           <Eye className="w-3.5 h-3.5" /> View
                        </button>
                     </div>
                  </div>
               ))}
               {!isLoading && submissions.length === 0 && (
                  <div className="p-10 text-center">
                     <div className="text-lg font-extrabold text-slate-900">
                        {isSearching ? 'No matching entries' : 'No entries found'}
                     </div>
                     <p className="mt-1 text-sm text-slate-500 font-medium">
                        {isSearching
                           ? 'Try a different keyword for title, applicant name, or email.'
                           : 'There are currently no submissions for this program workspace.'}
                     </p>
                     <Button onClick={() => setIsModalOpen(true)} size="sm" className="mt-4">Create First Entry</Button>
                  </div>
               )}
            </div>

            {/* Desktop Table — horizontally scrollable to fit all dynamic form columns */}
            <div className="hidden min-h-0 flex-1 overflow-auto md:block submission-scroll">
               <table className="min-w-max w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/70">
                     <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        <th className="p-5 w-16 text-center sticky left-0 z-20 bg-slate-50/95 supports-[backdrop-filter]:bg-slate-50/70 backdrop-blur">
                           <div className="flex justify-center">
                              <input
                                 type="checkbox"
                                 className="w-4.5 h-4.5 cursor-pointer rounded-md border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500"
                                 checked={selectedIds.length === submissions.length && submissions.length > 0}
                                 onChange={toggleSelectAll}
                              />
                           </div>
                        </th>
                        <th className="p-5 sticky left-16 z-20 bg-slate-50/95 supports-[backdrop-filter]:bg-slate-50/70 backdrop-blur whitespace-nowrap min-w-[240px] border-r border-slate-100/80">Submission</th>
                        {responseColumns.map((column) => (
                           <th key={column.id} className="p-5 whitespace-nowrap min-w-[160px]">
                              <span className="flex items-center gap-1.5">
                                 {column.label}
                                 <span className="text-[8px] font-mono text-slate-400 normal-case tracking-normal bg-slate-200/60 px-1 py-0.5 rounded">{column.type}</span>
                              </span>
                           </th>
                        ))}
                        {/* <th className="p-5 whitespace-nowrap">Category</th>
                        <th className="p-5 whitespace-nowrap">Status</th> */}
                        <th className="p-5 whitespace-nowrap">Judges</th>
                        <th className="p-5 whitespace-nowrap">Score</th>
                        <th className="p-5 whitespace-nowrap">Date</th>
                        <th className="p-5 text-right whitespace-nowrap sticky right-0 z-20 bg-slate-50/95 supports-[backdrop-filter]:bg-slate-50/70 backdrop-blur border-l border-slate-100/80">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {isLoading && (
                        <tr>
                           <td colSpan={tableColumnCount}>
                              <TableSkeleton rows={6} columns={tableColumnCount} />
                           </td>
                        </tr>
                     )}
                     {!isLoading && submissions.map((sub, rowIndex) => {
                        const responses = getSubmissionResponses(sub);
                        const selected = selectedIds.includes(sub.id);
                        const rowBg = selected ? 'bg-indigo-50/60' : 'bg-white';
                        return (
                        <tr
                           key={sub.id}
                           data-demo-target={rowIndex === 0 ? 'demo-submission-row-1' : undefined}
                           className={`group border-b border-slate-50 transition-all hover:bg-slate-50/70 ${selected ? 'bg-indigo-50/50' : ''}`}
                        >
                           <td className={`p-5 text-center sticky left-0 z-10 ${rowBg} group-hover:bg-slate-50/95`}>
                              <div className="flex justify-center">
                                 <input
                                    type="checkbox"
                                    className="w-4.5 h-4.5 cursor-pointer rounded-md border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500"
                                    checked={selected}
                                    onChange={() => toggleSelection(sub.id)}
                                 />
                              </div>
                           </td>
                           <td className={`p-5 sticky left-16 z-10 min-w-[240px] border-r border-slate-100/80 ${rowBg} group-hover:bg-slate-50/95`}>
                              <div className="flex items-center gap-4">
                                 <div className="relative group/image shrink-0">
                                    {sub.image ? (
                                       <img src={sub.image} alt="" className="h-11 w-11 rounded-2xl object-cover border border-slate-200/60 shadow-sm" />
                                    ) : (
                                       <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-100">
                                          <Sparkles className="w-5 h-5 text-slate-400" />
                                       </div>
                                    )}
                                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-black/5 opacity-0 transition-opacity group-hover/image:opacity-100"></div>
                                 </div>
                                 <div className="min-w-0 space-y-0.5">
                                    <button
                                       type="button"
                                       onClick={() => handleView(sub)}
                                       title={sub.title}
                                       className="text-left cursor-pointer text-[15px] font-extrabold text-slate-900 transition-colors group-hover:text-indigo-600 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded line-clamp-1"
                                       data-no-press
                                    >
                                       {sub.title}
                                    </button>
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                       <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                       {sub.applicant}
                                    </div>
                                 </div>
                              </div>
                           </td>
                           {responseColumns.map((column) => (
                              <td key={column.id} className="p-5 align-middle min-w-[160px]">
                                 {renderFieldCell(column.type, responses[column.id])}
                              </td>
                           ))}
                           {/* <td className="p-5">
                              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm shadow-slate-50">
                                 {sub.category}
                              </div>
                           </td>
                           <td className="p-5">
                              <StatusBadge status={sub.status} />
                           </td> */}
                           <td className="p-5">
                              <div className="flex items-center -space-x-2">
                                 {(sub.assignedJudges || []).length > 0 ? (
                                    <>
                                       {(sub.assignedJudges || []).slice(0, 3).map((jid, i) => {
                                          const j = judges.find(judge => judge.id === jid);
                                          return j ? (
                                             j.avatar ? (
                                                <img key={i} src={j.avatar} className="w-7 h-7 rounded-full border-2 border-white ring-1 ring-slate-100 shadow-sm object-cover" title={j.name} alt="" />
                                             ) : (
                                                <div key={i} className="w-7 h-7 rounded-full border-2 border-white ring-1 ring-slate-100 shadow-sm bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold" title={j.name}>
                                                   {j.name?.charAt(0).toUpperCase() || 'J'}
                                                </div>
                                             )
                                          ) : null;
                                       })}
                                       {(sub.assignedJudges || []).length > 3 && (
                                          <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center text-[9px] text-slate-500 font-bold shadow-sm">
                                             +{(sub.assignedJudges?.length || 0) - 3}
                                          </div>
                                       )}
                                    </>
                                 ) : (
                                    <div className="flex items-center gap-1.5 text-[11px] italic font-medium text-slate-400">
                                       <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                       Unassigned
                                    </div>
                                 )}
                              </div>
                           </td>
                           <td className="p-5">
                              {sub.score ? (
                                 <div className="space-y-1.5">
                                    <div className="flex items-baseline gap-0.5">
                                       <span className="text-[17px] font-black tracking-tighter text-slate-950">{sub.score}</span>
                                       <span className="text-[10px] font-bold text-slate-400">/100</span>
                                    </div>
                                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                       <div
                                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                                          style={{ width: `${Math.max(0, Math.min(100, sub.score))}%` }}
                                       />
                                    </div>
                                 </div>
                              ) : (
                                 <span className="text-sm font-medium text-slate-300">--</span>
                              )}
                           </td>
                           <td className="p-5">
                              <div className="flex flex-col">
                                 <div className="text-xs font-bold tracking-tight text-slate-900">
                                    {sub.date.split('-').slice(1).join('/')}/{sub.date.split('-')[0].slice(2)}
                                 </div>
                                 <div className="text-[10px] font-medium capitalize text-slate-400">
                                    Submitted
                                 </div>
                              </div>
                           </td>
                           <td className={`p-5 text-right sticky right-0 z-10 border-l border-slate-100/80 ${rowBg} group-hover:bg-slate-50/95`}>
                              <div className="flex items-center justify-end gap-1.5">
                                 <button
                                    onClick={() => handleView(sub)}
                                    className="rounded-xl border border-transparent p-2 text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-indigo-600 hover:shadow-sm"
                                    title="View Details"
                                 >
                                    <Eye className="w-4.5 h-4.5" />
                                 </button>
                                 <button
                                    className="rounded-xl border border-transparent p-2 text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                                    title="More Actions"
                                 >
                                    <MoreVertical className="w-4.5 h-4.5" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                        );
                     })}
                     {!isLoading && submissions.length === 0 && (
                        <tr>
                           <td colSpan={tableColumnCount} className="p-20 text-center">
                              <div className="max-w-xs mx-auto space-y-4">
                                 <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                    <Search className="w-8 h-8" />
                                 </div>
                                 <div className="space-y-1">
                                    <div className="text-lg font-extrabold text-slate-900">
                                       {isSearching ? 'No matching entries' : 'No entries found'}
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">
                                       {isSearching
                                          ? 'Try a different keyword for title, applicant name, or email.'
                                          : 'There are currently no submissions for this program workspace.'}
                                    </p>
                                 </div>
                                 <Button onClick={() => setIsModalOpen(true)} size="sm">Create First Entry</Button>
                              </div>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
               <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Showing {showingStart}-{showingEnd} of {total}
               </p>
               <div className="flex items-center gap-2">
                  <button
                     onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                     disabled={page === 1}
                     className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                     <ChevronLeft className="w-4 h-4" />
                     Prev
                  </button>
                  {visiblePageNumbers.map((pageNumber) => (
                     <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        className={`h-9 w-9 rounded-xl border text-sm font-bold transition-colors ${
                           pageNumber === page
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                     >
                        {pageNumber}
                     </button>
                  ))}
                  <button
                     onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                     disabled={page >= totalPages}
                     className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                     Next
                     <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
            </div>
            </>
            )}
         </div>

         {/* Premium Floating Actions */}
         {/* 
         <AnimatePresence>
            {selectedIds.length > 0 && (
               <motion.div
                  initial={{ y: 100, opacity: 0, x: '-50%' }}
                  animate={{ y: 0, opacity: 1, x: '-50%' }}
                  exit={{ y: 100, opacity: 0, x: '-50%' }}
                  className="fixed bottom-10 left-1/2 bg-slate-950 text-white px-5 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 flex items-center gap-6 border border-slate-800 backdrop-blur-md bg-opacity-95"
               >
                  <div className="flex items-center gap-4 border-r border-slate-800 pr-6">
                     <div className="w-9 h-9 bg-indigo-600 text-white text-sm font-black flex items-center justify-center rounded-xl shadow-lg shadow-indigo-500/20">
                        {selectedIds.length}
                     </div>
                     <div className="flex flex-col leading-none">
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Selected</span>
                        <span className="text-[10px] text-slate-400 font-bold">Submissions</span>
                     </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                     {isBulkProcessing && (
                        <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                     )}
                     <button onClick={() => handleBulkAction('Accept')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-emerald-400 flex items-center gap-2 group disabled:opacity-40">
                        <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> ACCEPT
                     </button>
                     <button onClick={() => handleBulkAction('Reject')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-rose-400 flex items-center gap-2 group disabled:opacity-40">
                        <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" /> REJECT
                     </button>
                     <button onClick={() => handleBulkAction('Shortlist')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-purple-400 flex items-center gap-2 group disabled:opacity-40">
                        <Gavel className="w-4 h-4 group-hover:scale-110 transition-transform" /> SHORTLIST
                     </button>
                     <div className="w-px h-6 bg-slate-800 mx-3"></div>
                     <button onClick={() => handleBulkAction('AssignJudge')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-blue-400 flex items-center gap-2 group disabled:opacity-40">
                        <User className="w-4 h-4 group-hover:scale-110 transition-transform" /> ASSIGN JUDGES
                     </button>
                     <button onClick={() => handleBulkAction('UnassignJudge')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-slate-900 rounded-xl transition-all text-xs font-black text-amber-400 flex items-center gap-2 group disabled:opacity-40">
                        <UserX className="w-4 h-4 group-hover:scale-110 transition-transform" /> UNASSIGN
                     </button>
                     <div className="w-px h-6 bg-slate-800 mx-3"></div>
                     <button onClick={() => handleBulkAction('Delete')} disabled={isBulkProcessing} className="px-4 py-2 hover:bg-rose-950/30 rounded-xl transition-all text-xs font-black text-slate-500 hover:text-rose-400 flex items-center gap-2 group disabled:opacity-40">
                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> DELETE
                     </button>
                  </div>

                  <button
                     onClick={() => setSelectedIds([])}
                     className="ml-6 w-8 h-8 rounded-full hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400"
                  >
                     <XCircle className="w-4 h-4" />
                  </button>
               </motion.div>
            )}
         </AnimatePresence>
         */}

         {/* Add Submission Modal — dynamic form fields from the active program form */}
         <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setNewSub({ applicantName: '', applicantEmail: '', status: 'Pending', responses: {} }); }} title="Add Submission" size="lg">
            <form onSubmit={handleCreate} className="space-y-6">
               {/* Direct Entry Banner */}
               <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex gap-4 items-start">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-indigo-100 shrink-0">
                     <Sparkles className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="space-y-1">
                     <div className="text-sm font-black text-indigo-900 leading-none">Direct Entry Mode</div>
                     <p className="text-xs text-indigo-600/70 font-medium">Manually record a submission using the program's active form fields.</p>
                  </div>
               </div>

               {/* ── Basic Details ── */}
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 pb-2">Basic Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                           Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                           required
                           type="text"
                           className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-sm transition-all"
                           value={newSub.applicantName}
                           onChange={(e) => setNewSub((p) => ({ ...p, applicantName: e.target.value }))}
                           placeholder="Applicant's full name"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                        <input
                           type="email"
                           className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-sm transition-all"
                           value={newSub.applicantEmail}
                           onChange={(e) => setNewSub((p) => ({ ...p, applicantEmail: e.target.value }))}
                           placeholder="applicant@email.com"
                        />
                     </div>
                  </div>
               </div>

               {/* ── Form Fields ── */}
               {formFieldsQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold py-2">
                     <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                     </svg>
                     Loading form fields…
                  </div>
               ) : (() => {
                  const displayFields = ((formFieldsQuery.data || []) as any[]).filter((f) => DISPLAY_FIELD_TYPES.has(f.type));
                  if (displayFields.length === 0) return null;
                  return (
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100 pb-2">Form Fields</h4>
                        <div className="space-y-5">
                           {displayFields.map((field: any) => (
                              <div key={field.id}>
                                 <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                    {field.label}
                                    {field.required && <span className="text-rose-500 ml-1">*</span>}
                                 </label>
                                 {renderManualEntryField(
                                    field,
                                    newSub.responses[field.id],
                                    (val) =>
                                       setNewSub((p) => ({ ...p, responses: { ...p.responses, [field.id]: val } })),
                                 )}
                              </div>
                           ))}
                        </div>
                     </div>
                  );
               })()}

               {/* ── Status ── */}
               <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Initial Status</label>
                  <select
                     className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-sm transition-all"
                     value={newSub.status}
                     onChange={(e) => setNewSub((p) => ({ ...p, status: e.target.value as Submission['status'] }))}
                  >
                     <option value="Pending">Pending Review</option>
                     <option value="Under Review">Active Review</option>
                     <option value="Accepted">Pre-Accepted</option>
                  </select>
               </div>

               {/* ── Actions ── */}
               <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                  <button
                     type="button"
                     onClick={() => { setIsModalOpen(false); setNewSub({ applicantName: '', applicantEmail: '', status: 'Pending', responses: {} }); }}
                     className="px-6 h-12 font-bold text-sm text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                  >
                     Cancel
                  </button>
                  <button type="submit" className="px-8 h-12 bg-slate-950 text-white font-black text-sm rounded-xl shadow-lg shadow-slate-200 hover:bg-indigo-600 transition-all">
                     Add Submission
                  </button>
               </div>
            </form>
         </Modal>

         {/* Assign Judge Modal - Updated styling */}
         <Modal isOpen={isJudgeModalOpen} onClose={() => setIsJudgeModalOpen(false)} title="Panel Assignment">
            <div className="space-y-6">
               <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex gap-4 items-start">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-blue-100 shrink-0">
                     <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                     <div className="text-sm font-black text-blue-900 leading-none">Bulk Judge Assignment</div>
                     <p className="text-xs text-blue-600/70 font-medium tracking-tight">Assigning panel members to <strong>{selectedIds.length}</strong> selected entries.</p>
                  </div>
               </div>

               <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {judges.map(judge => (
                     <label key={judge.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-all hover:border-indigo-100 group">
                        <div className="flex items-center gap-4">
                           <div className="relative">
                              {judge.avatar ? (
                                 <img src={judge.avatar} alt="" className="w-10 h-10 rounded-xl shadow-sm border border-slate-200 group-hover:border-indigo-200 transition-colors" />
                              ) : (
                                 <div className="w-10 h-10 rounded-xl shadow-sm border border-slate-200 group-hover:border-indigo-200 transition-colors bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                                    {judge.name?.charAt(0).toUpperCase() || 'J'}
                                 </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                           </div>
                           <div>
                              <div className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">{judge.name}</div>
                              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{judge.email}</div>
                           </div>
                        </div>
                        <div className="relative flex items-center">
                              <input
                                 type="checkbox"
                                 className="w-6 h-6 cursor-pointer rounded-lg border-slate-300 text-indigo-600 accent-indigo-600 transition-all focus:ring-indigo-500"
                              checked={selectedJudgesForBulk.includes(judge.id)}
                              onChange={(e) => {
                                 if (e.target.checked) {
                                    setSelectedJudgesForBulk([...selectedJudgesForBulk, judge.id]);
                                 } else {
                                    setSelectedJudgesForBulk(selectedJudgesForBulk.filter(id => id !== judge.id));
                                 }
                              }}
                           />
                        </div>
                     </label>
                  ))}
               </div>
               <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsJudgeModalOpen(false)} className="px-6 h-12 font-bold text-sm text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                  <button
                     onClick={handleAssignJudges}
                     disabled={selectedJudgesForBulk.length === 0}
                     className="px-8 h-12 bg-slate-950 text-white font-black text-sm rounded-xl shadow-lg shadow-slate-200 hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     Confirm Assignment
                  </button>
               </div>
            </div>
         </Modal>

         <SubmissionReviewSheet
            isOpen={isDetailModalOpen}
            onClose={() => {
               setIsDetailModalOpen(false);
               setSelectedSubmission(null);
            }}
            submission={selectedSubmission}
            judges={judges}
            programId={activeEvent?.id}
         />
      </div>
   );
};

