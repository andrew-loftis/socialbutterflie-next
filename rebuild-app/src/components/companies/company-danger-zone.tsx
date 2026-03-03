"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCompany } from '@/lib/firebase/company-store';
import { useAppState } from '@/components/shell/app-state';
import type { CompanyProfile } from '@/types/interfaces';

export function CompanyDangerZone({ company }: { company: CompanyProfile }) {
  const router = useRouter();
  const { appContext, membersByCompany, setCompanies, setActiveCompany } = useAppState();
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const canDelete = useMemo(() => {
    const userId = appContext.userId;
    if (!userId || userId === 'anonymous') return false;
    if (company.createdBy === userId) return true;
    const members = membersByCompany[company.id] || [];
    const me = members.find((m) => m.uid === userId) || null;
    return me?.role === 'admin';
  }, [appContext.userId, company.createdBy, company.id, membersByCompany]);

  const matches = useMemo(() => confirmName.trim().toLowerCase() === company.name.trim().toLowerCase(), [company.name, confirmName]);

  if (!canDelete) return null;

  async function onDelete() {
    if (!matches) {
      setStatus('Type the company name exactly to confirm deletion.');
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      await deleteCompany(appContext.workspaceId, company.id);
      setCompanies((prev) => prev.filter((entry) => entry.id !== company.id));
      setActiveCompany(null);
      router.replace('/companies');
      setStatus('Company deleted.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h3>Danger zone</h3>
      <p className="text-sm text-[var(--muted)]">
        Deleting a company removes it from your workspace. This cannot be undone.
      </p>

      <label>
        <span>Type company name to confirm</span>
        <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={company.name} />
      </label>

      <div className="button-row">
        <button type="button" className="btn-danger" onClick={onDelete} disabled={!matches || busy}>
          {busy ? 'Deleting...' : 'Delete Company'}
        </button>
      </div>

      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </section>
  );
}
