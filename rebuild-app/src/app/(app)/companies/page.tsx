import { CompanyGrid } from '@/components/companies/company-grid';
import { PageHeader } from '@/components/ui/page-header';

export default function CompaniesPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Companies" subtitle="Brand Intelligence cards with 5-section context and editable deep profiles." />
      <CompanyGrid />
    </div>
  );
}
