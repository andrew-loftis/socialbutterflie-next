"use client";

import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  MessageCircle,
  Send,
  Shield,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useNotifications } from '@/lib/hooks/use-notifications';
import type { NotificationEventType } from '@/types/interfaces';

const EVENT_ICONS: Record<NotificationEventType, React.ElementType> = {
  post_approved: Check,
  post_rejected: X,
  post_published: Send,
  comment_received: MessageCircle,
  dm_received: MessageCircle,
  mention_detected: Zap,
  contract_milestone: FileText,
  story_expiring: Zap,
  automation_triggered: Zap,
  member_joined: Users,
  weekly_digest: FileText,
  approval_requested: Shield,
  upload_received: Upload,
};

const EVENT_COLORS: Record<NotificationEventType, string> = {
  post_approved: '#3dd68c',
  post_rejected: '#ff5c5c',
  post_published: '#5ba0ff',
  comment_received: 'var(--company-primary, var(--accent))',
  dm_received: 'var(--company-primary, var(--accent))',
  mention_detected: '#f5a623',
  contract_milestone: '#f5a623',
  story_expiring: '#f5a623',
  automation_triggered: '#a78bfa',
  member_joined: '#3dd68c',
  weekly_digest: 'var(--muted)',
  approval_requested: '#f5a623',
  upload_received: '#5ba0ff',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function NotificationCenter() {
  const { notifications, unreadCount, markRead, markAllRead, dismiss } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell trigger */}
      <button
        type="button"
        className="btn-ghost btn-icon"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 8, height: 8, borderRadius: '50%',
            background: '#ff5c5c',
            boxShadow: '0 0 6px #ff5c5c88',
            border: '2px solid var(--panel)',
          }} />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 380,
          maxHeight: 480,
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--panel-strong)',
          backdropFilter: 'blur(24px)',
          boxShadow: 'var(--shadow-3)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px 10px', borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#ff5c5c22', color: '#ff5c5c', fontSize: '0.68rem',
                  fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  border: '1px solid #ff5c5c44',
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => markAllRead()}
                style={{ fontSize: '0.72rem', gap: 4 }}
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '40px 16px', textAlign: 'center',
                color: 'var(--muted)', fontSize: '0.84rem',
              }}>
                <Bell className="h-5 w-5" style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p>No notifications yet</p>
                <p style={{ fontSize: '0.74rem' }}>You&apos;ll see approvals, comments, and alerts here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = EVENT_ICONS[n.event] ?? Bell;
                const color = EVENT_COLORS[n.event] ?? 'var(--muted)';
                return (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex', gap: 10, padding: '10px 16px',
                      background: n.read ? 'transparent' : 'rgba(255,255,255,0.02)',
                      borderLeft: n.read ? '3px solid transparent' : `3px solid ${color}`,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'rgba(255,255,255,0.02)'; }}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                      if (n.href) window.location.href = n.href;
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${color}18`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon className="h-3.5 w-3.5" style={{ color }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.82rem', fontWeight: n.read ? 400 : 600,
                        color: 'var(--text)', lineHeight: 1.35,
                      }}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div style={{
                          fontSize: '0.74rem', color: 'var(--muted)',
                          marginTop: 2, lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {n.body}
                        </div>
                      )}
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 3, opacity: 0.7 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>

                    {/* Dismiss */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--muted)', padding: 4, borderRadius: 6,
                        flexShrink: 0, opacity: 0.5, transition: 'opacity 0.15s',
                      }}
                      onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                      onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; }}
                      title="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              borderTop: '1px solid var(--border)', padding: '8px 16px',
              textAlign: 'center',
            }}>
              <a
                href="/settings"
                style={{ fontSize: '0.74rem', color: 'var(--muted)', textDecoration: 'none' }}
              >
                Manage notification preferences →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
