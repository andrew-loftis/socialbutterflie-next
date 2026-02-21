"use client";

import { useState } from 'react';
import { Apple, Github, Lock, Mail } from 'lucide-react';
import { type OAuthProviderId, useAuth } from '@/lib/firebase/auth-provider';
import { mapFirebaseError } from '@/lib/firebase/errors';
import { GlassCard } from '@/components/ui/glass-card';

type AuthMode = 'signin' | 'signup';

type AuthScreenProps = {
  defaultMode?: AuthMode;
  title?: string;
  subtitle?: string;
};

export function AuthScreen({
  defaultMode = 'signup',
  title = 'Welcome to SocialButterflie',
  subtitle = 'Create your account to start building your brand system.',
}: AuthScreenProps) {
  const { signInEmail, signUpEmail, signInOAuth } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const oauthButtons: Array<{ provider: OAuthProviderId; label: string; icon?: React.ReactNode }> = [
    { provider: 'google', label: 'Google' },
    { provider: 'microsoft', label: 'Microsoft' },
    { provider: 'github', label: 'GitHub', icon: <Github className="h-4 w-4" /> },
    { provider: 'apple', label: 'Apple', icon: <Apple className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <GlassCard accent className="w-full max-w-md p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[1.15rem] font-semibold leading-tight">{title}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <span className="badge badge-primary">Beta</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-full border border-[var(--border-subtle)] bg-[var(--panel-soft)] p-1">
          <button
            aria-pressed={mode === 'signup'}
            className={`h-9 flex-1 rounded-full text-sm font-medium transition ${mode === 'signup' ? 'bg-[var(--panel-strong)] text-[var(--text)] shadow-[var(--shadow-1)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
            onClick={() => setMode('signup')}
            type="button"
          >
            Sign up
          </button>
          <button
            aria-pressed={mode === 'signin'}
            className={`h-9 flex-1 rounded-full text-sm font-medium transition ${mode === 'signin' ? 'bg-[var(--panel-strong)] text-[var(--text)] shadow-[var(--shadow-1)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
            onClick={() => setMode('signin')}
            type="button"
          >
            Sign in
          </button>
        </div>

        <form
          className="mt-4 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);

            if (mode === 'signup' && password !== confirmPassword) {
              setError('Passwords do not match.');
              return;
            }

            setSubmitting(true);
            try {
              if (mode === 'signup') {
                await signUpEmail(email, password);
              } else {
                await signInEmail(email, password);
              }
            } catch (err) {
              setError(mapFirebaseError(err, 'auth'));
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label>
            <span>Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10"
                type="email"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={6}
                required
              />
            </div>
          </label>

          {mode === 'signup' ? (
            <label>
              <span>Confirm password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
            </label>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          ) : null}

          <button
            className="btn-primary btn-lg w-full disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>

          <div className="mt-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">or</div>
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {oauthButtons.map((entry) => (
              <button
                key={entry.provider}
                className="btn-ghost w-full"
                type="button"
                onClick={() => signInOAuth(entry.provider).catch((err) => setError(mapFirebaseError(err, 'auth')))}
              >
                {entry.icon ? entry.icon : <span className="h-4 w-4 rounded-sm bg-white/10" />}
                Continue with {entry.label}
              </button>
            ))}
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
