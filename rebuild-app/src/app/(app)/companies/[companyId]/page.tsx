import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CompanyProfileEditor } from '@/components/companies/company-profile-editor';
import { PageHeader } from '@/components/ui/page-header';
import { getCompany } from '@/lib/repositories/rebuild-repo';

export default async function CompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const company = await getCompany('workspace-demo', companyId);
  if (!company) notFound();

  return (
    <div className="space-y-3">
      <PageHeader
        title={company.name}
        subtitle={`Brand Intelligence profile • ${company.completionScore}% complete`}
        actions={<Link className="btn-primary" href={`/companies/${companyId}/intake`}>Open Intake Wizard</Link>}
      />
      <CompanyProfileEditor initialCompany={company} />
    </div>
  );
}
