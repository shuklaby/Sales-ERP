import React, { useState, useMemo } from 'react';
import {
  Mail,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  FileText,
  Eye,
  Send,
  Building,
  User,
  Paperclip,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Inbox,
  Filter,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { EmailRecord, EmailStatus } from '../../types/crm';

export const EmailsView: React.FC = () => {
  const { emails, retryEmail, proposals } = useCrmData();
  const { isAdmin, userProfile } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EmailStatus>('all');
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<{ id: string; success: boolean; text: string } | null>(null);

  // Filter emails based on authorization (Section 1: Admin sees all, Employee sees authorized)
  const authorizedEmails = useMemo(() => {
    if (isAdmin) return emails;
    return emails.filter((e) => e.employeeId === userProfile?.uid);
  }, [emails, isAdmin, userProfile]);

  // Search & Status filters (Section 31: Customer, Recipient, Subject, Proposal Number, Employee)
  const filteredEmails = useMemo(() => {
    let list = authorizedEmails;

    if (statusFilter !== 'all') {
      list = list.filter((e) => e.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          (e.companyName && e.companyName.toLowerCase().includes(q)) ||
          e.recipient.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q) ||
          (e.proposalNumber && e.proposalNumber.toLowerCase().includes(q)) ||
          e.employeeName.toLowerCase().includes(q) ||
          (e.emailId && e.emailId.toLowerCase().includes(q)) ||
          e.id.toLowerCase().includes(q)
      );
    }

    return list.sort(
      (a, b) => new Date(b.sentAt || b.createdAt || 0).getTime() - new Date(a.sentAt || a.createdAt || 0).getTime()
    );
  }, [authorizedEmails, statusFilter, searchQuery]);

  // Aggregate Metrics (Section 28)
  const metrics = useMemo(() => {
    const total = authorizedEmails.length;
    const sent = authorizedEmails.filter((e) => e.status === 'Sent' || e.status === 'Opened' || e.status === 'Clicked').length;
    const failed = authorizedEmails.filter((e) => e.status === 'Failed').length;
    const proposalsSent = authorizedEmails.filter((e) => !!e.proposalId || !!e.proposalNumber).length;
    const rate = total > 0 ? Math.round((sent / total) * 100) : 0;
    return { total, sent, failed, proposalsSent, rate };
  }, [authorizedEmails]);

  const handleRetry = async (email: EmailRecord) => {
    setRetryingId(email.id);
    setRetryMessage(null);
    try {
      const result = await retryEmail(email.id);
      if (result.success) {
        setRetryMessage({
          id: email.id,
          success: true,
          text: `Email retry dispatched successfully! (Msg ID: ${result.messageId})`,
        });
      } else {
        setRetryMessage({
          id: email.id,
          success: false,
          text: `Retry failed: ${result.error || 'Check email configuration'}`,
        });
      }
    } catch (err: any) {
      setRetryMessage({
        id: email.id,
        success: false,
        text: `Retry error: ${err.message || 'Network error'}`,
      });
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status?: EmailStatus) => {
    switch (status) {
      case 'Sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Sent
          </span>
        );
      case 'Opened':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Eye className="w-3 h-3" /> Opened
          </span>
        );
      case 'Clicked':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ExternalLink className="w-3 h-3" /> Clicked
          </span>
        );
      case 'Bounced':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-700" /> Bounced
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'Sending':
      case 'Queued':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            {status || 'Draft'}
          </span>
        );
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              {isAdmin ? 'Superadmin Email Center' : 'Employee Communications'}
            </span>
            <span className="text-xs font-semibold text-slate-400">• SparkGenTechnology</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <Mail className="w-7 h-7 text-indigo-600" />
            Email Activity & Proposal Dispatch Center
          </h1>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Comprehensive audit log of all outgoing client emails, commercial proposal transmissions, delivery errors, and retry attempts.'
              : 'View your outgoing client emails, proposal dispatches, and delivery status.'}
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Transmissions
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{metrics.total}</span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Logged communication events</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Successfully Sent
          </span>
          <span className="text-2xl font-black text-emerald-950 mt-1 block">{metrics.sent}</span>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">{metrics.rate}% delivery rate</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
            Delivery Failures
          </span>
          <span className="text-2xl font-black text-rose-950 mt-1 block">{metrics.failed}</span>
          <span className="text-[11px] text-rose-700 mt-0.5 block">Requires review or retry</span>
        </div>

        <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200 shadow-2xs">
          <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">
            Proposals Sent
          </span>
          <span className="text-2xl font-black text-indigo-950 mt-1 block">{metrics.proposalsSent}</span>
          <span className="text-[11px] text-indigo-700 mt-0.5 block">Commercial offers dispatched</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer, recipient, subject, proposal #, employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(['all', 'Sent', 'Failed', 'Draft', 'Queued', 'Bounced', 'Opened', 'Clicked'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Global Retry Notice */}
      {retryMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            retryMessage.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {retryMessage.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {retryMessage.text}
          </div>
          <button onClick={() => setRetryMessage(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Emails Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredEmails.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Inbox className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No email records found</p>
            <p className="text-xs text-slate-400">
              Dispatched commercial proposals and customer correspondence will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Email ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Related Proposal</th>
                  <th className="py-3 px-4">Sent By</th>
                  <th className="py-3 px-4">Sent At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmails.map((email) => {
                  return (
                    <tr key={email.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {email.emailId || email.id.slice(0, 14)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                          {email.companyName || 'Direct Contact'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-slate-600 font-mono block truncate max-w-[200px]" title={email.recipient}>
                          {email.recipient}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-medium text-slate-800 block truncate" title={email.subject}>
                          {email.subject}
                        </span>
                        {email.hasAttachment && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                            <Paperclip className="w-3 h-3" /> {email.attachmentName || 'Proposal.pdf'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {email.proposalNumber ? (
                          <span className="font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[11px]">
                            {email.proposalNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-medium">{email.employeeName || 'Administrator'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {email.sentAt ? new Date(email.sentAt).toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(email.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedEmail(email)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {email.status === 'Failed' && (
                            <button
                              onClick={() => handleRetry(email)}
                              disabled={retryingId === email.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
                              title="Re-attempt email dispatch (creates separate attempt record)"
                            >
                              <RotateCcw className={`w-3 h-3 ${retryingId === email.id ? 'animate-spin' : ''}`} />
                              {retryingId === email.id ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Details Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{selectedEmail.subject}</h4>
                  <span className="text-[11px] font-mono text-slate-500">ID: {selectedEmail.id}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recipient
                  </span>
                  <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                    {selectedEmail.recipient}
                  </span>
                  {selectedEmail.companyName && (
                    <span className="text-[11px] text-slate-500 block">
                      Account: {selectedEmail.companyName}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Status
                  </span>
                  <div className="mt-1">{getStatusBadge(selectedEmail.status)}</div>
                  {selectedEmail.providerMessageId && (
                    <span className="text-[10px] font-mono text-slate-400 block mt-1">
                      MsgID: {selectedEmail.providerMessageId}
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sent By
                  </span>
                  <span className="text-slate-800 font-medium mt-0.5 block">
                    {selectedEmail.employeeName}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Date & Time
                  </span>
                  <span className="text-slate-800 font-mono mt-0.5 block">
                    {selectedEmail.sentAt ? new Date(selectedEmail.sentAt).toLocaleString('en-IN') : '-'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Email Tracking
                  </span>
                  {selectedEmail.openedAt ? (
                    <span className="text-blue-700 text-xs font-semibold block mt-0.5">
                      Opened: {new Date(selectedEmail.openedAt).toLocaleString('en-IN')}
                    </span>
                  ) : selectedEmail.clickedAt ? (
                    <span className="text-indigo-700 text-xs font-semibold block mt-0.5">
                      Clicked: {new Date(selectedEmail.clickedAt).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs font-medium block mt-0.5 italic">
                      Tracking unavailable
                    </span>
                  )}
                </div>
              </div>

              {/* Error message callout if failed */}
              {selectedEmail.status === 'Failed' && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Delivery Error Diagnosis:
                  </div>
                  <p className="text-rose-700 font-mono text-[11px] pl-5">
                    {selectedEmail.errorMessage || 'Unknown communication error with provider.'}
                  </p>
                </div>
              )}

              {/* Message Body */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 block">Message Body:</span>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed max-h-60 overflow-y-auto">
                  {selectedEmail.message || selectedEmail.body || '(No message content)'}
                </div>
              </div>

              {/* Attachment Pill */}
              {selectedEmail.hasAttachment && (
                <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold text-slate-800">
                      {selectedEmail.attachmentName || 'Proposal.pdf'}
                    </span>
                    {selectedEmail.attachmentSize ? (
                      <span className="text-slate-400 text-[10px]">
                        ({(selectedEmail.attachmentSize / 1024).toFixed(1)} KB)
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              {selectedEmail.status === 'Failed' ? (
                <button
                  onClick={() => {
                    handleRetry(selectedEmail);
                    setSelectedEmail(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry Dispatch Now
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
