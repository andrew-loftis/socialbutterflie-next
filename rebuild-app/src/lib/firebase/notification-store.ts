"use client";

/**
 * notification-store.ts
 * ─────────────────────
 * Firestore-backed notification system.
 *
 * Path: workspaces/{wId}/notifications/{notifId}
 * Path: workspaces/{wId}/users/{uid}/notificationPrefs/{prefId}
 *
 * Supports: in-app real-time feed, read/unread, preference matrix.
 * External channels (email, SMS, push) are dispatched via Netlify functions
 * that call this store's `createNotification()` as the fan-out trigger.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type {
  Notification,
  NotificationChannel,
  NotificationEventType,
  NotificationPreference,
  QuietHours,
} from '@/types/interfaces';

// ── In-memory fallbacks ────────────────────────────────────────────────────

const memoryNotifications: Notification[] = [];
const memoryPrefs: NotificationPreference[] = [];
const memoryListeners = new Set<(notifications: Notification[]) => void>();

function notifyMemory() {
  const sorted = [...memoryNotifications].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  );
  for (const fn of memoryListeners) fn(sorted);
}

// ── Default notification preferences ───────────────────────────────────────

export const DEFAULT_NOTIFICATION_EVENTS: NotificationEventType[] = [
  'post_approved',
  'post_rejected',
  'post_published',
  'comment_received',
  'dm_received',
  'mention_detected',
  'contract_milestone',
  'story_expiring',
  'automation_triggered',
  'member_joined',
  'weekly_digest',
  'approval_requested',
  'upload_received',
];

export const EVENT_LABELS: Record<NotificationEventType, string> = {
  post_approved: 'Post approved',
  post_rejected: 'Post rejected',
  post_published: 'Post published',
  comment_received: 'New comment',
  dm_received: 'Direct message',
  mention_detected: 'Mention detected',
  contract_milestone: 'Contract milestone',
  story_expiring: 'Story expiring',
  automation_triggered: 'Automation triggered',
  member_joined: 'Team member joined',
  weekly_digest: 'Weekly digest',
  approval_requested: 'Approval requested',
  upload_received: 'Client upload received',
};

export function buildDefaultPreference(
  userId: string,
  event: NotificationEventType,
): NotificationPreference {
  // Sensible defaults: in_app always on, email on for important events
  const emailEvents: NotificationEventType[] = [
    'post_approved', 'post_rejected', 'approval_requested',
    'contract_milestone', 'weekly_digest', 'upload_received',
  ];
  const channels: NotificationChannel[] = ['in_app'];
  if (emailEvents.includes(event)) channels.push('email');
  return { userId, event, channels, enabled: true };
}

// ── CRUD: Notifications ────────────────────────────────────────────────────

export async function createNotification(
  workspaceId: string,
  notification: Omit<Notification, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `notif-${crypto.randomUUID().slice(0, 8)}`;
    memoryNotifications.unshift({ ...notification, id });
    notifyMemory();
    return id;
  }

  const colRef = collection(firestore, 'workspaces', workspaceId, 'notifications');
  const docRef = await addDoc(colRef, notification);
  return docRef.id;
}

export function subscribeNotifications(
  workspaceId: string,
  userId: string,
  callback: (notifications: Notification[]) => void,
  maxCount = 50,
): Unsubscribe {
  if (!firestore) {
    memoryListeners.add(callback);
    callback([...memoryNotifications]);
    return () => { memoryListeners.delete(callback); };
  }

  const colRef = collection(firestore, 'workspaces', workspaceId, 'notifications');
  const q = query(
    colRef,
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxCount),
  );

  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Notification, 'id'>),
    }));
    callback(items);
  });
}

export async function markNotificationRead(
  workspaceId: string,
  notificationId: string,
): Promise<void> {
  if (!firestore) {
    const n = memoryNotifications.find((x) => x.id === notificationId);
    if (n) n.read = true;
    notifyMemory();
    return;
  }

  const docRef = doc(firestore, 'workspaces', workspaceId, 'notifications', notificationId);
  await updateDoc(docRef, { read: true });
}

export async function markAllNotificationsRead(
  workspaceId: string,
  userId: string,
): Promise<void> {
  if (!firestore) {
    for (const n of memoryNotifications) {
      if (n.recipientId === userId) n.read = true;
    }
    notifyMemory();
    return;
  }

  const colRef = collection(firestore, 'workspaces', workspaceId, 'notifications');
  const q = query(colRef, where('recipientId', '==', userId), where('read', '==', false));
  const snap = await getDocs(q);
  const batch = writeBatch(firestore);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function deleteNotification(
  workspaceId: string,
  notificationId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memoryNotifications.findIndex((x) => x.id === notificationId);
    if (idx !== -1) memoryNotifications.splice(idx, 1);
    notifyMemory();
    return;
  }

  await deleteDoc(doc(firestore, 'workspaces', workspaceId, 'notifications', notificationId));
}

// ── CRUD: Notification Preferences ─────────────────────────────────────────

export async function getNotificationPreferences(
  workspaceId: string,
  userId: string,
): Promise<NotificationPreference[]> {
  if (!firestore) {
    return memoryPrefs.filter((p) => p.userId === userId);
  }

  const colRef = collection(
    firestore, 'workspaces', workspaceId, 'users', userId, 'notificationPrefs',
  );
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => d.data() as NotificationPreference);
}

export async function setNotificationPreference(
  workspaceId: string,
  userId: string,
  pref: NotificationPreference,
): Promise<void> {
  if (!firestore) {
    const idx = memoryPrefs.findIndex(
      (p) => p.userId === userId && p.event === pref.event && p.companyId === pref.companyId,
    );
    if (idx !== -1) memoryPrefs[idx] = pref;
    else memoryPrefs.push(pref);
    return;
  }

  const docId = pref.companyId ? `${pref.event}__${pref.companyId}` : pref.event;
  const docRef = doc(
    firestore, 'workspaces', workspaceId, 'users', userId, 'notificationPrefs', docId,
  );
  await setDoc(docRef, pref, { merge: true });
}

export async function bulkSetNotificationPreferences(
  workspaceId: string,
  userId: string,
  prefs: NotificationPreference[],
): Promise<void> {
  if (!firestore) {
    for (const p of prefs) await setNotificationPreference(workspaceId, userId, p);
    return;
  }

  const batch = writeBatch(firestore);
  for (const pref of prefs) {
    const docId = pref.companyId ? `${pref.event}__${pref.companyId}` : pref.event;
    const docRef = doc(
      firestore, 'workspaces', workspaceId, 'users', userId, 'notificationPrefs', docId,
    );
    batch.set(docRef, pref, { merge: true });
  }
  await batch.commit();
}

// ── CRUD: Quiet Hours ──────────────────────────────────────────────────────

export async function getQuietHours(
  workspaceId: string,
  userId: string,
): Promise<QuietHours | null> {
  if (!firestore) return null;

  const docRef = doc(
    firestore, 'workspaces', workspaceId, 'users', userId, 'notificationPrefs', '_quietHours',
  );
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as QuietHours) : null;
}

export async function setQuietHours(
  workspaceId: string,
  userId: string,
  hours: QuietHours,
): Promise<void> {
  if (!firestore) return;

  const docRef = doc(
    firestore, 'workspaces', workspaceId, 'users', userId, 'notificationPrefs', '_quietHours',
  );
  await setDoc(docRef, hours, { merge: true });
}

// ── Helper: Fire a notification to specific users ──────────────────────────

export async function notifyUsers(
  workspaceId: string,
  recipientIds: string[],
  payload: Omit<Notification, 'id' | 'recipientId' | 'read' | 'deliveredVia' | 'createdAt'>,
): Promise<void> {
  const now = new Date().toISOString();

  for (const recipientId of recipientIds) {
    await createNotification(workspaceId, {
      ...payload,
      recipientId,
      read: false,
      deliveredVia: ['in_app'],
      createdAt: now,
    });
  }

  // TODO: Fan-out to email/SMS/push channels via Netlify function
  // This is where we'd call: apiPost('/api/notifications/dispatch', { recipientIds, payload })
  // The Netlify function checks each user's preferences and sends via SendGrid/Twilio/FCM
}
