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

  useEffect(() => {
    // Wait until auth finishes loading
    if (isLoading) return;

    if (!isAuthenticated || !userId) {
      setIsAdmin(false);
      return;
    }

    let isMounted = true;

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
        if (isMounted) setIsAdmin(!!data?.is_super_admin);
      } catch (err) {
        console.error('Failed to check admin status', err);
        if (isMounted) setIsAdmin(false);
      }
    };

    void checkAdmin();

    return () => {
      isMounted = false;
    };
  }, [userId, isAuthenticated, isLoading]);

  // While we are figuring out auth state OR figuring out admin state, show loader.
  if (isLoading || (isAuthenticated && isAdmin === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying administrative access...</p>
        </div>
      </div>
    );
  }

  // If we are definitely not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // If we are authenticated but definitely NOT an admin, redirect immediately
  if (isAdmin === false) {
    return <Navigate to="/" replace />;
  }

  // Only render the admin UI if we are absolutely sure they are a super admin
  if (isAdmin === true) {
    return <>{children}</>;
  }

  // Fallback for typescript (should be unreachable)
  return null;
};
