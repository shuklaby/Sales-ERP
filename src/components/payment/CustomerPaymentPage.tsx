import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  FileText,
  CreditCard,
  QrCode,
  Smartphone,
  Lock,
  ArrowRight,
  RefreshCw,
  Receipt,
  Download,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '../../utils/financeUtils';

interface CustomerPaymentPageProps {
  token: string;
}

interface PaymentSessionData {
  valid: boolean;
  isExpired?: boolean;
  paymentLinkId: string;
  token: string;
  companyName: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  paymentAmount: number;
  currency: string;
  status: string;
  expiresAt: string;
  gateway: string;
  gatewayOrderId: string;
  gatewayKeyId: string;
  environment: string;
  invoiceAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  dueDate?: string;
  paymentTerms?: string;
  supportedMethods: {
    upi: boolean;
    cards: boolean;
    netbanking: boolean;
    wallets: boolean;
  };
  paymentHistory: {
    paymentId: string;
    amount: number;
    currency: string;
    date: string;
    status: string;
    reference: string;
    receiptNumber?: string;
  }[];
}

export const CustomerPaymentPage: React.FC<CustomerPaymentPageProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<PaymentSessionData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [activeMethod, setActiveMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');

  // Customer form inputs for mock or gateway prefill
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vpa, setVpa] = useState('');

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/payment/session/${token}`);
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setError(data.message || 'Invalid or expired payment link.');
        } else {
          setSession(data);
          setCustomerName(data.customerName || '');
        }
      } catch (err: any) {
        setError('Unable to load payment session. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [token]);

  // Load Razorpay checkout script dynamically
  useEffect(() => {
    const existingScript = document.getElementById('razorpay-checkout-js');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePayNow = async () => {
    if (!session) return;
    setProcessing(true);
    setError(null);

    try {
      // 1. Request gateway order creation from server
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initiate gateway order session.');
      }

      const { orderId, keyId, amount, currency, merchantName } = orderData;

      // 2. If Razorpay SDK is available and key is present, open Razorpay Standard Checkout
      if ((window as any).Razorpay && keyId) {
        const options = {
          key: keyId,
          amount: Math.round(amount * 100),
          currency: currency || 'INR',
          name: merchantName || 'SparkGenTechnology',
          description: `Invoice Settlement - ${session.invoiceNumber}`,
          order_id: orderId,
          prefill: {
            name: customerName || session.customerName,
            email: customerEmail || undefined,
            contact: customerPhone || undefined,
          },
          theme: {
            color: '#2563eb',
          },
          handler: async function (response: any) {
            // Payment success callback from gateway - send to server for cryptographic verification!
            // CRITICAL: Do NOT mark invoice paid until server confirms!
            try {
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  token,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id || orderId,
                  signature: response.razorpay_signature,
                  methodDetails: { method: activeMethod },
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.verified) {
                window.location.href = `/payment/success?token=${token}&paymentId=${verifyData.paymentId || response.razorpay_payment_id}`;
              } else {
                window.location.href = `/payment/failed?token=${token}&reason=${encodeURIComponent(
                  verifyData.error || 'Signature verification mismatch'
                )}`;
              }
            } catch (err: any) {
              window.location.href = `/payment/pending?token=${token}`;
            }
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          window.location.href = `/payment/failed?token=${token}&reason=${encodeURIComponent(
            response.error?.description || 'Payment rejected by bank/gateway'
          )}`;
        });
        rzp.open();
      } else {
        // Test Mode Simulation with Server Signature Verification
        // Generates realistic test gateway payment ID and submits to server verify endpoint
        const testPaymentId = `pay_test_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
        const testOrderId = orderId || session.gatewayOrderId;

        const verifyRes = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            paymentId: testPaymentId,
            orderId: testOrderId,
            signature: 'test_verified_signature',
            methodDetails: {
              method: activeMethod,
              vpa: activeMethod === 'upi' ? vpa || 'customer@okhdfcbank' : undefined,
            },
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyRes.ok && verifyData.verified) {
          window.location.href = `/payment/success?token=${token}&paymentId=${verifyData.paymentId || testPaymentId}`;
        } else {
          window.location.href = `/payment/failed?token=${token}&reason=${encodeURIComponent(
            verifyData.error || 'Verification failed'
          )}`;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <h2 className="text-sm font-semibold text-slate-300">Securing Payment Channel...</h2>
        <p className="text-xs text-slate-500 mt-1">Connecting to SparkGenTechnology Gateway</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Payment Link Unavailable</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {error || 'This payment link is invalid or has expired.'}
            </p>
          </div>
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
            For assistance, please contact <strong>SparkGenTechnology Finance</strong> at{' '}
            <a href="mailto:sales@sparkgentechnology.com" className="text-blue-400 underline">
              sales@sparkgentechnology.com
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (session.isExpired || session.status === 'Expired') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Payment Link Expired</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              This payment link for Invoice <strong className="text-white">{session.invoiceNumber}</strong> expired on{' '}
              {new Date(session.expiresAt).toLocaleDateString()}.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Please contact the team at SparkGenTechnology to generate a fresh payment link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased font-sans">
      {/* Top Secure Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              SG
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white">SparkGenTechnology</h1>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                Secure Client Remittance Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold">
            <Lock className="w-3 h-3" /> 256-Bit Encrypted
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Invoice & Billing Overview */}
          <div className="md:col-span-7 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider block">
                    Tax Invoice Remittance
                  </span>
                  <h2 className="text-xl font-black text-white mt-0.5">
                    {session.invoiceNumber}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Link Expiry</span>
                  <span className="text-xs text-slate-200 font-semibold">
                    {new Date(session.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Billed To */}
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold block mb-1">
                  Billed To Customer
                </span>
                <div className="text-sm font-bold text-white">{session.customerName}</div>
              </div>

              {/* Amount Breakdown Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Payment Installment:</span>
                  <span className="font-bold text-white">{formatCurrency(session.paymentAmount)}</span>
                </div>
                <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Amount Payable Today</span>
                    <span className="text-[10px] text-slate-500">Includes all applicable GST / Taxes</span>
                  </div>
                  <div className="text-2xl font-black text-blue-400">
                    {formatCurrency(session.paymentAmount)}
                  </div>
                </div>
              </div>

              {/* Terms & Security Notice */}
              <div className="p-3 bg-slate-950/40 border border-slate-800/60 rounded-xl text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-slate-300">Payment Terms:</div>
                <p>
                  Official receipt is automatically dispatched via email immediately upon transaction confirmation by the gateway.
                </p>
              </div>
            </div>

            {/* Previous Payments on this Invoice (Customer Payment History) */}
            {session.paymentHistory && session.paymentHistory.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" /> Invoice Payment History
                </h3>
                <div className="divide-y divide-slate-800">
                  {session.paymentHistory.map((hist, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{formatCurrency(hist.amount)}</span>
                        <span className="text-[11px] text-slate-400 block">
                          {new Date(hist.date).toLocaleDateString()} • Ref: {hist.reference}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Confirmed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Checkout & Payment Action */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" /> Payment Methods
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Gateway: {session.gateway.toUpperCase()}
                </span>
              </div>

              {/* Payment Methods Badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-emerald-400" /> UPI / QR
                </span>
                <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-blue-400" /> Cards
                </span>
                <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-300 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-purple-400" /> Net Banking
                </span>
              </div>

              {/* Method Selector Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveMethod('upi')}
                  className={`py-2 text-[11px] font-bold rounded-lg transition ${
                    activeMethod === 'upi' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  UPI App / QR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMethod('card')}
                  className={`py-2 text-[11px] font-bold rounded-lg transition ${
                    activeMethod === 'card' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMethod('netbanking')}
                  className={`py-2 text-[11px] font-bold rounded-lg transition ${
                    activeMethod === 'netbanking' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Net Banking
                </button>
              </div>

              {/* Dynamic Method Form */}
              {activeMethod === 'upi' && (
                <div className="space-y-3 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-center">
                  <div className="p-3 bg-white rounded-xl inline-block shadow-inner mx-auto">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(
                        `upi://pay?pa=sales@sparkgentech&pn=SparkGenTechnology&am=${session.paymentAmount}&cu=INR&tn=Invoice-${session.invoiceNumber}`
                      )}`}
                      alt="UPI QR Code"
                      className="w-28 h-28 mx-auto"
                    />
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Scan with <strong className="text-white">GPay, PhonePe, Paytm, or BHIM</strong>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Or enter UPI ID (e.g. mobile@upi)"
                      value={vpa}
                      onChange={(e) => setVpa(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-center"
                    />
                  </div>
                </div>
              )}

              {activeMethod === 'card' && (
                <div className="space-y-3 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-400">
                  <p className="leading-relaxed">
                    All major Credit & Debit cards supported (Visa, Mastercard, RuPay, Maestro).
                  </p>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Card details are verified directly on the bank gateway with 3D Secure OTP.
                  </p>
                </div>
              )}

              {activeMethod === 'netbanking' && (
                <div className="space-y-3 p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-400">
                  <p>Support for 50+ Indian commercial & public sector banks.</p>
                  <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">HDFC Bank</div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">ICICI Bank</div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">SBI Bank</div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">Axis Bank</div>
                  </div>
                </div>
              )}

              {/* Pay Now Button */}
              <button
                type="button"
                disabled={processing}
                onClick={handlePayNow}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Transaction...
                  </>
                ) : (
                  <>
                    Pay {formatCurrency(session.paymentAmount)} Now <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> PCI-DSS Compliant • No sensitive card/PIN stored
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 mt-12 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} SparkGenTechnology. All rights reserved.</p>
        <p className="mt-1 text-[11px] text-slate-600">
          This payment portal is securely operated for invoice fulfillment.
        </p>
      </footer>
    </div>
  );
};
