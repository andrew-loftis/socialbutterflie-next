"use client";

import { useEffect, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { subscribeTasks, createTask, updateTask, deleteTask, reorderTasks } from '@/lib/firebase/task-store';
import type { DashboardTask } from '@/types/interfaces';

export function useCompanyTasks() {
  const { appContext } = useAppState();
  const activeCompanyId = appContext.activeCompanyId;
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!activeCompanyId) {
      setTasks([]);
      setLoaded(true);
      return;
    }

    return subscribeTasks(
      appContext.workspaceId,
      activeCompanyId,
      (items) => {
        setTasks(items);
        setLoaded(true);
      },
    );
  }, [appContext.workspaceId, activeCompanyId]);

  async function addTask(title: string, description?: string, dueDate?: string, assigneeId?: string) {
    if (!activeCompanyId) return;
    await createTask(appContext.workspaceId, activeCompanyId, {
      companyId: activeCompanyId,
      title,
      description,
      assigneeId,
      dueDate,
      status: 'todo',
      order: tasks.length,
      createdBy: appContext.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async function toggleTask(taskId: string) {
    if (!activeCompanyId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextStatus = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done';
    await updateTask(appContext.workspaceId, activeCompanyId, taskId, { status: nextStatus });
  }

  async function editTask(taskId: string, updates: Partial<DashboardTask>) {
    if (!activeCompanyId) return;
    await updateTask(appContext.workspaceId, activeCompanyId, taskId, updates);
  }

  async function removeTask(taskId: string) {
    if (!activeCompanyId) return;
    await deleteTask(appContext.workspaceId, activeCompanyId, taskId);
  }

  async function reorder(taskIds: string[]) {
    if (!activeCompanyId) return;
    await reorderTasks(appContext.workspaceId, activeCompanyId, taskIds);
  }

  const todo = tasks.filter((t) => t.status === 'todo');
  const inProgress = tasks.filter((t) => t.status === 'in_progress');
  const done = tasks.filter((t) => t.status === 'done');

  return {
    tasks,
    todo,
    inProgress,
    done,
    loading: !loaded,
    addTask,
    toggleTask,
    editTask,
    removeTask,
    reorder,
  };
}
