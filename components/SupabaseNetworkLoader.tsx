import React, { useSyncExternalStore } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { getSupabaseLoadingSnapshot, subscribeSupabaseLoading } from '../services/supabaseLoading';

export const SupabaseNetworkLoader: React.FC = () => {
  const isSupabaseLoading = useSyncExternalStore(
    subscribeSupabaseLoading,
    getSupabaseLoadingSnapshot,
    () => false,
  );

  const activeQueryCount = useIsFetching();
  const activeMutationCount = useIsMutating();
  const isLoading = isSupabaseLoading || activeQueryCount > 0 || activeMutationCount > 0;

  if (!isLoading) {
    return null;
  }

  // Slim top progress bar instead of intrusive circular spinner
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      role="status"
      aria-live="polite"
      aria-label="Loading data"
    >
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-r-full"
        style={{
          animation: 'network-progress 1.4s ease-in-out infinite',
          transformOrigin: 'left',
        }}
      />
    </div>
  );
};
