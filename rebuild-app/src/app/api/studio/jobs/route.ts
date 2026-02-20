import { randomUUID } from 'crypto';
import { created, ok, badRequest } from '@/lib/server/http';
import { compileCompanyContext, createStudioJob, getCompany, listStudioJobs } from '@/lib/repositories/rebuild-repo';
import { resolveServerContext } from '@/lib/server/request-context';
import type { GenerationJob } from '@/types/interfaces';

export async function GET() {
  const context = await resolveServerContext();
  const jobs = await listStudioJobs(context.workspaceId);
  return ok(jobs);
}

export async function POST(request: Request) {
  const context = await resolveServerContext();
  const body = (await request.json().catch(() => null)) as {
    companyId?: string;
    model?: 'nano-banana-pro' | 'kling-3';
    mode?: 'image' | 'video';
    prompt?: string;
  } | null;

  if (!body?.companyId || !body?.model || !body?.mode || !body?.prompt) {
    return badRequest('companyId, model, mode, and prompt are required');
  }

  const company = await getCompany(context.workspaceId, body.companyId);
  if (!company) return badRequest('company not found', 404);

  const compiled = compileCompanyContext(company);
  const now = new Date().toISOString();
  const job: GenerationJob = {
    id: `job-${randomUUID().slice(0, 8)}`,
    workspaceId: context.workspaceId,
    companyId: body.companyId,
    requestedBy: context.userId,
    model: body.model,
    mode: body.mode,
    promptRaw: body.prompt,
    promptCompiled: `${compiled.compiledPrompt}\n\n${body.prompt}`,
    negativePrompt: compiled.negativePrompt,
    status: 'queued',
    progress: 0,
    outputRefs: [],
    createdAt: now,
    updatedAt: now,
  };

  const saved = await createStudioJob(context.workspaceId, job);
  return created(saved);
}

