import React from 'react';

interface ClaimVerificationBadgeProps {
  confidence: number | null;
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

function getBadgeConfig(confidence: number | null, status: string) {
  if (status === 'pending') {
    return { label: 'Pending', className: 'bg-gray-100 text-gray-500 border-gray-200' };
  }
  if (status === 'verifying') {
    return { label: 'Verifying...', className: 'bg-blue-100 text-blue-600 border-blue-200' };
  }
  if (status === 'unverifiable' || confidence === null || confidence < 0.1) {
    return { label: 'No Evidence', className: 'bg-gray-100 text-gray-400 border-gray-200' };
  }
  if (confidence >= 0.9) {
    return { label: 'Verified ✓', className: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
  }
  if (confidence >= 0.7) {
    return { label: 'Verified', className: 'bg-emerald-100 text-emerald-600 border-emerald-200' };
  }
  if (confidence >= 0.5) {
    return { label: 'Likely', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
  if (confidence >= 0.25) {
    return { label: 'Possible', className: 'bg-orange-100 text-orange-700 border-orange-200' };
  }
  return { label: 'Unsubstantiated', className: 'bg-rose-100 text-rose-600 border-rose-200' };
}

export const ClaimVerificationBadge: React.FC<ClaimVerificationBadgeProps> = ({
  confidence,
  status,
  size = 'md',
}) => {
  const config = getBadgeConfig(confidence, status);

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${sizeClasses[size]} ${config.className}`}
      title={confidence !== null ? `Confidence: ${(confidence * 100).toFixed(0)}%` : undefined}
    >
      {confidence !== null && (
        <span className="text-[10px] opacity-70">
          {status === 'verified' ? '✓' : status === 'pending' ? '○' : status === 'verifying' ? '⋯' : '!'}
        </span>
      )}
      {config.label}
      {confidence !== null && status !== 'pending' && status !== 'verifying' && (
        <span className="opacity-60">{(confidence * 100).toFixed(0)}%</span>
      )}
    </span>
  );
};
