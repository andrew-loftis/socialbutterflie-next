"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AtSign,
  ChevronRight,
  Clock,
  Heart,
  Inbox,
  MessageCircle,
  MessageSquare,
  Plug,
  RefreshCw,
  Reply,
  Search,
  Send,
  Star,
  Tag,
  User,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useAppState } from '@/components/shell/app-state';
import { useInbox } from '@/lib/hooks/use-inbox';

// ─── Types ───────────────────────────────────────────────────────────────────

type Platform = 'All' | 'Instagram' | 'Facebook' | 'LinkedIn' | 'X / Twitter' | 'TikTok' | 'Threads' | 'YouTube';
type MessageType = 'All' | 'Comments' | 'DMs' | 'Mentions' | 'Reviews';
type MessageStatus = 'unread' | 'read' | 'replied' | 'starred';

interface InboxMessage {
  id: string;
  platform: Exclude<Platform, 'All'>;
  type: Exclude<MessageType, 'All'>;
  status: MessageStatus;
  fromName: string;
  fromHandle: string;
  avatarInitials: string;
  avatarColor: string;
  preview: string;
  fullText: string;
  timestamp: Date;
  postPreview?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  starred?: boolean;
  replies?: { from: 'me' | 'them'; text: string; timestamp: Date }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_EMOJI: Record<Exclude<Platform, 'All'>, string> = {
  Instagram: '📸',
  Facebook: '📘',
  LinkedIn: '💼',
  'X / Twitter': '𝕏',
  TikTok: '🎵',
  Threads: '🧵',
  YouTube: '▶️',
};

const PLATFORM_COLOR: Record<Exclude<Platform, 'All'>, string> = {
  Instagram: '#e1306c',
  Facebook: '#1877f2',
  LinkedIn: '#0a66c2',
  'X / Twitter': '#14171a',
  TikTok: '#010101',
  Threads: '#000000',
  YouTube: '#ff0000',
};

const TYPE_ICON: Record<Exclude<MessageType, 'All'>, typeof MessageCircle> = {
  Comments: MessageCircle,
  DMs: MessageSquare,
  Mentions: AtSign,
  Reviews: Star,
};

const PLATFORMS: Platform[] = ['All', 'Instagram', 'Facebook', 'LinkedIn', 'X / Twitter', 'TikTok', 'Threads', 'YouTube'];
const MESSAGE_TYPES: MessageType[] = ['All', 'Comments', 'DMs', 'Mentions', 'Reviews'];

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// ─── Demo data (realistic mock) ───────────────────────────────────────────────

function buildDemoMessages(): InboxMessage[] {
  const now = Date.now();
  return [
    {
      id: '1', platform: 'Instagram', type: 'Comments', status: 'unread',
      fromName: 'Jamie Torres', fromHandle: '@jamietorres', avatarInitials: 'JT', avatarColor: '#9b59b6',
      preview: 'Love this post! Where can I get one? 🔥',
      fullText: 'Love this post! Where can I get one? 🔥 Also tagging my friend @friend!',
      timestamp: new Date(now - 4 * 60000),
      postPreview: 'Summer collection drop 🌞',
      sentiment: 'positive',
      replies: [],
    },
    {
      id: '2', platform: 'Facebook', type: 'Comments', status: 'read',
      fromName: 'Marcus Webb', fromHandle: 'Marcus Webb', avatarInitials: 'MW', avatarColor: '#2980b9',
      preview: 'How long does shipping usually take?',
      fullText: 'How long does shipping usually take? Planning to order for a birthday gift next week.',
      timestamp: new Date(now - 27 * 60000),
      postPreview: 'Fast & free shipping on all orders!',
      sentiment: 'neutral',
      replies: [
        { from: 'me', text: 'Hi Marcus! Standard shipping is 3–5 business days. Express is 1–2 days. Hope that helps!', timestamp: new Date(now - 20 * 60000) },
      ],
    },
    {
      id: '3', platform: 'X / Twitter', type: 'Mentions', status: 'unread',
      fromName: 'Priya Nair', fromHandle: '@pnairtech', avatarInitials: 'PN', avatarColor: '#27ae60',
      preview: 'Just discovered @YourBrand and I\'m obsessed 🙌',
      fullText: 'Just discovered @YourBrand and I\'m obsessed 🙌 The quality is insane for the price. 10/10 recommend!',
      timestamp: new Date(now - 1.5 * 3600000),
      sentiment: 'positive',
      replies: [],
    },
    {
      id: '4', platform: 'Instagram', type: 'DMs', status: 'unread',
      fromName: 'Sofia Reyes', fromHandle: '@sofiareyes', avatarInitials: 'SR', avatarColor: '#e74c3c',
      preview: 'Hi! Do you ship internationally? I\'m based in Spain.',
      fullText: 'Hi! Do you ship internationally? I\'m based in Spain and I\'d love to order from you!',
      timestamp: new Date(now - 2.2 * 3600000),
      sentiment: 'neutral',
      replies: [],
    },
    {
      id: '5', platform: 'LinkedIn', type: 'Comments', status: 'replied',
      fromName: 'David Chen', fromHandle: 'David Chen · Marketing Director', avatarInitials: 'DC', avatarColor: '#0a66c2',
      preview: 'Great insights on brand storytelling in this post.',
      fullText: 'Great insights on brand storytelling in this post. Would love to connect and discuss collaboration opportunities.',
      timestamp: new Date(now - 4 * 3600000),
      postPreview: '5 brand storytelling lessons from top DTC brands',
      sentiment: 'positive',
      replies: [
        { from: 'me', text: 'Thanks David! Feel free to send a connection request. Always happy to chat.', timestamp: new Date(now - 3.5 * 3600000) },
        { from: 'them', text: 'Will do! Looking forward to it.', timestamp: new Date(now - 3 * 3600000) },
      ],
    },
    {
      id: '6', platform: 'TikTok', type: 'Comments', status: 'unread',
      fromName: 'kylie.makes.things', fromHandle: '@kyliemakes', avatarInitials: 'KM', avatarColor: '#ff6b9d',
      preview: 'Omg I made this and it turned out amazing!! 😭🙏',
      fullText: 'Omg I made this and it turned out amazing!! 😭🙏 posting my version tomorrow!',
      timestamp: new Date(now - 5 * 3600000),
      postPreview: 'DIY summer wreath tutorial 🌻',
      sentiment: 'positive',
      replies: [],
    },
    {
      id: '7', platform: 'Instagram', type: 'Reviews', status: 'read',
      fromName: 'Alex Kim', fromHandle: '@alexkim', avatarInitials: 'AK', avatarColor: '#f39c12',
      preview: '4/5 stars — arrived slightly damaged but support was amazing',
      fullText: '4/5 stars — The product itself is great but it arrived slightly damaged. Customer support was super responsive and sent a replacement right away. Would buy again.',
      timestamp: new Date(now - 10 * 3600000),
      sentiment: 'neutral',
      replies: [
        { from: 'me', text: 'So sorry about the packaging issue, Alex! Really glad our team could make it right quickly. Thank you for the kind words!', timestamp: new Date(now - 9 * 3600000) },
      ],
    },
    {
      id: '8', platform: 'Facebook', type: 'DMs', status: 'read',
      fromName: 'Tanya Mills', fromHandle: 'Tanya Mills', avatarInitials: 'TM', avatarColor: '#8e44ad',
      preview: 'Is the black version still available in size M?',
      fullText: 'Is the black version still available in size M? The website says out of stock but I really want it!',
      timestamp: new Date(now - 1.2 * 86400000),
      sentiment: 'neutral',
      replies: [],
    },
    {
      id: '9', platform: 'Threads', type: 'Mentions', status: 'unread',
      fromName: 'Oliver Brooks', fromHandle: '@oli.brooks', avatarInitials: 'OB', avatarColor: '#1abc9c',
      preview: 'Finally tried @YourBrand — lived up to the hype fr',
      fullText: 'Finally tried @YourBrand — lived up to the hype fr. The packaging alone is a 10/10.',
      timestamp: new Date(now - 18 * 3600000),
      sentiment: 'positive',
      replies: [],
    },
    {
      id: '10', platform: 'YouTube', type: 'Comments', status: 'read',
      fromName: 'DesignByMika', fromHandle: '@designbymika', avatarInitials: 'DM', avatarColor: '#e74c3c',
      preview: 'Could you do a deep dive video on color theory next?',
      fullText: 'Could you do a deep dive video on color theory next? This tutorial was super clear. Subscribed!',
      timestamp: new Date(now - 2.1 * 86400000),
      postPreview: 'Typography basics for beginners',
      sentiment: 'positive',
      replies: [],
    },
    {
      id: '11', platform: 'X / Twitter', type: 'DMs', status: 'unread',
      fromName: 'RetailBuyerNYC', fromHandle: '@retailbuyernyc', avatarInitials: 'RB', avatarColor: '#34495e',
      preview: 'Hi, are you open to wholesale inquiries?',
      fullText: 'Hi, are you open to wholesale inquiries? We run a small boutique in Brooklyn and would love to carry your products.',
      timestamp: new Date(now - 3 * 86400000),
      sentiment: 'positive',
      replies: [],
    },
  ];
}

// ─── Sentiment badge ──────────────────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment?: 'positive' | 'neutral' | 'negative' }) {
  if (!sentiment) return null;
  const map = {
    positive: { label: '😊 Positive', color: '#3dd68c', bg: '#3dd68c18' },
    neutral: { label: '😐 Neutral', color: '#a0a8bc', bg: '#a0a8bc18' },
    negative: { label: '😠 Negative', color: '#f87171', bg: '#f8717118' },
  };
  const m = map[sentiment];
  return (
    <span style={{
      fontSize: '0.62rem', fontWeight: 600, padding: '2px 7px', borderRadius: 999,
      color: m.color, background: m.bg, border: `1px solid ${m.color}44`,
    }}>
      {m.label}
    </span>
  );
}

// ─── Conversation panel ────────────────────────────────────────────────────────

function ConversationPanel({ message, onClose, onReply, quickReplies, onAssign, assignment }: {
  message: InboxMessage;
  onClose: () => void;
  onReply: (id: string, text: string) => void;
  quickReplies: { id: string; name: string; body: string }[];
  onAssign?: (userId: string) => void;
  assignment?: { assignedTo: string; status: string } | null;
}) {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [message.replies?.length]);

  function handleSend() {
    const text = replyText.trim();
    if (!text) return;
    setSending(true);
    setTimeout(() => {
      onReply(message.id, text);
      setReplyText('');
      setSending(false);
    }, 600);
  }

  const platformColor = PLATFORM_COLOR[message.platform] ?? 'var(--accent)';
  const emoji = PLATFORM_EMOJI[message.platform];

  return (
    <aside style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
      background: 'var(--panel)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      boxShadow: '-4px 0 24px rgba(0,0,0,0.2)',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 999, background: message.avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, color: '#fff', fontSize: '0.78rem', flexShrink: 0,
        }}>
          {message.avatarInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{message.fromName}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{message.fromHandle}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', background: `${platformColor}22`, color: platformColor, padding: '1px 7px', borderRadius: 999, border: `1px solid ${platformColor}44` }}>
              {emoji} {message.platform}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{message.type}</span>
            <SentimentBadge sentiment={message.sentiment} />
          </div>
        </div>
        <button className="btn-ghost btn-sm" type="button" onClick={onClose} style={{ flexShrink: 0, padding: '4px 6px' }}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Context post */}
      {message.postPreview && (
        <div style={{ margin: '10px 16px 0', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, borderLeft: `3px solid ${platformColor}`, fontSize: '0.76rem', color: 'var(--muted)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text)', marginRight: 6 }}>Post:</span>
          {message.postPreview}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Original message */}
        <div style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: '16px 16px 16px 4px', padding: '10px 14px',
            fontSize: '0.82rem', lineHeight: 1.55,
          }}>
            {message.fullText}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 4 }}>
            {relativeTime(message.timestamp)}
          </div>
        </div>

        {/* Thread replies */}
        {message.replies?.map((reply, i) => (
          <div key={i} style={{ alignSelf: reply.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <div style={{
              background: reply.from === 'me' ? 'var(--company-primary, var(--accent))' : 'var(--surface-2)',
              border: reply.from === 'me' ? 'none' : '1px solid var(--border)',
              color: reply.from === 'me' ? '#fff' : 'var(--text)',
              borderRadius: reply.from === 'me' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '10px 14px', fontSize: '0.82rem', lineHeight: 1.55,
            }}>
              {reply.text}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 4, textAlign: reply.from === 'me' ? 'right' : 'left' }}>
              {reply.from === 'me' ? 'You' : message.fromName} · {relativeTime(reply.timestamp)}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && (
        <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.64rem', color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>
            <Zap className="h-3 w-3" style={{ display: 'inline', verticalAlign: 'middle' }} /> Quick:
          </span>
          {quickReplies.map((qr) => (
            <button
              key={qr.id}
              type="button"
              className="chip"
              style={{ fontSize: '0.66rem', padding: '2px 8px' }}
              onClick={() => setReplyText(qr.body)}
            >
              {qr.name}
            </button>
          ))}
        </div>
      )}

      {/* Assignment bar */}
      {(assignment || onAssign) && (
        <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.70rem' }}>
          <UserPlus className="h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
          {assignment ? (
            <span style={{ color: 'var(--accent)' }}>
              Assigned to <strong>{assignment.assignedTo}</strong> &middot; {assignment.status}
            </span>
          ) : (
            <button
              type="button"
              className="btn-ghost btn-sm"
              style={{ fontSize: '0.66rem' }}
              onClick={() => onAssign?.('me')}
            >
              Assign to me
            </button>
          )}
        </div>
      )}

      {/* Reply box */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Reply on ${message.platform}…`}
            rows={2}
            style={{
              flex: 1, resize: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 12px', fontSize: '0.82rem', color: 'var(--text)',
              fontFamily: 'inherit', lineHeight: 1.5,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          <button
            className="btn-primary btn-sm"
            type="button"
            disabled={!replyText.trim() || sending}
            onClick={handleSend}
            style={{ alignSelf: 'flex-end', flexShrink: 0 }}
          >
            {sending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 6 }}>
          ⌘ + Enter to send · Reply is sent via {message.platform} API
        </p>
      </div>
    </aside>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { activeCompany } = useActiveCompany();
  const { appContext } = useAppState();
  const { quickReplies, labels, assignments, assign, getAssignment, addLabel, addQuickReply } = useInbox();
  const [platform, setPlatform] = useState<Platform>('All');
  const [msgType, setMsgType] = useState<MessageType>('All');
  const [search, setSearch] = useState('');
  const [starFilter, setStarFilter] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>(buildDemoMessages);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (platform !== 'All' && m.platform !== platform) return false;
      if (msgType !== 'All' && m.type !== msgType) return false;
      if (unreadOnly && m.status !== 'unread') return false;
      if (starFilter && !m.starred) return false;
      if (q && !m.fromName.toLowerCase().includes(q) && !m.preview.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [messages, platform, msgType, search, unreadOnly, starFilter]);

  const selected = useMemo(() => messages.find((m) => m.id === selectedId) ?? null, [messages, selectedId]);

  const unreadCount = useMemo(() => messages.filter((m) => m.status === 'unread').length, [messages]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMessages((prev) => prev.map((m) => m.id === id && m.status === 'unread' ? { ...m, status: 'read' } : m));
  }, []);

  const handleReply = useCallback((id: string, text: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? {
      ...m,
      status: 'replied',
      replies: [...(m.replies ?? []), { from: 'me', text, timestamp: new Date() }],
    } : m));
  }, []);

  const handleStar = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, starred: !m.starred } : m));
  }, []);

  if (!activeCompany) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Inbox className="h-6 w-6" /></div>
        <h3>No company selected</h3>
        <p>Select a company to view its social inbox.</p>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3" style={{ paddingRight: selected ? 436 : 0, transition: 'padding-right 0.25s' }}>
      <PageHeader
        title="Inbox"
        subtitle={`${activeCompany.name} · All social conversations in one place.`}
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '2px 9px', borderRadius: 999,
                background: 'var(--accent)', color: '#fff',
              }}>
                {unreadCount} unread
              </span>
            )}
            <button
              className={`chip${unreadOnly ? ' active' : ''}`}
              type="button"
              onClick={() => setUnreadOnly((v) => !v)}
            >
              Unread only
            </button>
            <button
              className={`chip${starFilter ? ' active' : ''}`}
              type="button"
              onClick={() => setStarFilter((v) => !v)}
            >
              <Star className="h-3 w-3" /> Starred
            </button>
            <Link className="btn-ghost btn-sm" href="/integrations">
              <Plug className="h-3.5 w-3.5" /> Channels
            </Link>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="panel" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {/* Platform filter */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {PLATFORMS.map((p) => (
              <button
                key={p}
                className={`chip${platform === p ? ' active' : ''}`}
                type="button"
                onClick={() => setPlatform(p)}
              >
                {p !== 'All' && PLATFORM_EMOJI[p as Exclude<Platform, 'All'>]} {p}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 5 }}>
            {MESSAGE_TYPES.map((t) => {
              const Icon = t !== 'All' ? TYPE_ICON[t as Exclude<MessageType, 'All'>] : null;
              return (
                <button
                  key={t}
                  className={`chip${msgType === t ? ' active' : ''}`}
                  type="button"
                  onClick={() => setMsgType(t)}
                >
                  {Icon && <Icon className="h-3 w-3" />} {t}
                </button>
              );
            })}
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <div className="search-wrap" style={{ width: 220 }}>
              <Search className="h-3.5 w-3.5" style={{ position: 'absolute', left: 10, color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                className="search-input"
                placeholder="Search messages…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 30 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* No company channels message */}
      <div className="panel" style={{ padding: '10px 14px', background: 'var(--surface-2)', borderLeft: '3px solid var(--accent)', fontSize: '0.78rem', color: 'var(--muted)' }}>
        <strong style={{ color: 'var(--text)' }}>Live sync coming soon.</strong>{' '}
        Showing sample messages. Connect your social channels to pull in real conversations.{' '}
        <Link href="/integrations" style={{ color: 'var(--accent)', fontWeight: 600 }}>Connect channels →</Link>
      </div>

      {/* Message list */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Inbox className="h-6 w-6" /></div>
          <h3>No messages</h3>
          <p>Try clearing filters, or connect a social channel to populate your inbox.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost btn-sm" type="button" onClick={() => { setPlatform('All'); setMsgType('All'); setSearch(''); setUnreadOnly(false); setStarFilter(false); }}>
              Clear filters
            </button>
            <Link className="btn-primary btn-sm" href="/integrations">
              <Plug className="h-3.5 w-3.5" /> Connect channels
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((m) => {
            const platformColor = PLATFORM_COLOR[m.platform];
            const TypeIcon = TYPE_ICON[m.type as Exclude<MessageType, 'All'>];
            const isSelected = m.id === selectedId;

            return (
              <article
                key={m.id}
                onClick={() => handleSelect(m.id)}
                style={{
                  background: isSelected ? `${platformColor}10` : 'var(--panel)',
                  border: `1px solid ${isSelected ? platformColor + '55' : 'var(--border)'}`,
                  borderRadius: 12, padding: '12px 14px',
                  cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
                  transition: 'all 0.15s',
                  borderLeft: `3px solid ${m.status === 'unread' ? platformColor : 'transparent'}`,
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 999, flexShrink: 0,
                  background: m.avatarColor, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.75rem',
                }}>
                  {m.avatarInitials}
                </div>

                {/* Main content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: m.status === 'unread' ? 700 : 500, fontSize: '0.85rem' }}>
                      {m.fromName}
                    </span>
                    <span style={{
                      fontSize: '0.65rem', background: `${platformColor}22`, color: platformColor,
                      padding: '1px 6px', borderRadius: 999, border: `1px solid ${platformColor}44`,
                    }}>
                      {PLATFORM_EMOJI[m.platform]} {m.platform}
                    </span>
                    {TypeIcon && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <TypeIcon className="h-3 w-3" /> {m.type}
                      </span>
                    )}
                    {m.status === 'replied' && (
                      <span style={{ fontSize: '0.62rem', color: '#3dd68c', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Reply className="h-3 w-3" /> Replied
                      </span>
                    )}
                    {m.status === 'unread' && (
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: platformColor, flexShrink: 0 }} />
                    )}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: m.status === 'unread' ? 'var(--text)' : 'var(--muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.preview}
                  </p>

                  {m.postPreview && (
                    <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 3, borderLeft: `2px solid var(--border)`, paddingLeft: 6 }}>
                      {m.postPreview}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <SentimentBadge sentiment={m.sentiment} />
                    {m.replies && m.replies.length > 0 && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MessageCircle className="h-3 w-3" /> {m.replies.length} {m.replies.length === 1 ? 'reply' : 'replies'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock className="h-3 w-3" /> {relativeTime(m.timestamp)}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={(e) => handleStar(m.id, e)}
                      className="btn-ghost btn-sm"
                      type="button"
                      style={{ padding: '3px 6px', color: m.starred ? '#f59e0b' : 'var(--muted)' }}
                    >
                      <Star className="h-3.5 w-3.5" style={{ fill: m.starred ? '#f59e0b' : 'none' }} />
                    </button>
                    <button className="btn-ghost btn-sm" type="button" style={{ padding: '3px 6px' }}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* KPI strip */}
      <section className="panel" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 0, textAlign: 'center' }}>
          {[
            { label: 'Unread', value: messages.filter((m) => m.status === 'unread').length, icon: Inbox },
            { label: 'Replied', value: messages.filter((m) => m.status === 'replied').length, icon: Reply },
            { label: 'Starred', value: messages.filter((m) => m.starred).length, icon: Star },
            { label: 'Total', value: messages.length, icon: User },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              flex: 1, padding: '10px 14px',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--company-primary, var(--accent))' }}>{stat.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <stat.icon className="h-3 w-3" /> {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Conversation panel */}
      {selected && (
        <ConversationPanel
          message={selected}
          onClose={() => setSelectedId(null)}
          onReply={handleReply}
          quickReplies={quickReplies}
          assignment={getAssignment(selected.id) ?? null}
          onAssign={(userId) => {
            assign({
              messageId: selected.id,
              assignedTo: userId === 'me' ? appContext.userId : userId,
              assignedBy: appContext.userId,
              assignedAt: new Date().toISOString(),
              status: 'open',
            });
          }}
        />
      )}
    </div>
  );
}
