"use client";

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyAssets } from '@/lib/hooks/use-company-assets';

const tabs = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok'];

export default function BuildPage() {
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
      <PageHeader title={`Build Post • ${activeCompany.name}`} subtitle="Compose with company context, then schedule." />
      <div className="grid-3">
        <section className="panel col-span-2">
          <h3>Composer</h3>
          <div className="form-grid">
            <label>
              <span>Caption</span>
              <textarea placeholder="Write company-scoped caption..." />
            </label>
            <label>
              <span>Campaign</span>
              <input placeholder="Campaign name" />
            </label>
            <label>
              <span>Schedule</span>
              <input type="datetime-local" />
            </label>
            <label className="upload-zone">
              <span>Assets</span>
              <div>Drag and drop media for {activeCompany.name}</div>
            </label>
          </div>
          <div className="button-row">
            <button className="btn-ghost" type="button">Save Draft</button>
            <button className="btn-ghost" type="button">Submit for Review</button>
            <button className="btn-primary" type="button">Schedule Post</button>
          </div>
          {!assets.length ? (
            <div className="empty-state">
              <p>No company assets uploaded yet.</p>
              <Link className="btn-ghost" href={`/companies/${activeCompany.id}/intake`}>Upload assets in intake wizard</Link>
            </div>
          ) : null}
        </section>

        <aside className="panel">
          <h3>Preview</h3>
          <div className="tab-row">
            {tabs.map((tab) => (
              <button className="chip" key={tab} type="button">
                {tab}
              </button>
            ))}
          </div>
          <div className="phone-frame">
            <div className="phone-content">
              <p className="kicker">{activeCompany.name}</p>
              <h4>Post preview</h4>
              <p>Live preview uses company-specific typography and colors.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

