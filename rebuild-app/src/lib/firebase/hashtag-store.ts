"use client";

/**
 * hashtag-store.ts
 * -----------------
 * Firestore-backed CRUD for saved hashtag groups and banned tags.
 *
 * Path: workspaces/{wId}/companies/{cId}/hashtagGroups/{groupId}
 *       workspaces/{wId}/companies/{cId}/bannedHashtags/{tagId}
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
import type { HashtagGroup, BannedHashtag } from '@/types/interfaces';

// -- In-memory fallbacks --

const memoryGroups: HashtagGroup[] = [];
const memoryGroupListeners = new Set<(groups: HashtagGroup[]) => void>();

const memoryBanned: BannedHashtag[] = [];
const memoryBannedListeners = new Set<(tags: BannedHashtag[]) => void>();

function notifyGroupListeners() {
  const sorted = [...memoryGroups].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  for (const fn of memoryGroupListeners) fn(sorted);
}

function notifyBannedListeners() {
  for (const fn of memoryBannedListeners) fn([...memoryBanned]);
}

function groupPath(workspaceId: string, companyId: string) {
  return `workspaces/${workspaceId}/companies/${companyId}/hashtagGroups`;
}

function bannedPath(workspaceId: string, companyId: string) {
  return `workspaces/${workspaceId}/companies/${companyId}/bannedHashtags`;
}

// -- Hashtag Group CRUD --

export async function createHashtagGroup(
  workspaceId: string,
  companyId: string,
  data: Omit<HashtagGroup, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `mem-hg-${Date.now()}`;
    memoryGroups.push({ ...data, id });
    notifyGroupListeners();
    return id;
  }

  const ref = await addDoc(collection(firestore, groupPath(workspaceId, companyId)), data);
  return ref.id;
}

export async function updateHashtagGroup(
  workspaceId: string,
  companyId: string,
  groupId: string,
  data: Partial<HashtagGroup>,
): Promise<void> {
  if (!firestore) {
    const idx = memoryGroups.findIndex((g) => g.id === groupId);
    if (idx !== -1) Object.assign(memoryGroups[idx], data);
    notifyGroupListeners();
    return;
  }

  await updateDoc(
    doc(firestore, groupPath(workspaceId, companyId), groupId),
    { ...data, updatedAt: new Date().toISOString() },
  );
}

export async function deleteHashtagGroup(
  workspaceId: string,
  companyId: string,
  groupId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memoryGroups.findIndex((g) => g.id === groupId);
    if (idx !== -1) memoryGroups.splice(idx, 1);
    notifyGroupListeners();
    return;
  }

  await deleteDoc(doc(firestore, groupPath(workspaceId, companyId), groupId));
}

export function subscribeHashtagGroups(
  workspaceId: string,
  companyId: string,
  onData: (groups: HashtagGroup[]) => void,
): Unsubscribe {
  if (!firestore) {
    memoryGroupListeners.add(onData);
    onData([...memoryGroups]);
    return () => { memoryGroupListeners.delete(onData); };
  }

  const q = query(
    collection(firestore, groupPath(workspaceId, companyId)),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() } as HashtagGroup));
    onData(groups);
  });
}

// -- Banned Hashtag CRUD --

export async function addBannedHashtag(
  workspaceId: string,
  companyId: string,
  data: Omit<BannedHashtag, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `mem-bh-${Date.now()}`;
    memoryBanned.push({ ...data, id });
    notifyBannedListeners();
    return id;
  }

  const ref = await addDoc(collection(firestore, bannedPath(workspaceId, companyId)), data);
  return ref.id;
}

export async function removeBannedHashtag(
  workspaceId: string,
  companyId: string,
  tagId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memoryBanned.findIndex((t) => t.id === tagId);
    if (idx !== -1) memoryBanned.splice(idx, 1);
    notifyBannedListeners();
    return;
  }

  await deleteDoc(doc(firestore, bannedPath(workspaceId, companyId), tagId));
}

export function subscribeBannedHashtags(
  workspaceId: string,
  companyId: string,
  onData: (tags: BannedHashtag[]) => void,
): Unsubscribe {
  if (!firestore) {
    memoryBannedListeners.add(onData);
    onData([...memoryBanned]);
    return () => { memoryBannedListeners.delete(onData); };
  }

  const q = query(collection(firestore, bannedPath(workspaceId, companyId)));

  return onSnapshot(q, (snap) => {
    const tags = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BannedHashtag));
    onData(tags);
  });
}
