"use client";

/**
 * comment-store.ts
 * ────────────────
 * Firestore-backed internal messaging & approval comments system.
 *
 * Path: workspaces/{wId}/companies/{cId}/comments/{commentId}
 *
 * Supports: threaded comments, @mentions, internal/client visibility,
 * image annotations, real-time via onSnapshot.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type { PostComment } from '@/types/interfaces';

// ── In-memory fallback ─────────────────────────────────────────────────────

const memoryComments: PostComment[] = [];
const memoryListeners = new Map<string, Set<(comments: PostComment[]) => void>>();

function notifyMemoryListeners(postId: string) {
  const listeners = memoryListeners.get(postId);
  if (!listeners) return;
  const filtered = memoryComments
    .filter((c) => c.postId === postId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const fn of listeners) fn(filtered);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getCollectionPath(workspaceId: string, companyId: string) {
  return `workspaces/${workspaceId}/companies/${companyId}/comments`;
}

/**
 * Extract @mentions from comment body text.
 * Pattern: @username or @[Display Name]
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]|@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1] || match[2]);
  }
  return mentions;
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function addComment(
  workspaceId: string,
  companyId: string,
  comment: Omit<PostComment, 'id' | 'resolved' | 'resolvedBy' | 'updatedAt'>,
): Promise<string> {
  const now = new Date().toISOString();
  const fullComment: Omit<PostComment, 'id'> = {
    ...comment,
    resolved: false,
    updatedAt: now,
  };

  if (!firestore) {
    const id = `comment-${crypto.randomUUID().slice(0, 8)}`;
    memoryComments.push({ ...fullComment, id });
    notifyMemoryListeners(comment.postId);
    return id;
  }

  const colRef = collection(firestore, getCollectionPath(workspaceId, companyId));
  const docRef = await addDoc(colRef, fullComment);
  return docRef.id;
}

export async function updateComment(
  workspaceId: string,
  companyId: string,
  commentId: string,
  updates: Partial<Pick<PostComment, 'body' | 'visibility' | 'resolved' | 'resolvedBy'>>,
): Promise<void> {
  if (!firestore) {
    const c = memoryComments.find((x) => x.id === commentId);
    if (c) {
      Object.assign(c, updates, { updatedAt: new Date().toISOString() });
      notifyMemoryListeners(c.postId);
    }
    return;
  }

  const docRef = doc(firestore, getCollectionPath(workspaceId, companyId), commentId);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteComment(
  workspaceId: string,
  companyId: string,
  commentId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memoryComments.findIndex((x) => x.id === commentId);
    if (idx !== -1) {
      const postId = memoryComments[idx].postId;
      memoryComments.splice(idx, 1);
      notifyMemoryListeners(postId);
    }
    return;
  }

  await deleteDoc(doc(firestore, getCollectionPath(workspaceId, companyId), commentId));
}

export async function resolveThread(
  workspaceId: string,
  companyId: string,
  commentId: string,
  resolvedBy: string,
): Promise<void> {
  await updateComment(workspaceId, companyId, commentId, {
    resolved: true,
    resolvedBy,
  });
}

/**
 * Subscribe to comments for a specific post.
 * Returns comments in chronological order (oldest first for threaded display).
 */
export function subscribePostComments(
  workspaceId: string,
  companyId: string,
  postId: string,
  callback: (comments: PostComment[]) => void,
): Unsubscribe {
  if (!firestore) {
    if (!memoryListeners.has(postId)) memoryListeners.set(postId, new Set());
    memoryListeners.get(postId)!.add(callback);
    const filtered = memoryComments
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    callback(filtered);
    return () => { memoryListeners.get(postId)?.delete(callback); };
  }

  const colRef = collection(firestore, getCollectionPath(workspaceId, companyId));
  const q = query(
    colRef,
    where('postId', '==', postId),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PostComment, 'id'>),
    }));
    callback(items);
  });
}

/**
 * Get all unresolved comment counts for a list of post IDs.
 * Useful for showing comment badges in the review queue.
 */
export async function getCommentCounts(
  workspaceId: string,
  companyId: string,
  postIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const id of postIds) counts[id] = 0;

  if (!firestore) {
    for (const c of memoryComments) {
      if (postIds.includes(c.postId) && !c.resolved) {
        counts[c.postId] = (counts[c.postId] || 0) + 1;
      }
    }
    return counts;
  }

  const colRef = collection(firestore, getCollectionPath(workspaceId, companyId));
  const q = query(colRef, where('resolved', '==', false));
  const snap = await getDocs(q);

  for (const d of snap.docs) {
    const data = d.data() as PostComment;
    if (postIds.includes(data.postId)) {
      counts[data.postId] = (counts[data.postId] || 0) + 1;
    }
  }

  return counts;
}
