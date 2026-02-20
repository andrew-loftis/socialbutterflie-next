"use client";

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';

export default function StudioJobPage() {
  const params = useParams<{ jobId: string }>();

  return (
    <div className="space-y-3">
      <PageHeader title={`Studio Job ${params.jobId}`} subtitle="Job traceability, safety events, and routing actions." />
      <section className="grid-two">
        <article className="panel">
          <h3>Job summary</h3>
          <p>No persisted job details for this id yet.</p>
        </article>
        <article className="panel">
          <h3>Compiled context</h3>
          <textarea placeholder="Compiled company context will appear here after generation runs." />
        </article>
      </section>
      <section className="panel">
        <h3>Safety and routing</h3>
        <div className="button-row">
          <button className="btn-ghost" type="button">Run safety check</button>
          <button className="btn-ghost" type="button">Send to Build</button>
          <button className="btn-primary" type="button">Send to Review</button>
        </div>
      </section>
    </div>
  );
}

