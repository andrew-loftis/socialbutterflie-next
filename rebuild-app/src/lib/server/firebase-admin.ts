// Temporary fallback for local Netlify deploy on Windows where firebase-admin symlinking fails.
// Re-enable firebase-admin in CI/Linux build environments for server-side token verification.

type AdminDocSnapshot = {
  id: string;
  exists?: boolean;
  data: () => Record<string, unknown> | undefined;
};

type AdminQuerySnapshot = {
  docs: AdminDocSnapshot[];
};

type AdminCollectionRef = {
  doc: (id?: string) => AdminDocRef;
  get: () => Promise<AdminQuerySnapshot | undefined>;
  orderBy: (field: string, direction?: 'asc' | 'desc') => AdminCollectionRef;
  limit: (value: number) => AdminCollectionRef;
};

type AdminDocRef = {
  id?: string;
  get: () => Promise<AdminDocSnapshot | undefined>;
  set: (value: unknown, options?: unknown) => Promise<void>;
  collection: (path: string) => AdminCollectionRef;
};

type AdminAuth = {
  verifyIdToken: (token: string) => Promise<Record<string, unknown> & { uid: string }>;
};

type AdminDb = {
  collection: (path: string) => AdminCollectionRef;
};

export const firebaseAdminApp: null = null;
export const firebaseAdminAuth: AdminAuth | null = null;
export const firebaseAdminDb: AdminDb | null = null;
