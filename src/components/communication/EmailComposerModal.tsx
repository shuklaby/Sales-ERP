import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  Calendar,
  Save,
  Paperclip,
  Eye,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  ChevronDown,
  Building,
  User,
  Trash2,
} from 'lucide-react';
import { useCommunication } from '../../context/CommunicationContext';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  CommunicationCategory,
  CommunicationType,
  CommunicationAttachment,
  EmailTemplateItem,
} from '../../types/crm';

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  initialProposalId?: string;
  initialInvoiceId?: string;
  initialTicketId?: string;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  initialCategory?: CommunicationCategory;
  initialType?: CommunicationType;
  initialAttachments?: CommunicationAttachment[];
}

export const EmailComposerModal: React.FC<EmailComposerModalProps> = ({
  isOpen,
  onClose,
  initialCustomerId,
  initialProposalId,
  initialInvoiceId,
  initialTicketId,
  initialTo,
  initialSubject,
  initialBody,
  initialCategory,
  initialType,
  initialAttachments,
}) => {
  const { sendEmail, scheduleMessage, emailTemplates, customerConsents } = useCommunication();
  const { customers, leads, proposals, invoices } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [to, setTo] = useState(initialTo || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject || '');
  const [body, setBody] = useState(initialBody || '');
  const [category, setCategory] = useState<CommunicationCategory>(initialCategory || 'General');
  const [type, setType] = useState<CommunicationType>(initialType || 'TRANSACTIONAL');

  // Related Entities
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId || '');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedProposalId, setSelectedProposalId] = useState(initialProposalId || '');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoiceId || '');
  const [selectedTicketId, setSelectedTicketId] = useState(initialTicketId || '');

  // Template Picker
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<CommunicationAttachment[]>(initialAttachments || []);
  const [isAttachingProposal, setIsAttachingProposal] = useState(false);
  const [isAttachingInvoice, setIsAttachingInvoice] = useState(false);

  // Scheduling State
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Follow-up Reminder toggle
  const [createFollowupReminder, setCreateFollowupReminder] = useState(true);
  const [reminderDays, setReminderDays] = useState(3);

  // Status & Error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync initial props on change
  useEffect(() => {
    if (initialTo) setTo(initialTo);
    if (initialSubject) setSubject(initialSubject);
    if (initialBody) setBody(initialBody);
    if (initialCustomerId) setSelectedCustomerId(initialCustomerId);
    if (initialProposalId) setSelectedProposalId(initialProposalId);
    if (initialInvoiceId) setSelectedInvoiceId(initialInvoiceId);
    if (initialCategory) setCategory(initialCategory);
    if (initialType) setType(initialType);
    if (initialAttachments) setAttachments(initialAttachments);
  }, [
    initialTo,
    initialSubject,
    initialBody,
    initialCustomerId,
    initialProposalId,
    initialInvoiceId,
    initialCategory,
    initialType,
    initialAttachments,
  ]);

  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId || c.customerId === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const activeProposal = useMemo(() => {
    return proposals.find((p) => p.id === selectedProposalId || p.proposalNumber === selectedProposalId);
  }, [proposals, selectedProposalId]);

  const activeInvoice = useMemo(() => {
    return invoices.find((i) => i.id === selectedInvoiceId || i.invoiceNumber === selectedInvoiceId);
  }, [invoices, selectedInvoiceId]);

  // Autofill recipient if customer changes and To is empty
  useEffect(() => {
    if (activeCustomer && !to) {
      if (activeCustomer.email) setTo(activeCustomer.email);
    }
  }, [activeCustomer, to]);

  // Check marketing opt-out status for warning
  const isMarketingOptedOut = useMemo(() => {
    if (type !== 'MARKETING' || !selectedCustomerId) return false;
    const consent = customerConsents[selectedCustomerId];
    return consent?.status === 'Opted Out';
  }, [type, selectedCustomerId, customerConsents]);

  // Handle template selection
  const handleApplyTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = emailTemplates.find((t) => t.templateId === tmplId || t.id === tmplId);
    if (!tmpl) return;

    setSubject(tmpl.subject);
    setBody(tmpl.body);
    setCategory(tmpl.category);
  };

  // Variable replacement preview
  const previewData = useMemo(() => {
    let replacedSubject = subject;
    let replacedBody = body;

    const replacements: Record<string, string> = {
      customerName: activeCustomer?.companyName || 'Valued Customer',
      companyName: activeCustomer?.companyName || 'Valued Customer',
      contactPerson: activeCustomer?.contactPerson || 'Client',
      employeeName: userProfile?.name || 'SparkGenTechnology Staff',
      proposalNumber: activeProposal?.proposalNumber || 'PROP-SAMPLE',
      invoiceNumber: activeInvoice?.invoiceNumber || 'INV-SAMPLE',
      invoiceAmount: activeInvoice ? `₹${(activeInvoice.grandTotal || 0).toLocaleString('en-IN')}` : '₹0',
      outstandingAmount: activeInvoice ? `₹${(activeInvoice.outstandingAmount ?? activeInvoice.grandTotal ?? 0).toLocaleString('en-IN')}` : '₹0',
      dueDate: activeInvoice?.dueDate ? new Date(activeInvoice.dueDate).toLocaleDateString() : 'Due upon receipt',
      paymentLink: activeInvoice ? `${window.location.origin}/pay/${activeInvoice.id}` : window.location.origin,
      proposalLink: activeProposal ? `${window.location.origin}/proposal/${activeProposal.id}` : window.location.origin,
      invoiceLink: activeInvoice ? `${window.location.origin}/invoice/${activeInvoice.id}` : window.location.origin,
      supportTicketNumber: selectedTicketId || 'TICK-SAMPLE',
    };

    for (const [k, v] of Object.entries(replacements)) {
      const reg = new RegExp(`{{\\s*${k}\\s*}}`, 'gi');
      replacedSubject = replacedSubject.replace(reg, v);
      replacedBody = replacedBody.replace(reg, v);
    }

    return {
      subject: replacedSubject,
      body: replacedBody,
    };
  }, [subject, body, activeCustomer, activeProposal, activeInvoice, userProfile, selectedTicketId]);

  // Handle local file attachment upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds 10MB limit.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            category: 'File',
            fileUrl: base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!to || !to.trim() || !to.includes('@')) {
      setErrorMessage('Please provide a valid recipient email address.');
      return;
    }

    if (!subject || !subject.trim()) {
      setErrorMessage('Please enter an email subject.');
      return;
    }

    if (!body || !body.trim()) {
      setErrorMessage('Please enter email body content.');
      return;
    }

    if (isMarketingOptedOut) {
      setErrorMessage('Customer has opted out of marketing communications. Change type to Transactional or respect consent.');
      return;
    }

    setIsSubmitting(true);

    if (isScheduling) {
      if (!scheduledDateTime || new Date(scheduledDateTime).getTime() <= Date.now()) {
        setErrorMessage('Please select a valid future date and time for scheduled dispatch.');
        setIsSubmitting(false);
        return;
      }

      const schedRes = await scheduleMessage({
        type: 'EMAIL',
        recipient: to.trim(),
        customerId: activeCustomer?.id || selectedCustomerId,
        customerName: activeCustomer?.companyName,
        templateId: selectedTemplateId,
        subject,
        body,
        category,
        communicationType: type,
        scheduledAt: new Date(scheduledDateTime).toISOString(),
        relatedRecordType: selectedProposalId ? 'Proposal' : selectedInvoiceId ? 'Invoice' : 'Customer',
        relatedRecordId: selectedProposalId || selectedInvoiceId || selectedCustomerId,
        attachments,
      });

      setIsSubmitting(false);
      if (schedRes.success) {
        setSuccessMessage('Message successfully scheduled for automatic background delivery!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMessage(schedRes.error || 'Failed to schedule message.');
      }
      return;
    }

    // Direct Send
    const res = await sendEmail({
      to: to.trim(),
      cc: cc.trim() || undefined,
      bcc: bcc.trim() || undefined,
      subject,
      body,
      category,
      type,
      customerId: activeCustomer?.id || selectedCustomerId,
      customerName: activeCustomer?.companyName,
      leadId: selectedLeadId || undefined,
      proposalId: activeProposal?.id || selectedProposalId || undefined,
      proposalNumber: activeProposal?.proposalNumber,
      invoiceId: activeInvoice?.id || selectedInvoiceId || undefined,
      invoiceNumber: activeInvoice?.invoiceNumber,
      ticketId: selectedTicketId || undefined,
      attachments,
      createFollowupReminder,
      reminderDueDays: reminderDays,
      reminderTitle: `Follow-up on ${subject}`,
    });

    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Email dispatched successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMessage(res.error || 'Failed to send email. Check SMTP/Provider configuration.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Unified Corporate Email Composer</h2>
              <p className="text-xs text-slate-400">Send verified commercial, transactional, or relationship emails</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Top Options: Template Picker & Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Apply Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose Template --</option>
                {emailTemplates.map((t) => (
                  <option key={t.id} value={t.templateId || t.id}>
                    [{t.category}] {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CommunicationCategory)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Proposal">Proposal</option>
                <option value="Invoice">Invoice</option>
                <option value="Payment">Payment</option>
                <option value="Receipt">Receipt</option>
                <option value="Reminder">Reminder</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Welcome">Welcome</option>
                <option value="Support">Support</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Classification
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType('TRANSACTIONAL')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
                    type === 'TRANSACTIONAL'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  Transactional
                </button>
                <button
                  type="button"
                  onClick={() => setType('MARKETING')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
                    type === 'MARKETING'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  Marketing
                </button>
              </div>
            </div>
          </div>

          {/* Marketing Opt-Out Warning */}
          {isMarketingOptedOut && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                <strong>Consent Notice:</strong> This customer has opted out of Marketing communications. Marketing emails will be blocked by system rules.
              </span>
            </div>
          )}

          {/* Recipient Fields */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  To (Primary Recipient) *
                </label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="client@organization.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="mt-5 text-xs text-blue-400 hover:text-blue-300 underline font-medium"
              >
                {showCcBcc ? 'Hide CC/BCC' : 'Add CC / BCC'}
              </button>
            </div>

            {showCcBcc && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    CC
                  </label>
                  <input
                    type="text"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="accountant@organization.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    BCC
                  </label>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="internal-audit@sparkgen.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Related Entities (Section 3) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Related Customer
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
                Related Lead
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="">-- None --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Related Proposal
              </label>
              <select
                value={selectedProposalId}
                onChange={(e) => setSelectedProposalId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="">-- None --</option>
                {proposals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.proposalNumber} — {p.customerName || p.companyName || p.customerSnapshot?.companyName || 'Proposal'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Related Invoice
              </label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="">-- None --</option>
                {invoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.invoiceNumber} — ₹{(i.grandTotal || 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Commercial Proposal {{proposalNumber}} for {{customerName}}"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Message Body Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Message Body *
              </label>
              <span className="text-[10px] text-slate-500">
                Variables: {'{{customerName}}'}, {'{{contactPerson}}'}, {'{{proposalNumber}}'}, {'{{invoiceNumber}}'}, {'{{dueDate}}'}, {'{{paymentLink}}'}
              </span>
            </div>
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
            />
          </div>

          {/* Attachments Section (Section 8) */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-400" /> Attachments ({attachments.length})
              </span>
              <label className="cursor-pointer px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition">
                <span>+ Upload File</span>
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span className="max-w-[180px] truncate">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Follow-up Reminder & Scheduling Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Automatic Follow-up Reminder */}
            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Auto Follow-up Reminder</span>
                <span className="text-[11px] text-slate-500">Create reminder if no reply in {reminderDays} days</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createFollowupReminder}
                  onChange={(e) => setCreateFollowupReminder(e.target.checked)}
                  className="rounded border-slate-700 text-blue-500 focus:ring-0"
                />
                {createFollowupReminder && (
                  <select
                    value={reminderDays}
                    onChange={(e) => setReminderDays(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-1.5 py-0.5"
                  >
                    <option value={2}>2 days</option>
                    <option value={3}>3 days</option>
                    <option value={5}>5 days</option>
                    <option value={7}>7 days</option>
                  </select>
                )}
              </div>
            </div>

            {/* Scheduled Dispatch */}
            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Schedule Send</span>
                <span className="text-[11px] text-slate-500">Dispatch at a specific future time</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isScheduling}
                  onChange={(e) => setIsScheduling(e.target.checked)}
                  className="rounded border-slate-700 text-blue-500 focus:ring-0"
                />
                {isScheduling && (
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2 py-0.5"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> Preview Email
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSend}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isScheduling
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : isScheduling ? (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Dispatch</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Email Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal (Section 7) */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" /> Email Live Preview
              </h3>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-bold w-16">To:</span>
                <span className="text-slate-200">{to || '(No recipient)'}</span>
              </div>
              {cc && (
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="font-bold w-16">CC:</span>
                  <span className="text-slate-200">{cc}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-bold w-16">Subject:</span>
                <span className="text-white font-semibold">{previewData.subject}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="font-bold w-16">Type:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  {type} ({category})
                </span>
              </div>
            </div>

            <div className="p-4 bg-white text-slate-900 rounded-xl text-xs font-sans leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto border border-slate-200">
              {previewData.body}
            </div>

            {attachments.length > 0 && (
              <div className="text-xs text-slate-400">
                <span className="font-bold">Attachments: </span>
                {attachments.map((a) => a.name).join(', ')}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
