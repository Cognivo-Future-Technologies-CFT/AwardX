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

  return (
    <div className="supabase-network-loader" role="status" aria-live="polite" aria-label="Loading data">
      <div className="supabase-network-loader__overlay" />
      <div className="supabase-network-loader__spinner-wrap">
        <div className="supabase-network-loader__spinner" />
      </div>
    </div>
  );
};
