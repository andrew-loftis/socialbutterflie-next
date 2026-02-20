"use client";

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyAssets } from '@/lib/hooks/use-company-assets';

export default function AssetsPage() {
  const { activeCompany } = useActiveCompany();
  const { assets } = useCompanyAssets();

  if (!activeCompany) {
    return (
      <section className="panel">
        <h3>No active company selected</h3>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader title={`${activeCompany.name} Assets`} subtitle="Company-scoped asset library and references." />
      {assets.length ? (
        <section className="asset-grid">
          {assets.map((asset) => (
            <article key={asset.id} className="panel">
              <div className="asset-thumb" style={asset.thumbnailUrl ? { backgroundImage: `url(${asset.thumbnailUrl})`, backgroundSize: 'cover' } : undefined} />
              <h3>{asset.type.toUpperCase()}</h3>
              <p>{asset.tags.join(', ') || 'No tags'}</p>
              <span className="badge">{asset.createdAt}</span>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel empty-state">
          <h3>No assets yet</h3>
          <p>Upload logos, banners, mascots, and references in the intake wizard.</p>
          <div className="button-row">
            <Link className="btn-primary" href={`/companies/${activeCompany.id}/intake`}>Open intake uploads</Link>
          </div>
        </section>
      )}
    </div>
  );
}

