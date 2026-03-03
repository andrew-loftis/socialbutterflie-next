"use client";

/**
 * automation-store.ts
 * ────────────────────
 * Firestore-backed CRUD for comment-trigger DM automation rules.
 *
 * Path: workspaces/{wId}/companies/{cId}/automations/{ruleId}
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
import type { CommentAutomation } from '@/types/interfaces';

// ── In-memory fallback ──────────────────────────────────────────────

const memoryRules: CommentAutomation[] = [];
const memoryListeners = new Set<(rules: CommentAutomation[]) => void>();

function notifyMemoryListeners() {
  const sorted = [...memoryRules].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  for (const fn of memoryListeners) fn(sorted);
}

function getPath(workspaceId: string, companyId: string) {
  return `workspaces/${workspaceId}/companies/${companyId}/automations`;
}

// ── CRUD ────────────────────────────────────────────────────────────

export async function createAutomation(
  workspaceId: string,
  companyId: string,
  data: Omit<CommentAutomation, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `mem-auto-${Date.now()}`;
    memoryRules.push({ ...data, id });
    notifyMemoryListeners();
    return id;
  }

  const ref = await addDoc(
    collection(firestore, getPath(workspaceId, companyId)),
    data,
  );
  return ref.id;
}

export async function updateAutomation(
  workspaceId: string,
  companyId: string,
  ruleId: string,
  data: Partial<CommentAutomation>,
): Promise<void> {
  if (!firestore) {
    const idx = memoryRules.findIndex((r) => r.id === ruleId);
    if (idx !== -1) Object.assign(memoryRules[idx], data);
    notifyMemoryListeners();
    return;
  }

  await updateDoc(
    doc(firestore, getPath(workspaceId, companyId), ruleId),
    { ...data, updatedAt: new Date().toISOString() },
  );
}

export async function deleteAutomation(
  workspaceId: string,
  companyId: string,
  ruleId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memoryRules.findIndex((r) => r.id === ruleId);
    if (idx !== -1) memoryRules.splice(idx, 1);
    notifyMemoryListeners();
    return;
  }

  await deleteDoc(doc(firestore, getPath(workspaceId, companyId), ruleId));
}

export async function toggleAutomationStatus(
  workspaceId: string,
  companyId: string,
  ruleId: string,
  currentStatus: CommentAutomation['status'],
): Promise<void> {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  await updateAutomation(workspaceId, companyId, ruleId, { status: newStatus });
}

export async function duplicateAutomation(
  workspaceId: string,
  companyId: string,
  source: CommentAutomation,
): Promise<string> {
  const now = new Date().toISOString();
  const { id: _id, ...rest } = source;
  return createAutomation(workspaceId, companyId, {
    ...rest,
    name: `${source.name} (copy)`,
    status: 'draft',
    stats: { triggered: 0, sent: 0, failed: 0 },
    createdAt: now,
    updatedAt: now,
  });
}

// ── Subscription ────────────────────────────────────────────────────

export function subscribeAutomations(
  workspaceId: string,
  companyId: string,
  onData: (rules: CommentAutomation[]) => void,
): Unsubscribe {
  if (!firestore) {
    memoryListeners.add(onData);
    onData([...memoryRules]);
    return () => { memoryListeners.delete(onData); };
  }

  const q = query(
    collection(firestore, getPath(workspaceId, companyId)),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(q, (snap) => {
    const rules = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommentAutomation));
    onData(rules);
  });
}
