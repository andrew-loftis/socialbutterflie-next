/**
 * social-gateway.ts
 * ---------------------------------------------------------------------------
 * Client-side helpers for social platform OAuth and connection management.
 * 
 * Connections are stored in Firestore: workspaces/{wId}/companies/{cId}/connections
 * OAuth flows go through Next.js API routes: /api/social/connect and /api/social/callback
 * Publishing goes through: /api/social/publish
 * Analytics sync through: /api/social/analytics
 * ---------------------------------------------------------------------------
 */

import type { User } from 'firebase/auth';
import {
  getConnections,
  deleteConnection,
  updateConnection,
  type SocialConnection,
} from '@/lib/firebase/connection-store';

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

function requireContext(user: User | null, workspaceId: string) {
  if (!user?.uid) throw new Error('Sign in is required.');
  if (!workspaceId) throw new Error('Workspace id is required.');
  return { userId: user.uid, workspaceId };
}

/** List all active social connections for a company (from Firestore) */
export async function listSocialConnectionsByCompany(
  user: User | null,
  workspaceId: string,
  companyId: string,
): Promise<SocialConnection[]> {
  requireContext(user, workspaceId);
  if (!companyId) throw new Error('Company id is required.');
  return getConnections(workspaceId, companyId);
}

/** Legacy alias — same as listSocialConnectionsByCompany when companyId is known */
export async function listSocialConnections(
  user: User | null,
  workspaceId: string,
  companyId?: string,
): Promise<SocialConnection[]> {
  requireContext(user, workspaceId);
  if (!companyId) return [];
  return getConnections(workspaceId, companyId);
}

/**
 * Kick off OAuth flow for a social platform.
 * Redirects the browser to /api/social/connect which builds the platform OAuth URL.
 */
export function beginSocialConnect(
  user: User | null,
  workspaceId: string,
  provider: SocialProvider,
  companyId?: string,
) {
  const { userId } = requireContext(user, workspaceId);
  const url = new URL('/api/social/connect', window.location.origin);
  url.searchParams.set('provider', provider);
  url.searchParams.set('userId', userId);
  url.searchParams.set('workspaceId', workspaceId);
  if (companyId) url.searchParams.set('companyId', companyId);
  window.location.href = url.toString();
}

/** Disconnect (delete) a social connection from Firestore */
export async function disconnectSocialConnection(
  user: User | null,
  workspaceId: string,
  payload: { id?: string; provider: string; companyId?: string },
) {
  requireContext(user, workspaceId);
  const companyId = payload.companyId;
  if (!companyId || !payload.id) {
    // Fallback: call API to handle disconnect if we don't have the connection ID
    const res = await fetch('/api/social/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        companyId,
        provider: payload.provider,
        connectionId: payload.id,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return;
  }
  await deleteConnection(workspaceId, companyId, payload.id);
}

/**
 * Publish a post to a social platform via the server-side API route.
 * The API route uses the stored OAuth tokens to call platform APIs.
 */
export async function publishToSocial(payload: {
  workspaceId: string;
  companyId: string;
  provider: SocialProvider;
  caption: string;
  mediaUrl?: string;
  scheduledAt?: string;
  postId?: string;
}): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const res = await fetch('/api/social/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error || 'Publish failed' };
  return data;
}

/**
 * Fetch analytics from a social platform via the server-side API route.
 * The API route uses stored OAuth tokens to call platform Insights APIs.
 */
export async function fetchSocialAnalytics(payload: {
  workspaceId: string;
  companyId: string;
  provider: SocialProvider;
  period?: string;
}): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({
    workspaceId: payload.workspaceId,
    companyId: payload.companyId,
    provider: payload.provider,
    ...(payload.period ? { period: payload.period } : {}),
  });
  const res = await fetch(`/api/social/analytics?${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Refresh an expired token via the server-side API route */
export async function refreshConnectionToken(payload: {
  workspaceId: string;
  companyId: string;
  connectionId: string;
}): Promise<void> {
  const res = await fetch('/api/social/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
}
