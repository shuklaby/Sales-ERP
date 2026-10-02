import React, { useState, useMemo, useEffect } from 'react';
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
  TrendingUp,
  BarChart3,
  Settings,
  Layers,
  Check,
  Plus,
  Trash2,
  Copy,
  Edit,
  Play,
  Download,
  Phone,
  Building,
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  Sliders,
  X,
} from 'lucide-react';
import { useCommunication } from '../../context/CommunicationContext';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  CommunicationHubTab,
  CommunicationRecord,
  CommunicationChannel,
  CommunicationCategory,
  CommunicationType,
  FollowupReminderPriority,
  FollowupReminderStatus,
  EmailTemplateItem,
  WhatsAppTemplateItem,
} from '../../types/crm';
import { EmailComposerModal } from '../communication/EmailComposerModal';
import { WhatsAppChatModal } from '../communication/WhatsAppChatModal';
import { CreateReminderModal } from '../communication/CreateReminderModal';

interface CommunicationHubViewProps {
  initialTab?: CommunicationHubTab;
}

export const CommunicationHubView: React.FC<CommunicationHubViewProps> = ({ initialTab = 'overview' }) => {
  const {
    communicationRecords,
    followupReminders,
    scheduledCommunications,
    emailTemplates,
    whatsappTemplates,
    automationConfigs,
    automationLogs,
    customerConsents,
    communicationSettings,
    saveEmailTemplate,
    deleteEmailTemplate,
    saveWhatsAppTemplate,
    deleteWhatsAppTemplate,
    saveAutomationConfigs,
    updateReminderStatus,
    retryCommunicationRecord,
    processScheduledNow,
    runAutomationChecks,
  } = useCommunication();

  const { customers, leads, proposals, invoices, employees } = useCrmData();
  const { isAdmin, userProfile } = useAuth();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<CommunicationHubTab>(() => {
    const path = window.location.pathname;
    if (path.includes('/communication/email')) return 'email';
    if (path.includes('/communication/whatsapp')) return 'whatsapp';
    if (path.includes('/communication/templates')) return 'templates';
    if (path.includes('/communication/scheduled')) return 'scheduled';
    if (path.includes('/communication/reminders')) return 'reminders';
    if (path.includes('/communication/automation')) return 'automation';
    if (path.includes('/settings/communication') || path.includes('/settings/automation')) {
      return path.includes('automation') ? 'automation' : 'settings';
    }
    return initialTab;
  });

  // Date Range Filter (Section 2: Today, 7 Days, 30 Days, Custom)
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<CommunicationRecord | null>(null);

  // Template Editor State
  const [isEditingTemplate, setIsEditingTemplate] = useState<EmailTemplateItem | null>(null);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<Partial<EmailTemplateItem>>({
    name: '',
    category: 'General',
    subject: '',
    body: '',
    status: 'Active',
  });

  // WhatsApp Template Modal State
  const [isNewWaTemplateOpen, setIsNewWaTemplateOpen] = useState(false);
  const [waTemplateForm, setWaTemplateForm] = useState<Partial<WhatsAppTemplateItem>>({
    name: '',
    language: 'en',
    category: 'MARKETING',
    body: '',
  });

  // Search & Filters for History
  const [historySearch, setHistorySearch] = useState('');
  const [historyChannel, setHistoryChannel] = useState<'all' | CommunicationChannel>('all');
  const [historyStatus, setHistoryStatus] = useState<string>('all');
  const [historyCategory, setHistoryCategory] = useState<string>('all');

  // Automation runner state
  const [isCheckingAutomation, setIsCheckingAutomation] = useState(false);
  const [automationNotice, setAutomationNotice] = useState<string | null>(null);

  // Scheduled processing state
  const [isProcessingScheduled, setIsProcessingScheduled] = useState(false);
  const [scheduledProcessResult, setScheduledProcessResult] = useState<string | null>(null);

  // Auto-open modal if navigating to direct compose or create route
  useEffect(() => {
    if (window.location.pathname.includes('/communication/email/compose')) {
      setIsEmailModalOpen(true);
    } else if (window.location.pathname.includes('/communication/reminders/new')) {
      setIsReminderModalOpen(true);
    }
  }, []);

  // Filter records by date range
  const filteredByDate = useMemo(() => {
    const now = new Date();
    let startTimestamp = 0;

    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startTimestamp = today.getTime();
    } else if (dateFilter === '7days') {
      startTimestamp = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === '30days') {
      startTimestamp = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    } else if (dateFilter === 'custom' && customStartDate) {
      startTimestamp = new Date(customStartDate).getTime();
    }

    let endTimestamp = Infinity;
    if (dateFilter === 'custom' && customEndDate) {
      endTimestamp = new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000;
    }

    return communicationRecords.filter((r) => {
      const t = new Date(r.createdAt || r.sentAt || 0).getTime();
      return t >= startTimestamp && t <= endTimestamp;
    });
  }, [communicationRecords, dateFilter, customStartDate, customEndDate]);

  // Section 2: Real Metrics calculation
  const metrics = useMemo(() => {
    const emailsSent = filteredByDate.filter((r) => r.channel === 'EMAIL' && r.status === 'Sent').length;
    const emailsFailed = filteredByDate.filter((r) => r.channel === 'EMAIL' && r.status === 'Failed').length;
    const waOpened = filteredByDate.filter((r) => r.channel === 'WHATSAPP' && r.status === 'WHATSAPP_OPENED').length;
    const waApiSent = filteredByDate.filter((r) => r.channel === 'WHATSAPP' && r.status === 'Sent').length;
    const scheduled = scheduledCommunications.filter((s) => s.status === 'Scheduled').length;
    const pendingReminders = followupReminders.filter((rem) => rem.status === 'Pending').length;
    const completedReminders = followupReminders.filter((rem) => rem.status === 'Completed').length;
    const failedComms = filteredByDate.filter((r) => r.status === 'Failed').length;

    return {
      emailsSent,
      emailsFailed,
      waOpened,
      waApiSent,
      scheduled,
      pendingReminders,
      completedReminders,
      failedComms,
    };
  }, [filteredByDate, scheduledCommunications, followupReminders]);

  // Manual Trigger: Process Scheduled Messages
  const handleProcessScheduled = async () => {
    setIsProcessingScheduled(true);
    setScheduledProcessResult(null);
    const res = await processScheduledNow();
    setIsProcessingScheduled(false);
    if (res.success) {
      setScheduledProcessResult(`Processed ${res.processedCount || 0} due messages.`);
    } else {
      setScheduledProcessResult(res.error || 'Failed to process scheduled queue.');
    }
  };

  // Manual Trigger: Run Automation Rules Check
  const handleRunAutomation = async () => {
    setIsCheckingAutomation(true);
    setAutomationNotice(null);
    const res = await runAutomationChecks();
    setIsCheckingAutomation(false);
    if (res.success) {
      setAutomationNotice(`Checked rules: executed ${res.count || 0} actions with duplicate protection.`);
    } else {
      setAutomationNotice('Automation check failed.');
    }
  };

  // Save Email Template
  const handleSaveEmailTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name?.trim() || !templateForm.subject?.trim()) {
      alert('Template Name and Subject are required.');
      return;
    }
    await saveEmailTemplate(templateForm);
    setIsNewTemplateModalOpen(false);
    setIsEditingTemplate(null);
    setTemplateForm({ name: '', category: 'General', subject: '', body: '', status: 'Active' });
  };

  // Export Communication Report (Section 48: Excel / CSV / PDF)
  const handleExportCSV = () => {
    const headers = ['Date', 'Customer', 'Recipient', 'Channel', 'Category', 'Subject', 'Status', 'Sent By'];
    const rows = filteredByDate.map((r) => [
      new Date(r.createdAt).toISOString(),
      `"${(r.customerName || '').replace(/"/g, '""')}"`,
      `"${r.recipient}"`,
      r.channel,
      r.category,
      `"${(r.subject || '').replace(/"/g, '""')}"`,
      r.status,
      `"${(r.senderName || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `communication_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-blue-400 font-semibold">Communication Hub</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-blue-500" />
            Communication Hub & Automation
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Enterprise Email, WhatsApp Business, Follow-up Reminders & Trigger-based Automations
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-900/40"
          >
            <Send className="w-3.5 h-3.5" /> Compose Email
          </button>
          <button
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-900/40"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button
            onClick={() => setIsReminderModalOpen(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-900/40"
          >
            <CalendarClock className="w-3.5 h-3.5" /> New Reminder
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Section 1) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800 text-xs">
        {[
          { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'email', label: 'Email Center', icon: <Mail className="w-4 h-4" /> },
          { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" /> },
          { id: 'templates', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
          { id: 'scheduled', label: 'Scheduled', icon: <Calendar className="w-4 h-4" />, badge: metrics.scheduled },
          { id: 'reminders', label: 'Reminders', icon: <CalendarClock className="w-4 h-4" />, badge: metrics.pendingReminders },
          { id: 'history', label: 'History', icon: <Layers className="w-4 h-4" /> },
          { id: 'automation', label: 'Automation', icon: <Sparkles className="w-4 h-4" /> },
          { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as CommunicationHubTab)}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-blue-900' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 1. OVERVIEW TAB: Real Metrics & Charts (Section 2 & 38)     */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Date Filter Bar (Section 2) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-400" /> Filter Range:
              </span>
              <div className="flex items-center gap-1">
                {(['today', '7days', '30days', 'all'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDateFilter(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition capitalize ${
                      dateFilter === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {mode === 'today' ? 'Today' : mode === '7days' ? '7 Days' : mode === '30days' ? '30 Days' : 'All Time'}
                  </button>
                ))}
                <button
                  onClick={() => setDateFilter('custom')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    dateFilter === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
                />
              </div>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Data
            </button>
          </div>

          {/* Real Metrics Cards Grid (Section 2) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Emails Sent
              </span>
              <div className="text-2xl font-black text-white font-mono">{metrics.emailsSent}</div>
              <span className="text-[10px] text-emerald-400 font-semibold">Real delivered via SMTP/API</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Emails Failed
              </span>
              <div className="text-2xl font-black text-rose-400 font-mono">{metrics.emailsFailed}</div>
              <span className="text-[10px] text-slate-500">Requires retry or fix</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                WhatsApp Opened
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono">{metrics.waOpened}</div>
              <span className="text-[10px] text-slate-500">Verified click-to-chat open</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                WhatsApp API Sent
              </span>
              <div className="text-2xl font-black text-blue-400 font-mono">{metrics.waApiSent}</div>
              <span className="text-[10px] text-slate-500">Official Cloud API calls</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Scheduled Messages
              </span>
              <div className="text-2xl font-black text-purple-400 font-mono">{metrics.scheduled}</div>
              <span className="text-[10px] text-slate-500">In server automated queue</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Pending Reminders
              </span>
              <div className="text-2xl font-black text-amber-400 font-mono">{metrics.pendingReminders}</div>
              <span className="text-[10px] text-slate-500">Awaiting employee action</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Completed Reminders
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono">{metrics.completedReminders}</div>
              <span className="text-[10px] text-slate-500">Resolved follow-up tasks</span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Failed Communications
              </span>
              <div className="text-2xl font-black text-rose-500 font-mono">{metrics.failedComms}</div>
              <span className="text-[10px] text-slate-500">All channels combined</span>
            </div>
          </div>

          {/* Quick Automation Trigger & Scheduled Worker Status Bar */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Automated Communication Runner</h4>
                <p className="text-[11px] text-slate-400">
                  Runs background checks for proposal follow-ups, invoice due notices & support alerts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunAutomation}
                disabled={isCheckingAutomation}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCheckingAutomation ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Run Checks Now
              </button>
              <button
                onClick={handleProcessScheduled}
                disabled={isProcessingScheduled}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isProcessingScheduled ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                Process Due Messages
              </button>
            </div>
          </div>

          {(automationNotice || scheduledProcessResult) && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{automationNotice || scheduledProcessResult}</span>
            </div>
          )}

          {/* Recent Communications Feed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> Recent Activity Stream
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                View Full History →
              </button>
            </div>

            <div className="space-y-2">
              {filteredByDate.slice(0, 5).map((comm) => (
                <div
                  key={comm.id}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        comm.channel === 'EMAIL'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {comm.channel === 'EMAIL' ? <Mail className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <span className="font-bold text-white block">{comm.subject || `${comm.channel} Message`}</span>
                      <span className="text-[11px] text-slate-400">
                        {comm.customerName || comm.recipient} • {comm.category} • {new Date(comm.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      comm.status === 'Sent'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : comm.status === 'WHATSAPP_OPENED'
                        ? 'bg-blue-500/20 text-blue-400'
                        : comm.status === 'Failed'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {comm.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. EMAIL TAB: Composer, Preview & History (Sections 3, 10)  */}
      {/* ========================================================= */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" /> Corporate Email Management
              </h3>
              <p className="text-xs text-slate-400">
                Dispatch verified proposals, invoices, reminders & customer notifications
              </p>
            </div>
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-900/40"
            >
              <Send className="w-3.5 h-3.5" /> Compose New Email
            </button>
          </div>

          {/* Email History Table (Section 10: Date, Customer, Recipient, Subject, Type, Related Record, Status, Sent By) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Dispatched Email Records ({communicationRecords.filter((r) => r.channel === 'EMAIL').length})
              </span>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Download className="w-3 h-3" /> Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Related Record</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Sent By</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {communicationRecords
                    .filter((r) => r.channel === 'EMAIL')
                    .map((email) => (
                      <tr key={email.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {new Date(email.createdAt).toLocaleDateString()} {new Date(email.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {email.customerName || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {email.recipient}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-200">
                          {email.subject}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                            {email.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {email.proposalNumber || email.invoiceNumber || '—'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              email.status === 'Sent'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : email.status === 'Failed'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {email.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {email.senderName || 'Staff'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedRecordDetail(email)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold transition"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. WHATSAPP TAB: Click-to-Chat & Official API (Sections 11-14) */}
      {/* ========================================================= */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp Communication Hub
              </h3>
              <p className="text-xs text-slate-400">
                Instant WhatsApp Click-to-Chat & official Meta Business API architecture
              </p>
            </div>
            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Start WhatsApp Interaction
            </button>
          </div>

          {/* Provider Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ExternalLink className="w-4 h-4" /> WhatsApp Click-to-Chat (Active)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Generates a pre-filled direct WhatsApp message for any lead, customer, proposal follow-up, or payment reminder. Opens WhatsApp Web or native app.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-white">Compliance & Audit Invariant:</div>
                <p>
                  Per Section 12, opening WhatsApp records an explicit <code>WHATSAPP_OPENED</code> event in audit history without faking delivery or read receipts.
                </p>
              </div>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" /> Official WhatsApp Business API
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect official Meta Cloud API to dispatch pre-approved WhatsApp templates with verifiable message delivery & read receipts.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-white">Security & Secret Protection:</div>
                <p>
                  Per Section 40, WhatsApp System Access Tokens and Phone Number IDs are stored strictly server-side in <code>.whatsapp-config.json</code> and never exposed to the browser.
                </p>
              </div>
            </div>
          </div>

          {/* WhatsApp Activity Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                WhatsApp Interaction Logs ({communicationRecords.filter((r) => r.channel === 'WHATSAPP').length})
              </span>
            </div>
            <div className="divide-y divide-slate-800/60">
              {communicationRecords
                .filter((r) => r.channel === 'WHATSAPP')
                .map((wa) => (
                  <div key={wa.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{wa.customerName || wa.recipient}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                          {wa.status}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{wa.recipient}</span>
                      </div>
                      <p className="text-slate-400 font-mono text-[11px] line-clamp-1">{wa.body}</p>
                    </div>
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(wa.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TEMPLATES TAB: Email & WhatsApp (Sections 5, 6, 14)    */}
      {/* ========================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" /> Template Management
              </h3>
              <p className="text-xs text-slate-400">
                Corporate templates with dynamic variable injection for proposals, invoices & reminders
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTemplateForm({ name: '', category: 'General', subject: '', body: '', status: 'Active' });
                  setIsEditingTemplate(null);
                  setIsNewTemplateModalOpen(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> New Email Template
              </button>
              <button
                onClick={() => setIsNewWaTemplateOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> New WhatsApp Template
              </button>
            </div>
          </div>

          {/* Email Templates Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Corporate Email Templates ({emailTemplates.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {emailTemplates.map((t) => (
                <div
                  key={t.id}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{t.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                          {t.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                        Subject: {t.subject}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setTemplateForm(t);
                          setIsEditingTemplate(t);
                          setIsNewTemplateModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteEmailTemplate(t.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 font-mono line-clamp-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 leading-relaxed whitespace-pre-wrap">
                    {t.body}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Variables: {t.variables?.join(', ') || 'customerName, proposalNumber'}</span>
                    <button
                      onClick={() => {
                        setIsEmailModalOpen(true);
                      }}
                      className="text-blue-400 hover:underline font-bold"
                    >
                      Use in Composer →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Approved Templates Grid (Section 14) */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              WhatsApp Templates ({whatsappTemplates.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {whatsappTemplates.map((wt) => (
                <div key={wt.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{wt.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      {wt.status}
                    </span>
                  </div>
                  <p className="text-slate-400 font-mono text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-800">
                    {wt.body}
                  </p>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>Lang: {wt.language}</span>
                    <span>Category: {wt.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SCHEDULED TAB: Automated Queue (Sections 19 & 20)       */}
      {/* ========================================================= */}
      {activeTab === 'scheduled' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" /> Server Scheduled Queue
              </h3>
              <p className="text-xs text-slate-400">
                Server-side scheduled execution independent of employee browser presence (Section 20)
              </p>
            </div>
            <button
              onClick={handleProcessScheduled}
              disabled={isProcessingScheduled}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              {isProcessingScheduled ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Process Due Messages Now</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Scheduled Messages Queue ({scheduledCommunications.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Scheduled For</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Subject / Note</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {scheduledCommunications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No messages currently in scheduled queue.
                      </td>
                    </tr>
                  ) : (
                    scheduledCommunications.map((sched) => (
                      <tr key={sched.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-[11px] text-purple-300">
                          {new Date(sched.scheduledAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{sched.type}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{sched.recipient}</td>
                        <td className="py-3 px-4">{sched.customerName || 'N/A'}</td>
                        <td className="py-3 px-4 max-w-xs truncate">{sched.subject || sched.body}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sched.status === 'Sent'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : sched.status === 'Processing'
                                ? 'bg-amber-500/20 text-amber-400'
                                : sched.status === 'Failed'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {sched.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{sched.createdByName || 'Admin'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. REMINDERS TAB: Follow-up Reminder Engine (Sections 16-18) */}
      {/* ========================================================= */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-400" /> Follow-up Reminder Engine
              </h3>
              <p className="text-xs text-slate-400">
                Track pending follow-ups for proposals, invoices, and sales opportunities
              </p>
            </div>
            <button
              onClick={() => setIsReminderModalOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-900/40"
            >
              <Plus className="w-3.5 h-3.5" /> Create Reminder
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {followupReminders.map((rem) => {
              const isOverdue = rem.status === 'Pending' && new Date(rem.dueAt).getTime() < Date.now();
              const isDone = rem.status === 'Completed';

              return (
                <div
                  key={rem.id}
                  className={`p-5 rounded-2xl border transition space-y-3 ${
                    isDone
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                      : isOverdue
                      ? 'bg-rose-950/20 border-rose-800/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{rem.title}</span>
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
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      {rem.customerName && (
                        <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                          <Building className="w-3.5 h-3.5 text-slate-500" /> {rem.customerName}
                        </span>
                      )}
                    </div>

                    {!isDone && (
                      <button
                        onClick={() => updateReminderStatus(rem.id, 'Completed')}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Done
                      </button>
                    )}
                  </div>

                  {rem.message && (
                    <p className="text-xs text-slate-400 font-mono bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                      {rem.message}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Due: <strong>{new Date(rem.dueAt).toLocaleDateString()}</strong></span>
                    <span>Assigned: {rem.assignedEmployeeName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. HISTORY TAB: Search & Audit Across Channels (Section 10) */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search by customer, recipient, subject, proposal or invoice number..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={historyChannel}
                onChange={(e) => setHistoryChannel(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
              >
                <option value="all">All Channels</option>
                <option value="EMAIL">Email Only</option>
                <option value="WHATSAPP">WhatsApp Only</option>
              </select>

              <select
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
              >
                <option value="all">All Statuses</option>
                <option value="Sent">Sent</option>
                <option value="WHATSAPP_OPENED">WhatsApp Opened</option>
                <option value="Failed">Failed</option>
              </select>

              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>
            </div>
          </div>

          {/* History List */}
          <div className="space-y-3">
            {communicationRecords
              .filter((r) => {
                if (historyChannel !== 'all' && r.channel !== historyChannel) return false;
                if (historyStatus !== 'all' && r.status !== historyStatus) return false;
                if (historySearch.trim()) {
                  const q = historySearch.toLowerCase();
                  return (
                    (r.customerName && r.customerName.toLowerCase().includes(q)) ||
                    r.recipient.toLowerCase().includes(q) ||
                    (r.subject && r.subject.toLowerCase().includes(q)) ||
                    r.body.toLowerCase().includes(q) ||
                    (r.proposalNumber && r.proposalNumber.toLowerCase().includes(q)) ||
                    (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(q))
                  );
                }
                return true;
              })
              .map((comm) => (
                <div
                  key={comm.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        comm.channel === 'EMAIL'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {comm.channel === 'EMAIL' ? <Mail className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-xs">{comm.subject || `${comm.channel} Message`}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          {comm.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            comm.status === 'Sent'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : comm.status === 'WHATSAPP_OPENED'
                              ? 'bg-blue-500/20 text-blue-400'
                              : comm.status === 'Failed'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {comm.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 font-mono max-w-xl mt-0.5">{comm.body}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span>Recipient: {comm.recipient}</span>
                        <span>•</span>
                        <span>Customer: {comm.customerName || 'N/A'}</span>
                        <span>•</span>
                        <span>{new Date(comm.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {comm.status === 'Failed' && (
                      <button
                        onClick={() => retryCommunicationRecord(comm)}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedRecordDetail(comm)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. AUTOMATION TAB: Triggers & Logs (Sections 21-27)        */}
      {/* ========================================================= */}
      {activeTab === 'automation' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" /> Automated Workflow Rules & Triggers
              </h3>
              <p className="text-xs text-slate-400">
                Idempotent automated communication for proposals, invoices, payments, and tickets
              </p>
            </div>
            <button
              onClick={handleRunAutomation}
              disabled={isCheckingAutomation}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              {isCheckingAutomation ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>Execute Rules Now</span>
            </button>
          </div>

          {/* Configurable Rules Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proposal Follow-up Rule */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Automatic Proposal Follow-up</span>
                <input
                  type="checkbox"
                  checked={automationConfigs.proposalFollowup.enabled}
                  onChange={(e) =>
                    saveAutomationConfigs({
                      proposalFollowup: {
                        ...automationConfigs.proposalFollowup,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-purple-600 border-slate-700 focus:ring-0"
                />
              </div>
              <p className="text-xs text-slate-400">
                When a commercial proposal is sent and remains pending past the waiting threshold:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Wait Duration</label>
                  <select
                    value={automationConfigs.proposalFollowup.waitDays}
                    onChange={(e) =>
                      saveAutomationConfigs({
                        proposalFollowup: {
                          ...automationConfigs.proposalFollowup,
                          waitDays: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
                  >
                    <option value={2}>2 Days</option>
                    <option value={3}>3 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={7}>7 Days</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Action Type</label>
                  <div className="text-[11px] text-slate-300 font-medium py-1">Create Reminder + Optional Email</div>
                </div>
              </div>
            </div>

            {/* Invoice Reminder Rule */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Automatic Invoice Due Reminder</span>
                <input
                  type="checkbox"
                  checked={automationConfigs.invoiceReminder.enabled}
                  onChange={(e) =>
                    saveAutomationConfigs({
                      invoiceReminder: {
                        ...automationConfigs.invoiceReminder,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="rounded text-purple-600 border-slate-700 focus:ring-0"
                />
              </div>
              <p className="text-xs text-slate-400">
                Automatically remind clients of upcoming invoice due dates with instant payment links:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Timing Window</label>
                  <select
                    value={automationConfigs.invoiceReminder.daysBeforeDue}
                    onChange={(e) =>
                      saveAutomationConfigs({
                        invoiceReminder: {
                          ...automationConfigs.invoiceReminder,
                          daysBeforeDue: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
                  >
                    <option value={1}>1 Day Before</option>
                    <option value={2}>2 Days Before</option>
                    <option value={3}>3 Days Before</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Invoice Check</label>
                  <div className="text-[11px] text-emerald-400 font-medium py-1">Skipped if Paid / Settled</div>
                </div>
              </div>
            </div>
          </div>

          {/* Automation Execution Logs Table (Section 26) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Automation Audit & Execution History ({automationLogs.length})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Executed At</th>
                    <th className="py-3 px-4">Trigger</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Idempotency Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {automationLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No automated triggers executed yet.
                      </td>
                    </tr>
                  ) : (
                    automationLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {new Date(log.executedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{log.trigger}</td>
                        <td className="py-3 px-4 text-slate-300">{log.customerName || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{log.action}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : log.status === 'SKIPPED_DUPLICATE'
                                ? 'bg-blue-500/20 text-blue-400'
                                : log.status === 'SKIPPED_OPTED_OUT'
                                ? 'bg-purple-500/20 text-purple-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                          {log.idempotencyKey}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. SETTINGS TAB: Corporate Config & Security (Section 40,43) */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" /> Communication Infrastructure & Secrets
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-white block">Email Dispatch Architecture</span>
                <p className="text-slate-400 leading-relaxed">
                  Configured via server-side <code>.email-config.json</code>. Passwords and transactional API tokens are strictly isolated from client-side Firestore documents.
                </p>
                <div className="pt-2">
                  <a
                    href="/admin/settings"
                    className="text-blue-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    Manage Email Provider in Main Settings →
                  </a>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-white block">WhatsApp Business Configuration</span>
                <p className="text-slate-400 leading-relaxed">
                  Meta Graph API Phone Number ID and System Tokens are secured in <code>.whatsapp-config.json</code>.
                </p>
                <div className="pt-2 text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Server-side Token Isolation Active
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" /> Customer Marketing Opt-Out Policy (Sections 32-34)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Customers can adjust their communication preferences at any time. When a customer opts out of marketing, all promotional emails and broadcasts are programmatically rejected. Essential transactional notices (Invoices, Receipts, Security) remain delivered.
            </p>
            <div className="text-xs text-slate-300 font-semibold">
              Current Registered Customer Preferences: {Object.keys(customerConsents).length}
            </div>
          </div>
        </div>
      )}

      {/* Record Inspect Modal */}
      {selectedRecordDetail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Record Inspection</h3>
              <button onClick={() => setSelectedRecordDetail(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Recipient:</span>
                <span className="text-white font-mono">{selectedRecordDetail.recipient}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Subject:</span>
                <span className="text-white font-semibold">{selectedRecordDetail.subject}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-400">{selectedRecordDetail.status}</span>
              </div>
              {selectedRecordDetail.providerMessageId && (
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Provider Message ID:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{selectedRecordDetail.providerMessageId}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {selectedRecordDetail.body}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecordDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Email Template Modal */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {isEditingTemplate ? 'Edit Corporate Template' : 'Create Email Template'}
              </h3>
              <button onClick={() => setIsNewTemplateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmailTemplate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Template Name *</label>
                <input
                  type="text"
                  required
                  value={templateForm.name || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g. Standard Proposal Follow-up"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Category</label>
                  <select
                    value={templateForm.category || 'General'}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
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
                  <label className="text-slate-400 block mb-1 font-semibold">Status</label>
                  <select
                    value={templateForm.status || 'Active'}
                    onChange={(e) => setTemplateForm({ ...templateForm, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Email Subject *</label>
                <input
                  type="text"
                  required
                  value={templateForm.subject || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="e.g. Follow-up regarding Proposal {{proposalNumber}}"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Template Body *</label>
                <textarea
                  rows={6}
                  required
                  value={templateForm.body || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  placeholder="Dear {{contactPerson}}, ..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTemplateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New WhatsApp Template Modal */}
      {isNewWaTemplateOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create WhatsApp Template</h3>
              <button onClick={() => setIsNewWaTemplateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await saveWhatsAppTemplate(waTemplateForm);
                setIsNewWaTemplateOpen(false);
                setWaTemplateForm({ name: '', language: 'en', category: 'MARKETING', body: '' });
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Template Name *</label>
                <input
                  type="text"
                  required
                  value={waTemplateForm.name || ''}
                  onChange={(e) => setWaTemplateForm({ ...waTemplateForm, name: e.target.value })}
                  placeholder="e.g. payment_reminder_v1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Language</label>
                  <input
                    type="text"
                    value={waTemplateForm.language || 'en'}
                    onChange={(e) => setWaTemplateForm({ ...waTemplateForm, language: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Category</label>
                  <select
                    value={waTemplateForm.category || 'UTILITY'}
                    onChange={(e) => setWaTemplateForm({ ...waTemplateForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="MARKETING">MARKETING</option>
                    <option value="UTILITY">UTILITY</option>
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Message Body *</label>
                <textarea
                  rows={4}
                  required
                  value={waTemplateForm.body || ''}
                  onChange={(e) => setWaTemplateForm({ ...waTemplateForm, body: e.target.value })}
                  placeholder="Hello {{1}}, your invoice {{2}} is due..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewWaTemplateOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  Save WhatsApp Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <EmailComposerModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
      />

      <WhatsAppChatModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />

      <CreateReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
      />
    </div>
  );
};
