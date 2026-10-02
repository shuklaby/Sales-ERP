import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Mail,
  Send,
  Paperclip,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Building,
  User,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ProposalRecord, Customer } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { generateProposalPdf } from '../../utils/proposalPdfGenerator';
import { buildTemplateVariables, interpolateEmailTemplate } from '../../utils/emailTemplateInterpolation';

interface SendProposalEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ProposalRecord | null;
  onSuccess?: () => void;
}

export const SendProposalEmailModal: React.FC<SendProposalEmailModalProps> = ({
  isOpen,
  onClose,
  proposal,
  onSuccess,
}) => {
  const { customers, emailTemplates, emailSettings, sendProposalEmail } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [pdfSizeKb, setPdfSizeKb] = useState<number>(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Match corresponding customer
  const matchedCustomer = useMemo(() => {
    if (!proposal) return null;
    return customers.find(
      (c) => c.id === proposal.customerId || c.customerId === proposal.customerId
    );
  }, [proposal, customers]);

  // Load defaults when modal opens or proposal changes
  useEffect(() => {
    if (!isOpen || !proposal) return;

    setSendError(null);
    setSendSuccess(false);

    // 1. Recipient resolution (Section 2)
    const recipientEmail =
      proposal.customerEmail ||
      matchedCustomer?.email ||
      proposal.customerSnapshot?.email ||
      '';
    setTo(recipientEmail);
    setCc('');
    setBcc('');

    // 2. Prepare Template Variables (Section 3)
    const variables = buildTemplateVariables(proposal, matchedCustomer, null, userProfile);

    // 3. Find active Proposal Email template or fallback to default
    const proposalTpl = emailTemplates.find(
      (t) => t.type === 'Proposal Email' && t.status === 'active'
    ) || emailTemplates[0];

    if (proposalTpl) {
      setSelectedTemplateId(proposalTpl.id);
      setSubject(interpolateEmailTemplate(proposalTpl.subject, variables));
      setMessage(interpolateEmailTemplate(proposalTpl.body, variables));
    } else {
      setSelectedTemplateId('');
      setSubject(`Proposal ${proposal.proposalNumber} from SparkGenTechnology`);
      setMessage(
        `Hello ${variables.contactPerson || 'Customer'},\n\nPlease find attached our proposal ${proposal.proposalNumber} from SparkGenTechnology.\n\nProposal Amount: ₹${variables.grandTotal}\n\nPlease feel free to contact us if you have any questions.\n\nRegards,\nSparkGenTechnology`
      );
    }

    // 4. Generate & Attach PDF (Section 19, 20)
    setIsGeneratingPdf(true);
    setPdfError(null);
    try {
      let dataUrl = proposal.pdfDataUrl || '';
      if (!dataUrl) {
        const doc = generateProposalPdf(proposal);
        dataUrl = doc.output('datauristring');
      }

      setPdfBase64(dataUrl);

      // Estimate byte size
      const cleanData = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : dataUrl;
      const sizeBytes = Math.round((cleanData.length * 3) / 4);
      const sizeKb = Math.round(sizeBytes / 1024);
      setPdfSizeKb(sizeKb);

      if (sizeKb > 15 * 1024) {
        setPdfError(`Attachment size (${(sizeKb / 1024).toFixed(1)}MB) exceeds 15MB safe limit.`);
      }
    } catch (err: any) {
      console.error('PDF Attachment error:', err);
      setPdfError('Could not generate Proposal PDF. Please verify proposal items.');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [isOpen, proposal, matchedCustomer, emailTemplates, userProfile]);

  // Handle template switch
  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (!proposal) return;
    const tpl = emailTemplates.find((t) => t.id === tplId);
    if (!tpl) return;

    const variables = buildTemplateVariables(proposal, matchedCustomer, null, userProfile);
    setSubject(interpolateEmailTemplate(tpl.subject, variables));
    setMessage(interpolateEmailTemplate(tpl.body, variables));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal) return;

    if (!to.trim()) {
      setSendError('Please enter a valid recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setSendError('Please enter an email subject.');
      return;
    }
    if (!pdfBase64) {
      setSendError('Proposal PDF attachment is required before sending.');
      return;
    }

    setIsSending(true);
    setSendError(null);

    try {
      const result = await sendProposalEmail({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        message: message.trim(),
        proposal,
        pdfBase64,
        attachmentName: `${proposal.proposalNumber}.pdf`,
      });

      if (result.success) {
        setSendSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1800);
      } else {
        setSendError(result.error || 'Failed to dispatch email. Check server configuration.');
      }
    } catch (err: any) {
      setSendError(err.message || 'An unexpected error occurred while sending email.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !proposal) return null;

  const isConfigured = emailSettings.status === 'Configured';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Send Proposal via Email
              </h3>
              <p className="text-xs text-slate-500">
                Dispatch official commercial proposal <span className="font-mono font-bold text-indigo-700">{proposal.proposalNumber}</span> to customer.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSend} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Email Provider Status Banner */}
          {!isConfigured && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Email Service Not Configured</span>
                <p className="text-[11px] text-amber-800">
                  SMTP credentials or an API Key (Resend / SendGrid) must be configured in Admin Settings before real emails can be delivered to customers.
                </p>
              </div>
            </div>
          )}

          {/* Template Selector */}
          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Load Template:
            </div>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose Template --</option>
              {emailTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.templateName} ({t.type})
                </option>
              ))}
            </select>
          </div>

          {/* To Field */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              To (Recipient Email) <span className="text-rose-500">*</span>:
            </label>
            <input
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@company.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* CC & BCC Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                CC (Optional):
              </label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="manager@sparkgentechnology.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                BCC (Optional):
              </label>
              <input
                type="text"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="archive@sparkgentechnology.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Subject Field */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Subject <span className="text-rose-500">*</span>:
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={`Proposal ${proposal.proposalNumber} from SparkGenTechnology`}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Message Body Field */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Message Body <span className="text-rose-500">*</span>:
            </label>
            <textarea
              required
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your email body here..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed"
            />
          </div>

          {/* PDF Attachment Card (Section 19, 20) */}
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white text-indigo-600 border border-indigo-100 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block">
                  {proposal.proposalNumber}.pdf
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Paperclip className="w-3 h-3 text-indigo-600" />
                  {isGeneratingPdf
                    ? 'Rendering PDF document...'
                    : pdfSizeKb > 0
                    ? `${pdfSizeKb} KB • Verified Attachment`
                    : 'PDF Attached'}
                </span>
              </div>
            </div>

            {pdfError ? (
              <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded-lg">
                {pdfError}
              </span>
            ) : (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Attached
              </span>
            )}
          </div>

          {/* Error Banner */}
          {sendError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Delivery Failed</span>
                <p className="text-[11px] text-rose-800">{sendError}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {sendSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-900">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">
                Email dispatched successfully! Proposal status updated to &quot;Sent&quot;.
              </span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || isGeneratingPdf || !!pdfError || sendSuccess}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Dispatching Email...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
