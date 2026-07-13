import React, { useRef, useEffect } from 'react';
import { Settings, Server, Zap, Blocks, Paintbrush, Shield, CreditCard, Sparkles, Eye, Code, History } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlanTabsProps {
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'resources', label: 'Resources', icon: Server },
  { id: 'features', label: 'Features', icon: Zap },
  { id: 'integrations', label: 'Integrations', icon: Blocks },
  { id: 'branding', label: 'Branding', icon: Paintbrush },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'ai', label: 'AI', icon: Sparkles },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'advanced', label: 'Advanced', icon: Code },
  { id: 'history', label: 'History', icon: History }
];

export const PlanTabs: React.FC<PlanTabsProps> = ({ activeTab, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll active tab into view if needed
    const activeEl = containerRef.current?.querySelector(`[data-tab="${activeTab}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-20" ref={containerRef}>
      <nav className="flex overflow-x-auto hide-scrollbar px-6" aria-label="Tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                group relative min-w-0 flex-1 overflow-hidden bg-white py-4 px-4 text-center text-sm font-medium hover:bg-slate-50 focus:z-10 transition-colors whitespace-nowrap
                ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                <span>{tab.label}</span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
