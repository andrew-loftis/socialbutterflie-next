import { ok, badRequest } from '@/lib/server/http';

export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const body = (await request.json().catch(() => null)) as { destination?: 'build' | 'review' | 'library' } | null;
  const destination = body?.destination;
  if (!destination) return badRequest('destination is required');

  return ok({
    jobId,
    destination,
    status: 'queued_for_destination',
  });
}

