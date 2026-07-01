import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, BarChart3, Settings, ArrowLeft, Menu, X, ShieldAlert } from 'lucide-react';
import { Logo } from '../Logo';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

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
    <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40 transition-all duration-300 ease-out ${isSidebarExpanded ? 'w-[280px]' : 'w-[88px]'}`}
      >
        <div className={`h-auto min-h-[5rem] flex flex-col border-b border-slate-100/50 shrink-0 transition-all ${!isSidebarExpanded ? 'items-center py-4' : 'px-6 py-5'}`}>
          {isSidebarExpanded ? (
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-xs font-bold text-slate-400 hover:text-indigo-600 mb-4 transition-colors group"
            >
              <ArrowLeft className="w-3 h-3 mr-1 group-hover:-translate-x-1 transition-transform" /> Back to App
            </button>
          ) : (
            <button onClick={() => navigate('/')} className="mb-4 text-slate-400 hover:text-indigo-600" title="Back to App">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3 overflow-hidden">
            <Logo size="sm" className="shrink-0" />
            <div className={`flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarExpanded ? 'w-32 opacity-100' : 'w-0 opacity-0'}`}>
              <span className="text-[10px] font-bold tracking-widest text-indigo-500 uppercase leading-none mt-0.5">AwardX</span>
              <span className="text-sm font-bold text-slate-900 leading-tight tracking-tight">Platform Admin</span>
            </div>
          </div>
        </div>

        <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
          
          <div className={`overflow-hidden transition-all duration-300 ${isSidebarExpanded ? 'h-6 opacity-100 mb-2' : 'h-0 opacity-0 mb-0'}`}>
            <div className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Management</div>
          </div>

          <div className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = currentView === item.id || (item.id !== '/' && currentView.startsWith(item.id));
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative group w-full flex items-center ${!isSidebarExpanded ? 'justify-center' : 'justify-start'} px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-white shadow-md shadow-indigo-500/20'
                      : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-900'
                  }`}
                  title={!isSidebarExpanded ? item.label : undefined}
                >
                  {/* Active Background Gradient */}
                  {isActive && (
                    <motion.div
                      layoutId="activeAdminNav"
                      className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div className={`flex items-center gap-3 relative z-10 ${!isSidebarExpanded ? 'justify-center w-full' : ''}`}>
                    <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <AnimatePresence>
                      {isSidebarExpanded && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="font-semibold whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions & User Profile */}
        <div className="p-4 border-t border-slate-100/50 space-y-3">

          <div className={`flex items-center ${!isSidebarExpanded ? 'justify-center' : 'gap-3'} p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 transition-all duration-300`}>
             <ShieldAlert className="w-5 h-5 text-indigo-500 shrink-0" />
             <div className={`flex flex-col min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ${isSidebarExpanded ? 'w-24 opacity-100' : 'w-0 opacity-0'}`}>
               <span className="text-xs font-bold text-indigo-900 truncate">Super Admin</span>
               <span className="text-[10px] text-indigo-500/80 font-medium truncate">Full Access</span>
             </div>
          </div>
        </div>
      </aside>

      {/* ── MOBILE HEADER ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm flex items-center justify-between px-4 z-40">
        <Logo size="sm" />
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── MOBILE MENU ── */}
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
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white z-50 flex flex-col lg:hidden shadow-2xl rounded-r-3xl"
            >
              <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
                <Logo size="sm" />
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 py-8 px-4 flex flex-col h-full overflow-y-auto">
                <div className="flex-1 space-y-2">
                  <div className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Management</div>

                  <div className="space-y-1.5">
                    {navItems.map((item) => {
                      const isActive = currentView === item.id || (item.id !== '/' && currentView.startsWith(item.id));
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 ${
                            isActive
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100/80 mt-6">
                  <button
                    onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                    Back to App
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col h-screen max-h-screen overflow-hidden pt-16 lg:pt-0 lg:pl-[88px] relative z-10">
        <div className="flex-1 overflow-y-auto bg-transparent p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};


