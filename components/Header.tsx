
import React, { useState, useEffect } from 'react';
import { Menu, X, Sparkles, LayoutDashboard } from 'lucide-react';
import { Button } from './Button';
import { motion, useScroll } from 'framer-motion';

interface HeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentPage }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm' : 'bg-transparent'}`}
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
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">Nomify</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`text-sm font-medium transition-all duration-200 hover:text-indigo-600 ${
                  currentPage === item.id ? 'text-indigo-600 font-bold' : 'text-slate-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => handleNavClick('demo')} className="flex items-center gap-2">
               <LayoutDashboard className="w-4 h-4" /> Demo
            </Button>
            <div className="h-4 w-px bg-slate-200"></div>
            <Button variant="ghost" size="sm" onClick={() => handleNavClick('login')}>Login</Button>
            <Button variant="primary" size="sm" onClick={() => handleNavClick('signup')}>Get Started</Button>
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
          className="md:hidden bg-white border-b border-slate-100 p-4 space-y-4 shadow-xl"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`block w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 ${
                currentPage === item.id ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-4 flex flex-col space-y-3 px-4 border-t border-slate-100 mt-2">
            <Button variant="secondary" className="w-full justify-center" onClick={() => handleNavClick('demo')}>
               <LayoutDashboard className="w-4 h-4 mr-2" /> Open Demo
            </Button>
            <Button variant="outline" className="w-full justify-center" onClick={() => handleNavClick('login')}>Login</Button>
            <Button variant="primary" className="w-full justify-center" onClick={() => handleNavClick('signup')}>Get Started</Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
};
