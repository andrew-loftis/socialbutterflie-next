"use client";

/**
 * notification-settings.tsx
 * ─────────────────────────
 * Per-event × per-channel notification preference matrix.
 * Persists to Firestore via notification-store.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Monitor,
  Moon,
  Smartphone,
  Sun,
} from 'lucide-react';

import { useAppState } from '@/components/shell/app-state';
import {
  EVENT_LABELS,
  DEFAULT_NOTIFICATION_EVENTS,
  buildDefaultPreference,
  getNotificationPreferences,
  setNotificationPreference,
  getQuietHours,
  setQuietHours,
} from '@/lib/firebase/notification-store';
import type { NotificationChannel, NotificationEventType, NotificationPreference, QuietHours } from '@/types/interfaces';

/* ── Channel metadata ── */

const CHANNELS: { key: NotificationChannel; label: string; icon: typeof Bell }[] = [
  { key: 'in_app', label: 'In-App', icon: Bell },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'push', label: 'Push', icon: Smartphone },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
];

/* ── Toggle Switch ── */

function Toggle({ checked, onChange, size = 'normal' }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: 'small' | 'normal';
}) {
  const w = size === 'small' ? 32 : 40;
  const h = size === 'small' ? 18 : 22;
  const knob = size === 'small' ? 14 : 18;
  const travel = w - knob - 4;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: w, height: h, borderRadius: 999, padding: 2,
        background: checked ? 'var(--company-primary, var(--accent))' : 'var(--border)',
        border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
        display: 'flex', alignItems: 'center',
      }}
    >
      <span style={{
        width: knob, height: knob, borderRadius: 999, background: '#fff',
        display: 'block', transition: 'transform 0.2s',
        transform: checked ? `translateX(${travel}px)` : 'translateX(0)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

/* ── Main Component ── */

export function NotificationSettings() {
  const { appContext } = useAppState();
  const [prefs, setPrefs] = useState<Map<NotificationEventType, NotificationPreference>>(new Map());
  const [quietHours, setQH] = useState<QuietHours | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const savedPrefs = await getNotificationPreferences(appContext.workspaceId, appContext.userId);
      if (cancelled) return;

      const map = new Map<NotificationEventType, NotificationPreference>();
      for (const p of savedPrefs) {
        map.set(p.event, p);
      }
      // Fill in defaults for missing events
      for (const event of DEFAULT_NOTIFICATION_EVENTS) {
        if (!map.has(event)) {
          map.set(event, buildDefaultPreference(appContext.userId, event));
        }
      }
      setPrefs(map);

      const qh = await getQuietHours(appContext.workspaceId, appContext.userId);
      if (!cancelled) setQH(qh);
    }
    load();
    return () => { cancelled = true; };
  }, [appContext.workspaceId, appContext.userId]);

  // Toggle a specific channel for an event
  const toggleChannel = useCallback((event: NotificationEventType, channel: NotificationChannel) => {
    setPrefs((prev) => {
      const next = new Map(prev);
      const pref = next.get(event);
      if (!pref) return prev;

      const channels = pref.channels.includes(channel)
        ? pref.channels.filter((c) => c !== channel)
        : [...pref.channels, channel];

      next.set(event, { ...pref, channels, enabled: channels.length > 0 });
      return next;
    });
  }, []);

  // Toggle entire event on/off
  const toggleEvent = useCallback((event: NotificationEventType) => {
    setPrefs((prev) => {
      const next = new Map(prev);
      const pref = next.get(event);
      if (!pref) return prev;

      if (pref.enabled) {
        // Turn off all channels
        next.set(event, { ...pref, channels: [], enabled: false });
      } else {
        // Restore defaults
        const def = buildDefaultPreference(appContext.userId, event);
        next.set(event, { ...def, enabled: true });
      }
      return next;
    });
  }, [appContext.userId]);

  // Save all preferences
  async function saveAll() {
    setSaving(true);
    try {
      const promises = [...prefs.entries()].map(([, pref]) =>
        setNotificationPreference(appContext.workspaceId, appContext.userId, pref)
      );
      if (quietHours) {
        promises.push(setQuietHours(appContext.workspaceId, appContext.userId, quietHours));
      }
      await Promise.all(promises);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Matrix table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{
                textAlign: 'left', padding: '8px 12px',
                fontSize: '0.74rem', fontWeight: 600, color: 'var(--muted)',
                borderBottom: '1px solid var(--border)',
              }}>
                Event
              </th>
              {CHANNELS.map((ch) => {
                const Icon = ch.icon;
                return (
                  <th key={ch.key} style={{
                    textAlign: 'center', padding: '8px 8px',
                    fontSize: '0.70rem', fontWeight: 600, color: 'var(--muted)',
                    borderBottom: '1px solid var(--border)',
                    minWidth: 64,
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <Icon className="h-3.5 w-3.5" />
                      <span>{ch.label}</span>
                    </div>
                  </th>
                );
              })}
              <th style={{
                textAlign: 'center', padding: '8px 8px',
                fontSize: '0.70rem', fontWeight: 600, color: 'var(--muted)',
                borderBottom: '1px solid var(--border)',
                minWidth: 48,
              }}>
                On/Off
              </th>
            </tr>
          </thead>
          <tbody>
            {DEFAULT_NOTIFICATION_EVENTS.map((event) => {
              const pref = prefs.get(event);
              if (!pref) return null;

              return (
                <tr key={event} style={{
                  opacity: pref.enabled ? 1 : 0.45,
                  transition: 'opacity 0.2s',
                }}>
                  <td style={{
                    padding: '10px 12px', fontSize: '0.82rem', fontWeight: 500,
                    borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    {EVENT_LABELS[event]}
                  </td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.key} style={{
                      textAlign: 'center', padding: '8px',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <Toggle
                        size="small"
                        checked={pref.channels.includes(ch.key)}
                        onChange={() => toggleChannel(event, ch.key)}
                      />
                    </td>
                  ))}
                  <td style={{
                    textAlign: 'center', padding: '8px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    <button
                      type="button"
                      onClick={() => toggleEvent(event)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: pref.enabled ? '#3dd68c' : '#ff5c5c',
                        padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto',
                      }}
                    >
                      {pref.enabled
                        ? <Bell className="h-3.5 w-3.5" />
                        : <BellOff className="h-3.5 w-3.5" />
                      }
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quiet Hours */}
      <div style={{
        padding: '14px', borderRadius: 10,
        background: 'rgba(91,160,255,0.04)',
        border: '1px solid rgba(91,160,255,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Moon className="h-4 w-4" style={{ color: '#5ba0ff' }} />
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Quiet Hours</span>
          <Toggle
            checked={quietHours?.enabled ?? false}
            onChange={(enabled) => setQH((prev) => (prev ? { ...prev, enabled } : { userId: appContext.userId, enabled, startTime: '22:00', endTime: '08:00', timezone: 'America/New_York' }))}
          />
        </div>
        {quietHours?.enabled && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Moon className="h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>From</span>
              <input
                type="time"
                value={quietHours.startTime}
                onChange={(e) => setQH((prev) => prev ? { ...prev, startTime: e.target.value } : prev)}
                style={{
                  padding: '4px 8px', borderRadius: 6,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sun className="h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Until</span>
              <input
                type="time"
                value={quietHours.endTime}
                onChange={(e) => setQH((prev) => prev ? { ...prev, endTime: e.target.value } : prev)}
                style={{
                  padding: '4px 8px', borderRadius: 6,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                }}
              />
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
              Notifications are silenced during this window.
            </span>
          </div>
        )}
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={saveAll}
          disabled={saving}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save notification preferences'}
        </button>
      </div>
    </div>
  );
}
