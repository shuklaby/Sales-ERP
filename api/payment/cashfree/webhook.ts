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
  res.end(JSON.stringify(data));
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-signature, x-webhook-timestamp');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  }

  try {
    const payload = await parseJsonBody(req);
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    console.log(`[Cashfree Webhook] Received webhook event: ${payload.type || 'PAYMENT_EVENT'} for order: ${payload.data?.order?.order_id || 'unknown'}`);

    return sendJson(res, 200, {
      success: true,
      status: 'OK',
      receivedAt: new Date().toISOString(),
      orderId: payload.data?.order?.order_id,
    });
  } catch (err: any) {
    console.error('[Cashfree Webhook] Error:', err);
    return sendJson(res, 500, { success: false, error: 'Webhook processing error' });
  }
}
