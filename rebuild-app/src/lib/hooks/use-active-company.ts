"use client";

import { useMemo } from 'react';
import { useAppState } from '@/components/shell/app-state';

export function useActiveCompany() {
  const { appContext, companies, setActiveCompany, markCompanyGateSeen } = useAppState();

  const activeCompany = useMemo(
    () => companies.find((company) => company.id === appContext.activeCompanyId) || null,
    [appContext.activeCompanyId, companies]
  );

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

