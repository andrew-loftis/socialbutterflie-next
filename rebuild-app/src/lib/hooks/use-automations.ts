"use client";

/**
 * use-automations.ts
 * ───────────────────
 * Hook wrapping automation-store with real-time subscription,
 * providing CRUD + computed stats.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import {
  subscribeAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomationStatus,
  duplicateAutomation,
} from '@/lib/firebase/automation-store';
import type { CommentAutomation } from '@/types/interfaces';

export function useAutomations() {
  const { appContext } = useAppState();
  const { activeCompany } = useActiveCompany();
  const [rules, setRules] = useState<CommentAutomation[]>([]);
  const [loading, setLoading] = useState(true);

  const wId = appContext.workspaceId;
  const cId = activeCompany?.id;

  useEffect(() => {
    if (!wId || !cId) { setRules([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeAutomations(wId, cId, (data) => {
      setRules(data);
      setLoading(false);
    });
    return unsub;
  }, [wId, cId]);

  const addRule = useCallback(
    async (data: Omit<CommentAutomation, 'id'>) => {
      if (!wId || !cId) return '';
      return createAutomation(wId, cId, data);
    },
    [wId, cId],
  );

  const editRule = useCallback(
    async (ruleId: string, data: Partial<CommentAutomation>) => {
      if (!wId || !cId) return;
      await updateAutomation(wId, cId, ruleId, data);
    },
    [wId, cId],
  );

  const removeRule = useCallback(
    async (ruleId: string) => {
      if (!wId || !cId) return;
      await deleteAutomation(wId, cId, ruleId);
    },
    [wId, cId],
  );

  const toggleRule = useCallback(
    async (ruleId: string, currentStatus: CommentAutomation['status']) => {
      if (!wId || !cId) return;
      await toggleAutomationStatus(wId, cId, ruleId, currentStatus);
    },
    [wId, cId],
  );

  const duplicateRule = useCallback(
    async (rule: CommentAutomation) => {
      if (!wId || !cId) return '';
      return duplicateAutomation(wId, cId, rule);
    },
    [wId, cId],
  );

  /* Computed stats */
  const activeCount = rules.filter((r) => r.status === 'active').length;
  const totalTriggered = rules.reduce((s, r) => s + r.stats.triggered, 0);
  const totalSent = rules.reduce((s, r) => s + r.stats.sent, 0);
  const successRate = totalTriggered > 0 ? Math.round((totalSent / totalTriggered) * 100) : 0;

  return {
    rules,
    loading,
    addRule,
    editRule,
    removeRule,
    toggleRule,
    duplicateRule,
    activeCount,
    totalTriggered,
    totalSent,
    successRate,
  };
}
