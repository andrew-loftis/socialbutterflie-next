"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthScreen } from '@/components/auth/auth-screen';
import { CompanySelector } from '@/components/company/company-selector';
import { useAuth } from '@/lib/firebase/auth-provider';
import { hasFirebaseClientConfig } from '@/lib/firebase/client';

export default function SelectCompanyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Loading...</div>}>
      <SelectCompanyPageContent />
    </Suspense>
  );
}

function SelectCompanyPageContent() {
  const { user, loading } = useAuth();
  const params = useSearchParams();
  const nextHref = params.get('next') || '/dashboard';

  if (!hasFirebaseClientConfig) {
    return (
      <div className="company-selector-page">
        <section className="panel">
          <h1>Firebase configuration required</h1>
          <p>Set Firebase client environment variables to enable company-based workspace selection.</p>
        </section>
      </div>
    );
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Checking session...</div>;
  }

  if (!user) {
    return <AuthScreen defaultMode="signup" title="Sign up to continue" subtitle="Create an account, then select a company workspace." />;
  }

  return <CompanySelector nextHref={nextHref} />;
}
