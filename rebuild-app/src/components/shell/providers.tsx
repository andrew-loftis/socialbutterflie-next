"use client";

import { CompanyContextProvider } from '@/components/company/company-context-provider';
import { AppStateProvider } from '@/components/shell/app-state';
import { AuthProvider } from '@/lib/firebase/auth-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppStateProvider>
        <CompanyContextProvider>{children}</CompanyContextProvider>
      </AppStateProvider>
    </AuthProvider>
  );
}

