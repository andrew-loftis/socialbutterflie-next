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
    <div className="page">
      <PageHeader
        title={`${activeCompany.name} — Review Queue`}
        subtitle={inReview.length ? `${inReview.length} post${inReview.length === 1 ? '' : 's'} awaiting approval.` : 'All caught up.'}
      />

      {inReview.length ? (
        <section className="panel">
          <div className="button-row" style={{ marginBottom: 16 }}>
            <button className="btn-primary" type="button">Approve Selected</button>
            <button className="btn-ghost" type="button">Reject Selected</button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }} />
                <th>Scheduled</th>
                <th>Platform</th>
                <th>Caption</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inReview.map((row) => (
                <tr key={row.id}>
                  <td><input type="checkbox" /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{row.scheduledFor || '—'}</td>
                  <td>
                    <span className="badge">{row.platform || 'Unknown'}</span>
                  </td>
                  <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.caption || '—'}
                  </td>
                  <td>
                    <span className="badge" style={{ textTransform: 'capitalize' }}>{row.status.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <div className="button-row" style={{ gap: 6 }}>
                      <button className="btn-primary" type="button" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>Approve</button>
                      <button className="btn-ghost" type="button" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="panel">
          <div className="empty-state">
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--surface-2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
            }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--fg-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Queue is clear</p>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginBottom: 16 }}>No posts are waiting for review right now.</p>
            <Link className="btn-primary" href="/build">Create a post</Link>
          </div>
        </section>
      )}
    </div>
  );
}

