import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { useCrmData } from './CrmDataContext';
import {
  CommunicationRecord,
  FollowupReminder,
  ScheduledCommunication,
  EmailTemplateItem,
  WhatsAppTemplateItem,
  AutomationConfigs,
  AutomationLogRecord,
  CustomerConsentRecord,
  CommunicationSettingsRecord,
  CommunicationCategory,
  CommunicationType,
  FollowupReminderPriority,
  FollowupReminderStatus,
  CommunicationAttachment,
} from '../types/crm';

// Default corporate email templates
const INITIAL_EMAIL_TEMPLATES: Omit<EmailTemplateItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    templateId: 'TMPL-PROP-FOLLOWUP',
    name: 'Proposal Commercial Follow-up',
    category: 'Proposal',
    subject: 'Follow-up regarding Commercial Proposal {{proposalNumber}} — SparkGenTechnology',
    body: `Dear {{contactPerson}},\n\nI hope this email finds you well.\n\nI am writing to follow up on the commercial proposal ({{proposalNumber}}) that we shared with {{customerName}} recently.\n\nWe would be pleased to schedule a brief discussion or technical demonstration to answer any questions your team may have regarding the scope, technical specifications, or commercial milestones.\n\nYou can review your proposal details at any time using your client portal or via this secure link:\n{{proposalLink}}\n\nLooking forward to hearing from you.\n\nWarm regards,\n{{employeeName}}\nSparkGenTechnology`,
    status: 'Active',
    variables: ['customerName', 'contactPerson', 'proposalNumber', 'proposalLink', 'employeeName'],
    createdBy: 'system',
    createdByName: 'SparkGenTechnology System',
  },
  {
    templateId: 'TMPL-INV-DUE-SOON',
    name: 'Invoice Due Soon Reminder',
    category: 'Invoice',
    subject: 'Friendly Reminder: Invoice {{invoiceNumber}} Due on {{dueDate}} — SparkGenTechnology',
    body: `Dear {{contactPerson}},\n\nThis is a courteous reminder that Invoice {{invoiceNumber}} for {{customerName}} in the amount of {{invoiceAmount}} is scheduled for settlement on {{dueDate}}.\n\nOutstanding Balance: {{outstandingAmount}}\n\nFor your convenience, you can complete payment securely online via UPI, Credit/Debit Cards, or Net Banking using this instant payment link:\n{{paymentLink}}\n\nIf payment has already been initiated, please feel free to disregard this note or share the payment reference with us.\n\nBest regards,\nFinance & Accounts Department\nSparkGenTechnology`,
    status: 'Active',
    variables: ['customerName', 'contactPerson', 'invoiceNumber', 'dueDate', 'invoiceAmount', 'outstandingAmount', 'paymentLink'],
    createdBy: 'system',
    createdByName: 'SparkGenTechnology System',
  },
  {
    templateId: 'TMPL-PAYMENT-RECEIPT',
    name: 'Payment Confirmation & Verified Receipt',
    category: 'Receipt',
    subject: 'Payment Received — Official Receipt for Invoice {{invoiceNumber}} — SparkGenTechnology',
    body: `Dear {{contactPerson}},\n\nThank you for your business. We have successfully received your payment of {{invoiceAmount}} for Invoice {{invoiceNumber}}.\n\nYour official GST Payment Receipt has been generated and is attached to this email. You can also view and download all past receipts from your SparkGenTechnology Customer Portal:\n{{invoiceLink}}\n\nWe appreciate the opportunity to serve {{customerName}}.\n\nSincerely,\nFinance & Accounts Team\nSparkGenTechnology`,
    status: 'Active',
    variables: ['customerName', 'contactPerson', 'invoiceNumber', 'invoiceAmount', 'invoiceLink'],
    createdBy: 'system',
    createdByName: 'SparkGenTechnology System',
  },
  {
    templateId: 'TMPL-WELCOME-CLIENT',
    name: 'Customer Portal Onboarding & Welcome',
    category: 'Welcome',
    subject: 'Welcome to SparkGenTechnology — Access Your Enterprise Client Portal',
    body: `Dear {{contactPerson}},\n\nWelcome to SparkGenTechnology! We are thrilled to partner with {{customerName}}.\n\nTo ensure complete transparency and seamless collaboration, we have prepared a dedicated Customer Experience Portal for your organization.\n\nThrough your portal, you can:\n- Review commercial proposals and technical specs\n- Settle invoices instantly with online payment gateways\n- Access verified tax invoices and GST receipts\n- Share requirement documents and engineering files\n- Raise and monitor priority support tickets directly with our tech team\n\nAccess your portal at:\n{{paymentLink}}\n\nOur team is at your service.\n\nWarm regards,\nSparkGenTechnology Team`,
    status: 'Active',
    variables: ['customerName', 'contactPerson', 'paymentLink', 'employeeName'],
    createdBy: 'system',
    createdByName: 'SparkGenTechnology System',
  },
  {
    templateId: 'TMPL-SUPPORT-ACK',
    name: 'Support Ticket Acknowledgment',
    category: 'Support',
    subject: 'Support Ticket #{{supportTicketNumber}} Received — SparkGenTechnology Helpdesk',
    body: `Dear {{contactPerson}},\n\nYour support ticket #{{supportTicketNumber}} has been logged into our support queue.\n\nOur technical support team is currently reviewing your request and will provide an initial response shortly. You can track updates or reply directly via your Customer Portal.\n\nThank you for reaching out to us.\n\nSincerely,\nCustomer Support Team\nSparkGenTechnology`,
    status: 'Active',
    variables: ['customerName', 'contactPerson', 'supportTicketNumber'],
    createdBy: 'system',
    createdByName: 'SparkGenTechnology System',
  },
  {
    templateId: 'TMPL-SUPPORT-RESOLVED',
    name: 'Support Ticket Resolution Notice',
    category: 'Support',
    subject: 'Support Ticket #{{supportTicketNumber}} Has Been Resolved — SparkGenTechnology',
    body: `Dear {{contactPerson}},\n\nWe are pleased to inform you that Support Ticket #{{supportTicketNumber}} has been marked as Resolved by our engineering team.\n\nPlease verify that the solution meets your expectations. If you require further assistance on this matter, you may reopen the ticket through your customer portal at any time.\n\nThank you for choosing SparkGenTechnology.\n\nWarm regards,\nCustomer Support Team\nSparkGenTechnology`,
    status: 'Active',
    variables: ['customerName', 'contactPerson', 'supportTicketNumber'],
    createdBy: 'system',
    createdByName: 'SparkGenTechnology System',
  },
];

// Initial WhatsApp templates
const INITIAL_WHATSAPP_TEMPLATES: Omit<WhatsAppTemplateItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    templateId: 'WA-PROP-FOLLOWUP',
    name: 'proposal_followup_notice',
    language: 'en',
    category: 'COMMERCIAL',
    body: 'Hi {{1}}, we shared proposal {{2}} with {{3}}. Let us know if you would like to discuss terms or require a demonstration.',
    status: 'APPROVED',
  },
  {
    templateId: 'WA-INV-REMINDER',
    name: 'invoice_payment_reminder',
    language: 'en',
    category: 'FINANCE',
    body: 'Hello {{1}}, friendly reminder that invoice {{2}} for {{3}} of {{4}} is due on {{5}}. You can settle easily via: {{6}}',
    status: 'APPROVED',
  },
  {
    templateId: 'WA-PAYMENT-CONFIRM',
    name: 'payment_received_receipt',
    language: 'en',
    category: 'FINANCE',
    body: 'Thank you {{1}}! We received payment of {{2}} for invoice {{3}}. Your receipt has been sent to your email.',
    status: 'APPROVED',
  },
];

const DEFAULT_AUTOMATION_CONFIGS: AutomationConfigs = {
  proposalFollowup: {
    enabled: true,
    waitDays: 3,
    sendEmail: true,
    sendWhatsApp: false,
    createReminder: true,
    reminderPriority: 'Medium',
    templateId: 'TMPL-PROP-FOLLOWUP',
  },
  invoiceReminder: {
    enabled: true,
    daysBeforeDue: 2,
    onDueDate: true,
    daysAfterDue: 3,
    sendEmail: true,
    sendWhatsApp: false,
    createReminder: true,
    templateId: 'TMPL-INV-DUE-SOON',
  },
  paymentReceiptEmail: {
    enabled: true,
    templateId: 'TMPL-PAYMENT-RECEIPT',
  },
  supportNotifications: {
    enabled: true,
    notifyOnCreate: true,
    notifyOnReply: true,
    notifyOnResolve: true,
  },
  customerWelcome: {
    enabled: true,
    templateId: 'TMPL-WELCOME-CLIENT',
  },
};

interface SendEmailParams {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  html?: string;
  category?: CommunicationCategory;
  type?: CommunicationType;
  customerId?: string;
  customerName?: string;
  leadId?: string;
  proposalId?: string;
  proposalNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  ticketId?: string;
  ticketNumber?: string;
  variables?: Record<string, any>;
  attachments?: CommunicationAttachment[];
  pdfBase64?: string;
  attachmentName?: string;
  createFollowupReminder?: boolean;
  reminderDueDays?: number;
  reminderTitle?: string;
}

interface ScheduleMessageParams {
  type: 'EMAIL' | 'WHATSAPP';
  recipient: string;
  customerId?: string;
  customerName?: string;
  templateId?: string;
  templateName?: string;
  subject?: string;
  body: string;
  category?: CommunicationCategory;
  communicationType?: CommunicationType;
  scheduledAt: string;
  relatedRecordType?: 'Customer' | 'Lead' | 'Proposal' | 'Invoice' | 'Ticket';
  relatedRecordId?: string;
  relatedRecordNumber?: string;
  attachments?: CommunicationAttachment[];
}

interface CommunicationContextType {
  communicationRecords: CommunicationRecord[];
  followupReminders: FollowupReminder[];
  scheduledCommunications: ScheduledCommunication[];
  emailTemplates: EmailTemplateItem[];
  whatsappTemplates: WhatsAppTemplateItem[];
  automationConfigs: AutomationConfigs;
  automationLogs: AutomationLogRecord[];
  customerConsents: Record<string, CustomerConsentRecord>;
  communicationSettings: CommunicationSettingsRecord;
  loading: boolean;

  // Actions
  sendEmail: (params: SendEmailParams) => Promise<{ success: boolean; error?: string; record?: CommunicationRecord }>;
  logWhatsAppClickToChat: (params: {
    customerId?: string;
    customerName?: string;
    customerPhone: string;
    message: string;
    category?: CommunicationCategory;
    relatedRecordId?: string;
    relatedRecordType?: string;
  }) => Promise<void>;
  scheduleMessage: (params: ScheduleMessageParams) => Promise<{ success: boolean; error?: string }>;
  processScheduledNow: () => Promise<{ success: boolean; processedCount?: number; error?: string }>;
  createFollowupReminder: (params: {
    customerId?: string;
    customerName?: string;
    leadId?: string;
    stsId?: string;
    proposalId?: string;
    proposalNumber?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    ticketId?: string;
    ticketNumber?: string;
    assignedEmployeeId?: string;
    assignedEmployeeName?: string;
    title: string;
    message: string;
    dueAt: string;
    priority?: FollowupReminderPriority;
  }) => Promise<string>;
  updateReminderStatus: (reminderId: string, status: FollowupReminderStatus) => Promise<void>;
  saveEmailTemplate: (template: Partial<EmailTemplateItem>) => Promise<void>;
  deleteEmailTemplate: (templateId: string) => Promise<void>;
  saveWhatsAppTemplate: (template: Partial<WhatsAppTemplateItem>) => Promise<void>;
  deleteWhatsAppTemplate: (templateId: string) => Promise<void>;
  saveAutomationConfigs: (configs: Partial<AutomationConfigs>) => Promise<void>;
  updateCustomerConsent: (
    customerId: string,
    customerName: string,
    channel: 'EMAIL' | 'WHATSAPP',
    purpose: 'Transactional' | 'Marketing',
    status: 'Opted In' | 'Opted Out',
    notes?: string
  ) => Promise<void>;
  retryCommunicationRecord: (record: CommunicationRecord) => Promise<{ success: boolean; error?: string }>;
  runAutomationChecks: () => Promise<{ success: boolean; count?: number }>;
}

const CommunicationContext = createContext<CommunicationContextType | undefined>(undefined);

export const CommunicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isAdmin } = useAuth();
  const { proposals, invoices } = useCrmData();

  const [communicationRecords, setCommunicationRecords] = useState<CommunicationRecord[]>([]);
  const [followupReminders, setFollowupReminders] = useState<FollowupReminder[]>([]);
  const [scheduledCommunications, setScheduledCommunications] = useState<ScheduledCommunication[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplateItem[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplateItem[]>([]);
  const [automationConfigs, setAutomationConfigs] = useState<AutomationConfigs>(DEFAULT_AUTOMATION_CONFIGS);
  const [automationLogs, setAutomationLogs] = useState<AutomationLogRecord[]>([]);
  const [customerConsents, setCustomerConsents] = useState<Record<string, CustomerConsentRecord>>({});
  const [communicationSettings, setCommunicationSettings] = useState<CommunicationSettingsRecord>({
    defaultSenderName: 'SparkGenTechnology',
    defaultSenderEmail: 'sales@sparkgentechnology.com',
    replyTo: 'support@sparkgentechnology.com',
    whatsappConfigured: false,
    dailySendLimit: 500,
    rateLimitMinutes: 60,
    marketingOptOutFooter: true,
  });
  const [loading, setLoading] = useState(true);

  // 1. Subscribe to communicationRecords
  useEffect(() => {
    const qComm = query(collection(db, 'communicationRecords'), orderBy('createdAt', 'desc'), limit(500));
    const unsub = onSnapshot(
      qComm,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommunicationRecord));
        setCommunicationRecords(list);
      },
      (err) => console.warn('Communication records listener notice:', err)
    );
    return () => unsub();
  }, []);

  // 2. Subscribe to followupReminders
  useEffect(() => {
    const qReminders = query(collection(db, 'followupReminders'), orderBy('dueAt', 'asc'), limit(300));
    const unsub = onSnapshot(
      qReminders,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FollowupReminder));
        setFollowupReminders(list);
      },
      (err) => console.warn('Followup reminders listener notice:', err)
    );
    return () => unsub();
  }, []);

  // 3. Subscribe to scheduledCommunications
  useEffect(() => {
    const qSched = query(collection(db, 'scheduledCommunications'), orderBy('scheduledAt', 'asc'), limit(200));
    const unsub = onSnapshot(
      qSched,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScheduledCommunication));
        setScheduledCommunications(list);
      },
      (err) => console.warn('Scheduled communications listener notice:', err)
    );
    return () => unsub();
  }, []);

  // 4. Subscribe to emailTemplates & seed if empty
  useEffect(() => {
    const qTmpl = collection(db, 'emailTemplates');
    const unsub = onSnapshot(
      qTmpl,
      async (snap) => {
        if (snap.empty && isAdmin) {
          // Pre-seed default corporate email templates
          for (const initT of INITIAL_EMAIL_TEMPLATES) {
            const docRef = doc(db, 'emailTemplates', initT.templateId);
            await setDoc(docRef, {
              ...initT,
              id: initT.templateId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }
        } else {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmailTemplateItem));
          setEmailTemplates(list);
        }
      },
      (err) => console.warn('Email templates listener notice:', err)
    );
    return () => unsub();
  }, [isAdmin]);

  // 5. Subscribe to whatsappTemplates & seed if empty
  useEffect(() => {
    const qWaTmpl = collection(db, 'whatsappTemplates');
    const unsub = onSnapshot(
      qWaTmpl,
      async (snap) => {
        if (snap.empty && isAdmin) {
          for (const initW of INITIAL_WHATSAPP_TEMPLATES) {
            const docRef = doc(db, 'whatsappTemplates', initW.templateId);
            await setDoc(docRef, {
              ...initW,
              id: initW.templateId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }
        } else {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WhatsAppTemplateItem));
          setWhatsappTemplates(list);
        }
      },
      (err) => console.warn('WhatsApp templates listener notice:', err)
    );
    return () => unsub();
  }, [isAdmin]);

  // 6. Subscribe to automationConfigs
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'automationConfigs', 'global_settings'),
      (snap) => {
        if (snap.exists()) {
          setAutomationConfigs(snap.data() as AutomationConfigs);
        }
      },
      (err) => console.warn('Automation configs listener notice:', err)
    );
    return () => unsub();
  }, []);

  // 7. Subscribe to automationLogs
  useEffect(() => {
    const qLogs = query(collection(db, 'automationLogs'), orderBy('executedAt', 'desc'), limit(200));
    const unsub = onSnapshot(
      qLogs,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AutomationLogRecord));
        setAutomationLogs(list);
      },
      (err) => console.warn('Automation logs listener notice:', err)
    );
    return () => unsub();
  }, []);

  // 8. Subscribe to customerConsents
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'customerConsents'),
      (snap) => {
        const map: Record<string, CustomerConsentRecord> = {};
        snap.docs.forEach((d) => {
          const c = { id: d.id, ...d.data() } as CustomerConsentRecord;
          map[`${c.customerId}_${c.channel}_${c.purpose}`] = c;
          map[c.customerId] = c;
        });
        setCustomerConsents(map);
        setLoading(false);
      },
      (err) => {
        console.warn('Customer consents listener notice:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Action: Send unified email via server API
  const sendEmail = async (params: SendEmailParams) => {
    try {
      const idempotencyKey = `${params.customerId || 'anon'}_${params.category || 'gen'}_${params.proposalId || params.invoiceId || 'none'}_${Date.now()}`;

      const res = await fetch('/api/communication/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          senderId: userProfile?.uid || 'system',
          senderName: userProfile?.name || 'SparkGenTechnology Staff',
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Record failed communication in Firestore for audit history
        const failedId = `COMM-FAIL-${Date.now()}`;
        const failedRecord: CommunicationRecord = {
          id: failedId,
          channel: 'EMAIL',
          type: params.type || 'TRANSACTIONAL',
          category: params.category || 'General',
          direction: 'OUTBOUND',
          customerId: params.customerId,
          customerName: params.customerName,
          leadId: params.leadId,
          proposalId: params.proposalId,
          proposalNumber: params.proposalNumber,
          invoiceId: params.invoiceId,
          invoiceNumber: params.invoiceNumber,
          ticketId: params.ticketId,
          ticketNumber: params.ticketNumber,
          subject: params.subject,
          body: params.body,
          recipient: params.to,
          cc: params.cc,
          bcc: params.bcc,
          status: 'Failed',
          errorCategory: data.errorCategory || 'DELIVERY_ERROR',
          errorMessage: data.error || 'Email dispatch failed',
          senderId: userProfile?.uid || 'system',
          senderName: userProfile?.name || 'Staff',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'communicationRecords', failedId), failedRecord).catch(() => {});
        return { success: false, error: data.error || 'Failed to dispatch email' };
      }

      // Record successful sent communication in Firestore
      if (data.record) {
        await setDoc(doc(db, 'communicationRecords', data.record.id), data.record).catch(() => {});
      }

      // Optionally create automatic follow-up reminder
      if (params.createFollowupReminder) {
        const days = params.reminderDueDays || 3;
        const dueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        await createFollowupReminder({
          customerId: params.customerId,
          customerName: params.customerName,
          leadId: params.leadId,
          proposalId: params.proposalId,
          proposalNumber: params.proposalNumber,
          invoiceId: params.invoiceId,
          invoiceNumber: params.invoiceNumber,
          ticketId: params.ticketId,
          ticketNumber: params.ticketNumber,
          assignedEmployeeId: userProfile?.uid || 'admin',
          assignedEmployeeName: userProfile?.name || 'Assigned Staff',
          title: params.reminderTitle || `Follow-up on ${params.subject}`,
          message: `Scheduled follow-up reminder after sending email: "${params.subject}" to ${params.to}`,
          dueAt,
          priority: 'Medium',
        });
      }

      return { success: true, record: data.record };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error occurred while sending email' };
    }
  };

  // Action: Log WhatsApp Click-to-Chat event
  const logWhatsAppClickToChat = async (params: {
    customerId?: string;
    customerName?: string;
    customerPhone: string;
    message: string;
    category?: CommunicationCategory;
    relatedRecordId?: string;
    relatedRecordType?: string;
  }) => {
    try {
      const res = await fetch('/api/communication/whatsapp-opened', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          senderId: userProfile?.uid,
          senderName: userProfile?.name,
        }),
      });
      const data = await res.json();
      if (data.success && data.record) {
        await setDoc(doc(db, 'communicationRecords', data.record.id), data.record).catch(() => {});
      }
    } catch (e) {
      console.warn('Error recording WhatsApp click-to-chat:', e);
    }
  };

  // Action: Schedule communication
  const scheduleMessage = async (params: ScheduleMessageParams) => {
    try {
      const res = await fetch('/api/communication/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          createdBy: userProfile?.uid,
          createdByName: userProfile?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to schedule message' };
      }
      if (data.scheduledMessage) {
        await setDoc(doc(db, 'scheduledCommunications', data.scheduledMessage.id), data.scheduledMessage).catch(() => {});
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // Action: Trigger server processing of due scheduled messages
  const processScheduledNow = async () => {
    try {
      const res = await fetch('/api/communication/process-scheduled', { method: 'POST' });
      const data = await res.json();
      return { success: data.success, processedCount: data.processedCount };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // Action: Create Follow-up Reminder
  const createFollowupReminder = async (params: {
    customerId?: string;
    customerName?: string;
    leadId?: string;
    stsId?: string;
    proposalId?: string;
    proposalNumber?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    ticketId?: string;
    ticketNumber?: string;
    assignedEmployeeId?: string;
    assignedEmployeeName?: string;
    title: string;
    message: string;
    dueAt: string;
    priority?: FollowupReminderPriority;
  }): Promise<string> => {
    const reminderId = `REM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newReminder: FollowupReminder = {
      id: reminderId,
      reminderId,
      customerId: params.customerId,
      customerName: params.customerName,
      leadId: params.leadId,
      stsId: params.stsId,
      proposalId: params.proposalId,
      proposalNumber: params.proposalNumber,
      invoiceId: params.invoiceId,
      invoiceNumber: params.invoiceNumber,
      ticketId: params.ticketId,
      ticketNumber: params.ticketNumber,
      assignedEmployeeId: params.assignedEmployeeId || userProfile?.uid || 'admin',
      assignedEmployeeName: params.assignedEmployeeName || userProfile?.name || 'Staff Member',
      title: params.title.trim(),
      message: params.message.trim(),
      dueAt: params.dueAt,
      priority: params.priority || 'Medium',
      status: 'Pending',
      createdBy: userProfile?.uid || 'admin',
      createdByName: userProfile?.name || 'Admin',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'followupReminders', reminderId), newReminder);
    return reminderId;
  };

  // Action: Update Reminder Status
  const updateReminderStatus = async (reminderId: string, status: FollowupReminderStatus) => {
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (status === 'Completed') {
      updateData.completedAt = new Date().toISOString();
      updateData.completedBy = userProfile?.name || 'Staff';
    }
    await updateDoc(doc(db, 'followupReminders', reminderId), updateData);
  };

  // Action: Save Email Template
  const saveEmailTemplate = async (template: Partial<EmailTemplateItem>) => {
    const id = template.id || template.templateId || `TMPL-${Date.now()}`;
    const payload: EmailTemplateItem = {
      id,
      templateId: template.templateId || id,
      name: template.name || 'Custom Email Template',
      subject: template.subject || '',
      body: template.body || '',
      category: template.category || 'General',
      status: template.status || 'Active',
      variables: template.variables || [],
      createdBy: template.createdBy || userProfile?.uid || 'admin',
      createdByName: template.createdByName || userProfile?.name || 'Admin',
      createdAt: template.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'emailTemplates', id), payload);
  };

  // Action: Delete Email Template
  const deleteEmailTemplate = async (templateId: string) => {
    await deleteDoc(doc(db, 'emailTemplates', templateId));
  };

  // Action: Save WhatsApp Template
  const saveWhatsAppTemplate = async (template: Partial<WhatsAppTemplateItem>) => {
    const id = template.id || template.templateId || `WA-TMPL-${Date.now()}`;
    const payload: WhatsAppTemplateItem = {
      id,
      templateId: template.templateId || id,
      name: template.name || 'whatsapp_template',
      language: template.language || 'en',
      category: template.category || 'UTILITY',
      body: template.body || '',
      status: template.status || 'APPROVED',
      providerTemplateId: template.providerTemplateId || undefined,
      createdAt: template.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'whatsappTemplates', id), payload);
  };

  // Action: Delete WhatsApp Template
  const deleteWhatsAppTemplate = async (templateId: string) => {
    await deleteDoc(doc(db, 'whatsappTemplates', templateId));
  };

  // Action: Save Automation Configs
  const saveAutomationConfigs = async (configs: Partial<AutomationConfigs>) => {
    const merged = {
      ...automationConfigs,
      ...configs,
      updatedAt: new Date().toISOString(),
      updatedBy: userProfile?.name || 'Admin',
    };
    setAutomationConfigs(merged as AutomationConfigs);
    await setDoc(doc(db, 'automationConfigs', 'global_settings'), merged);
  };

  // Action: Update Customer Consent
  const updateCustomerConsent = async (
    customerId: string,
    customerName: string,
    channel: 'EMAIL' | 'WHATSAPP',
    purpose: 'Transactional' | 'Marketing',
    status: 'Opted In' | 'Opted Out',
    notes?: string
  ) => {
    const consentId = `CONSENT-${customerId}-${channel}-${purpose}`;
    const record: CustomerConsentRecord = {
      id: consentId,
      customerId,
      customerName,
      channel,
      purpose,
      status,
      source: 'CRM Admin',
      timestamp: new Date().toISOString(),
      updatedBy: userProfile?.name || 'Admin',
      notes,
    };
    await setDoc(doc(db, 'customerConsents', consentId), record);

    // Sync with server store
    await fetch('/api/communication/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        emailMarketing: purpose === 'Marketing' && channel === 'EMAIL' ? status === 'Opted In' : undefined,
        whatsappMarketing: purpose === 'Marketing' && channel === 'WHATSAPP' ? status === 'Opted In' : undefined,
      }),
    }).catch(() => {});
  };

  // Action: Retry failed communication
  const retryCommunicationRecord = async (record: CommunicationRecord) => {
    try {
      const res = await fetch('/api/communication/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communicationId: record.id,
          recipient: record.recipient,
          subject: record.subject,
          body: record.body,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Retry attempt failed.' };
      }

      await updateDoc(doc(db, 'communicationRecords', record.id), {
        status: 'Sent',
        providerMessageId: data.providerMessageId,
        sentAt: data.retriedAt || new Date().toISOString(),
        retryCount: (record.retryCount || 0) + 1,
        errorMessage: null,
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // Action: Run automated checks for proposals and invoices
  const runAutomationChecks = async () => {
    const itemsToCheck: any[] = [];
    const now = Date.now();

    // 1. Proposal follow-up checks (Section 21)
    if (automationConfigs.proposalFollowup.enabled) {
      const waitMs = (automationConfigs.proposalFollowup.waitDays || 3) * 24 * 60 * 60 * 1000;
      for (const prop of proposals) {
        if (prop.status === 'Sent' || prop.status === 'Draft') {
          const sentTime = new Date(prop.sentAt || prop.createdAt).getTime();
          if (now - sentTime >= waitMs) {
            itemsToCheck.push({
              trigger: 'PROPOSAL_FOLLOWUP_DUE',
              customerId: prop.customerId,
              customerName: prop.customerName || prop.companyName || prop.customerSnapshot?.companyName || 'Valued Client',
              relatedId: prop.id,
              type: 'Proposal',
              action: 'PROPOSAL_FOLLOWUP_REMINDER_CREATED',
              idempotencyKey: `PROP_REM_${prop.id}_${Math.floor(now / (24 * 60 * 60 * 1000))}`,
              metadata: { proposalNumber: prop.proposalNumber },
            });
          }
        }
      }
    }

    // 2. Invoice reminder checks (Section 22)
    if (automationConfigs.invoiceReminder.enabled) {
      for (const inv of invoices) {
        if (inv.status === 'Issued' || inv.status === 'Sent' || inv.status === 'Partially Paid' || inv.status === 'Overdue') {
          const dueTime = new Date(inv.dueDate).getTime();
          const daysDiff = Math.round((dueTime - now) / (24 * 60 * 60 * 1000));

          if (daysDiff <= automationConfigs.invoiceReminder.daysBeforeDue && daysDiff >= 0) {
            itemsToCheck.push({
              trigger: 'INVOICE_DUE_SOON',
              customerId: inv.customerId,
              customerName: inv.customerName || inv.customerSnapshot?.companyName || 'Valued Client',
              relatedId: inv.id,
              type: 'Invoice',
              action: 'INVOICE_DUE_REMINDER_TRIGGERED',
              idempotencyKey: `INV_DUE_${inv.id}_${inv.dueDate}`,
              metadata: { invoiceNumber: inv.invoiceNumber, amount: inv.grandTotal },
            });
          }
        }
      }
    }

    if (itemsToCheck.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const res = await fetch('/api/communication/automation/run-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsToCheck }),
      });
      const data = await res.json();

      // If any actions were generated, log into Firestore automationLogs
      if (data.actions && Array.isArray(data.actions)) {
        for (const act of data.actions) {
          if (act.status === 'SUCCESS' && act.id) {
            await setDoc(doc(db, 'automationLogs', act.id), act).catch(() => {});
          }
        }
      }

      return { success: true, count: data.processedCount || 0 };
    } catch (e: any) {
      return { success: false };
    }
  };

  const value = useMemo(
    () => ({
      communicationRecords,
      followupReminders,
      scheduledCommunications,
      emailTemplates,
      whatsappTemplates,
      automationConfigs,
      automationLogs,
      customerConsents,
      communicationSettings,
      loading,
      sendEmail,
      logWhatsAppClickToChat,
      scheduleMessage,
      processScheduledNow,
      createFollowupReminder,
      updateReminderStatus,
      saveEmailTemplate,
      deleteEmailTemplate,
      saveWhatsAppTemplate,
      deleteWhatsAppTemplate,
      saveAutomationConfigs,
      updateCustomerConsent,
      retryCommunicationRecord,
      runAutomationChecks,
    }),
    [
      communicationRecords,
      followupReminders,
      scheduledCommunications,
      emailTemplates,
      whatsappTemplates,
      automationConfigs,
      automationLogs,
      customerConsents,
      communicationSettings,
      loading,
    ]
  );

  return <CommunicationContext.Provider value={value}>{children}</CommunicationContext.Provider>;
};

export const useCommunication = (): CommunicationContextType => {
  const context = useContext(CommunicationContext);
  if (!context) {
    throw new Error('useCommunication must be used within a CommunicationProvider');
  }
  return context;
};
