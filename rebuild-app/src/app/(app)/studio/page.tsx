"use client";

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';

export default function StudioPage() {
  const { activeCompany } = useActiveCompany();

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
      <PageHeader title={`AI Studio • ${activeCompany.name}`} subtitle="Generate company-scoped image and video concepts." />

      <div className="studio-layout">
        <aside className="panel">
          <h3>Tools</h3>
          <div className="tool-list">
            <button className="chip" type="button">Image generation</button>
            <button className="chip" type="button">Video generation</button>
            <button className="chip" type="button">Style presets</button>
            <button className="chip" type="button">Brand board</button>
            <button className="chip" type="button">Recent sessions</button>
          </div>
        </aside>

        <section className="panel studio-canvas">
          <h3>Canvas</h3>
          <div className="canvas-placeholder">Generated output for {activeCompany.name} will render here.</div>
          <div className="button-row">
            <button className="btn-ghost" type="button">Compare</button>
            <button className="btn-ghost" type="button">Send to Build</button>
            <button className="btn-primary" type="button">Send to Review</button>
          </div>
        </section>

        <aside className="panel">
          <h3>Prompt controls</h3>
          <label>
            <span>Prompt</span>
            <textarea placeholder="Describe the output to generate for this company..." />
          </label>
          <div className="pill-row">
            <span className="chip">Identity 0.20</span>
            <span className="chip">Voice 0.25</span>
            <span className="chip">Visual 0.25</span>
            <span className="chip">Audience 0.15</span>
            <span className="chip">Content 0.15</span>
          </div>
          <div className="button-row">
            <button className="btn-ghost" type="button">Compile context</button>
            <button className="btn-primary" type="button">Queue job</button>
          </div>
          <Link className="inline-link" href="/studio/library">Open Library</Link>
        </aside>
      </div>
    </div>
  );
}

