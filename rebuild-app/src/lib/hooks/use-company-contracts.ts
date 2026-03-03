"use client";

import { useEffect, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';
import {
  subscribeContracts,
  subscribeDeliverableProgress,
} from '@/lib/firebase/contract-store';
import type { CompanyContract, DeliverableProgress } from '@/types/interfaces';

export function useCompanyContracts() {
  const { appContext } = useAppState();
  const activeCompanyId = appContext.activeCompanyId;
  const [contracts, setContracts] = useState<CompanyContract[]>([]);
  const [progress, setProgress] = useState<DeliverableProgress[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!activeCompanyId) return;

    const unsubContracts = subscribeContracts(
      appContext.workspaceId,
      activeCompanyId,
      (items) => {
        setContracts(items);
        setLoaded(true);
      },
    );

    const unsubProgress = subscribeDeliverableProgress(
      appContext.workspaceId,
      activeCompanyId,
      setProgress,
    );

    return () => {
      unsubContracts();
      unsubProgress();
    };
  }, [appContext.workspaceId, activeCompanyId]);

  // Merge progress into a friendlier structure
  const activeContracts = contracts.filter((c) => c.status === 'active');

  function getProgressForContract(contractId: string) {
    return progress.filter((p) => p.contractId === contractId);
  }

  function getOverallStatus(): 'on_track' | 'at_risk' | 'behind' | 'complete' | 'none' {
    if (!progress.length) return 'none';
    if (progress.some((p) => p.status === 'behind')) return 'behind';
    if (progress.some((p) => p.status === 'at_risk')) return 'at_risk';
    if (progress.every((p) => p.status === 'complete')) return 'complete';
    return 'on_track';
  }

  return {
    contracts,
    activeContracts,
    progress,
    loading: !loaded,
    getProgressForContract,
    getOverallStatus,
  };
}
