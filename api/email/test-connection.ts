import {
  getStoredEmailConfig,
  createSmtpTransporter,
  formatSmtpError,
} from '../_emailService.js';

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
