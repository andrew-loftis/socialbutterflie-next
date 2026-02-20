import {
  addDoc,
  collection,
  collectionGroup,
  getDocs,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import { activateMemberByEmail, addPendingMember } from '@/lib/firebase/member-store';
import type { CompanyInvite, Role } from '@/types/interfaces';

const memoryInvites: Array<CompanyInvite & { workspaceId: string }> = [];
const memoryListeners = new Map<string, Set<(invites: CompanyInvite[]) => void>>();

function inviteKey(workspaceId: string, companyId: string) {
  return `${workspaceId}:${companyId}`;
}

function notify(workspaceId: string, companyId: string) {
  const key = inviteKey(workspaceId, companyId);
  const listeners = memoryListeners.get(key);
  if (!listeners) return;
  const value = memoryInvites.filter((entry) => entry.workspaceId === workspaceId && entry.companyId === companyId);
  for (const listener of listeners) listener(value);
}

export function subscribeCompanyInvites(
  workspaceId: string,
  companyId: string,
  callback: (invites: CompanyInvite[]) => void
): Unsubscribe {
  if (!firestore) {
    const key = inviteKey(workspaceId, companyId);
    const listeners = memoryListeners.get(key) || new Set();
    listeners.add(callback);
    memoryListeners.set(key, listeners);
    callback(memoryInvites.filter((entry) => entry.workspaceId === workspaceId && entry.companyId === companyId));
    return () => {
      const next = memoryListeners.get(key);
      if (!next) return;
      next.delete(callback);
    };
  }

  const invitesRef = collection(firestore, 'workspaces', workspaceId, 'companies', companyId, 'invites');
  return onSnapshot(invitesRef, (snapshot) => {
    const invites = snapshot.docs
      .map((entry) => entry.data() as CompanyInvite)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    callback(invites);
  });
}

export async function createCompanyInvite(
  workspaceId: string,
  companyId: string,
  input: { email: string; role: Role; createdBy: string }
): Promise<CompanyInvite> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const invite: CompanyInvite = {
    id: `invite-${crypto.randomUUID().slice(0, 10)}`,
    companyId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    token: crypto.randomUUID().replace(/-/g, ''),
    status: 'pending',
    expiresAt,
    createdAt: now.toISOString(),
    createdBy: input.createdBy,
  };

  await addPendingMember(workspaceId, companyId, {
    email: invite.email,
    role: invite.role,
    invitedBy: invite.createdBy,
  });

  if (!firestore) {
    memoryInvites.unshift({ ...invite, workspaceId });
    notify(workspaceId, companyId);
    return invite;
  }

  const invitesRef = collection(firestore, 'workspaces', workspaceId, 'companies', companyId, 'invites');
  await addDoc(invitesRef, invite);
  return invite;
}

function mapInvite(docSnap: QueryDocumentSnapshot) {
  return docSnap.data() as CompanyInvite;
}

export async function getInviteByToken(token: string) {
  if (!firestore) {
    const invite = memoryInvites.find((entry) => entry.token === token);
    if (!invite) return null;
    return { workspaceId: invite.workspaceId, invite };
  }

  const q = query(collectionGroup(firestore, 'invites'), where('token', '==', token), limit(1));
  const snap = await getDocs(q);
  if (!snap.docs.length) return null;
  const inviteDoc = snap.docs[0];
  const invite = mapInvite(inviteDoc);
  const companyRef = inviteDoc.ref.parent.parent;
  const workspaceRef = companyRef?.parent.parent;
  if (!companyRef || !workspaceRef) return null;

  return {
    workspaceId: workspaceRef.id,
    companyId: companyRef.id,
    inviteId: inviteDoc.id,
    ref: inviteDoc.ref,
    invite,
  };
}

export async function acceptInviteByToken(token: string, user: { uid: string; email: string; name?: string }) {
  const resolved = await getInviteByToken(token);
  if (!resolved) {
    return { ok: false as const, reason: 'Invite not found' };
  }

  const invite = resolved.invite;
  if (invite.status !== 'pending') {
    return { ok: false as const, reason: 'Invite already used or revoked' };
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false as const, reason: 'Signed-in email does not match invite email' };
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    if (firestore && 'ref' in resolved && resolved.ref) {
      await updateDoc(resolved.ref, { status: 'expired' });
    }
    return { ok: false as const, reason: 'Invite expired' };
  }

  const workspaceId = resolved.workspaceId;
  const companyId = ('companyId' in resolved && resolved.companyId) ? resolved.companyId : invite.companyId;
  if (!companyId) {
    return { ok: false as const, reason: 'Invite is missing company id' };
  }
  await activateMemberByEmail(workspaceId, companyId, invite.email, user.uid, user.name || '');

  if (!firestore) {
    const memoryInvite = memoryInvites.find((entry) => entry.token === token);
    if (memoryInvite) {
      memoryInvite.status = 'accepted';
      memoryInvite.acceptedByUid = user.uid;
      notify(workspaceId, companyId);
    }
  } else if ('ref' in resolved && resolved.ref) {
    await updateDoc(resolved.ref, {
      status: 'accepted',
      acceptedByUid: user.uid,
    });
  }

  return { ok: true as const, workspaceId, companyId };
}
