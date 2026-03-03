"use client";

/**
 * Best-Time Engine Page
 * ──────────────────────
 * Audience activity heatmap, smart posting suggestions, and A/B time tests.
 * Route: /analytics/best-time
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Beaker,
  Calendar,
  Clock,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useBestTime } from '@/lib/hooks/use-best-time';
import type { AudienceActivityData } from '@/types/interfaces';

/* ---- Constants ---- */

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', emoji: '\u{1F4F8}' },
  { id: 'facebook', label: 'Facebook', emoji: '\u{1F4D8}' },
  { id: 'tiktok', label: 'TikTok', emoji: '\u{1F3B5}' },
  { id: 'youtube', label: 'YouTube', emoji: '\u{1F534}' },
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ---- Demo seed data (used when no Firestore data yet) ---- */

function generateDemoHeatmap(): number[][] {
  return DAY_LABELS.map((_, dayIdx) =>
    HOURS.map((hour) => {
      // Simulate realistic patterns: higher during work hours, dip on weekends
      const baseActivity = Math.random() * 50;
      const hourBoost = (hour >= 8 && hour <= 11) || (hour >= 18 && hour <= 21) ? 60 : 0;
      const weekendDip = dayIdx >= 5 ? -20 : 0;
      return Math.max(0, Math.round(baseActivity + hourBoost + weekendDip));
    }),
  );
}

/* ---- Heatmap Cell ---- */

function HeatmapCell({
  value,
  maxValue,
  hour,
  day,
}: {
  value: number;
  maxValue: number;
  hour: number;
  day: string;
}) {
  const intensity = maxValue > 0 ? value / maxValue : 0;
  return (
    <div
      title={`${day} ${hour.toString().padStart(2, '0')}:00 - Activity: ${value}`}
      style={{
        width: 28,
        height: 28,
        borderRadius: 4,
        background: intensity > 0.8 ? '#f5a623' :
          intensity > 0.6 ? 'rgba(245, 166, 35, 0.7)' :
          intensity > 0.4 ? 'rgba(245, 166, 35, 0.45)' :
          intensity > 0.2 ? 'rgba(245, 166, 35, 0.2)' :
          intensity > 0 ? 'rgba(245, 166, 35, 0.08)' :
          'rgba(255,255,255,0.02)',
        cursor: 'default',
        transition: 'transform 0.1s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.54rem', color: intensity > 0.6 ? '#000' : 'var(--muted)',
        fontWeight: intensity > 0.6 ? 700 : 400,
      }}
    >
      {value > 0 ? value : ''}
    </div>
  );
}

/* ---- Suggestion Card ---- */

function SuggestionCard({
  platform,
  suggestedAt,
  confidence,
  reason,
}: {
  platform: string;
  suggestedAt: string;
  confidence: number;
  reason: string;
}) {
  const platformInfo = PLATFORMS.find((p) => p.id === platform);
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: 'rgba(245, 166, 35, 0.04)',
      border: '1px solid var(--border)',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'rgba(245,166,35,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', flexShrink: 0,
      }}>
        {platformInfo?.emoji || '\u{1F4F1}'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: '0.84rem' }}>{suggestedAt}</span>
          <span className={`badge ${confidence >= 80 ? '' : 'warning'}`} style={{ fontSize: '0.62rem' }}>
            {confidence}% confidence
          </span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>
          {reason}
        </p>
      </div>
    </div>
  );
}

/* ---- Main Page ---- */

export default function BestTimePage() {
  const { activeCompany } = useActiveCompany();
  const { activity, suggestions, tests, loading, saveActivity } = useBestTime();
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');

  // Find heatmap data for selected platform, or use demo
  const currentActivity = useMemo(() => {
    const found = activity.find((a) => a.platform === selectedPlatform);
    if (found) return found;
    // Demo fallback
    return {
      companyId: activeCompany?.id ?? '',
      platform: selectedPlatform,
      heatmap: generateDemoHeatmap(),
      sampleSize: 0,
      lastSynced: '',
    } satisfies AudienceActivityData;
  }, [activity, selectedPlatform, activeCompany?.id]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const row of currentActivity.heatmap) {
      for (const v of row) if (v > max) max = v;
    }
    return max;
  }, [currentActivity]);

  const platformSuggestions = suggestions.filter((s) => s.platform === selectedPlatform);

  async function handleSyncDemo() {
    if (!activeCompany) return;
    const demo: AudienceActivityData = {
      companyId: activeCompany.id,
      platform: selectedPlatform,
      heatmap: generateDemoHeatmap(),
      sampleSize: Math.floor(Math.random() * 200) + 50,
      lastSynced: new Date().toISOString(),
    };
    await saveActivity(demo);
  }

  if (!activeCompany) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon"><Clock className="h-6 w-6" /></div>
          <h3>No company selected</h3>
          <Link className="btn-primary" href="/select-company">Select company</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Best Time to Post"
        subtitle={`Audience activity heatmap \u00B7 ${platformSuggestions.length} suggestion${platformSuggestions.length !== 1 ? 's' : ''}`}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href="/analytics" className="btn-ghost btn-sm">
              <ArrowLeft className="h-3.5 w-3.5" /> Analytics
            </Link>
            <button type="button" className="btn-primary btn-sm" onClick={handleSyncDemo}>
              <Zap className="h-3.5 w-3.5" /> Sync Activity Data
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} />
        </div>
      ) : (
        <>
          {/* Platform tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip${selectedPlatform === p.id ? ' active' : ''}`}
                onClick={() => setSelectedPlatform(p.id)}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12, alignItems: 'start' }}>
            {/* Heatmap */}
            <section className="panel">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                <Target className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                Activity Heatmap
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 400 }}>
                  {currentActivity.sampleSize > 0
                    ? `${currentActivity.sampleSize} posts sampled`
                    : 'Demo data \u2013 click Sync to populate'}
                </span>
              </h3>
              <div style={{ overflowX: 'auto', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(24, 28px)`, gap: 2 }}>
                  {/* Hour header */}
                  <div />
                  {HOURS.map((h) => (
                    <div key={h} style={{
                      textAlign: 'center', fontSize: '0.58rem', color: 'var(--muted)', paddingBottom: 4,
                    }}>
                      {h.toString().padStart(2, '0')}
                    </div>
                  ))}

                  {/* Rows */}
                  {DAY_LABELS.map((day, dayIdx) => (
                    <>
                      <div key={`label-${day}`} style={{
                        display: 'flex', alignItems: 'center', fontSize: '0.72rem',
                        fontWeight: 600, color: 'var(--muted)', height: 28,
                      }}>
                        {day}
                      </div>
                      {HOURS.map((hour) => (
                        <HeatmapCell
                          key={`${day}-${hour}`}
                          value={currentActivity.heatmap[dayIdx]?.[hour] ?? 0}
                          maxValue={maxValue}
                          hour={hour}
                          day={day}
                        />
                      ))}
                    </>
                  ))}
                </div>

                {/* Legend */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
                  fontSize: '0.66rem', color: 'var(--muted)',
                }}>
                  <span>Low</span>
                  {[0.08, 0.2, 0.45, 0.7, 1].map((intensity, i) => (
                    <div
                      key={i}
                      style={{
                        width: 16, height: 16, borderRadius: 3,
                        background: `rgba(245, 166, 35, ${intensity})`,
                      }}
                    />
                  ))}
                  <span>High</span>
                </div>
              </div>
            </section>

            {/* Right sidebar: Best times + tests */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Suggestions */}
              <section className="panel">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                  <Sparkles className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  Best Times
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 1 }}>
                  {platformSuggestions.length > 0 ? (
                    platformSuggestions.slice(0, 5).map((s, i) => (
                      <SuggestionCard key={i} {...s} />
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: '0.78rem' }}>
                      <Clock className="h-5 w-5" style={{ margin: '0 auto 8px' }} />
                      Click &ldquo;Sync Activity Data&rdquo; to generate suggestions
                    </div>
                  )}
                </div>
              </section>

              {/* A/B Tests summary */}
              <section className="panel">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                  <Beaker className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                  A/B Time Tests
                  <span className="badge" style={{ marginLeft: 'auto' }}>{tests.length}</span>
                </h3>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {tests.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {tests.slice(0, 5).map((t) => (
                        <div key={t.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 10px', borderRadius: 8,
                          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                        }}>
                          <div style={{ fontSize: '0.74rem' }}>
                            <span style={{ fontWeight: 600 }}>{t.scheduledAtA.split('T')[0]}</span>
                            <span style={{ color: 'var(--muted)', margin: '0 6px' }}>vs</span>
                            <span style={{ fontWeight: 600 }}>{t.scheduledAtB.split('T')[0]}</span>
                          </div>
                          <span className={`badge ${t.status === 'complete' ? '' : 'warning'}`}>
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.74rem', color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
                      No A/B tests yet. Schedule a test from the Publish page.
                    </p>
                  )}
                </div>
              </section>

              {/* Quick stats */}
              <section className="panel" style={{ padding: '14px' }}>
                <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, position: 'relative', zIndex: 1 }}>
                  <div className="stat">
                    <span className="kicker">Platforms</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{activity.length}</span>
                  </div>
                  <div className="stat">
                    <span className="kicker">Total Samples</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                      {activity.reduce((sum, a) => sum + a.sampleSize, 0)}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="kicker">Suggestions</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{suggestions.length}</span>
                  </div>
                  <div className="stat">
                    <span className="kicker">A/B Tests</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{tests.length}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
