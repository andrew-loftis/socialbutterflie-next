"use client";

/**
 * contract-editor.tsx
 * ───────────────────
 * Full contract & deliverable tracker with live progress bars.
 * Company-scoped, shows agreed deliverables vs actual completions.
 */

import { useCallback, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useAppState } from '@/components/shell/app-state';
import { useCompanyContracts } from '@/lib/hooks/use-company-contracts';
import { createContract, updateContract, deleteContract } from '@/lib/firebase/contract-store';
import type {
  CompanyContract,
  ContractDeliverable,
  DeliverablePeriod,
  DeliverableProgress,
  DeliverableType,
} from '@/types/interfaces';

// ── Constants ──────────────────────────────────────────────────────────────

const DELIVERABLE_TYPE_LABELS: Record<DeliverableType, string> = {
  feed_post: 'Feed Post',
  story: 'Story',
  reel: 'Reel',
  carousel: 'Carousel',
  short: 'Short',
  blog_post: 'Blog Post',
  newsletter: 'Newsletter',
  custom: 'Custom',
};

const PERIOD_LABELS: Record<DeliverablePeriod, string> = {
  weekly: 'per week',
  monthly: 'per month',
  quarterly: 'per quarter',
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  on_track:  { bg: 'rgba(61,214,140,0.12)', color: '#3dd68c', label: 'On Track' },
  at_risk:   { bg: 'rgba(245,166,35,0.12)',  color: '#f5a623', label: 'At Risk' },
  behind:    { bg: 'rgba(255,92,92,0.12)',    color: '#ff5c5c', label: 'Behind' },
  complete:  { bg: 'rgba(91,160,255,0.12)',   color: '#5ba0ff', label: 'Complete' },
  none:      { bg: 'rgba(122,143,176,0.12)',  color: '#7a8fb0', label: 'No Data' },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ completed, scheduled, target, status }: {
  completed: number;
  scheduled: number;
  target: number;
  status: string;
}) {
  const completedPct = Math.min((completed / target) * 100, 100);
  const scheduledPct = Math.min(((completed + scheduled) / target) * 100, 100) - completedPct;
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.none;

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 4, fontSize: '0.76rem',
      }}>
        <span style={{ fontWeight: 600 }}>
          {completed}/{target} delivered
          {scheduled > 0 && <span style={{ color: 'var(--muted)' }}> (+{scheduled} scheduled)</span>}
        </span>
        <span style={{
          padding: '1px 8px', borderRadius: 999, fontSize: '0.66rem', fontWeight: 600,
          background: style.bg, color: style.color,
          border: `1px solid ${style.color}33`,
        }}>
          {style.label}
        </span>
      </div>
      <div style={{
        height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden', display: 'flex',
      }}>
        <div style={{
          width: `${completedPct}%`, background: style.color,
          borderRadius: '4px 0 0 4px', transition: 'width 0.4s ease',
        }} />
        {scheduledPct > 0 && (
          <div style={{
            width: `${scheduledPct}%`, background: `${style.color}66`,
            transition: 'width 0.4s ease',
          }} />
        )}
      </div>
    </div>
  );
}

function DeliverableRow({ deliverable, progress }: {
  deliverable: ContractDeliverable;
  progress?: DeliverableProgress;
}) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10,
      border: '1px solid var(--border-subtle)',
      background: 'rgba(255,255,255,0.015)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>
          {deliverable.customLabel || DELIVERABLE_TYPE_LABELS[deliverable.type]}
        </span>
        <span style={{
          fontSize: '0.70rem', color: 'var(--muted)',
          padding: '1px 8px', borderRadius: 999,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
        }}>
          {deliverable.count} {PERIOD_LABELS[deliverable.period]}
        </span>
        {deliverable.platforms && deliverable.platforms.length > 0 && (
          <span style={{ fontSize: '0.70rem', color: 'var(--muted)' }}>
            on {deliverable.platforms.join(', ')}
          </span>
        )}
      </div>
      {progress ? (
        <ProgressBar
          completed={progress.completed}
          scheduled={progress.scheduled}
          target={progress.target}
          status={progress.status}
        />
      ) : (
        <div style={{ fontSize: '0.76rem', color: 'var(--muted)', fontStyle: 'italic' }}>
          No progress data for current period
        </div>
      )}
    </div>
  );
}

// ── Create Contract Modal ──────────────────────────────────────────────────

function CreateContractForm({ companyId, onCreated, onCancel }: {
  companyId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { appContext } = useAppState();
  const [name, setName] = useState('');
  const [deliverables, setDeliverables] = useState<Omit<ContractDeliverable, 'id'>[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function addDeliverable() {
    setDeliverables((prev) => [
      ...prev,
      { type: 'feed_post', count: 4, period: 'weekly' },
    ]);
  }

  function updateDeliverable(index: number, updates: Partial<Omit<ContractDeliverable, 'id'>>) {
    setDeliverables((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
  }

  function removeDeliverable(index: number) {
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || deliverables.length === 0) return;

    setSaving(true);
    try {
      const now = new Date().toISOString();
      await createContract(appContext.workspaceId, companyId, {
        companyId,
        name: name.trim(),
        effectiveFrom: now,
        deliverables: deliverables.map((d, i) => ({
          ...d,
          id: `del-${crypto.randomUUID().slice(0, 6)}`,
        })),
        notes: notes.trim() || undefined,
        status: 'active',
        createdBy: appContext.userId,
        createdAt: now,
        updatedAt: now,
      });
      onCreated();
    } catch {
      // TODO: toast error
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
          Contract Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q1 2026 Agreement"
          required
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Deliverables */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)' }}>
            Agreed Deliverables
          </label>
          <button type="button" className="btn-ghost btn-sm" onClick={addDeliverable}>
            <Plus className="h-3 w-3" /> Add Deliverable
          </button>
        </div>

        {deliverables.length === 0 && (
          <div style={{
            padding: '16px', textAlign: 'center', borderRadius: 10,
            border: '1px dashed var(--border)', color: 'var(--muted)',
            fontSize: '0.82rem',
          }}>
            Click &quot;Add Deliverable&quot; to define what this contract requires.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {deliverables.map((d, i) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'center',
              padding: '8px 10px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
            }}>
              <select
                value={d.type}
                onChange={(e) => updateDeliverable(i, { type: e.target.value as DeliverableType })}
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 6,
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                }}
              >
                {Object.entries(DELIVERABLE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                max={999}
                value={d.count}
                onChange={(e) => updateDeliverable(i, { count: Number(e.target.value) || 1 })}
                style={{
                  width: 60, padding: '6px 8px', borderRadius: 6,
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                  textAlign: 'center',
                }}
              />

              <select
                value={d.period}
                onChange={(e) => updateDeliverable(i, { period: e.target.value as DeliverablePeriod })}
                style={{
                  padding: '6px 8px', borderRadius: 6,
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
                }}
              >
                <option value="weekly">Per Week</option>
                <option value="monthly">Per Month</option>
                <option value="quarterly">Per Quarter</option>
              </select>

              <button
                type="button"
                onClick={() => removeDeliverable(i)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#ff5c5c', padding: 4,
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any special terms, rates, or notes about this contract..."
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button
          type="submit"
          className="btn-primary"
          disabled={saving || !name.trim() || deliverables.length === 0}
        >
          {saving ? 'Creating…' : 'Create Contract'}
        </button>
      </div>
    </form>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function ContractEditor({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { contracts, activeContracts, progress, getProgressForContract, getOverallStatus } = useCompanyContracts();
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const overallStatus = getOverallStatus();
  const overallStyle = STATUS_STYLES[overallStatus] ?? STATUS_STYLES.none;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header summary */}
      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText className="h-5 w-5" style={{ color: 'var(--company-primary, var(--accent))' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>
                Contracts & Deliverables
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
                {activeContracts.length} active contract{activeContracts.length !== 1 ? 's' : ''} for {companyName}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '3px 12px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
              background: overallStyle.bg, color: overallStyle.color,
              border: `1px solid ${overallStyle.color}33`,
            }}>
              {overallStyle.label}
            </span>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" /> New Contract
            </button>
          </div>
        </div>
      </section>

      {/* Create form */}
      {creating && (
        <section className="panel">
          <h3 style={{ position: 'relative', zIndex: 1 }}>New Contract Agreement</h3>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <CreateContractForm
              companyId={companyId}
              onCreated={() => setCreating(false)}
              onCancel={() => setCreating(false)}
            />
          </div>
        </section>
      )}

      {/* Contract list */}
      {contracts.length === 0 && !creating ? (
        <section className="panel">
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(245,166,35,0.10)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px',
              border: '1px solid rgba(245,166,35,0.25)',
            }}>
              <FileText className="h-6 w-6" style={{ color: '#f5a623' }} />
            </div>
            <h3>No contracts yet</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>
              Create a contract to track deliverables like &quot;4 feed posts per week&quot; or &quot;12 stories per month&quot;.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Create First Contract
            </button>
          </div>
        </section>
      ) : (
        contracts.map((contract) => {
          const isExpanded = expanded.has(contract.id);
          const contractProgress = getProgressForContract(contract.id);
          const statusCounts = { complete: 0, on_track: 0, at_risk: 0, behind: 0 };
          for (const p of contractProgress) {
            if (p.status in statusCounts) statusCounts[p.status as keyof typeof statusCounts]++;
          }

          return (
            <section key={contract.id} className="panel">
              {/* Contract header */}
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', position: 'relative', zIndex: 1,
                }}
                onClick={() => toggle(contract.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                    : <ChevronRight className="h-4 w-4" style={{ color: 'var(--muted)' }} />
                  }
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{contract.name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                      {contract.deliverables.length} deliverable{contract.deliverables.length !== 1 ? 's' : ''}
                      {' · '}
                      <span style={{
                        color: contract.status === 'active' ? '#3dd68c' :
                               contract.status === 'expired' ? '#ff5c5c' : 'var(--muted)',
                      }}>
                        {contract.status}
                      </span>
                      {contract.effectiveFrom && (
                        <span> · Since {new Date(contract.effectiveFrom).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {statusCounts.behind > 0 && (
                    <span title={`${statusCounts.behind} behind`} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <AlertTriangle className="h-3.5 w-3.5" style={{ color: '#ff5c5c' }} />
                      <span style={{ fontSize: '0.70rem', color: '#ff5c5c', fontWeight: 600 }}>{statusCounts.behind}</span>
                    </span>
                  )}
                  {statusCounts.at_risk > 0 && (
                    <span title={`${statusCounts.at_risk} at risk`} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Clock className="h-3.5 w-3.5" style={{ color: '#f5a623' }} />
                      <span style={{ fontSize: '0.70rem', color: '#f5a623', fontWeight: 600 }}>{statusCounts.at_risk}</span>
                    </span>
                  )}
                  {statusCounts.complete > 0 && (
                    <span title={`${statusCounts.complete} complete`} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#5ba0ff' }} />
                      <span style={{ fontSize: '0.70rem', color: '#5ba0ff', fontWeight: 600 }}>{statusCounts.complete}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded: deliverable details */}
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, position: 'relative', zIndex: 1 }}>
                  {contract.deliverables.map((d) => {
                    const dp = contractProgress.find((p) => p.deliverableId === d.id);
                    return <DeliverableRow key={d.id} deliverable={d} progress={dp} />;
                  })}

                  {contract.notes && (
                    <div style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic',
                    }}>
                      {contract.notes}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
