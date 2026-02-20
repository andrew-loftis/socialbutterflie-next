import { badRequest, ok } from '@/lib/server/http';
import { getInspectorEntity } from '@/lib/repositories/rebuild-repo';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind');
  const id = searchParams.get('id');

  if (!kind || !id) return badRequest('kind and id are required');

  const entity = await getInspectorEntity(kind, id);
  if (!entity) return badRequest('entity not found', 404);

  return ok(entity);
}

