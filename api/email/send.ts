import {
  getStoredEmailConfig,
  createSmtpTransporter,
  formatSmtpError,
} from '../_emailService';

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
      error: 'Only POST is supported on /api/email/send',
    });
  }

  try {
    const config = getStoredEmailConfig();
    const body = await parseJsonBody(req);
    const { to, cc, bcc, subject, body: emailBody, html, attachments } = body;

    if (!to) {
      return sendJson(res, 400, {
        success: false,
        error: 'Recipient email address (to) is required.',
      });
    }

    if (config.provider === 'smtp') {
      if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
        return sendJson(res, 400, {
          success: false,
          error: 'SMTP server is not fully configured. Please configure email settings first.',
        });
      }

      const transporter = createSmtpTransporter(config);
      const fromAddress = `"${config.senderName || 'SparkGenTechnology'}" <${config.senderEmail || 'sales@sparkgentechnology.in'}>`;
      const replyToAddress = config.replyTo || config.senderEmail || 'sales@sparkgentechnology.in';

      const mailOptions: any = {
        from: fromAddress,
        to,
        cc: cc || undefined,
        bcc: bcc || undefined,
        replyTo: replyToAddress,
        subject: subject || 'Notice from SparkGenTechnology',
        text: emailBody || '',
        html: html || undefined,
      };

      if (attachments && Array.isArray(attachments)) {
        mailOptions.attachments = attachments.map((att: any) => ({
          filename: att.filename,
          content: att.content ? Buffer.from(att.content, 'base64') : undefined,
          path: att.path,
          contentType: att.contentType,
        }));
      }

      try {
        const info = await transporter.sendMail(mailOptions);
        return sendJson(res, 200, {
          success: true,
          status: 'Sent',
          providerMessageId: info.messageId,
          sentAt: new Date().toISOString(),
        });
      } catch (smtpErr: any) {
        const parsed = formatSmtpError(smtpErr);
        return sendJson(res, 400, {
          success: false,
          status: 'Failed',
          error: parsed.message,
          isAuth: parsed.isAuth,
        });
      }
    }

    return sendJson(res, 400, {
      success: false,
      error: `Email provider '${config.provider}' is not supported for direct dispatch.`,
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      message: 'Email dispatch failed',
      error: err?.message || 'Internal server error while sending email',
    });
  }
}
