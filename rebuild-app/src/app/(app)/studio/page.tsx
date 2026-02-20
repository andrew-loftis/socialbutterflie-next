import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';

export default function StudioPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="AI Studio" subtitle="Lovart-inspired production studio for image and video generation with company context." />

      <div className="studio-layout">
        <aside className="panel">
          <h3>Tools</h3>
          <div className="tool-list">
            <button className="chip">Image Generation</button>
            <button className="chip">Video Generation</button>
            <button className="chip">Style Presets</button>
            <button className="chip">Brand Boards</button>
            <button className="chip">Recent Sessions</button>
          </div>
        </aside>

        <section className="panel studio-canvas">
          <h3>Canvas</h3>
          <div className="canvas-placeholder">Generated output will render here.</div>
          <div className="button-row">
            <button className="btn-ghost">Compare</button>
            <button className="btn-ghost">Send to Build</button>
            <button className="btn-primary">Send to Review</button>
          </div>
        </section>

        <aside className="panel">
          <h3>Prompt Controls</h3>
          <label>
            <span>Prompt</span>
            <textarea defaultValue="Generate a cinematic hero product sequence for Aurora Outdoors." />
          </label>
          <div className="pill-row">
            <span className="chip">Identity 0.20</span>
            <span className="chip">Voice 0.25</span>
            <span className="chip">Visual 0.25</span>
            <span className="chip">Audience 0.15</span>
            <span className="chip">Content 0.15</span>
          </div>
          <div className="button-row">
            <button className="btn-ghost">Compile Context</button>
            <button className="btn-primary">Queue Job</button>
          </div>
          <Link className="inline-link" href="/studio/library">Open Library</Link>
        </aside>
      </div>
    </div>
  );
}

