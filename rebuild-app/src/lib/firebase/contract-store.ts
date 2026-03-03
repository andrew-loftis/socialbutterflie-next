"use client";

/**
 * contract-store.ts
 * ─────────────────
 * Firestore-backed client contract & deliverable tracking.
 *
 * Path: workspaces/{wId}/companies/{cId}/contracts/{contractId}
 * Path: workspaces/{wId}/companies/{cId}/deliverableProgress/{dpId}
 *
 * Auto-counts deliverables when posts are published. Supports period rollover,
 * deadline alerts, and live progress tracking.
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
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type {
  CompanyContract,
  ContractDeliverable,
  DeliverablePeriod,
  DeliverableProgress,
  DeliverableType,
} from '@/types/interfaces';

// ── In-memory fallbacks ────────────────────────────────────────────────────

const memoryContracts: CompanyContract[] = [];
const memoryProgress: DeliverableProgress[] = [];
const memoryContractListeners = new Set<(contracts: CompanyContract[]) => void>();
const memoryProgressListeners = new Set<(progress: DeliverableProgress[]) => void>();

function notifyContractListeners() {
  const sorted = [...memoryContracts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const fn of memoryContractListeners) fn(sorted);
}

function notifyProgressListeners() {
  for (const fn of memoryProgressListeners) fn([...memoryProgress]);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getCollectionPath(workspaceId: string, companyId: string) {
  return `workspaces/${workspaceId}/companies/${companyId}/contracts`;
}

function getProgressPath(workspaceId: string, companyId: string) {
  return `workspaces/${workspaceId}/companies/${companyId}/deliverableProgress`;
}

/**
 * Compute the current period boundaries for a given period type.
 */
export function getCurrentPeriodBounds(period: DeliverablePeriod): { start: string; end: string } {
  const now = new Date();

  if (period === 'weekly') {
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day); // Sunday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  // quarterly
  const quarter = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), quarter * 3, 1);
  const end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Determine deliverable status based on progress vs time elapsed.
 */
export function computeDeliverableStatus(
  target: number,
  completed: number,
  scheduled: number,
  periodStart: string,
  periodEnd: string,
): DeliverableProgress['status'] {
  if (completed >= target) return 'complete';
  const now = Date.now();
  const start = new Date(periodStart).getTime();
  const end = new Date(periodEnd).getTime();
  const totalDuration = end - start;
  const elapsed = now - start;
  const percentTimeElapsed = elapsed / totalDuration;
  const percentDelivered = (completed + scheduled) / target;

  if (percentDelivered >= 1) return 'on_track';
  if (percentTimeElapsed > 0.75 && percentDelivered < 0.5) return 'behind';
  if (percentTimeElapsed > 0.5 && percentDelivered < 0.4) return 'at_risk';
  return 'on_track';
}

/**
 * Map a post type/format to a DeliverableType for auto-counting.
 */
export function mapPostToDeliverableType(
  postType?: string,
  format?: string,
): DeliverableType | null {
  if (postType === 'story') return 'story';
  if (postType === 'reel' || format === 'reel') return 'reel';
  if (postType === 'carousel' || format === 'carousel') return 'carousel';
  if (postType === 'short' || format === 'short') return 'short';
  // Default feed posts
  if (!postType || postType === 'post' || postType === 'feed') return 'feed_post';
  return null;
}

// ── CRUD: Contracts ────────────────────────────────────────────────────────

export async function createContract(
  workspaceId: string,
  companyId: string,
  contract: Omit<CompanyContract, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `contract-${crypto.randomUUID().slice(0, 8)}`;
    memoryContracts.push({ ...contract, id });
    notifyContractListeners();
    // Initialize progress records
    for (const d of contract.deliverables) {
      const bounds = getCurrentPeriodBounds(d.period);
      memoryProgress.push({
        companyId,
        contractId: id,
        deliverableId: d.id,
        periodStart: bounds.start,
        periodEnd: bounds.end,
        target: d.count,
        completed: 0,
        scheduled: 0,
        linkedPostIds: [],
        status: 'on_track',
      });
    }
    notifyProgressListeners();
    return id;
  }

  const colRef = collection(firestore, getCollectionPath(workspaceId, companyId));
  const docRef = await addDoc(colRef, contract);

  // Initialize deliverable progress records for current period
  const progressCol = collection(firestore, getProgressPath(workspaceId, companyId));
  for (const d of contract.deliverables) {
    const bounds = getCurrentPeriodBounds(d.period);
    await addDoc(progressCol, {
      companyId,
      contractId: docRef.id,
      deliverableId: d.id,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      target: d.count,
      completed: 0,
      scheduled: 0,
      linkedPostIds: [],
      status: 'on_track',
    } satisfies DeliverableProgress);
  }

  return docRef.id;
}

export async function updateContract(
  workspaceId: string,
  companyId: string,
  contractId: string,
  updates: Partial<CompanyContract>,
): Promise<void> {
  if (!firestore) {
    const idx = memoryContracts.findIndex((c) => c.id === contractId);
    if (idx !== -1) Object.assign(memoryContracts[idx], updates);
    notifyContractListeners();
    return;
  }

  const docRef = doc(firestore, getCollectionPath(workspaceId, companyId), contractId);
  await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteContract(
  workspaceId: string,
  companyId: string,
  contractId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memoryContracts.findIndex((c) => c.id === contractId);
    if (idx !== -1) memoryContracts.splice(idx, 1);
    notifyContractListeners();
    return;
  }

  // Delete progress records first
  const progressCol = collection(firestore, getProgressPath(workspaceId, companyId));
  const progressSnap = await getDocs(
    query(progressCol, where('contractId', '==', contractId)),
  );
  for (const d of progressSnap.docs) await deleteDoc(d.ref);

  // Delete contract
  await deleteDoc(doc(firestore, getCollectionPath(workspaceId, companyId), contractId));
}

export function subscribeContracts(
  workspaceId: string,
  companyId: string,
  callback: (contracts: CompanyContract[]) => void,
): Unsubscribe {
  if (!firestore) {
    memoryContractListeners.add(callback);
    callback(memoryContracts.filter((c) => c.companyId === companyId));
    return () => { memoryContractListeners.delete(callback); };
  }

  const colRef = collection(firestore, getCollectionPath(workspaceId, companyId));
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<CompanyContract, 'id'>),
    }));
    callback(items);
  });
}

// ── CRUD: Deliverable Progress ─────────────────────────────────────────────

export function subscribeDeliverableProgress(
  workspaceId: string,
  companyId: string,
  callback: (progress: DeliverableProgress[]) => void,
): Unsubscribe {
  if (!firestore) {
    memoryProgressListeners.add(callback);
    callback(memoryProgress.filter((p) => p.companyId === companyId));
    return () => { memoryProgressListeners.delete(callback); };
  }

  const colRef = collection(firestore, getProgressPath(workspaceId, companyId));
  return onSnapshot(colRef, (snap) => {
    const items = snap.docs.map((d) => ({
      ...(d.data() as DeliverableProgress),
    }));
    callback(items);
  });
}

/**
 * Record a post publication against matching deliverables.
 * Called when a post status changes to 'published'.
 */
export async function recordDeliverableCompletion(
  workspaceId: string,
  companyId: string,
  postId: string,
  deliverableType: DeliverableType,
  platform?: string,
): Promise<void> {
  if (!firestore) {
    // In-memory: find matching progress and increment
    for (const p of memoryProgress) {
      if (p.companyId !== companyId) continue;
      const contract = memoryContracts.find((c) => c.id === p.contractId);
      if (!contract || contract.status !== 'active') continue;
      const deliverable = contract.deliverables.find((d) => d.id === p.deliverableId);
      if (!deliverable || deliverable.type !== deliverableType) continue;
      if (deliverable.platforms?.length && platform && !deliverable.platforms.includes(platform)) continue;
      if (!p.linkedPostIds.includes(postId)) {
        p.completed += 1;
        p.linkedPostIds.push(postId);
        p.status = computeDeliverableStatus(p.target, p.completed, p.scheduled, p.periodStart, p.periodEnd);
      }
    }
    notifyProgressListeners();
    return;
  }

  // Firestore: find active contracts, match deliverables, update progress
  const contractsCol = collection(firestore, getCollectionPath(workspaceId, companyId));
  const contractSnap = await getDocs(
    query(contractsCol, where('status', '==', 'active')),
  );

  for (const contractDoc of contractSnap.docs) {
    const contract = contractDoc.data() as Omit<CompanyContract, 'id'>;
    for (const deliverable of contract.deliverables) {
      if (deliverable.type !== deliverableType) continue;
      if (deliverable.platforms?.length && platform && !deliverable.platforms.includes(platform)) continue;

      // Find the current period's progress record
      const progressCol = collection(firestore, getProgressPath(workspaceId, companyId));
      const bounds = getCurrentPeriodBounds(deliverable.period);
      const progressSnap = await getDocs(
        query(
          progressCol,
          where('contractId', '==', contractDoc.id),
          where('deliverableId', '==', deliverable.id),
          where('periodStart', '==', bounds.start),
        ),
      );

      if (progressSnap.empty) {
        // Create a new progress record for this period
        await addDoc(progressCol, {
          companyId,
          contractId: contractDoc.id,
          deliverableId: deliverable.id,
          periodStart: bounds.start,
          periodEnd: bounds.end,
          target: deliverable.count,
          completed: 1,
          scheduled: 0,
          linkedPostIds: [postId],
          status: computeDeliverableStatus(deliverable.count, 1, 0, bounds.start, bounds.end),
        } satisfies DeliverableProgress);
      } else {
        const progressDoc = progressSnap.docs[0];
        const data = progressDoc.data() as DeliverableProgress;
        if (!data.linkedPostIds.includes(postId)) {
          const newCompleted = data.completed + 1;
          await updateDoc(progressDoc.ref, {
            completed: newCompleted,
            linkedPostIds: [...data.linkedPostIds, postId],
            status: computeDeliverableStatus(
              data.target, newCompleted, data.scheduled, data.periodStart, data.periodEnd,
            ),
          });
        }
      }
    }
  }
}

/**
 * Record a scheduled post against matching deliverables.
 */
export async function recordDeliverableScheduled(
  workspaceId: string,
  companyId: string,
  postId: string,
  deliverableType: DeliverableType,
  platform?: string,
): Promise<void> {
  if (!firestore) {
    for (const p of memoryProgress) {
      if (p.companyId !== companyId) continue;
      const contract = memoryContracts.find((c) => c.id === p.contractId);
      if (!contract || contract.status !== 'active') continue;
      const deliverable = contract.deliverables.find((d) => d.id === p.deliverableId);
      if (!deliverable || deliverable.type !== deliverableType) continue;
      if (!p.linkedPostIds.includes(postId)) {
        p.scheduled += 1;
        p.linkedPostIds.push(postId);
        p.status = computeDeliverableStatus(p.target, p.completed, p.scheduled, p.periodStart, p.periodEnd);
      }
    }
    notifyProgressListeners();
    return;
  }

  // Similar to completion, but increments `scheduled` instead
  const contractsCol = collection(firestore, getCollectionPath(workspaceId, companyId));
  const contractSnap = await getDocs(
    query(contractsCol, where('status', '==', 'active')),
  );

  for (const contractDoc of contractSnap.docs) {
    const contract = contractDoc.data() as Omit<CompanyContract, 'id'>;
    for (const deliverable of contract.deliverables) {
      if (deliverable.type !== deliverableType) continue;
      if (deliverable.platforms?.length && platform && !deliverable.platforms.includes(platform)) continue;

      const progressCol = collection(firestore, getProgressPath(workspaceId, companyId));
      const bounds = getCurrentPeriodBounds(deliverable.period);
      const progressSnap = await getDocs(
        query(
          progressCol,
          where('contractId', '==', contractDoc.id),
          where('deliverableId', '==', deliverable.id),
          where('periodStart', '==', bounds.start),
        ),
      );

      if (!progressSnap.empty) {
        const progressDoc = progressSnap.docs[0];
        const data = progressDoc.data() as DeliverableProgress;
        if (!data.linkedPostIds.includes(postId)) {
          const newScheduled = data.scheduled + 1;
          await updateDoc(progressDoc.ref, {
            scheduled: newScheduled,
            linkedPostIds: [...data.linkedPostIds, postId],
            status: computeDeliverableStatus(
              data.target, data.completed, newScheduled, data.periodStart, data.periodEnd,
            ),
          });
        }
      }
    }
  }
}
