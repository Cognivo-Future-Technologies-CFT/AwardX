import React from 'react';

type SkeletonLoaderProps = {
  className?: string;
};

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className = '' }) => {
  return <div className={`animate-pulse rounded-xl bg-gradient-to-r from-slate-200/70 via-slate-100/70 to-slate-200/70 bg-[length:200%_100%] ${className}`} style={{ animation: 'shimmer 1.5s ease-in-out infinite' }} />;
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 6, columns = 6 }) => {
  return (
    <div className="space-y-3 p-4">
      {/* Header row */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, colIdx) => (
          <SkeletonLoader key={`h-${colIdx}`} className="h-8 rounded-lg" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((__, colIdx) => (
            <SkeletonLoader key={`${rowIdx}-${colIdx}`} className="h-10" />
          ))}
        </div>
      ))}
    </div>
  );
};

/** Card skeleton for dashboard stat cards */
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <SkeletonLoader className="w-12 h-12 rounded-xl" />
          <SkeletonLoader className="w-16 h-6 rounded-full" />
        </div>
        <SkeletonLoader className="w-24 h-4" />
        <SkeletonLoader className="w-16 h-8" />
      </div>
    ))}
  </div>
);

/** Chart skeleton */
export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-[260px]' }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 ${height}`}>
    <div className="flex justify-between items-center mb-6">
      <SkeletonLoader className="w-40 h-6" />
      <SkeletonLoader className="w-24 h-8 rounded-lg" />
    </div>
    <div className="flex items-end gap-2 h-[calc(100%-60px)]">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end">
          <SkeletonLoader className="w-full rounded-t-md" style={{ height: `${30 + Math.random() * 60}%` }} />
        </div>
      ))}
    </div>
  </div>
);

/** Page-level skeleton for full views */
export const PageSkeleton: React.FC = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="space-y-2">
      <SkeletonLoader className="w-48 h-8" />
      <SkeletonLoader className="w-72 h-4" />
    </div>
    <CardSkeleton count={4} />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <SkeletonLoader className="w-32 h-5" />
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} className="w-full h-14 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-4">
        <ChartSkeleton />
        <ChartSkeleton height="h-[200px]" />
      </div>
    </div>
  </div>
);

/** List skeleton for sidebar items */
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
        <SkeletonLoader className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader className="w-3/4 h-4" />
          <SkeletonLoader className="w-1/2 h-3" />
        </div>
      </div>
    ))}
  </div>
);
