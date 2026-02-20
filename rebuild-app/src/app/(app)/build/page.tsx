import { PageHeader } from '@/components/ui/page-header';

const tabs = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok'];

export default function BuildPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Build Post" subtitle="Compose with brand context, then preview across social layouts." />
      <div className="grid-3">
        <section className="panel col-span-2">
          <h3>Composer</h3>
          <div className="form-grid">
            <label>
              <span>Caption</span>
              <textarea placeholder="Write caption with brand-aligned tone..." />
            </label>
            <label>
              <span>Campaign</span>
              <input placeholder="Summit launch" />
            </label>
            <label>
              <span>Schedule</span>
              <input type="datetime-local" />
            </label>
            <label className="upload-zone">
              <span>Assets</span>
              <div>Drag and drop media, logos, banners, or references</div>
            </label>
          </div>
          <div className="button-row">
            <button className="btn-ghost">Save Draft</button>
            <button className="btn-ghost">Submit for Review</button>
            <button className="btn-primary">Schedule Post</button>
          </div>
        </section>

        <aside className="panel">
          <h3>Mobile Simulator</h3>
          <div className="tab-row">
            {tabs.map((tab) => (
              <button className="chip" key={tab} type="button">
                {tab}
              </button>
            ))}
          </div>
          <div className="phone-frame">
            <div className="phone-content">
              <p className="kicker">@auroraoutdoors</p>
              <h4>Cinematic Product Drop</h4>
              <p>Frame your next story with confidence and clear direction.</p>
              <div className="pill-row">
                <span>#outdoors</span>
                <span>#cinematic</span>
                <span>#brandstory</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

