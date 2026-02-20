import Link from 'next/link';
import { Eye, FileText, Layers, Sparkles, WandSparkles } from 'lucide-react';
import { EntityCard } from '@/components/ui/entity-card';
import { PageHeader } from '@/components/ui/page-header';

const entities = {
  campaign: {
    kind: 'campaign' as const,
    id: 'campaign-summit',
    title: 'Summit launch campaign',
    subtitle: '8 scheduled posts',
    status: 'Active',
    summary: 'Cross-platform launch campaign with cinematic hero sequence.',
    versionHistory: ['v3 approved', 'v2 revised'],
    approvals: ['Approved by editor'],
    auditLog: ['Updated 1h ago'],
  },
  post: {
    kind: 'post' as const,
    id: 'post-102',
    title: 'Weekend trail teaser',
    subtitle: 'Instagram + TikTok',
    status: 'In Review',
    summary: 'Awaiting final compliance check before queueing.',
    versionHistory: ['v2 CTA refinement', 'v1 draft'],
    approvals: ['Pending'],
    auditLog: ['Submitted by user-demo'],
  },
  report: {
    kind: 'report' as const,
    id: 'report-2026-02',
    title: 'February executive report',
    subtitle: 'Engagement + pipeline',
    status: 'Ready',
    summary: 'Automated report package with campaign attribution.',
    versionHistory: ['v4 export'],
    approvals: ['Approved by admin'],
    auditLog: ['Generated today'],
  },
};

export default function DashboardPage() {
  return (
    <div className="space-y-3">
      <PageHeader
        title="Dashboard"
        subtitle="Operational command center for publishing, approvals, and AI workflows."
        actions={<Link className="btn-primary" href="/build">Create Post</Link>}
      />

      <section className="stats-grid">
        <EntityCard entity={entities.post} className="stat">
          <div className="stat-top"><WandSparkles className="h-4 w-4" /><span>Scheduled</span></div>
          <strong>24</strong>
          <p>Next 7 days</p>
        </EntityCard>
        <EntityCard entity={entities.post} className="stat">
          <div className="stat-top"><Eye className="h-4 w-4" /><span>In Review</span></div>
          <strong>6</strong>
          <p>Requires approval</p>
        </EntityCard>
        <EntityCard entity={entities.campaign} className="stat">
          <div className="stat-top"><Layers className="h-4 w-4" /><span>Campaigns</span></div>
          <strong>9</strong>
          <p>4 active this week</p>
        </EntityCard>
        <EntityCard entity={entities.report} className="stat">
          <div className="stat-top"><FileText className="h-4 w-4" /><span>Reports</span></div>
          <strong>3</strong>
          <p>Automated exports</p>
        </EntityCard>
      </section>

      <section className="grid-two">
        <EntityCard entity={entities.post}>
          <h3>Upcoming Posts</h3>
          <p>2 pending, 4 approved, 1 failed retry.</p>
        </EntityCard>
        <EntityCard entity={entities.campaign}>
          <h3>Campaign Performance</h3>
          <p>Summit launch is 28% above baseline engagement.</p>
        </EntityCard>
      </section>

      <section className="grid-two">
        <EntityCard entity={entities.report}>
          <h3>Reporting Queue</h3>
          <p>Export pipeline healthy. Next report scheduled Friday 8:00 AM.</p>
        </EntityCard>
        <EntityCard
          entity={{
            kind: 'company',
            id: 'company-aurora',
            title: 'Aurora Outdoors',
            subtitle: 'Brand profile',
            status: '88% complete',
            summary: 'Brand context linked to AI generation and publishing guardrails.',
            versionHistory: ['v5'],
            approvals: ['Approved'],
            auditLog: ['Edited today'],
          }}
        >
          <h3>Company Context Health</h3>
          <p>Identity, Voice, and Visual are complete. Audience section needs one field.</p>
          <Link className="inline-link" href="/companies/company-aurora">Open Company Profile</Link>
        </EntityCard>
      </section>

      <section className="panel">
        <h3>Quick Routes</h3>
        <div className="quick-links">
          <Link href="/calendar">Calendar</Link>
          <Link href="/review">Review Queue</Link>
          <Link href="/analytics">Analytics</Link>
          <Link href="/assets">Assets</Link>
          <Link href="/studio"><Sparkles className="h-4 w-4" /> AI Studio</Link>
        </div>
      </section>
    </div>
  );
}

