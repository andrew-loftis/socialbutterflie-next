import { badRequest, ok } from '@/lib/server/http';
import { listStudioJobs, updateStudioJob } from '@/lib/repositories/rebuild-repo';
import { resolveServerContext } from '@/lib/server/request-context';

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const context = await resolveServerContext();
  const jobs = await listStudioJobs(context.workspaceId);
  const job = jobs.find((item) => item.id === jobId);
  if (!job) return badRequest('job not found', 404);
  return ok(job);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const context = await resolveServerContext();
  const patch = (await request.json().catch(() => null)) as { status?: string; progress?: number } | null;
  if (!patch) return badRequest('invalid payload');

  const updated = await updateStudioJob(context.workspaceId, jobId, {
    status: (patch.status as 'queued' | 'running' | 'succeeded' | 'failed' | 'blocked') || 'running',
    progress: typeof patch.progress === 'number' ? patch.progress : undefined,
  });

  if (!updated) return badRequest('job not found', 404);
  return ok(updated);
}

