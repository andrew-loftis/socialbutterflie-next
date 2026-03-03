"use client";

/**
 * Automations Page
 * -----------------
 * Comment-trigger DM automations builder. Create rules like:
 *   "When someone comments 'LINK' on a post -> auto-DM them a URL"
 *
 * Wired to Firestore via useAutomations hook.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Copy,
  Edit3,
  MessageCircle,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Send,
  Trash2,
  Zap,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useAutomations } from '@/lib/hooks/use-automations';
import { useAppState } from '@/components/shell/app-state';
import type { CommentAutomation } from '@/types/interfaces';

/* ---- Labels & Constants ---- */

const TRIGGER_LABELS: Record<string, string> = {
  comment_keyword: 'Comment contains keyword',
  comment_any: 'Any comment on post',
  story_mention: 'Story mention',
  dm_keyword: 'DM contains keyword',
};

const ACTION_LABELS: Record<string, string> = {
  send_dm: 'Send DM',
  reply_comment: 'Reply to comment',
  add_label: 'Add label',
  notify_team: 'Notify team',
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '\u{1F4F8}',
  facebook: '\u{1F4D8}',
  tiktok: '\u{1F3B5}',
  youtube: '\u25B6\uFE0F',
  twitter: '\u{1D54F}',
};

/* ---- Rule Builder Modal ---- */

function RuleBuilder({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (rule: Partial<CommentAutomation>) => void;
}) {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<CommentAutomation['trigger']['type']>('comment_keyword');
  const [keywords, setKeywords] = useState('');
  const [platforms, setPlatforms] = useState<string[]>(['instagram']);
  const [actionType, setActionType] = useState<CommentAutomation['action']['type']>('send_dm');
  const [message, setMessage] = useState('');
  const [delay, setDelay] = useState(0);

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function handleSave() {
    if (!name.trim() || !message.trim()) return;
    onSave({
      name: name.trim(),
      trigger: {
        type: triggerType,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        platforms,
      },
      action: { type: actionType, message: message.trim(), delay: delay > 0 ? delay : undefined },
      status: 'draft',
    });
    onClose();
  }

  return (
    <div className="panel" style={{ border: '1px solid var(--accent)', borderRadius: 14 }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
        <Zap className="h-4 w-4" style={{ color: 'var(--accent)' }} />
        New Automation Rule
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
            Rule Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Link in Bio Auto-DM"
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Trigger section */}
        <div style={{
          padding: '14px', borderRadius: 10,
          background: 'rgba(245,166,35,0.04)',
          border: '1px solid rgba(245,166,35,0.15)',
        }}>
          <div style={{ fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f5a623', marginBottom: 10 }}>
            When this happens...
          </div>

          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as CommentAutomation['trigger']['type'])}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit', marginBottom: 10,
            }}
          >
            {Object.entries(TRIGGER_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {(triggerType === 'comment_keyword' || triggerType === 'dm_keyword') && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginBottom: 4 }}>
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="LINK, INFO, FREE"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                }}
              />
            </div>
          )}

          {/* Platform badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(PLATFORM_EMOJI).map(([key, emoji]) => (
              <button
                key={key}
                type="button"
                onClick={() => togglePlatform(key)}
                style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: '0.76rem',
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  border: platforms.includes(key) ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: platforms.includes(key) ? 'rgba(245,166,35,0.12)' : 'transparent',
                  color: platforms.includes(key) ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {emoji} {key}
              </button>
            ))}
          </div>
        </div>

        {/* Action section */}
        <div style={{
          padding: '14px', borderRadius: 10,
          background: 'rgba(91,160,255,0.04)',
          border: '1px solid rgba(91,160,255,0.15)',
        }}>
          <div style={{ fontSize: '0.70rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5ba0ff', marginBottom: 10 }}>
            Then do this...
          </div>

          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as CommentAutomation['action']['type'])}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit', marginBottom: 10,
            }}
          >
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder={"Hey {{name}}! Here's the link you asked for: {{url}}"}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
              resize: 'vertical', marginBottom: 8,
            }}
          />

          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 10 }}>
            Variables: <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>{'{{name}}'}</code>{' '}
            <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>{'{{url}}'}</code>{' '}
            <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4 }}>{'{{comment}}'}</code>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>Delay (seconds):</label>
            <input
              type="number"
              min={0}
              max={3600}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value) || 0)}
              style={{
                width: 80, padding: '6px 8px', borderRadius: 6,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                textAlign: 'center',
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={!name.trim() || !message.trim()}
          >
            <Zap className="h-3.5 w-3.5" /> Create Rule
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Rule Card ---- */

function RuleCard({
  rule,
  onToggle,
  onDelete,
  onDuplicate,
}: {
  rule: CommentAutomation;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = rule.status === 'active';

  return (
    <div
      className="panel"
      style={{
        borderLeft: `3px solid ${isActive ? '#3dd68c' : rule.status === 'paused' ? '#f5a623' : 'var(--border)'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{rule.name}</span>
            <span
              style={{
                padding: '1px 8px', borderRadius: 999, fontSize: '0.66rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: isActive ? '#3dd68c' : rule.status === 'paused' ? '#f5a623' : 'var(--muted)',
                background: isActive ? 'rgba(61,214,140,0.10)' : rule.status === 'paused' ? 'rgba(245,166,35,0.10)' : 'rgba(122,143,176,0.10)',
                border: `1px solid ${isActive ? 'rgba(61,214,140,0.3)' : rule.status === 'paused' ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,
              }}
            >
              {rule.status}
            </span>
          </div>

          {/* Trigger -> Action flow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 10 }}>
            <MessageCircle className="h-3.5 w-3.5" style={{ color: '#f5a623' }} />
            <span>
              {TRIGGER_LABELS[rule.trigger.type]}
              {rule.trigger.keywords.length > 0 && (
                <span> &middot; <strong style={{ color: 'var(--text)' }}>{rule.trigger.keywords.join(', ')}</strong></span>
              )}
            </span>
            <ArrowRight className="h-3 w-3" style={{ color: 'var(--border)' }} />
            <Send className="h-3.5 w-3.5" style={{ color: '#5ba0ff' }} />
            <span>{ACTION_LABELS[rule.action.type]}</span>
          </div>

          {/* Platform badges */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {rule.trigger.platforms.map((p) => (
              <span
                key={p}
                style={{
                  padding: '1px 8px', borderRadius: 999, fontSize: '0.70rem',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                  color: 'var(--muted)',
                }}
              >
                {PLATFORM_EMOJI[p] ?? ''} {p}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, fontSize: '0.74rem' }}>
            <span>
              <strong style={{ color: 'var(--text)' }}>{rule.stats.triggered}</strong>{' '}
              <span style={{ color: 'var(--muted)' }}>triggered</span>
            </span>
            <span>
              <strong style={{ color: '#3dd68c' }}>{rule.stats.sent}</strong>{' '}
              <span style={{ color: 'var(--muted)' }}>sent</span>
            </span>
            {rule.stats.failed > 0 && (
              <span>
                <strong style={{ color: '#ff5c5c' }}>{rule.stats.failed}</strong>{' '}
                <span style={{ color: 'var(--muted)' }}>failed</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
          <button type="button" className="btn-ghost btn-sm" onClick={onToggle} title={isActive ? 'Pause' : 'Activate'}>
            {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>

          <div style={{ position: 'relative' }}>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setMenuOpen(!menuOpen)}>
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                  background: 'var(--panel-strong)', border: '1px solid var(--border)',
                  borderRadius: 10, boxShadow: 'var(--shadow-2)', padding: 4,
                  minWidth: 140, zIndex: 20,
                }}
              >
                <button
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 10px', border: 'none', background: 'transparent',
                    color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                    cursor: 'pointer', borderRadius: 6, textAlign: 'left',
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 10px', border: 'none', background: 'transparent',
                    color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                    cursor: 'pointer', borderRadius: 6, textAlign: 'left',
                  }}
                  onClick={() => { onDuplicate(); setMenuOpen(false); }}
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
                <button
                  type="button"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '8px 10px', border: 'none', background: 'transparent',
                    color: '#ff5c5c', fontSize: '0.82rem', fontFamily: 'inherit',
                    cursor: 'pointer', borderRadius: 6, textAlign: 'left',
                  }}
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Main Page ---- */

export default function AutomationsPage() {
  const { activeCompany } = useActiveCompany();
  const { appContext } = useAppState();
  const {
    rules,
    loading,
    addRule: createRule,
    toggleRule: toggleRuleStatus,
    removeRule,
    duplicateRule: duplicateRuleAction,
    activeCount,
    totalTriggered,
    totalSent,
    successRate,
  } = useAutomations();

  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');

  const filtered = rules.filter((r) => filter === 'all' || r.status === filter);

  function handleToggle(id: string) {
    const rule = rules.find((r) => r.id === id);
    if (rule) toggleRuleStatus(rule.id, rule.status);
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this automation rule?')) return;
    removeRule(id);
  }

  function handleDuplicate(id: string) {
    const rule = rules.find((r) => r.id === id);
    if (rule) duplicateRuleAction(rule);
  }

  async function handleAddRule(partial: Partial<CommentAutomation>) {
    const now = new Date().toISOString();
    await createRule({
      companyId: activeCompany?.id || '',
      name: partial.name || 'New Rule',
      trigger: partial.trigger || { type: 'comment_keyword', keywords: [], platforms: [] },
      action: partial.action || { type: 'send_dm', message: '' },
      status: 'draft',
      rateLimitDelay: 0,
      maxSendsPerHour: 60,
      stats: { triggered: 0, sent: 0, failed: 0 },
      createdBy: appContext.userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (!activeCompany) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon"><Zap className="h-6 w-6" /></div>
          <h3>No company selected</h3>
          <p>Choose a company to manage automations.</p>
          <Link className="btn-primary" href="/select-company">Select company</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Automations"
        subtitle="Comment-trigger DM automations & engagement workflows."
        actions={
          <button type="button" className="btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" /> New Automation
          </button>
        }
      />

      {/* Stats row */}
      <section className="stats-grid">
        <div className="stat" style={{ '--stat-accent': '#3dd68c' } as React.CSSProperties}>
          <div className="stat-label">Active Rules</div>
          <div className="stat-value">{activeCount}</div>
        </div>
        <div className="stat" style={{ '--stat-accent': '#5ba0ff' } as React.CSSProperties}>
          <div className="stat-label">Total Triggered</div>
          <div className="stat-value">{totalTriggered.toLocaleString()}</div>
        </div>
        <div className="stat" style={{ '--stat-accent': '#f5a623' } as React.CSSProperties}>
          <div className="stat-label">Messages Sent</div>
          <div className="stat-value">{totalSent.toLocaleString()}</div>
        </div>
        <div className="stat" style={{ '--stat-accent': successRate > 0 ? '#3dd68c' : 'var(--muted)' } as React.CSSProperties}>
          <div className="stat-label">Success Rate</div>
          <div className="stat-value">{successRate > 0 ? `${successRate}%` : '--'}</div>
        </div>
      </section>

      {/* Filter bar */}
      <div className="panel" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
          <Zap className="h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
          {(['all', 'active', 'paused', 'draft'] as const).map((f) => (
            <button
              key={f}
              className={`chip${filter === f ? ' active' : ''}`}
              type="button"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.76rem', color: 'var(--muted)' }}>
            {filtered.length} rule{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Builder */}
      {creating && <RuleBuilder onClose={() => setCreating(false)} onSave={handleAddRule} />}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: '0.84rem' }}>
          Loading automations...
        </div>
      )}

      {/* Rule list */}
      {!loading && filtered.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => handleToggle(rule.id)}
              onDelete={() => handleDelete(rule.id)}
              onDuplicate={() => handleDuplicate(rule.id)}
            />
          ))}
        </div>
      ) : !loading && !creating ? (
        <section className="panel">
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'rgba(245,166,35,0.10)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px',
                border: '1px solid rgba(245,166,35,0.25)',
              }}
            >
              <Zap className="h-6 w-6" style={{ color: '#f5a623' }} />
            </div>
            <h3>No automations yet</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.84rem', maxWidth: 400, margin: '0 auto' }}>
              Create comment-trigger DM rules to automatically respond when followers comment specific keywords on your posts.
            </p>
            <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
              <Zap className="h-3.5 w-3.5" /> Create First Automation
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
