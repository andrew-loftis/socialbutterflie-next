"use client";

/**
 * post-comments-panel.tsx
 * ────────────────────────
 * Threaded comment panel for post review — approval notes, @mentions,
 * image annotations, resolve threads. Wired to Firestore via usePostComments.
 */

import { useState, useRef, useEffect } from 'react';
import {
  AtSign,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  MoreVertical,
  Send,
  Trash2,
  X,
} from 'lucide-react';

import { usePostComments } from '@/lib/hooks/use-post-comments';
import { useAppState } from '@/components/shell/app-state';
import { useAuth } from '@/lib/firebase/auth-provider';
import type { PostComment } from '@/types/interfaces';

/* ── Time-ago helper ── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Visibility badge ── */

function VisibilityBadge({ visibility }: { visibility: PostComment['visibility'] }) {
  const meta = visibility === 'internal'
    ? { label: 'Internal', color: '#5ba0ff', bg: 'rgba(91,160,255,0.10)' }
    : { label: 'Client', color: '#f5a623', bg: 'rgba(245,166,35,0.10)' };
  return (
    <span style={{
      padding: '0 6px', borderRadius: 999, fontSize: '0.62rem', fontWeight: 700,
      color: meta.color, background: meta.bg,
      border: `1px solid ${meta.color}33`,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {meta.label}
    </span>
  );
}

/* ── Single comment bubble ── */

function CommentBubble({
  comment,
  isReply,
  onReply,
  onResolve,
  onDelete,
  currentUserId,
}: {
  comment: PostComment;
  isReply?: boolean;
  onReply: (parentId: string) => void;
  onResolve: (threadId: string) => void;
  onDelete: (commentId: string) => void;
  currentUserId: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = comment.authorId === currentUserId;

  return (
    <div style={{
      display: 'flex', gap: 8, padding: isReply ? '6px 0 6px 24px' : '8px 0',
      borderBottom: isReply ? 'none' : '1px solid var(--border-subtle)',
    }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: 999, flexShrink: 0,
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)',
      }}>
        {(comment.authorName || 'U').charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>
            {comment.authorName || 'Unknown'}
          </span>
          <VisibilityBadge visibility={comment.visibility} />
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)', marginLeft: 'auto' }}>
            {timeAgo(comment.createdAt)}
          </span>
          {comment.resolved && (
            <CheckCircle2 className="h-3 w-3" style={{ color: '#3dd68c' }} />
          )}
        </div>

        {/* Body */}
        <div style={{
          fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {comment.body}
        </div>

        {/* Mentions */}
        {comment.mentions && comment.mentions.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {comment.mentions.map((m) => (
              <span key={m} style={{
                padding: '0 6px', borderRadius: 999, fontSize: '0.68rem',
                background: 'rgba(91,160,255,0.08)', color: '#5ba0ff',
                border: '1px solid rgba(91,160,255,0.2)',
              }}>
                @{m}
              </span>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
          {!isReply && (
            <button
              type="button"
              onClick={() => onReply(comment.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'inherit',
                padding: 0,
              }}
            >
              <MessageSquare className="h-3 w-3" /> Reply
            </button>
          )}
          {!isReply && !comment.resolved && (
            <button
              type="button"
              onClick={() => onResolve(comment.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'inherit',
                padding: 0,
              }}
            >
              <Check className="h-3 w-3" /> Resolve
            </button>
          )}
          {isOwn && (
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', padding: 2,
                }}
              >
                <MoreVertical className="h-3 w-3" />
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 2,
                  background: 'var(--panel-strong)', border: '1px solid var(--border)',
                  borderRadius: 8, boxShadow: 'var(--shadow-2)', padding: 2,
                  minWidth: 100, zIndex: 20,
                }}>
                  <button
                    type="button"
                    onClick={() => { onDelete(comment.id); setMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                      padding: '6px 8px', border: 'none', background: 'transparent',
                      color: '#ff5c5c', fontSize: '0.78rem', fontFamily: 'inherit',
                      cursor: 'pointer', borderRadius: 4, textAlign: 'left',
                    }}
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Comment thread ── */

function CommentThread({
  comment,
  replies,
  onReply,
  onResolve,
  onDelete,
  currentUserId,
}: {
  comment: PostComment;
  replies: PostComment[];
  onReply: (parentId: string) => void;
  onResolve: (threadId: string) => void;
  onDelete: (commentId: string) => void;
  currentUserId: string;
}) {
  const [expanded, setExpanded] = useState(!comment.resolved);

  return (
    <div>
      <CommentBubble
        comment={comment}
        onReply={onReply}
        onResolve={onResolve}
        onDelete={onDelete}
        currentUserId={currentUserId}
      />
      {replies.length > 0 && (
        <div style={{ paddingLeft: 16 }}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'inherit',
              padding: '2px 0 4px',
            }}
          >
            {expanded
              ? <ChevronDown className="h-3 w-3" />
              : <ChevronRight className="h-3 w-3" />
            }
            {replies.length} repl{replies.length === 1 ? 'y' : 'ies'}
          </button>
          {expanded && replies.map((r) => (
            <CommentBubble
              key={r.id}
              comment={r}
              isReply
              onReply={onReply}
              onResolve={onResolve}
              onDelete={onDelete}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Panel ── */

export function PostCommentsPanel({ postId }: { postId: string }) {
  const { appContext } = useAppState();
  const { user } = useAuth();
  const { topLevel, repliesMap, loading, submitComment, resolve, totalCount, unresolvedCount } = usePostComments(postId);

  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PostComment['visibility']>('internal');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when replying
  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);
    try {
      await submitComment(
        body.trim(),
        appContext.userId,
        user?.displayName || 'Unknown',
        visibility,
        replyTo || undefined,
      );
      setBody('');
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  }

  async function handleResolve(threadId: string) {
    await resolve(threadId);
  }

  async function handleDelete(_commentId: string) {
    // In production: call deleteComment from comment-store
    // For now this is a placeholder — the real hook can be extended
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>Comments</span>
          {totalCount > 0 && (
            <span style={{
              padding: '0 6px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
              background: 'var(--surface-2)', color: 'var(--muted)',
              border: '1px solid var(--border)',
            }}>
              {totalCount}
            </span>
          )}
        </div>
        {unresolvedCount > 0 && (
          <span style={{
            padding: '1px 8px', borderRadius: 999, fontSize: '0.66rem', fontWeight: 600,
            color: '#f5a623', background: 'rgba(245,166,35,0.10)',
            border: '1px solid rgba(245,166,35,0.25)',
          }}>
            {unresolvedCount} unresolved
          </span>
        )}
      </div>

      {/* Comment list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 14px' }}>
        {loading ? (
          <div style={{
            textAlign: 'center', padding: '24px 0',
            color: 'var(--muted)', fontSize: '0.82rem',
          }}>
            Loading comments…
          </div>
        ) : topLevel.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '32px 0',
            color: 'var(--muted)', fontSize: '0.82rem',
          }}>
            <MessageSquare className="h-5 w-5" style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            No comments yet. Start a conversation.
          </div>
        ) : (
          topLevel.map((c) => (
            <CommentThread
              key={c.id}
              comment={c}
              replies={repliesMap.get(c.id) || []}
              onReply={(parentId) => setReplyTo(parentId)}
              onResolve={handleResolve}
              onDelete={handleDelete}
              currentUserId={appContext.userId}
            />
          ))
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}
      >
        {replyTo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.74rem', color: 'var(--muted)',
          }}>
            <span>Replying to thread</span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder={replyTo ? 'Write a reply…' : 'Add a comment… Use @name to mention'}
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
              resize: 'none',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className="btn-primary btn-sm"
            disabled={sending || !body.trim()}
            style={{ height: 36 }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Visibility picker */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--muted)' }}>Visible to:</span>
          {(['internal', 'client'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={`chip${visibility === v ? ' active' : ''}`}
              style={{ fontSize: '0.68rem', padding: '1px 8px' }}
            >
              {v === 'internal' ? 'Team Only' : 'Client Visible'}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
