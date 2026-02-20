import { badRequest, created } from '@/lib/server/http';
import { compileCompanyContext, getCompany, saveCompany } from '@/lib/repositories/rebuild-repo';
import { resolveServerContext } from '@/lib/server/request-context';

export async function POST(_: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const context = await resolveServerContext();

  const company = await getCompany(context.workspaceId, companyId);
  if (!company) return badRequest('company not found', 404);

  const compiled = compileCompanyContext(company);
  await saveCompany(context.workspaceId, { ...company, aiContextCompiled: compiled.compiledPrompt });

  return created(compiled);
}

