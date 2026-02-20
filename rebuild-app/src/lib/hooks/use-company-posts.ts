"use client";

import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { firestore } from '@/lib/firebase/client';

export type CompanyPost = {
  id: string;
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'failed';
  caption: string;
  scheduledFor?: string;
  platform?: string;
};

const memoryPosts: Record<string, CompanyPost[]> = {};

export function useCompanyPosts() {
  const { appContext } = useAppState();
  const activeCompanyId = appContext.activeCompanyId;
  const key = `${appContext.workspaceId}:${activeCompanyId || 'none'}`;
  const [posts, setPosts] = useState<CompanyPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!activeCompanyId || !firestore) return;
    const postsRef = collection(
      firestore,
      'workspaces',
      appContext.workspaceId,
      'companies',
      activeCompanyId,
      'posts'
    );
    const q = query(postsRef, orderBy('scheduledFor', 'asc'));
    return onSnapshot(q, (snap) => {
      setPosts(
        snap.docs.map((entry) => ({
          id: entry.id,
          ...(entry.data() as Omit<CompanyPost, 'id'>),
        }))
      );
      setLoaded(true);
    });
  }, [activeCompanyId, appContext.workspaceId]);

  if (!activeCompanyId) {
    return { posts: [], loading: false };
  }

  if (!firestore) {
    return { posts: memoryPosts[key] || [], loading: false };
  }

  return { posts, loading: !loaded };
}
