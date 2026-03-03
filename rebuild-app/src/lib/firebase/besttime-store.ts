"use client";

/**
 * besttime-store.ts
 * ──────────────────
 * Firestore-backed store for audience activity heatmaps and A/B time tests.
 *
 * AudienceActivity: workspaces/{wId}/companies/{cId}/audienceActivity/{platform}
 * ABTimeTests:      workspaces/{wId}/companies/{cId}/abTimeTests/{testId}
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type { AudienceActivityData, ABTimeTest, PostTimeSuggestion } from '@/types/interfaces';

/* ── In-memory fallback ─────────────────────────────────────────── */

const memActivity: Map<string, AudienceActivityData> = new Map();
const memTests: ABTimeTest[] = [];
const memActivityListeners = new Set<(d: AudienceActivityData[]) => void>();
const memTestListeners = new Set<(t: ABTimeTest[]) => void>();

function notifyActivityListeners() {
  const data = Array.from(memActivity.values());
  for (const fn of memActivityListeners) fn(data);
}

function notifyTestListeners() {
  const sorted = [...memTests].sort(
    (a, b) => new Date(b.scheduledAtA).getTime() - new Date(a.scheduledAtA).getTime(),
  );
  for (const fn of memTestListeners) fn(sorted);
}

function activityPath(wId: string, cId: string) {
  return `workspaces/${wId}/companies/${cId}/audienceActivity`;
}
function testPath(wId: string, cId: string) {
  return `workspaces/${wId}/companies/${cId}/abTimeTests`;
}

/* ── Audience Activity ───────────────────────────────────────────── */

/**
 * Upsert heatmap data for a given platform.
 * Uses the platform name as the document ID for easy lookup.
 */
export async function saveAudienceActivity(
  workspaceId: string,
  companyId: string,
  data: AudienceActivityData,
): Promise<void> {
  const key = `${companyId}-${data.platform}`;

  if (!firestore) {
    memActivity.set(key, data);
    notifyActivityListeners();
    return;
  }

  await setDoc(
    doc(firestore, activityPath(workspaceId, companyId), data.platform),
    data,
    { merge: true },
  );
}

export function subscribeAudienceActivity(
  workspaceId: string,
  companyId: string,
  callback: (data: AudienceActivityData[]) => void,
): Unsubscribe {
  if (!firestore) {
    memActivityListeners.add(callback);
    callback(Array.from(memActivity.values()));
    return () => { memActivityListeners.delete(callback); };
  }

  return onSnapshot(
    collection(firestore, activityPath(workspaceId, companyId)),
    (snap) => {
      callback(snap.docs.map((d) => d.data() as AudienceActivityData));
    },
  );
}

/* ── Smart suggestion engine ─────────────────────────────────────── */

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Generate posting time suggestions from heatmap data.
 * Pure function - no Firestore call needed.
 */
export function generateTimeSuggestions(
  activityData: AudienceActivityData[],
): PostTimeSuggestion[] {
  const suggestions: PostTimeSuggestion[] = [];

  for (const data of activityData) {
    if (!data.heatmap || data.heatmap.length === 0) continue;

    // Find top 3 slots
    const slots: { day: number; hour: number; value: number }[] = [];
    for (let day = 0; day < data.heatmap.length; day++) {
      for (let hour = 0; hour < (data.heatmap[day]?.length ?? 0); hour++) {
        slots.push({ day, hour, value: data.heatmap[day][hour] });
      }
    }
    slots.sort((a, b) => b.value - a.value);
    const topSlots = slots.slice(0, 3);
    const maxValue = slots[0]?.value ?? 1;

    for (const slot of topSlots) {
      const confidence = Math.round((slot.value / maxValue) * 100);
      suggestions.push({
        platform: data.platform,
        suggestedAt: `${DAY_LABELS[slot.day]} ${slot.hour.toString().padStart(2, '0')}:00`,
        confidence,
        reason: `Peak activity (${slot.value.toLocaleString()} avg impressions) based on ${data.sampleSize} post samples`,
      });
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/* ── A/B Time Tests ──────────────────────────────────────────────── */

export async function createABTest(
  workspaceId: string,
  companyId: string,
  data: Omit<ABTimeTest, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `mem-ab-${Date.now()}`;
    memTests.push({ ...data, id });
    notifyTestListeners();
    return id;
  }
  const ref = await addDoc(
    collection(firestore, testPath(workspaceId, companyId)),
    data,
  );
  return ref.id;
}

export async function completeABTest(
  workspaceId: string,
  companyId: string,
  testId: string,
  results: ABTimeTest['results'],
  winnerPostId: string,
): Promise<void> {
  if (!firestore) {
    const t = memTests.find((x) => x.id === testId);
    if (t) { t.status = 'complete'; t.results = results; t.winnerPostId = winnerPostId; }
    notifyTestListeners();
    return;
  }
  await updateDoc(
    doc(firestore, testPath(workspaceId, companyId), testId),
    { status: 'complete', results, winnerPostId },
  );
}

export function subscribeABTests(
  workspaceId: string,
  companyId: string,
  callback: (tests: ABTimeTest[]) => void,
): Unsubscribe {
  if (!firestore) {
    memTestListeners.add(callback);
    callback([...memTests]);
    return () => { memTestListeners.delete(callback); };
  }
  const q = query(
    collection(firestore, testPath(workspaceId, companyId)),
    orderBy('scheduledAtA', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ABTimeTest)));
  });
}
