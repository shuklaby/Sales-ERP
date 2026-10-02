import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Mail,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  KeyRound,
  Building2,
  X,
  ExternalLink,
  Edit2,
  Check,
  Ban,
  RotateCcw,
  LifeBuoy,
  MessageSquare,
  Send,
  SendHorizontal,
  FileText,
  CalendarClock,
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Customer,
  CustomerUserRecord,
  CustomerRole,
  CustomerAccountStatus,
  ProfileChangeRequest,
  SupportTicket,
  TicketMessage,
  SupportTicketStatus,
  SupportTicketPriority,
} from '../../types/crm';
import { useAuth } from '../../context/AuthContext';
import { useCrmData } from '../../context/CrmDataContext';
import { CreateReminderModal } from '../communication/CreateReminderModal';
import { EmailComposerModal } from '../communication/EmailComposerModal';

interface CustomerPortalTabProps {
  customer: Customer;
}

export const CustomerPortalTab: React.FC<CustomerPortalTabProps> = ({ customer }) => {
  const { userProfile, isAdmin } = useAuth();
  const { updateCustomer, employees, logActivity } = useCrmData();

  // State
  const [customerUsers, setCustomerUsers] = useState<CustomerUserRecord[]>([]);
  const [changeRequests, setChangeRequests] = useState<ProfileChangeRequest[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteContactName, setInviteContactName] = useState(customer.contactPerson || '');
  const [inviteEmail, setInviteEmail] = useState(customer.email || '');
  const [inviteRole, setInviteRole] = useState<CustomerRole>('Customer Admin');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessInfo, setInviteSuccessInfo] = useState<{
    inviteUrl: string;
    emailSent: boolean;
    message: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Ticket reply / inspect state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isTicketEmailOpen, setIsTicketEmailOpen] = useState(false);
  const [isTicketReminderOpen, setIsTicketReminderOpen] = useState(false);

  // Rejection modal for profile change request
  const [rejectModalReq, setRejectModalReq] = useState<ProfileChangeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // 1. Listen for linked customer users
  useEffect(() => {
    const qUsers = query(collection(db, 'customerUsers'), where('customerId', '==', customer.id));
    const unsub = onSnapshot(
      qUsers,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CustomerUserRecord));
        setCustomerUsers(list);
      },
      (err) => console.warn('Customer users listener error:', err)
    );
    return () => unsub();
  }, [customer.id]);

  // 2. Listen for profile change requests
  useEffect(() => {
    const qReq = query(collection(db, 'profileChangeRequests'), where('customerId', '==', customer.id));
    const unsub = onSnapshot(
      qReq,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProfileChangeRequest));
        list.sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime());
        setChangeRequests(list);
      },
      (err) => console.warn('Change requests listener error:', err)
    );
    return () => unsub();
  }, [customer.id]);

  // 3. Listen for customer tickets
  useEffect(() => {
    const qTickets = query(collection(db, 'supportTickets'), where('customerId', '==', customer.id));
    const unsub = onSnapshot(
      qTickets,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTickets(list);
      },
      (err) => console.warn('Customer tickets listener error:', err)
    );
    return () => unsub();
  }, [customer.id]);

  // 4. Ticket messages when ticket selected
  useEffect(() => {
    if (!selectedTicket) {
      setTicketMessages([]);
      return;
    }
    const qMsgs = query(collection(db, 'ticketMessages'), where('ticketId', '==', selectedTicket.id));
    const unsub = onSnapshot(qMsgs, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TicketMessage));
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setTicketMessages(list);
    });
    return () => unsub();
  }, [selectedTicket]);

  // Send invitation handler
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteContactName.trim()) {
      setInviteError('Contact Name and Email are required.');
      return;
    }

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccessInfo(null);

    try {
      const res = await fetch('/api/customer/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.companyName,
          name: inviteContactName.trim(),
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          invitedBy: userProfile?.name || 'Administrator',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setInviteError(data.error || 'Failed to dispatch customer invitation.');
        setIsInviting(false);
        return;
      }

      setInviteSuccessInfo({
        inviteUrl: data.inviteUrl,
        emailSent: !!data.emailSent,
        message: data.message,
      });

      // Also create an 'Invited' placeholder document in customerUsers if not exists
      const provisionalId = `user-inv-${Date.now()}`;
      await setDoc(
        doc(db, 'customerUsers', provisionalId),
        {
          id: provisionalId,
          customerUserId: provisionalId,
          customerId: customer.id,
          organizationId: customer.id,
          customerName: customer.companyName,
          name: inviteContactName.trim(),
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          status: 'Invited',
          permissions: {
            canViewProposals: true,
            canAcceptProposals: true,
            canRejectProposals: true,
            canViewInvoices: true,
            canPayInvoices: true,
            canDownloadReceipts: true,
            canCreateTickets: true,
            canUploadDocuments: true,
            canManageCompanyProfile: inviteRole === 'Customer Admin',
            canInviteUsers: inviteRole === 'Customer Admin',
          },
          invitationToken: data.token,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await logActivity(
        'customer_updated',
        'Customer Portal Invitation Sent',
        `${userProfile?.name || 'Administrator'} invited ${inviteContactName.trim()} (${inviteEmail.trim()}) as ${inviteRole} to Customer Portal`,
        customer.id
      );

      setIsInviting(false);
    } catch (e: any) {
      setInviteError(e.message || 'Invitation failed');
      setIsInviting(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteSuccessInfo?.inviteUrl) {
      navigator.clipboard.writeText(inviteSuccessInfo.inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleUpdateUserStatus = async (userRecord: CustomerUserRecord, newStatus: CustomerAccountStatus) => {
    try {
      await updateDoc(doc(db, 'customerUsers', userRecord.id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      await logActivity(
        'customer_updated',
        'Customer Account Status Changed',
        `${userProfile?.name || 'Administrator'} set portal access status of ${userRecord.name} to "${newStatus}"`,
        customer.id
      );
    } catch (e) {
      console.error('Failed to update customer user status:', e);
    }
  };

  // Profile Change Request Actions
  const handleApproveChangeRequest = async (req: ProfileChangeRequest) => {
    try {
      // 1. Apply requested changes to the master customer document in Firestore
      await updateCustomer(customer.id, req.requestedChanges);

      // 2. Mark request as Approved
      await updateDoc(doc(db, 'profileChangeRequests', req.id), {
        status: 'Approved',
        reviewedBy: userProfile?.name || 'Administrator',
        reviewedAt: new Date().toISOString(),
      });

      // 3. Notify customer via customerNotification
      const notifId = `NOTIF-${Date.now()}`;
      await setDoc(doc(db, 'customerNotifications', notifId), {
        id: notifId,
        customerId: customer.id,
        customerUserId: req.customerUserId,
        type: 'PROFILE_UPDATED',
        title: 'Profile Change Request Approved',
        message: 'Your requested updates to your organization profile have been reviewed and approved by SparkGenTechnology.',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      await logActivity(
        'customer_updated',
        'Profile Change Request Approved',
        `Admin approved profile updates for ${customer.companyName}`,
        customer.id
      );
    } catch (e) {
      console.error('Failed to approve profile change request:', e);
    }
  };

  const handleRejectChangeRequest = async () => {
    if (!rejectModalReq) return;
    try {
      await updateDoc(doc(db, 'profileChangeRequests', rejectModalReq.id), {
        status: 'Rejected',
        rejectionReason: rejectReason.trim() || 'Declined by Administrator.',
        reviewedBy: userProfile?.name || 'Administrator',
        reviewedAt: new Date().toISOString(),
      });

      const notifId = `NOTIF-${Date.now()}`;
      await setDoc(doc(db, 'customerNotifications', notifId), {
        id: notifId,
        customerId: customer.id,
        customerUserId: rejectModalReq.customerUserId,
        type: 'PROFILE_UPDATED',
        title: 'Profile Change Request Declined',
        message: `Your requested profile changes could not be approved. Reason: ${rejectReason.trim() || 'Administrative policy'}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      setRejectModalReq(null);
      setRejectReason('');
    } catch (e) {
      console.error('Failed to reject profile change request:', e);
    }
  };

  // Ticket Operations
  const handleUpdateTicketStatus = async (ticket: SupportTicket, newStatus: SupportTicketStatus) => {
    try {
      const updates: any = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      if (newStatus === 'Closed' || newStatus === 'Resolved') {
        updates.closedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, 'supportTickets', ticket.id), { ...updates });

      // Notify customer
      const notifId = `NOTIF-${Date.now()}`;
      await setDoc(doc(db, 'customerNotifications', notifId), {
        id: notifId,
        customerId: customer.id,
        customerUserId: ticket.customerUserId,
        type: 'TICKET_UPDATED',
        title: `Ticket #${ticket.ticketNumber} Status: ${newStatus}`,
        message: `Your support ticket "${ticket.subject}" has been marked as ${newStatus}.`,
        relatedId: ticket.id,
        relatedType: 'ticket',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTicketPriority = async (ticket: SupportTicket, newPriority: SupportTicketPriority) => {
    try {
      await updateDoc(doc(db, 'supportTickets', ticket.id), {
        priority: newPriority,
        updatedAt: new Date().toISOString(),
      });
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket((prev) => (prev ? { ...prev, priority: newPriority } : null));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignTicketStaff = async (ticket: SupportTicket, employeeUid: string) => {
    const emp = employees.find((e) => e.uid === employeeUid);
    try {
      await updateDoc(doc(db, 'supportTickets', ticket.id), {
        assignedTo: employeeUid,
        assignedToName: emp?.name || 'Unassigned',
        updatedAt: new Date().toISOString(),
      });
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket((prev) =>
          prev ? { ...prev, assignedTo: employeeUid, assignedToName: emp?.name || 'Unassigned' } : null
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const msgId = `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const newMsg: TicketMessage = {
        id: msgId,
        messageId: msgId,
        ticketId: selectedTicket.id,
        customerId: customer.id,
        senderId: userProfile?.uid || 'admin',
        senderType: isAdmin ? 'Admin' : 'Employee',
        senderName: userProfile?.name || 'SparkGenTechnology Staff',
        authorName: userProfile?.name || 'SparkGenTechnology Staff',
        authorRole: 'Support Staff',
        message: replyText.trim(),
        messageType: isInternalNote ? 'INTERNAL_NOTE' : 'PUBLIC',
        visibility: isInternalNote ? 'INTERNAL_NOTE' : 'PUBLIC',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'ticketMessages', msgId), newMsg);

      // If public reply, notify customer
      if (!isInternalNote) {
        const notifId = `NOTIF-${Date.now()}`;
        await setDoc(doc(db, 'customerNotifications', notifId), {
          id: notifId,
          customerId: customer.id,
          customerUserId: selectedTicket.customerUserId,
          type: 'TICKET_UPDATED',
          title: `New Reply on Ticket #${selectedTicket.ticketNumber}`,
          message: `${userProfile?.name || 'Staff'} replied: "${replyText.trim().slice(0, 60)}..."`,
          relatedId: selectedTicket.id,
          relatedType: 'ticket',
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        // Trigger email notification endpoint
        fetch('/api/customer/ticket-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketNumber: selectedTicket.ticketNumber,
            customerName: customer.companyName,
            subject: selectedTicket.subject,
            message: replyText.trim(),
            eventType: 'Staff Reply',
            recipientEmail: customer.email,
          }),
        }).catch(console.warn);
      }

      setReplyText('');
      setIsSendingReply(false);
    } catch (e) {
      console.error(e);
      setIsSendingReply(false);
    }
  };

  const pendingRequests = changeRequests.filter((r) => r.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Invite Action */}
      <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-slate-900 border border-blue-500/20 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-blue-500/20 text-blue-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold tracking-tight">Customer Portal Access & Identity</h3>
          </div>
          <p className="text-xs text-slate-300">
            Dedicated portal for <strong className="text-white">{customer.companyName}</strong>. Invite authorized executives, approve profile change requests, and collaborate via support tickets.
          </p>
        </div>

        <button
          onClick={() => {
            setInviteContactName(customer.contactPerson || '');
            setInviteEmail(customer.email || '');
            setIsInviteModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition shrink-0"
        >
          <UserPlus className="w-4 h-4" /> Invite Customer to Portal
        </button>
      </div>

      {/* 2. Linked Customer Accounts Table (Section 4) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" /> Authorized Portal Accounts ({customerUsers.length})
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Identities linked to organization ID: <code className="text-indigo-600">{customer.id}</code>
            </p>
          </div>
        </div>

        {customerUsers.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">No Portal Users Activated Yet</p>
            <p>Click "Invite Customer to Portal" above to grant secure access to client contacts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Active</th>
                  <th className="py-2.5 px-3 text-right">Access Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerUsers.map((u) => {
                  const statusColors: Record<CustomerAccountStatus, string> = {
                    Active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    Invited: 'bg-blue-100 text-blue-800 border-blue-200',
                    Suspended: 'bg-amber-100 text-amber-800 border-amber-200',
                    Disabled: 'bg-rose-100 text-rose-800 border-rose-200',
                  };
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{u.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700">{u.role}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusColors[u.status] || 'bg-slate-100 text-slate-700'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {u.status !== 'Active' && (
                            <button
                              onClick={() => handleUpdateUserStatus(u, 'Active')}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold"
                              title="Activate Account"
                            >
                              Activate
                            </button>
                          )}
                          {u.status !== 'Suspended' && (
                            <button
                              onClick={() => handleUpdateUserStatus(u, 'Suspended')}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold"
                              title="Suspend Account (Temporarily hold access)"
                            >
                              Suspend
                            </button>
                          )}
                          {u.status !== 'Disabled' && (
                            <button
                              onClick={() => handleUpdateUserStatus(u, 'Disabled')}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold"
                              title="Disable Account"
                            >
                              Disable
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

      {/* 3. Profile Change Requests (Section 6) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-amber-600" /> Profile Change Requests ({pendingRequests.length} Pending)
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Review and approve updates requested by the customer to prevent unauthorized master data modification.
            </p>
          </div>
        </div>

        {changeRequests.length === 0 ? (
          <div className="p-4 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
            No profile change requests submitted by this customer.
          </div>
        ) : (
          <div className="space-y-3">
            {changeRequests.map((req) => {
              const isPending = req.status === 'Pending';
              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-xl border transition ${
                    isPending ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800 font-bold'
                          }`}
                        >
                          {req.status}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Submitted: {new Date(req.submittedAt || req.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {req.reason && (
                        <p className="text-slate-600 italic">
                          "Reason: {req.reason}"
                        </p>
                      )}

                      {/* Display Changed Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        {Object.entries(req.requestedChanges).map(([key, val]) => {
                          const currentVal = (customer as any)[key] || 'Not Set';
                          if (val === currentVal) return null;
                          return (
                            <div key={key} className="bg-white p-2 rounded-lg border border-slate-200">
                              <span className="font-bold text-slate-700 capitalize block">{key}:</span>
                              <div className="text-slate-400 line-through truncate">{String(currentVal)}</div>
                              <div className="text-emerald-700 font-bold truncate">➔ {String(val)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApproveChangeRequest(req)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => setRejectModalReq(req)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Support Tickets Raised by Customer (Section 23) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-blue-600" /> Support Desk Tickets ({tickets.length})
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Service inquiries, billing disputes, and technical support requests raised by this client.
            </p>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-xl text-xs text-slate-400">
            No support tickets on record for this customer.
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/60 transition space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-600">{t.ticketNumber}</span>
                      <span className="font-bold text-xs text-slate-800">{t.subject}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{t.description}</p>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                      <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                      <span>Assigned: {t.assignedToName || 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status select */}
                    <select
                      value={t.status}
                      onChange={(e) => handleUpdateTicketStatus(t, e.target.value as SupportTicketStatus)}
                      className="bg-white border border-slate-300 rounded-lg text-xs font-semibold px-2 py-1"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting">Waiting</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>

                    {/* Priority select */}
                    <select
                      value={t.priority}
                      onChange={(e) => handleUpdateTicketPriority(t, e.target.value as SupportTicketPriority)}
                      className="bg-white border border-slate-300 rounded-lg text-xs font-semibold px-2 py-1 text-slate-700"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>

                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Thread
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Conversation Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">{selectedTicket.ticketNumber}</span>
                  <span className="font-bold text-sm text-slate-800">{selectedTicket.subject}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Category: {selectedTicket.category} • Priority: {selectedTicket.priority} • Status: {selectedTicket.status}
                </p>
                <div className="flex items-center gap-2 pt-1.5">
                  <button
                    onClick={() => setIsTicketEmailOpen(true)}
                    className="px-2.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[11px] font-semibold flex items-center gap-1 transition"
                  >
                    <Mail className="w-3 h-3" /> Email Customer
                  </button>
                  <button
                    onClick={() => setIsTicketReminderOpen(true)}
                    className="px-2.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md text-[11px] font-semibold flex items-center gap-1 transition"
                  >
                    <CalendarClock className="w-3 h-3" /> Set Reminder
                  </button>
                  {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                    <button
                      onClick={async () => {
                        await updateDoc(doc(db, 'supportTickets', selectedTicket.id), {
                          status: 'Resolved',
                          resolvedAt: new Date().toISOString(),
                        });
                        setSelectedTicket({ ...selectedTicket, status: 'Resolved' });
                      }}
                      className="px-2.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Mark Resolved
                    </button>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {/* Original ticket issue */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Initial Issue Report:</span>
                <p className="text-xs text-slate-800">{selectedTicket.description}</p>
              </div>

              {ticketMessages.map((m) => {
                const isInternal = m.messageType === 'INTERNAL_NOTE' || m.messageType === 'INTERNAL' || m.visibility === 'INTERNAL_NOTE';
                const isStaff = m.senderType === 'Employee' || m.senderType === 'Admin' || m.authorRole === 'Support Staff' || m.authorRole === 'Admin';
                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      isInternal
                        ? 'bg-amber-50/80 border-amber-200 ml-4'
                        : isStaff
                        ? 'bg-blue-50/80 border-blue-200 ml-4'
                        : 'bg-slate-100 border-slate-200 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">
                        {m.authorName || m.senderName || 'Staff'} ({m.authorRole || m.senderType || 'Staff'})
                      </span>
                      <div className="flex items-center gap-2">
                        {isInternal && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-900">
                            INTERNAL NOTE (Customer Cannot See)
                          </span>
                        )}
                        <span className="text-slate-400">{new Date(m.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{m.message}</p>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendTicketReply} className="pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Compose Reply / Note:</label>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className={isInternalNote ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                      Internal Note (Hidden from Customer)
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? 'Add private staff note for team members...'
                      : 'Write response to customer (they will be notified)...'
                  }
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isSendingReply || !replyText.trim()}
                  className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Customer Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" /> Invite Customer to Portal
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccessInfo && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{inviteSuccessInfo.message}</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-emerald-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-600 truncate font-mono">
                    {inviteSuccessInfo.inviteUrl}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-700 shrink-0 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-[10px] text-emerald-700">
                  {inviteSuccessInfo.emailSent
                    ? 'An official activation email was dispatched to the customer.'
                    : 'Email service is not active. Share the link directly with the customer.'}
                </p>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Contact Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={inviteContactName}
                  onChange={(e) => setInviteContactName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="contact@customer-company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Organization</label>
                <input
                  type="text"
                  value={customer.companyName}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-600 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Portal Access Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as CustomerRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-semibold"
                >
                  <option value="Customer Admin">Customer Admin (Full privileges + User invitations)</option>
                  <option value="Customer User">Customer User (Standard proposals & payments)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isInviting ? 'Sending...' : 'Send Secure Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Profile Change Request Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900">Decline Profile Change Request</h4>
            <p className="text-xs text-slate-600">
              Provide a justification for why this profile update cannot be applied:
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Official GST certificate required before modifying GSTIN..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalReq(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectChangeRequest}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Email Modal */}
      {selectedTicket && isTicketEmailOpen && (
        <EmailComposerModal
          isOpen={isTicketEmailOpen}
          onClose={() => setIsTicketEmailOpen(false)}
          initialCustomerId={selectedTicket.customerId}
          initialTicketId={selectedTicket.id}
          initialSubject={`Regarding Support Ticket #${selectedTicket.ticketNumber} — ${selectedTicket.subject}`}
          initialCategory="Support"
        />
      )}

      {/* Ticket Reminder Modal */}
      {selectedTicket && isTicketReminderOpen && (
        <CreateReminderModal
          isOpen={isTicketReminderOpen}
          onClose={() => setIsTicketReminderOpen(false)}
          initialCustomerId={selectedTicket.customerId}
          initialTicketId={selectedTicket.id}
          initialTitle={`Follow up on Ticket #${selectedTicket.ticketNumber}`}
          initialMessage={`Action pending on ticket #${selectedTicket.ticketNumber}: ${selectedTicket.subject}`}
        />
      )}
    </div>
  );
};
