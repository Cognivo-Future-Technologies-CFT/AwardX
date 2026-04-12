import React, { useState, useEffect } from 'react';
import { Menu, X, Sparkles, LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from './Button';
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
    { id: 'pricing', label: 'Pricing' },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <motion.header 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent'}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div 
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => handleNavClick('home')}
          >
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground group-hover:text-emerald-700 transition-colors font-display">AwardX</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-sm font-medium transition-all duration-200 hover:text-emerald-700 ${
                  currentPage === item.id ? 'text-emerald-700 font-semibold' : 'text-slate-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleNavClick('dashboard')} className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Button>
                <div className="h-4 w-px bg-slate-200"></div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full border-2 border-slate-200 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                      {currentUser?.name.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700">{currentUser?.name || 'User'}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-2 text-slate-600 hover:text-red-600">
                  <LogOut className="w-4 h-4" /> Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleNavClick('demo')} className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" /> Demo
                </Button>
                <div className="h-4 w-px bg-slate-200"></div>
                <Button variant="ghost" size="sm" onClick={() => handleNavClick('login')}>Login</Button>
                <Button variant="primary" size="sm" onClick={() => handleNavClick('signup')}>Get Started</Button>
              </>
            )}
          </div>

          <button 
            className="md:hidden text-slate-600 hover:text-slate-900"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="md:hidden bg-background border-b border-border p-4 space-y-4 shadow-sm"
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
            {isAuthenticated ? (
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
                <Button variant="outline" className="w-full justify-center" onClick={() => handleNavClick('login')}>Login</Button>
                <Button variant="primary" className="w-full justify-center" onClick={() => handleNavClick('signup')}>Get Started</Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};