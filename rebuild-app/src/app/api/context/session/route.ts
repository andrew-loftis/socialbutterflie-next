import { ok } from '@/lib/server/http';
import { resolveServerContext } from '@/lib/server/request-context';

export async function GET() {
  const context = await resolveServerContext();
  return ok(context);
}

