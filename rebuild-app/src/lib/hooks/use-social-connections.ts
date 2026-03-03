"use client";

/**
 * use-social-connections.ts
 * ---------------------------------------------------------------------------
 * Real-time hook for social-platform connections scoped to the active company.
 * Subscribes to Firestore via connection-store.ts.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';
import {
  subscribeConnections,
  type SocialConnection,
  type SocialProvider,
} from '@/lib/firebase/connection-store';

export function useSocialConnections() {
  const { appContext } = useAppState();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const workspaceId = appContext.workspaceId;
  const companyId = appContext.activeCompanyId;

  useEffect(() => {
    if (!workspaceId || !companyId) {
      setConnections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeConnections(workspaceId, companyId, (rows) => {
      setConnections(rows);
      setLoading(false);
    });
  }, [workspaceId, companyId]);

  /** Set of connected provider names */
  const connectedProviders = new Set(connections.map((c) => c.provider));

  /** Quick check — is a particular provider connected? */
  function isConnected(provider: SocialProvider): boolean {
    return connectedProviders.has(provider);
  }

  /** Get all connections for a specific provider */
  function forProvider(provider: SocialProvider): SocialConnection[] {
    return connections.filter((c) => c.provider === provider);
  }

  return {
    connections,
    connectedProviders,
    isConnected,
    forProvider,
    loading,
  };
}
