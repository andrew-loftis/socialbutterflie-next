"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { bootstrapCompanyCreatorMemberships, getUserCompanyPreference, setUserCompanyPreference, subscribeCompanies } from '@/lib/firebase/company-store';
import { subscribeCompanyMembers } from '@/lib/firebase/member-store';
import { ensureWorkspaceUserAccess } from '@/lib/firebase/workspace-access-store';
import { useAppState } from '@/components/shell/app-state';
import { applyCompanyTheme } from '@/lib/theme/company-theme';

export function CompanyContextProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [accessReady, setAccessReady] = useState(false);
  const [companiesLoadedOnce, setCompaniesLoadedOnce] = useState(false);
  const {
    appContext,
    setAppContext,
    companies,
    setCompanies,
    companiesError,
    setCompaniesError,
    setActiveCompany,
    markCompanyGateSeen,
    setMembersByCompany,
  } = useAppState();

  useEffect(() => {
    if (user) return;
    setAccessReady(false);
    setCompaniesLoadedOnce(false);
    setCompaniesError(null);
    setCompanies([]);
    setMembersByCompany({});
    setActiveCompany(null);
  }, [setActiveCompany, setCompanies, setCompaniesError, setMembersByCompany, user]);

  useEffect(() => {
    if (!user) return;

    let active = true;
    getUserCompanyPreference(user.uid).then((pref) => {
      if (!active) return;
      setAppContext((prev) => ({
        ...prev,
        workspaceId: pref.lastActiveWorkspaceId || prev.workspaceId || 'workspace-primary',
        userId: user.uid,
      }));

      const hasActiveInSession =
        typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem('sb_active_company_id'));
      if (!hasActiveInSession && pref.lastActiveCompanyId) {
        setActiveCompany(pref.lastActiveCompanyId);
      }
    });

    return () => {
      active = false;
    };
  }, [setActiveCompany, setAppContext, user]);

  useEffect(() => {
    if (!user || loading) {
      setAccessReady(false);
      return;
    }
    let active = true;
    ensureWorkspaceUserAccess({
      workspaceId: appContext.workspaceId,
      uid: user.uid,
      email: user.email || `${user.uid}@local.test`,
    })
      .then(() => {
        setCompaniesError(null);
        if (active) setAccessReady(true);
      })
      .catch((error) => {
        setCompaniesError(error instanceof Error ? error.message : 'Failed to initialize workspace access');
        if (active) setAccessReady(true);
      });

    return () => {
      active = false;
    };
  }, [appContext.workspaceId, loading, setCompaniesError, user]);

  useEffect(() => {
    if (!user || loading || !accessReady) return;
    // Backfill memberships for older company docs created before membership-based listing was introduced.
    bootstrapCompanyCreatorMemberships({
      workspaceId: appContext.workspaceId,
      uid: user.uid,
      email: user.email || undefined,
    }).catch(() => undefined);
    return subscribeCompanies(
      appContext.workspaceId,
      user.uid,
      (next) => {
        setCompaniesError(null);
        setCompanies(next);
        setCompaniesLoadedOnce(true);
      },
      (message) => {
        setCompaniesError(message);
        setCompaniesLoadedOnce(true);
      }
    );
  }, [accessReady, appContext.workspaceId, loading, setCompanies, setCompaniesError, user]);

  useEffect(() => {
    if (!user || !appContext.activeCompanyId) return;
    setUserCompanyPreference(user.uid, appContext.workspaceId, appContext.activeCompanyId).catch(() => undefined);
    return subscribeCompanyMembers(appContext.workspaceId, appContext.activeCompanyId, (members) => {
      setMembersByCompany((prev) => ({ ...prev, [appContext.activeCompanyId as string]: members }));
    });
  }, [appContext.activeCompanyId, appContext.workspaceId, setMembersByCompany, user]);

  useEffect(() => {
    if (!user) return;

    // Don't auto-clear / auto-select until we have at least one snapshot result.
    // The initial empty array is just "not loaded yet".
    if (!companiesLoadedOnce) return;

    if (!companies.length) {
      // If we truly have no companies (not a permissions/listing error), clear any stale selection.
      if (!companiesError && appContext.activeCompanyId) {
        setActiveCompany(null);
      }
      if (!appContext.companyGateSeenInSession) {
        markCompanyGateSeen(true);
      }
      return;
    }

    if (companies.length === 1) {
      const onlyCompanyId = companies[0].id;
      if (appContext.activeCompanyId !== onlyCompanyId) {
        setActiveCompany(onlyCompanyId);
      }
      if (!appContext.companyGateSeenInSession) {
        markCompanyGateSeen(true);
      }
      return;
    }
  }, [
    appContext.activeCompanyId,
    appContext.companyGateSeenInSession,
    companies,
    companiesError,
    companiesLoadedOnce,
    markCompanyGateSeen,
    setActiveCompany,
    user,
  ]);

  useEffect(() => {
    const activeCompany = companies.find((company) => company.id === appContext.activeCompanyId) || null;
    applyCompanyTheme(activeCompany);
  }, [appContext.activeCompanyId, companies]);

  return <>{children}</>;
}
