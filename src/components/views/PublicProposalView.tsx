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
} from 'lucide-react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ProposalRecord } from '../../types/crm';
import { generateProposalPdf } from '../../utils/proposalPdfGenerator';
import { numberToWordsINR } from '../../utils/numberToWords';

interface PublicProposalViewProps {
  proposalIdOrNumber: string;
}

export const PublicProposalView: React.FC<PublicProposalViewProps> = ({ proposalIdOrNumber }) => {
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client Decision Action
  const [clientDecision, setClientDecision] = useState<'accept' | 'reject' | null>(null);
  const [clientName, setClientName] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);

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
        await updateDoc(propRef, {
          status: 'Accepted',
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
  const isTerminal = proposal.status === 'Accepted' || proposal.status === 'Rejected' || proposal.status === 'Cancelled' || isExpired;

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
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download Official PDF
            </button>

            {!isTerminal && (
              <>
                <button
                  onClick={() => setClientDecision('accept')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Accept Proposal
                </button>
                <button
                  onClick={() => setClientDecision('reject')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
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
      </div>
    </div>
  );
};
