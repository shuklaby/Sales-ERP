import fs from 'fs';
import path from 'path';

export interface StoredPaymentConfig {
  gateway: 'razorpay' | 'cashfree' | 'stripe' | 'other';
  environment: 'Test' | 'Live';
  merchantName: string;
  currency: string;
  // Cashfree credentials (server-side only)
  cashfreeAppId?: string;
  cashfreeSecretKey?: string;
  cashfreeEnvironment?: 'Sandbox' | 'Production' | 'Test' | 'Live';
  // Razorpay credentials (server-side only)
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  // Stripe credentials (server-side only)
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  enabledMethods?: {
    upi: boolean;
    cards: boolean;
    netbanking: boolean;
    wallets: boolean;
  };
}

const CONFIG_FILE_PATH = path.resolve(process.cwd(), '.payment-config.json');
const TMP_CONFIG_FILE_PATH = path.resolve('/tmp', '.payment-config.json');

let inMemoryPaymentConfig: StoredPaymentConfig | null = null;

export function getStoredPaymentConfig(): StoredPaymentConfig {
  let cfg: StoredPaymentConfig = {
    gateway: 'cashfree',
    environment: 'Test',
    merchantName: 'SparkGenTechnology',
    currency: 'INR',
    cashfreeEnvironment: 'Sandbox',
    enabledMethods: {
      upi: true,
      cards: true,
      netbanking: true,
      wallets: true,
    },
  };

  if (inMemoryPaymentConfig) {
    cfg = { ...cfg, ...inMemoryPaymentConfig };
  }

  // 1. Filesystem check (/tmp first for Vercel, then root)
  try {
    if (fs.existsSync(TMP_CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(TMP_CONFIG_FILE_PATH, 'utf-8');
      cfg = { ...cfg, ...JSON.parse(data) };
    } else if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      cfg = { ...cfg, ...JSON.parse(data) };
    }
  } catch {
    // quiet fallback
  }

  // 2. Fallback to process.env (Vercel Production Environment Variables)
  if (process.env.PAYMENT_GATEWAY) {
    cfg.gateway = process.env.PAYMENT_GATEWAY as any;
  }
  if (process.env.PAYMENT_ENV) {
    cfg.environment = process.env.PAYMENT_ENV as any;
  }
  if (process.env.MERCHANT_NAME) {
    cfg.merchantName = process.env.MERCHANT_NAME;
  }
  if (process.env.PAYMENT_CURRENCY) {
    cfg.currency = process.env.PAYMENT_CURRENCY;
  }

  // Cashfree Environment Variables
  const cfAppId = process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID;
  const cfSecret = process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET;
  const cfEnv = process.env.CASHFREE_ENV || process.env.CASHFREE_ENVIRONMENT;

  if (cfAppId) cfg.cashfreeAppId = cfAppId;
  if (cfSecret) cfg.cashfreeSecretKey = cfSecret;
  if (cfEnv) {
    cfg.cashfreeEnvironment = (cfEnv.toUpperCase() === 'PROD' || cfEnv.toUpperCase() === 'PRODUCTION' || cfEnv.toUpperCase() === 'LIVE')
      ? 'Production'
      : 'Sandbox';
  }

  // Razorpay Environment Variables
  if (process.env.RAZORPAY_KEY_ID) cfg.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  if (process.env.RAZORPAY_KEY_SECRET) cfg.razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  if (process.env.RAZORPAY_WEBHOOK_SECRET) cfg.razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  return cfg;
}

export function saveStoredPaymentConfig(config: StoredPaymentConfig) {
  inMemoryPaymentConfig = { ...config };
  try {
    fs.writeFileSync(TMP_CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // quiet fallback
  }
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // quiet fallback in Vercel lambda
  }
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    // -------------------------------------------------------------
    // GET: Return safe configuration status (no secrets)
    // -------------------------------------------------------------
    if (req.method === 'GET') {
      const config = getStoredPaymentConfig();
      const isCashfreeConfigured = !!config.cashfreeAppId && !!config.cashfreeSecretKey;
      const isRazorpayConfigured = !!config.razorpayKeyId && !!config.razorpayKeySecret;
      const activeGateway = config.gateway || 'cashfree';

      const isConfigured = activeGateway === 'cashfree' ? isCashfreeConfigured : isRazorpayConfigured;

      return sendJson(res, 200, {
        success: true,
        configured: isConfigured,
        gateway: activeGateway,
        environment: config.environment || 'Test',
        merchantName: config.merchantName || 'SparkGenTechnology',
        currency: config.currency || 'INR',
        status: isConfigured ? (config.environment === 'Live' ? 'Live Mode' : 'Test Mode') : 'Not Connected',
        // Cashfree safe masked view
        cashfreeEnvironment: config.cashfreeEnvironment || (config.environment === 'Live' ? 'Production' : 'Sandbox'),
        cashfreeAppIdMasked: config.cashfreeAppId ? `${config.cashfreeAppId.slice(0, 6)}...${config.cashfreeAppId.slice(-4)}` : undefined,
        hasCashfreeSecret: !!config.cashfreeSecretKey,
        // Razorpay safe masked view
        publicKeyMasked: config.razorpayKeyId ? `${config.razorpayKeyId.slice(0, 6)}...${config.razorpayKeyId.slice(-4)}` : undefined,
        hasRazorpaySecret: !!config.razorpayKeySecret,
        enabledMethods: config.enabledMethods || {
          upi: true,
          cards: true,
          netbanking: true,
          wallets: true,
        },
      });
    }

    // -------------------------------------------------------------
    // POST: Save payment gateway configuration
    // -------------------------------------------------------------
    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const existing = getStoredPaymentConfig();

      const {
        gateway,
        environment,
        merchantName,
        currency,
        cashfreeAppId,
        cashfreeSecretKey,
        cashfreeEnvironment,
        razorpayKeyId,
        razorpayKeySecret,
        razorpayWebhookSecret,
        enabledMethods,
      } = body;

      const updatedGateway = gateway || existing.gateway || 'cashfree';
      const updatedEnv = environment || existing.environment || 'Test';

      const updated: StoredPaymentConfig = {
        gateway: updatedGateway,
        environment: updatedEnv,
        merchantName: merchantName?.trim() || existing.merchantName || 'SparkGenTechnology',
        currency: currency?.trim() || existing.currency || 'INR',
        // Cashfree
        cashfreeAppId: cashfreeAppId !== undefined ? cashfreeAppId.trim() : existing.cashfreeAppId,
        cashfreeSecretKey: (cashfreeSecretKey && cashfreeSecretKey.trim()) ? cashfreeSecretKey.trim() : existing.cashfreeSecretKey,
        cashfreeEnvironment: cashfreeEnvironment || (updatedEnv === 'Live' ? 'Production' : 'Sandbox'),
        // Razorpay
        razorpayKeyId: razorpayKeyId !== undefined ? razorpayKeyId.trim() : existing.razorpayKeyId,
        razorpayKeySecret: (razorpayKeySecret && razorpayKeySecret.trim()) ? razorpayKeySecret.trim() : existing.razorpayKeySecret,
        razorpayWebhookSecret: (razorpayWebhookSecret && razorpayWebhookSecret.trim()) ? razorpayWebhookSecret.trim() : existing.razorpayWebhookSecret,
        enabledMethods: enabledMethods || existing.enabledMethods,
      };

      saveStoredPaymentConfig(updated);
      console.log(`[Payment Config API] Configuration updated. Active gateway: ${updated.gateway}, Env: ${updated.environment}`);

      return sendJson(res, 200, {
        success: true,
        message: 'Payment Gateway configuration saved successfully.',
        configured: updated.gateway === 'cashfree' ? (!!updated.cashfreeAppId && !!updated.cashfreeSecretKey) : (!!updated.razorpayKeyId && !!updated.razorpayKeySecret),
        gateway: updated.gateway,
        environment: updated.environment,
        cashfreeEnvironment: updated.cashfreeEnvironment,
        hasCashfreeSecret: !!updated.cashfreeSecretKey,
      });
    }

    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[Payment Config API] Error:', err);
    return sendJson(res, 500, { success: false, error: err?.message || 'Server error' });
  }
}
