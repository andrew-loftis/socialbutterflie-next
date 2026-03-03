/**
 * firebase-server.ts
 * ---------------------------------------------------------------------------
 * Server-side Firebase access using firebase-admin for API routes.
 * Falls back to a minimal Firestore REST wrapper when firebase-admin
 * is not available (e.g. local dev without service account).
 *
 * Environment variables:
 *   FIREBASE_PROJECT_ID          — Required
 *   FIREBASE_CLIENT_EMAIL        — Service account email
 *   FIREBASE_PRIVATE_KEY         — Service account private key (PEM, replace \\n with \n)
 * ---------------------------------------------------------------------------
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const __non_webpack_require__: (id: string) => any;

let adminApp: ReturnType<typeof initializeAdminApp> | null = null;
let adminDb: ReturnType<typeof getAdminFirestore> | null = null;

// Lazy load firebase-admin to avoid bundling issues in edge runtime
function initializeAdminApp() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = __non_webpack_require__('firebase-admin');
    if (admin.apps.length) return admin.apps[0];
    
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (projectId && clientEmail && privateKey) {
      return admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    }
    
    // Try default credentials (works in GCP/Cloud Run/Firebase hosting)
    if (projectId) {
      return admin.initializeApp({ projectId });
    }
    
    return null;
  } catch {
    console.warn('[firebase-server] firebase-admin not available, using REST fallback');
    return null;
  }
}

function getAdminFirestore() {
  try {
    if (!adminApp) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = __non_webpack_require__('firebase-admin');
    return admin.firestore();
  } catch {
    return null;
  }
}

function ensureInit() {
  if (!adminApp) {
    adminApp = initializeAdminApp();
    if (adminApp) adminDb = getAdminFirestore();
  }
  return { app: adminApp, db: adminDb };
}

// ── Server-side Firestore helpers ───────────────────────────────────────────

export async function serverGetDoc(path: string): Promise<Record<string, unknown> | null> {
  const { db } = ensureInit();
  if (db) {
    const snap = await db.doc(path).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
  // REST fallback
  return restGet(path);
}

export async function serverSetDoc(path: string, data: Record<string, unknown>): Promise<void> {
  const { db } = ensureInit();
  if (db) {
    await db.doc(path).set(data, { merge: true });
    return;
  }
  await restSet(path, data);
}

export async function serverAddDoc(collectionPath: string, data: Record<string, unknown>): Promise<string> {
  const { db } = ensureInit();
  if (db) {
    const ref = await db.collection(collectionPath).add(data);
    return ref.id;
  }
  return restAdd(collectionPath, data);
}

export async function serverQueryDocs(
  collectionPath: string,
  field: string,
  op: string,
  value: unknown,
): Promise<Array<Record<string, unknown>>> {
  const { db } = ensureInit();
  if (db) {
    const snap = await db.collection(collectionPath).where(field, op, value).get();
    return snap.docs.map((d: { id: string; data: () => Record<string, unknown> }) => ({
      id: d.id,
      ...d.data(),
    }));
  }
  return restQuery(collectionPath, field, op, value);
}

export async function serverDeleteDoc(path: string): Promise<void> {
  const { db } = ensureInit();
  if (db) {
    await db.doc(path).delete();
    return;
  }
  // REST fallback would need auth — skip for now
}

// ── REST fallback (uses Firestore REST API with API key) ────────────────────

const REST_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const REST_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

async function restGet(docPath: string): Promise<Record<string, unknown> | null> {
  if (!REST_PROJECT_ID || !REST_API_KEY) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${REST_PROJECT_ID}/databases/(default)/documents/${docPath}?key=${REST_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return firestoreDocToJson(data);
}

async function restSet(docPath: string, data: Record<string, unknown>): Promise<void> {
  if (!REST_PROJECT_ID || !REST_API_KEY) return;
  const url = `https://firestore.googleapis.com/v1/projects/${REST_PROJECT_ID}/databases/(default)/documents/${docPath}?key=${REST_API_KEY}`;
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: jsonToFirestoreFields(data) }),
  });
}

async function restAdd(collectionPath: string, data: Record<string, unknown>): Promise<string> {
  if (!REST_PROJECT_ID || !REST_API_KEY) return `mem_${Date.now()}`;
  const url = `https://firestore.googleapis.com/v1/projects/${REST_PROJECT_ID}/databases/(default)/documents/${collectionPath}?key=${REST_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: jsonToFirestoreFields(data) }),
  });
  const result = await res.json();
  // Extract doc ID from name
  const name: string = result.name || '';
  return name.split('/').pop() || `mem_${Date.now()}`;
}

async function restQuery(
  collectionPath: string,
  field: string,
  _op: string,
  value: unknown,
): Promise<Array<Record<string, unknown>>> {
  // Simplified: just get all docs and filter client-side
  if (!REST_PROJECT_ID || !REST_API_KEY) return [];
  const url = `https://firestore.googleapis.com/v1/projects/${REST_PROJECT_ID}/databases/(default)/documents/${collectionPath}?key=${REST_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const docs = (data.documents || []).map(firestoreDocToJson).filter(Boolean);
  return docs.filter((d: Record<string, unknown> | null) => d && d[field] === value);
}

// ── Firestore REST <-> JSON conversion helpers ─────────────────────────────

function firestoreDocToJson(doc: Record<string, unknown>): Record<string, unknown> | null {
  if (!doc || !doc.fields) return null;
  const fields = doc.fields as Record<string, Record<string, unknown>>;
  const result: Record<string, unknown> = {};
  const name = (doc.name as string) || '';
  result.id = name.split('/').pop() || '';
  for (const [key, val] of Object.entries(fields)) {
    result[key] = firestoreValueToJs(val);
  }
  return result;
}

function firestoreValueToJs(val: Record<string, unknown>): unknown {
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('mapValue' in val) {
    const map = val.mapValue as Record<string, unknown>;
    return firestoreDocToJson({ fields: (map.fields || {}), name: '' });
  }
  if ('arrayValue' in val) {
    const arr = val.arrayValue as Record<string, unknown>;
    return ((arr.values || []) as Array<Record<string, unknown>>).map(firestoreValueToJs);
  }
  return null;
}

function jsonToFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'id') continue;
    fields[key] = jsToFirestoreValue(val);
  }
  return fields;
}

function jsToFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(jsToFirestoreValue) } };
  }
  if (typeof val === 'object') {
    return { mapValue: { fields: jsonToFirestoreFields(val as Record<string, unknown>) } };
  }
  return { stringValue: String(val) };
}
