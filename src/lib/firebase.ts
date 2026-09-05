import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import fileConfig from '../../firebase-applet-config.json';

// Client-safe configuration: Firebase Web client configuration is safe for browser use
// and can be provided via Vite client environment variables (VITE_FIREBASE_*) or firebase-applet-config.json.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fileConfig?.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fileConfig?.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fileConfig?.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fileConfig?.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileConfig?.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fileConfig?.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || fileConfig?.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || fileConfig?.firestoreDatabaseId,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Standardized error handler conforming to FirestoreErrorInfo spec
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Strips all `undefined` values from an object, array, or nested structure
 * before sending to Firestore SDK (Zero-Crash Payload Hygiene)
 */
export function sanitizePayload<T>(val: T): T {
  if (val === undefined) {
    return undefined as any;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val;
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => sanitizePayload(item))
      .filter((item) => item !== undefined) as any;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(val)) {
    const cleaned = sanitizePayload(value);
    if (cleaned !== undefined) {
      result[key] = cleaned;
    }
  }
  return result as any;
}

/**
 * Validates initial connection to Firestore
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection warning: client is offline or network restricted.');
      return false;
    }
    // Permission denied on test/connection is expected since default rule denies it,
    // which confirms the server is reachable and active.
    return true;
  }
}

export { signInWithPopup, signOut };
