"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthScreen } from '@/components/auth/auth-screen';
import { useAppState } from '@/components/shell/app-state';
import { hasFirebaseClientConfig } from '@/lib/firebase/client';
import { acceptInviteByToken } from '@/lib/firebase/invite-store';
import { useAuth } from '@/lib/firebase/auth-provider';

export default function InviteAcceptancePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { setActiveCompany, markCompanyGateSeen } = useAppState();
  const attempted = useRef(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user || !params.token || attempted.current) return;
    attempted.current = true;
    acceptInviteByToken(params.token, {
      uid: user.uid,
      email: user.email || '',
      name: user.displayName || '',
    })
      .then((result) => {
        if (!result.ok || !result.companyId) {
          setStatus('error');
          setMessage(result.ok ? 'Invite response missing company id.' : result.reason);
          return;
        }
        setActiveCompany(result.companyId);
        markCompanyGateSeen(true);
        setStatus('success');
        setMessage('Invite accepted. Redirecting to your company workspace...');
        setTimeout(() => router.replace('/dashboard'), 900);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unable to accept invite');
      });
  }, [markCompanyGateSeen, params.token, router, setActiveCompany, user]);

  if (!hasFirebaseClientConfig) {
    return (
      <section className="panel">
        <h3>Firebase configuration required</h3>
        <p>Invite acceptance requires Firebase Auth and Firestore configuration.</p>
      </section>
    );
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Verifying session...</div>;
  }

  if (!user) {
    return <AuthScreen defaultMode="signin" title="Sign in to accept invite" subtitle="Use the same email address this invite was sent to." />;
  }

  if (!user.email) {
    return (
      <section className="panel" style={{ maxWidth: 680, margin: '8vh auto 0' }}>
        <h3>Invite cannot be accepted</h3>
        <p>Signed-in account must include an email address.</p>
      </section>
    );
  }

  return (
    <section className="panel" style={{ maxWidth: 680, margin: '8vh auto 0' }}>
      <h3>Company invite</h3>
      <p>{status === 'idle' ? 'Accepting invite...' : message || 'Ready to process invite.'}</p>
      {status === 'error' ? (
        <div className="button-row">
          <Link className="btn-ghost" href="/select-company">Go to selector</Link>
          <button type="button" className="btn-primary" onClick={() => {
            setStatus('idle');
            setMessage('');
          }}>
            Retry
          </button>
        </div>
      ) : null}
    </section>
  );
}
