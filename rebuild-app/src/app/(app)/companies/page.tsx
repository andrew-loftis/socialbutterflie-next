import { CompanyGrid } from '@/components/companies/company-grid';
import { PageHeader } from '@/components/ui/page-header';

export default function CompaniesPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Companies" subtitle="Manage brand workspaces, team access, social connections, and intake profiles." />
      <CompanyGrid />
    </div>
  );
}
