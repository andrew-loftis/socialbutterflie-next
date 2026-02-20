import { CompanyGate } from '@/components/company/company-gate';
import { AppShell } from '@/components/shell/app-shell';
import { AuthGate } from '@/components/shell/auth-gate';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <CompanyGate>
        <AppShell>{children}</AppShell>
      </CompanyGate>
    </AuthGate>
  );
}

