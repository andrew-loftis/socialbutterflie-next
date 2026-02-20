"use client";

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyPosts } from '@/lib/hooks/use-company-posts';

export default function ReviewPage() {
  const { activeCompany } = useActiveCompany();
  const { posts } = useCompanyPosts();
  const inReview = posts.filter((post) => post.status === 'in_review');

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
      <PageHeader title={`${activeCompany.name} Review Queue`} subtitle="Approve or reject company-scoped posts." />
      <section className="panel">
        <div className="button-row">
          <button className="btn-primary" type="button">Approve Selected</button>
          <button className="btn-ghost" type="button">Reject Selected</button>
        </div>
        {inReview.length ? (
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>Scheduled</th>
                <th>Platform</th>
                <th>Caption</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inReview.map((row) => (
                <tr key={row.id}>
                  <td><input type="checkbox" /></td>
                  <td>{row.scheduledFor || '-'}</td>
                  <td>{row.platform || '-'}</td>
                  <td>{row.caption || '-'}</td>
                  <td><span className="badge">{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>No posts are waiting for review.</p>
            <Link className="btn-primary" href="/build">Create company post</Link>
          </div>
        )}
      </section>
    </div>
  );
}

