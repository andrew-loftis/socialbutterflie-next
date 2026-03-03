"use client";

/**
 * inbox-store.ts
 * ───────────────
 * Firestore-backed store for inbox enhancements:
 * assignments, labels, and quick-reply templates.
 *
 * Assignments:    workspaces/{wId}/companies/{cId}/inboxAssignments/{msgId}
 * Labels:         workspaces/{wId}/companies/{cId}/inboxLabels/{labelId}
 * Quick Replies:  workspaces/{wId}/companies/{cId}/quickReplies/{templateId}
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type { InboxAssignment, InboxLabel, QuickReplyTemplate } from '@/types/interfaces';

/* ── In-memory fallback ─────────────────────────────────────────── */

const memAssignments: Map<string, InboxAssignment> = new Map();
const memLabels: InboxLabel[] = [];
const memQuickReplies: QuickReplyTemplate[] = [];
const memAssignListeners = new Set<(a: InboxAssignment[]) => void>();
const memLabelListeners = new Set<(l: InboxLabel[]) => void>();
const memQRListeners = new Set<(t: QuickReplyTemplate[]) => void>();

function notifyAssignments() {
  for (const fn of memAssignListeners) fn(Array.from(memAssignments.values()));
}
function notifyLabels() {
  for (const fn of memLabelListeners) fn([...memLabels]);
}
function notifyQR() {
  for (const fn of memQRListeners) fn([...memQuickReplies]);
}

function assignPath(wId: string, cId: string) { return `workspaces/${wId}/companies/${cId}/inboxAssignments`; }
function labelPath(wId: string, cId: string) { return `workspaces/${wId}/companies/${cId}/inboxLabels`; }
function qrPath(wId: string, cId: string) { return `workspaces/${wId}/companies/${cId}/quickReplies`; }

/* ── Assignments ─────────────────────────────────────────────────── */

export async function assignMessage(
  wId: string, cId: string,
  data: InboxAssignment,
): Promise<void> {
  if (!firestore) {
    memAssignments.set(data.messageId, data);
    notifyAssignments();
    return;
  }
  await setDoc(
    doc(firestore, assignPath(wId, cId), data.messageId),
    data,
  );
}

export async function updateAssignmentStatus(
  wId: string, cId: string,
  messageId: string, status: InboxAssignment['status'],
): Promise<void> {
  if (!firestore) {
    const a = memAssignments.get(messageId);
    if (a) { a.status = status; notifyAssignments(); }
    return;
  }
  await updateDoc(
    doc(firestore, assignPath(wId, cId), messageId),
    { status },
  );
}

export function subscribeAssignments(
  wId: string, cId: string,
  callback: (a: InboxAssignment[]) => void,
): Unsubscribe {
  if (!firestore) {
    memAssignListeners.add(callback);
    callback(Array.from(memAssignments.values()));
    return () => { memAssignListeners.delete(callback); };
  }
  return onSnapshot(
    collection(firestore, assignPath(wId, cId)),
    (snap) => {
      callback(snap.docs.map((d) => d.data() as InboxAssignment));
    },
  );
}

/* ── Labels ──────────────────────────────────────────────────────── */

export async function createLabel(
  wId: string, cId: string,
  data: Omit<InboxLabel, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `mem-label-${Date.now()}`;
    memLabels.push({ ...data, id });
    notifyLabels();
    return id;
  }
  const ref = await addDoc(collection(firestore, labelPath(wId, cId)), data);
  return ref.id;
}

export async function deleteLabel(
  wId: string, cId: string, labelId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memLabels.findIndex((l) => l.id === labelId);
    if (idx !== -1) memLabels.splice(idx, 1);
    notifyLabels();
    return;
  }
  await deleteDoc(doc(firestore, labelPath(wId, cId), labelId));
}

export function subscribeLabels(
  wId: string, cId: string,
  callback: (l: InboxLabel[]) => void,
): Unsubscribe {
  if (!firestore) {
    memLabelListeners.add(callback);
    callback([...memLabels]);
    return () => { memLabelListeners.delete(callback); };
  }
  return onSnapshot(
    collection(firestore, labelPath(wId, cId)),
    (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InboxLabel)));
    },
  );
}

/* ── Quick Reply Templates ───────────────────────────────────────── */

export async function createQuickReply(
  wId: string, cId: string,
  data: Omit<QuickReplyTemplate, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `mem-qr-${Date.now()}`;
    memQuickReplies.push({ ...data, id });
    notifyQR();
    return id;
  }
  const ref = await addDoc(collection(firestore, qrPath(wId, cId)), data);
  return ref.id;
}

export async function updateQuickReply(
  wId: string, cId: string,
  templateId: string, data: Partial<QuickReplyTemplate>,
): Promise<void> {
  if (!firestore) {
    const t = memQuickReplies.find((x) => x.id === templateId);
    if (t) Object.assign(t, data);
    notifyQR();
    return;
  }
  await updateDoc(
    doc(firestore, qrPath(wId, cId), templateId),
    data as Record<string, unknown>,
  );
}

export async function deleteQuickReply(
  wId: string, cId: string, templateId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memQuickReplies.findIndex((t) => t.id === templateId);
    if (idx !== -1) memQuickReplies.splice(idx, 1);
    notifyQR();
    return;
  }
  await deleteDoc(doc(firestore, qrPath(wId, cId), templateId));
}

export function subscribeQuickReplies(
  wId: string, cId: string,
  callback: (t: QuickReplyTemplate[]) => void,
): Unsubscribe {
  if (!firestore) {
    memQRListeners.add(callback);
    callback([...memQuickReplies]);
    return () => { memQRListeners.delete(callback); };
  }
  const q = query(collection(firestore, qrPath(wId, cId)), orderBy('name'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuickReplyTemplate)));
  });
}
