"use client";

import { useEffect, useMemo, useRef } from 'react';
import { useAppState } from '@/components/shell/app-state';
import { getCompanyById } from '@/lib/firebase/company-store';

export function useActiveCompany() {
  const { appContext, companies, setCompanies, setActiveCompany, markCompanyGateSeen } = useAppState();
  const lastFetchKey = useRef<string>('');

  const activeCompany = useMemo(
    () => companies.find((company) => company.id === appContext.activeCompanyId) || null,
    [appContext.activeCompanyId, companies]
  );

  useEffect(() => {
    const companyId = appContext.activeCompanyId;
    if (!companyId) return;
    if (activeCompany) return;

    const key = `${appContext.workspaceId}:${companyId}`;
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;

    let cancelled = false;
    getCompanyById(appContext.workspaceId, companyId)
      .then((company) => {
        if (cancelled || !company) return;
        setCompanies((prev) => {
          if (prev.some((c) => c.id === company.id)) return prev;
          return [...prev, company];
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [activeCompany, appContext.activeCompanyId, appContext.workspaceId, setCompanies]);

  return {
    activeCompany,
    activeCompanyId: appContext.activeCompanyId,
    companies,
    setActiveCompany: (companyId: string | null) => {
      setActiveCompany(companyId);
      markCompanyGateSeen(Boolean(companyId));
    },
  };
}

