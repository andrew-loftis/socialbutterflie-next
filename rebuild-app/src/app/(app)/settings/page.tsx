"use client";

import Link from 'next/link';
import { Building2, Palette, Plug, User } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';

export default function SettingsPage() {
  const { activeCompany } = useActiveCompany();

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Workspace preferences and company configuration." />

      {/* Workspace */}
      <section className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Workspace
        </h3>
        <p style={{ color: 'var(--fg-muted)', marginBottom: 12 }}>
          All app surfaces — posts, analytics, assets, and calendar — are scoped to the active company.
        </p>
        {activeCompany ? (
          <div className="panel" style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--fg-muted)' }}>Active company</p>
            <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{activeCompany.name}</p>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '12px 0' }}>
            <p>No company selected. Pick one to scope the workspace.</p>
          </div>
        )}
        <div className="button-row">
          <Link className="btn-ghost" href="/select-company">Switch company</Link>
          {activeCompany && (
            <Link className="btn-primary" href={`/companies/${activeCompany.id}`}>Manage company</Link>
          )}
        </div>
      </section>

      {/* Appearance */}
      <section className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Appearance
        </h3>
        {activeCompany ? (
          <p style={{ color: 'var(--fg-muted)' }}>
            Theme tint is derived from <strong>{activeCompany.name}</strong> branding colors. To change the tint, update the company&apos;s brand color in the company profile.
          </p>
        ) : (
          <p style={{ color: 'var(--fg-muted)' }}>
            Select a company to apply company-based theme tinting across the workspace.
          </p>
        )}
        {activeCompany && (
          <div className="button-row" style={{ marginTop: 12 }}>
            <Link className="btn-ghost" href={`/companies/${activeCompany.id}`}>Edit brand colors</Link>
          </div>
        )}
      </section>

      {/* Integrations */}
      <section className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plug className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Integrations
        </h3>
        <p style={{ color: 'var(--fg-muted)', marginBottom: 14 }}>
          Connect social channels and analytics providers to populate dashboards and enable publishing.
        </p>
        <div className="button-row">
          <Link className="btn-primary" href="/integrations">Manage integrations</Link>
        </div>
      </section>

      {/* Account */}
      <section className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Account
        </h3>
        <p style={{ color: 'var(--fg-muted)', marginBottom: 14 }}>
          Manage your profile, display name, and sign-out options.
        </p>
        <div className="button-row">
          <Link className="btn-ghost" href="/profile">View profile</Link>
        </div>
      </section>
    </div>
  );
}

