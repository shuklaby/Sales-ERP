import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Check,
  Copy,
  AlertCircle,
  RefreshCw,
  Key,
  Lock,
  Globe,
  CheckCircle2,
  ExternalLink,
  Info,
  Server,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { SupportedGateway, GatewayEnvironment } from '../../types/crm';

export const PaymentGatewaySettingsView: React.FC = () => {
  const { paymentConfig, fetchPaymentConfig, savePaymentConfig, testPaymentConnection } = useCrmData();

  const [gateway, setGateway] = useState<SupportedGateway>(paymentConfig.gateway || 'razorpay');
  const [environment, setEnvironment] = useState<GatewayEnvironment>(paymentConfig.environment || 'Test');
  const [merchantName, setMerchantName] = useState(paymentConfig.merchantName || 'SparkGenTechnology');
  const [currency, setCurrency] = useState(paymentConfig.currency || 'INR');

  // Gateway Credentials (stored strictly server-side, never in Firestore or client localStorage)
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');

  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    fetchPaymentConfig().then((cfg) => {
      setGateway(cfg.gateway);
      setEnvironment(cfg.environment);
      setMerchantName(cfg.merchantName || 'SparkGenTechnology');
      setCurrency(cfg.currency || 'INR');
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setTestResult(null);

    const payload = {
      gateway,
      environment,
      merchantName: merchantName.trim() || 'SparkGenTechnology',
      currency: currency.trim() || 'INR',
      razorpayKeyId: razorpayKeyId.trim() || undefined,
      razorpayKeySecret: razorpayKeySecret.trim() || undefined,
      razorpayWebhookSecret: razorpayWebhookSecret.trim() || undefined,
      stripePublishableKey: stripePublishableKey.trim() || undefined,
      stripeSecretKey: stripeSecretKey.trim() || undefined,
      stripeWebhookSecret: stripeWebhookSecret.trim() || undefined,
      enabledMethods: {
        upi: true,
        cards: true,
        netbanking: true,
        wallets: true,
      },
    };

    const res = await savePaymentConfig(payload);
    setSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      setTestResult({ success: false, error: res.error || 'Failed to save configuration.' });
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testPaymentConnection();
    setTesting(false);
    setTestResult(res);
  };

  const webhookUrl = `${window.location.origin}/api/payment/webhook`;

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 3000);
    });
  };

  const getStatusBadge = () => {
    const status = paymentConfig.status;
    if (status === 'Live Mode') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Mode
        </span>
      );
    }
    if (status === 'Test Mode') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 text-blue-400 border border-blue-500/20 inline-flex items-center gap-1.5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-blue-400" /> Test Mode
        </span>
      );
    }
    if (status === 'Connected') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Connected
        </span>
      );
    }
    if (status === 'Configuration Error') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> Configuration Error
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-800 text-slate-400 border border-slate-700 inline-flex items-center gap-1.5">
        Not Connected
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Settings Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Payment Gateway Configuration</h2>
            <p className="text-xs text-slate-400">
              Configure online payment gateways, credentials, environments, and webhook endpoints for SparkGenTechnology
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Test / Save Alerts */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-400 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Payment gateway configuration securely encrypted and updated on server.</span>
        </div>
      )}

      {testResult && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
            testResult.success
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-bold">{testResult.success ? 'Gateway Verified' : 'Connection Failed'}</div>
            <div className="mt-0.5">{testResult.message || testResult.error}</div>
          </div>
        </div>
      )}

      {/* Security Architecture Callout (Phase 13 requirement) */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed space-y-1">
          <strong className="text-white font-bold block">Zero-Trust Server-Side Secrets Architecture:</strong>
          <p>
            In compliance with strict security protocols, payment gateway secret keys and webhook signing secrets are
            processed and retained exclusively within the backend environment. They are never written to public Firestore documents,
            client-side JavaScript, or local storage.
          </p>
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        {/* Gateway Selection */}
        <div>
          <label className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
            Select Active Payment Gateway
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'razorpay',
                name: 'Razorpay',
                desc: 'UPI, Debit/Credit Cards, Net Banking & Wallets (Recommended for INR)',
              },
              {
                id: 'stripe',
                name: 'Stripe',
                desc: 'Global Cards, Apple Pay, Google Pay & Multi-Currency Settlement',
              },
              {
                id: 'other',
                name: 'Other Gateway',
                desc: 'Custom API integration or aggregator',
              },
            ].map((gw) => (
              <button
                key={gw.id}
                type="button"
                onClick={() => setGateway(gw.id as SupportedGateway)}
                className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                  gateway === gw.id
                    ? 'border-blue-500 bg-blue-500/10 text-white shadow-md'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-sm font-black flex items-center justify-between">
                    <span>{gw.name}</span>
                    {gateway === gw.id && <Check className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{gw.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Environment & General Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Operating Environment *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEnvironment('Test')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center border ${
                  environment === 'Test'
                    ? 'bg-blue-600 text-white border-blue-500 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Test Mode
              </button>
              <button
                type="button"
                onClick={() => setEnvironment('Live')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center border ${
                  environment === 'Live'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Live Mode
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Merchant Name (Display on Checkout) *
            </label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              placeholder="SparkGenTechnology"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              Default Currency *
            </label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              placeholder="INR"
            />
          </div>
        </div>

        {/* Dynamic Credentials Form */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              {gateway === 'razorpay' ? 'Razorpay Credentials' : gateway === 'stripe' ? 'Stripe Credentials' : 'API Credentials'}
            </h3>
            {paymentConfig.publicKeyMasked && (
              <span className="text-[11px] text-slate-400 font-mono">
                Current Public Key: {paymentConfig.publicKeyMasked}
              </span>
            )}
          </div>

          {gateway === 'razorpay' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Razorpay Key ID *
                </label>
                <input
                  type="text"
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  placeholder="rzp_test_... or rzp_live_..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Razorpay Key Secret (Server-Side Only) *
                </label>
                <input
                  type="password"
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Webhook Secret (For HMAC Signature Verification) *
                </label>
                <input
                  type="password"
                  value={razorpayWebhookSecret}
                  onChange={(e) => setRazorpayWebhookSecret(e.target.value)}
                  placeholder="Enter secret configured in Razorpay Webhooks dashboard"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {gateway === 'stripe' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Stripe Publishable Key *
                </label>
                <input
                  type="text"
                  value={stripePublishableKey}
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                  placeholder="pk_test_... or pk_live_..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Stripe Secret Key (Server-Side Only) *
                </label>
                <input
                  type="password"
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  placeholder="sk_test_... or sk_live_..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Stripe Webhook Signing Secret (whsec_...) *
                </label>
                <input
                  type="password"
                  value={stripeWebhookSecret}
                  onChange={(e) => setStripeWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Webhook Endpoint Strip (Section 10) */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <label className="text-xs font-bold text-white uppercase tracking-wider block">
            Webhook Endpoint URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyWebhook}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
            >
              {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedWebhook ? 'Copied' : 'Copy URL'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Subscribe to <strong className="text-slate-200">payment.captured, order.paid, payment.failed, and refund.processed</strong> events in your payment gateway dashboard.
          </p>
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              'Save Gateway Settings'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
