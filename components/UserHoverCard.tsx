
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Calendar } from 'lucide-react';

interface UserHoverCardProps {
  user: {
    name: string;
    avatar: string;
    role?: string;
    email?: string;
    joinedDate?: string;
  };
  children: React.ReactNode;
}

export const UserHoverCard: React.FC<UserHoverCardProps> = ({ user, children }) => {
  const [isHovered, setIsHovered] = useState(false);
  let timeout: any;

  const handleMouseEnter = () => {
    clearTimeout(timeout);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeout = setTimeout(() => setIsHovered(false), 300);
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-0 overflow-hidden"
            style={{ minWidth: '280px' }}
          >
            {/* Header / Cover */}
            <div className="h-16 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
               <div className="absolute -bottom-6 left-6">
                  <div className="w-16 h-16 rounded-full border-4 border-white bg-white overflow-hidden shadow-sm">
                     {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                           {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                     )}
                  </div>
                  <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
               </div>
            </div>

            {/* Content */}
            <div className="pt-8 px-6 pb-6">
               <div className="mb-2">
                  <h4 className="text-lg font-bold text-slate-900 leading-tight">{user.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{user.role || 'Member'}</p>
               </div>

               <div className="space-y-3 mt-4">
                  {user.email && (
                     <div className="flex items-center text-xs text-slate-500 gap-2">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                     </div>
                  )}
                  {user.joinedDate && (
                     <div className="flex items-center text-xs text-slate-500 gap-2">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        Joined {new Date(user.joinedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                     </div>
                  )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
