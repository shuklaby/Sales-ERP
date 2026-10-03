import fs from 'fs';
import path from 'path';
import nodemailer, { Transporter } from 'nodemailer';

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

function getStoredEmailConfig(): StoredEmailConfig {
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

  return cfg;
}

function createSmtpTransporter(config: StoredEmailConfig): Transporter {
  const port = config.smtpPort ? Number(config.smtpPort) : 465;
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
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
}

function formatSmtpError(err: any): { isAuth: boolean; message: string } {
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

function sendJson(res: any, statusCode: number, data: any) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, {
      success: false,
      message: 'Method not allowed',
      error: 'Only POST is supported on /api/email/test-connection',
    });
  }

  try {
    const config = getStoredEmailConfig();

    if (config.provider === 'smtp') {
      if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
        return sendJson(res, 400, {
          success: false,
          error: 'SMTP host, username, and password are required. Please save credentials first.',
        });
      }

      try {
        const transporter = createSmtpTransporter(config);
        const verifyPromise = transporter.verify();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SMTP handshake timed out after 5 seconds')), 5000)
        );
        await Promise.race([verifyPromise, timeoutPromise]);
        return sendJson(res, 200, {
          success: true,
          message: 'SMTP connection verified successfully.',
        });
      } catch (smtpErr: any) {
        const parsed = formatSmtpError(smtpErr);
        return sendJson(res, 400, {
          success: false,
          error: parsed.message,
          isAuth: parsed.isAuth,
        });
      }
    } else if (config.provider === 'resend') {
      if (!config.apiKey) {
        return sendJson(res, 400, { success: false, error: 'Resend API key is required.' });
      }
      return sendJson(res, 200, {
        success: true,
        message: 'Resend API key configured and ready.',
      });
    } else if (config.provider === 'sendgrid') {
      if (!config.apiKey) {
        return sendJson(res, 400, { success: false, error: 'SendGrid API key is required.' });
      }
      return sendJson(res, 200, {
        success: true,
        message: 'SendGrid API key configured and ready.',
      });
    } else {
      return sendJson(res, 400, {
        success: false,
        error: 'No email dispatch provider is currently configured.',
      });
    }
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      message: 'Connection test failed',
      error: err?.message || 'Internal error while verifying mail connection',
    });
  }
}
