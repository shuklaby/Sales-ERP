import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageCircle,
  ExternalLink,
  Send,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { useCommunication } from '../../context/CommunicationContext';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { CommunicationCategory, Customer, ProposalRecord, InvoiceRecord } from '../../types/crm';

interface WhatsAppChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomer?: Customer | null;
  initialPhone?: string;
  initialMessage?: string;
  initialCategory?: CommunicationCategory;
  initialProposal?: ProposalRecord | null;
  initialInvoice?: InvoiceRecord | null;
}

export const WhatsAppChatModal: React.FC<WhatsAppChatModalProps> = ({
  isOpen,
  onClose,
  initialCustomer,
  initialPhone,
  initialMessage,
  initialCategory,
  initialProposal,
  initialInvoice,
}) => {
  const { logWhatsAppClickToChat, whatsappTemplates, communicationSettings } = useCommunication();
  const { customers, proposals, invoices } = useCrmData();
  const { userProfile } = useAuth();

  const [phone, setPhone] = useState(initialPhone || initialCustomer?.mobile || initialCustomer?.phone || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomer?.id || '');
  const [message, setMessage] = useState(initialMessage || '');
  const [category, setCategory] = useState<CommunicationCategory>(initialCategory || 'Follow-up');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [useOfficialApi, setUseOfficialApi] = useState(false);
  const [apiStatusMessage, setApiStatusMessage] = useState<string | null>(null);
  const [isSendingApi, setIsSendingApi] = useState(false);

  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId || c.customerId === selectedCustomerId) || initialCustomer;
  }, [customers, selectedCustomerId, initialCustomer]);

  useEffect(() => {
    if (initialPhone) setPhone(initialPhone);
    else if (activeCustomer?.mobile) setPhone(activeCustomer.mobile);
    else if (activeCustomer?.phone) setPhone(activeCustomer.phone);
  }, [initialPhone, activeCustomer]);

  // Pre-configured message generator
  const handleApplyPreset = (presetType: 'proposal' | 'invoice' | 'general') => {
    const contact = activeCustomer?.contactPerson || 'Sir/Madam';
    const comp = activeCustomer?.companyName || 'Valued Client';

    if (presetType === 'proposal') {
      const propNum = initialProposal?.proposalNumber || 'our recent proposal';
      const link = initialProposal ? `${window.location.origin}/proposal/${initialProposal.id}` : '';
      setMessage(
        `Hello ${contact},\n\nHope you are having a productive week! Following up regarding ${propNum} prepared for ${comp}. Let us know if you would like a quick walkthrough.\n${link ? `\nReview Proposal: ${link}` : ''}\n\nWarm regards,\n${userProfile?.name || 'SparkGenTechnology'}`
      );
      setCategory('Proposal');
    } else if (presetType === 'invoice') {
      const invNum = initialInvoice?.invoiceNumber || 'your pending invoice';
      const amt = initialInvoice ? `₹${(initialInvoice.grandTotal || 0).toLocaleString('en-IN')}` : '';
      const payLink = initialInvoice ? `${window.location.origin}/pay/${initialInvoice.id}` : '';
      setMessage(
        `Dear ${contact},\n\nCourteous reminder regarding Invoice ${invNum} for ${comp}${amt ? ` (${amt})` : ''}. For fast settlement, you can pay online via UPI, Cards, or Net Banking.\n${payLink ? `\nInstant Payment Link: ${payLink}` : ''}\n\nThank you,\nSparkGenTechnology Accounts`
      );
      setCategory('Invoice');
    } else {
      setMessage(
        `Hello ${contact},\n\nHope this finds you well. Checking in from SparkGenTechnology to see if there is any assistance we can offer ${comp} today.\n\nBest regards,\n${userProfile?.name || 'SparkGenTechnology'}`
      );
      setCategory('Follow-up');
    }
  };

  const handleOpenClickToChat = async () => {
    if (!phone || !phone.trim()) {
      alert('Please enter a valid phone number.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMsg = encodeURIComponent(message.trim());
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

    // Record WHATSAPP_OPENED event per Section 12: Do not falsely mark message as sent
    await logWhatsAppClickToChat({
      customerId: activeCustomer?.id,
      customerName: activeCustomer?.companyName,
      customerPhone: phone.trim(),
      message: message.trim(),
      category,
      relatedRecordId: initialProposal?.id || initialInvoice?.id,
      relatedRecordType: initialProposal ? 'Proposal' : initialInvoice ? 'Invoice' : undefined,
    });

    window.open(waUrl, '_blank');
    onClose();
  };

  const handleSendOfficialApi = async () => {
    if (!phone || !phone.trim()) {
      setApiStatusMessage('Please enter a valid phone number.');
      return;
    }

    setIsSendingApi(true);
    setApiStatusMessage(null);

    try {
      const res = await fetch('/api/communication/whatsapp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: phone.trim(),
          templateName: selectedTemplateId || 'proposal_followup_notice',
          languageCode: 'en',
          customerId: activeCustomer?.id,
          customerName: activeCustomer?.companyName,
        }),
      });

      const data = await res.json();
      setIsSendingApi(false);

      if (res.ok && data.success) {
        setApiStatusMessage('Official WhatsApp message sent via Meta Graph API!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setApiStatusMessage(data.error || 'WhatsApp Business API is not configured or failed.');
      }
    } catch (e: any) {
      setIsSendingApi(false);
      setApiStatusMessage(e.message || 'Error dispatching API message.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">WhatsApp Client Interaction</h2>
              <p className="text-xs text-slate-400">Pre-fill messaging & track authenticated open events</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Method Selector: Click-to-Chat vs Official Business API */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setUseOfficialApi(false)}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                !useOfficialApi
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              WhatsApp Click-to-Chat
            </button>
            <button
              type="button"
              onClick={() => setUseOfficialApi(true)}
              className={`py-2 text-xs font-bold rounded-lg transition ${
                useOfficialApi
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Official Business API
            </button>
          </div>

          {/* Quick Presets for Click-to-Chat */}
          {!useOfficialApi && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('proposal')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Proposal Follow-up
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('invoice')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Payment Reminder
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('general')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                General Follow-up
              </button>
            </div>
          )}

          {/* Phone Number Field */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Recipient Phone Number (with Country Code) *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Customer / Target Record */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Linked Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="">-- None --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CommunicationCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="Proposal">Proposal</option>
                <option value="Invoice">Invoice</option>
                <option value="Payment">Payment</option>
                <option value="Reminder">Reminder</option>
                <option value="Follow-up">Follow-up</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* Message Area */}
          {!useOfficialApi ? (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Message Content
              </label>
              <textarea
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Compose WhatsApp message..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                <strong>Audit Note:</strong> Clicking "Open WhatsApp" will record a <code>WHATSAPP_OPENED</code> event in compliance with Section 12. Message will not be marked as delivered without provider confirmation.
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <ShieldCheck className="w-4 h-4" /> Official WhatsApp Business API
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Choose Approved Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
                >
                  <option value="proposal_followup_notice">proposal_followup_notice (Approved)</option>
                  <option value="invoice_payment_reminder">invoice_payment_reminder (Approved)</option>
                  <option value="payment_received_receipt">payment_received_receipt (Approved)</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400">
                Official API delivers approved template messages directly to customers without opening external apps. Requires server-side Meta credentials.
              </p>
            </div>
          )}

          {/* Feedback */}
          {apiStatusMessage && (
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-xs text-slate-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{apiStatusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-xl transition"
          >
            Cancel
          </button>

          {!useOfficialApi ? (
            <button
              type="button"
              onClick={handleOpenClickToChat}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in WhatsApp & Log Event</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isSendingApi}
              onClick={handleSendOfficialApi}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSendingApi ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Dispatch Official Template</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
