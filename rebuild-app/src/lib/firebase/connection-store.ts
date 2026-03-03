/**
 * connection-store.ts
 * ---------------------------------------------------------------------------
 * Firestore CRUD for social-platform connections.
 * Path: workspaces/{wId}/companies/{cId}/connections/{connId}
 *
 * Each connection record stores the OAuth tokens, provider metadata, and
 * expiry so that publish / analytics pipelines can use them per-company.
 * ---------------------------------------------------------------------------
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export type SocialProvider =
  | 'instagram'
  | 'facebook'
  | 'youtube'
  | 'tiktok'
  | 'twitter'
  | 'linkedin'
  | 'threads'
  | 'bluesky'
  | 'pinterest';

export interface SocialConnection {
  id: string;
  companyId: string;
  provider: SocialProvider;
  /** Display label — e.g. "My Instagram Business" */
  label: string;
  /** The username / page name on the platform */
  accountName?: string;
  /** External platform account / page ID */
  externalAccountId?: string;
  /** Access token (encrypted at rest by Firestore rules) */
  accessToken: string;
  /** Refresh token when available */
  refreshToken?: string;
  /** Token expiry epoch ms — null = long-lived */
  expiresAt: number | null;
  /** Platform-specific metadata */
  meta: Record<string, unknown>;
  /** Who connected */
  connectedBy: string;
  connectedAt: unknown;
  updatedAt: unknown;
  /** Revoked / active state */
  status: 'active' | 'revoked' | 'expired';
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function connectionsCol(workspaceId: string, companyId: string) {
  if (!firestore) return null;
  return collection(firestore, 'workspaces', workspaceId, 'companies', companyId, 'connections');
}

// ── In-memory fallback ──────────────────────────────────────────────────────

const memoryConnections: SocialConnection[] = [];

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** Create a new social connection after OAuth callback */
export async function createConnection(
  workspaceId: string,
  companyId: string,
  data: Omit<SocialConnection, 'id' | 'connectedAt' | 'updatedAt'>,
): Promise<SocialConnection> {
  const col = connectionsCol(workspaceId, companyId);
  if (!col) {
    const record: SocialConnection = {
      ...data,
      id: `mem_${Date.now()}`,
      connectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryConnections.push(record);
    return record;
  }
  const ref = await addDoc(col, {
    ...data,
    connectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { ...data, id: ref.id, connectedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

/** Update tokens (e.g. after refresh) or status */
export async function updateConnection(
  workspaceId: string,
  companyId: string,
  connectionId: string,
  patch: Partial<Pick<SocialConnection, 'accessToken' | 'refreshToken' | 'expiresAt' | 'status' | 'label' | 'accountName' | 'meta'>>,
): Promise<void> {
  const col = connectionsCol(workspaceId, companyId);
  if (!col) {
    const idx = memoryConnections.findIndex((c) => c.id === connectionId);
    if (idx >= 0) Object.assign(memoryConnections[idx], patch);
    return;
  }
  await updateDoc(doc(col, connectionId), { ...patch, updatedAt: serverTimestamp() });
}

/** Remove a connection */
export async function deleteConnection(
  workspaceId: string,
  companyId: string,
  connectionId: string,
): Promise<void> {
  const col = connectionsCol(workspaceId, companyId);
  if (!col) {
    const idx = memoryConnections.findIndex((c) => c.id === connectionId);
    if (idx >= 0) memoryConnections.splice(idx, 1);
    return;
  }
  await deleteDoc(doc(col, connectionId));
}

/** Get all connections for a company (one-time fetch) */
export async function getConnections(
  workspaceId: string,
  companyId: string,
): Promise<SocialConnection[]> {
  const col = connectionsCol(workspaceId, companyId);
  if (!col) return memoryConnections.filter((c) => c.companyId === companyId);
  const snap = await getDocs(query(col, where('status', '==', 'active')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SocialConnection);
}

/** Get connections for a specific provider */
export async function getConnectionsByProvider(
  workspaceId: string,
  companyId: string,
  provider: SocialProvider,
): Promise<SocialConnection[]> {
  const col = connectionsCol(workspaceId, companyId);
  if (!col) return memoryConnections.filter((c) => c.companyId === companyId && c.provider === provider);
  const snap = await getDocs(query(col, where('provider', '==', provider), where('status', '==', 'active')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SocialConnection);
}

/** Real-time subscription */
export function subscribeConnections(
  workspaceId: string,
  companyId: string,
  callback: (connections: SocialConnection[]) => void,
): Unsubscribe {
  const col = connectionsCol(workspaceId, companyId);
  if (!col) {
    callback(memoryConnections.filter((c) => c.companyId === companyId));
    return () => {};
  }
  return onSnapshot(query(col, where('status', '==', 'active')), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SocialConnection));
  });
}
