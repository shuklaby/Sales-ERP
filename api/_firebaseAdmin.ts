import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let initializedApp: App | null = null;

export function getFirebaseAdminApp(): App | null {
  if (initializedApp) return initializedApp;
  if (getApps().length > 0) {
    initializedApp = getApp();
    return initializedApp;
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0351963882';

    if (serviceAccountJson) {
      console.log('[Firebase Admin] Initializing with FIREBASE_SERVICE_ACCOUNT_KEY JSON...');
      let parsed: any;
      try {
        parsed = JSON.parse(serviceAccountJson);
      } catch (jsonErr: any) {
        console.error('[Firebase Admin] Failed to parse JSON in FIREBASE_SERVICE_ACCOUNT_KEY:', jsonErr?.message);
        return null;
      }

      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }

      initializedApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
      console.log('[Firebase Admin] Successfully initialized from service account JSON.');
      return initializedApp;
    }

    if (clientEmail && privateKey) {
      console.log('[Firebase Admin] Initializing with FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY...');
      privateKey = privateKey.replace(/\\n/g, '\n');
      initializedApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      console.log('[Firebase Admin] Successfully initialized from environment credentials.');
      return initializedApp;
    }

    console.log('[Firebase Admin] No service account credentials detected in environment. Operating in serverless standalone mode.');
    return null;
  } catch (initErr: any) {
    console.error('[Firebase Admin] Initialization error:', initErr?.message || initErr);
    return null;
  }
}

export function getFirebaseAdminDb(): Firestore | null {
  if (cachedDb) return cachedDb;

  const app = getFirebaseAdminApp();
  if (!app) return null;

  try {
    const databaseId = process.env.FIREBASE_DATABASE_ID || 'ai-studio-4bb65925-92be-44b8-8a44-7de3a116a99d';
    try {
      cachedDb = getFirestore(app, databaseId);
    } catch {
      cachedDb = getFirestore(app);
    }
    console.log('[Firebase Admin] Firestore connection established for databaseId:', databaseId);
    return cachedDb;
  } catch (err: any) {
    console.error('[Firebase Admin] Failed to get Firestore instance:', err?.message || err);
    return null;
  }
}

export function getFirebaseAdminAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;

  const app = getFirebaseAdminApp();
  if (!app) return null;

  try {
    cachedAuth = getAuth(app);
    return cachedAuth;
  } catch (err: any) {
    console.error('[Firebase Admin] Failed to get Auth instance:', err?.message || err);
    return null;
  }
}
