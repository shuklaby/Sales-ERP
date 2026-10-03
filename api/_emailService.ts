import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';
import { getFirebaseAdminDb } from './_firebaseAdmin.js';

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
