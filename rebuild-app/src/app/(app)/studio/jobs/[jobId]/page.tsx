import { PageHeader } from '@/components/ui/page-header';

export default async function StudioJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;

  return (
    <div className="space-y-3">
      <PageHeader title={`Studio Job ${jobId}`} subtitle="Job traceability, safety events, and routing actions." />
      <section className="grid-two">
        <article className="panel">
          <h3>Job Summary</h3>
          <p>Status: running</p>
          <p>Model: kling-3</p>
          <p>Mode: video</p>
          <p>Progress: 62%</p>
        </article>
        <article className="panel">
          <h3>Compiled Context</h3>
          <textarea defaultValue={'Brand: Aurora Outdoors\nVoice: confident and cinematic\nVisual: high contrast with amber accents'} />
        </article>
      </section>
      <section className="panel">
        <h3>Safety + Routing</h3>
        <div className="button-row">
          <button className="btn-ghost">Run Safety Check</button>
          <button className="btn-ghost">Send to Build</button>
          <button className="btn-primary">Send to Review</button>
        </div>
      </section>
    </div>
  );
}

