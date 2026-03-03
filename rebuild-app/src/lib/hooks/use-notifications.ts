"use client";

import { useEffect, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';
import {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/lib/firebase/notification-store';
import type { Notification } from '@/types/interfaces';

export function useNotifications() {
  const { appContext } = useAppState();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!appContext.userId || appContext.userId === 'anonymous') return;

    return subscribeNotifications(
      appContext.workspaceId,
      appContext.userId,
      (items) => {
        setNotifications(items);
        setLoaded(true);
      },
    );
  }, [appContext.workspaceId, appContext.userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(id: string) {
    await markNotificationRead(appContext.workspaceId, id);
  }

  async function markAllRead() {
    await markAllNotificationsRead(appContext.workspaceId, appContext.userId);
  }

  async function dismiss(id: string) {
    await deleteNotification(appContext.workspaceId, id);
  }

  return {
    notifications,
    unreadCount,
    loading: !loaded,
    markRead,
    markAllRead,
    dismiss,
  };
}
