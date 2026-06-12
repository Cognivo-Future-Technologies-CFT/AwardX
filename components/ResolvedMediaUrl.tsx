import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { resolveMediaUrl } from '../services/supabase';

export function useResolvedMediaUrl(raw?: string | null): { url: string; loading: boolean } {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(Boolean(raw?.trim()));

  useEffect(() => {
    let cancelled = false;
    const value = (raw || '').trim();

    if (!value) {
      setUrl('');
      setLoading(false);
      return;
    }

    setLoading(true);
    void resolveMediaUrl(value).then((resolved) => {
      if (!cancelled) {
        setUrl(resolved);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [raw]);

  return { url, loading };
}

type ResolvedMediaLinkProps = {
  value?: string | null;
  name?: string;
  className?: string;
  imageClassName?: string;
  asImage?: boolean;
};

export const ResolvedMediaLink: React.FC<ResolvedMediaLinkProps> = ({
  value,
  name,
  className,
  imageClassName = 'h-8 w-8 rounded-md object-cover border border-slate-200',
  asImage = false,
}) => {
  const { url, loading } = useResolvedMediaUrl(value);
  const label = name || value?.split('/').pop() || 'file';

  if (loading) {
    return <span className="text-[11px] text-slate-400">Loading…</span>;
  }

  if (!url) {
    return <span className="text-[11px] text-slate-400">Unavailable</span>;
  }

  if (asImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img src={url} alt={label} className={imageClassName} />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={
        className ||
        'inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 text-[11px] font-semibold text-slate-700 hover:text-indigo-700 max-w-[140px] truncate'
      }
      title={label}
    >
      <ExternalLink className="w-3 h-3 shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
};

type ResolvedMediaFileProps = {
  value: unknown;
  type?: string;
  isPage?: boolean;
};

export const ResolvedMediaFile: React.FC<ResolvedMediaFileProps> = ({ value, type = 'file', isPage = false }) => {
  const fileUrl =
    typeof value === 'string'
      ? value
      : typeof value === 'object' && value !== null
      ? (value as { url?: string }).url
      : undefined;
  const fileName =
    typeof value === 'object' && value !== null ? (value as { name?: string }).name : undefined;

  const { url, loading } = useResolvedMediaUrl(fileUrl);
  const showImage =
    type === 'file' || type === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl || '');

  if (loading) {
    return <span className="text-sm text-slate-400 italic">Loading file…</span>;
  }

  if (!url) {
    return <span className="text-sm text-slate-400 italic">File unavailable</span>;
  }

  return (
    <div className="space-y-3">
      {fileName && <p className="text-sm font-medium text-slate-700">{fileName}</p>}
      {showImage && (
        <img
          src={url}
          alt={fileName || 'Upload'}
          className={`max-w-full rounded-xl border border-slate-200 object-cover ${isPage ? 'max-h-80' : 'max-h-48'}`}
        />
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
      >
        Open file <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
};
