"use client";

/**
 * use-stories.ts
 * ───────────────
 * React hook for managing stories with real-time Firestore subscription.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import {
  createStory,
  updateStory,
  deleteStory,
  subscribeStories,
} from '@/lib/firebase/story-store';
import type { StoryPost, StorySlide } from '@/types/interfaces';

export function useStories() {
  const { appContext } = useAppState();
  const { activeCompany } = useActiveCompany();
  const [stories, setStories] = useState<StoryPost[]>([]);
  const [loading, setLoading] = useState(true);

  const wId = appContext.workspaceId;
  const cId = activeCompany?.id ?? appContext.activeCompanyId ?? '';

  useEffect(() => {
    if (!wId || !cId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeStories(wId, cId, (data) => {
      setStories(data);
      setLoading(false);
    });
    return unsub;
  }, [wId, cId]);

  /* ── Actions ────────────────────────────────────────────────────── */

  const saveStory = useCallback(
    async (data: Omit<StoryPost, 'id'>) => {
      if (!wId || !cId) return '';
      return createStory(wId, cId, data);
    },
    [wId, cId],
  );

  const editStory = useCallback(
    async (storyId: string, data: Partial<StoryPost>) => {
      if (!wId || !cId) return;
      await updateStory(wId, cId, storyId, data);
    },
    [wId, cId],
  );

  const removeStory = useCallback(
    async (storyId: string) => {
      if (!wId || !cId) return;
      await deleteStory(wId, cId, storyId);
    },
    [wId, cId],
  );

  /* ── Computed ───────────────────────────────────────────────────── */

  const drafts = stories.filter((s) => s.status === 'draft');
  const scheduled = stories.filter((s) => s.status === 'scheduled');
  const published = stories.filter((s) => s.status === 'published');

  return {
    stories,
    drafts,
    scheduled,
    published,
    loading,
    saveStory,
    editStory,
    removeStory,
  };
}
