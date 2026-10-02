import React, { useState } from 'react';
import { X, CalendarClock, AlertCircle, CheckCircle2, Clock, User, Building, FileText } from 'lucide-react';
import { useCommunication } from '../../context/CommunicationContext';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { FollowupReminderPriority } from '../../types/crm';

interface CreateReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  initialProposalId?: string;
  initialInvoiceId?: string;
  initialTicketId?: string;
  initialTitle?: string;
  initialMessage?: string;
}

export const CreateReminderModal: React.FC<CreateReminderModalProps> = ({
  isOpen,
  onClose,
  initialCustomerId,
  initialProposalId,
  initialInvoiceId,
  initialTicketId,
  initialTitle,
  initialMessage,
}) => {
  const { createFollowupReminder } = useCommunication();
  const { customers, proposals, invoices, employees } = useCrmData();
  const { userProfile } = useAuth();

  const [title, setTitle] = useState(initialTitle || '');
  const [message, setMessage] = useState(initialMessage || '');
  const [priority, setPriority] = useState<FollowupReminderPriority>('Medium');
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });

  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [proposalId, setProposalId] = useState(initialProposalId || '');
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId || '');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(userProfile?.uid || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please provide a title for the reminder.');
      return;
    }
    if (!dueAt) {
      setErrorMessage('Please specify when the reminder is due.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const activeCust = customers.find((c) => c.id === customerId);
      const activeProp = proposals.find((p) => p.id === proposalId);
      const activeInv = invoices.find((i) => i.id === invoiceId);
      const activeEmp = employees.find((emp) => emp.uid === assignedEmployeeId);

      await createFollowupReminder({
        title: title.trim(),
        message: message.trim(),
        dueAt: new Date(dueAt).toISOString(),
        priority,
        customerId: activeCust?.id,
        customerName: activeCust?.companyName,
        proposalId: activeProp?.id,
        proposalNumber: activeProp?.proposalNumber,
        invoiceId: activeInv?.id,
        invoiceNumber: activeInv?.invoiceNumber,
        ticketId: initialTicketId,
        assignedEmployeeId: activeEmp?.uid || userProfile?.uid || 'admin',
        assignedEmployeeName: activeEmp?.name || userProfile?.name || 'Staff Member',
      });

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to create reminder.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Follow-up Reminder</h2>
              <p className="text-xs text-slate-400">Automated task tracking for proposals, invoices & deals</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Reminder Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call client regarding proposal negotiation"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Due Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as FollowupReminderPriority)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Assigned Employee
            </label>
            <select
              value={assignedEmployeeId}
              onChange={(e) => setAssignedEmployeeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
            >
              <option value={userProfile?.uid || 'admin'}>Assign to Myself ({userProfile?.name || 'You'})</option>
              {employees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          {/* Related Links */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Linked Customer
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
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
                Linked Proposal
              </label>
              <select
                value={proposalId}
                onChange={(e) => setProposalId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="">-- None --</option>
                {proposals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.proposalNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Reminder Notes / Details
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Context or action items required for this reminder..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <CalendarClock className="w-3.5 h-3.5" />}
              <span>Save Reminder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
