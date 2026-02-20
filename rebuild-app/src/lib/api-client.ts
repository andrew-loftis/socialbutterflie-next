import { firebaseAuth } from '@/lib/firebase/client';

async function authHeaders() {
  const token = firebaseAuth?.currentUser ? await firebaseAuth.currentUser.getIdToken() : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: await authHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  const body = (await res.json()) as { data: T };
  return body.data;
}

export async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const body = (await res.json()) as { data: T };
  return body.data;
}

