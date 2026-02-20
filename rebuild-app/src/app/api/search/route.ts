import { ok } from '@/lib/server/http';
import { searchEntities } from '@/lib/repositories/rebuild-repo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const results = await searchEntities(q);
  return ok(results);
}

