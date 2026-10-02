import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Printer,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Receipt,
} from 'lucide-react';
import { formatCurrency } from '../../utils/financeUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const PaymentSuccessPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Read URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || '';
  const paymentId = urlParams.get('paymentId') || '';

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payment/status?token=${encodeURIComponent(token)}&paymentId=${encodeURIComponent(paymentId)}`);
      const data = await res.json();
      if (!res.ok) {
        setError('Payment verification record could not be located.');
      } else {
        setPaymentData(data);
      }
    } catch (err: any) {
      setError('Error communicating with server to verify payment status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [token, paymentId]);

  const handleDownloadReceiptPdf = () => {
    if (!paymentData) return;
    try {
      const doc = new jsPDF();
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 35, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('SparkGenTechnology', 14, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Online Payment Receipt', 14, 26);

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Receipt #: ${paymentData.receiptNumber || 'REC-ONLINE'}`, 14, 45);

      const tableData = [
        ['Invoice Number', paymentData.invoiceNumber || 'N/A'],
        ['Amount Received', `INR ${paymentData.amount ? paymentData.amount.toLocaleString() : '0'}`],
        ['Gateway Payment ID', paymentData.gatewayPaymentId || paymentData.paymentId || 'N/A'],
        ['Transaction Date', paymentData.confirmedAt ? new Date(paymentData.confirmedAt).toLocaleString() : new Date().toLocaleString()],
        ['Verification Status', 'Confirmed & Verified Server-Side'],
        ['Issued By', 'SparkGenTechnology Finance Remittance Desk'],
      ];

      autoTable(doc, {
        startY: 55,
        head: [['Particulars', 'Details']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 10, cellPadding: 5 },
      });

      doc.save(`Receipt-${paymentData.receiptNumber || paymentData.invoiceNumber || 'OnlinePayment'}.pdf`);
    } catch (e) {
      console.error('Failed to generate receipt PDF:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <h2 className="text-sm font-semibold text-slate-300">Verifying Payment Confirmation with Bank...</h2>
        <p className="text-xs text-slate-500 mt-1">Checking server-side settlement status</p>
      </div>
    );
  }

  // Section 15: If verification is pending, show "Payment verification in progress"
  if (paymentData?.status === 'Pending' || paymentData?.status === 'Processing') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Payment Verification in Progress</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Your payment has been received by the gateway and is undergoing automated settlement verification with the banking partner.
            </p>
          </div>
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono">
            Invoice: {paymentData?.invoiceNumber || 'Pending'}<br />
            Status: Settlement In Progress
          </div>
          <button
            onClick={checkStatus}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Check Status Again
          </button>
        </div>
      </div>
    );
  }

  if (error || !paymentData?.verified) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Payment Unconfirmed</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {error || 'The payment status could not be verified by the server.'}
            </p>
          </div>
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
            Please contact SparkGenTechnology Finance desk with your bank transaction reference.
          </div>
          <a
            href="/"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold block transition"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Success Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-center text-white space-y-3">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Payment Received</h1>
            <p className="text-xs text-emerald-100 mt-1 font-medium">
              Thank you! Your transaction has been confirmed and recorded.
            </p>
          </div>
        </div>

        {/* Payment Receipt Details */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 divide-y divide-slate-800 text-xs">
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-400">Merchant</span>
              <span className="font-bold text-white">SparkGenTechnology</span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-400">Invoice Number</span>
              <span className="font-bold text-blue-400">{paymentData.invoiceNumber}</span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-400">Payment Amount</span>
              <span className="font-black text-emerald-400 text-base">
                {formatCurrency(paymentData.amount)}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-400">Transaction Reference</span>
              <span className="font-mono text-slate-300 select-all">
                {paymentData.gatewayPaymentId || paymentData.paymentId}
              </span>
            </div>
            {paymentData.receiptNumber && (
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Official Receipt #</span>
                <span className="font-bold text-white">{paymentData.receiptNumber}</span>
              </div>
            )}
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-400">Settlement Date</span>
              <span className="text-slate-300">
                {paymentData.confirmedAt ? new Date(paymentData.confirmedAt).toLocaleString() : new Date().toLocaleString()}
              </span>
            </div>
            <div className="py-2 flex items-center justify-between">
              <span className="text-slate-400">Server Verification</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Confirmed
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={handleDownloadReceiptPdf}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow"
            >
              <Download className="w-4 h-4" /> Download Official PDF Receipt
            </button>
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-center text-[11px] text-slate-400">
            A confirmation receipt has also been registered in SparkGenTechnology's financial ledger.
          </div>
        </div>
      </div>
    </div>
  );
};
