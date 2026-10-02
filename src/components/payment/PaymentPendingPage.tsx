import React, { useState } from 'react';
import { Clock, RefreshCw, ArrowLeft, Mail, AlertTriangle } from 'lucide-react';

export const PaymentPendingPage: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    if (!token) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/payment/status?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.status === 'Confirmed' || data.status === 'Success') {
        window.location.href = `/payment/success?token=${token}`;
      } else if (data.status === 'Failed') {
        window.location.href = `/payment/failed?token=${token}`;
      } else {
        alert('Payment verification is still in progress with your bank. Please check back in a few minutes.');
      }
    } catch (e) {
      console.warn('Status check failed:', e);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
          <Clock className="w-9 h-9 animate-pulse" />
        </div>

        <div>
          <h1 className="text-xl font-black text-white">Payment Is Being Verified</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Your transaction has been submitted and is currently being processed by your bank or the payment gateway.
          </p>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-400 space-y-1 text-left">
          <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Security Notice:
          </div>
          <p>
            Please do not re-attempt payment right away. Once your bank sends the confirmed webhook, your invoice will be automatically updated and an official receipt emailed to you.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            disabled={checking}
            onClick={handleCheckStatus}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking Status...' : 'Check Status Now'}
          </button>

          <a
            href="/"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 block"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};
