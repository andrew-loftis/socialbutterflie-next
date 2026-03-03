"use client";

/**
 * use-hashtag-studio.ts
 * ----------------------
 * Hook wrapping hashtag-store with real-time subscriptions
 * for saved groups and banned hashtags.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import {
  subscribeHashtagGroups,
  createHashtagGroup,
  updateHashtagGroup,
  deleteHashtagGroup,
  subscribeBannedHashtags,
  addBannedHashtag,
  removeBannedHashtag,
} from '@/lib/firebase/hashtag-store';
import type { HashtagGroup, BannedHashtag } from '@/types/interfaces';

export function useHashtagStudio() {
  const { appContext } = useAppState();
  const { activeCompany } = useActiveCompany();
  const [groups, setGroups] = useState<HashtagGroup[]>([]);
  const [banned, setBanned] = useState<BannedHashtag[]>([]);
  const [loading, setLoading] = useState(true);

  const wId = appContext.workspaceId;
  const cId = activeCompany?.id;

  useEffect(() => {
    if (!wId || !cId) { setGroups([]); setBanned([]); setLoading(false); return; }
    setLoading(true);
    let groupsLoaded = false;
    let bannedLoaded = false;

    const unsubGroups = subscribeHashtagGroups(wId, cId, (data) => {
      setGroups(data);
      groupsLoaded = true;
      if (bannedLoaded) setLoading(false);
    });

    const unsubBanned = subscribeBannedHashtags(wId, cId, (data) => {
      setBanned(data);
      bannedLoaded = true;
      if (groupsLoaded) setLoading(false);
    });

    return () => { unsubGroups(); unsubBanned(); };
  }, [wId, cId]);

  const saveGroup = useCallback(
    async (data: Omit<HashtagGroup, 'id'>) => {
      if (!wId || !cId) return '';
      return createHashtagGroup(wId, cId, data);
    },
    [wId, cId],
  );

  const editGroup = useCallback(
    async (groupId: string, data: Partial<HashtagGroup>) => {
      if (!wId || !cId) return;
      await updateHashtagGroup(wId, cId, groupId, data);
    },
    [wId, cId],
  );

  const removeGroup = useCallback(
    async (groupId: string) => {
      if (!wId || !cId) return;
      await deleteHashtagGroup(wId, cId, groupId);
    },
    [wId, cId],
  );

  const banTag = useCallback(
    async (hashtag: string, reason: string) => {
      if (!wId || !cId) return '';
      return addBannedHashtag(wId, cId, {
        companyId: cId,
        hashtag: hashtag.replace(/^#/, ''),
        reason,
        addedBy: appContext.userId,
        addedAt: new Date().toISOString(),
      });
    },
    [wId, cId, appContext.userId],
  );

  const unbanTag = useCallback(
    async (tagId: string) => {
      if (!wId || !cId) return;
      await removeBannedHashtag(wId, cId, tagId);
    },
    [wId, cId],
  );

  const bannedSet = new Set(banned.map((b) => b.hashtag.toLowerCase()));

  return {
    groups,
    banned,
    bannedSet,
    loading,
    saveGroup,
    editGroup,
    removeGroup,
    banTag,
    unbanTag,
  };
}
