import fs from 'fs';
import path from 'path';

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
    const { proposalId, proposalNumber, verifiedAmount, customerDetails, proposalData } = body;

    if (!proposalId && !proposalNumber) {
      return sendJson(res, 400, {
        success: false,
        error: 'Missing proposal identifier. proposalId or proposalNumber is required.',
      });
    }

    // -------------------------------------------------------------
    // Security Checks: Proposal Approval & Status Verification
    // -------------------------------------------------------------
    if (proposalData) {
      const status = (proposalData.status || '').toLowerCase();
      const isApproved = status === 'accepted' || status === 'approved';
      if (!isApproved) {
        return sendJson(res, 403, {
          success: false,
          error: 'Security Violation: Payment is only permitted for Approved proposals. Please approve the proposal first.',
        });
      }

      if (proposalData.paymentStatus === 'Paid') {
        return sendJson(res, 400, {
          success: false,
          error: 'Payment Completed: This proposal has already been paid in full.',
        });
      }
    }

    const config = getStoredPaymentConfig();
    const appId = config.cashfreeAppId;
    const secretKey = config.cashfreeSecretKey;
    const isProd = config.cashfreeEnvironment === 'Production' || config.environment === 'Live';

    if (!appId || !secretKey) {
      return sendJson(res, 500, {
        success: false,
        error: 'Cashfree Payment Gateway is not configured. Please contact the administrator.',
      });
    }

    // Enforce verified amount (never allow client-tampered 0 or arbitrary amounts)
    const rawAmount = proposalData?.grandTotal || verifiedAmount;
    const orderAmount = parseFloat(Number(rawAmount).toFixed(2));
    if (!orderAmount || isNaN(orderAmount) || orderAmount <= 0) {
      return sendJson(res, 400, {
        success: false,
        error: 'Invalid proposal payment amount.',
      });
    }

    const propNum = proposalData?.proposalNumber || proposalNumber || 'PROP';
    const cleanPropNum = propNum.replace(/[^a-zA-Z0-9_-]/g, '_');
    const orderId = `cf_ord_${cleanPropNum}_${Date.now()}`.slice(0, 45);

    // Format Indian mobile number for Cashfree requirement (10 digits)
    let rawPhone = customerDetails?.phone || proposalData?.customerMobile || '9876543210';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
    if (cleanPhone.length < 10) cleanPhone = '9876543210';

    const customerName = (customerDetails?.name || proposalData?.customerName || 'Valued Customer').slice(0, 50);
    const customerEmail = customerDetails?.email || proposalData?.customerEmail || 'sales@sparkgentechnology.in';
    const customerId = (proposalData?.customerId || `cust_${Date.now()}`).slice(0, 40);

    const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

    const origin = req.headers.origin || req.headers.referer || 'https://sparkgentechnology.in';
    const returnUrl = `${origin}/proposal/${proposalData?.viewToken || proposalId}?cf_order_id={order_id}`;

    const cashfreePayload = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: 'INR',
      customer_details: {
        customer_id: customerId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: cleanPhone,
      },
      order_meta: {
        return_url: returnUrl,
      },
      order_note: `Payment for Commercial Proposal ${propNum}`,
    };

    console.log(`[Cashfree Create Order] Submitting to ${baseUrl}/orders for Order: ${orderId}, Amount: ₹${orderAmount}`);

    const cfResponse = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cashfreePayload),
    });

    const cfData = await cfResponse.json().catch(() => ({}));

    if (!cfResponse.ok || !cfData.payment_session_id) {
      console.error('[Cashfree Create Order] Cashfree API error:', cfResponse.status, cfData);
      return sendJson(res, cfResponse.status || 500, {
        success: false,
        error: cfData.message || 'Failed to initialize Cashfree payment session.',
      });
    }

    console.log(`[Cashfree Create Order] Success! Session: ${cfData.payment_session_id.slice(0, 15)}... Order: ${cfData.order_id}`);

    return sendJson(res, 200, {
      success: true,
      paymentSessionId: cfData.payment_session_id,
      orderId: cfData.order_id,
      amount: orderAmount,
      currency: 'INR',
      environment: isProd ? 'production' : 'sandbox',
      cfOrderId: cfData.cf_order_id,
    });
  } catch (err: any) {
    console.error('[Cashfree Create Order] Exception:', err);
    return sendJson(res, 500, {
      success: false,
      error: err?.message || 'Server error while initiating Cashfree payment.',
    });
  }
}
