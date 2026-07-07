import type { NavigateFunction } from 'react-router-dom';
import type { DashboardNotification } from '../services/database';
import { navigateToNotification } from './notificationNavigation';

export async function handleNotificationClick(
  notification: Pick<
    DashboardNotification,
    'id' | 'type' | 'programId' | 'organizationId' | 'metadata' | 'isRead'
  >,
  navigate: NavigateFunction,
  options?: {
    onMarkRead?: (id: string) => void | Promise<void>;
    ensureOrganizationContext?: (orgId: string) => Promise<void>;
  },
): Promise<void> {
  if (!notification.isRead) {
    await options?.onMarkRead?.(notification.id);
  }

  await navigateToNotification(
    {
      type: notification.type,
      programId: notification.programId,
      organizationId: notification.organizationId,
      metadata: notification.metadata,
    },
    navigate,
    options?.ensureOrganizationContext,
  );
}
