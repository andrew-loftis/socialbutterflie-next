"use client";

import { AppStateProvider } from '@/components/shell/app-state';
import { AuthProvider } from '@/lib/firebase/auth-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppStateProvider>{children}</AppStateProvider>
    </AuthProvider>
  );
}

