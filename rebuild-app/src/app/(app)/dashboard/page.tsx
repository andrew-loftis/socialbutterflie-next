"use client";

import Link from 'next/link';
import { Activity, CalendarDays, ChartNoAxesCombined, Sparkles } from 'lucide-react';
import { EntityCard } from '@/components/ui/entity-card';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyAnalytics } from '@/lib/hooks/use-company-analytics';
import { useCompanyPosts } from '@/lib/hooks/use-company-posts';

export default function DashboardPage() {
  const { activeCompany } = useActiveCompany();
  const { analytics } = useCompanyAnalytics();
  const { posts } = useCompanyPosts();

  const scheduled = posts.filter((post) => post.status === 'scheduled').length;
  const inReview = posts.filter((post) => post.status === 'in_review').length;
  const published = posts.filter((post) => post.status === 'published').length;

  if (!activeCompany) {
    return (
      <section className="panel">
        <h3>No active company selected</h3>
        <p>Select a company to load dashboard analytics and workflows.</p>
        <div className="button-row">
          <Link className="btn-primary" href="/select-company">Choose company</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={`${activeCompany.name} Dashboard`}
        subtitle="Company-scoped operational overview."
        actions={<Link className="btn-primary" href="/build">Create Post</Link>}
      />

      <section className="stats-grid">
        <EntityCard
          entity={{ kind: 'report', id: 'engagement', title: 'Engagement', status: 'Live', versionHistory: [], approvals: [], auditLog: [] }}
          className="stat"
        >
          <div className="stat-top"><ChartNoAxesCombined className="h-4 w-4" /><span>Engagements</span></div>
          <strong>{analytics?.engagements ?? '--'}</strong>
          <p>Current period</p>
        </EntityCard>
        <EntityCard
          entity={{ kind: 'post', id: 'scheduled', title: 'Scheduled Posts', status: 'Live', versionHistory: [], approvals: [], auditLog: [] }}
          className="stat"
        >
          <div className="stat-top"><CalendarDays className="h-4 w-4" /><span>Scheduled</span></div>
          <strong>{scheduled}</strong>
          <p>Upcoming queue</p>
        </EntityCard>
        <EntityCard
          entity={{ kind: 'post', id: 'review', title: 'Review Queue', status: 'Live', versionHistory: [], approvals: [], auditLog: [] }}
          className="stat"
        >
          <div className="stat-top"><Activity className="h-4 w-4" /><span>In Review</span></div>
          <strong>{inReview}</strong>
          <p>Needs approval</p>
        </EntityCard>
        <EntityCard
          entity={{ kind: 'company', id: activeCompany.id, title: activeCompany.name, status: `${activeCompany.completionScore}%`, versionHistory: [], approvals: [], auditLog: [] }}
          className="stat"
        >
          <div className="stat-top"><Sparkles className="h-4 w-4" /><span>Brand Profile</span></div>
          <strong>{activeCompany.completionScore}%</strong>
          <p>Context completion</p>
        </EntityCard>
      </section>

      <section className="grid-two">
        <article className="panel">
          <h3>Publishing health</h3>
          {posts.length ? (
            <p>{published} published, {scheduled} scheduled, {inReview} awaiting review.</p>
          ) : (
            <div className="empty-state">
              <p>No post activity yet for this company.</p>
              <div className="button-row">
                <Link className="btn-primary" href="/build">Create first post</Link>
              </div>
            </div>
          )}
        </article>
        <article className="panel">
          <h3>Analytics readiness</h3>
          {analytics ? (
            <p>Impressions: {analytics.impressions} • Clicks: {analytics.clicks} • Published: {analytics.postsPublished}</p>
          ) : (
            <div className="empty-state">
              <p>No analytics snapshots yet.</p>
              <div className="button-row">
                <Link className="btn-ghost" href="/settings">Connect channels</Link>
                <Link className="btn-primary" href="/analytics">Generate first report</Link>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

