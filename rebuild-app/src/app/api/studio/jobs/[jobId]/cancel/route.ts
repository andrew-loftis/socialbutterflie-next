import { ok, badRequest } from '@/lib/server/http';
import { updateStudioJob } from '@/lib/repositories/rebuild-repo';
import { resolveServerContext } from '@/lib/server/request-context';

export async function POST(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const context = await resolveServerContext();
  const updated = await updateStudioJob(context.workspaceId, jobId, { status: 'failed', progress: 0 });
  if (!updated) return badRequest('job not found', 404);
  return ok({ ok: true, status: 'canceled' });
}

