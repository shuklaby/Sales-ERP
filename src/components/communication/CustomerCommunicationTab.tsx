import React, { useState, useMemo } from 'react';
import {
  Mail,
  MessageCircle,
  Clock,
  Send,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ExternalLink,
  RotateCcw,
  Sparkles,
  CalendarClock,
  User,
  ShieldCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import { useCommunication } from '../../context/CommunicationContext';
import { useAuth } from '../../context/AuthContext';
import { Customer, CommunicationRecord, CommunicationChannel } from '../../types/crm';
import { EmailComposerModal } from './EmailComposerModal';
import { WhatsAppChatModal } from './WhatsAppChatModal';
import { CreateReminderModal } from './CreateReminderModal';

interface CustomerCommunicationTabProps {
  customer: Customer;
}

export const CustomerCommunicationTab: React.FC<CustomerCommunicationTabProps> = ({ customer }) => {
  const { communicationRecords, followupReminders, retryCommunicationRecord, updateCustomerConsent, customerConsents } = useCommunication();
  const { isAdmin, userProfile } = useAuth();

  const [channelFilter, setChannelFilter] = useState<'all' | CommunicationChannel>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CommunicationRecord | null>(null);

  // Modals state
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  // Consent modal
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const customerConsent = customerConsents[customer.id];

  // Filter communications strictly for this customer
  const customerComms = useMemo(() => {
    return communicationRecords.filter((r) => {
      const matchCust = r.customerId === customer.id || r.customerId === customer.customerId;
      if (!matchCust) return false;
      if (channelFilter !== 'all' && r.channel !== channelFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          (r.subject && r.subject.toLowerCase().includes(q)) ||
          r.body.toLowerCase().includes(q) ||
          r.recipient.toLowerCase().includes(q) ||
          (r.proposalNumber && r.proposalNumber.toLowerCase().includes(q)) ||
          (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [communicationRecords, customer, channelFilter, searchTerm]);

  // Customer Reminders
  const customerReminders = useMemo(() => {
    return followupReminders.filter((rem) => rem.customerId === customer.id || rem.customerId === customer.customerId);
  }, [followupReminders, customer]);

  const handleToggleConsent = async (channel: 'EMAIL' | 'WHATSAPP', currentOptedIn: boolean) => {
    await updateCustomerConsent(
      customer.id,
      customer.companyName,
      channel,
      'Marketing',
      currentOptedIn ? 'Opted Out' : 'Opted In',
      'Updated by staff in Customer Details'
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions Header Bar (Section 44) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" /> Customer Communication Hub
          </h3>
          <p className="text-xs text-slate-400">
            Real-time multi-channel engagement for {customer.companyName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEmailComposerOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-900/40"
          >
            <Mail className="w-3.5 h-3.5" /> Send Email
          </button>
          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-900/40"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button
            onClick={() => setIsReminderOpen(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-900/40"
          >
            <CalendarClock className="w-3.5 h-3.5" /> Create Reminder
          </button>
          <button
            onClick={() => setIsConsentModalOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Preferences
          </button>
        </div>
      </div>

      {/* Marketing Opt-Out Status Badge */}
      {customerConsent && customerConsent.status === 'Opted Out' && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs text-purple-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>
              <strong>Customer Privacy Preference:</strong> Opted out of marketing broadcasts. Transactional messages remain active.
            </span>
          </div>
          <button
            onClick={() => handleToggleConsent('EMAIL', false)}
            className="text-[11px] underline font-bold hover:text-white"
          >
            Opt back in
          </button>
        </div>
      )}

      {/* Search & Channel Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChannelFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              channelFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            All Channels ({customerComms.length})
          </button>
          <button
            onClick={() => setChannelFilter('EMAIL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              channelFilter === 'EMAIL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Emails
          </button>
          <button
            onClick={() => setChannelFilter('WHATSAPP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              channelFilter === 'WHATSAPP'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search communications..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Communication Timeline List (Section 15) */}
      <div className="space-y-3">
        {customerComms.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">No communication records found for this customer.</p>
            <p className="text-[11px] text-slate-600 mt-1">Use the quick actions above to send an email or WhatsApp message.</p>
          </div>
        ) : (
          customerComms.map((comm) => {
            const isEmail = comm.channel === 'EMAIL';
            const isFailed = comm.status === 'Failed';
            const isOpened = comm.status === 'WHATSAPP_OPENED';

            return (
              <div
                key={comm.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isEmail
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {isEmail ? <Mail className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">{comm.subject || `${comm.channel} Message`}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {comm.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          comm.status === 'Sent'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isOpened
                            ? 'bg-blue-500/20 text-blue-400'
                            : isFailed
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {comm.status}
                      </span>
                      {comm.proposalNumber && (
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          {comm.proposalNumber}
                        </span>
                      )}
                      {comm.invoiceNumber && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {comm.invoiceNumber}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl font-mono leading-relaxed">
                      {comm.body}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>Recipient: <strong className="text-slate-400">{comm.recipient}</strong></span>
                      <span>•</span>
                      <span>By: <strong className="text-slate-400">{comm.senderName}</strong></span>
                      <span>•</span>
                      <span>{new Date(comm.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {isFailed && (
                    <button
                      onClick={() => retryCommunicationRecord(comm)}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Retry Send
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedRecord(comm)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Customer Reminders Section */}
      {customerReminders.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-amber-400" /> Pending Reminders for {customer.companyName}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customerReminders.map((rem) => (
              <div
                key={rem.id}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{rem.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rem.priority === 'Urgent'
                        ? 'bg-rose-500/20 text-rose-400'
                        : rem.priority === 'High'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {rem.priority}
                  </span>
                </div>
                {rem.message && <p className="text-slate-400 line-clamp-1">{rem.message}</p>}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Due: {new Date(rem.dueAt).toLocaleDateString()}</span>
                  <span>Assigned: {rem.assignedEmployeeName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" /> Communication Record Details
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-semibold">Channel / Type:</span>
                <span className="text-white font-mono">{selectedRecord.channel} • {selectedRecord.type} ({selectedRecord.category})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-semibold">Recipient:</span>
                <span className="text-white">{selectedRecord.recipient}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-semibold">Status:</span>
                <span className="font-bold text-emerald-400">{selectedRecord.status}</span>
              </div>
              {selectedRecord.providerMessageId && (
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400 font-semibold">Provider ID:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{selectedRecord.providerMessageId}</span>
                </div>
              )}
              {selectedRecord.errorMessage && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs">
                  <strong>Error: </strong> {selectedRecord.errorMessage}
                </div>
              )}
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Message Content:</span>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                {selectedRecord.body}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <EmailComposerModal
        isOpen={isEmailComposerOpen}
        onClose={() => setIsEmailComposerOpen(false)}
        initialCustomerId={customer.id}
        initialTo={customer.email}
      />

      <WhatsAppChatModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        initialCustomer={customer}
      />

      <CreateReminderModal
        isOpen={isReminderOpen}
        onClose={() => setIsReminderOpen(false)}
        initialCustomerId={customer.id}
        initialTitle={`Follow-up with ${customer.companyName}`}
      />
    </div>
  );
};
