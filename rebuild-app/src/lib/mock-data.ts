import type {
  AppContext,
  CompanyProfile,
  GenerationJob,
  GlobalSearchResult,
  InspectorEntityPayload,
  UsageLedgerEvent,
} from '@/types/interfaces';

export const demoContext: AppContext = {
  workspaceId: 'workspace-primary',
  userId: 'anonymous',
  role: 'viewer',
  activeCompanyId: null,
  companyGateSeenInSession: false,
};

export const demoCompanies: CompanyProfile[] = [];
export const demoInspectorEntities: InspectorEntityPayload[] = [];
export const demoSearchResults: GlobalSearchResult[] = [];
export const demoStudioJobs: GenerationJob[] = [];
export const demoUsageEvents: UsageLedgerEvent[] = [];

