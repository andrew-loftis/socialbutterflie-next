"use client";

import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  BarChart3,
  Clock,
  Download,
  Eye,
  MousePointerClick,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonStat } from '@/components/ui/skeleton';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyAnalytics } from '@/lib/hooks/use-company-analytics';
import { useAppState } from '@/components/shell/app-state';

const PERIODS = ['This month', 'Last month', 'Last 3 months', 'Last 6 months'] as const;
type Period = typeof PERIODS[number];

const periodKeys: Record<Period, string> = {
  'This month':    'current-month',
  'Last month':    'last-month',
  'Last 3 months': 'last-3-months',
  'Last 6 months': 'last-6-months',
};

const trendData = [
  { week: 'W1',  impressions: 5200, engagements: 810 },
  { week: 'W2',  impressions: 7100, engagements: 1020 },
  { week: 'W3',  impressions: 6400, engagements: 890 },
  { week: 'W4',  impressions: 9300, engagements: 1540 },
];

function pct(v: number, t: number) {
  if (!t) return '—';
  return `${Math.round((v / t) * 100)}%`;
}

// ─── CSV export ────────────────────────────────────────────────────────────────

function exportCSV(companyName: string, period: string, analytics: {
  impressions: number; engagements: number; clicks: number; postsPublished: number; postsScheduled: number;
  channelBreakdown?: Array<{ name: string; impressions: number; engagements: number; followers: number }>;
} | null) {
  const channelRows = analytics?.channelBreakdown ?? [];
  const rows: string[][] = [
    ['Social Butterflie — Analytics Export'],
    ['Company', companyName],
    ['Period', period],
    ['Exported', new Date().toLocaleString()],
    [],
    ['Metric', 'Value'],
    ['Impressions', String(analytics?.impressions ?? 0)],
    ['Engagements', String(analytics?.engagements ?? 0)],
    ['Engagement Rate', pct(analytics?.engagements ?? 0, analytics?.impressions ?? 0)],
    ['Clicks', String(analytics?.clicks ?? 0)],
    ['CTR', pct(analytics?.clicks ?? 0, analytics?.impressions ?? 0)],
    ['Posts Published', String(analytics?.postsPublished ?? 0)],
    ['Posts Queued', String(analytics?.postsScheduled ?? 0)],
    [],
    ['Weekly Trend (sample)'],
    ['Week', 'Impressions', 'Engagements'],
    ...trendData.map((r) => [r.week, String(r.impressions), String(r.engagements)]),
    [],
    ['Channel Breakdown'],
    ['Channel', 'Impressions', 'Engagements', 'Followers'],
    ...channelRows.map((r) => [r.name, String(r.impressions), String(r.engagements), String(r.followers)]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analytics-${companyName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Schedule report modal ─────────────────────────────────────────────────────

function ScheduleReportModal({ onClose, companyName }: { onClose: () => void; companyName: string }) {
  const [email, setEmail] = useState('');
  const [freq, setFreq] = useState<'weekly' | 'monthly'>('weekly');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setTimeout(onClose, 1800);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div className="panel" style={{ width: 400, padding: 24, borderRadius: 16, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button className="btn-ghost btn-sm" type="button" onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, padding: '4px 6px' }}>
          <X className="h-4 w-4" />
        </button>
        <h3 style={{ marginBottom: 6 }}>Schedule Report</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 18 }}>Receive analytics reports for <strong>{companyName}</strong> via email.</p>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#3dd68c', fontWeight: 600 }}>✅ Report scheduled! Check <strong>{email}</strong>.</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)' }}>Email address</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'inherit' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)' }}>Frequency</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['weekly', 'monthly'] as const).map((f) => (
                  <button key={f} type="button" className={`chip${freq === f ? ' active' : ''}`} onClick={() => setFreq(f)} style={{ flex: 1, justifyContent: 'center' }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </label>
            <div className="button-row" style={{ marginTop: 4 }}>
              <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">Schedule</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { activeCompany } = useActiveCompany();
  const { appContext } = useAppState();
  const [period, setPeriod] = useState<Period>('This month');
  const { analytics, loading } = useCompanyAnalytics(periodKeys[period]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const channelData = analytics?.channelBreakdown ?? [];

  async function syncAnalytics() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/social/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: appContext.workspaceId, companyId: appContext.activeCompanyId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg(`Synced from ${data.platforms} platform(s).`);
      } else {
        setSyncMsg(data.error || 'Sync failed');
      }
    } catch {
      setSyncMsg('Could not reach analytics API.');
    } finally {
      setSyncing(false);
    }
  }

  const handleCSV = useCallback(() => {
    if (!activeCompany) return;
    exportCSV(activeCompany.name, period, analytics ?? null);
  }, [activeCompany, period, analytics]);

  const handlePrint = useCallback(() => { window.print(); }, []);

  if (!activeCompany) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Sparkles className="h-6 w-6" /></div>
        <h3>No company selected</h3>
        <p>Select a company to view its analytics dashboard.</p>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={`${activeCompany.name} Analytics`}
        subtitle="Performance metrics & publishing health."
        actions={
          <>
            <button
              className="btn-primary btn-sm"
              type="button"
              onClick={syncAnalytics}
              disabled={syncing}
            >
              <RefreshCw className={`h-3.5 w-3.5${syncing ? ' animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Platforms'}
            </button>
            <Link className="btn-ghost btn-sm" href="/analytics/best-time">
              <Clock className="h-3.5 w-3.5" /> Best Time
            </Link>
            {PERIODS.map((p) => (
              <button
                key={p}
                className={`chip${period === p ? ' active' : ''}`}
                type="button"
                onClick={() => setPeriod(p)}
              >{p}</button>
            ))}
          </>
        }
      />

      {/* Sync status */}
      {syncMsg && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, fontSize: '0.80rem', fontWeight: 500,
          border: '1px solid rgba(61,214,140,0.3)', background: 'rgba(61,214,140,0.06)', color: '#3dd68c',
        }}>
          {syncMsg}
        </div>
      )}
      {analytics?.syncedAt && (
        <p style={{ fontSize: '0.70rem', color: 'var(--muted)', margin: 0 }}>
          Last synced: {new Date(analytics.syncedAt).toLocaleString()}
        </p>
      )}

      {/* KPI cards */}
      <section className="stats-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
        ) : analytics ? (
          <>
            <StatCard label="Impressions" value={analytics.impressions.toLocaleString()} icon={Eye} delta="+12% vs prev" deltaDir="up" />
            <StatCard label="Engagements" value={analytics.engagements.toLocaleString()} icon={TrendingUp} delta={pct(analytics.engagements, analytics.impressions) + ' rate'} deltaDir="up" />
            <StatCard label="Eng. Rate" value={pct(analytics.engagements, analytics.impressions)} icon={BarChart3} delta="vs 1.5% avg" deltaDir={parseFloat(pct(analytics.engagements, analytics.impressions)) > 1.5 ? 'up' : 'neutral'} />
            <StatCard label="Clicks" value={analytics.clicks.toLocaleString()} icon={MousePointerClick} delta={pct(analytics.clicks, analytics.impressions) + ' CTR'} deltaDir="neutral" />
            <StatCard label="Published" value={analytics.postsPublished} icon={Send} delta={`${analytics.postsScheduled} still queued`} deltaDir="neutral" />
          </>
        ) : (
          <div className="panel" style={{ gridColumn: '1/-1' }}>
            <div className="empty-state">
              <div className="empty-state-icon"><BarChart3 className="h-6 w-6" /></div>
              <h3>No analytics data</h3>
              <p>Publish content and connect social channels to start tracking metrics.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link className="btn-primary btn-sm" href="/build">Create post</Link>
                <Link className="btn-ghost btn-sm" href="/integrations">Connect channels</Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Charts */}
      {(analytics || !loading) && (
        <div className="grid-two">
          {/* Trend line */}
          <article className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Weekly trend</h3>
              <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontStyle: 'italic' }}>sample data</span>
            </div>
            <div style={{ height: 200, position: 'relative', zIndex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="impGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--company-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--company-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(152,176,218,0.08)" />
                  <XAxis dataKey="week" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} labelStyle={{ color: 'var(--text)', fontWeight: 600 }} itemStyle={{ color: 'var(--muted)' }} />
                  <Area type="monotone" dataKey="impressions" name="Impressions" stroke="var(--company-primary)" strokeWidth={2} fill="url(#impGrad2)" dot={false} />
                  <Area type="monotone" dataKey="engagements" name="Engagements" stroke="var(--company-accent, #7c6af7)" strokeWidth={2} fill="none" dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Channel bar */}
          <article className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1, marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>By channel</h3>
              {channelData.length === 0 && <span style={{ fontSize: '0.65rem', color: 'var(--muted)', fontStyle: 'italic' }}>Sync platforms to populate</span>}
            </div>
            <div style={{ height: 200, position: 'relative', zIndex: 1 }}>
              {channelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(152,176,218,0.08)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} labelStyle={{ color: 'var(--text)', fontWeight: 600 }} itemStyle={{ color: 'var(--muted)' }} />
                    <Bar dataKey="impressions" name="Impressions" fill="var(--company-primary)" radius={[4, 4, 0, 0]} opacity={0.85} />
                    <Bar dataKey="engagements" name="Engagements" fill="var(--company-accent, #7c6af7)" radius={[4, 4, 0, 0]} opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: '0.82rem' }}>
                  Connect and sync platforms to see channel breakdown.
                </div>
              )}
            </div>
          </article>
        </div>
      )}

      {/* Export row */}
      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div>
            <h3 style={{ margin: '0 0 4px' }}>Export Report</h3>
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--muted)' }}>Download {period.toLowerCase()} data for {activeCompany.name}.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost btn-sm" type="button" onClick={handleCSV}><Download className="h-3.5 w-3.5" /> CSV</button>
            <button className="btn-ghost btn-sm" type="button" onClick={handlePrint}><Download className="h-3.5 w-3.5" /> Print / PDF</button>
            <button className="btn-primary btn-sm" type="button" onClick={() => setShowSchedule(true)}>Schedule report</button>
          </div>
        </div>
      </section>

      {showSchedule && (
        <ScheduleReportModal onClose={() => setShowSchedule(false)} companyName={activeCompany.name} />
      )}
    </div>
  );
}


