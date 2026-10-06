import nodemailer from 'nodemailer';
import { getStoredEmailConfig } from '../_emailService';
import {
  findProposalInFirestore,
  patchProposalInFirestore,
  createDocumentInFirestore,
} from '../_firestoreRest';

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

  if (req.readableEnded || req.complete) return {};

  return new Promise((resolve) => {
    let raw = '';
    const timer = setTimeout(() => resolve({}), 500);
    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      clearTimeout(timer);
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      clearTimeout(timer);
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

async function sendProposalAcceptedEmail(proposalNumber: string, customerEmail?: string, customerName?: string) {
  try {
    const config = getStoredEmailConfig();
    const effectivePass = config.smtpPass || process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

    if (!effectivePass || !config.smtpUser) {
      console.log('[Auto-Email Notice] SMTP not fully configured, skipping acceptance email.');
      return;
    }

    const sender = `"${config.senderName || 'SparkGenTechnology'}" <${config.senderEmail || 'sales@sparkgentechnology.in'}>`;
    const recipient = customerEmail && customerEmail.includes('@') ? customerEmail : (config.senderEmail || 'sales@sparkgentechnology.in');
    const subject = `Proposal Accepted - ${proposalNumber}`;

    const textContent = `Dear ${customerName || 'Valued Client'},\n\nThank you for accepting commercial proposal ${proposalNumber}.\nOur commercial desk has registered your acceptance.\n\nSparkGenTechnology SalesSphere\nsales@sparkgentechnology.in`;

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 20px;">Proposal Accepted Successfully</h2>
          <p style="color: #10b981; margin: 4px 0 0 0; font-size: 13px; font-weight: 600;">SparkGenTechnology Commercial Desk</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Dear <strong>${customerName || 'Valued Client'}</strong>,
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Thank you for accepting commercial proposal <strong>${proposalNumber}</strong>. Your acceptance has been securely registered in our system.
        </p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #166534; font-size: 13px; font-weight: bold;">✓ Commercial Acceptance Confirmed</p>
          <p style="margin: 4px 0 0 0; color: #15803d; font-size: 12px;">Proposal Number: <strong>${proposalNumber}</strong></p>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          SparkGenTechnology SalesSphere • sales@sparkgentechnology.in
        </p>
      </div>
    `;

    const port = config.smtpPort ? Number(config.smtpPort) : 465;
    const isSecure = port === 465 ? true : (config.smtpSecure !== undefined ? !!config.smtpSecure : false);

    const transporter = nodemailer.createTransport({
      host: config.smtpHost || 'smtp.titan.email',
      port,
      secure: isSecure,
      auth: {
        user: config.smtpUser.trim(),
        pass: effectivePass,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    });

    await transporter.sendMail({
      from: sender,
      to: recipient,
      cc: 'sales@sparkgentechnology.in',
      subject,
      text: textContent,
      html: htmlContent,
    });
    console.log(`[Auto-Email] Sent "${subject}" to ${recipient}`);
  } catch (err: any) {
    console.warn('[Auto-Email Notice] Could not send acceptance confirmation email (non-blocking):', err?.message);
  }
}

export default async function handler(req: any, res: any) {
  const origin = req.headers?.origin || 'https://weberp.sparkgentechnology.in';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }

  try {
    const body = await parseJsonBody(req);
    const { proposalId, proposalNumber, viewToken, customerName, clientName } = body;

    const lookupKey = proposalId || viewToken;
    const found = await findProposalInFirestore(lookupKey, proposalNumber);

    if (!found) {
      return sendJson(res, 404, {
        success: false,
        error: 'Unable to locate proposal document. Please verify the link or contact support.',
      });
    }

    const dbProposal = found.data;
    const currentStatus = String(dbProposal.status || '').toUpperCase();

    if (currentStatus === 'CANCELLED') {
      return sendJson(res, 400, {
        success: false,
        error: 'This proposal has been cancelled.',
      });
    }

    // Expiry verification
    if (dbProposal.validUntil) {
      const today = new Date().toISOString().split('T')[0];
      if (dbProposal.validUntil < today && currentStatus !== 'ACCEPTED') {
        return sendJson(res, 400, {
          success: false,
          error: 'This proposal has expired.',
        });
      }
    }

    const nowIso = new Date().toISOString();
    const finalClientName = (
      customerName ||
      clientName ||
      dbProposal.customerSnapshot?.contactPerson ||
      dbProposal.customerName ||
      'Authorized Customer Representative'
    ).trim();

    const grandTotal = Number(dbProposal.grandTotal || 0);
    const paidAmount = Number(dbProposal.paidAmount || dbProposal.amountPaid || 0);
    const balanceDue = dbProposal.balanceDue !== undefined ? Number(dbProposal.balanceDue) : Math.max(0, grandTotal - paidAmount);

    // 9. DUPLICATE ACCEPTANCE GUARD:
    // If proposal is already accepted, do not create another acceptance record.
    if (currentStatus === 'ACCEPTED' && dbProposal.acceptedAt) {
      return sendJson(res, 200, {
        success: true,
        alreadyAccepted: true,
        message: 'This proposal has already been accepted.',
        status: 'Accepted',
        proposalStatus: 'ACCEPTED',
        acceptedBy: dbProposal.acceptedBy,
        acceptedAt: dbProposal.acceptedAt,
        amountPayable: grandTotal,
        amountPaid: paidAmount,
        balanceDue,
        paymentStatus: dbProposal.paymentStatus || (paidAmount >= grandTotal ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID')),
      });
    }

    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || 'web-client';
    const userAgent = (req.headers?.['user-agent'] as string || '').slice(0, 200) || 'browser';

    const newPaymentStatus = paidAmount >= grandTotal ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

    // Update Proposal Document in Firestore
    await patchProposalInFirestore(found.id, {
      status: 'Accepted',
      acceptedAt: nowIso,
      acceptedBy: finalClientName,
      customerIp: ip,
      customerDevice: userAgent,
      paymentStatus: newPaymentStatus,
      paidAmount,
      amountPaid: paidAmount,
      balanceDue,
      updatedAt: nowIso,
    });

    // Create Activity Log
    const actId = `act_${Date.now()}`;
    createDocumentInFirestore('activities', actId, {
      id: actId,
      activityId: actId,
      customerId: dbProposal.customerId || '',
      userId: 'customer_link',
      userName: finalClientName,
      type: 'PROPOSAL_ACCEPTED',
      title: `Customer accepted proposal ${dbProposal.proposalNumber || found.id}`,
      description: `Customer accepted proposal ${dbProposal.proposalNumber || found.id}`,
      relatedId: found.id,
      timestamp: nowIso,
      createdAt: nowIso,
    }).catch(console.warn);

    // Create Admin Notification
    const notifId = `notif_${Date.now()}`;
    createDocumentInFirestore('notifications', notifId, {
      id: notifId,
      notificationId: `NOTIF-${Date.now().toString().slice(-6)}`,
      userId: dbProposal.assignedEmployeeId || 'all_admins',
      type: 'PROPOSAL_ACCEPTED',
      title: `Customer accepted Proposal ${dbProposal.proposalNumber || found.id}`,
      message: `Customer accepted Proposal ${dbProposal.proposalNumber || found.id}`,
      relatedId: found.id,
      relatedType: 'proposal',
      read: false,
      createdAt: nowIso,
    }).catch(console.warn);

    // Trigger auto email via Titan Mail (non-blocking)
    sendProposalAcceptedEmail(
      dbProposal.proposalNumber || 'Proposal',
      dbProposal.customerEmail || dbProposal.customerSnapshot?.email,
      finalClientName
    ).catch(console.warn);

    return sendJson(res, 200, {
      success: true,
      message: 'Proposal Accepted Successfully',
      status: 'Accepted',
      proposalStatus: 'ACCEPTED',
      acceptedBy: finalClientName,
      acceptedAt: nowIso,
      amountPayable: grandTotal,
      amountPaid: paidAmount,
      balanceDue,
      paymentStatus: newPaymentStatus,
    });
  } catch (err: any) {
    console.error('[API proposal/accept] Unhandled error:', err);
    return sendJson(res, 500, {
      success: false,
      error: 'Unable to accept proposal. Please try again or contact support.',
    });
  }
}
