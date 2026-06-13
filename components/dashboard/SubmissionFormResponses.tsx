import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ExternalLink, FileText, User } from 'lucide-react';
import { Submission } from '../../services/models';
import { queryKeys } from '../../services/queryKeys';
import { forms as formsService } from '../../services/supabase';
import { extractSubmissionResponses, getSubmissionFormId } from '../../lib/submissionFormData';

interface SubmissionFormResponsesProps {
  submission: Submission;
  enabled?: boolean;
  className?: string;
  variant?: 'default' | 'page';
  inputsOnly?: boolean;
  /** Include every form field from the definition, even if unanswered */
  showAllFormFields?: boolean;
  /** Used when submission_data has no form_id */
  fallbackFormId?: string;
}

type DisplayEntry = {
  key: string;
  label: string;
  value: unknown;
  type: string;
  sortOrder: number;
};

const renderValue = (value: unknown, type: string, isPage = false) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 italic">No response</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <span
            key={index}
            className="inline-flex rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

 if (typeof value === 'object') {
  const fileUrl = (value as { url?: string }).url;
  const fileName = (value as { name?: string }).name;

  if (fileUrl) {
    const isImage =
      type === 'image' ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);

    return (
      <div className="space-y-3">
        {fileName && (
          <p className="text-sm font-medium text-slate-700">
            {fileName}
          </p>
        )}

        {/* Only show preview for real file uploads, not Image fields */}
        {!isImage && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
          >
            Open file
            <ExternalLink className="h-4 w-4" />
          </a>
        )}

        {isImage && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
          >
            Open file
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
    );
  }

  return (
    <pre className="max-h-48 overflow-auto rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

  return (
    <p className={`whitespace-pre-wrap leading-relaxed text-slate-800 ${isPage ? 'text-base sm:text-[17px]' : 'text-sm'}`}>
      {String(value)}
    </p>
  );
};

function resolveFieldValue(
  responses: Record<string, unknown>,
  fieldId: string,
  fieldKey?: string | null,
): unknown {
  if (fieldId in responses) return responses[fieldId];
  if (fieldKey && fieldKey in responses) return responses[fieldKey];
  return undefined;
}

function hasFieldValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if ('url' in obj && !obj.url && !obj.name) return false;
  }
  return true;
}

export const SubmissionFormResponses: React.FC<SubmissionFormResponsesProps> = ({
  submission,
  enabled = true,
  className = '',
  variant = 'default',
  inputsOnly = false,
  showAllFormFields = false,
  fallbackFormId,
}) => {
  const submissionData = (submission.submissionData || {}) as Record<string, unknown>;
  const formId = getSubmissionFormId(submissionData) || fallbackFormId || null;
  const responses = useMemo(() => extractSubmissionResponses(submissionData), [submissionData]);

  const { data: formFieldsData = [], isLoading } = useQuery({
    queryKey: queryKeys.forms.fields(formId || 'none'),
    queryFn: async () => {
      if (!formId) return [];
      const { data } = await formsService.getFields(formId);
      return data || [];
    },
    enabled: enabled && !!formId,
    staleTime: 5 * 60_000,
  });

  const displayEntries = useMemo(() => {
    const sortedFields = [...formFieldsData].sort(
      (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999),
    );

    if (sortedFields.length > 0) {
      const usedKeys = new Set<string>();
      const fromForm: DisplayEntry[] = sortedFields
        .map((field, index) => {
          const fieldKey = field.field_key || null;
          const value = resolveFieldValue(responses, field.id, fieldKey);
          if (field.id) usedKeys.add(field.id);
          if (fieldKey) usedKeys.add(fieldKey);

          if (!showAllFormFields && !hasFieldValue(value)) return null;

          return {
            key: field.id,
            label: field.label || fieldKey || field.id,
            value,
            type: field.type || field.field_type || 'text',
            sortOrder: field.sort_order ?? index,
          };
        })
        .filter(Boolean) as DisplayEntry[];

      const orphans: DisplayEntry[] = Object.entries(responses)
        .filter(([key]) => !usedKeys.has(key))
        .map(([key, value], index) => ({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value,
          type: 'text',
          sortOrder: 1000 + index,
        }));

      return [...fromForm, ...orphans];
    }

    return Object.entries(responses)
      .map(([key, value], index) => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
        type: 'text',
        sortOrder: index,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [formFieldsData, responses, showAllFormFields]);

  const isPage = variant === 'page';
  const coverImage = submission.coverImageUrl || submission.image;
  const applicant = submission.applicantName || submission.applicant;
  const hasFormResponses = displayEntries.some((entry) => hasFieldValue(entry.value));
  const hasSummary = !inputsOnly && Boolean(submission.description || coverImage || applicant);

  if (isLoading && formId) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white border border-slate-200" />
        ))}
      </div>
    );
  }

  if (displayEntries.length === 0 && !hasSummary) {
    if (inputsOnly && submission.description) {
      return (
        <div className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500/80">
            Submission details
          </p>
          <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-800">{submission.description}</p>
        </div>
      );
    }

    return (
      <div
        className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm ${className}`}
      >
        <AlertCircle className="mb-3 h-9 w-9 text-slate-300" />
        <p className="text-base font-medium text-slate-600">No form responses saved</p>
        <p className="mt-1 max-w-sm text-sm text-slate-400">
          This entry does not contain applicant form data yet.
        </p>
      </div>
    );
  }

  const answeredCount = displayEntries.filter((e) => hasFieldValue(e.value)).length;

  return (
    <div className={`space-y-5 ${isPage ? '' : 'p-6'} ${className}`}>
      {isPage && hasFormResponses && (
        <div className="mb-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Submitted answers</p>
            <p className="text-sm text-slate-500">
              {answeredCount} of {displayEntries.length} field{displayEntries.length === 1 ? '' : 's'} completed
            </p>
          </div>
        </div>
      )}

      {!inputsOnly && coverImage && (
        <img
          src={coverImage}
          alt={submission.title}
          className={`w-full rounded-2xl border border-slate-200 object-cover shadow-sm ${
            isPage ? 'max-h-80' : 'max-h-56'
          }`}
        />
      )}

      {!hasFormResponses && hasSummary && (
        <div className="space-y-4">
          {!isPage && (
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              Entry Summary
            </div>
          )}
          {applicant && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Submitted by</p>
              <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <User className="h-4 w-4 text-indigo-500" />
                {applicant}
              </p>
            </div>
          )}
          {submission.description && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</p>
              <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-700">{submission.description}</p>
            </div>
          )}
        </div>
      )}

      {displayEntries.length > 0 && (
        <div className={isPage ? 'space-y-5' : 'space-y-3'}>
          {displayEntries.map(({ key, label, value, type }, index) => (
            <div
              key={key}
              className={`rounded-2xl border bg-white shadow-sm transition-all ${
                hasFieldValue(value)
                  ? 'border-slate-200 hover:border-indigo-200 hover:shadow-md'
                  : 'border-dashed border-slate-200 opacity-80'
              } ${isPage ? 'p-5 sm:p-6' : 'p-4'}`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-500/80">
                    Field {index + 1}
                  </p>
                  <p className={`mt-1 font-semibold text-slate-900 ${isPage ? 'text-lg' : 'text-sm'}`}>
                    {label}
                  </p>
                </div>
                {!isPage && (
                  <span className="shrink-0 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-400">
                    {type}
                  </span>
                )}
              </div>
              {renderValue(value, type, isPage)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
