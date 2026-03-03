"use client";

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Link2, RefreshCw, Search, Unplug, XCircle, Zap } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useAppState } from '@/components/shell/app-state';
import {
  beginSocialConnect,
  disconnectSocialConnection,
  type SocialProvider,
} from '@/lib/social-gateway';
import { useSocialConnections } from '@/lib/hooks/use-social-connections';
import { deleteConnection } from '@/lib/firebase/connection-store';

type Category = 'All' | 'Social' | 'Analytics' | 'Notifications' | 'Storage' | 'AI';
const CATEGORIES: Category[] = ['All', 'Social', 'Analytics', 'Notifications', 'Storage', 'AI'];

type IntegrationCard = {
  id: string;
  name: string;
  description: string;
  category: Exclude<Category, 'All'>;
  color: string;
  icon: string;
  capabilities: string[];
  provider?: SocialProvider;
  status?: 'available' | 'planned' | 'beta';
};

const INTEGRATIONS: IntegrationCard[] = [
  // ── Social ──────────────────────────────────────────────────────────────
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Publish posts, Reels, and Stories to Instagram Business accounts via Meta OAuth.',
    category: 'Social',
    color: '#e1306c',
    icon: '📸',
    capabilities: ['Image posts', 'Reels', 'Stories', 'Scheduled publishing', 'Analytics'],
    provider: 'instagram',
    status: 'available',
  },
  {
    id: 'facebook',
    name: 'Facebook Pages',
    description: 'Schedule and publish content to Facebook Pages, including link posts, images, and videos.',
    category: 'Social',
    color: '#1877f2',
    icon: '📘',
    capabilities: ['Page posts', 'Scheduled posts', 'Link sharing', 'Video', 'Insights'],
    provider: 'facebook',
    status: 'available',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    description: 'Post tweets, threads, and media to X (formerly Twitter) via the Official API v2.',
    category: 'Social',
    color: '#1da1f2',
    icon: '🐦',
    capabilities: ['Tweets', 'Threads', 'Media posts', 'Poll posts', 'Scheduling'],
    provider: 'twitter' as SocialProvider,
    status: 'available',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Publish to LinkedIn Company Pages and Personal Profiles. Ideal for B2B content.',
    category: 'Social',
    color: '#0a66c2',
    icon: '💼',
    capabilities: ['Company page posts', 'Article sharing', 'Image & video', 'Employee posts'],
    provider: 'linkedin' as SocialProvider,
    status: 'available',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Publish videos to TikTok Business accounts. Requires TikTok app approval for direct posting.',
    category: 'Social',
    color: '#010101',
    icon: '🎵',
    capabilities: ['Video upload', 'Caption & hashtags', 'Sound library', 'Direct publish (approved)'],
    provider: 'tiktok',
    status: 'available',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Upload videos and Shorts to YouTube channels. Full metadata control including thumbnails.',
    category: 'Social',
    color: '#ff0000',
    icon: '▶️',
    capabilities: ['Video upload', 'Shorts', 'Thumbnail', 'Scheduled publishing', 'Analytics'],
    provider: 'youtube',
    status: 'available',
  },
  {
    id: 'threads',
    name: 'Threads',
    description: 'Post to Threads by Instagram via the official Threads API. Text, links, and media.',
    category: 'Social',
    color: '#101010',
    icon: '🧵',
    capabilities: ['Text posts', 'Image & video', 'Reply threads', 'Link posts'],
    provider: 'threads' as SocialProvider,
    status: 'beta',
  },
  {
    id: 'bluesky',
    name: 'Bluesky',
    description: 'Publish to Bluesky using the AT Protocol. Open social network with growing audience.',
    category: 'Social',
    color: '#0085ff',
    icon: '🦋',
    capabilities: ['Posts', 'Rich link cards', 'Image attachments', 'Thread replies'],
    provider: 'bluesky' as SocialProvider,
    status: 'beta',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    description: 'Schedule Pins to Pinterest boards. Great for ecommerce and visual brands.',
    category: 'Social',
    color: '#e60023',
    icon: '📌',
    capabilities: ['Pin creation', 'Board targeting', 'Product pins', 'Rich metadata'],
    status: 'planned',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    description: 'Post to subreddits and manage brand presence on Reddit communities.',
    category: 'Social',
    color: '#ff4500',
    icon: '🔴',
    capabilities: ['Subreddit posts', 'Link & text posts', 'Community engagement'],
    status: 'planned',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    description: 'Manage Snapchat Stories and promoted content for Snapchat Business.',
    category: 'Social',
    color: '#fffc00',
    icon: '👻',
    capabilities: ['Stories', 'Promoted posts', 'Audience insights'],
    status: 'planned',
  },
  // ── Analytics ───────────────────────────────────────────────────────────
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Connect GA4 to enrich your analytics dashboard with web traffic and conversion data.',
    category: 'Analytics',
    color: '#f9ab00',
    icon: '📊',
    capabilities: ['Traffic data', 'Conversion tracking', 'UTM attribution', 'Audience overlap'],
    status: 'planned',
  },
  {
    id: 'metaads',
    name: 'Meta Ads',
    description: 'Pull Meta Ads performance metrics into your analytics dashboard for unified reporting.',
    category: 'Analytics',
    color: '#1877f2',
    icon: '💰',
    capabilities: ['Ad spend', 'ROI tracking', 'Audience reach', 'Campaign metrics'],
    status: 'planned',
  },
  // ── Notifications ───────────────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get Slack notifications for approvals, published posts, and team mentions.',
    category: 'Notifications',
    color: '#4a154b',
    icon: '💬',
    capabilities: ['Post approval alerts', 'Publish notifications', 'Mention alerts', 'Daily digest'],
    status: 'planned',
  },
  {
    id: 'email',
    name: 'Email Digests',
    description: 'Receive email summaries for publishing reports, review queue, and performance highlights.',
    category: 'Notifications',
    color: '#5ba0ff',
    icon: '📧',
    capabilities: ['Daily digest', 'Weekly report', 'Queue reminders', 'Performance alerts'],
    status: 'planned',
  },
  // ── Storage ─────────────────────────────────────────────────────────────
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Link your Dropbox account to import assets directly into the media library.',
    category: 'Storage',
    color: '#0061ff',
    icon: '📦',
    capabilities: ['Asset import', 'Folder sync', 'Shared drives'],
    status: 'planned',
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Import images and videos from Google Drive into your asset library.',
    category: 'Storage',
    color: '#34a853',
    icon: '💚',
    capabilities: ['Asset import', 'Shared drives', 'Team folders'],
    status: 'planned',
  },
];

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: 'Available', color: '#3dd68c', bg: 'rgba(61,214,140,0.10)' },
  beta:      { label: 'Beta',      color: '#f5a623', bg: 'rgba(245,166,35,0.10)' },
  planned:   { label: 'Planned',   color: '#7a8fb0', bg: 'rgba(122,143,176,0.10)' },
};

export function CompanyIntegrations({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { user } = useAuth();
  const { appContext } = useAppState();
  const { connections: liveConnections, connectedProviders, loading } = useSocialConnections();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'info' | 'success' | 'error'>('info');
  const [syncing, setSyncing] = useState(false);

  // Pick up OAuth success/error from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    if (success) { setStatus(success); setStatusKind('success'); }
    if (error) { setStatus(error); setStatusKind('error'); }
    if (success || error) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const filtered = INTEGRATIONS.filter((integration) => {
    const matchCategory = category === 'All' || integration.category === category;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      integration.name.toLowerCase().includes(q) ||
      integration.description.toLowerCase().includes(q) ||
      integration.capabilities.some((cap) => cap.toLowerCase().includes(q));
    return matchCategory && matchSearch;
  });

  const connectedCount = INTEGRATIONS.filter(
    (i) => i.provider && connectedProviders.has(i.provider as SocialProvider)
  ).length;

  async function onDisconnect(integration: IntegrationCard) {
    if (!integration.provider) return;
    try {
      const match = liveConnections.find((c) => c.provider === integration.provider);
      if (match) {
        await deleteConnection(appContext.workspaceId, companyId, match.id);
      } else {
        // Fallback: call the API disconnect route
        await disconnectSocialConnection(user, appContext.workspaceId, { provider: integration.provider, companyId });
      }
      setStatus(`${integration.name} disconnected.`);
      setStatusKind('info');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Disconnect failed.');
      setStatusKind('error');
    }
  }

  async function onSyncAnalytics() {
    setSyncing(true);
    try {
      const res = await fetch('/api/social/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: appContext.workspaceId, companyId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(`Synced analytics from ${data.platforms} platform(s). Impressions: ${data.totalImpressions?.toLocaleString()}, Engagements: ${data.totalEngagements?.toLocaleString()}`);
        setStatusKind('success');
      } else {
        setStatus(data.error || 'Analytics sync failed');
        setStatusKind('error');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Analytics sync failed.');
      setStatusKind('error');
    } finally {
      setSyncing(false);
    }
  }

  function onConnect(integration: IntegrationCard) {
    if (integration.status === 'planned') {
      setStatus(`${integration.name} is coming soon — stay tuned!`);
      return;
    }
    if (!integration.provider) {
      setStatus(`${integration.name} connector is in beta — check back soon.`);
      return;
    }
    try {
      beginSocialConnect(user, appContext.workspaceId, integration.provider, companyId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Connect failed.');
    }
  }

  return (
    <>
      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.80rem', color: 'var(--muted)' }}>
          <Zap className="h-3.5 w-3.5" style={{ color: 'var(--company-accent)' }} />
          <strong style={{ color: 'var(--text)' }}>{connectedCount}</strong> connected for <strong style={{ color: 'var(--text)' }}>{companyName}</strong>
        </div>
        {connectedCount > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {INTEGRATIONS.filter((i) => i.provider && connectedProviders.has(i.provider as SocialProvider)).map((i) => (
              <span key={i.id} style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {i.icon} <span style={{ color: 'var(--company-accent)', fontWeight: 600 }}>{i.name}</span>
              </span>
            ))}
            <button className="btn-ghost btn-sm" type="button" onClick={onSyncAnalytics} disabled={syncing} style={{ marginLeft: 8 }}>
              <RefreshCw className={`h-3 w-3${syncing ? ' animate-spin' : ''}`} /> {syncing ? 'Syncing...' : 'Sync Analytics'}
            </button>
          </div>
        )}
      </div>

      {/* Filter row */}
      <div className="panel" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((entry) => (
              <button key={entry} className={`chip${category === entry ? ' active' : ''}`} type="button" onClick={() => setCategory(entry)}>
                {entry}
              </button>
            ))}
          </div>
          <div className="search-wrap" style={{ width: 240 }}>
            <Search className="h-3.5 w-3.5" style={{ position: 'absolute', left: 10, color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              className="search-input"
              placeholder="Search integrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>
      </div>

      {status && (
        <div style={{
          padding: '9px 12px', borderRadius: 8, fontSize: '0.80rem', fontWeight: 500,
          border: `1px solid ${statusKind === 'success' ? 'rgba(61,214,140,0.3)' : statusKind === 'error' ? 'rgba(255,92,92,0.3)' : 'var(--border)'}`,
          background: statusKind === 'success' ? 'rgba(61,214,140,0.06)' : statusKind === 'error' ? 'rgba(255,92,92,0.06)' : 'rgba(255,255,255,0.03)',
          color: statusKind === 'success' ? '#3dd68c' : statusKind === 'error' ? '#ff5c5c' : 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {statusKind === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : statusKind === 'error' ? <AlertCircle className="h-3.5 w-3.5" /> : null}
          {status}
          <button type="button" onClick={() => setStatus(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.72rem', textDecoration: 'underline' }}>
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="panel"><p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Loading connections…</p></div>
      ) : filtered.length ? (
        <section className="integrations-grid">
          {filtered.map((integration) => {
            const connected = integration.provider ? connectedProviders.has(integration.provider as SocialProvider) : false;
            const badgeMeta = STATUS_BADGE[integration.status ?? 'available'];
            return (
              <article key={integration.id} className={`integration-card${connected ? ' connected' : ''}`}>
                {/* Header */}
                <div className="integration-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      className="integration-icon"
                      style={{
                        background: `${integration.color}18`,
                        border: `1px solid ${integration.color}44`,
                        fontSize: '1.4rem',
                      }}
                    >
                      {integration.icon}
                    </div>
                    <div>
                      <div className="integration-name">{integration.name}</div>
                      <div className="integration-category">{integration.category}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexDirection: 'column', alignSelf: 'flex-start' }}>
                    {connected
                      ? <CheckCircle2 className="h-4 w-4" style={{ color: '#3dd68c' }} />
                      : <XCircle className="h-4 w-4" style={{ color: 'var(--muted)', opacity: 0.4 }} />
                    }
                  </div>
                </div>

                <p className="integration-desc">{integration.description}</p>

                {/* Capabilities */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {integration.capabilities.map((cap) => (
                    <span key={cap} className="chip" style={{ fontSize: '0.64rem', minHeight: 24, padding: '0 7px' }}>{cap}</span>
                  ))}
                </div>

                {/* Footer */}
                <div className="integration-footer">
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                    color: badgeMeta.color, background: badgeMeta.bg,
                    border: `1px solid ${badgeMeta.color}44`,
                  }}>
                    {badgeMeta.label}
                  </span>
                  <div>
                    {connected ? (
                      <button className="btn-ghost btn-sm" type="button" onClick={() => onDisconnect(integration)}>
                        <Unplug className="h-3.5 w-3.5" /> Disconnect
                      </button>
                    ) : integration.status === 'planned' ? (
                      <button className="btn-ghost btn-sm" type="button" onClick={() => onConnect(integration)} style={{ opacity: 0.6 }}>
                        Coming soon
                      </button>
                    ) : (
                      <button className="btn-primary btn-sm" type="button" onClick={() => onConnect(integration)}>
                        <Link2 className="h-3.5 w-3.5" /> Connect
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon"><Zap className="h-6 w-6" /></div>
          <h3>No integrations found</h3>
          <p>Try a different search term or category.</p>
          <button className="btn-ghost btn-sm" type="button" onClick={() => { setSearch(''); setCategory('All'); }}>
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
