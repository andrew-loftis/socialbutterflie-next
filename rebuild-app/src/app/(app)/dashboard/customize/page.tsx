"use client";

/**
 * Dashboard Customization Page
 * ─────────────────────────────
 * Visual grid editor for dashboard layout.
 * Drag widgets to reorder, add/remove from catalog, choose presets.
 *
 * Route: /dashboard/customize
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  GripVertical,
  LayoutGrid,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useAppState } from '@/components/shell/app-state';
import {
  getDashboardLayout,
  saveDashboardLayout,
  getDefaultLayout,
  PRESET_LAYOUTS,
  WIDGET_CATALOG,
} from '@/lib/firebase/dashboard-store';
import type { DashboardWidget, DashboardLayout, WidgetType } from '@/types/interfaces';

/* ---- Widget visual representation ---- */

const WIDGET_COLORS: Partial<Record<WidgetType, string>> = {
  kpi_card: '#f5a623',
  engagement_chart: '#5ba0ff',
  publishing_queue: '#3dd68c',
  calendar_mini: '#c084fc',
  inbox_preview: '#ff6b9d',
  contract_tracker: '#fbbf24',
  tasks: '#34d399',
  quick_actions: '#818cf8',
  recent_posts: '#fb923c',
  ai_suggestions: '#a78bfa',
  notes: '#94a3b8',
  story_performance: '#f472b6',
  hashtag_performance: '#22d3ee',
};

/* ---- Widget Grid Item ---- */

function WidgetGridItem({
  widget,
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  widget: DashboardWidget;
  index: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const catalogEntry = WIDGET_CATALOG.find((c) => c.type === widget.type);
  const color = WIDGET_COLORS[widget.type] ?? 'var(--accent)';

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10,
        background: `${color}08`, border: `1px solid ${color}30`,
        gridColumn: `span ${widget.size.colSpan}`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={onMoveUp}
          disabled={isFirst}
          style={{ padding: '2px 4px' }}
        >
          \u25B2
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={onMoveDown}
          disabled={isLast}
          style={{ padding: '2px 4px' }}
        >
          \u25BC
        </button>
      </div>

      <div
        style={{
          width: 8, height: 32, borderRadius: 4,
          background: color, flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
          {catalogEntry?.label ?? widget.type}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
          {catalogEntry?.description ?? ''}
          <span style={{ marginLeft: 8 }}>
            ({widget.size.colSpan}\u00D7{widget.size.rowSpan})
          </span>
        </div>
      </div>

      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={onRemove}
        style={{ color: '#ff5c5c', padding: '4px 6px' }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ---- Catalog Sidebar ---- */

function CatalogSidebar({
  onAdd,
  existingTypes,
}: {
  onAdd: (type: WidgetType) => void;
  existingTypes: Set<string>;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', margin: 0 }}>
        Widget Catalog
      </h4>
      {WIDGET_CATALOG.map((entry) => {
        const color = WIDGET_COLORS[entry.type] ?? 'var(--accent)';
        // kpi_card can have multiples; others typically one
        const alreadyHas = entry.type !== 'kpi_card' && existingTypes.has(entry.type);

        return (
          <button
            key={entry.type}
            type="button"
            onClick={() => onAdd(entry.type)}
            disabled={alreadyHas}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 8,
              background: alreadyHas ? 'var(--surface-2)' : `${color}06`,
              border: `1px solid ${alreadyHas ? 'var(--border)' : `${color}30`}`,
              cursor: alreadyHas ? 'default' : 'pointer',
              opacity: alreadyHas ? 0.5 : 1,
              textAlign: 'left', width: '100%',
              transition: 'opacity 0.15s',
              fontFamily: 'inherit', color: 'inherit',
            }}
          >
            <div style={{ width: 6, height: 24, borderRadius: 3, background: color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.76rem' }}>{entry.label}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>{entry.description}</div>
            </div>
            {alreadyHas ? (
              <Check className="h-3.5 w-3.5" style={{ color: 'var(--muted)' }} />
            ) : (
              <Plus className="h-3.5 w-3.5" style={{ color }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---- Main Page ---- */

export default function DashboardCustomizePage() {
  const { activeCompany } = useActiveCompany();
  const { appContext } = useAppState();
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const wId = appContext.workspaceId;
  const uId = appContext.userId;
  const cId = activeCompany?.id ?? '';

  // Load layout on mount
  useEffect(() => {
    if (!wId || !cId || !uId) { setLoading(false); return; }
    setLoading(true);
    getDashboardLayout(wId, uId, cId).then((existing) => {
      setLayout(existing ?? getDefaultLayout(uId, cId));
      setLoading(false);
    });
  }, [wId, uId, cId]);

  function updateWidgets(fn: (widgets: DashboardWidget[]) => DashboardWidget[]) {
    if (!layout) return;
    setLayout({ ...layout, widgets: fn(layout.widgets) });
    setDirty(true);
  }

  function handleRemoveWidget(index: number) {
    updateWidgets((w) => w.filter((_, i) => i !== index));
  }

  function handleMoveWidget(index: number, direction: -1 | 1) {
    updateWidgets((widgets) => {
      const arr = [...widgets];
      const newIdx = index + direction;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
      return arr;
    });
  }

  function handleAddWidget(type: WidgetType) {
    if (!layout) return;
    const catalogEntry = WIDGET_CATALOG.find((c) => c.type === type);
    const [colSpan, rowSpan] = catalogEntry?.defaultSpan ?? [1, 1];
    const maxRow = layout.widgets.reduce((max, w) => Math.max(max, w.position.row), 0);
    const newWidget: DashboardWidget = {
      id: `widget-${type}-${Date.now()}`,
      type,
      config: {},
      position: { col: 0, row: maxRow + 1 },
      size: { colSpan, rowSpan },
    };
    updateWidgets((w) => [...w, newWidget]);
  }

  function handleApplyPreset(presetKey: string) {
    if (!layout) return;
    const preset = PRESET_LAYOUTS[presetKey];
    if (!preset) return;
    setLayout({
      ...layout,
      name: preset.name,
      columns: preset.columns,
      widgets: preset.widgets.map((w) => ({ ...w })),
    });
    setDirty(true);
  }

  function handleChangeColumns(cols: 2 | 3 | 4) {
    if (!layout) return;
    setLayout({ ...layout, columns: cols });
    setDirty(true);
  }

  async function handleSave() {
    if (!layout || !wId || !cId || !uId) return;
    setSaving(true);
    try {
      await saveDashboardLayout(wId, uId, cId, layout);
      setDirty(false);
    } catch (err) {
      console.error('Failed to save layout:', err);
    } finally {
      setSaving(false);
    }
  }

  if (!activeCompany) {
    return (
      <section className="panel">
        <div className="empty-state">
          <div className="empty-state-icon"><LayoutGrid className="h-6 w-6" /></div>
          <h3>No company selected</h3>
          <Link className="btn-primary" href="/select-company">Select company</Link>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  const existingTypes = new Set(layout?.widgets.map((w) => w.type) ?? []);

  return (
    <div className="page">
      <PageHeader
        title="Customize Dashboard"
        subtitle={`${layout?.widgets.length ?? 0} widgets \u00B7 ${layout?.columns ?? 3} columns${dirty ? ' \u00B7 Unsaved changes' : ''}`}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href="/dashboard" className="btn-ghost btn-sm">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving || !dirty}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Saving...' : 'Save Layout'}
            </button>
          </div>
        }
      />

      {/* Preset + column controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)' }}>Presets:</span>
        {Object.entries(PRESET_LAYOUTS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            className={`chip${layout?.name === preset.name ? ' active' : ''}`}
            onClick={() => handleApplyPreset(key)}
          >
            {preset.name}
          </button>
        ))}

        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)' }}>Columns:</span>
        {([2, 3, 4] as const).map((c) => (
          <button
            key={c}
            type="button"
            className={`chip${layout?.columns === c ? ' active' : ''}`}
            onClick={() => handleChangeColumns(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 12, alignItems: 'start' }}>
        {/* Widget grid editor */}
        <section className="panel">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
            <LayoutGrid className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            Layout
            <span className="badge" style={{ marginLeft: 'auto' }}>{layout?.widgets.length ?? 0} widgets</span>
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${layout?.columns ?? 3}, 1fr)`,
            gap: 8,
            position: 'relative',
            zIndex: 1,
          }}>
            {layout?.widgets.map((widget, i) => (
              <WidgetGridItem
                key={widget.id}
                widget={widget}
                index={i}
                onRemove={() => handleRemoveWidget(i)}
                onMoveUp={() => handleMoveWidget(i, -1)}
                onMoveDown={() => handleMoveWidget(i, 1)}
                isFirst={i === 0}
                isLast={i === (layout?.widgets.length ?? 0) - 1}
              />
            ))}
          </div>

          {(!layout?.widgets.length) && (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-icon"><Plus className="h-5 w-5" /></div>
              <p>Add widgets from the catalog, or choose a preset.</p>
            </div>
          )}
        </section>

        {/* Widget catalog sidebar */}
        <section className="panel">
          <CatalogSidebar
            onAdd={handleAddWidget}
            existingTypes={existingTypes}
          />
        </section>
      </div>
    </div>
  );
}
