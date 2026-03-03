"use client";

import { useEffect, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { subscribePostComments, addComment, resolveThread, extractMentions } from '@/lib/firebase/comment-store';
import type { PostComment } from '@/types/interfaces';

export function usePostComments(postId: string | null) {
  const { appContext } = useAppState();
  const activeCompanyId = appContext.activeCompanyId;
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!activeCompanyId || !postId) {
      setComments([]);
      setLoaded(true);
      return;
    }

    return subscribePostComments(
      appContext.workspaceId,
      activeCompanyId,
      postId,
      (items) => {
        setComments(items);
        setLoaded(true);
      },
    );
  }, [appContext.workspaceId, activeCompanyId, postId]);

  // Organize into threads: top-level + replies
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesMap = new Map<string, PostComment[]>();
  for (const c of comments) {
    if (c.parentId) {
      if (!repliesMap.has(c.parentId)) repliesMap.set(c.parentId, []);
      repliesMap.get(c.parentId)!.push(c);
    }
  }

  async function submitComment(
    body: string,
    authorId: string,
    authorName: string,
    visibility: 'internal' | 'client' = 'internal',
    parentId?: string,
    authorAvatarUrl?: string,
  ): Promise<string> {
    if (!activeCompanyId || !postId) throw new Error('No active company or post');

    const mentions = extractMentions(body);

    return addComment(appContext.workspaceId, activeCompanyId, {
      postId,
      companyId: activeCompanyId,
      parentId,
      authorId,
      authorName,
      authorAvatarUrl,
      body,
      mentions,
      visibility,
      createdAt: new Date().toISOString(),
    });
  }

  async function resolve(commentId: string) {
    if (!activeCompanyId) return;
    await resolveThread(appContext.workspaceId, activeCompanyId, commentId, appContext.userId);
  }

  return {
    comments,
    topLevel,
    repliesMap,
    loading: !loaded,
    submitComment,
    resolve,
    totalCount: comments.length,
    unresolvedCount: comments.filter((c) => !c.resolved && !c.parentId).length,
  };
}
