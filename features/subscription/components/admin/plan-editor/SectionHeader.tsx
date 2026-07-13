import React from 'react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, className = '' }) => {
  return (
    <div className={`mb-6 ${className}`}>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
  );
};
