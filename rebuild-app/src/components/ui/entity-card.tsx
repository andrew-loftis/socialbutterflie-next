"use client";

import type { InspectorEntityPayload } from '@/types/interfaces';
import { useAppState } from '@/components/shell/app-state';

export function EntityCard({
  entity,
  children,
  className = '',
}: {
  entity: InspectorEntityPayload;
  children: React.ReactNode;
  className?: string;
}) {
  const { setInspector } = useAppState();

  return (
    <button type="button" className={`entity-card ${className}`} onClick={() => setInspector(entity)}>
      {children}
    </button>
  );
}

