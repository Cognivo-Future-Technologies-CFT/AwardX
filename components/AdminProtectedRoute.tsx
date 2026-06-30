import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getSupabaseClient } from '../services/supabaseClient';

type AdminProtectedRouteProps = {
  children: React.ReactNode;
};

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, userId } = useAuth();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    if (!userId || !isAuthenticated) {
      setIsCheckingAdmin(false);
      return;
    }

    const checkAdmin = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase
          .from('profiles')
          .select('is_super_admin')
          .eq('id', userId)
          .single();
        
        if (error) throw error;
        setIsAdmin(!!data?.is_super_admin);
      } catch (err) {
        console.error('Failed to check admin status', err);
        setIsAdmin(false);
      } finally {
        setIsCheckingAdmin(false);
      }
    };
    void checkAdmin();
  }, [userId, isAuthenticated]);

  if (isLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying administrative access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isAdmin === false) {
    // If authenticated but not super admin, redirect to normal dashboard
    return <Navigate to="/workflow" replace />;
  }

  return <>{children}</>;
};
