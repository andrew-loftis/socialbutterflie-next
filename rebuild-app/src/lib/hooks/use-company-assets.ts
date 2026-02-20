"use client";

import { useMemo } from 'react';
import { useActiveCompany } from '@/lib/hooks/use-active-company';

export function useCompanyAssets() {
  const { activeCompany } = useActiveCompany();
  const assets = useMemo(() => activeCompany?.assets || [], [activeCompany]);
  return { assets, hasAssets: assets.length > 0 };
}

