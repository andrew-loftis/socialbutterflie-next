"use client";

/**
 * dashboard-store.ts
 * ──────────────────
 * Firestore-backed customizable dashboard layouts.
 *
 * Path: workspaces/{wId}/users/{uid}/dashboardLayouts/{companyId}
 */

import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type { DashboardLayout, DashboardWidget, WidgetType } from '@/types/interfaces';

// ── In-memory fallback ─────────────────────────────────────────────────────

const memoryLayouts = new Map<string, DashboardLayout>();

function layoutKey(userId: string, companyId: string) {
  return `${userId}:${companyId}`;
}

// ── Default Layouts ────────────────────────────────────────────────────────

function makeWidget(
  type: WidgetType,
  col: number,
  row: number,
  colSpan = 1,
  rowSpan = 1,
  config: Record<string, unknown> = {},
): DashboardWidget {
  return {
    id: `widget-${type}-${col}-${row}`,
    type,
    config,
    position: { col, row },
    size: { colSpan, rowSpan },
  };
}

export const PRESET_LAYOUTS: Record<string, { name: string; columns: 2 | 3 | 4; widgets: DashboardWidget[] }> = {
  manager: {
    name: 'Manager View',
    columns: 3,
    widgets: [
      makeWidget('kpi_card', 0, 0, 1, 1, { metric: 'impressions' }),
      makeWidget('kpi_card', 1, 0, 1, 1, { metric: 'engagements' }),
      makeWidget('kpi_card', 2, 0, 1, 1, { metric: 'scheduled' }),
      makeWidget('contract_tracker', 0, 1, 2, 1),
      makeWidget('tasks', 2, 1, 1, 2),
      makeWidget('engagement_chart', 0, 2, 2, 1),
      makeWidget('publishing_queue', 0, 3, 1, 1),
      makeWidget('inbox_preview', 1, 3, 1, 1),
      makeWidget('recent_posts', 2, 3, 1, 1),
    ],
  },
  creator: {
    name: 'Content Creator',
    columns: 3,
    widgets: [
      makeWidget('kpi_card', 0, 0, 1, 1, { metric: 'impressions' }),
      makeWidget('kpi_card', 1, 0, 1, 1, { metric: 'engagements' }),
      makeWidget('kpi_card', 2, 0, 1, 1, { metric: 'published' }),
      makeWidget('engagement_chart', 0, 1, 2, 1),
      makeWidget('calendar_mini', 2, 1, 1, 1),
      makeWidget('recent_posts', 0, 2, 2, 1),
      makeWidget('quick_actions', 2, 2, 1, 1),
      makeWidget('notes', 0, 3, 3, 1),
    ],
  },
  client: {
    name: 'Client View',
    columns: 2,
    widgets: [
      makeWidget('kpi_card', 0, 0, 1, 1, { metric: 'impressions' }),
      makeWidget('kpi_card', 1, 0, 1, 1, { metric: 'engagements' }),
      makeWidget('contract_tracker', 0, 1, 2, 1),
      makeWidget('engagement_chart', 0, 2, 2, 1),
      makeWidget('recent_posts', 0, 3, 2, 1),
    ],
  },
};

export const WIDGET_CATALOG: { type: WidgetType; label: string; description: string; defaultSpan: [number, number] }[] = [
  { type: 'kpi_card', label: 'KPI Card', description: 'Single metric with trend delta', defaultSpan: [1, 1] },
  { type: 'engagement_chart', label: 'Engagement Chart', description: '7-day impressions & engagements sparkline', defaultSpan: [2, 1] },
  { type: 'publishing_queue', label: 'Publishing Queue', description: 'Post status breakdown', defaultSpan: [1, 1] },
  { type: 'calendar_mini', label: 'Mini Calendar', description: 'Compact month view with post dots', defaultSpan: [1, 1] },
  { type: 'inbox_preview', label: 'Inbox Preview', description: 'Latest messages across platforms', defaultSpan: [1, 1] },
  { type: 'contract_tracker', label: 'Contract Tracker', description: 'Live deliverable progress bars', defaultSpan: [2, 1] },
  { type: 'tasks', label: 'Tasks', description: 'Checklist with drag-to-reorder', defaultSpan: [1, 2] },
  { type: 'quick_actions', label: 'Quick Actions', description: 'Shortcut buttons to key pages', defaultSpan: [1, 1] },
  { type: 'recent_posts', label: 'Recent Posts', description: 'Last 5 posts with status', defaultSpan: [2, 1] },
  { type: 'ai_suggestions', label: 'AI Suggestions', description: 'Content ideas from your AI context', defaultSpan: [1, 1] },
  { type: 'notes', label: 'Notes', description: 'Scratchpad for ideas and meeting notes', defaultSpan: [2, 1] },
  { type: 'story_performance', label: 'Story Performance', description: 'Story reach & exit metrics', defaultSpan: [1, 1] },
  { type: 'hashtag_performance', label: 'Hashtag Performance', description: 'Top-performing hashtag groups', defaultSpan: [1, 1] },
];

// ── CRUD ───────────────────────────────────────────────────────────────────

export async function getDashboardLayout(
  workspaceId: string,
  userId: string,
  companyId: string,
): Promise<DashboardLayout | null> {
  if (!firestore) {
    return memoryLayouts.get(layoutKey(userId, companyId)) ?? null;
  }

  const docRef = doc(
    firestore, 'workspaces', workspaceId, 'users', userId, 'dashboardLayouts', companyId,
  );
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as DashboardLayout) : null;
}

export async function saveDashboardLayout(
  workspaceId: string,
  userId: string,
  companyId: string,
  layout: DashboardLayout,
): Promise<void> {
  const updated = { ...layout, updatedAt: new Date().toISOString() };

  if (!firestore) {
    memoryLayouts.set(layoutKey(userId, companyId), updated);
    return;
  }

  const docRef = doc(
    firestore, 'workspaces', workspaceId, 'users', userId, 'dashboardLayouts', companyId,
  );
  await setDoc(docRef, updated);
}

export function getDefaultLayout(userId: string, companyId: string): DashboardLayout {
  const preset = PRESET_LAYOUTS.manager;
  return {
    id: `layout-${companyId}`,
    userId,
    companyId,
    name: preset.name,
    columns: preset.columns,
    widgets: preset.widgets.map((w) => ({ ...w })),
    updatedAt: new Date().toISOString(),
  };
}
