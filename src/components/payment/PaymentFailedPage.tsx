import React from 'react';
import { AlertCircle, RefreshCw, ArrowLeft, Mail, ShieldAlert } from 'lucide-react';

export const PaymentFailedPage: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';
  const reason = urlParams.get('reason') || 'Transaction was declined or cancelled by customer/bank.';

  const handleRetry = () => {
    if (token) {
      window.location.href = `/pay/${token}`;
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div>
          <h1 className="text-xl font-black text-white">Payment Could Not Be Completed</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Your transaction was not confirmed. No money was deducted, or if debited by your bank, it will be automatically reversed within 3–5 business days.
          </p>
        </div>

        {/* Reason box */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-left space-y-1">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gateway Reason:</div>
          <p className="text-red-400 font-medium">{reason}</p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleRetry}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
          >
            <RefreshCw className="w-4 h-4" /> Retry Payment
          </button>

          <a
            href="mailto:sales@sparkgentechnology.com"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 block"
          >
            <Mail className="w-4 h-4" /> Contact SparkGenTechnology Support
          </a>
        </div>
      </div>
    </div>
  );
};
