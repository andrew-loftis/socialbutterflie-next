"use client";

/**
 * use-best-time.ts
 * ─────────────────
 * Hook for audience activity heatmaps, smart suggestions, and A/B tests.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import {
  subscribeAudienceActivity,
  generateTimeSuggestions,
  saveAudienceActivity,
  subscribeABTests,
  createABTest,
  completeABTest,
} from '@/lib/firebase/besttime-store';
import type { AudienceActivityData, PostTimeSuggestion, ABTimeTest } from '@/types/interfaces';

export function useBestTime() {
  const { appContext } = useAppState();
  const { activeCompany } = useActiveCompany();
  const [activity, setActivity] = useState<AudienceActivityData[]>([]);
  const [tests, setTests] = useState<ABTimeTest[]>([]);
  const [loading, setLoading] = useState(true);

  const wId = appContext.workspaceId;
  const cId = activeCompany?.id ?? appContext.activeCompanyId ?? '';

  useEffect(() => {
    if (!wId || !cId) { setLoading(false); return; }
    setLoading(true);
    let activityDone = false;
    let testsDone = false;

    const unsub1 = subscribeAudienceActivity(wId, cId, (data) => {
      setActivity(data);
      activityDone = true;
      if (testsDone) setLoading(false);
    });
    const unsub2 = subscribeABTests(wId, cId, (data) => {
      setTests(data);
      testsDone = true;
      if (activityDone) setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, [wId, cId]);

  const suggestions = useMemo(() => generateTimeSuggestions(activity), [activity]);

  const saveActivity = useCallback(
    async (data: AudienceActivityData) => {
      if (!wId || !cId) return;
      await saveAudienceActivity(wId, cId, data);
    },
    [wId, cId],
  );

  const startABTest = useCallback(
    async (data: Omit<ABTimeTest, 'id'>) => {
      if (!wId || !cId) return '';
      return createABTest(wId, cId, data);
    },
    [wId, cId],
  );

  const finishABTest = useCallback(
    async (testId: string, results: ABTimeTest['results'], winnerId: string) => {
      if (!wId || !cId) return;
      await completeABTest(wId, cId, testId, results, winnerId);
    },
    [wId, cId],
  );

  return {
    activity,
    suggestions,
    tests,
    loading,
    saveActivity,
    startABTest,
    finishABTest,
  };
}
