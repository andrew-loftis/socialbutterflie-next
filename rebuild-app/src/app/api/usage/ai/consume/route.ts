import { randomUUID } from 'crypto';
import { created, badRequest } from '@/lib/server/http';
import { addUsageEvent } from '@/lib/repositories/rebuild-repo';
import { resolveServerContext } from '@/lib/server/request-context';

export async function POST(request: Request) {
  const context = await resolveServerContext();
  const body = (await request.json().catch(() => null)) as {
    jobId?: string;
    unit?: 'image_generation' | 'video_generation';
    amount?: number;
  } | null;

  if (!body?.jobId || !body?.unit || typeof body.amount !== 'number') {
    return badRequest('jobId, unit, amount are required');
  }

  const payload = {
    id: `usage-${randomUUID().slice(0, 8)}`,
    workspaceId: context.workspaceId,
    jobId: body.jobId,
    unit: body.unit,
    amount: body.amount,
    createdAt: new Date().toISOString(),
  };

  const event = await addUsageEvent(context.workspaceId, payload);
  return created(event);
}

