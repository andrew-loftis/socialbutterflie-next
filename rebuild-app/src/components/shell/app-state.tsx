"use client";

import { createContext, useContext, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import type { AppContext, CompanyMember, CompanyProfile, InspectorEntityPayload } from '@/types/interfaces';

// Persist across reloads so navigation doesn't constantly force re-selection.
// Keep legacy session keys for migration.
const ACTIVE_COMPANY_KEY = 'sb_active_company_id';
const GATE_SEEN_KEY = 'sb_company_gate_seen';

type AppStateValue = {
  appContext: AppContext;
  setAppContext: Dispatch<SetStateAction<AppContext>>;
  companies: CompanyProfile[];
  setCompanies: Dispatch<SetStateAction<CompanyProfile[]>>;
  companiesError: string | null;
  setCompaniesError: Dispatch<SetStateAction<string | null>>;
  membersByCompany: Record<string, CompanyMember[]>;
  setMembersByCompany: Dispatch<SetStateAction<Record<string, CompanyMember[]>>>;
  setActiveCompany: (companyId: string | null) => void;
  markCompanyGateSeen: (value: boolean) => void;
  inspector: InspectorEntityPayload | null;
  setInspector: (payload: InspectorEntityPayload | null) => void;
};

const defaultContext: AppContext = {
  workspaceId: 'workspace-primary',
  userId: 'anonymous',
  role: 'viewer',
  activeCompanyId: null,
  companyGateSeenInSession: false,
};

function readInitialContext(): AppContext {
  if (typeof window === 'undefined') return defaultContext;
  const legacyActive = window.sessionStorage.getItem(ACTIVE_COMPANY_KEY);
  const legacySeen = window.sessionStorage.getItem(GATE_SEEN_KEY);
  return {
    ...defaultContext,
    activeCompanyId: window.localStorage.getItem(ACTIVE_COMPANY_KEY) || legacyActive,
    companyGateSeenInSession: window.localStorage.getItem(GATE_SEEN_KEY) === '1' || legacySeen === '1',
  };
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [baseContext, setBaseContext] = useState<AppContext>(readInitialContext);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [membersByCompany, setMembersByCompany] = useState<Record<string, CompanyMember[]>>({});
  const [inspector, setInspector] = useState<InspectorEntityPayload | null>(null);

  const appContext = useMemo<AppContext>(() => {
    return {
      ...baseContext,
      userId: user?.uid || defaultContext.userId,
      role: user ? 'editor' : 'viewer',
    };
  }, [baseContext, user]);

  const value = useMemo<AppStateValue>(
    () => ({
      appContext,
      setAppContext: setBaseContext,
      companies,
      setCompanies,
      companiesError,
      setCompaniesError,
      membersByCompany,
      setMembersByCompany,
      setActiveCompany: (companyId: string | null) => {
        setBaseContext((prev) => ({ ...prev, activeCompanyId: companyId }));
        if (typeof window !== 'undefined') {
          if (companyId) {
            window.localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
            window.sessionStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
          } else {
            window.localStorage.removeItem(ACTIVE_COMPANY_KEY);
            window.sessionStorage.removeItem(ACTIVE_COMPANY_KEY);
          }
        }
      },
      markCompanyGateSeen: (seen: boolean) => {
        setBaseContext((prev) => ({ ...prev, companyGateSeenInSession: seen }));
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(GATE_SEEN_KEY, seen ? '1' : '0');
          window.sessionStorage.setItem(GATE_SEEN_KEY, seen ? '1' : '0');
        }
      },
      inspector,
      setInspector,
    }),
    [appContext, companies, companiesError, membersByCompany, inspector]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}

