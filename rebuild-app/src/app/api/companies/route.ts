import { randomUUID } from 'crypto';
import { created, ok, badRequest } from '@/lib/server/http';
import { listCompanies, saveCompany } from '@/lib/repositories/rebuild-repo';
import { resolveServerContext } from '@/lib/server/request-context';
import type { CompanyProfile } from '@/types/interfaces';

export async function GET() {
  const context = await resolveServerContext();
  const companies = await listCompanies(context.workspaceId);
  return ok(companies);
}

export async function POST(request: Request) {
  const context = await resolveServerContext();
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name) return badRequest('name is required');

  const now = new Date().toISOString();
  const company: CompanyProfile = {
    id: `company-${randomUUID().slice(0, 8)}`,
    workspaceId: context.workspaceId,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: 'draft',
    completionScore: 10,
    sections: {
      identity: { legalName: '', tagline: '', mission: '', mascot: '', primaryColors: [] },
      voice: { tone: '', dos: [], donts: [], ctaStyle: '', examples: [] },
      visual: { styleKeywords: [], typography: '', layoutDirection: '', moodReferences: [] },
      audience: { primaryPersona: '', geographies: [], keyObjections: [], desiredPerception: '' },
      content: { pillars: [], formats: [], cadence: '', goals: [], prohibitedTopics: [] },
    },
    promptPacks: {
      identity: [],
      voice: [],
      visual: [],
      audience: [],
      content: [],
    },
    aiContextCompiled: '',
    assets: [],
    createdBy: context.userId,
    updatedBy: context.userId,
    createdAt: now,
    updatedAt: now,
  };

  const saved = await saveCompany(context.workspaceId, company);
  return created(saved);
}

