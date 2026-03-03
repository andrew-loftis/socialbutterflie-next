"use client";

/**
 * upload-store.ts
 * ────────────────
 * Firestore + Storage CRUD for client upload portal.
 *
 * UploadLink path: workspaces/{wId}/companies/{cId}/uploadLinks/{linkId}
 * ClientUpload path: workspaces/{wId}/companies/{cId}/uploads/{uploadId}
 *
 * Public-facing reads fetch the link doc by token, then write uploads
 * under the owning company path.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type { UploadLink, ClientUpload } from '@/types/interfaces';

/* ── In-memory fallback ─────────────────────────────────────────── */

const memLinks: UploadLink[] = [];
const memUploads: ClientUpload[] = [];
const memLinkListeners = new Set<(l: UploadLink[]) => void>();
const memUploadListeners = new Set<(u: ClientUpload[]) => void>();

function notifyLinkListeners() {
  const sorted = [...memLinks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  for (const fn of memLinkListeners) fn(sorted);
}

function notifyUploadListeners() {
  const sorted = [...memUploads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  for (const fn of memUploadListeners) fn(sorted);
}

function linkPath(wId: string, cId: string) {
  return `workspaces/${wId}/companies/${cId}/uploadLinks`;
}

function uploadPath(wId: string, cId: string) {
  return `workspaces/${wId}/companies/${cId}/uploads`;
}

/* ── Upload Link CRUD ────────────────────────────────────────────── */

export async function createUploadLink(
  workspaceId: string,
  companyId: string,
  data: Omit<UploadLink, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `mem-link-${Date.now()}`;
    memLinks.push({ ...data, id });
    notifyLinkListeners();
    return id;
  }
  const ref = await addDoc(
    collection(firestore, linkPath(workspaceId, companyId)),
    data,
  );
  return ref.id;
}

export async function revokeUploadLink(
  workspaceId: string,
  companyId: string,
  linkId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memLinks.findIndex((l) => l.id === linkId);
    if (idx !== -1) memLinks[idx].status = 'revoked';
    notifyLinkListeners();
    return;
  }
  await updateDoc(
    doc(firestore, linkPath(workspaceId, companyId), linkId),
    { status: 'revoked' },
  );
}

export async function deleteUploadLink(
  workspaceId: string,
  companyId: string,
  linkId: string,
): Promise<void> {
  if (!firestore) {
    const idx = memLinks.findIndex((l) => l.id === linkId);
    if (idx !== -1) memLinks.splice(idx, 1);
    notifyLinkListeners();
    return;
  }
  await deleteDoc(doc(firestore, linkPath(workspaceId, companyId), linkId));
}

export function subscribeUploadLinks(
  workspaceId: string,
  companyId: string,
  callback: (links: UploadLink[]) => void,
): Unsubscribe {
  if (!firestore) {
    memLinkListeners.add(callback);
    callback([...memLinks]);
    return () => { memLinkListeners.delete(callback); };
  }
  const q = query(
    collection(firestore, linkPath(workspaceId, companyId)),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UploadLink)));
  });
}

/* ── Resolve link by token (public) ──────────────────────────────── */

export async function resolveUploadLinkByToken(
  token: string,
): Promise<{ workspaceId: string; companyId: string; link: UploadLink } | null> {
  // In-memory path: search memLinks
  if (!firestore) {
    const link = memLinks.find((l) => l.token === token && l.status === 'active');
    if (!link) return null;
    return { workspaceId: 'mem-ws', companyId: link.companyId, link };
  }

  // Firestore: collectionGroup query
  // NOTE: collectionGroup queries on 'uploadLinks' require a composite index.
  // Alternative: top-level lookup collection `uploadLinkTokens/{token}` → { wId, cId, linkId }
  // For now we use the token as the link doc ID to keep it simple.
  // The generation code should use the token as the doc ID.
  try {
    // We'll scan collectionGroup — needs index on 'token'
    const { collectionGroup: cg, query: q2, where: w, getDocs: gd } = await import('firebase/firestore');
    const snap = await gd(q2(cg(firestore!, 'uploadLinks'), w('token', '==', token), w('status', '==', 'active')));
    if (snap.empty) return null;
    const d = snap.docs[0];
    const link = { id: d.id, ...d.data() } as UploadLink;
    // Extract workspace/company from path: workspaces/{wId}/companies/{cId}/uploadLinks/{linkId}
    const segments = d.ref.path.split('/');
    return { workspaceId: segments[1], companyId: segments[3], link };
  } catch {
    return null;
  }
}

/* ── Client Upload CRUD ──────────────────────────────────────────── */

export async function createClientUpload(
  workspaceId: string,
  companyId: string,
  data: Omit<ClientUpload, 'id'>,
): Promise<string> {
  if (!firestore) {
    const id = `mem-upload-${Date.now()}`;
    memUploads.push({ ...data, id });
    notifyUploadListeners();
    // Increment files uploaded on the link
    const link = memLinks.find((l) => l.id === data.uploadLinkId);
    if (link) link.filesUploaded += 1;
    notifyLinkListeners();
    return id;
  }
  const ref = await addDoc(
    collection(firestore, uploadPath(workspaceId, companyId)),
    data,
  );
  // Increment counter on the upload link doc
  try {
    const linkRef = doc(
      firestore,
      linkPath(workspaceId, companyId),
      data.uploadLinkId,
    );
    await updateDoc(linkRef, { filesUploaded: increment(1) });
  } catch { /* non-critical */ }
  return ref.id;
}

export function subscribeClientUploads(
  workspaceId: string,
  companyId: string,
  callback: (uploads: ClientUpload[]) => void,
): Unsubscribe {
  if (!firestore) {
    memUploadListeners.add(callback);
    callback([...memUploads]);
    return () => { memUploadListeners.delete(callback); };
  }
  const q = query(
    collection(firestore, uploadPath(workspaceId, companyId)),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientUpload)));
  });
}

export async function getClientUploadsForLink(
  workspaceId: string,
  companyId: string,
  linkId: string,
): Promise<ClientUpload[]> {
  if (!firestore) {
    return memUploads.filter((u) => u.uploadLinkId === linkId);
  }
  const q = query(
    collection(firestore, uploadPath(workspaceId, companyId)),
    where('uploadLinkId', '==', linkId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientUpload));
}
