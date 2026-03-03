"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Bell, Building2, Copy, Globe, Palette, Plug, Shield, User } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { NotificationSettings } from '@/components/ui/notification-settings';
import { useActiveCompany } from '@/lib/hooks/use-active-company';

// ─── Toggle switch ───────────────────────────────────────────
function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{label}</div>
        {description && <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 999, padding: 2,
          background: checked ? 'var(--company-primary, var(--accent))' : 'var(--border)',
          border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
          display: 'flex', alignItems: 'center',
        }}
      >
        <span style={{
          width: 20, height: 20, borderRadius: 999, background: '#fff',
          display: 'block', transition: 'transform 0.2s',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
        }} />
      </button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────
export default function SettingsPage() {
  const { activeCompany } = useActiveCompany();

  // Publishing defaults
  const [timezone, setTimezone] = useState('America/New_York');
  const [requireApproval, setRequireApproval] = useState(true);
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [defaultCaption, setDefaultCaption] = useState('');

  // UI state
  const [inviteCopied, setInviteCopied] = useState(false);
  const [savedPublish, setSavedPublish] = useState(false);

  const TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
  ];

  function copyInviteLink() {
    const link = `${window.location.origin}/invite/${activeCompany?.id ?? 'demo'}?ref=settings`;
    navigator.clipboard.writeText(link).catch(() => undefined);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2200);
  }

  function saveNotifications() {
    setSavedNotif(true);
    setTimeout(() => setSavedNotif(false), 2200);
  }

  function savePublishing() {
    setSavedPublish(true);
    setTimeout(() => setSavedPublish(false), 2200);
  }

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Workspace preferences and company configuration." />

      {/* Workspace */}
      <section className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Workspace
        </h3>
        <p style={{ color: 'var(--fg-muted)', marginBottom: 12 }}>All app surfaces — posts, analytics, assets, and calendar — are scoped to the active company.</p>
        {activeCompany ? (
          <div className="panel" style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--fg-muted)' }}>Active company</p>
            <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{activeCompany.name}</p>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '12px 0' }}><p>No company selected. Pick one to scope the workspace.</p></div>
        )}
        <div className="button-row">
          <Link className="btn-ghost" href="/select-company">Switch company</Link>
          {activeCompany && <Link className="btn-primary" href={`/companies/${activeCompany.id}`}>Manage company</Link>}
        </div>
      </section>

      {/* Notifications */}
      <section className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Notifications
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 12 }}>Control how and when you get alerted about approvals, comments, and reports. Toggle channels per event type.</p>

        <NotificationSettings />
      </section>

      {/* Publishing defaults */}
      <section className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Publishing defaults
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 14 }}>Default settings applied to new posts in the Publish composer.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)' }}>Timezone</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem', color: 'var(--text)', fontFamily: 'inherit' }}
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)' }}>Default caption footer</span>
            <textarea
              value={defaultCaption}
              onChange={(e) => setDefaultCaption(e.target.value)}
              rows={2}
              placeholder="e.g. #brand #socialmedia — appended to every new draft"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem', color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </label>

          <Toggle checked={requireApproval} onChange={setRequireApproval} label="Require approval before publishing" description="Posts must pass through the Review Queue before going live." />
          <Toggle checked={autoSchedule} onChange={setAutoSchedule} label="Auto-schedule to best time" description="Let the AI pick optimal post times based on your audience activity." />
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary btn-sm" type="button" onClick={savePublishing}>
            {savedPublish ? '✓ Saved' : 'Save publishing settings'}
          </button>
        </div>
      </section>

      {/* Appearance */}
      <section className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Appearance
        </h3>
        {activeCompany ? (
          <p style={{ color: 'var(--fg-muted)' }}>Theme tint is derived from <strong>{activeCompany.name}</strong> branding colors. To change the tint, update the company&apos;s brand color in the company profile.</p>
        ) : (
          <p style={{ color: 'var(--fg-muted)' }}>Select a company to apply company-based theme tinting across the workspace.</p>
        )}
        {activeCompany && (
          <div className="button-row" style={{ marginTop: 12 }}>
            <Link className="btn-ghost" href={`/companies/${activeCompany.id}`}>Edit brand colors</Link>
          </div>
        )}
      </section>

      {/* Team */}
      <section className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plug className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Team &amp; access
        </h3>
        <p style={{ color: 'var(--fg-muted)', marginBottom: 14 }}>Invite teammates to collaborate. They receive access to the active company&apos;s inbox, calendar, and review queue.</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ flex: 1, minWidth: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {typeof window !== 'undefined' ? `${window.location.origin}/invite/${activeCompany?.id ?? '...'}` : '/invite/...'}
          </code>
          <button className="btn-ghost btn-sm" type="button" onClick={copyInviteLink} style={{ flexShrink: 0 }}>
            <Copy className="h-3.5 w-3.5" /> {inviteCopied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
        <div className="button-row" style={{ marginTop: 12 }}>
          <Link className="btn-primary" href="/integrations">Manage integrations</Link>
        </div>
      </section>

      {/* Account */}
      <section className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          Account
        </h3>
        <p style={{ color: 'var(--fg-muted)', marginBottom: 14 }}>Manage your profile, display name, and sign-out options.</p>
        <div className="button-row">
          <Link className="btn-ghost" href="/profile">View profile</Link>
        </div>
      </section>

      {/* Danger zone */}
      {activeCompany && (
        <section className="panel" style={{ borderColor: '#f8717144', background: '#f871710a' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f87171' }}>
            <Shield className="h-4 w-4" />
            Danger zone
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 14 }}>
            Irreversible actions for <strong>{activeCompany.name}</strong>. Proceed with caution.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Archive company', desc: 'Hide this company from the workspace. Data is preserved.' },
              { label: 'Delete all posts', desc: 'Permanently removes all drafts, scheduled, and published post records.' },
              { label: 'Disconnect all channels', desc: 'Revoke all social platform tokens for this company.' },
            ].map((action) => (
              <div key={action.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.84rem' }}>{action.label}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--muted)' }}>{action.desc}</div>
                </div>
                <button
                  className="btn-ghost btn-sm"
                  type="button"
                  onClick={() => window.confirm(`Are you sure you want to: ${action.label}?`)}
                  style={{ flexShrink: 0, borderColor: '#f8717144', color: '#f87171' }}
                >
                  {action.label}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

