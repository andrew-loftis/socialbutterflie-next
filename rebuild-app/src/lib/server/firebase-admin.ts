import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function readEnv(name: string) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

function normalizePrivateKey(value: string | null) {
  if (!value) return null;
  return value.replace(/\\n/g, '\n');
}

function hasAdminEnv() {
  return Boolean(readEnv('FIREBASE_PROJECT_ID') && readEnv('FIREBASE_CLIENT_EMAIL') && readEnv('FIREBASE_PRIVATE_KEY'));
}

const adminConfig = hasAdminEnv()
  ? {
      projectId: readEnv('FIREBASE_PROJECT_ID')!,
      clientEmail: readEnv('FIREBASE_CLIENT_EMAIL')!,
      privateKey: normalizePrivateKey(readEnv('FIREBASE_PRIVATE_KEY'))!,
    }
  : null;

export const firebaseAdminApp: App | null = adminConfig
  ? getApps()[0] ||
    initializeApp({
      credential: cert(adminConfig),
      projectId: adminConfig.projectId,
    })
  : null;

export const firebaseAdminAuth: Auth | null = firebaseAdminApp ? getAuth(firebaseAdminApp) : null;
export const firebaseAdminDb: Firestore | null = firebaseAdminApp ? getFirestore(firebaseAdminApp) : null;

