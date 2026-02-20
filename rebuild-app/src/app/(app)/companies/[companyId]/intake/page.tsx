import { IntakeWizard } from '@/components/companies/intake-wizard';
import { PageHeader } from '@/components/ui/page-header';

export default async function IntakePage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  return (
    <div className="space-y-3">
      <PageHeader title="Company Intake Wizard" subtitle={`Guided questionnaire for ${companyId} with autosave and upload support.`} />
      <IntakeWizard companyId={companyId} />
    </div>
  );
}
