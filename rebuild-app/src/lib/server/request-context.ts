import { headers } from 'next/headers';
import { demoContext } from '@/lib/mock-data';
import { firebaseAdminAuth } from '@/lib/server/firebase-admin';
import type { AppContext, Role } from '@/types/interfaces';

export async function resolveServerContext(): Promise<AppContext> {
  const h = await headers();
  const authHeader = h.get('authorization');
  const roleHeader = h.get('x-user-role') as Role | null;
  const workspaceId = h.get('x-workspace-id') || demoContext.workspaceId;
  const activeCompanyId = h.get('x-active-company-id') || demoContext.activeCompanyId;

  if (!authHeader || !firebaseAdminAuth) {
    return {
      workspaceId,
      userId: demoContext.userId,
      role: roleHeader || demoContext.role,
      activeCompanyId,
      companyGateSeenInSession: demoContext.companyGateSeenInSession,
    };
  }

  try {
    const token = authHeader.replace('Bearer ', '').trim();
    const decoded = await firebaseAdminAuth.verifyIdToken(token);
    const role = (decoded.role as Role) || roleHeader || 'editor';
    return {
      workspaceId: (decoded.workspaceId as string) || workspaceId,
      userId: decoded.uid,
      role,
      activeCompanyId,
      companyGateSeenInSession: true,
    };
  } catch {
    return {
      workspaceId,
      userId: demoContext.userId,
      role: roleHeader || demoContext.role,
      activeCompanyId,
      companyGateSeenInSession: demoContext.companyGateSeenInSession,
    };
  }
}

