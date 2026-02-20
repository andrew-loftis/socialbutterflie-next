import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firestore, firebaseStorage } from '@/lib/firebase/client';
import type { CompanyProfile } from '@/types/interfaces';

type CreateCompanyInput = {
  workspaceId: string;
  userId: string;
  name: string;
  branding: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  coverFile?: File | null;
};

const memoryCompanies: CompanyProfile[] = [];
const memoryListeners = new Set<(value: CompanyProfile[]) => void>();
const memoryPreferences = new Map<string, { lastActiveWorkspaceId?: string; lastActiveCompanyId?: string }>();

function notifyMemoryCompanies() {
  const sorted = [...memoryCompanies].sort((a, b) => a.name.localeCompare(b.name));
  for (const listener of memoryListeners) listener(sorted);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function createEmptyCompanyProfile(input: CreateCompanyInput): CompanyProfile {
  const now = new Date().toISOString();
  return {
    id: `company-${crypto.randomUUID().slice(0, 8)}`,
    workspaceId: input.workspaceId,
    name: input.name.trim(),
    slug: slugify(input.name),
    status: 'draft',
    completionScore: 0,
    coverAssetUrl: '',
    branding: {
      primary: input.branding.primary,
      secondary: input.branding.secondary || '',
      accent: input.branding.accent || '',
    },
    memberCount: 0,
    sections: {
      identity: { legalName: '', tagline: '', mission: '', mascot: '', primaryColors: [input.branding.primary] },
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
    createdBy: input.userId,
    updatedBy: input.userId,
    createdAt: now,
    updatedAt: now,
  };
}

export async function uploadCompanyCover(workspaceId: string, companyId: string, file: File) {
  if (!firebaseStorage) return '';
  const path = `workspaces/${workspaceId}/companies/${companyId}/cover/${Date.now()}-${file.name}`;
  const coverRef = ref(firebaseStorage, path);
  await uploadBytes(coverRef, file);
  return getDownloadURL(coverRef);
}

export async function createCompany(input: CreateCompanyInput): Promise<CompanyProfile> {
  const company = createEmptyCompanyProfile(input);
  if (input.coverFile) {
    company.coverAssetUrl = await uploadCompanyCover(input.workspaceId, company.id, input.coverFile);
  }

  if (!firestore) {
    memoryCompanies.push(company);
    notifyMemoryCompanies();
    return company;
  }

  const companiesRef = collection(firestore, 'workspaces', input.workspaceId, 'companies');
  await setDoc(doc(companiesRef, company.id), company);
  return company;
}

export function subscribeCompanies(
  workspaceId: string,
  callback: (companies: CompanyProfile[]) => void
): Unsubscribe {
  if (!firestore) {
    memoryListeners.add(callback);
    callback([...memoryCompanies].sort((a, b) => a.name.localeCompare(b.name)));
    return () => {
      memoryListeners.delete(callback);
    };
  }

  const companiesRef = collection(firestore, 'workspaces', workspaceId, 'companies');
  return onSnapshot(companiesRef, (snapshot) => {
    const companies = snapshot.docs
      .map((entry) => entry.data() as CompanyProfile)
      .sort((a, b) => a.name.localeCompare(b.name));
    callback(companies);
  });
}

export async function updateCompany(
  workspaceId: string,
  companyId: string,
  patch: Partial<CompanyProfile>
): Promise<void> {
  if (!firestore) {
    const index = memoryCompanies.findIndex((company) => company.id === companyId);
    if (index >= 0) {
      memoryCompanies[index] = {
        ...memoryCompanies[index],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      notifyMemoryCompanies();
    }
    return;
  }

  const companyRef = doc(firestore, 'workspaces', workspaceId, 'companies', companyId);
  await updateDoc(companyRef, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCompanyById(
  workspaceId: string,
  companyId: string
): Promise<CompanyProfile | null> {
  if (!firestore) {
    return memoryCompanies.find((company) => company.id === companyId) || null;
  }

  const companyRef = doc(firestore, 'workspaces', workspaceId, 'companies', companyId);
  const snapshot = await getDoc(companyRef);
  if (!snapshot.exists()) return null;
  return snapshot.data() as CompanyProfile;
}

export async function setUserCompanyPreference(
  userId: string,
  workspaceId: string,
  companyId: string | null
) {
  if (!firestore) {
    memoryPreferences.set(userId, {
      lastActiveWorkspaceId: workspaceId,
      lastActiveCompanyId: companyId || undefined,
    });
    return;
  }

  const prefRef = doc(firestore, 'users', userId, 'preferences', 'app');
  await setDoc(
    prefRef,
    {
      lastActiveWorkspaceId: workspaceId,
      lastActiveCompanyId: companyId,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function getUserCompanyPreference(userId: string) {
  if (!firestore) {
    return (
      memoryPreferences.get(userId) || {
        lastActiveWorkspaceId: '',
        lastActiveCompanyId: '',
      }
    );
  }

  const prefRef = doc(firestore, 'users', userId, 'preferences', 'app');
  const snapshot = await getDoc(prefRef);
  if (!snapshot.exists()) {
    return {
      lastActiveWorkspaceId: '',
      lastActiveCompanyId: '',
    };
  }
  return snapshot.data() as { lastActiveWorkspaceId?: string; lastActiveCompanyId?: string };
}

export async function incrementCompanyMemberCount(workspaceId: string, companyId: string, delta: number) {
  const company = await getCompanyById(workspaceId, companyId);
  if (!company) return;
  const next = Math.max(0, (company.memberCount || 0) + delta);
  await updateCompany(workspaceId, companyId, { memberCount: next });
}
