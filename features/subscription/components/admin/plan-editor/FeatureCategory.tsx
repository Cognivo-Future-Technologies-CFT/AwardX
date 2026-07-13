import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FeatureCategoryProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const FeatureCategory: React.FC<FeatureCategoryProps> = ({ title, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 bg-white shadow-sm">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-semibold text-slate-900">{title}</span>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-slate-200">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
