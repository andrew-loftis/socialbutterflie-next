import { badRequest, ok } from '@/lib/server/http';
import { getCompany, saveCompany } from '@/lib/repositories/rebuild-repo';
import { resolveServerContext } from '@/lib/server/request-context';
import type { CompanyProfile } from '@/types/interfaces';

export async function GET(_: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const context = await resolveServerContext();
  const company = await getCompany(context.workspaceId, companyId);
  if (!company) return badRequest('company not found', 404);
  return ok(company);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const context = await resolveServerContext();
  const current = await getCompany(context.workspaceId, companyId);
  if (!current) return badRequest('company not found', 404);

  const patch = (await request.json().catch(() => null)) as Partial<CompanyProfile> | null;
  if (!patch) return badRequest('invalid payload');

  const next: CompanyProfile = {
    ...current,
    ...patch,
    id: current.id,
    workspaceId: current.workspaceId,
    updatedAt: new Date().toISOString(),
    updatedBy: context.userId,
  };

  const saved = await saveCompany(context.workspaceId, next);
  return ok(saved);
}

