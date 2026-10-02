import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  User,
  Paperclip,
  CheckCheck,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { SupportTicket, TicketMessage, SupportTicketCategory, SupportTicketPriority } from '../../../types/crm';

export const CustomerSupportView: React.FC = () => {
  const { tickets, createSupportTicket, replySupportTicket, closeSupportTicket, customerUser } = useCustomerPortal();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);

  // Create Ticket Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('Technical Support');
  const [priority, setPriority] = useState<SupportTicketPriority>('Medium');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reply State
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Real-time listener for public ticket messages strictly
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    // Query messages where ticketId == selectedTicket.id and messageType == 'PUBLIC' (Section 28)
    const q = query(
      collection(db, 'ticketMessages'),
      where('ticketId', '==', selectedTicket.id),
      where('messageType', '==', 'PUBLIC')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TicketMessage));
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(list);
      },
      (err) => console.warn('Ticket messages listener error:', err)
    );

    return () => unsub();
  }, [selectedTicket]);

  const filteredTickets = tickets.filter((t) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      if (!t.ticketNumber.toLowerCase().includes(q) && !t.subject.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && t.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);

    const res = await createSupportTicket({
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
    });
    setIsSubmitting(false);

    if (res.success && res.ticket) {
      setSelectedTicket(res.ticket);
      setIsCreateModalOpen(false);
      setSubject('');
      setDescription('');
    } else {
      setCreateError(res.error || 'Failed to submit ticket');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setIsReplying(true);
    const res = await replySupportTicket(selectedTicket.id, replyText);
    setIsReplying(false);
    if (res.success) {
      setReplyText('');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    if (confirm(`Are you sure you want to close ticket ${selectedTicket.ticketNumber}?`)) {
      await closeSupportTicket(selectedTicket.id);
      setSelectedTicket((prev) => (prev ? { ...prev, status: 'Closed' } : null));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-blue-400" /> Support Desk & Tickets
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            24/7 direct communication with SparkGenTechnology technical support and engineering teams
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-56"
            />
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
          >
            <Plus className="w-4 h-4" /> Open New Ticket
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <LifeBuoy className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Support Tickets</p>
            <p className="text-[11px] text-slate-500">
              Need assistance with engineering, deployment, billing, or proposals? Open a ticket above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Ticket #</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredTickets.map((t) => {
                  const isClosed = t.status === 'Closed' || t.status === 'Resolved';
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-400">{t.ticketNumber}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{t.subject}</td>
                      <td className="py-3.5 px-4 text-slate-400">{t.category}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.priority === 'Urgent'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : t.priority === 'High'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isClosed
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : t.status === 'In Progress'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(t.lastReplyAt || t.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
                        >
                          View Thread
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Conversation Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-400">{selectedTicket.ticketNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {selectedTicket.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                    {selectedTicket.category}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{selectedTicket.subject}</h3>
              </div>

              <div className="flex items-center gap-2">
                {selectedTicket.status !== 'Closed' && selectedTicket.status !== 'Resolved' && (
                  <button
                    onClick={handleCloseTicket}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Close Ticket
                  </button>
                )}
                <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conversation Messages Thread (Public Only) */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-[220px]">
              {messages.map((m) => {
                const isCustomer = m.senderType === 'Customer';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                      <span className="font-bold text-slate-300">
                        {isCustomer ? 'You' : `${m.senderName} (${m.senderType})`}
                      </span>
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-blue-600 text-white rounded-tr-sm'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Bar */}
            {selectedTicket.status !== 'Closed' ? (
              <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-800 shrink-0 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply to the engineering team..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isReplying || !replyText.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                This ticket has been marked as resolved. If you need further help, please create a new ticket.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-blue-400" /> Open New Support Ticket
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Subject / Brief Description</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Issue connecting to staging API webhook"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Technical Support">Technical Support</option>
                    <option value="General">General Inquiry</option>
                    <option value="Billing">Billing & Taxes</option>
                    <option value="Payment">Payment Gateway</option>
                    <option value="Proposal">Proposal Scope</option>
                    <option value="Invoice">Invoice Revision</option>
                    <option value="Account">Account Access</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent (Production Blocker)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Detailed Description</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the problem, steps to reproduce, or assistance needed..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Open Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
