import React, { useState, useEffect } from 'react';
import { Menu, X, LayoutDashboard, LogOut, Github } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import { GITHUB_REPO } from '@/lib/brand';
import { isLandingOnly } from '@/lib/landingOnly';
import { motion, useScroll } from 'framer-motion';
import { db } from '../services/database';
import { Contact } from '../services/models';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage, onLogout }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Contact | null>(null);
  const { scrollY } = useScroll();
  const { isAuthenticated, user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthenticated) {
        setCurrentUser(null);
        return;
      }

      try {
        try {
          await db.initialize().catch(() => {
            // If initialize fails, continue with auth fallback
          });
          const realUser = await db.getCurrentUser().catch(() => null);
          if (realUser) {
            setCurrentUser(realUser);
          } else {
            if (user) {
              setCurrentUser({
                id: user.id,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                email: user.email || '',
                role: 'Admin',
                status: 'Active',
                lastActive: 'Now',
                avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
                source: 'Internal',
                surveyAnswer: '',
                joinedDate: new Date().toISOString().split('T')[0],
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          if (user) {
            setCurrentUser({
              id: user.id,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              role: 'Admin',
              status: 'Active',
              lastActive: 'Now',
              avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
              source: 'Internal',
              surveyAnswer: '',
              joinedDate: new Date().toISOString().split('T')[0],
            });
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    fetchUserData();
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    try {
      await signOut();
      setCurrentUser(null);
      if (onLogout) {
        onLogout();
      } else {
        onNavigate('home');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { id: 'features', label: 'Features' },
    { id: 'how-it-works', label: 'How it Works' },
    { id: 'stories', label: 'Stories' },
    { id: 'docs', label: 'Docs' },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Notch / Dynamic Island */}
      <div className="flex justify-center pt-4 md:pt-5 px-3 pointer-events-none">
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          className={`pointer-events-auto relative flex items-center gap-1 rounded-full border shadow-[0_8px_32px_rgba(15,23,42,0.12)] transition-all duration-300 ${
            isScrolled
              ? 'border-white/40 bg-white/55 backdrop-blur-2xl shadow-[0_10px_40px_rgba(15,23,42,0.15)] px-2.5 py-1.5'
              : 'border-white/30 bg-white/40 backdrop-blur-2xl px-3 py-2'
          }`}
        >
          {/* Glass highlight */}
          <div className="absolute inset-0 rounded-full pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          </div>

          {/* Logo */}
          <button
            onClick={() => handleNavClick('home')}
            className="relative flex items-center pl-2 pr-3 py-1 rounded-full hover:bg-white/40 transition-colors"
          >
            <Logo size="lg" />
          </button>

          {/* Divider pill */}
          <div className="hidden md:block h-5 w-px bg-slate-900/10 mx-1" />

          {/* Nav items */}
          <nav className="hidden md:flex items-center">
            {navItems.map((item) => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="relative px-3.5 py-1.5 text-[13px] font-semibold rounded-full transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white/80 shadow-sm border border-white/60"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 ${active ? 'text-indigo-700' : 'text-slate-700 hover:text-slate-900'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="hidden md:block h-5 w-px bg-slate-900/10 mx-1" />

          {/* Right cluster */}
          <div className="hidden md:flex items-center gap-1.5">
            {isLandingOnly ? (
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-white/50 rounded-full transition-colors border border-white/30"
                title="View on GitHub"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub</span>
              </a>
            ) : isAuthenticated ? (
              <>
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-white/50 rounded-full transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </button>
                <div className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full bg-white/50 border border-white/40">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                      {currentUser?.name.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-[12px] font-semibold text-slate-700 pr-1">{currentUser?.name?.split(' ')[0] || 'User'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-full text-slate-500 hover:text-rose-600 hover:bg-white/50 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-white/50 rounded-full transition-colors border border-white/30"
                  title="View on GitHub"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
                <button
                  onClick={() => handleNavClick('login')}
                  className="px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-white/50 rounded-full transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => handleNavClick('signup')}
                  className="px-4 py-1.5 text-[13px] font-bold text-white rounded-full bg-gradient-to-br from-slate-900 to-slate-800 hover:from-indigo-600 hover:to-purple-600 shadow-md shadow-slate-900/20 transition-all"
                >
                  Self Host
                </button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-full text-slate-700 hover:bg-white/50 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </motion.div>
      </div>

      {/* Mobile floating glass panel */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="md:hidden pointer-events-auto mx-3 mt-2 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/50 p-4 space-y-3 shadow-2xl shadow-slate-900/10"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`block w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 ${
                currentPage === item.id ? 'text-emerald-700 font-semibold bg-emerald-50' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-4 flex flex-col space-y-3 px-4 border-t border-slate-100 mt-2">
            {isLandingOnly ? (
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 text-sm font-medium text-slate-700 px-4 py-2 rounded-lg border border-slate-200 bg-white"
              >
                <Github className="w-4 h-4" /> View on GitHub
              </a>
            ) : isAuthenticated ? (
              <>
                <Button variant="secondary" className="w-full justify-center" onClick={() => handleNavClick('dashboard')}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </Button>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full border-2 border-slate-200 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                      {currentUser?.name.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">{currentUser?.name || 'User'}</div>
                    <div className="text-xs text-slate-500 truncate">{currentUser?.email || ''}</div>
                  </div>
                </div>
                <Button variant="outline" className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" className="w-full justify-center" onClick={() => handleNavClick('demo')}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Open Demo
                </Button>
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-slate-700 px-4 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <Github className="w-4 h-4" /> View on GitHub
                </a>
                <Button variant="outline" className="w-full justify-center" onClick={() => handleNavClick('login')}>Login</Button>
                <Button variant="primary" className="w-full justify-center" onClick={() => handleNavClick('signup')}>Self Host</Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};