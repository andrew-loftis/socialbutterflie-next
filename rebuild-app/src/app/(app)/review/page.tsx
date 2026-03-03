"use client";

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { CheckCircle2, Clock, Eye, Filter, MessageSquare, RefreshCw, X, XCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';

import { PageHeader } from '@/components/ui/page-header';
import { PostCommentsPanel } from '@/components/ui/post-comments-panel';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyPosts } from '@/lib/hooks/use-company-posts';
import { useAppState } from '@/components/shell/app-state';
import { firestore } from '@/lib/firebase/client';

type PostStatus = 'draft' | 'in_review' | 'scheduled' | 'published' | 'failed';

const STATUS_META: Record<PostStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',      color: '#7a8fb0', bg: 'rgba(122,143,176,0.12)' },
  in_review: { label: 'In Review',  color: '#f5a623', bg: 'rgba(245,166,35,0.12)'  },
  scheduled: { label: 'Scheduled',  color: '#5ba0ff', bg: 'rgba(91,160,255,0.12)'  },
  published: { label: 'Published',  color: '#3dd68c', bg: 'rgba(61,214,140,0.12)'  },
  failed:    { label: 'Failed',     color: '#ff5c5c', bg: 'rgba(255,92,92,0.12)'   },
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '📘', linkedin: '💼', tiktok: '🎵',
  youtube: '▶️', twitter: '🐦', x: '𝕏', threads: '🧵', bluesky: '🦋',
  pinterest: '📌', reddit: '🔴',
};

function formatDate(str?: string) {
  if (!str) return '—';
  try {
    const d = new Date(str);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return str; }
}

export default function ReviewPage() {
  const { activeCompany } = useActiveCompany();
  const { appContext } = useAppState();
  const { posts } = useCompanyPosts();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('in_review');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const commentPost = commentPostId ? posts.find(p => p.id === commentPostId) : null;

  const filtered = posts.filter((p) =>
    statusFilter === 'all'
      ? (p.status === 'in_review' || p.status === 'draft')
      : p.status === statusFilter
  );

  const showToast = useCallback((msg: string, kind: 'success' | 'error' = 'success') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  }, []);

  async function updatePostStatus(postId: string, newStatus: PostStatus) {
    if (!firestore || !activeCompany) {
      showToast('Firebase not configured — update skipped.', 'error');
      return;
    }
    setActionLoading(postId);
    try {
      const postRef = doc(
        firestore,
        'workspaces', appContext.workspaceId,
        'companies', activeCompany.id,
        'posts', postId
      );
      await updateDoc(postRef, { status: newStatus, updatedAt: new Date().toISOString() });
      showToast(
        newStatus === 'scheduled' ? 'Post approved and queued for publishing.' :
        newStatus === 'draft'     ? 'Post returned to drafts.' :
        `Status updated to ${newStatus}.`
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Update failed.', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function bulkUpdate(newStatus: PostStatus) {
    if (!firestore || !activeCompany || selected.size === 0) return;
    setActionLoading('bulk');
    try {
      await Promise.all([...selected].map((id) => {
        const ref = doc(
          firestore!,
          'workspaces', appContext.workspaceId,
          'companies', activeCompany.id,
          'posts', id
        );
        return updateDoc(ref, { status: newStatus, updatedAt: new Date().toISOString() });
      }));
      showToast(`${selected.size} post${selected.size > 1 ? 's' : ''} ${newStatus === 'scheduled' ? 'approved' : 'returned to draft'}.`);
      setSelected(new Set());
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Bulk update failed.', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (!activeCompany) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon"><Eye className="h-6 w-6" /></div>
          <h3>No active company selected</h3>
          <Link className="btn-primary" href="/select-company">Choose company</Link>
        </div>
      </section>
    );
  }

  const inReviewCount = posts.filter((p) => p.status === 'in_review').length;
  const draftCount    = posts.filter((p) => p.status === 'draft').length;

  return (
    <div className="page">
      <PageHeader
        title="Review Queue"
        subtitle={
          inReviewCount
            ? `${inReviewCount} awaiting approval · ${draftCount} draft${draftCount !== 1 ? 's' : ''}`
            : 'All caught up — no posts pending review.'
        }
        actions={<Link className="btn-ghost btn-sm" href="/build">+ New Post</Link>}
      />

      {/* Filter strip */}
      <div className="panel" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
          <Filter className="h-3.5 w-3.5" style={{ color: 'var(--muted)', flexShrink: 0 }} />
          {(['in_review', 'draft', 'all'] as const).map((f) => (
            <button
              key={f}
              className={`chip${statusFilter === f ? ' active' : ''}`}
              type="button"
              onClick={() => { setStatusFilter(f); setSelected(new Set()); }}
            >
              {f === 'all' ? 'All pending' : f === 'in_review' ? 'In Review' : 'Drafts'}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.76rem', color: 'var(--muted)' }}>
            {filtered.length} post{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600,
          color: toast.kind === 'success' ? '#3dd68c' : '#ff5c5c',
          background: toast.kind === 'success' ? 'rgba(61,214,140,0.08)' : 'rgba(255,92,92,0.08)',
          border: `1px solid ${toast.kind === 'success' ? 'rgba(61,214,140,0.3)' : 'rgba(255,92,92,0.3)'}`,
        }}>
          {toast.kind === 'success' ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {filtered.length > 0 ? (
        <section className="panel">
          {/* Bulk action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.78rem', color: 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={() => {
                  if (selected.size === filtered.length) setSelected(new Set());
                  else setSelected(new Set(filtered.map((p) => p.id)));
                }}
                style={{ width: 15, height: 15 }}
              />
              {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
            </label>
            {selected.size > 0 && (
              <>
                <button className="btn-success btn-sm" type="button" onClick={() => bulkUpdate('scheduled')} disabled={actionLoading === 'bulk'}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {actionLoading === 'bulk' ? 'Approving…' : `Approve ${selected.size}`}
                </button>
                <button className="btn-danger btn-sm" type="button" onClick={() => bulkUpdate('draft')} disabled={actionLoading === 'bulk'}>
                  <XCircle className="h-3.5 w-3.5" />
                  {actionLoading === 'bulk' ? 'Rejecting…' : `Reject ${selected.size}`}
                </button>
              </>
            )}
          </div>

          <table className="table" style={{ position: 'relative', zIndex: 1 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }} />
                <th>Platform</th>
                <th>Scheduled for</th>
                <th>Caption</th>
                <th>Status</th>
                <th style={{ width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const st = STATUS_META[row.status as PostStatus] ?? STATUS_META.draft;
                const emoji = PLATFORM_EMOJI[(row.platform ?? '').toLowerCase()] ?? '📄';
                const isLoading = actionLoading === row.id;
                return (
                  <tr key={row.id} style={{ opacity: isLoading ? 0.55 : 1, transition: 'opacity 0.18s' }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        style={{ width: 15, height: 15, cursor: 'pointer' }}
                      />
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '1rem' }}>{emoji}</span>
                        <span className="badge" style={{ textTransform: 'capitalize' }}>{row.platform || 'Unknown'}</span>
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '0.78rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock className="h-3 w-3" />
                        {formatDate(row.scheduledFor)}
                      </span>
                    </td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {row.caption || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No caption</span>}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 999, fontSize: '0.70rem', fontWeight: 600,
                        color: st.color, background: st.bg, border: `1px solid ${st.color}44`,
                        textTransform: 'capitalize',
                      }}>
                        {st.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {isLoading ? (
                          <RefreshCw className="h-4 w-4" style={{ color: 'var(--muted)', animation: 'review-spin 1s linear infinite' }} />
                        ) : row.status === 'in_review' ? (
                          <>
                            <button className="btn-success btn-sm" type="button" onClick={() => updatePostStatus(row.id, 'scheduled')}>
                              <CheckCircle2 className="h-3 w-3" /> Approve
                            </button>
                            <button className="btn-danger btn-sm" type="button" onClick={() => updatePostStatus(row.id, 'draft')}>
                              <XCircle className="h-3 w-3" /> Reject
                            </button>
                            <button
                              className="btn-ghost btn-sm"
                              type="button"
                              title="Comments"
                              onClick={() => setCommentPostId(commentPostId === row.id ? null : row.id)}
                              style={commentPostId === row.id ? { color: 'var(--accent)', background: 'rgba(245,166,35,0.10)' } : {}}
                            >
                              <MessageSquare className="h-3 w-3" />
                            </button>
                          </>
                        ) : row.status === 'draft' ? (
                          <>
                            <button className="btn-ghost btn-sm" type="button" onClick={() => updatePostStatus(row.id, 'in_review')}>
                              Submit for review
                            </button>
                            <button
                              className="btn-ghost btn-sm"
                              type="button"
                              title="Comments"
                              onClick={() => setCommentPostId(commentPostId === row.id ? null : row.id)}
                              style={commentPostId === row.id ? { color: 'var(--accent)', background: 'rgba(245,166,35,0.10)' } : {}}
                            >
                              <MessageSquare className="h-3 w-3" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="panel">
          <div className="empty-state">
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(61,214,140,0.10)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px',
              border: '1px solid rgba(61,214,140,0.25)',
            }}>
              <CheckCircle2 className="h-6 w-6" style={{ color: '#3dd68c' }} />
            </div>
            <p style={{ fontWeight: 600 }}>Queue is clear</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              {statusFilter === 'in_review' ? 'No posts are currently in review.' :
               statusFilter === 'draft'     ? 'No draft posts yet.' : 'Nothing pending right now.'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="btn-primary btn-sm" href="/build">Create a post</Link>
              {statusFilter !== 'all' && (
                <button className="btn-ghost btn-sm" type="button" onClick={() => setStatusFilter('all')}>
                  View all
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Comment side panel */}
      {commentPostId && commentPost && (
        <section className="panel" style={{ padding: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <MessageSquare className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Comments</span>
              <span style={{ marginLeft: 8, fontSize: '0.76rem', color: 'var(--muted)' }}>
                {commentPost.platform ? `${PLATFORM_EMOJI[(commentPost.platform ?? '').toLowerCase()] ?? '📄'} ${commentPost.platform}` : ''} ·{' '}
                {(commentPost.caption ?? '').slice(0, 50)}{(commentPost.caption ?? '').length > 50 ? '…' : ''}
              </span>
            </div>
            <button className="btn-ghost btn-sm" type="button" onClick={() => setCommentPostId(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div style={{ padding: '0 0 4px 0' }}>
            <PostCommentsPanel postId={commentPostId} />
          </div>
        </section>
      )}

      <style>{`@keyframes review-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

