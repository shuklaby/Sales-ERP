import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { Auth } from 'firebase-admin/auth';

// -------------------------------------------------------------
// Data Types & Constants
// -------------------------------------------------------------
export interface StoredEmailConfig {
  provider: 'smtp' | 'resend' | 'sendgrid' | 'none';
  senderName: string;
  senderEmail: string;
  replyTo?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  apiKey?: string;
  configured?: boolean;
  status?: string;
  lastError?: string;
}

const CONFIG_FILE_PATH = path.resolve(process.cwd(), '.email-config.json');
const TMP_CONFIG_FILE_PATH = path.resolve('/tmp', '.email-config.json');

// In-memory cache across serverless invocations / Express runtime
let inMemoryEmailConfig: StoredEmailConfig | null = null;
let cachedAdminApp: App | null = null;
let cachedAdminDb: Firestore | null = null;
let cachedAdminAuth: Auth | null = null;

// -------------------------------------------------------------
// Firebase Admin Singleton (Safe for Vercel Cold Starts)
// -------------------------------------------------------------
function getFirebaseAdminApp(): App | null {
  if (cachedAdminApp) return cachedAdminApp;
  if (getApps().length > 0) {
    cachedAdminApp = getApp();
    return cachedAdminApp;
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

      cachedAdminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
      });
      return cachedAdminApp;
    }

    if (clientEmail && privateKey) {
      console.log('[Firebase Admin] Initializing with FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY...');
      privateKey = privateKey.replace(/\\n/g, '\n');
      cachedAdminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      return cachedAdminApp;
    }

    return null;
  } catch (initErr: any) {
    console.warn('[Firebase Admin] Initialization skipped or error:', initErr?.message || initErr);
    return null;
  }
}

function getFirebaseAdminDb(): Firestore | null {
  if (cachedAdminDb) return cachedAdminDb;
  const app = getFirebaseAdminApp();
  if (!app) return null;

  try {
    const databaseId = process.env.FIREBASE_DATABASE_ID || 'ai-studio-4bb65925-92be-44b8-8a44-7de3a116a99d';
    try {
      cachedAdminDb = getFirestore(app, databaseId);
    } catch {
      cachedAdminDb = getFirestore(app);
    }
    return cachedAdminDb;
  } catch (err: any) {
    console.warn('[Firebase Admin] Firestore connection warning:', err?.message || err);
    return null;
  }
}

function getFirebaseAdminAuth(): Auth | null {
  if (cachedAdminAuth) return cachedAdminAuth;
  const app = getFirebaseAdminApp();
  if (!app) return null;

  try {
    cachedAdminAuth = getAuth(app);
    return cachedAdminAuth;
  } catch (err: any) {
    console.warn('[Firebase Admin] Auth connection warning:', err?.message || err);
    return null;
  }
}

// -------------------------------------------------------------
// Email Service Operations
// -------------------------------------------------------------
export function getStoredEmailConfig(): StoredEmailConfig {
  let cfg: StoredEmailConfig = {
    provider: 'smtp',
    senderName: 'SparkGenTechnology',
    senderEmail: 'sales@sparkgentechnology.in',
    replyTo: 'sales@sparkgentechnology.in',
    smtpHost: 'smtp.titan.email',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: 'sales@sparkgentechnology.in',
  };

  if (inMemoryEmailConfig) {
    cfg = { ...cfg, ...inMemoryEmailConfig };
  }

  // 1. Try reading from filesystem (.email-config.json or /tmp/.email-config.json)
  try {
    if (fs.existsSync(TMP_CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(TMP_CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      cfg = { ...cfg, ...parsed };
    } else if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      cfg = { ...cfg, ...parsed };
    }
  } catch {
    // quiet fallback
  }

  // 2. Fallback to process.env if available (e.g. Vercel Environment Variables)
  const envHost = process.env.SMTP_HOST;
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const envFrom = process.env.EMAIL_FROM || process.env.SMTP_FROM || envUser;
  const envFromName = process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'SparkGenTechnology';
  const envReplyTo = process.env.EMAIL_REPLY_TO || process.env.SMTP_REPLY_TO || 'sales@sparkgentechnology.in';
  const envProvider = (process.env.EMAIL_PROVIDER as any) || (envHost ? 'smtp' : cfg.provider);

  if (envHost && envUser) {
    cfg = {
      ...cfg,
      provider: envProvider,
      senderName: envFromName,
      senderEmail: envFrom || 'sales@sparkgentechnology.in',
      replyTo: envReplyTo,
      smtpHost: envHost,
      smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
      smtpSecure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      smtpUser: envUser,
      smtpPass: cfg.smtpPass || envPass || '',
    };
  } else if (process.env.RESEND_API_KEY) {
    cfg = {
      ...cfg,
      provider: 'resend',
      senderName: process.env.SENDER_NAME || 'SparkGenTechnology',
      senderEmail: process.env.SENDER_EMAIL || 'sales@sparkgentechnology.in',
      apiKey: cfg.apiKey || process.env.RESEND_API_KEY,
    };
  }

  const isHealthy = cfg.status !== 'Authentication Failed';
  cfg.configured =
    isHealthy &&
    ((cfg.provider === 'smtp' && !!cfg.smtpHost && !!cfg.smtpUser && !!cfg.smtpPass) ||
    ((cfg.provider === 'resend' || cfg.provider === 'sendgrid') && !!cfg.apiKey));

  if (!cfg.status) {
    cfg.status = cfg.configured ? 'Configured' : (cfg.provider === 'none' ? 'Not Configured' : 'Not Configured');
  }

  return cfg;
}

export async function saveStoredEmailConfig(config: StoredEmailConfig): Promise<void> {
  inMemoryEmailConfig = { ...config };

  // Write to writable /tmp directory
  try {
    fs.writeFileSync(TMP_CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Email Storage] Could not write to /tmp file:', err?.message);
  }

  // Try writing to root directory if writable
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // Read-only filesystem in Vercel lambda - expected
  }

  // Sync non-secret configuration to Firestore via Firebase Admin if configured
  try {
    const adminDb = getFirebaseAdminDb();
    if (adminDb) {
      console.log('[Email Storage] Syncing email configuration to Firestore document emailSettings/default...');
      const firestoreData: Record<string, any> = {
        provider: config.provider,
        senderName: config.senderName,
        senderEmail: config.senderEmail,
        replyTo: config.replyTo || config.senderEmail,
        smtpHost: config.smtpHost || null,
        smtpPort: config.smtpPort || null,
        smtpSecure: config.smtpSecure ?? null,
        smtpUser: config.smtpUser || null,
        status: config.status || 'Configured',
        configured: !!config.configured,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Admin via Vercel API',
      };
      // Explicitly delete secrets from Firestore payload
      delete firestoreData.smtpPass;
      delete firestoreData.apiKey;

      await adminDb.collection('emailSettings').doc('default').set(firestoreData, { merge: true });
      console.log('[Email Storage] Firestore document emailSettings/default updated successfully.');
    }
  } catch (dbErr: any) {
    console.warn('[Email Storage] Could not sync to Firestore via Admin SDK:', dbErr?.message);
  }
}

export function createSmtpTransporter(config: StoredEmailConfig): Transporter {
  const port = config.smtpPort ? Number(config.smtpPort) : 465;
  // Port 465 is dedicated SMTPS (Implicit TLS) and MUST use secure: true
  const isSecure = port === 465 ? true : (config.smtpSecure !== undefined ? !!config.smtpSecure : false);

  return nodemailer.createTransport({
    host: config.smtpHost || 'smtp.titan.email',
    port,
    secure: isSecure,
    auth: {
      user: config.smtpUser?.trim() || '',
      pass: config.smtpPass || '',
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    // Keep timeouts short in serverless to prevent FUNCTION_INVOCATION_FAILED
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
}

export function formatSmtpError(err: any): { isAuth: boolean; message: string } {
  const errMsg = err?.message || String(err);
  const errCode = (err?.code || '').toUpperCase();
  const responseCode = err?.responseCode;

  if (responseCode === 535 || errCode === 'EAUTH' || errMsg.includes('535') || errMsg.includes('Invalid login') || errMsg.includes('authentication failed')) {
    return {
      isAuth: true,
      message: 'SMTP Authentication Failed: Username and password not accepted by the mail server. Please verify credentials.',
    };
  }

  if (errCode === 'ETIMEDOUT' || errCode === 'ETIME' || errMsg.includes('Greeting never received') || errMsg.includes('timeout')) {
    return {
      isAuth: false,
      message: 'SMTP Connection Timeout: Unable to reach mail server within timeout window. Host and credentials are saved.',
    };
  }

  if (errCode === 'ENOTFOUND' || errCode === 'ECONNREFUSED' || errMsg.includes('getaddrinfo ENOTFOUND')) {
    return {
      isAuth: false,
      message: 'SMTP Host Not Found: Could not resolve SMTP server address. Please verify hostname.',
    };
  }

  return {
    isAuth: false,
    message: errMsg || 'An error occurred while communicating with the email provider.',
  };
}

// -------------------------------------------------------------
// HTTP Request / Response Helpers
// -------------------------------------------------------------
async function parseJsonBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
  }

  // If stream already completed or closed by Vercel middleware, do not hang
  if (req.readableEnded || req.complete) {
    return {};
  }

  return new Promise((resolve) => {
    let raw = '';
    const safetyTimer = setTimeout(() => {
      resolve({});
    }, 500); // Strict safety timeout: never hang in serverless

    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      clearTimeout(safetyTimer);
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      clearTimeout(safetyTimer);
      resolve({});
    });
  });
}

function sendJson(res: any, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(data));
}

// -------------------------------------------------------------
// Vercel Serverless Function Handler
// -------------------------------------------------------------
export default async function handler(req: any, res: any) {
  // CORS & Preflight handling
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const startTime = Date.now();
  console.log(`[Email Config API] Received ${req.method} request`);

  try {
    // -------------------------------------------------------------
    // GET: Return safe configuration status (no secrets)
    // -------------------------------------------------------------
    if (req.method === 'GET') {
      const config = getStoredEmailConfig();
      console.log(`[Email Config API] GET processed in ${Date.now() - startTime}ms (configured: ${!!config.configured})`);

      return sendJson(res, 200, {
        success: true,
        configured: !!config.configured,
        provider: config.provider,
        senderName: config.senderName || 'SparkGenTechnology',
        senderEmail: config.senderEmail || 'sales@sparkgentechnology.in',
        replyTo: config.replyTo || 'sales@sparkgentechnology.in',
        status: config.status || (config.configured ? 'Configured' : 'Not Configured'),
        lastError: config.lastError,
        smtpHost: config.smtpHost ? `${config.smtpHost}` : 'smtp.titan.email',
        smtpPort: config.smtpPort || 465,
        smtpSecure: config.smtpPort === 465 ? true : !!config.smtpSecure,
        smtpUser: config.smtpUser || 'sales@sparkgentechnology.in',
        smtpUserMasked: config.smtpUser ? `${config.smtpUser.slice(0, 3)}***` : undefined,
        hasPassword: !!config.smtpPass,
      });
    }

    // -------------------------------------------------------------
    // POST: Save and validate email configuration
    // -------------------------------------------------------------
    if (req.method === 'POST') {
      console.log('[Email Config API] Stage 1: Parsing request body...');
      const body = await parseJsonBody(req);

      // Validate Admin authorization if Bearer token present and Firebase Admin is configured
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const adminAuth = getFirebaseAdminAuth();
        if (adminAuth && token) {
          try {
            console.log('[Email Config API] Stage 2: Verifying caller token with Firebase Admin...');
            const decoded = await adminAuth.verifyIdToken(token);
            console.log(`[Email Config API] Authenticated caller UID: ${decoded.uid}`);
          } catch (authErr: any) {
            console.warn('[Email Config API] Token verification warning:', authErr?.message);
          }
        }
      }

      console.log('[Email Config API] Stage 3: Validating configuration payload...');
      const {
        provider,
        senderName,
        senderEmail,
        replyTo,
        smtpHost,
        smtpPort,
        smtpSecure,
        smtpUser,
        smtpPass,
        apiKey,
      } = body;

      const existing = getStoredEmailConfig();

      // Basic payload validation
      const selectedProvider = provider || existing.provider || 'smtp';
      if (selectedProvider === 'smtp') {
        const effectiveHost = smtpHost !== undefined && smtpHost !== '' ? smtpHost.trim() : existing.smtpHost;
        const effectiveUser = smtpUser !== undefined && smtpUser !== '' ? smtpUser.trim() : existing.smtpUser;
        if (!effectiveHost) {
          return sendJson(res, 400, {
            success: false,
            message: 'Validation Error: SMTP Host is required.',
            error: 'SMTP Host Server is required.',
          });
        }
        if (!effectiveUser) {
          return sendJson(res, 400, {
            success: false,
            message: 'Validation Error: SMTP Username is required.',
            error: 'SMTP Username is required.',
          });
        }
      }

      const resolvedPort = smtpPort ? parseInt(smtpPort, 10) : (existing.smtpPort || 465);
      const resolvedSecure = resolvedPort === 465 ? true : (smtpSecure !== undefined ? !!smtpSecure : (existing.smtpSecure ?? true));
      // Preserve existing password if no new password entered
      const effectivePass = (smtpPass && smtpPass.trim()) ? smtpPass.trim() : existing.smtpPass;

      const updated: StoredEmailConfig = {
        provider: selectedProvider,
        senderName: (senderName && senderName.trim()) || existing.senderName || 'SparkGenTechnology',
        senderEmail: (senderEmail && senderEmail.trim()) || existing.senderEmail || 'sales@sparkgentechnology.in',
        replyTo: (replyTo && replyTo.trim()) || existing.replyTo || 'sales@sparkgentechnology.in',
        smtpHost: (smtpHost !== undefined && smtpHost !== '') ? smtpHost.trim() : (existing.smtpHost || 'smtp.titan.email'),
        smtpPort: resolvedPort,
        smtpSecure: resolvedSecure,
        smtpUser: (smtpUser !== undefined && smtpUser !== '') ? smtpUser.trim() : (existing.smtpUser || 'sales@sparkgentechnology.in'),
        smtpPass: effectivePass,
        apiKey: apiKey ? apiKey.trim() : existing.apiKey,
      };

      console.log(`[Email Config API] Stage 4: Preparing configuration (provider: ${updated.provider}, port: ${updated.smtpPort}, hasPass: ${!!updated.smtpPass})`);

      let status = 'Not Configured';
      let warning: string | undefined;

      if (updated.provider === 'smtp') {
        if (updated.smtpHost && updated.smtpUser && updated.smtpPass) {
          status = 'Configured';
          updated.status = 'Configured';
          updated.configured = true;

          // Non-blocking quick check (max 2 seconds) to avoid serverless timeout
          try {
            console.log('[Email Config API] Stage 5: Quick non-blocking socket check...');
            const testTransporter = createSmtpTransporter(updated);
            const verifyPromise = testTransporter.verify();
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Quick verification timed out')), 2000)
            );
            await Promise.race([verifyPromise, timeoutPromise]);
            console.log('[Email Config API] Quick socket check passed.');
          } catch (testErr: any) {
            console.log('[Email Config API] Quick socket check note:', testErr?.message);
            // Non-blocking warning only; do not fail configuration save
            if (testErr?.message?.includes('timed out')) {
              warning = 'Configuration saved. Use "Test Connection" to perform full SMTP handshake.';
            } else {
              const parsed = formatSmtpError(testErr);
              warning = parsed.message;
            }
          }
        } else {
          status = 'Not Configured';
          updated.status = status;
          updated.configured = false;
        }
      } else if (updated.provider === 'resend' || updated.provider === 'sendgrid') {
        if (updated.apiKey) {
          status = 'Configured';
          updated.status = status;
          updated.configured = true;
        } else {
          status = 'Not Configured';
          updated.status = status;
          updated.configured = false;
        }
      } else {
        status = 'Not Configured';
        updated.status = status;
        updated.configured = false;
      }

      console.log('[Email Config API] Stage 6: Persisting configuration server-side...');
      await saveStoredEmailConfig(updated);
      console.log(`[Email Config API] Stage 7: Save completed in ${Date.now() - startTime}ms`);

      return sendJson(res, 200, {
        success: true,
        message: warning ? `Saved: ${warning}` : 'Email provider configuration saved successfully.',
        configured: !!updated.configured,
        status: updated.status,
        warning,
        hasPassword: !!updated.smtpPass,
        config: {
          provider: updated.provider,
          senderName: updated.senderName,
          senderEmail: updated.senderEmail,
          replyTo: updated.replyTo,
          smtpHost: updated.smtpHost,
          smtpPort: updated.smtpPort,
          smtpSecure: updated.smtpSecure,
          smtpUser: updated.smtpUser,
          status: updated.status,
          configured: updated.configured,
          hasPassword: !!updated.smtpPass,
        },
      });
    }

    return sendJson(res, 405, {
      success: false,
      message: 'Method not allowed',
      error: `HTTP ${req.method} not allowed on /api/email/config`,
    });
  } catch (err: any) {
    console.error('[Email Config API] Uncaught server error:', err?.message || err);
    return sendJson(res, 500, {
      success: false,
      message: 'Failed to save email provider configuration',
      error: err?.message || 'A server error occurred while processing the email configuration.',
    });
  }
}
