import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  Customer,
  CustomerUserRecord,
  CustomerUserPermissions,
  DEFAULT_CUSTOMER_ADMIN_PERMISSIONS,
  DEFAULT_CUSTOMER_USER_PERMISSIONS,
  ProposalRecord,
  InvoiceRecord,
  PaymentReceipt,
  OnlinePaymentRecord,
  SupportTicket,
  TicketMessage,
  CustomerDocument,
  ProfileChangeRequest,
  ProposalChangeRequest,
  CustomerNotification,
  CustomerAuditLog,
  CustomerPortalTab,
} from '../types/crm';

interface CustomerPortalContextType {
  firebaseUser: FirebaseUser | null;
  customerUser: CustomerUserRecord | null;
  customerCompany: Customer | null;
  loading: boolean;
  authError: string | null;
  activeTab: CustomerPortalTab;
  setActiveTab: (tab: CustomerPortalTab) => void;
  // Scoped customer data
  proposals: ProposalRecord[];
  invoices: InvoiceRecord[];
  receipts: PaymentReceipt[];
  onlinePayments: OnlinePaymentRecord[];
  tickets: SupportTicket[];
  documents: CustomerDocument[];
  notifications: CustomerNotification[];
  profileChangeRequests: ProfileChangeRequest[];
  customerUsers: CustomerUserRecord[];
  unreadNotificationCount: number;
  openTicketCount: number;
  // Actions
  logout: () => Promise<void>;
  trackProposalView: (proposalId: string) => Promise<void>;
  acceptProposal: (proposalId: string) => Promise<{ success: boolean; error?: string }>;
  rejectProposal: (proposalId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  requestProposalChanges: (proposalId: string, message: string, requestedChanges: string) => Promise<{ success: boolean; error?: string }>;
  submitProfileChangeRequest: (requestedChanges: Partial<Customer>, reason?: string) => Promise<{ success: boolean; error?: string }>;
  createSupportTicket: (data: {
    subject: string;
    description: string;
    category: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  }) => Promise<{ success: boolean; ticket?: SupportTicket; error?: string }>;
  replySupportTicket: (ticketId: string, message: string, attachments?: any[]) => Promise<{ success: boolean; error?: string }>;
  closeSupportTicket: (ticketId: string) => Promise<{ success: boolean; error?: string }>;
  uploadDocument: (file: File, type: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  inviteOrganizationUser: (name: string, email: string, role: 'Customer Admin' | 'Customer User') => Promise<{ success: boolean; error?: string }>;
  deactivateOrganizationUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updateCustomerUserProfile: (data: { name?: string; phone?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
  logCustomerAudit: (action: CustomerAuditLog['action'], relatedId?: string, relatedType?: string, details?: string) => Promise<void>;
}

const CustomerPortalContext = createContext<CustomerPortalContextType | undefined>(undefined);

export const CustomerPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [customerUser, setCustomerUser] = useState<CustomerUserRecord | null>(null);
  const [customerCompany, setCustomerCompany] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CustomerPortalTab>('dashboard');

  // Customer isolated collections
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [onlinePayments, setOnlinePayments] = useState<OnlinePaymentRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [profileChangeRequests, setProfileChangeRequests] = useState<ProfileChangeRequest[]>([]);
  const [customerUsers, setCustomerUsers] = useState<CustomerUserRecord[]>([]);

  // 1. Audit logger
  const logCustomerAudit = useCallback(
    async (action: CustomerAuditLog['action'], relatedId?: string, relatedType?: string, details?: string) => {
      if (!customerUser) return;
      try {
        const logId = `CAUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        await setDoc(doc(db, 'customerAuditLogs', logId), {
          id: logId,
          logId,
          customerId: customerUser.customerId,
          customerUserId: customerUser.customerUserId,
          customerName: customerUser.customerName || customerUser.name,
          action,
          relatedId,
          relatedType,
          details: details || `Customer performed ${action}`,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Customer audit log error:', e);
      }
    },
    [customerUser]
  );

  // 2. Authentication Listener & Customer User Lookup
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthError(null);

      // Clean previous subscriptions
      unsubs.forEach((u) => u());
      unsubs = [];

      if (!user) {
        setCustomerUser(null);
        setCustomerCompany(null);
        setProposals([]);
        setInvoices([]);
        setReceipts([]);
        setOnlinePayments([]);
        setTickets([]);
        setDocuments([]);
        setNotifications([]);
        setProfileChangeRequests([]);
        setCustomerUsers([]);
        setLoading(false);
        return;
      }

      try {
        // Look up customerUsers document by UID or email
        const userDocRef = doc(db, 'customerUsers', user.uid);
        let userSnap = await getDoc(userDocRef);
        let custData: CustomerUserRecord | null = null;

        if (userSnap.exists()) {
          custData = userSnap.data() as CustomerUserRecord;
        } else {
          // Check query by customerUserId or email
          const qEmail = query(collection(db, 'customerUsers'), where('email', '==', (user.email || '').toLowerCase()));
          const qSnap = await getDoc(userDocRef);
          if (qSnap.exists()) {
            custData = qSnap.data() as CustomerUserRecord;
          }
        }

        // Check if user is an admin or employee who is previewing/testing
        if (!custData) {
          // Check if admin user profile exists in 'users'
          const empDoc = await getDoc(doc(db, 'users', user.uid));
          if (empDoc.exists()) {
            const empData = empDoc.data();
            // Check if there is an active customer to associate for preview
            const custSnap = await getDoc(doc(db, 'customers', 'preview-customer'));
            // If they are an employee accessing customer portal, link to first customer or preview
            const firstCustomerQuery = query(collection(db, 'customers'));
            const unsubsEmp = onSnapshot(firstCustomerQuery, (snap) => {
              if (!snap.empty) {
                const firstCust = { id: snap.docs[0].id, ...snap.docs[0].data() } as Customer;
                const mockCustUser: CustomerUserRecord = {
                  id: user.uid,
                  customerUserId: user.uid,
                  customerId: firstCust.id,
                  organizationId: firstCust.id,
                  customerName: firstCust.companyName,
                  name: user.displayName || empData.name || 'Portal User',
                  email: user.email || '',
                  role: 'Customer Admin',
                  status: 'Active',
                  permissions: DEFAULT_CUSTOMER_ADMIN_PERMISSIONS,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setCustomerUser(mockCustUser);
                setCustomerCompany(firstCust);
              }
            });
            unsubs.push(unsubsEmp);
            setLoading(false);
            return;
          }
        }

        if (!custData) {
          setAuthError('No customer organization is linked to this account. Please contact SparkGenTechnology.');
          setCustomerUser(null);
          setLoading(false);
          return;
        }

        // Check access status (Section 4, 42)
        if (custData.status === 'Suspended') {
          setAuthError('Your customer portal access has been suspended by the administrator. Please contact SparkGenTechnology.');
          setCustomerUser(null);
          setLoading(false);
          return;
        }

        if (custData.status === 'Disabled') {
          setAuthError('Your customer portal account is deactivated. Contact support for assistance.');
          setCustomerUser(null);
          setLoading(false);
          return;
        }

        // Auto-activate invited customer upon successful login
        if (custData.status === 'Invited') {
          custData.status = 'Active';
          await updateDoc(userDocRef, {
            status: 'Active',
            lastLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          await updateDoc(userDocRef, {
            lastLoginAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }).catch(console.warn);
        }

        setCustomerUser(custData);

        // Fetch Customer Company profile
        const companyRef = doc(db, 'customers', custData.customerId);
        const compSnap = await getDoc(companyRef);
        if (compSnap.exists()) {
          setCustomerCompany({ id: compSnap.id, ...compSnap.data() } as Customer);
        }

        // Attach Real-Time Listeners strictly scoped to customerId
        const custId = custData.customerId;

        // 1. Proposals
        const unsubProposals = onSnapshot(
          query(collection(db, 'proposals'), where('customerId', '==', custId)),
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProposalRecord));
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setProposals(list);
          },
          (err) => console.warn('Proposals listener error:', err)
        );
        unsubs.push(unsubProposals);

        // 2. Invoices
        const unsubInvoices = onSnapshot(
          query(collection(db, 'invoices'), where('customerId', '==', custId)),
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InvoiceRecord));
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setInvoices(list);
          },
          (err) => console.warn('Invoices listener error:', err)
        );
        unsubs.push(unsubInvoices);

        // 3. Receipts
        const unsubReceipts = onSnapshot(
          query(collection(db, 'receipts'), where('customerId', '==', custId)),
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentReceipt));
            list.sort((a, b) => new Date(b.paymentDate || 0).getTime() - new Date(a.paymentDate || 0).getTime());
            setReceipts(list);
          },
          (err) => console.warn('Receipts listener error:', err)
        );
        unsubs.push(unsubReceipts);

        // 4. Online Payments
        const unsubOnlinePayments = onSnapshot(
          query(collection(db, 'onlinePayments'), where('customerId', '==', custId)),
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as OnlinePaymentRecord));
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setOnlinePayments(list);
          },
          (err) => console.warn('Online payments listener error:', err)
        );
        unsubs.push(unsubOnlinePayments);

        // 5. Support Tickets
        const unsubTickets = onSnapshot(
          query(collection(db, 'supportTickets'), where('customerId', '==', custId)),
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SupportTicket));
            list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
            setTickets(list);
          },
          (err) => console.warn('Support tickets listener error:', err)
        );
        unsubs.push(unsubTickets);

        // 6. Documents (Only Customer visibility)
        const unsubDocs = onSnapshot(
          query(
            collection(db, 'documents'),
            where('customerId', '==', custId),
            where('visibility', '==', 'Customer')
          ),
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CustomerDocument));
            list.sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
            setDocuments(list);
          },
          (err) => console.warn('Documents listener error:', err)
        );
        unsubs.push(unsubDocs);

        // 7. Customer Notifications
        const unsubNotifs = onSnapshot(
          query(collection(db, 'customerNotifications'), where('customerId', '==', custId)),
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CustomerNotification));
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setNotifications(list);
          },
          (err) => console.warn('Notifications listener error:', err)
        );
        unsubs.push(unsubNotifs);

        // 8. Profile Change Requests
        const unsubProfileReqs = onSnapshot(
          query(collection(db, 'profileChangeRequests'), where('customerId', '==', custId)),
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProfileChangeRequest));
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setProfileChangeRequests(list);
          },
          (err) => console.warn('Profile requests listener error:', err)
        );
        unsubs.push(unsubProfileReqs);

        // 9. Organization Users
        const unsubOrgUsers = onSnapshot(
          query(collection(db, 'customerUsers'), where('customerId', '==', custId)),
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CustomerUserRecord));
            setCustomerUsers(list);
          },
          (err) => console.warn('Organization users listener error:', err)
        );
        unsubs.push(unsubOrgUsers);

        // Log login audit
        logCustomerAudit('CUSTOMER_LOGIN');
      } catch (err: any) {
        console.error('Error initializing customer portal session:', err);
        setAuthError(err.message || 'Error loading customer portal');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubs.forEach((u) => u());
    };
  }, [logCustomerAudit]);

  // Logout handler
  const logout = async () => {
    if (customerUser) {
      await logCustomerAudit('CUSTOMER_LOGOUT');
    }
    await signOut(auth);
    window.location.href = '/customer/login';
  };

  // 3. Track proposal view
  const trackProposalView = async (proposalId: string) => {
    if (!customerUser) return;
    try {
      const propRef = doc(db, 'proposals', proposalId);
      const propSnap = await getDoc(propRef);
      if (propSnap.exists()) {
        const propData = propSnap.data() as ProposalRecord;
        if (propData.status === 'Sent') {
          await updateDoc(propRef, {
            status: 'Viewed',
            viewedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      await logCustomerAudit('PROPOSAL_VIEWED', proposalId, 'proposal', `Viewed proposal ${proposalId}`);
    } catch (e) {
      console.warn('Track proposal view failed:', e);
    }
  };

  // 4. Accept proposal
  const acceptProposal = async (proposalId: string): Promise<{ success: boolean; error?: string }> => {
    if (!customerUser) return { success: false, error: 'Unauthorized' };
    if (!customerUser.permissions.acceptProposal) {
      return { success: false, error: 'You do not have permission to accept commercial proposals.' };
    }

    try {
      const propRef = doc(db, 'proposals', proposalId);
      const nowIso = new Date().toISOString();
      await updateDoc(propRef, {
        status: 'Accepted',
        acceptedAt: nowIso,
        acceptedBy: customerUser.name,
        customerResponse: 'Accepted',
        updatedAt: nowIso,
      });

      // Audit log
      await logCustomerAudit('PROPOSAL_ACCEPTED', proposalId, 'proposal', `Accepted proposal ${proposalId}`);

      // Internal activity for CRM
      const actId = `ACT-PROP-ACC-${Date.now()}`;
      await setDoc(doc(db, 'activities', actId), {
        id: actId,
        type: 'proposal_accepted',
        title: 'Proposal Accepted by Customer',
        description: `Customer ${customerUser.name} (${customerUser.customerName || 'Client'}) accepted proposal.`,
        customerId: customerUser.customerId,
        customerName: customerUser.customerName,
        relatedId: proposalId,
        createdAt: nowIso,
        timestamp: nowIso,
      });

      // Notify CRM admins
      const notifId = `NOTIF-${Date.now()}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        notificationId: notifId,
        userId: 'all_admins',
        type: 'PROPOSAL_ACCEPTED',
        title: 'Proposal Accepted by Customer!',
        message: `${customerUser.customerName || 'Customer'} (${customerUser.name}) confirmed acceptance of proposal.`,
        relatedId: proposalId,
        relatedType: 'proposal',
        read: false,
        createdAt: nowIso,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to accept proposal' };
    }
  };

  // 5. Reject proposal
  const rejectProposal = async (proposalId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (!customerUser) return { success: false, error: 'Unauthorized' };
    try {
      const propRef = doc(db, 'proposals', proposalId);
      const nowIso = new Date().toISOString();
      await updateDoc(propRef, {
        status: 'Rejected',
        rejectedAt: nowIso,
        customerResponse: 'Rejected',
        customerResponseReason: reason || 'Declined by customer',
        updatedAt: nowIso,
      });

      await logCustomerAudit('PROPOSAL_REJECTED', proposalId, 'proposal', `Rejected proposal: ${reason}`);

      // Notify CRM admins
      const notifId = `NOTIF-${Date.now()}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        notificationId: notifId,
        userId: 'all_admins',
        type: 'PROPOSAL_REJECTED',
        title: 'Proposal Rejected by Customer',
        message: `${customerUser.customerName || 'Customer'} rejected proposal. Reason: ${reason}`,
        relatedId: proposalId,
        relatedType: 'proposal',
        read: false,
        createdAt: nowIso,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reject proposal' };
    }
  };

  // 6. Request proposal changes
  const requestProposalChanges = async (
    proposalId: string,
    message: string,
    requestedChanges: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!customerUser) return { success: false, error: 'Unauthorized' };
    try {
      const prop = proposals.find((p) => p.id === proposalId);
      const reqId = `PCR-${Date.now()}`;
      const nowIso = new Date().toISOString();

      await setDoc(doc(db, 'proposalChangeRequests', reqId), {
        id: reqId,
        requestId: reqId,
        proposalId,
        proposalNumber: prop?.proposalNumber || proposalId,
        customerId: customerUser.customerId,
        customerUserId: customerUser.customerUserId,
        customerName: customerUser.name,
        message,
        requestedChanges,
        status: 'Open',
        createdAt: nowIso,
      });

      // Update proposal status to 'Under Discussion'
      await updateDoc(doc(db, 'proposals', proposalId), {
        status: 'Under Discussion',
        updatedAt: nowIso,
      });

      await logCustomerAudit('PROPOSAL_CHANGE_REQUESTED', proposalId, 'proposal', message);

      // Notify CRM admin
      const notifId = `NOTIF-${Date.now()}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        notificationId: notifId,
        userId: 'all_admins',
        type: 'PROPOSAL_VIEWED',
        title: 'Proposal Revision Requested',
        message: `${customerUser.name} requested revisions on proposal ${prop?.proposalNumber || proposalId}: "${message}"`,
        relatedId: proposalId,
        relatedType: 'proposal',
        read: false,
        createdAt: nowIso,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit changes request' };
    }
  };

  // 7. Submit Profile Change Request
  const submitProfileChangeRequest = async (
    requestedChanges: Partial<Customer>,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!customerUser || !customerCompany) return { success: false, error: 'Unauthorized' };
    try {
      const reqId = `PCR-COMP-${Date.now()}`;
      const nowIso = new Date().toISOString();

      await setDoc(doc(db, 'profileChangeRequests', reqId), {
        id: reqId,
        requestId: reqId,
        customerId: customerUser.customerId,
        customerUserId: customerUser.customerUserId,
        customerName: customerCompany.companyName,
        requestedChanges,
        currentSnapshot: {
          companyName: customerCompany.companyName,
          contactPerson: customerCompany.contactPerson,
          email: customerCompany.email,
          phone: customerCompany.phone,
          address: customerCompany.address,
          gstNumber: customerCompany.gstNumber,
          website: customerCompany.website,
        },
        reason: reason || 'Customer requested company profile update',
        status: 'Pending',
        createdAt: nowIso,
      });

      // Notify admins
      const notifId = `NOTIF-${Date.now()}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        notificationId: notifId,
        userId: 'all_admins',
        type: 'CUSTOMER_CONVERTED' as any,
        title: 'Customer Profile Change Request',
        message: `${customerCompany.companyName} submitted a request to update their master company details.`,
        relatedId: reqId,
        relatedType: 'customer',
        read: false,
        createdAt: nowIso,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit profile change request' };
    }
  };

  // 8. Create Support Ticket
  const createSupportTicket = async (data: {
    subject: string;
    description: string;
    category: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  }): Promise<{ success: boolean; ticket?: SupportTicket; error?: string }> => {
    if (!customerUser) return { success: false, error: 'Unauthorized' };
    try {
      const now = new Date();
      const ticketId = `TICK-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowIso = now.toISOString();

      const newTicket: SupportTicket = {
        id: ticketId,
        ticketId,
        ticketNumber: ticketId,
        customerId: customerUser.customerId,
        customerUserId: customerUser.customerUserId,
        customerName: customerCompany?.companyName || customerUser.name,
        subject: data.subject.trim(),
        description: data.description.trim(),
        category: data.category || 'General',
        priority: data.priority || 'Medium',
        status: 'Open',
        createdAt: nowIso,
        updatedAt: nowIso,
        lastReplyAt: nowIso,
        lastReplyBy: customerUser.name,
        lastReplyType: 'Customer',
      };

      await setDoc(doc(db, 'supportTickets', ticketId), newTicket);

      // Create initial message
      const msgId = `MSG-${Date.now()}`;
      await setDoc(doc(db, 'ticketMessages', msgId), {
        id: msgId,
        messageId: msgId,
        ticketId,
        customerId: customerUser.customerId,
        senderId: customerUser.customerUserId,
        senderType: 'Customer',
        senderName: customerUser.name,
        message: data.description.trim(),
        messageType: 'PUBLIC',
        createdAt: nowIso,
      });

      await logCustomerAudit('TICKET_CREATED', ticketId, 'ticket', data.subject);

      // Notify Admins & notify server
      const notifId = `NOTIF-${Date.now()}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        notificationId: notifId,
        userId: 'all_admins',
        type: 'SYSTEM_ALERT' as any,
        title: `New Support Ticket [${ticketId}]`,
        message: `Customer ${customerCompany?.companyName || customerUser.name} created ticket: "${data.subject}"`,
        relatedId: ticketId,
        relatedType: 'ticket' as any,
        read: false,
        createdAt: nowIso,
      });

      // Dispatch backend email alert
      fetch('/api/customer/ticket-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber: ticketId,
          customerName: customerCompany?.companyName || customerUser.name,
          subject: data.subject,
          message: data.description,
          eventType: 'Ticket Created',
          recipientEmail: customerUser.email,
        }),
      }).catch(console.warn);

      return { success: true, ticket: newTicket };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create support ticket' };
    }
  };

  // 9. Reply Support Ticket
  const replySupportTicket = async (
    ticketId: string,
    message: string,
    attachments?: any[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!customerUser) return { success: false, error: 'Unauthorized' };
    try {
      const nowIso = new Date().toISOString();
      const msgId = `MSG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      await setDoc(doc(db, 'ticketMessages', msgId), {
        id: msgId,
        messageId: msgId,
        ticketId,
        customerId: customerUser.customerId,
        senderId: customerUser.customerUserId,
        senderType: 'Customer',
        senderName: customerUser.name,
        message: message.trim(),
        attachments: attachments || [],
        messageType: 'PUBLIC',
        createdAt: nowIso,
      });

      // Update ticket status to 'Waiting for Customer' -> 'In Progress' or 'Open'
      const ticketRef = doc(db, 'supportTickets', ticketId);
      await updateDoc(ticketRef, {
        status: 'In Progress',
        updatedAt: nowIso,
        lastReplyAt: nowIso,
        lastReplyBy: customerUser.name,
        lastReplyType: 'Customer',
      });

      await logCustomerAudit('TICKET_REPLIED', ticketId, 'ticket', message.substring(0, 80));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reply to ticket' };
    }
  };

  // 10. Close Support Ticket
  const closeSupportTicket = async (ticketId: string): Promise<{ success: boolean; error?: string }> => {
    if (!customerUser) return { success: false, error: 'Unauthorized' };
    try {
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, 'supportTickets', ticketId), {
        status: 'Closed',
        closedAt: nowIso,
        updatedAt: nowIso,
      });

      await logCustomerAudit('TICKET_CLOSED', ticketId, 'ticket', `Closed ticket ${ticketId}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to close ticket' };
    }
  };

  // 11. Upload Document
  const uploadDocument = async (file: File, type: string, description?: string): Promise<{ success: boolean; error?: string }> => {
    if (!customerUser) return { success: false, error: 'Unauthorized' };
    try {
      // Validate file size (15MB)
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > 15) {
        return { success: false, error: `File size (${sizeMb.toFixed(1)}MB) exceeds 15MB limit.` };
      }

      // Convert file to base64 for secure backend upload
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const fileBase64 = await base64Promise;

      const res = await fetch('/api/customer/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          type: type || 'General Document',
          fileBase64,
          mimeType: file.type,
          customerId: customerUser.customerId,
          uploadedBy: customerUser.customerUserId,
          uploadedByName: customerUser.name,
          uploadedByRole: 'Customer',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Upload failed' };
      }

      // Write document metadata to Firestore
      const docRecord: CustomerDocument = {
        id: data.documentId,
        documentId: data.documentId,
        customerId: customerUser.customerId,
        customerName: customerCompany?.companyName || customerUser.name,
        name: file.name,
        type: type || 'General Document',
        fileUrl: data.fileUrl,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: customerUser.customerUserId,
        uploadedByName: customerUser.name,
        uploadedByRole: 'Customer',
        uploadedAt: new Date().toISOString(),
        visibility: 'Customer',
        status: 'Active',
        description,
      };

      await setDoc(doc(db, 'documents', data.documentId), docRecord);
      await logCustomerAudit('DOCUMENT_UPLOADED', data.documentId, 'document', file.name);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'File upload failed' };
    }
  };

  // 12. Notifications management
  const markNotificationRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'customerNotifications', notifId), { read: true });
    } catch (e) {
      console.warn('Mark notif read error:', e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(
        unread.map((n) => updateDoc(doc(db, 'customerNotifications', n.id), { read: true }))
      );
    } catch (e) {
      console.warn('Mark all notifs read error:', e);
    }
  };

  // 13. Organization Users Management (for Customer Admin)
  const inviteOrganizationUser = async (
    name: string,
    email: string,
    role: 'Customer Admin' | 'Customer User'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!customerUser || customerUser.role !== 'Customer Admin') {
      return { success: false, error: 'Only Customer Admins can invite team members to this organization.' };
    }

    try {
      const res = await fetch('/api/customer/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerUser.customerId,
          customerName: customerCompany?.companyName || customerUser.customerName,
          name,
          email,
          role,
          invitedBy: customerUser.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to invite user.' };
      }

      // Record in customerUsers collection
      const newCustUserDocId = `CUSTU-${Date.now()}`;
      await setDoc(doc(db, 'customerUsers', newCustUserDocId), {
        id: newCustUserDocId,
        customerUserId: newCustUserDocId,
        customerId: customerUser.customerId,
        organizationId: customerUser.customerId,
        customerName: customerCompany?.companyName || customerUser.customerName,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        status: 'Invited',
        permissions: role === 'Customer Admin' ? DEFAULT_CUSTOMER_ADMIN_PERMISSIONS : DEFAULT_CUSTOMER_USER_PERMISSIONS,
        invitedAt: new Date().toISOString(),
        invitedBy: customerUser.name,
        invitationToken: data.token,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invitation failed' };
    }
  };

  const deactivateOrganizationUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!customerUser || customerUser.role !== 'Customer Admin') {
      return { success: false, error: 'Unauthorized' };
    }
    try {
      await updateDoc(doc(db, 'customerUsers', userId), {
        status: 'Disabled',
        updatedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Deactivation failed' };
    }
  };

  // 14. Customer Profile update
  const updateCustomerUserProfile = async (data: {
    name?: string;
    phone?: string;
    avatarUrl?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!customerUser) return { success: false, error: 'Unauthorized' };
    try {
      const userRef = doc(db, 'customerUsers', customerUser.id);
      await updateDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      setCustomerUser((prev) => (prev ? { ...prev, ...data } : null));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Profile update failed' };
    }
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;
  const openTicketCount = tickets.filter((t) => t.status !== 'Closed' && t.status !== 'Resolved').length;

  return (
    <CustomerPortalContext.Provider
      value={{
        firebaseUser,
        customerUser,
        customerCompany,
        loading,
        authError,
        activeTab,
        setActiveTab,
        proposals,
        invoices,
        receipts,
        onlinePayments,
        tickets,
        documents,
        notifications,
        profileChangeRequests,
        customerUsers,
        unreadNotificationCount,
        openTicketCount,
        logout,
        trackProposalView,
        acceptProposal,
        rejectProposal,
        requestProposalChanges,
        submitProfileChangeRequest,
        createSupportTicket,
        replySupportTicket,
        closeSupportTicket,
        uploadDocument,
        markNotificationRead,
        markAllNotificationsRead,
        inviteOrganizationUser,
        deactivateOrganizationUser,
        updateCustomerUserProfile,
        logCustomerAudit,
      }}
    >
      {children}
    </CustomerPortalContext.Provider>
  );
};

export const useCustomerPortal = () => {
  const context = useContext(CustomerPortalContext);
  if (!context) {
    throw new Error('useCustomerPortal must be used within a CustomerPortalProvider');
  }
  return context;
};
