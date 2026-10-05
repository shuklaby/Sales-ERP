import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Building,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  Check,
  AlertTriangle,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ProposalRecord } from '../../types/crm';
import { generateProposalPdf } from '../../utils/proposalPdfGenerator';
import { numberToWordsINR } from '../../utils/numberToWords';

const loadCashfreeSdk = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Cashfree) {
      return resolve((window as any).Cashfree);
    }
    const existing = document.getElementById('cashfree-sdk-js');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).Cashfree));
      return;
    }
    const script = document.createElement('script');
    script.id = 'cashfree-sdk-js';
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve((window as any).Cashfree);
    script.onerror = () => reject(new Error('Failed to load Cashfree Payment SDK. Please verify your internet connection.'));
    document.body.appendChild(script);
  });
};

interface PublicProposalViewProps {
  proposalIdOrNumber: string;
}

export const PublicProposalView: React.FC<PublicProposalViewProps> = ({ proposalIdOrNumber }) => {
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Proposal Acceptance States & Dialog
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [signatoryName, setSignatoryName] = useState('');
  const [acceptSuccessData, setAcceptSuccessData] = useState<{
    acceptedBy: string;
    acceptedAt: string;
    proposalStatus: string;
  } | null>(null);

  // Client Decision Action (Reject or Accept fallback)
  const [clientDecision, setClientDecision] = useState<'accept' | 'reject' | null>(null);
  const [clientName, setClientName] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);

  // Cashfree Payment Integration
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    orderId?: string;
    paidAmount: number;
    paymentId: string;
    remainingBalance: number;
    paymentDate?: string;
  } | null>(null);

  useEffect(() => {
    async function fetchProposal() {
      setLoading(true);
      setError(null);
      try {
        let propData: ProposalRecord | null = null;
        let propDocRef: any = null;

        // 1. Try search by viewToken first (Section 10: Secure public tokens)
        const tokenQuery = query(collection(db, 'proposals'), where('viewToken', '==', proposalIdOrNumber));
        const tokenSnap = await getDocs(tokenQuery);
        if (!tokenSnap.empty) {
          const docFound = tokenSnap.docs[0];
          propData = { id: docFound.id, ...docFound.data() } as ProposalRecord;
          propDocRef = docFound.ref;
        }

        // 2. Try search by proposalNumber
        if (!propData) {
          const numberQuery = query(collection(db, 'proposals'), where('proposalNumber', '==', proposalIdOrNumber));
          const numberSnap = await getDocs(numberQuery);
          if (!numberSnap.empty) {
            const docFound = numberSnap.docs[0];
            propData = { id: docFound.id, ...docFound.data() } as ProposalRecord;
            propDocRef = docFound.ref;
          }
        }

        // 3. Try direct document ID fallback
        if (!propData) {
          const directRef = doc(db, 'proposals', proposalIdOrNumber);
          const directSnap = await getDoc(directRef);
          if (directSnap.exists()) {
            propData = { id: directSnap.id, ...directSnap.data() } as ProposalRecord;
            propDocRef = directRef;
          }
        }

        if (!propData || !propDocRef) {
          setError('Commercial proposal not found or link has expired.');
          setLoading(false);
          return;
        }

        setProposal(propData);

        // 4. View Tracking (Section 11: Real view recording, deduplicated per browser session)
        const sessionKey = `viewed_proposal_${propData.id}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, 'true');
          const nowIso = new Date().toISOString();

          // Record view event in proposalViews
          const viewEventId = `view_${Date.now()}`;
          setDoc(doc(db, 'proposalViews', viewEventId), {
            id: viewEventId,
            proposalId: propData.id,
            proposalNumber: propData.proposalNumber,
            viewerToken: proposalIdOrNumber,
            eventType: 'VIEWED',
            timestamp: nowIso,
          }).catch(console.warn);

          // If current status is 'Sent', update to 'Viewed'
          if (propData.status === 'Sent') {
            updateDoc(propDocRef, {
              status: 'Viewed',
              viewedAt: nowIso,
              updatedAt: nowIso,
            }).catch(console.warn);

            setProposal((prev) => (prev ? { ...prev, status: 'Viewed', viewedAt: nowIso } : null));
          }

          // Create notification for admin & assigned employee (Section 24, 25)
          const notifId = `notif_${Date.now()}`;
          setDoc(doc(db, 'notifications', notifId), {
            id: notifId,
            notificationId: `NOTIF-${Date.now().toString().slice(-6)}`,
            userId: propData.assignedEmployeeId || 'all_admins',
            type: 'PROPOSAL_VIEWED',
            title: `Proposal Viewed: ${propData.proposalNumber}`,
            message: `${propData.customerName} has opened proposal ${propData.proposalNumber} via customer link`,
            relatedId: propData.id,
            relatedType: 'proposal',
            read: false,
            createdAt: nowIso,
          }).catch(console.warn);

          // Add activity
          const actId = `act_${Date.now()}`;
          setDoc(doc(db, 'activities', actId), {
            id: actId,
            activityId: actId,
            customerId: propData.customerId,
            userId: 'customer_link',
            userName: 'Customer (via link)',
            type: 'PROPOSAL_VIEWED',
            title: 'Proposal Viewed by Client',
            description: `Client opened commercial proposal ${propData.proposalNumber} [${propData.customerName}] via secure viewer link`,
            relatedId: propData.id,
            timestamp: nowIso,
            createdAt: nowIso,
          }).catch(console.warn);
        }
      } catch (err: any) {
        console.error('Failed to load public proposal:', err);
        setError('Unable to load proposal document. Please verify the URL or contact your account executive.');
      } finally {
        setLoading(false);
      }
    }

    fetchProposal();
  }, [proposalIdOrNumber]);

  // Expiry check (Section 15)
  const isExpired = useMemo(() => {
    if (!proposal || !proposal.validUntil) return false;
    const today = new Date().toISOString().split('T')[0];
    return proposal.validUntil < today && proposal.status !== 'Accepted' && proposal.status !== 'Rejected';
  }, [proposal]);

  const handleDownloadPdf = () => {
    if (!proposal) return;
    const docPdf = generateProposalPdf(proposal);
    docPdf.save(`${proposal.proposalNumber}_${(proposal.customerName || 'Proposal').replace(/\s+/g, '_')}.pdf`);

    // Record Download Event (Section 16: Proposal Tracking Timeline - Downloaded)
    const nowIso = new Date().toISOString();
    const eventId = `dl_${Date.now()}`;
    setDoc(doc(db, 'proposalViews', eventId), {
      id: eventId,
      proposalId: proposal.id,
      proposalNumber: proposal.proposalNumber,
      viewerToken: proposalIdOrNumber,
      eventType: 'DOWNLOADED',
      timestamp: nowIso,
    }).catch(console.warn);

    // Record Activity
    const actId = `act_${Date.now()}`;
    setDoc(doc(db, 'activities', actId), {
      id: actId,
      activityId: actId,
      customerId: proposal.customerId,
      userId: 'customer_link',
      userName: 'Customer (via link)',
      type: 'PROPOSAL_DOWNLOADED',
      title: 'Proposal PDF Downloaded',
      description: `Client downloaded official PDF for proposal ${proposal.proposalNumber} [${proposal.customerName}]`,
      relatedId: proposal.id,
      timestamp: nowIso,
      createdAt: nowIso,
    }).catch(console.warn);
  };

  const paymentHistoryList = useMemo(() => {
    if (!proposal) return [];
    if (Array.isArray(proposal.paymentHistory) && proposal.paymentHistory.length > 0) {
      return proposal.paymentHistory;
    }
    const paidAmt = Number(proposal.paidAmount || proposal.amountPaid || 0);
    if (paidAmt > 0) {
      return [
        {
          id: 'pay_hist_0',
          paymentId: proposal.cashfreePaymentId || proposal.cashfreeOrderId || 'CF-VERIFIED',
          amount: paidAmt,
          date: proposal.paymentDate || proposal.updatedAt || new Date().toISOString(),
          status: 'PAID',
        },
      ];
    }
    return [];
  }, [proposal]);

  // Prefill signatory name once proposal is loaded
  useEffect(() => {
    if (proposal && !signatoryName) {
      setSignatoryName(proposal.customerSnapshot?.contactPerson || proposal.customerName || '');
    }
  }, [proposal?.id]);

  // Listen for redirect return from Cashfree checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cfOrderId = params.get('cf_order_id') || params.get('order_id');
    if (cfOrderId && proposal && proposal.paymentStatus !== 'PAID' && proposal.paymentStatus !== 'Paid') {
      verifyAndFinalizePayment(cfOrderId);
    }
  }, [proposal?.id]);

  const verifyAndFinalizePayment = async (orderId: string) => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    try {
      const res = await fetch('/api/payment/cashfree/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, proposalId: proposal?.id }),
      });
      const rawText = await res.text().catch(() => '');
      let verifyData: any = null;
      try { verifyData = JSON.parse(rawText); } catch {}

      if (verifyData && verifyData.verified && (verifyData.status === 'Paid' || verifyData.status === 'PAID' || verifyData.paymentStatus === 'PAID' || verifyData.paymentStatus === 'PARTIALLY_PAID')) {
        const nowIso = verifyData.paymentDate || new Date().toISOString();
        const newlyPaid = Number(verifyData.paidAmount || 0);
        const totalPaidAmount = Number(verifyData.totalPaidAmount || verifyData.amountPaid || (proposal?.paidAmount || 0) + newlyPaid);
        const remainingBal = verifyData.balanceDue !== undefined ? Number(verifyData.balanceDue) : Math.max(0, (proposal?.grandTotal || 0) - totalPaidAmount);
        const paymentId = verifyData.paymentId || `cf_pay_${orderId}`;
        const newPaymentStatus = remainingBal <= 0 ? 'PAID' : 'PARTIALLY_PAID';

        if (proposal) {
          setProposal((prev) => {
            if (!prev) return null;
            const existingHistory = Array.isArray(prev.paymentHistory) ? prev.paymentHistory : [];
            const alreadyHas = existingHistory.some(h => h.paymentId === paymentId || h.orderId === orderId);
            const updatedHistory = alreadyHas
              ? existingHistory
              : [
                  ...existingHistory,
                  {
                    id: `pay_hist_${Date.now()}`,
                    paymentId,
                    orderId,
                    amount: newlyPaid,
                    currency: 'INR',
                    date: nowIso,
                    status: 'PAID',
                    method: verifyData.paymentMethod || 'Online',
                  },
                ];

            return {
              ...prev,
              paymentStatus: newPaymentStatus,
              paidAmount: totalPaidAmount,
              amountPaid: totalPaidAmount,
              balanceDue: remainingBal,
              paymentDate: nowIso,
              cashfreeOrderId: orderId,
              cashfreePaymentId: paymentId,
              cashfreePaymentMethod: verifyData.paymentMethod || 'Online',
              paymentGatewayUsed: 'cashfree',
              paymentHistory: updatedHistory,
            };
          });
        }

        setPaymentSuccessData({
          orderId,
          paidAmount: newlyPaid || totalPaidAmount,
          paymentId,
          remainingBalance: remainingBal,
          paymentDate: nowIso,
        });
      } else {
        if (verifyData && !verifyData.verified) {
          setPaymentError(verifyData.message || 'Payment not captured or pending. Please try again if amount was not deducted.');
        }
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Error communicating with Cashfree verification service.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleConfirmAcceptProposal = async () => {
    if (!proposal) return;
    setSubmitting(true);
    const nowIso = new Date().toISOString();
    const finalSigner = (signatoryName.trim() || proposal.customerSnapshot?.contactPerson || proposal.customerName || 'Customer Representative').trim();

    try {
      // 1. Validate & accept on server (creates activity, notification, Titan email)
      const res = await fetch('/api/proposal/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          proposalNumber: proposal.proposalNumber,
          viewToken: proposal.viewToken || proposalIdOrNumber,
          customerName: finalSigner,
          clientName: finalSigner,
        }),
      });

      const acceptRes = await res.json().catch(() => ({}));
      if (!res.ok && !acceptRes.alreadyAccepted) {
        throw new Error(acceptRes.error || 'Failed to accept proposal.');
      }

      const acceptedTime = acceptRes.acceptedAt || nowIso;
      const grandTotal = Number(proposal.grandTotal || 0);
      const currentPaid = Number(proposal.paidAmount || proposal.amountPaid || 0);
      const balanceDue = Math.max(0, grandTotal - currentPaid);
      const newPayStatus = currentPaid >= grandTotal ? 'PAID' : (currentPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

      // Update local proposal state
      setProposal((prev) => prev ? {
        ...prev,
        status: 'Accepted',
        acceptedAt: acceptedTime,
        acceptedBy: finalSigner,
        paymentStatus: newPayStatus,
        paidAmount: currentPaid,
        amountPaid: currentPaid,
        balanceDue,
      } : null);

      setAcceptSuccessData({
        acceptedBy: finalSigner,
        acceptedAt: acceptedTime,
        proposalStatus: 'ACCEPTED',
      });

      setShowAcceptDialog(false);
    } catch (err: any) {
      console.error('[Accept Proposal Error]', err);
      alert(err.message || 'Failed to accept proposal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayWithCashfree = async () => {
    if (!proposal) return;
    const currentStatus = String(proposal.status || '').toUpperCase();
    if (currentStatus !== 'ACCEPTED') {
      alert('Security Notice: You must accept the proposal before making a payment.');
      return;
    }
    const balance = proposal.balanceDue !== undefined ? Number(proposal.balanceDue) : Math.max(0, (proposal.grandTotal || 0) - (proposal.paidAmount || 0));
    if (balance <= 0) {
      alert('This proposal has already been paid in full.');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const res = await fetch('/api/payment/cashfree/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          proposalNumber: proposal.proposalNumber,
          viewToken: proposal.viewToken || proposalIdOrNumber,
          customerDetails: {
            name: proposal.acceptedBy || proposal.customerName,
            email: proposal.customerEmail || proposal.customerSnapshot?.email,
            phone: proposal.customerMobile || proposal.customerSnapshot?.mobile,
          },
        }),
      });

      const rawText = await res.text().catch(() => '');
      let orderData: any = null;
      try { orderData = JSON.parse(rawText); } catch {}

      if (!res.ok || !orderData || !orderData.paymentSessionId) {
        throw new Error(orderData?.error || 'Failed to initialize Cashfree payment session.');
      }

      const CashfreeSdk = await loadCashfreeSdk();
      const cashfreeInstance = CashfreeSdk({
        mode: orderData.environment === 'production' ? 'production' : 'sandbox',
      });

      const checkoutOptions = {
        paymentSessionId: orderData.paymentSessionId,
        redirectTarget: '_modal',
      };

      cashfreeInstance.checkout(checkoutOptions).then(async (result: any) => {
        console.log('[Cashfree Modal Result]', result);
        await verifyAndFinalizePayment(orderData.orderId);
      });
    } catch (err: any) {
      console.error('[Cashfree Error]', err);
      setPaymentError(err.message || 'Unable to open Cashfree Checkout. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleClientDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal || !clientDecision) return;
    if (!clientName.trim()) {
      alert('Please enter your full name as authorized client representative.');
      return;
    }

    setSubmitting(true);
    const nowIso = new Date().toISOString();
    const cleanClientName = clientName.trim() + ' (Response submitted through proposal link)';

    try {
      const propRef = doc(db, 'proposals', proposal.id);

      if (clientDecision === 'accept') {
        const currentPayStatus = proposal.paymentStatus === 'Paid' ? 'Paid' : 'Pending';
        await updateDoc(propRef, {
          status: 'Accepted',
          paymentStatus: currentPayStatus,
          acceptedAt: nowIso,
          acceptedBy: cleanClientName,
          updatedAt: nowIso,
        });

        // Record in proposalViews
        const eventId = `resp_${Date.now()}`;
        await setDoc(doc(db, 'proposalViews', eventId), {
          id: eventId,
          proposalId: proposal.id,
          proposalNumber: proposal.proposalNumber,
          viewerToken: proposalIdOrNumber,
          eventType: 'ACCEPTED',
          customerResponse: 'Accepted',
          acceptedBy: cleanClientName,
          timestamp: nowIso,
        });

        // Notification for admin and employee
        const notifId = `notif_${Date.now()}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          notificationId: `NOTIF-${Date.now().toString().slice(-6)}`,
          userId: proposal.assignedEmployeeId || 'all_admins',
          type: 'PROPOSAL_ACCEPTED',
          title: `Proposal Accepted 🎉: ${proposal.proposalNumber}`,
          message: `${clientName.trim()} has accepted proposal ${proposal.proposalNumber} for ₹${proposal.grandTotal.toLocaleString('en-IN')}!`,
          relatedId: proposal.id,
          relatedType: 'proposal',
          read: false,
          createdAt: nowIso,
        });

        // Activity log
        const actId = `act_${Date.now()}`;
        await setDoc(doc(db, 'activities', actId), {
          id: actId,
          activityId: actId,
          customerId: proposal.customerId,
          userId: 'customer_link',
          userName: clientName.trim(),
          type: 'PROPOSAL_ACCEPTED',
          title: 'Proposal Accepted by Client',
          description: `${clientName.trim()} accepted proposal ${proposal.proposalNumber} for ₹${proposal.grandTotal.toLocaleString('en-IN')}`,
          relatedId: proposal.id,
          timestamp: nowIso,
          createdAt: nowIso,
        });

        setProposal((prev) =>
          prev
            ? {
                ...prev,
                status: 'Accepted',
                paymentStatus: currentPayStatus,
                acceptedAt: nowIso,
                acceptedBy: cleanClientName,
              }
            : null
        );
        setDecisionSuccess(`Commercial Proposal ${proposal.proposalNumber} successfully Accepted on ${new Date(nowIso).toLocaleDateString('en-IN')}! Thank you.`);
      } else {
        await updateDoc(propRef, {
          status: 'Rejected',
          rejectedAt: nowIso,
          rejectionReason: decisionNotes || `Declined by client representative: ${clientName.trim()}`,
          updatedAt: nowIso,
        });

        const eventId = `resp_${Date.now()}`;
        await setDoc(doc(db, 'proposalViews', eventId), {
          id: eventId,
          proposalId: proposal.id,
          proposalNumber: proposal.proposalNumber,
          viewerToken: proposalIdOrNumber,
          eventType: 'REJECTED',
          customerResponse: 'Rejected',
          responseReason: decisionNotes || 'Declined by customer',
          acceptedBy: cleanClientName,
          timestamp: nowIso,
        });

        const notifId = `notif_${Date.now()}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          notificationId: `NOTIF-${Date.now().toString().slice(-6)}`,
          userId: proposal.assignedEmployeeId || 'all_admins',
          type: 'PROPOSAL_REJECTED',
          title: `Proposal Rejected: ${proposal.proposalNumber}`,
          message: `${clientName.trim()} declined proposal ${proposal.proposalNumber}. Reason: "${decisionNotes || 'No specific reason'}"`,
          relatedId: proposal.id,
          relatedType: 'proposal',
          read: false,
          createdAt: nowIso,
        });

        const actId = `act_${Date.now()}`;
        await setDoc(doc(db, 'activities', actId), {
          id: actId,
          activityId: actId,
          customerId: proposal.customerId,
          userId: 'customer_link',
          userName: clientName.trim(),
          type: 'PROPOSAL_REJECTED',
          title: 'Proposal Rejected by Client',
          description: `${clientName.trim()} declined proposal ${proposal.proposalNumber}: "${decisionNotes || 'No specific reason'}"`,
          relatedId: proposal.id,
          timestamp: nowIso,
          createdAt: nowIso,
        });

        setProposal((prev) =>
          prev
            ? {
                ...prev,
                status: 'Rejected',
                rejectedAt: nowIso,
                rejectionReason: decisionNotes || `Declined by client: ${clientName.trim()}`,
              }
            : null
        );
        setDecisionSuccess('Your response has been registered. Our account representative will follow up.');
      }
      setClientDecision(null);
    } catch (err: any) {
      alert('Failed to submit decision: ' + (err.message || 'Please contact your account manager.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300">Loading Secure Commercial Proposal...</p>
        <span className="text-xs text-slate-500 font-mono mt-1">Ref: {proposalIdOrNumber}</span>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Proposal Not Accessible</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'This commercial proposal could not be retrieved. It may have expired or been relocated.'}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors mt-2"
          >
            Return to Portal Home
          </a>
        </div>
      </div>
    );
  }

  const comp = proposal.companySnapshot || {
    companyName: 'SparkGenTechnology',
    address: 'SparkGen Technology Innovation Park, Phase 2, Tech Hub',
    phone: '+91 98765 43210',
    email: 'sales@sparkgentechnology.com',
    website: 'https://sparkgentechnology.com',
    gstNumber: '29AAECS1234F1Z8',
  };

  const bank = proposal.bankSnapshot;

  const isCancelled = (proposal.status || '').toUpperCase() === 'CANCELLED';
  const proposalStatus = (proposal.status || 'DRAFT').toUpperCase();
  const isAccepted = proposalStatus === 'ACCEPTED' || proposal.status === 'Accepted';

  const amountPayable = Number(proposal.grandTotal || 0);
  const amountPaid = Number(proposal.paidAmount || proposal.amountPaid || 0);
  const balanceDue = proposal.balanceDue !== undefined ? Number(proposal.balanceDue) : Math.max(0, amountPayable - amountPaid);
  const paymentStatus = (proposal.paymentStatus || (amountPaid >= amountPayable && amountPayable > 0 ? 'PAID' : (amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'))).toUpperCase();

  const isTerminal = isAccepted || proposal.status === 'Rejected' || isCancelled || isExpired;

  return (
    <div className="min-h-screen bg-slate-100 antialiased text-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Floating Action Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {comp.logoUrl ? (
              <img src={comp.logoUrl} alt={comp.companyName} className="h-10 w-auto object-contain max-w-[120px]" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                SG
              </div>
            )}
            <div>
              <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                {comp.companyName}
              </h1>
              <p className="text-[11px] text-slate-500 font-mono">
                Proposal #{proposal.proposalNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download Official PDF
            </button>

            {isAccepted && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ✓ Proposal Accepted
              </span>
            )}

            {!isTerminal && (
              <>
                <button
                  onClick={() => setShowAcceptDialog(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Accept Proposal
                </button>
                <button
                  onClick={() => setClientDecision('reject')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject Proposal
                </button>
              </>
            )}
          </div>
        </div>

        {/* Expired Callout (Section 15) */}
        {isExpired && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-semibold shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold block">This proposal has expired.</span>
              The validity period concluded on {proposal.validUntil}. Please contact SparkGenTechnology to request an updated commercial quote.
            </div>
          </div>
        )}

        {decisionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900 font-semibold shadow-2xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{decisionSuccess}</span>
          </div>
        )}

        {/* Client Decision Form Prompt */}
        {clientDecision && (
          <div className="bg-white rounded-2xl border-2 border-indigo-500 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                {clientDecision === 'accept' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                Confirm Commercial Decision: {clientDecision === 'accept' ? 'Accept Proposal' : 'Reject Proposal'}
              </h3>
              <button onClick={() => setClientDecision(null)} className="text-slate-400 hover:text-slate-600 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleClientDecisionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Full Name (Authorized Signatory) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma, VP Procurement"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {clientDecision === 'reject' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason / Feedback for Rejection (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Budget revised, chosen competitor, scope changed..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClientDecision(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs ${
                    clientDecision === 'accept'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? 'Submitting Decision...' : `Confirm & ${clientDecision === 'accept' ? 'Accept' : 'Reject'}`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Commercial Document Main Sheet */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-slate-950 text-white p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <span className="text-[10px] tracking-widest uppercase font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-800/50">
                Official Commercial Proposal
              </span>
              <h2 className="text-2xl font-black mt-2 tracking-tight">{comp.companyName}</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">{comp.address}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                {comp.phone && <span>Tel: {comp.phone}</span>}
                {comp.email && <span>Email: {comp.email}</span>}
                {comp.gstNumber && <span className="font-mono">GSTIN: {comp.gstNumber}</span>}
              </div>
            </div>

            <div className="text-left sm:text-right bg-slate-900/90 border border-slate-800 p-4 rounded-2xl min-w-[200px]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Proposal Number</span>
              <span className="font-mono font-black text-lg text-white block">{proposal.proposalNumber}</span>
              <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between sm:justify-end gap-2 text-xs">
                <span className="text-slate-400">Status:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                    proposal.status === 'Accepted'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : proposal.status === 'Rejected'
                      ? 'bg-rose-500/20 text-rose-300'
                      : isExpired
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-indigo-500/20 text-indigo-300'
                  }`}
                >
                  {isExpired && proposal.status !== 'Accepted' && proposal.status !== 'Rejected' ? 'Expired' : proposal.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Prepared For & Document Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Proposal Prepared For (Client)
                </span>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">{proposal.customerName}</h3>
                {proposal.customerSnapshot?.contactPerson && (
                  <p className="text-xs text-slate-700 mt-0.5">Attn: {proposal.customerSnapshot.contactPerson}</p>
                )}
                {proposal.customerAddress && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{proposal.customerAddress}</p>
                )}
                <div className="text-xs text-slate-500 mt-2 space-y-0.5 font-mono">
                  {proposal.customerMobile && <p>Mobile: {proposal.customerMobile}</p>}
                  {proposal.customerEmail && <p>Email: {proposal.customerEmail}</p>}
                  {proposal.customerGst && <p>GSTIN: {proposal.customerGst}</p>}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Document Metadata
                </span>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Date of Issue:</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(proposal.proposalDate || proposal.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Proposal Valid Until:</span>
                  <span className="font-semibold text-indigo-700">{proposal.validUntil}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Prepared By:</span>
                  <span className="font-semibold text-slate-900">{proposal.createdByName || 'Sales Representative'}</span>
                </div>
                {proposal.stsNumber && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">STS Technical Reference:</span>
                    <span className="font-mono font-semibold text-slate-900">{proposal.stsNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Products & Commercial Services ({proposal.items?.length || 0})
              </h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-4">Item & Description</th>
                      <th className="py-3 px-3 text-center">Type</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-3 text-right">Unit Rate</th>
                      <th className="py-3 px-3 text-center">Disc</th>
                      <th className="py-3 px-3 text-center">GST</th>
                      <th className="py-3 px-4 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {proposal.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{item.name}</span>
                          {item.description && (
                            <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                              {item.description}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.type ? item.type.toUpperCase() : 'PRODUCT'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold">
                          {item.quantity} {item.unit || 'units'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {item.discountPercent ? `${item.discountPercent}%` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {item.gstRate}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{(item.totalAmount || item.lineTotal || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Commercial Calculation Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t border-slate-200">
              <div className="w-full sm:max-w-md space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Amount in Words:
                </span>
                <p className="text-xs font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200 italic">
                  Indian Rupees {numberToWordsINR(proposal.grandTotal)} Only
                </p>
              </div>

              <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">₹{proposal.subtotal.toLocaleString('en-IN')}</span>
                </div>
                {proposal.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Commercial Discount:</span>
                    <span className="font-mono">-₹{proposal.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Base:</span>
                  <span className="font-mono">₹{proposal.taxableAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Taxes Total:</span>
                  <span className="font-mono">₹{proposal.gstTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-950">
                  <span>Grand Total (INR):</span>
                  <span className="font-mono text-indigo-700 text-base">
                    ₹{proposal.grandTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Details Coordinates */}
            {bank && bank.accountNumber && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Direct Remittance Banking Details
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Bank Name:</span>
                    <span className="font-semibold text-slate-800">{bank.bankName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Account Number:</span>
                    <span className="font-mono font-bold text-slate-900">{bank.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">IFSC Code:</span>
                    <span className="font-mono font-semibold text-slate-800">{bank.ifscCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Beneficiary:</span>
                    <span className="font-semibold text-slate-800">{bank.accountHolderName}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Terms and Conditions */}
            {proposal.terms && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-slate-600" /> Terms & Commercial Conditions
                </h4>
                <div className="text-slate-600 whitespace-pre-wrap leading-relaxed text-[11px] font-sans">
                  {proposal.terms}
                </div>
              </div>
            )}

            {/* Signature Area (Section 12: Signature Area) */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  For {comp.companyName} (Issuer)
                </span>
                <div className="h-14 flex items-end">
                  {proposal.createdByName ? (
                    <div className="border-b border-dashed border-slate-400 pb-1 w-full flex items-center justify-between">
                      <span className="font-serif italic text-sm text-slate-700 font-semibold">{proposal.createdByName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Digital Record</span>
                    </div>
                  ) : (
                    <div className="border-b border-dashed border-slate-300 pb-1 w-full text-[11px] text-slate-400 italic">
                      Authorized Signatory
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  <p className="font-semibold text-slate-800">{proposal.createdByName || 'Authorized Executive'}</p>
                  <p>SparkGenTechnology Commercial Desk</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Accepted & Acknowledged For (Client)
                </span>
                <div className="h-14 flex items-end">
                  {proposal.status === 'Accepted' ? (
                    <div className="border-b border-dashed border-emerald-400 pb-1 w-full flex items-center justify-between">
                      <span className="font-serif italic text-sm text-emerald-800 font-semibold">
                        {proposal.acceptedBy || 'Client Representative'}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-mono font-medium">✓ Accepted</span>
                    </div>
                  ) : (
                    <div className="border-b border-dashed border-slate-300 pb-1 w-full text-[11px] text-slate-400 italic">
                      Client Signature / Stamp
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  <p className="font-semibold text-slate-800">
                    {proposal.acceptedBy ? proposal.acceptedBy.replace(' (Response submitted through proposal link)', '') : proposal.customerSnapshot?.contactPerson || proposal.customerName}
                  </p>
                  <p>{proposal.customerName}</p>
                  {proposal.acceptedAt && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Accepted: {new Date(proposal.acceptedAt).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* PROPOSAL ACCEPTANCE & PAYMENT SECTION                            */}
        {/* ================================================================ */}
        <div id="proposal-acceptance-section" className="space-y-6">
          {/* If Proposal is CANCELLED: Hide Accept Proposal and Pay Now */}
          {isCancelled ? (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 sm:p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-rose-950">Proposal Cancelled</h3>
              <p className="text-xs text-rose-700 max-w-md mx-auto">
                This commercial proposal has been cancelled. Proposal acceptance and online payments are unavailable.
              </p>
            </div>
          ) : (
            <>
              {/* -------------------------------- */}
              {/* PROPOSAL ACCEPTANCE              */}
              {/* -------------------------------- */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="bg-slate-900 text-white p-6 sm:p-7 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                        Commercial Verification
                      </span>
                      <h3 className="text-base sm:text-lg font-black tracking-tight">
                        PROPOSAL ACCEPTANCE
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isAccepted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isExpired
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-white/10 text-slate-300 border border-white/10'
                      }`}
                    >
                      Proposal Status: {proposalStatus}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  {/* If Proposal is NOT ACCEPTED yet */}
                  {!isAccepted ? (
                    <div className="space-y-5">
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl font-medium">
                        Please review the proposal details carefully. By clicking Accept Proposal, you confirm that you accept the proposal terms and pricing.
                      </p>

                      {isExpired && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 font-medium">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>This proposal expired on {proposal.validUntil}. Acceptance is disabled.</span>
                        </div>
                      )}

                      <div>
                        <button
                          type="button"
                          onClick={() => setShowAcceptDialog(true)}
                          disabled={isExpired || submitting}
                          className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Accept Proposal</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Once accepted, customer should NOT see Accept Proposal again. Instead show: */
                    <div className="space-y-4">
                      {acceptSuccessData && (
                        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-900 shadow-xs">
                          <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                          <div>
                            <h4 className="font-bold text-sm">Proposal Accepted Successfully</h4>
                            <p className="text-xs text-emerald-700">
                              Your commercial confirmation has been recorded and registered in our system.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                            ✓
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-emerald-950">✓ Proposal Accepted</h4>
                            <p className="text-xs text-emerald-700 font-medium">
                              Accepted on: {proposal.acceptedAt ? new Date(proposal.acceptedAt).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }) : 'Recorded'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-emerald-200/80 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-emerald-200">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Accepted By</span>
                            <span className="font-semibold text-slate-900 block truncate">
                              {proposal.acceptedBy ? proposal.acceptedBy.replace(' (Response submitted through proposal link)', '') : (proposal.customerSnapshot?.contactPerson || proposal.customerName)}
                            </span>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-emerald-200">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Accepted At</span>
                            <span className="font-mono text-slate-800">
                              {proposal.acceptedAt ? new Date(proposal.acceptedAt).toLocaleString('en-IN') : '-'}
                            </span>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-emerald-200">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Proposal Status</span>
                            <span className="font-bold text-emerald-700 uppercase">
                              ACCEPTED
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* -------------------------------- */}
              {/* PAYMENT SECTION                  */}
              {/* (Only shown when proposalStatus === ACCEPTED) */}
              {/* -------------------------------- */}
              {isAccepted && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                  <div className="bg-linear-to-r from-indigo-900 to-slate-900 text-white p-6 sm:p-7 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-indigo-300" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                          Commercial Remittance
                        </span>
                        <h3 className="text-base sm:text-lg font-black tracking-tight">
                          PAYMENT
                        </h3>
                      </div>
                    </div>

                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        balanceDue === 0 || paymentStatus === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        Payment Status: {paymentStatus}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Amount Summary Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Amount Payable
                        </span>
                        <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 block mt-1">
                          ₹{amountPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                          Amount Paid
                        </span>
                        <span className="text-xl sm:text-2xl font-black font-mono text-emerald-800 block mt-1">
                          ₹{amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className={`p-4 rounded-2xl border ${
                        balanceDue > 0
                          ? 'bg-indigo-50/80 border-indigo-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}>
                        <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                          balanceDue > 0 ? 'text-indigo-700' : 'text-slate-400'
                        }`}>
                          Balance Due
                        </span>
                        <span className={`text-xl sm:text-2xl font-black font-mono block mt-1 ${
                          balanceDue > 0 ? 'text-indigo-900' : 'text-slate-600'
                        }`}>
                          ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* If Payment Successful Callout */}
                    {paymentSuccessData && (
                      <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                          <h4 className="text-sm font-bold text-emerald-950">✓ Payment Successful</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                          <div>
                            <span className="text-slate-500 block">Amount Paid:</span>
                            <span className="font-mono font-bold text-emerald-800 text-sm">
                              ₹{paymentSuccessData.paidAmount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Payment ID:</span>
                            <span className="font-mono text-slate-800 font-semibold truncate block">
                              {paymentSuccessData.paymentId}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Remaining Balance:</span>
                            <span className="font-mono font-bold text-slate-800 text-sm">
                              ₹{paymentSuccessData.remainingBalance.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PAY NOW VISIBILITY RULE:
                        IF proposalStatus == ACCEPTED AND balanceDue > 0: Show Pay Now.
                        IF proposalStatus == ACCEPTED AND balanceDue == 0: Hide Pay Now and show: ✓ Payment Completed / ✓ Fully Paid
                    */}
                    {balanceDue > 0 ? (
                      <div className="pt-2 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Proceed to Cashfree Checkout</h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Pay outstanding balance of ₹{balanceDue.toLocaleString('en-IN')} securely via UPI, Cards, Net Banking
                            </p>
                          </div>

                          <div>
                            <button
                              type="button"
                              onClick={handlePayWithCashfree}
                              disabled={isProcessingPayment || isExpired}
                              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {isProcessingPayment ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>Opening Cashfree Checkout...</span>
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4" />
                                  <span>PAY NOW</span>
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {paymentError && (
                          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                            <div>
                              <span className="font-bold block">Payment Incomplete</span>
                              <span>{paymentError}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 text-slate-400 text-xs">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>256-bit Encrypted Security via Cashfree Payments</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span>Supports: UPI • Cards • Net Banking • Wallets</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* balanceDue === 0: Hide Pay Now and show: ✓ Payment Completed / ✓ Fully Paid */
                      <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                            ✓
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-emerald-950">✓ Payment Completed</h4>
                            <p className="text-xs text-emerald-700">
                              This commercial proposal is fully paid in full.
                            </p>
                          </div>
                        </div>

                        <span className="px-4 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-bold shadow-xs">
                          ✓ Fully Paid
                        </span>
                      </div>
                    )}

                    {/* PAYMENT HISTORY TABLE */}
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                        Payment History
                      </h4>

                      {paymentHistoryList.length > 0 ? (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-4 font-semibold">Date</th>
                                <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                                <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                                <th className="py-2.5 px-4 font-semibold font-mono">Payment ID</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {paymentHistoryList.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 px-4 text-slate-700">
                                    {new Date(item.date).toLocaleString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                                    ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      {item.status || 'PAID'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                                    {item.paymentId || item.orderId || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 text-center">
                          No payment records found yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ACCEPT PROPOSAL CONFIRMATION DIALOG MODAL */}
        {showAcceptDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Accept Proposal</h3>
                  <p className="text-xs text-slate-500">Commercial Proposal #{proposal.proposalNumber}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-900 text-sm">
                  Are you sure you want to accept this proposal?
                </p>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  By confirming, you accept the commercial proposal terms, scope of work, and pricing of ₹{amountPayable.toLocaleString('en-IN')}.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authorized Signatory / Customer Representative *
                </label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="Enter authorized customer name"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAcceptDialog(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAcceptProposal}
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Proposal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
