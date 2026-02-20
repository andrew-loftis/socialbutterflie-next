import type {
  AppContext,
  CompanyProfile,
  GenerationJob,
  GlobalSearchResult,
  InspectorEntityPayload,
  UsageLedgerEvent,
} from '@/types/interfaces';

const now = new Date().toISOString();

export const demoContext: AppContext = {
  workspaceId: 'workspace-demo',
  userId: 'user-demo',
  role: 'admin',
  activeCompanyId: 'company-aurora',
};

export const demoCompanies: CompanyProfile[] = [
  {
    id: 'company-aurora',
    workspaceId: 'workspace-demo',
    name: 'Aurora Outdoors',
    slug: 'aurora-outdoors',
    status: 'active',
    completionScore: 88,
    sections: {
      identity: {
        legalName: 'Aurora Outdoors LLC',
        tagline: 'Stories in motion',
        mission: 'Inspire premium adventure lifestyles through cinematic social storytelling.',
        mascot: 'North fox',
        primaryColors: ['#D8A56A', '#F4E8D2', '#111827'],
      },
      voice: {
        tone: 'Confident, cinematic, direct',
        dos: ['Use vivid action verbs', 'Lead with outcomes'],
        donts: ['Corporate jargon', 'Overly playful language'],
        ctaStyle: 'Short command CTA',
        examples: ['Plan your next summit today.', 'Frame every story with intent.'],
      },
      visual: {
        styleKeywords: ['Cinematic', 'High contrast', 'Texture-first'],
        typography: 'Sora + Manrope',
        layoutDirection: 'Dense cards with strong rhythm',
        moodReferences: ['Noir sports editorial', 'Premium travel reels'],
      },
      audience: {
        primaryPersona: 'Creator-led outdoor brands',
        geographies: ['US', 'Canada'],
        keyObjections: ['Inconsistent branding', 'Content fatigue'],
        desiredPerception: 'Premium and operationally sharp',
      },
      content: {
        pillars: ['Behind the scenes', 'Gear highlights', 'Creator spotlights'],
        formats: ['Short videos', 'Carousel', 'Story'],
        cadence: '5 posts/week',
        goals: ['Boost profile saves', 'Increase qualified leads'],
        prohibitedTopics: ['Political controversy'],
      },
    },
    promptPacks: {
      identity: ['Describe your company in one sentence.', 'What symbols represent your brand?'],
      voice: ['What should your brand never sound like?'],
      visual: ['List three adjectives for visual direction.'],
      audience: ['Who are you trying to convert in 90 days?'],
      content: ['What content themes should repeat monthly?'],
    },
    aiContextCompiled: 'Aurora Outdoors brand context compiled for AI.',
    assets: [],
    createdBy: 'user-demo',
    updatedBy: 'user-demo',
    createdAt: now,
    updatedAt: now,
  },
];

export const demoInspectorEntities: InspectorEntityPayload[] = [
  {
    kind: 'company',
    id: 'company-aurora',
    title: 'Aurora Outdoors',
    subtitle: 'Brand Intelligence Profile',
    status: 'Active',
    summary: 'Company profile is 88% complete and ready for AI context injection.',
    versionHistory: ['v5 Voice and visual update', 'v4 Audience refinement', 'v3 Initial publish'],
    approvals: ['Creative Director approved', 'Ops approved for publishing'],
    auditLog: ['Updated 2h ago by user-demo'],
  },
  {
    kind: 'post',
    id: 'post-102',
    title: 'Weekend campaign reel',
    subtitle: 'Instagram + TikTok',
    status: 'Review',
    summary: 'Waiting for reviewer assignment before scheduling.',
    versionHistory: ['v2 Caption refined', 'v1 Draft created'],
    approvals: ['Awaiting review'],
    auditLog: ['Submitted by user-demo'],
  },
];

export const demoSearchResults: GlobalSearchResult[] = [
  { id: 'company-aurora', kind: 'company', title: 'Aurora Outdoors', subtitle: 'Brand profile', href: '/companies/company-aurora' },
  { id: 'post-102', kind: 'post', title: 'Weekend campaign reel', subtitle: 'In review', href: '/review' },
  { id: 'job-44', kind: 'studio_job', title: 'Hero banner generation', subtitle: 'Kling 3', href: '/studio/jobs/job-44' },
];

export const demoStudioJobs: GenerationJob[] = [
  {
    id: 'job-44',
    workspaceId: 'workspace-demo',
    companyId: 'company-aurora',
    requestedBy: 'user-demo',
    model: 'kling-3',
    mode: 'video',
    promptRaw: 'Generate a cinematic product reveal sequence in snowy terrain.',
    promptCompiled: 'Compiled Aurora context + cinematic product reveal sequence in snowy terrain.',
    status: 'running',
    progress: 62,
    outputRefs: [],
    createdAt: now,
    updatedAt: now,
  },
];

export const demoUsageEvents: UsageLedgerEvent[] = [
  {
    id: 'usage-1',
    workspaceId: 'workspace-demo',
    jobId: 'job-44',
    unit: 'video_generation',
    amount: 12,
    createdAt: now,
  },
];

