"use client";

import { collection, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { firestore } from '@/lib/firebase/client';

export type CompanyPost = {
  id: string;
  status: 'draft' | 'in_review' | 'scheduled' | 'published' | 'failed';
  caption: string;
  scheduledFor?: string;
  /** Single platform (legacy) */
  platform?: string;
  /** Multi-platform targets (preferred) */
  platforms?: string[];
  createdAt?: string;
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
    // No orderBy on optional field — Firestore excludes docs missing that field.
    // Sort client-side instead: scheduled/published first (by date), drafts last.
    const q = query(postsRef);
    return onSnapshot(q, (snap) => {
      const allPosts = snap.docs.map((entry) => ({
        id: entry.id,
        ...(entry.data() as Omit<CompanyPost, 'id'>),
      }));
      // Sort: scheduled asc (nulls last), then by status priority
      const STATUS_ORDER: Record<string, number> = {
        published: 0, scheduled: 1, in_review: 2, draft: 3, failed: 4,
      };
      allPosts.sort((a, b) => {
        if (a.scheduledFor && b.scheduledFor) {
          return a.scheduledFor.localeCompare(b.scheduledFor);
        }
        if (a.scheduledFor) return -1;
        if (b.scheduledFor) return 1;
        return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      });
      setPosts(allPosts);
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
