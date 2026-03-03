"use client";

/**
 * story-store.ts
 * ──────────────
 * Firestore-backed CRUD for multi-slide story posts.
 *
 * Path: workspaces/{wId}/companies/{cId}/stories/{storyId}
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type { StoryPost } from '@/types/interfaces';

/* ── In-memory fallback ─────────────────────────────────────────── */

const memoryStories: StoryPost[] = [];
const memoryListeners = new Set<(s: StoryPost[]) => void>();

function notifyMemory() {
  const sorted = [...memoryStories].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  for (const fn of memoryListeners) fn(sorted);
}

function getPath(workspaceId: string, companyId: string) {
  return `workspaces/${workspaceId}/companies/${companyId}/stories`;
}

/* ── CRUD ────────────────────────────────────────────────────────── */

export async function createStory(
  workspaceId: string,
  companyId: string,
  data: Omit<StoryPost, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `mem-story-${Date.now()}`;
    memoryStories.push({ ...data, id });
    notifyMemory();
    return id;
  }
  const ref = await addDoc(
    collection(firestore, getPath(workspaceId, companyId)),
    data,
  );
  return ref.id;
}

export async function updateStory(
  workspaceId: string,
  companyId: string,
  storyId: string,
  data: Partial<StoryPost>,
): Promise<void> {
  if (!firestore) {
    const idx = memoryStories.findIndex((s) => s.id === storyId);
    if (idx !== -1) Object.assign(memoryStories[idx], data, { updatedAt: new Date().toISOString() });
    notifyMemory();
    return;
  }
  await updateDoc(
    doc(firestore, getPath(workspaceId, companyId), storyId),
    data as Record<string, unknown>,
  );
}

export async function deleteStory(
  workspaceId: string,
  companyId: string,
  storyId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memoryStories.findIndex((s) => s.id === storyId);
    if (idx !== -1) memoryStories.splice(idx, 1);
    notifyMemory();
    return;
  }
  await deleteDoc(doc(firestore, getPath(workspaceId, companyId), storyId));
}

/* ── Subscribe ───────────────────────────────────────────────────── */

export function subscribeStories(
  workspaceId: string,
  companyId: string,
  callback: (stories: StoryPost[]) => void,
): Unsubscribe {
  if (!firestore) {
    memoryListeners.add(callback);
    callback([...memoryStories]);
    return () => { memoryListeners.delete(callback); };
  }

  const q = query(
    collection(firestore, getPath(workspaceId, companyId)),
    orderBy('updatedAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    const stories = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as StoryPost[];
    callback(stories);
  });
}
