import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import { incrementCompanyMemberCount } from '@/lib/firebase/company-store';
import type { CompanyMember, Role } from '@/types/interfaces';

const memoryMembers: Record<string, CompanyMember[]> = {};
const memoryListeners = new Map<string, Set<(members: CompanyMember[]) => void>>();

function companyKey(workspaceId: string, companyId: string) {
  return `${workspaceId}:${companyId}`;
}

function notify(workspaceId: string, companyId: string) {
  const key = companyKey(workspaceId, companyId);
  const listeners = memoryListeners.get(key);
  if (!listeners) return;
  const value = memoryMembers[key] || [];
  for (const listener of listeners) listener(value);
}

export function subscribeCompanyMembers(
  workspaceId: string,
  companyId: string,
  callback: (members: CompanyMember[]) => void
): Unsubscribe {
  if (!firestore) {
    const key = companyKey(workspaceId, companyId);
    const listeners = memoryListeners.get(key) || new Set();
    listeners.add(callback);
    memoryListeners.set(key, listeners);
    callback(memoryMembers[key] || []);
    return () => {
      const next = memoryListeners.get(key);
      if (!next) return;
      next.delete(callback);
    };
  }

  const membersRef = collection(firestore, 'workspaces', workspaceId, 'companies', companyId, 'members');
  return onSnapshot(membersRef, (snapshot) => {
    const members = snapshot.docs
      .map((entry) => entry.data() as CompanyMember)
      .sort((a, b) => a.email.localeCompare(b.email));
    callback(members);
  });
}

export async function addPendingMember(
  workspaceId: string,
  companyId: string,
  input: { email: string; role: Role; invitedBy: string }
) {
  const now = new Date().toISOString();
  const normalizedEmail = input.email.trim().toLowerCase();
  const memberId = `email-${normalizedEmail.replace(/[^a-z0-9]+/g, '-')}`;
  const member: CompanyMember = {
    id: memberId,
    companyId,
    email: normalizedEmail,
    role: input.role,
    status: 'pending',
    invitedBy: input.invitedBy,
    invitedAt: now,
  };

  if (!firestore) {
    const key = companyKey(workspaceId, companyId);
    const existing = memoryMembers[key] || [];
    const hasEmail = existing.some((entry) => entry.email === member.email);
    if (!hasEmail) {
      memoryMembers[key] = [member, ...existing];
      await incrementCompanyMemberCount(workspaceId, companyId, 1);
      notify(workspaceId, companyId);
    }
    return member;
  }

  const memberRef = doc(firestore, 'workspaces', workspaceId, 'companies', companyId, 'members', member.id);
  const existing = await getDoc(memberRef);
  await setDoc(memberRef, member, { merge: true });
  if (!existing.exists()) {
    await incrementCompanyMemberCount(workspaceId, companyId, 1);
  }
  return member;
}

export async function activateMemberByEmail(
  workspaceId: string,
  companyId: string,
  email: string,
  uid: string,
  name?: string
) {
  if (!firestore) {
    const key = companyKey(workspaceId, companyId);
    const existing = memoryMembers[key] || [];
    const index = existing.findIndex((entry) => entry.email === email.toLowerCase());
    if (index >= 0) {
      existing[index] = {
        ...existing[index],
        status: 'active',
        uid,
        name: name || existing[index].name || '',
        joinedAt: new Date().toISOString(),
      };
      notify(workspaceId, companyId);
    }
    return;
  }

  const membersRef = collection(firestore, 'workspaces', workspaceId, 'companies', companyId, 'members');
  const memberId = `email-${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const memberRef = doc(membersRef, memberId);
  await setDoc(
    memberRef,
    {
      id: memberId,
      companyId,
      email: email.toLowerCase(),
      uid,
      name: name || '',
      status: 'active',
      joinedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function updateMemberRole(
  workspaceId: string,
  companyId: string,
  memberId: string,
  role: Role
) {
  if (!firestore) {
    const key = companyKey(workspaceId, companyId);
    const members = memoryMembers[key] || [];
    const index = members.findIndex((member) => member.id === memberId);
    if (index >= 0) {
      members[index] = { ...members[index], role };
      notify(workspaceId, companyId);
    }
    return;
  }

  const memberRef = doc(firestore, 'workspaces', workspaceId, 'companies', companyId, 'members', memberId);
  await updateDoc(memberRef, { role });
}
