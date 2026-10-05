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

  if (process.env.RAZORPAY_KEY_ID) cfg.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  if (process.env.RAZORPAY_KEY_SECRET) cfg.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  return cfg;
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
    const config = getStoredPaymentConfig();
    const activeGateway = config.gateway || 'cashfree';

    // -------------------------------------------------------------
    // Test Cashfree Gateway Connection
    // -------------------------------------------------------------
    if (activeGateway === 'cashfree') {
      const appId = config.cashfreeAppId;
      const secretKey = config.cashfreeSecretKey;
      const isProd = config.cashfreeEnvironment === 'Production' || config.environment === 'Live';

      if (!appId || !secretKey) {
        return sendJson(res, 400, {
          success: false,
          error: 'Cashfree Client ID and Client Secret are required. Please enter and save your credentials first.',
        });
      }

      const baseUrl = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

      try {
        console.log(`[Cashfree Test] Testing connection to ${baseUrl}...`);
        const cfRes = await fetch(`${baseUrl}/orders?limit=1`, {
          method: 'GET',
          headers: {
            'x-client-id': appId,
            'x-client-secret': secretKey,
            'x-api-version': '2023-08-01',
            'Content-Type': 'application/json',
          },
        });

        if (cfRes.status === 401 || cfRes.status === 403) {
          const errData = await cfRes.json().catch(() => ({}));
          return sendJson(res, 400, {
            success: false,
            error: `Cashfree Authentication Failed: ${errData.message || 'Invalid Client ID or Client Secret for ' + (isProd ? 'Production' : 'Sandbox') + ' mode.'}`,
          });
        }

        if (cfRes.ok || cfRes.status === 200 || cfRes.status === 404) {
          return sendJson(res, 200, {
            success: true,
            message: `Cashfree ${isProd ? 'Production' : 'Sandbox'} connection verified successfully.`,
            mode: isProd ? 'Production' : 'Sandbox',
          });
        }

        const errData = await cfRes.json().catch(() => ({}));
        return sendJson(res, 400, {
          success: false,
          error: errData.message || `Cashfree returned HTTP ${cfRes.status}`,
        });
      } catch (networkErr: any) {
        return sendJson(res, 500, {
          success: false,
          error: `Network error connecting to Cashfree: ${networkErr.message}`,
        });
      }
    }

    // -------------------------------------------------------------
    // Test Razorpay Gateway Connection
    // -------------------------------------------------------------
    if (activeGateway === 'razorpay') {
      if (!config.razorpayKeyId || !config.razorpayKeySecret) {
        return sendJson(res, 400, {
          success: false,
          error: 'Razorpay Key ID and Secret are required.',
        });
      }

      const authHeader = `Basic ${Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString('base64')}`;
      const response = await fetch('https://api.razorpay.com/v1/payments?count=1', {
        headers: { Authorization: authHeader },
      });

      if (response.ok) {
        return sendJson(res, 200, {
          success: true,
          message: 'Razorpay connection verified successfully.',
        });
      } else {
        const err = await response.json().catch(() => ({}));
        return sendJson(res, 400, {
          success: false,
          error: `Razorpay Authentication Failed: ${err.error?.description || 'Invalid Key ID or Secret'}`,
        });
      }
    }

    return sendJson(res, 400, {
      success: false,
      error: `Unsupported gateway: ${activeGateway}`,
    });
  } catch (err: any) {
    return sendJson(res, 500, {
      success: false,
      error: err?.message || 'Server error testing payment gateway',
    });
  }
}
