"use client";

import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { firestore } from '@/lib/firebase/client';
import type { CompanyAnalyticsSnapshot } from '@/types/interfaces';

const memory: Record<string, CompanyAnalyticsSnapshot> = {};

export function useCompanyAnalytics(period = 'current-month') {
  const { appContext } = useAppState();
  const activeCompanyId = appContext.activeCompanyId;
  const memoryKey = `${appContext.workspaceId}:${activeCompanyId || 'none'}:${period}`;
  const [snapshot, setSnapshot] = useState<CompanyAnalyticsSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!activeCompanyId || !firestore) return;
    const analyticsRef = collection(
      firestore,
      'workspaces',
      appContext.workspaceId,
      'companies',
      activeCompanyId,
      'analytics'
    );
    const q = query(analyticsRef, where('period', '==', period));
    return onSnapshot(q, (result) => {
      setSnapshot(result.docs[0]?.data() as CompanyAnalyticsSnapshot | null);
      setLoaded(true);
    });
  }, [activeCompanyId, appContext.workspaceId, period]);

  if (!activeCompanyId) {
    return { analytics: null, loading: false };
  }

  if (!firestore) {
    return { analytics: memory[memoryKey] || null, loading: false };
  }

  return { analytics: snapshot, loading: !loaded };
}
