import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  FileCheck,
  Clock,
  BookOpen,
  BarChart3,
  Settings,
  Plus,
  Globe,
  Scale,
  Receipt,
  Tag,
  Building2,
  FileMinus,
  FilePlus,
  Hourglass,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCrmData } from '../../context/CrmDataContext';
import { InvoiceRecord, PaymentReceipt } from '../../types/crm';
import { FinanceDashboard } from '../finance/FinanceDashboard';
import { InvoicesView } from '../finance/InvoicesView';
import { PaymentsView } from '../finance/PaymentsView';
import { ReceiptsView } from '../finance/ReceiptsView';
import { OutstandingView } from '../finance/OutstandingView';
import { CustomerLedgerView } from '../finance/CustomerLedgerView';
import { FinanceReportsView } from '../finance/FinanceReportsView';
import { FinanceSettingsView } from '../finance/FinanceSettingsView';
import { OnlinePaymentsView } from '../finance/OnlinePaymentsView';
import { PaymentReconciliationView } from '../finance/PaymentReconciliationView';
import { CreditNotesView } from '../finance/CreditNotesView';
import { DebitNotesView } from '../finance/DebitNotesView';
import { ExpensesView } from '../finance/ExpensesView';
import { ExpenseCategoriesView } from '../finance/ExpenseCategoriesView';
import { VendorsView } from '../finance/VendorsView';
import { AgingView } from '../finance/AgingView';

import { InvoiceModal } from '../modals/InvoiceModal';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';
import { InvoiceDetailModal } from '../modals/InvoiceDetailModal';
import { ReceiptDetailModal } from '../modals/ReceiptDetailModal';

export type FinanceTab =
  | 'dashboard'
  | 'invoices'
  | 'payments'
  | 'online-payments'
  | 'receipts'
  | 'receivables'
  | 'outstanding'
  | 'aging'
  | 'credit-notes'
  | 'debit-notes'
  | 'expenses'
  | 'expense-categories'
  | 'vendors'
  | 'reconciliation'
  | 'ledger'
  | 'reports'
  | 'settings';

interface FinanceViewProps {
  initialTab?: FinanceTab;
  initialInvoiceId?: string;
  initialCustomerId?: string;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  initialTab = 'dashboard',
  initialInvoiceId,
  initialCustomerId,
}) => {
  const { invoices, receipts, checkAndNotifyOverdueInvoices } = useCrmData();
  const { isAdmin, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<FinanceTab>(initialTab);

  // Modals state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceRecord | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<InvoiceRecord | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);

  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [isReceiptDetailOpen, setIsReceiptDetailOpen] = useState(false);

  // Check overdue invoices once on view mount
  useEffect(() => {
    checkAndNotifyOverdueInvoices().catch(console.error);
  }, []);

  // Sync initial tab if passed
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle direct invoice opening
  useEffect(() => {
    if (initialInvoiceId && invoices.length > 0) {
      const match = invoices.find(
        (i) => i.id === initialInvoiceId || i.invoiceNumber.toLowerCase() === initialInvoiceId.toLowerCase()
      );
      if (match) {
        setSelectedInvoice(match);
        setIsInvoiceDetailOpen(true);
      }
    }
  }, [initialInvoiceId, invoices]);

  const handleOpenRecordPaymentForInvoice = (inv: InvoiceRecord) => {
    setPaymentTargetInvoice(inv);
    setIsPaymentModalOpen(true);
  };

  const handleOpenEditDraft = (inv: InvoiceRecord) => {
    setInvoiceToEdit(inv);
    setIsInvoiceModalOpen(true);
  };

  const handleViewReceiptById = (receiptId: string) => {
    const rct = receipts.find((r) => r.id === receiptId || r.receiptNumber === receiptId);
    if (rct) {
      setSelectedReceipt(rct);
      setIsReceiptDetailOpen(true);
    }
  };

  const tabs: {
    id: FinanceTab;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
    permission?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoices', icon: <FileText className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'receipts', label: 'Receipts', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'outstanding', label: 'Receivables', icon: <Clock className="w-4 h-4" /> },
    { id: 'aging', label: 'Aging Report', icon: <Hourglass className="w-4 h-4" /> },
    { id: 'credit-notes', label: 'Credit Notes', icon: <FileMinus className="w-4 h-4" /> },
    { id: 'debit-notes', label: 'Debit Notes', icon: <FilePlus className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'expense-categories', label: 'Expense Categories', icon: <Tag className="w-4 h-4" /> },
    { id: 'vendors', label: 'Vendors', icon: <Building2 className="w-4 h-4" /> },
    { id: 'ledger', label: 'Customer Ledger', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'reconciliation', label: 'Reconciliation', icon: <Scale className="w-4 h-4" /> },
    { id: 'online-payments', label: 'Online Gateways', icon: <Globe className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => {
    if (t.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-x-auto">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id || (tab.id === 'outstanding' && activeTab === 'receivables');
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Views */}
      {activeTab === 'dashboard' && (
        <FinanceDashboard
          onNavigateTab={(tab) => setActiveTab(tab as FinanceTab)}
          onOpenCreateInvoice={() => {
            setInvoiceToEdit(null);
            setIsInvoiceModalOpen(true);
          }}
          onOpenRecordPayment={() => {
            setPaymentTargetInvoice(null);
            setIsPaymentModalOpen(true);
          }}
          onSelectInvoice={(inv) => {
            setSelectedInvoice(inv);
            setIsInvoiceDetailOpen(true);
          }}
        />
      )}

      {activeTab === 'invoices' && (
        <InvoicesView
          onOpenCreateInvoice={() => {
            setInvoiceToEdit(null);
            setIsInvoiceModalOpen(true);
          }}
          onSelectInvoice={(inv) => {
            setSelectedInvoice(inv);
            setIsInvoiceDetailOpen(true);
          }}
          onRecordPayment={(inv) => handleOpenRecordPaymentForInvoice(inv)}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentsView
          onOpenRecordPayment={() => {
            setPaymentTargetInvoice(null);
            setIsPaymentModalOpen(true);
          }}
          onViewReceipt={(receiptId) => handleViewReceiptById(receiptId)}
        />
      )}

      {activeTab === 'receipts' && (
        <ReceiptsView
          onSelectReceipt={(receipt) => {
            setSelectedReceipt(receipt);
            setIsReceiptDetailOpen(true);
          }}
        />
      )}

      {(activeTab === 'outstanding' || activeTab === 'receivables') && (
        <OutstandingView
          onSelectInvoice={(inv) => {
            setSelectedInvoice(inv);
            setIsInvoiceDetailOpen(true);
          }}
          onRecordPayment={(inv) => handleOpenRecordPaymentForInvoice(inv)}
          onSendReminder={(inv) => {
            setSelectedInvoice(inv);
            setIsInvoiceDetailOpen(true);
          }}
        />
      )}

      {activeTab === 'aging' && (
        <AgingView
          onSelectInvoice={(inv) => {
            setSelectedInvoice(inv);
            setIsInvoiceDetailOpen(true);
          }}
          onRecordPayment={(inv) => handleOpenRecordPaymentForInvoice(inv)}
          onSendReminder={(inv) => {
            setSelectedInvoice(inv);
            setIsInvoiceDetailOpen(true);
          }}
        />
      )}

      {activeTab === 'credit-notes' && <CreditNotesView />}

      {activeTab === 'debit-notes' && <DebitNotesView />}

      {activeTab === 'expenses' && <ExpensesView />}

      {activeTab === 'expense-categories' && <ExpenseCategoriesView />}

      {activeTab === 'vendors' && <VendorsView />}

      {activeTab === 'reconciliation' && <PaymentReconciliationView />}

      {activeTab === 'online-payments' && <OnlinePaymentsView />}

      {activeTab === 'ledger' && (
        <CustomerLedgerView initialCustomerId={initialCustomerId} />
      )}

      {activeTab === 'reports' && <FinanceReportsView />}

      {activeTab === 'settings' && <FinanceSettingsView />}

      {/* Global Modals for Finance */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setInvoiceToEdit(null);
        }}
        invoiceToEdit={invoiceToEdit}
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentTargetInvoice(null);
        }}
        targetInvoice={paymentTargetInvoice}
      />

      <InvoiceDetailModal
        isOpen={isInvoiceDetailOpen}
        onClose={() => {
          setIsInvoiceDetailOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onRecordPayment={(inv) => {
          setIsInvoiceDetailOpen(false);
          handleOpenRecordPaymentForInvoice(inv);
        }}
        onEditDraft={(inv) => {
          setIsInvoiceDetailOpen(false);
          handleOpenEditDraft(inv);
        }}
        onViewReceipt={(receiptId) => {
          setIsInvoiceDetailOpen(false);
          handleViewReceiptById(receiptId);
        }}
      />

      <ReceiptDetailModal
        isOpen={isReceiptDetailOpen}
        onClose={() => {
          setIsReceiptDetailOpen(false);
          setSelectedReceipt(null);
        }}
        receipt={selectedReceipt}
      />
    </div>
  );
};
