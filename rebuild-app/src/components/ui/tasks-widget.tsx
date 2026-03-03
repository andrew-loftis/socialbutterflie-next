"use client";

/**
 * tasks-widget.tsx
 * ────────────────
 * Dashboard widget for task management — todo/in-progress/done kanban.
 * Uses the useCompanyTasks hook with real Firestore persistence.
 */

import { useState, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  GripVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { useCompanyTasks } from '@/lib/hooks/use-company-tasks';

const STATUS_META = {
  todo: { label: 'To Do', icon: Circle, color: '#7a8fb0', bg: 'rgba(122,143,176,0.08)' },
  in_progress: { label: 'In Progress', icon: Clock, color: '#f5a623', bg: 'rgba(245,166,35,0.08)' },
  done: { label: 'Done', icon: CheckCircle2, color: '#3dd68c', bg: 'rgba(61,214,140,0.08)' },
} as const;

type TaskStatus = keyof typeof STATUS_META;

export function TasksWidget() {
  const { tasks, todo, inProgress, done, loading, addTask, toggleTask, editTask, removeTask } = useCompanyTasks();
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await addTask(newTitle.trim());
      setNewTitle('');
    } finally {
      setAdding(false);
    }
  }, [newTitle, addTask]);

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>
        Loading tasks…
      </div>
    );
  }

  const columns: { key: TaskStatus; items: typeof tasks }[] = [
    { key: 'todo', items: todo },
    { key: 'in_progress', items: inProgress },
    { key: 'done', items: done },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Quick add */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
        style={{ display: 'flex', gap: 6, alignItems: 'center' }}
      >
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task…"
          style={{
            flex: 1, padding: '7px 10px', borderRadius: 8,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '0.82rem', fontFamily: 'inherit',
          }}
        />
        <button
          type="submit"
          className="btn-primary btn-sm"
          disabled={adding || !newTitle.trim()}
          style={{ height: 32 }}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Task columns */}
      {columns.map(({ key, items }) => {
        const meta = STATUS_META[key];
        const Icon = meta.icon;

        return (
          <div key={key}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 4, padding: '4px 0',
            }}>
              <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {meta.label}
              </span>
              <span style={{
                padding: '0 5px', borderRadius: 999, fontSize: '0.62rem', fontWeight: 700,
                background: meta.bg, color: meta.color,
                border: `1px solid ${meta.color}33`,
              }}>
                {items.length}
              </span>
            </div>

            {items.length === 0 ? (
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                border: '1px dashed var(--border)',
                fontSize: '0.76rem', color: 'var(--muted)',
                textAlign: 'center',
              }}>
                {key === 'done' ? 'Completed tasks appear here' : 'No tasks'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {items.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 8px', borderRadius: 8,
                      background: meta.bg,
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <GripVertical className="h-3 w-3" style={{ color: 'var(--muted)', opacity: 0.4, flexShrink: 0 }} />
                    <button
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: meta.color, padding: 0, flexShrink: 0,
                        display: 'flex', alignItems: 'center',
                      }}
                      title="Cycle status"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                    <span style={{
                      flex: 1, fontSize: '0.80rem',
                      textDecoration: key === 'done' ? 'line-through' : 'none',
                      opacity: key === 'done' ? 0.65 : 1,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </span>
                    {task.assigneeId && (
                      <span style={{
                        width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.58rem', fontWeight: 700, color: 'var(--muted)',
                      }}>
                        {task.assigneeId.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--muted)', padding: 0, flexShrink: 0,
                        opacity: 0.5, display: 'flex', alignItems: 'center',
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Summary */}
      {tasks.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', padding: '4px 0',
          fontSize: '0.72rem', color: 'var(--muted)',
          borderTop: '1px solid var(--border-subtle)', marginTop: 2, paddingTop: 6,
        }}>
          <span>{tasks.length} total</span>
          <span>{done.length} completed ({tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0}%)</span>
        </div>
      )}
    </div>
  );
}
