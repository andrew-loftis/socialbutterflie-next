"use client";

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyAnalytics } from '@/lib/hooks/use-company-analytics';

function percent(value: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export default function AnalyticsPage() {
  const { activeCompany } = useActiveCompany();
  const { analytics, loading } = useCompanyAnalytics();

  if (!activeCompany) {
    return (
      <section className="panel">
        <h3>No active company selected</h3>
        <p>Select a company to view analytics.</p>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader title={`${activeCompany.name} Analytics`} subtitle="Company-scoped performance and publishing metrics." />
      {!loading && !analytics ? (
        <section className="panel">
          <h3>No analytics data yet</h3>
          <p>Start publishing for this company and connect social channels to generate metrics.</p>
          <div className="button-row">
            <Link className="btn-primary" href="/build">Create first post</Link>
            <Link className="btn-ghost" href="/settings">Connect channels</Link>
            <button className="btn-ghost" type="button">Generate first report</button>
          </div>
        </section>
      ) : null}

      {analytics ? (
        <>
          <section className="stats-grid">
            <article className="stat">
              <div className="stat-top"><span>Impressions</span></div>
              <strong>{analytics.impressions}</strong>
              <p>{analytics.period}</p>
            </article>
            <article className="stat">
              <div className="stat-top"><span>Engagements</span></div>
              <strong>{analytics.engagements}</strong>
              <p>{percent(analytics.engagements, analytics.impressions)} rate</p>
            </article>
            <article className="stat">
              <div className="stat-top"><span>Clicks</span></div>
              <strong>{analytics.clicks}</strong>
              <p>{percent(analytics.clicks, analytics.impressions)} CTR</p>
            </article>
            <article className="stat">
              <div className="stat-top"><span>Published</span></div>
              <strong>{analytics.postsPublished}</strong>
              <p>{analytics.postsScheduled} scheduled</p>
            </article>
          </section>

          <section className="panel">
            <h3>Report actions</h3>
            <div className="button-row">
              <button className="btn-ghost" type="button">Export CSV</button>
              <button className="btn-ghost" type="button">Export PDF</button>
              <button className="btn-primary" type="button">Schedule report</button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

