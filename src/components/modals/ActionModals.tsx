import React, { useState, useEffect } from 'react';
import {
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  X,
  ExternalLink,
  CheckCircle,
  Clock,
  RotateCcw,
  Info,
  PhoneCall,
} from 'lucide-react';
import { Customer, Lead, STSRecord, ProposalRecord, CallRecord, FollowUpRecord, CallStatus } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';

/* =========================================================================
   1. CALL MODAL (Initiation + Post-Call Outcome Recording)
   ========================================================================= */

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: Customer | Lead | STSRecord;
  entityType: 'customer' | 'lead' | 'sts';
  existingCallToRecord?: CallRecord | null;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  entity,
  entityType,
  existingCallToRecord,
}) => {
  const { initiateCall, updateCallOutcome } = useCrmData();
  const { userProfile } = useAuth();

  const [activeCall, setActiveCall] = useState<CallRecord | null>(existingCallToRecord || null);
  const [status, setStatus] = useState<CallStatus>('Connected');
  const [outcome, setOutcome] = useState('Interested in services');
  const [notes, setNotes] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [nextFollowupTime, setNextFollowupTime] = useState('11:00');
  const [isInitiating, setIsInitiating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-initiate call on open if not already initiated
  useEffect(() => {
    if (!isOpen) {
      setActiveCall(null);
      setError('');
      setNotes('');
      setNextFollowupDate('');
      return;
    }

    if (existingCallToRecord) {
      setActiveCall(existingCallToRecord);
      setStatus(existingCallToRecord.status === 'initiated' ? 'Connected' : (existingCallToRecord.status as CallStatus));
      setOutcome(existingCallToRecord.outcome || 'Interested in services');
      setNotes(existingCallToRecord.notes || '');
      setNextFollowupDate(existingCallToRecord.nextFollowupDate || existingCallToRecord.followUpDate || '');
      return;
    }

    // Auto-initiate call when opened
    const startCall = async () => {
      if (!userProfile) return;
      setIsInitiating(true);
      setError('');
      try {
        const initiated = await initiateCall({
          customerId: entityType === 'customer' ? entity.id : undefined,
          leadId: entityType === 'lead' ? entity.id : undefined,
          stsId: entityType === 'sts' ? entity.id : undefined,
          companyName: entity.companyName,
          contactPerson: entity.contactPerson,
          mobile: ('mobile' in entity && entity.mobile) ? entity.mobile : (('phone' in entity && entity.phone) ? entity.phone : ''),
        });
        setActiveCall(initiated);
      } catch (err: any) {
        console.error('Call initiation error:', err);
        setError(err.message || 'Could not initiate call');
      } finally {
        setIsInitiating(false);
      }
    };

    startCall();
  }, [isOpen, entity, entityType, existingCallToRecord, userProfile]);

  if (!isOpen) return null;

  const handleRedial = () => {
    const rawNumber = ('mobile' in entity && entity.mobile) || ('phone' in entity && entity.phone) || '';
    const cleanNumber = rawNumber.replace(/[^\d+]/g, '');
    if (cleanNumber) {
      window.location.href = `tel:${cleanNumber}`;
    }
  };

  const handleSaveOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCall) return;
    if (!notes.trim()) {
      setError('Please provide call notes / discussion summary.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await updateCallOutcome(activeCall.id, {
        status,
        outcome: outcome.trim(),
        notes: notes.trim(),
        nextFollowupDate: nextFollowupDate || undefined,
        nextFollowupTime: nextFollowupDate ? nextFollowupTime : undefined,
        actualDuration: null, // No telephony provider integrated yet
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update call outcome');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-6 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Call Activity & Dialer</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {activeCall ? activeCall.callId : 'Initiating...'}
                </span>
              </div>
              <p className="text-xs text-slate-400">{entity.contactPerson} ({entity.companyName})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Call Info / Dialer Launch Notice */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium uppercase tracking-wider">
                Target Phone Number
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-slate-900 text-base font-mono">{entity.mobile}</span>
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 font-semibold rounded-full">
                  Status: {activeCall?.status || 'initiated'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRedial}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" /> Re-dial Device (tel:)
            </button>
          </div>

          <div className="flex items-start gap-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>CRM Dialer Active:</strong> Dialer triggered on device. Duration is preserved as{' '}
              <em className="font-semibold">"Duration not available"</em> until connected to a telephony API. Record
              the call outcome and conversation notes below once complete.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-medium">
              {error}
            </div>
          )}

          {/* Outcome Form */}
          <form onSubmit={handleSaveOutcome} className="space-y-3.5 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Record Call Outcome & Notes</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Call Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CallStatus)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-slate-900"
                >
                  <option value="Connected">Connected</option>
                  <option value="Not Connected">Not Connected</option>
                  <option value="Busy">Busy</option>
                  <option value="No Answer">No Answer</option>
                  <option value="Switched Off">Switched Off</option>
                  <option value="Wrong Number">Wrong Number</option>
                  <option value="Callback Requested">Callback Requested</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Call Outcome</label>
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="e.g. Quotation Requested / Demo Fixed"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Call Notes / Discussion Summary *</label>
              <textarea
                required
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key requirements discussed, customer reaction, decision maker availability..."
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Next Follow-up scheduler */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                Schedule Follow-up (Optional)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={nextFollowupDate}
                    onChange={(e) => setNextFollowupDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Next Follow-up Time</label>
                  <input
                    type="time"
                    value={nextFollowupTime}
                    onChange={(e) => setNextFollowupTime(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close (Keep In Progress)
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isInitiating}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Outcome...' : 'Save Call Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   2. CALL DETAILS MODAL (Duration, Timestamps, Outcome, Telephony Status)
   ========================================================================= */

interface CallDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: CallRecord | null;
  onRecordOutcome?: (call: CallRecord) => void;
}

export const CallDetailModal: React.FC<CallDetailModalProps> = ({
  isOpen,
  onClose,
  call,
  onRecordOutcome,
}) => {
  if (!isOpen || !call) return null;

  const formatDuration = (sec: number | null | undefined) => {
    if (sec === null || sec === undefined) {
      return 'Duration not available';
    }
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-6 overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Call Log Details</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                  {call.callId}
                </span>
              </div>
              <p className="text-xs text-slate-400">{call.contactPerson} ({call.companyName})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Customer / Lead</span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">{call.companyName}</span>
              <span className="text-slate-600">{call.contactPerson}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Phone Number</span>
              <a
                href={`tel:${call.mobile}`}
                className="font-bold text-indigo-600 font-mono text-sm block mt-0.5 hover:underline"
              >
                {call.mobile}
              </a>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{call.direction || 'outgoing'} call</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Executive / Employee</span>
              <span className="font-semibold text-slate-800 block mt-0.5">{call.employeeName}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Call Status</span>
              <span className="inline-block mt-0.5 font-bold px-2 py-0.5 rounded-md text-slate-900 bg-slate-200">
                {call.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-medium uppercase">Started At</span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {new Date(call.initiatedAt || call.dateTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(call.initiatedAt || call.dateTime).toLocaleDateString()}
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-medium uppercase">Ended At</span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {call.endedAt
                  ? new Date(call.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400">
                {call.endedAt ? new Date(call.endedAt).toLocaleDateString() : 'In progress/Manual'}
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 block font-medium uppercase">Call Duration</span>
              <span className="font-bold text-slate-800 block mt-0.5">
                {formatDuration(call.actualDuration)}
              </span>
              <span className="text-[10px] text-slate-400">
                {call.actualDuration ? 'Telephony Confirmed' : 'No telephony API'}
              </span>
            </div>
          </div>

          {call.outcome && (
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">Outcome</span>
              <p className="font-semibold text-indigo-950 mt-0.5">{call.outcome}</p>
            </div>
          )}

          <div>
            <span className="text-[11px] text-slate-400 font-semibold block mb-1 uppercase tracking-wider">
              Discussion Notes
            </span>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
              {call.notes || 'No discussion notes recorded.'}
            </div>
          </div>

          {(call.nextFollowupDate || call.followUpDate) && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="text-[11px] font-bold block">Next Follow-up Scheduled:</span>
                <span className="font-semibold">
                  {call.nextFollowupDate || call.followUpDate} at {call.nextFollowupTime || '11:00 AM'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <a
              href={`tel:${call.mobile}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" /> Quick Dial
            </a>

            <div className="flex items-center gap-2">
              {call.status === 'initiated' && onRecordOutcome && (
                <button
                  onClick={() => {
                    onClose();
                    onRecordOutcome(call);
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Record Outcome
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 font-medium rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. WHATSAPP MODAL (Templates, Editing, Real-Time Log)
   ========================================================================= */

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: Customer | Lead;
  entityType: 'customer' | 'lead';
  proposal?: ProposalRecord;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  entity,
  entityType,
  proposal,
}) => {
  const { logWhatsApp, companySettings } = useCrmData();
  const { userProfile } = useAuth();

  const [templateType, setTemplateType] = useState<
    'Initial Contact' | 'Follow-up' | 'Proposal Message' | 'Custom Message'
  >(proposal ? 'Proposal Message' : 'Initial Contact');

  const getTemplateContent = (type: string) => {
    const repName = userProfile?.name || 'Sales Team';
    const compName = companySettings.companyName || 'SparkGenTechnology';

    switch (type) {
      case 'Initial Contact':
        return `Hello ${entity.contactPerson},\n\nThis is ${repName} from ${compName}. We received your inquiry regarding technology solutions for ${entity.companyName}. We would love to connect and understand your specific requirements.\n\nCould we schedule a quick call today?`;
      case 'Follow-up':
        return `Dear ${entity.contactPerson},\n\nFollowing up on our recent discussion regarding ${entity.companyName}'s requirements. Please let us know if you need any additional clarifications or product demonstrations.\n\nWarm regards,\n${repName} | ${compName}`;
      case 'Proposal Message':
        return `Dear ${entity.contactPerson},\n\nWe have prepared the detailed commercial proposal ${
          proposal ? `(${proposal.proposalNumber})` : ''
        } for ${entity.companyName}.\n\nTotal Valuation: ₹${
          proposal ? proposal.grandTotal.toLocaleString('en-IN') : 'As discussed'
        }\n\nPlease review and let us know your thoughts so we can assist further.\n\nBest regards,\n${repName} | ${compName}`;
      case 'Custom Message':
      default:
        return `Hello ${entity.contactPerson},\n\nConnecting regarding ${entity.companyName}.\n\nBest regards,\n${repName}`;
    }
  };

  const [message, setMessage] = useState(getTemplateContent(templateType));

  useEffect(() => {
    setMessage(getTemplateContent(templateType));
  }, [templateType, entity, proposal]);

  if (!isOpen) return null;

  const handleOpenWhatsApp = async () => {
    if (!userProfile) return;

    const cleanPhone = entity.mobile.replace(/[^\d]/g, '');
    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;

    // Log the WhatsApp activity as specified in Phase 4
    await logWhatsApp({
      customerId: entityType === 'customer' ? entity.id : undefined,
      leadId: entityType === 'lead' ? entity.id : undefined,
      employeeId: userProfile.uid,
      employeeName: userProfile.name,
      phoneNumber: entity.mobile,
      mobile: entity.mobile,
      message,
      messageType: templateType,
      status: 'Opened WhatsApp', // Do NOT mark Delivered or Read without official API
    });

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-6 overflow-hidden border border-slate-200">
        <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/30 text-white rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Send WhatsApp Message</h3>
              <p className="text-xs text-emerald-100">{entity.contactPerson} ({entity.mobile})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Message Template
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Initial Contact', 'Follow-up', 'Proposal Message', 'Custom Message'] as const).map((tmpl) => (
                <button
                  key={tmpl}
                  type="button"
                  onClick={() => setTemplateType(tmpl)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                    templateType === tmpl
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Editable Message Preview</label>
              <span className="text-[10px] text-slate-400">Feel free to personalize</span>
            </div>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <span className="font-semibold text-slate-700 block">Status Recording Note:</span>
            <p>
              When you click "Open in WhatsApp", the CRM logs this activity with status{' '}
              <span className="font-bold text-slate-800">"Opened WhatsApp"</span>. As per compliance standards,
              messages are not marked Delivered/Read without official WhatsApp Business API verification.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. EMAIL MODAL
   ========================================================================= */

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: Customer | Lead;
  entityType: 'customer' | 'lead';
  proposal?: ProposalRecord;
}

export const EmailModal: React.FC<EmailModalProps> = ({
  isOpen,
  onClose,
  entity,
  entityType,
  proposal,
}) => {
  const { logEmail, companySettings } = useCrmData();
  const { userProfile } = useAuth();

  const [subject, setSubject] = useState(
    proposal
      ? `Commercial Proposal ${proposal.proposalNumber} - ${companySettings.companyName}`
      : `Discussion regarding sales requirement - ${companySettings.companyName}`
  );
  const [message, setMessage] = useState(
    proposal
      ? `Dear ${entity.contactPerson},\n\nThank you for your interest in our solutions. Please find attached our detailed commercial proposal (${proposal.proposalNumber}) for ${entity.companyName}.\n\nTotal Value: ₹${proposal.grandTotal.toLocaleString()}\nProposal Valid Until: ${proposal.validUntil}\n\nPlease review and let us know if you require any adjustments.\n\nWarm regards,\n${userProfile?.name}\n${companySettings.companyName}\n${companySettings.phone}`
      : `Dear ${entity.contactPerson},\n\nWe would like to connect regarding your recent inquiry for ${entity.companyName}.\n\nPlease let us know your availability for a brief call.\n\nWarm regards,\n${userProfile?.name}\n${companySettings.companyName}`
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSending(true);

    try {
      await logEmail({
        customerId: entityType === 'customer' ? entity.id : undefined,
        leadId: entityType === 'lead' ? entity.id : undefined,
        companyName: entity.companyName,
        recipient: entity.email || 'client@company.com',
        subject,
        body: message,
        employeeId: userProfile.uid,
        employeeName: userProfile.name,
      });

      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-6 overflow-hidden border border-slate-200">
        <div className="bg-indigo-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm">Send Commercial Email</h3>
              <p className="text-xs text-indigo-200">To: {entity.email || 'No email specified'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-indigo-200 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800">Email Dispatched Successfully!</h4>
            <p className="text-xs text-slate-500">The dispatch event has been recorded in the customer activity timeline.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Email</label>
              <input
                type="email"
                required
                defaultValue={entity.email || ''}
                placeholder="client@company.com"
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Message Body</label>
              <textarea
                required
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-3 font-sans focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                {isSending ? 'Sending Email...' : 'Send Email'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

/* =========================================================================
   5. MEETING MODAL
   ========================================================================= */

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: Customer | Lead;
  entityType: 'customer' | 'lead';
}

export const MeetingModal: React.FC<MeetingModalProps> = ({ isOpen, onClose, entity, entityType }) => {
  const { addMeeting } = useCrmData();
  const { userProfile } = useAuth();

  const [title, setTitle] = useState(`Product Demo & Discussion — ${entity.companyName}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('14:30');
  const [location, setLocation] = useState('Google Meet / Virtual Conference');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/new');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSubmitting(true);
    try {
      await addMeeting({
        customerId: entityType === 'customer' ? entity.id : undefined,
        leadId: entityType === 'lead' ? entity.id : undefined,
        companyName: entity.companyName,
        contactPerson: entity.contactPerson,
        title,
        date,
        time,
        location,
        meetingLink,
        notes,
        status: 'Scheduled',
        employeeId: userProfile.uid,
        employeeName: userProfile.name,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-6 overflow-hidden border border-slate-200">
        <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-white rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Schedule Corporate Meeting</h3>
              <p className="text-xs text-amber-100">{entity.contactPerson} ({entity.companyName})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-amber-200 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Time *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Platform</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Client Office / Google Meet"
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Link (Optional)</label>
            <input
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Agenda / Discussion Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Requirement discussion, presentation, terms negotiation..."
              className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
            >
              {isSubmitting ? 'Scheduling...' : 'Save Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   6. FOLLOW-UP CREATION MODAL
   ========================================================================= */

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: Customer | Lead;
  entityType: 'customer' | 'lead';
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({ isOpen, onClose, entity, entityType }) => {
  const { addFollowUp } = useCrmData();
  const { userProfile } = useAuth();

  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [time, setTime] = useState('11:00');
  const [reason, setReason] = useState('Commercial proposal check & confirmation');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSubmitting(true);
    try {
      await addFollowUp({
        customerId: entityType === 'customer' ? entity.id : undefined,
        leadId: entityType === 'lead' ? entity.id : undefined,
        companyName: entity.companyName,
        contactPerson: entity.contactPerson,
        employeeId: userProfile.uid,
        employeeName: userProfile.name,
        date,
        time,
        reason,
        notes,
        status: 'Upcoming',
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-6 overflow-hidden border border-slate-200">
        <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-white rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Schedule Follow-up</h3>
              <p className="text-xs text-blue-100">{entity.contactPerson} ({entity.companyName})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-blue-200 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Time *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose / Reason *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions / Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key items to discuss or confirm with the client..."
              className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {isSubmitting ? 'Scheduling...' : 'Set Follow-up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   7. RESCHEDULE FOLLOW-UP MODAL (Preserves History, Updates Real-Time)
   ========================================================================= */

interface RescheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  followup: FollowUpRecord | null;
}

export const RescheduleFollowUpModal: React.FC<RescheduleFollowUpModalProps> = ({
  isOpen,
  onClose,
  followup,
}) => {
  const { rescheduleFollowUp } = useCrmData();
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('11:00');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (followup) {
      setNewDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      setNewTime(followup.time || '11:00');
      setReason(`Rescheduled: ${followup.reason}`);
      setNotes(followup.notes || '');
      setError('');
    }
  }, [followup, isOpen]);

  if (!isOpen || !followup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setError('Please select a new date');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await rescheduleFollowUp(followup.id, newDate, newTime, reason, notes);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to reschedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-6 overflow-hidden border border-slate-200">
        <div className="bg-purple-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/30 text-white rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Reschedule Follow-up</h3>
              <p className="text-xs text-purple-100">{followup.contactPerson} ({followup.companyName})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-purple-200 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">Current Schedule</span>
            <span className="font-bold text-slate-800">
              {followup.date} at {followup.time}
            </span>
            <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">Original reason: {followup.reason}</p>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl font-medium border border-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Date *</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Time *</label>
              <input
                type="time"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Updated Reason / Objective</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for reschedule, client request, etc."
              className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs"
            >
              {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
