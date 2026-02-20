"use client";

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyPosts } from '@/lib/hooks/use-company-posts';

export default function StudioLibraryPage() {
  const { activeCompany } = useActiveCompany();
  const { posts } = useCompanyPosts();

  return (
    <div className="space-y-3">
      <PageHeader title="Studio Library" subtitle="Generated outputs and queued jobs for the active company." />
      {!activeCompany ? (
        <section className="panel">
          <h3>No active company selected</h3>
          <Link className="btn-primary" href="/select-company">Choose company</Link>
        </section>
      ) : (
        <section className="panel">
          {posts.length ? (
            <table className="table">
              <thead>
                <tr><th>Record</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td>{post.id}</td>
                    <td><span className="badge">{post.status}</span></td>
                    <td><Link className="inline-link" href={`/studio/jobs/${post.id}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No generation jobs yet for {activeCompany.name}.</p>
              <Link className="btn-primary" href="/studio">Create first generation</Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

