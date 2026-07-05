import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, LayoutDashboard, LogOut, Github } from 'lucide-react';
import { Button } from './Button';
import { PreRegistrationModal } from './PreRegistrationModal';
import { Logo } from './Logo';
import { GITHUB_REPO } from '@/lib/brand';
import { isLandingOnly } from '@/lib/landingOnly';
import { motion, useScroll } from 'framer-motion';
import { db } from '../services/database';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { UserAvatar, UserIdentity, UserProfileSkeleton } from './ui/UserIdentity';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage, onLogout }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPreRegModalOpen, setIsPreRegModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { scrollY } = useScroll();
  const { isAuthenticated, isLoading: isAuthLoading, signOut } = useAuth();
  const { profile, isLoading: isProfileLoading } = useUserProfile({
    fetchFullProfile: async () => {
      await db.initialize().catch(() => undefined);
      const realUser = await db.getCurrentUser().catch(() => null);
      if (!realUser?.name) return null;
      return {
        id: realUser.id,
        name: realUser.name,
        email: realUser.email,
        avatar: realUser.avatar,
        role: realUser.role,
      };
    },
  });
  const showAuthenticatedChrome = isAuthenticated || isLoggingOut;
  const showProfileLoading = isAuthLoading || (showAuthenticatedChrome && isProfileLoading && !profile?.name);

  useEffect(() => {
    const handleOpen = () => setIsPreRegModalOpen(true);
    window.addEventListener('open-pre-registration', handleOpen);
    return () => window.removeEventListener('open-pre-registration', handleOpen);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        if (activeDropdown === 'profile') setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setActiveDropdown(null);
    try {
      await signOut();
      if (onLogout) {
        onLogout();
      } else {
        onNavigate('home');
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoggingOut(false);
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
            ) : isAuthLoading ? (
              <UserProfileSkeleton size="sm" />
            ) : showAuthenticatedChrome ? (
              <>
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-white/50 rounded-full transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                </button>

                {showProfileLoading ? (
                  <UserProfileSkeleton size="sm" />
                ) : profile ? (
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === 'profile' ? null : 'profile')}
                      className="flex items-center justify-center w-8 h-8 rounded-full bg-white/50 border border-white/40 hover:bg-white/70 hover:shadow-sm transition-all focus:outline-none"
                      aria-label="Open profile menu"
                    >
                      <UserAvatar profile={profile} size="sm" />
                    </button>

                    {activeDropdown === 'profile' && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden z-50">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                          <p className="text-sm font-semibold text-slate-900 truncate">{profile.name}</p>
                          <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                        </div>
                        <div className="p-2">
                          <button
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-60"
                          >
                            <LogOut className="w-4 h-4" /> {isLoggingOut ? 'Signing out...' : 'Sign out'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
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

      <PreRegistrationModal 
        isOpen={isPreRegModalOpen} 
        onClose={() => setIsPreRegModalOpen(false)} 
      />

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
            ) : isAuthLoading ? (
              <UserProfileSkeleton size="md" showText className="px-4 py-2" />
            ) : showAuthenticatedChrome ? (
              <>
                <Button variant="secondary" className="w-full justify-center" onClick={() => handleNavClick('dashboard')}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                </Button>
                {showProfileLoading ? (
                  <UserProfileSkeleton size="md" showText className="px-4 py-2" />
                ) : profile ? (
                  <div className="px-4 py-2">
                    <UserIdentity profile={profile} showText size="md" alwaysShowText className="!gap-2" />
                  </div>
                ) : null}
                <Button disabled={isLoggingOut} variant="outline" className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> {isLoggingOut ? 'Signing out...' : 'Logout'}
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
                <Button variant="secondary" className="w-full justify-center" onClick={() => handleNavClick('pre-registration')}>Pre-Registration</Button>
                <Button variant="primary" className="w-full justify-center" onClick={() => handleNavClick('signup')}>Self Host</Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};