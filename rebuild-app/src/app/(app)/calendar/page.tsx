"use client";

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyPosts } from '@/lib/hooks/use-company-posts';

const days = Array.from({ length: 35 }, (_, index) => index + 1);

export default function CalendarPage() {
  const { activeCompany } = useActiveCompany();
  const { posts } = useCompanyPosts();

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
      <PageHeader title={`${activeCompany.name} Calendar`} subtitle="Company-scoped scheduling timeline." />
      <section className="panel">
        <div className="panel-toolbar">
          <div className="pill-row">
            <span className="chip">Draft</span>
            <span className="chip">Review</span>
            <span className="chip">Scheduled</span>
            <span className="chip">Published</span>
          </div>
        </div>
        <div className="calendar-grid">
          {days.map((day) => (
            <button key={day} className="calendar-day" type="button">
              <span>{((day - 1) % 31) + 1}</span>
            </button>
          ))}
        </div>
        {!posts.length ? (
          <div className="empty-state">
            <p>No scheduled posts for this company yet.</p>
            <Link className="btn-primary" href="/build">Create first post</Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}

