import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { getStoredEmailConfig } from '../../_emailService';
import {
  findProposalInFirestore,
  patchProposalInFirestore,
  createDocumentInFirestore,
} from '../../_firestoreRest';

function getStoredPaymentConfig(): any {
  const tmpPath = path.resolve('/tmp', '.payment-config.json');
  const rootPath = path.resolve(process.cwd(), '.payment-config.json');

  let cfg: any = {
    gateway: 'cashfree',
    environment: 'Test',
    cashfreeEnvironment: 'Sandbox',
  };

  try {
    if (fs.existsSync(tmpPath)) {
      cfg = { ...cfg, ...JSON.parse(fs.readFileSync(tmpPath, 'utf-8')) };
    } else if (fs.existsSync(rootPath)) {
      cfg = { ...cfg, ...JSON.parse(fs.readFileSync(rootPath, 'utf-8')) };
    }
  } catch {}

  const cfAppId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
  const cfSecret = process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET;
  const cfEnv = process.env.CASHFREE_ENV || process.env.CASHFREE_ENVIRONMENT;

  if (cfAppId) cfg.cashfreeAppId = cfAppId;
  if (cfSecret) cfg.cashfreeSecretKey = cfSecret;
  if (cfEnv) cfg.cashfreeEnvironment = cfEnv.toUpperCase() === 'PROD' ? 'Production' : 'Sandbox';

  return cfg;
}

async function parseJsonBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body); } catch { return {}; }
    }
  }
  if (req.readableEnded || req.complete) return {};
  return new Promise((resolve) => {
    let raw = '';
    const timer = setTimeout(() => resolve({}), 500);
    req.on('data', (c: any) => { raw += c; });
    req.on('end', () => {
      clearTimeout(timer);
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
    req.on('error', () => { clearTimeout(timer); resolve({}); });
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    let orderId: string | null = null;
    let proposalId: string | null = null;

    if (req.method === 'GET') {
      const url = new URL(req.url || '', 'https://localhost');
      orderId = url.searchParams.get('orderId') || url.searchParams.get('order_id');
      proposalId = url.searchParams.get('proposalId');
    } else {
      const body = await parseJsonBody(req);
      orderId = body.orderId || body.order_id;
      proposalId = body.proposalId;
    }

    if (!orderId) {
      return sendJson(res, 400, {
        success: false,
        error: 'orderId is required for Cashfree payment verification.',
      });
    }

    const config = getStoredPaymentConfig();
    const appId = config.cashfreeAppId;
    const secretKey = config.cashfreeSecretKey;
    const isProd = config.cashfreeEnvironment === 'Production' || config.environment === 'Live';

    if (!appId || !secretKey) {
      return sendJson(res, 500, {
        success: false,
        error: 'Cashfree credentials not configured.',
      });
    }

    const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
    console.log(`[Cashfree Verify] Inquiring Order: ${orderId} at ${baseUrl}/orders/${orderId}`);

    // 1. Fetch Order Details from Cashfree
    const orderRes = await fetch(`${baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
      },
    });

    const orderData = await orderRes.json().catch(() => ({}));

    if (!orderRes.ok) {
      console.warn('[Cashfree Verify] Order fetch failed:', orderRes.status, orderData);
      return sendJson(res, orderRes.status, {
        success: false,
        error: orderData.message || 'Could not find order on Cashfree.',
      });
    }

    const orderStatus = (orderData.order_status || '').toUpperCase();
    console.log(`[Cashfree Verify] Order ${orderId} status: ${orderStatus}`);

    // 2. Fetch specific payment attempts to extract payment ID and method
    let paymentId: string = `cf_pay_${orderId}`;
    let paymentMethod: string = 'online';
    let paymentTime: string = new Date().toISOString();

    try {
      const paymentsRes = await fetch(`${baseUrl}/orders/${orderId}/payments`, {
        method: 'GET',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
      });

      if (paymentsRes.ok) {
        const paymentsList = await paymentsRes.json();
        if (Array.isArray(paymentsList) && paymentsList.length > 0) {
          const successPayment = paymentsList.find((p: any) => p.payment_status === 'SUCCESS') || paymentsList[0];
          if (successPayment) {
            paymentId = successPayment.cf_payment_id ? String(successPayment.cf_payment_id) : paymentId;
            paymentMethod = successPayment.payment_group || successPayment.payment_method || 'online';
            if (successPayment.payment_completion_time) {
              paymentTime = new Date(successPayment.payment_completion_time).toISOString();
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[Cashfree Verify] Payment details lookup warning:', e?.message);
    }

    if (orderStatus === 'PAID') {
      const newlyPaid = Number(orderData.order_amount || 0);
      let totalPaidAmount = newlyPaid;
      let remainingBalance = 0;
      let finalPaymentStatus: 'PAID' | 'PARTIALLY_PAID' = 'PAID';

      // Update proposal in Firestore if proposalId is provided
      if (proposalId) {
        try {
          const found = await findProposalInFirestore(proposalId);
          if (found) {
            const dbProp = found.data;
            const grandTotal = Number(dbProp.grandTotal || 0);
            const prevPaid = Number(dbProp.paidAmount || dbProp.amountPaid || 0);
            totalPaidAmount = prevPaid + newlyPaid;
            remainingBalance = Math.max(0, grandTotal - totalPaidAmount);
            finalPaymentStatus = remainingBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

            const existingHistory = Array.isArray(dbProp.paymentHistory) ? dbProp.paymentHistory : [];
            const alreadyLogged = existingHistory.some((h: any) => h.orderId === orderId || h.paymentId === paymentId);

            const updatedHistory = alreadyLogged
              ? existingHistory
              : [
                  ...existingHistory,
                  {
                    id: `pay_hist_${Date.now()}`,
                    paymentId,
                    orderId,
                    amount: newlyPaid,
                    currency: orderData.order_currency || 'INR',
                    date: paymentTime,
                    status: 'PAID',
                    method: paymentMethod,
                  },
                ];

            await patchProposalInFirestore(found.id, {
              paymentStatus: finalPaymentStatus,
              paidAmount: totalPaidAmount,
              amountPaid: totalPaidAmount,
              balanceDue: remainingBalance,
              paymentDate: paymentTime,
              cashfreeOrderId: orderId,
              cashfreePaymentId: paymentId,
              cashfreePaymentMethod: paymentMethod,
              paymentGatewayUsed: 'cashfree',
              paymentHistory: updatedHistory,
              updatedAt: paymentTime,
            });

            // Record in /payments collection
            const payDocId = `pay_${orderId}`;
            createDocumentInFirestore('payments', payDocId, {
              id: payDocId,
              orderId,
              paymentId,
              proposalId: found.id,
              proposalNumber: dbProp.proposalNumber || '',
              customerId: dbProp.customerId || '',
              customerName: dbProp.customerName || '',
              amount: newlyPaid,
              currency: orderData.order_currency || 'INR',
              status: 'PAID',
              paymentGateway: 'cashfree',
              paymentMethod,
              timestamp: paymentTime,
              createdAt: paymentTime,
            }).catch(console.warn);

            // Log activity: "Payment received for Proposal {proposalNumber}"
            const actId = `act_${Date.now()}`;
            createDocumentInFirestore('activities', actId, {
              id: actId,
              activityId: actId,
              customerId: dbProp.customerId || '',
              userId: 'cashfree_gateway',
              userName: 'Cashfree Gateway',
              type: 'PAYMENT_RECEIVED',
              title: `Payment received for Proposal ${dbProp.proposalNumber || found.id}`,
              description: `Payment of ₹${newlyPaid} received via Cashfree for proposal ${dbProp.proposalNumber || found.id}`,
              relatedId: found.id,
              timestamp: paymentTime,
              createdAt: paymentTime,
            }).catch(console.warn);

            // Create notification: "Payment received for Proposal {proposalNumber}"
            const notifId = `notif_${Date.now()}`;
            createDocumentInFirestore('notifications', notifId, {
              id: notifId,
              notificationId: `NOTIF-${Date.now().toString().slice(-6)}`,
              userId: dbProp.assignedEmployeeId || 'all_admins',
              type: 'PAYMENT_RECEIVED',
              title: `Payment received for Proposal ${dbProp.proposalNumber || found.id}`,
              message: `Payment of ₹${newlyPaid} received for Proposal ${dbProp.proposalNumber || found.id}`,
              relatedId: found.id,
              relatedType: 'proposal',
              read: false,
              createdAt: paymentTime,
            }).catch(console.warn);

            // Send confirmation email via Titan Mail (non-blocking)
            try {
              const emailCfg = getStoredEmailConfig();
              const effectivePass = emailCfg.smtpPass || process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
              if (effectivePass && emailCfg.smtpUser) {
                const transporter = nodemailer.createTransport({
                  host: emailCfg.smtpHost || 'smtp.titan.email',
                  port: emailCfg.smtpPort ? Number(emailCfg.smtpPort) : 465,
                  secure: emailCfg.smtpPort === 465 || emailCfg.smtpSecure !== false,
                  auth: { user: emailCfg.smtpUser.trim(), pass: effectivePass },
                  tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
                });
                const recipient = dbProp.customerEmail || dbProp.customerSnapshot?.email || emailCfg.senderEmail;
                transporter.sendMail({
                  from: `"${emailCfg.senderName || 'SparkGenTechnology'}" <${emailCfg.senderEmail || 'sales@sparkgentechnology.in'}>`,
                  to: recipient,
                  cc: 'sales@sparkgentechnology.in',
                  subject: `Payment Received - ${dbProp.proposalNumber || found.id}`,
                  text: `Thank you for your payment of ₹${newlyPaid} for proposal ${dbProp.proposalNumber || found.id}.\nPayment ID: ${paymentId}\nRemaining Balance: ₹${remainingBalance}`,
                }).catch(console.warn);
              }
            } catch (mailErr) {
              console.warn('[Auto-Email Notice] Payment email notification error:', mailErr);
            }
          }
        } catch (dbErr) {
          console.warn('[Cashfree Verify] Firestore update warning:', dbErr);
        }
      }

      return sendJson(res, 200, {
        success: true,
        verified: true,
        status: 'Paid',
        paymentStatus: finalPaymentStatus,
        orderId,
        cfOrderId: orderData.cf_order_id,
        paidAmount: newlyPaid,
        totalPaidAmount,
        amountPaid: totalPaidAmount,
        balanceDue: remainingBalance,
        currency: orderData.order_currency || 'INR',
        paymentId,
        paymentMethod,
        paymentDate: paymentTime,
        gateway: 'cashfree',
        message: 'Payment verified successfully by Cashfree.',
      });
    } else {
      return sendJson(res, 200, {
        success: false,
        verified: false,
        status: orderStatus === 'ACTIVE' ? 'Pending' : (orderStatus === 'CANCELLED' ? 'Cancelled' : 'Failed'),
        orderId,
        paidAmount: orderData.order_amount,
        message: `Cashfree order status is ${orderStatus}. Payment has not been captured.`,
      });
    }
  } catch (err: any) {
    console.error('[Cashfree Verify] Server error:', err);
    return sendJson(res, 500, {
      success: false,
      error: err?.message || 'Server error while verifying Cashfree payment.',
    });
  }
}
