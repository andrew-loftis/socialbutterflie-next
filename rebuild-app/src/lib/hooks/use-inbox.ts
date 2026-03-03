"use client";

/**
 * use-inbox.ts
 * ─────────────
 * Hook aggregating inbox assignments, labels, and quick-reply templates.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import {
  subscribeAssignments,
  assignMessage,
  updateAssignmentStatus,
  subscribeLabels,
  createLabel,
  deleteLabel,
  subscribeQuickReplies,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
} from '@/lib/firebase/inbox-store';
import type { InboxAssignment, InboxLabel, QuickReplyTemplate } from '@/types/interfaces';

export function useInbox() {
  const { appContext } = useAppState();
  const { activeCompany } = useActiveCompany();
  const [assignments, setAssignments] = useState<InboxAssignment[]>([]);
  const [labels, setLabels] = useState<InboxLabel[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const wId = appContext.workspaceId;
  const cId = activeCompany?.id ?? appContext.activeCompanyId ?? '';

  useEffect(() => {
    if (!wId || !cId) { setLoading(false); return; }
    let done = 0;
    const check = () => { done++; if (done >= 3) setLoading(false); };

    const unsub1 = subscribeAssignments(wId, cId, (a) => { setAssignments(a); check(); });
    const unsub2 = subscribeLabels(wId, cId, (l) => { setLabels(l); check(); });
    const unsub3 = subscribeQuickReplies(wId, cId, (t) => { setQuickReplies(t); check(); });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [wId, cId]);

  /* ── Assignment actions ── */

  const assign = useCallback(
    async (data: InboxAssignment) => {
      if (!wId || !cId) return;
      await assignMessage(wId, cId, data);
    },
    [wId, cId],
  );

  const setAssignmentStatus = useCallback(
    async (msgId: string, status: InboxAssignment['status']) => {
      if (!wId || !cId) return;
      await updateAssignmentStatus(wId, cId, msgId, status);
    },
    [wId, cId],
  );

  /* ── Label actions ── */

  const addLabel = useCallback(
    async (data: Omit<InboxLabel, 'id'>) => {
      if (!wId || !cId) return '';
      return createLabel(wId, cId, data);
    },
    [wId, cId],
  );

  const removeLabel = useCallback(
    async (labelId: string) => {
      if (!wId || !cId) return;
      await deleteLabel(wId, cId, labelId);
    },
    [wId, cId],
  );

  /* ── Quick Reply actions ── */

  const addQuickReply = useCallback(
    async (data: Omit<QuickReplyTemplate, 'id'>) => {
      if (!wId || !cId) return '';
      return createQuickReply(wId, cId, data);
    },
    [wId, cId],
  );

  const editQuickReply = useCallback(
    async (id: string, data: Partial<QuickReplyTemplate>) => {
      if (!wId || !cId) return;
      await updateQuickReply(wId, cId, id, data);
    },
    [wId, cId],
  );

  const removeQuickReply = useCallback(
    async (id: string) => {
      if (!wId || !cId) return;
      await deleteQuickReply(wId, cId, id);
    },
    [wId, cId],
  );

  /* ── Helpers ── */

  const getAssignment = useCallback(
    (msgId: string) => assignments.find((a) => a.messageId === msgId),
    [assignments],
  );

  return {
    assignments,
    labels,
    quickReplies,
    loading,
    assign,
    setAssignmentStatus,
    getAssignment,
    addLabel,
    removeLabel,
    addQuickReply,
    editQuickReply,
    removeQuickReply,
  };
}
