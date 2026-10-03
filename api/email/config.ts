import type { IncomingMessage, ServerResponse } from 'http';
import {
  getStoredEmailConfig,
  saveStoredEmailConfig,
  createSmtpTransporter,
  formatSmtpError,
  StoredEmailConfig,
} from '../_emailService';

// Helper to parse JSON body from incoming request in Node / Vercel Serverless
async function parseJsonBody(req: any): Promise<any> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
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

export default async function handler(req: any, res: any) {
  // CORS & Options
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const config = getStoredEmailConfig();
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

    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
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
      const resolvedPort = smtpPort ? parseInt(smtpPort, 10) : (existing.smtpPort || 465);
      const resolvedSecure = resolvedPort === 465 ? true : (smtpSecure !== undefined ? !!smtpSecure : (existing.smtpSecure ?? true));
      const effectivePass = (smtpPass && smtpPass.trim()) ? smtpPass.trim() : existing.smtpPass;

      const updated: StoredEmailConfig = {
        provider: provider || 'smtp',
        senderName: (senderName && senderName.trim()) || existing.senderName || 'SparkGenTechnology',
        senderEmail: (senderEmail && senderEmail.trim()) || existing.senderEmail || 'sales@sparkgentechnology.in',
        replyTo: (replyTo && replyTo.trim()) || 'sales@sparkgentechnology.in',
        smtpHost: (smtpHost !== undefined && smtpHost !== '') ? smtpHost.trim() : (existing.smtpHost || 'smtp.titan.email'),
        smtpPort: resolvedPort,
        smtpSecure: resolvedSecure,
        smtpUser: (smtpUser !== undefined && smtpUser !== '') ? smtpUser.trim() : (existing.smtpUser || 'sales@sparkgentechnology.in'),
        smtpPass: effectivePass,
        apiKey: apiKey ? apiKey.trim() : existing.apiKey,
      };

      let status = 'Not Configured';
      let warning: string | undefined;

      if (updated.provider === 'smtp') {
        if (updated.smtpHost && updated.smtpUser && updated.smtpPass) {
          try {
            const testTransporter = createSmtpTransporter(updated);
            await testTransporter.verify();
            status = 'Configured';
            updated.status = 'Configured';
            updated.configured = true;
            updated.lastError = undefined;
          } catch (testErr: any) {
            const parsed = formatSmtpError(testErr);
            status = parsed.isAuth ? 'Authentication Failed' : 'Connection Error';
            warning = parsed.message;
            updated.status = status;
            updated.configured = false;
            updated.lastError = parsed.message;
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

      saveStoredEmailConfig(updated);

      return sendJson(res, 200, {
        success: true,
        message: warning ? `Saved with notice: ${warning}` : 'Email provider configuration saved successfully.',
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
    return sendJson(res, 500, {
      success: false,
      message: 'Failed to save email provider configuration',
      error: err?.message || 'Internal server error while saving email configuration',
    });
  }
}
