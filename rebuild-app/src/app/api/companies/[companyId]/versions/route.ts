import { created, badRequest } from '@/lib/server/http';
import { addCompanyVersion } from '@/lib/repositories/rebuild-repo';
import { resolveServerContext } from '@/lib/server/request-context';

export async function POST(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const context = await resolveServerContext();
  const body = (await request.json().catch(() => null)) as { notes?: string } | null;
  if (!companyId) return badRequest('companyId required');

  const version = await addCompanyVersion(
    context.workspaceId,
    companyId,
    body?.notes || 'Snapshot',
    context.userId
  );

  return created(version);
}

