import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, BarChart3, Settings, ArrowLeft, Menu, X } from 'lucide-react';
import { Logo } from '../Logo';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const currentView = location.pathname.replace('/admin', '') || '/';

  const navItems = [
    { id: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: '/pre-registrations', label: 'Pre-Registrations', icon: Users },
    { id: '/analytics', label: 'Analytics', icon: BarChart3 },
    { id: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: string) => {
    navigate(`/admin${id === '/' ? '' : id}`);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200/60 shadow-sm transition-all duration-300 ease-in-out relative z-30 ${isSidebarExpanded ? 'w-64' : 'w-20'}`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <div className={`overflow-hidden transition-all duration-300 ${isSidebarExpanded ? 'w-32 opacity-100' : 'w-0 opacity-0'}`}>
            <Logo size="sm" />
          </div>
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          <button
            onClick={() => navigate('/')}
            className={`group w-full flex items-center ${!isSidebarExpanded ? 'justify-center' : 'justify-between'} px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-500 hover:bg-slate-50 border border-transparent mb-4`}
            title={!isSidebarExpanded ? 'Back to App' : undefined}
          >
            <div className={`flex items-center gap-3 ${!isSidebarExpanded ? 'justify-center w-full' : ''}`}>
              <ArrowLeft className="w-5 h-5 transition-colors text-slate-400 group-hover:text-slate-600" />
              {isSidebarExpanded && <span>Back to App</span>}
            </div>
          </button>
          
          <div className="mb-4">
             {isSidebarExpanded && <div className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Platform Admin</div>}
          </div>

          {navItems.map((item) => {
            const isActive = currentView === item.id || (item.id !== '/' && currentView.startsWith(item.id));
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`group w-full flex items-center ${!isSidebarExpanded ? 'justify-center' : 'justify-between'} px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
                title={!isSidebarExpanded ? item.label : undefined}
              >
                <div className={`flex items-center gap-3 ${!isSidebarExpanded ? 'justify-center w-full' : ''}`}>
                  <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  {isSidebarExpanded && <span>{item.label}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200/60 shadow-sm flex items-center justify-between px-4 z-40">
        <Logo size="sm" />
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col lg:hidden shadow-2xl"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
                <Logo size="sm" />
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-lg text-slate-500"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 py-6 px-4 space-y-1">
                <button
                  onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to App
                </button>
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      (currentView === item.id || (item.id !== '/' && currentView.startsWith(item.id)))
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen max-h-screen overflow-hidden pt-16 lg:pt-0">
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
