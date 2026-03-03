"use client";

/**
 * task-store.ts
 * ─────────────
 * Firestore-backed task management for dashboard widgets.
 *
 * Path: workspaces/{wId}/companies/{cId}/tasks/{taskId}
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
import type { DashboardTask } from '@/types/interfaces';

// ── In-memory fallback ─────────────────────────────────────────────────────

const memoryTasks: DashboardTask[] = [];
const memoryListeners = new Set<(tasks: DashboardTask[]) => void>();

function notifyMemoryListeners() {
  const sorted = [...memoryTasks].sort((a, b) => a.order - b.order);
  for (const fn of memoryListeners) fn(sorted);
}

function getPath(workspaceId: string, companyId: string) {
  return `workspaces/${workspaceId}/companies/${companyId}/tasks`;
}

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function createTask(
  workspaceId: string,
  companyId: string,
  task: Omit<DashboardTask, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `task-${crypto.randomUUID().slice(0, 8)}`;
    memoryTasks.push({ ...task, id });
    notifyMemoryListeners();
    return id;
  }

  const colRef = collection(firestore, getPath(workspaceId, companyId));
  const docRef = await addDoc(colRef, task);
  return docRef.id;
}

export async function updateTask(
  workspaceId: string,
  companyId: string,
  taskId: string,
  updates: Partial<DashboardTask>,
): Promise<void> {
  if (!firestore) {
    const t = memoryTasks.find((x) => x.id === taskId);
    if (t) Object.assign(t, updates, { updatedAt: new Date().toISOString() });
    notifyMemoryListeners();
    return;
  }

  const docRef = doc(firestore, getPath(workspaceId, companyId), taskId);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteTask(
  workspaceId: string,
  companyId: string,
  taskId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memoryTasks.findIndex((x) => x.id === taskId);
    if (idx !== -1) memoryTasks.splice(idx, 1);
    notifyMemoryListeners();
    return;
  }

  await deleteDoc(doc(firestore, getPath(workspaceId, companyId), taskId));
}

export function subscribeTasks(
  workspaceId: string,
  companyId: string,
  callback: (tasks: DashboardTask[]) => void,
): Unsubscribe {
  if (!firestore) {
    memoryListeners.add(callback);
    callback(memoryTasks.filter((t) => t.companyId === companyId));
    return () => { memoryListeners.delete(callback); };
  }

  const colRef = collection(firestore, getPath(workspaceId, companyId));
  const q = query(colRef, orderBy('order', 'asc'));

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<DashboardTask, 'id'>),
    }));
    callback(items);
  });
}

export async function reorderTasks(
  workspaceId: string,
  companyId: string,
  taskIds: string[],
): Promise<void> {
  if (!firestore) {
    for (let i = 0; i < taskIds.length; i++) {
      const t = memoryTasks.find((x) => x.id === taskIds[i]);
      if (t) t.order = i;
    }
    notifyMemoryListeners();
    return;
  }

  // Batch update orders
  const promises = taskIds.map((id, i) => {
    const docRef = doc(firestore!, getPath(workspaceId, companyId), id);
    return updateDoc(docRef, { order: i });
  });
  await Promise.all(promises);
}
