import { ok } from '@/lib/server/http';
import { listUsageEvents } from '@/lib/repositories/rebuild-repo';
import { resolveServerContext } from '@/lib/server/request-context';

export async function GET() {
  const context = await resolveServerContext();
  const events = await listUsageEvents(context.workspaceId);
  const used = events.reduce((acc, event) => acc + event.amount, 0);
  const included = 500;
  return ok({ included, used, remaining: Math.max(included - used, 0), overage: Math.max(used - included, 0), events });
}

