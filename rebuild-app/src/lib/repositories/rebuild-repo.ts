import { demoCompanies, demoInspectorEntities, demoSearchResults, demoStudioJobs, demoUsageEvents } from '@/lib/mock-data';
import { firebaseAdminDb } from '@/lib/server/firebase-admin';
import type {
  CompanyProfile,
  CompiledContextPayload,
  GenerationJob,
  GlobalSearchResult,
  InspectorEntityPayload,
  UsageLedgerEvent,
} from '@/types/interfaces';

const memory = {
  companies: [...demoCompanies],
  jobs: [...demoStudioJobs],
  usage: [...demoUsageEvents],
};

function workspaceBase(workspaceId: string) {
  return firebaseAdminDb?.collection('workspaces').doc(workspaceId);
}

export async function listCompanies(workspaceId: string): Promise<CompanyProfile[]> {
  if (!firebaseAdminDb) return memory.companies;
  const snap = await workspaceBase(workspaceId)?.collection('companies').get();
  return (snap?.docs.map((doc) => ({ id: doc.id, ...doc.data() })) || []) as CompanyProfile[];
}

export async function getCompany(workspaceId: string, companyId: string): Promise<CompanyProfile | null> {
  if (!firebaseAdminDb) return memory.companies.find((c) => c.id === companyId) || null;
  const snap = await workspaceBase(workspaceId)?.collection('companies').doc(companyId).get();
  if (!snap?.exists) return null;
  return { id: snap.id, ...snap.data() } as CompanyProfile;
}

export async function saveCompany(workspaceId: string, company: CompanyProfile): Promise<CompanyProfile> {
  if (!firebaseAdminDb) {
    const idx = memory.companies.findIndex((c) => c.id === company.id);
    if (idx >= 0) memory.companies[idx] = company;
    else memory.companies.unshift(company);
    return company;
  }

  const ref = workspaceBase(workspaceId)?.collection('companies').doc(company.id);
  await ref?.set(
    {
      ...company,
      id: undefined,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  const latest = await ref?.get();
  const nextData = (latest?.data() || company) as Partial<CompanyProfile>;
  const rest = { ...nextData };
  delete (rest as { id?: string }).id;
  return { id: latest?.id || company.id, ...rest } as CompanyProfile;
}

export async function addCompanyVersion(workspaceId: string, companyId: string, notes: string, userId: string) {
  if (!firebaseAdminDb) {
    return {
      id: `version-${Date.now()}`,
      companyId,
      createdBy: userId,
      notes,
      createdAt: new Date().toISOString(),
    };
  }
  const ref = workspaceBase(workspaceId)?.collection('companies').doc(companyId).collection('versions').doc();
  const payload = {
    companyId,
    createdBy: userId,
    notes,
    createdAt: new Date().toISOString(),
  };
  await ref?.set(payload);
  return { id: ref?.id || `version-${Date.now()}`, ...payload };
}

export async function listStudioJobs(workspaceId: string): Promise<GenerationJob[]> {
  if (!firebaseAdminDb) return memory.jobs;
  const snap = await workspaceBase(workspaceId)?.collection('generationJobs').orderBy('createdAt', 'desc').limit(50).get();
  return (snap?.docs.map((doc) => ({ id: doc.id, ...doc.data() })) || []) as GenerationJob[];
}

export async function createStudioJob(workspaceId: string, job: GenerationJob): Promise<GenerationJob> {
  if (!firebaseAdminDb) {
    memory.jobs.unshift(job);
    return job;
  }
  const ref = workspaceBase(workspaceId)?.collection('generationJobs').doc(job.id);
  await ref?.set({ ...job, id: undefined });
  return job;
}

export async function updateStudioJob(workspaceId: string, jobId: string, patch: Partial<GenerationJob>) {
  if (!firebaseAdminDb) {
    const idx = memory.jobs.findIndex((job) => job.id === jobId);
    if (idx >= 0) {
      memory.jobs[idx] = { ...memory.jobs[idx], ...patch, updatedAt: new Date().toISOString() };
      return memory.jobs[idx];
    }
    return null;
  }
  const ref = workspaceBase(workspaceId)?.collection('generationJobs').doc(jobId);
  await ref?.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
  const latest = await ref?.get();
  return latest?.exists ? ({ id: latest.id, ...latest.data() } as GenerationJob) : null;
}

export async function listUsageEvents(workspaceId: string): Promise<UsageLedgerEvent[]> {
  if (!firebaseAdminDb) return memory.usage;
  const snap = await workspaceBase(workspaceId)?.collection('usageMeters').orderBy('createdAt', 'desc').limit(100).get();
  return (snap?.docs.map((doc) => ({ id: doc.id, ...doc.data() })) || []) as UsageLedgerEvent[];
}

export async function addUsageEvent(workspaceId: string, event: UsageLedgerEvent) {
  if (!firebaseAdminDb) {
    memory.usage.unshift(event);
    return event;
  }
  const ref = workspaceBase(workspaceId)?.collection('usageMeters').doc(event.id);
  await ref?.set({ ...event, id: undefined });
  return event;
}

export async function getInspectorEntity(kind: string, id: string): Promise<InspectorEntityPayload | null> {
  if (kind === 'company') {
    const company = memory.companies.find((item) => item.id === id);
    if (company) {
      return {
        kind: 'company',
        id: company.id,
        title: company.name,
        subtitle: 'Company Brand Intelligence',
        status: `${company.completionScore}% complete`,
        summary: company.sections.identity.mission,
        versionHistory: ['v3 Published profile', 'v2 Voice tuning', 'v1 Initial intake'],
        approvals: ['Approved by admin'],
        auditLog: [`Updated ${company.updatedAt}`],
      };
    }
  }
  return demoInspectorEntities.find((item) => item.kind === kind && item.id === id) || null;
}

export async function searchEntities(query: string): Promise<GlobalSearchResult[]> {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const companyMatches = memory.companies
    .filter((company) => company.name.toLowerCase().includes(q))
    .map((company) => ({
      id: company.id,
      kind: 'company' as const,
      title: company.name,
      subtitle: `${company.completionScore}% complete`,
      href: `/companies/${company.id}`,
    }));

  return [...companyMatches, ...demoSearchResults.filter((item) => item.title.toLowerCase().includes(q))].slice(0, 15);
}

export function compileCompanyContext(company: CompanyProfile): CompiledContextPayload {
  const identity = company.sections.identity;
  const voice = company.sections.voice;
  const visual = company.sections.visual;
  const audience = company.sections.audience;
  const content = company.sections.content;

  return {
    companyId: company.id,
    compiledPrompt: [
      `Brand: ${company.name} - ${identity.tagline}`,
      `Mission: ${identity.mission}`,
      `Voice: ${voice.tone}. Use CTA style: ${voice.ctaStyle}`,
      `Visual: ${visual.styleKeywords.join(', ')}. Typography: ${visual.typography}`,
      `Audience: ${audience.primaryPersona}. Desired perception: ${audience.desiredPerception}`,
      `Content pillars: ${content.pillars.join(', ')}`,
      `Formats: ${content.formats.join(', ')}`,
    ].join('\n'),
    negativePrompt: `Avoid: ${[...voice.donts, ...content.prohibitedTopics].join(', ')}`,
    contextWeights: {
      identity: 0.2,
      voice: 0.25,
      visual: 0.25,
      audience: 0.15,
      content: 0.15,
    },
  };
}



