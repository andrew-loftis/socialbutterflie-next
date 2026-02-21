"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/firebase/auth-provider';
import { firebaseAuth } from '@/lib/firebase/client';
import { LogOut, User, Mail, Pencil, Check, X } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const initials = (user?.displayName ?? user?.email ?? '?')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0].toUpperCase())
    .join('');

  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function saveName() {
    if (!firebaseAuth?.currentUser) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(firebaseAuth.currentUser, { displayName: nameVal });
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update name.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.push('/');
  }

  return (
    <div className="page">
      <PageHeader
        title="My Profile"
        subtitle="Manage your account details and authentication."
      />

      {/* Avatar + identity */}
      <section className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
              {user?.displayName ?? 'No display name'}
            </p>
            <p style={{ color: 'var(--fg-muted)', margin: '2px 0 0', fontSize: '0.85rem' }}>
              {user?.email}
            </p>
          </div>
        </div>

        {/* Display name edit */}
        <div className="form-field">
          <label className="form-label">
            <User className="h-4 w-4" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Display Name
          </label>
          {editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                autoFocus
                disabled={saving}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false); }}
              />
              <button className="btn-primary" onClick={saveName} disabled={saving} type="button">
                <Check className="h-4 w-4" />
              </button>
              <button className="btn-ghost" onClick={() => { setEditing(false); setNameVal(user?.displayName ?? ''); }} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="input" style={{ flex: 1, color: user?.displayName ? 'inherit' : 'var(--fg-muted)' }}>
                {user?.displayName ?? 'Not set'}
              </span>
              <button className="btn-ghost" onClick={() => setEditing(true)} type="button">
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            </div>
          )}
          {error && <p style={{ color: 'var(--error, #e74c3c)', marginTop: 6, fontSize: '0.82rem' }}>{error}</p>}
          {success && <p style={{ color: 'var(--success, #27ae60)', marginTop: 6, fontSize: '0.82rem' }}>Display name updated.</p>}
        </div>

        {/* Email (read-only) */}
        <div className="form-field" style={{ marginTop: 16 }}>
          <label className="form-label">
            <Mail className="h-4 w-4" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Email Address
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="input" style={{ flex: 1, color: 'var(--fg-muted)', userSelect: 'all' }}>
              {user?.email ?? '—'}
            </span>
            <span className="badge">Read-only</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 4 }}>
            Email is set by your authentication provider and cannot be changed here.
          </p>
        </div>
      </section>

      {/* Auth provider info */}
      <section className="panel">
        <h3>Authentication</h3>
        <p>You are signed in via <strong>{user?.providerData?.[0]?.providerId ?? 'email/password'}</strong>.</p>
        <div className="button-row" style={{ marginTop: 12 }}>
          <button
            className="btn-ghost"
            type="button"
            onClick={handleSignOut}
            style={{ color: 'var(--error, #e74c3c)' }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
