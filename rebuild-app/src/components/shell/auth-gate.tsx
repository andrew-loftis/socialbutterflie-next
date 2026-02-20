"use client";

import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { hasFirebaseClientConfig } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-provider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user, signInEmail, signInGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Loading workspace...</div>;
  }

  if (!hasFirebaseClientConfig) {
    return <>{children}</>;
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]">
        <h1 className="text-xl font-semibold">Sign in to SocialButterflie</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Firebase-authenticated access is required for protected workspace actions.</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            try {
              await signInEmail(email, password);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to sign in');
            }
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Email</span>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3">
              <Mail className="h-4 w-4 text-[var(--muted)]" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full bg-transparent text-sm outline-none"
                type="email"
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--muted)]">Password</span>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] px-3">
              <Lock className="h-4 w-4 text-[var(--muted)]" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full bg-transparent text-sm outline-none"
                type="password"
                required
              />
            </div>
          </label>
          {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div> : null}
          <button className="h-10 w-full rounded-xl bg-[var(--primary)] text-sm font-medium text-[var(--primary-contrast)]" type="submit">
            Sign in
          </button>
          <button
            className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] text-sm"
            type="button"
            onClick={() => signInGoogle().catch((err) => setError(err instanceof Error ? err.message : 'Unable to sign in'))}
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}

