"use client";

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';

export default function SettingsPage() {
  const { activeCompany } = useActiveCompany();

  return (
    <div className="space-y-3">
      <PageHeader title="Settings" subtitle="Workspace preferences and company configuration." />
      <section className="panel">
        <h3>Workspace context</h3>
        <p>All app surfaces are scoped to the selected company.</p>
        <div className="button-row">
          <Link className="btn-ghost" href="/select-company">Switch company</Link>
          {activeCompany ? <Link className="btn-primary" href={`/companies/${activeCompany.id}`}>Manage active company</Link> : null}
        </div>
      </section>
      <section className="panel">
        <h3>Appearance</h3>
        {activeCompany ? (
          <p>Theme tint is currently derived from <strong>{activeCompany.name}</strong> branding colors.</p>
        ) : (
          <p>Select a company to apply company-based theme tinting.</p>
        )}
      </section>
      <section className="panel">
        <h3>Integrations</h3>
        <p>Connect channels and analytics providers to populate company dashboards.</p>
      </section>
    </div>
  );
}

