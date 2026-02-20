"use client";

import { createContext, useContext, useMemo, useState } from 'react';
import type { AppContext, InspectorEntityPayload } from '@/types/interfaces';

type AppStateValue = {
  appContext: AppContext;
  setAppContext: (ctx: AppContext) => void;
  inspector: InspectorEntityPayload | null;
  setInspector: (payload: InspectorEntityPayload | null) => void;
};

const defaultContext: AppContext = {
  workspaceId: 'workspace-demo',
  userId: 'user-demo',
  role: 'admin',
  activeCompanyId: 'company-aurora',
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [appContext, setAppContext] = useState<AppContext>(defaultContext);
  const [inspector, setInspector] = useState<InspectorEntityPayload | null>(null);

  const value = useMemo(
    () => ({ appContext, setAppContext, inspector, setInspector }),
    [appContext, inspector]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return ctx;
}

