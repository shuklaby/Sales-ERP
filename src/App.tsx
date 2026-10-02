/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CrmDataProvider, useCrmData } from './context/CrmDataContext';
import { Sidebar, ActiveView } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/views/DashboardView';
import { CustomersView } from './components/views/CustomersView';
import { LeadsView } from './components/views/LeadsView';
import { STSView } from './components/views/STSView';
import { CallsView } from './components/views/CallsView';
import { FollowUpsView } from './components/views/FollowUpsView';
import { ProposalsView } from './components/views/ProposalsView';
import { ProductsView } from './components/views/ProductsView';
import { ServicesView } from './components/views/ServicesView';
import { InventoryView } from './components/views/InventoryView';
import { PurchasesView } from './components/views/PurchasesView';
import { EmployeesView } from './components/views/EmployeesView';
import { BulkUploadView } from './components/views/BulkUploadView';
import { ReportsView } from './components/views/ReportsView';
import { ActivitiesView } from './components/views/ActivitiesView';
import { SettingsView } from './components/views/SettingsView';
import { EmailsView } from './components/views/EmailsView';
import { NotificationsView } from './components/views/NotificationsView';
import { FinanceView } from './components/views/FinanceView';

import { CustomerModal } from './components/modals/CustomerModal';
import { LeadModal } from './components/modals/LeadModal';
import { ProposalModal } from './components/modals/ProposalModal';
import { STSModal } from './components/modals/STSModal';
import { CustomerDetailDrawer } from './components/modals/CustomerDetailDrawer';
import { Customer, Lead, ProposalRecord, STSRecord, EmployeePermissions } from './types/crm';
import { RefreshCw, ShieldAlert, LogOut, AlertCircle, X } from 'lucide-react';
import { PublicProposalView } from './components/views/PublicProposalView';
import { CustomerPaymentPage } from './components/payment/CustomerPaymentPage';
import { PaymentSuccessPage } from './components/payment/PaymentSuccessPage';
import { PaymentFailedPage } from './components/payment/PaymentFailedPage';
import { PaymentPendingPage } from './components/payment/PaymentPendingPage';
import { FinanceTab } from './components/views/FinanceView';
import { SettingsTab } from './components/views/SettingsView';
import { CommunicationHubView } from './components/views/CommunicationHubView';
import { TasksView } from './components/views/TasksView';
import { AttendanceView } from './components/views/AttendanceView';
import { LeaveView } from './components/views/LeaveView';
import { HRHubView } from './components/views/HRHubView';
import { SalesHubView, SalesTab } from './components/views/SalesHubView';
import { CustomerLoginView } from './components/customer/CustomerLoginView';
import { CustomerPortalLayout } from './components/customer/CustomerPortalLayout';
import { CustomerPortalProvider } from './context/CustomerPortalContext';
import { CommunicationProvider } from './context/CommunicationContext';
import { CustomerPortalTab } from './types/crm';
import { CustomerDetailTab } from './components/modals/CustomerDetailDrawer';

const ADMIN_ONLY_VIEWS: ActiveView[] = ['employees', 'settings', 'activities', 'hr'];

const VIEW_PERMISSION_MAP: Partial<Record<ActiveView, keyof EmployeePermissions>> = {
  customers: 'viewCustomers',
  leads: 'viewLeads',
  sts: 'createSTS',
  calls: 'makeCalls',
  followups: 'createFollowup',
  proposals: 'createProposal',
  finance: 'viewInvoices',
  emails: 'sendEmail',
  products: 'viewProducts',
  services: 'viewProducts',
  inventory: 'viewProducts',
  purchases: 'viewProducts',
  reports: 'viewReports',
  'bulk-upload': 'bulkUpload',
  attendance: 'viewAttendance',
};

function MainApp() {
  const { currentUser, userProfile, isAdmin, isDeactivated, loading, hasPermission, logout } = useAuth();
  const { dataLoading, customers, proposals } = useCrmData();

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  // Global Modals State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalTargetCustomer, setProposalTargetCustomer] = useState<Customer | null>(null);
  const [proposalTargetLead, setProposalTargetLead] = useState<Lead | null>(null);
  const [proposalTargetSTS, setProposalTargetSTS] = useState<STSRecord | null>(null);
  const [proposalToEdit, setProposalToEdit] = useState<ProposalRecord | null>(null);
  const [selectedProposalDirect, setSelectedProposalDirect] = useState<ProposalRecord | null>(null);

  const [isSTSModalOpen, setIsSTSModalOpen] = useState(false);
  const [stsToEdit, setStsToEdit] = useState<STSRecord | null>(null);
  const [stsTargetCustomer, setStsTargetCustomer] = useState<Customer | null>(null);

  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [customerDetailInitialTab, setCustomerDetailInitialTab] = useState<CustomerDetailTab>('overview');

  // Support direct customer URL opening (/admin/customers/:customerId and /admin/customers/:customerId/documents)
  useEffect(() => {
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length >= 3 && segments[1] === 'customers') {
      const custIdOrId = segments[2];
      const match = customers.find(
        (c) => c.customerId.toLowerCase() === custIdOrId.toLowerCase() || c.id === custIdOrId
      );
      if (match) {
        setDetailCustomer(match);
        if (segments[3] === 'documents') {
          setCustomerDetailInitialTab('documents');
        } else if (segments[3] === 'portal') {
          setCustomerDetailInitialTab('portal');
        } else if (segments[3] === 'communication') {
          setCustomerDetailInitialTab('communication');
        }
      }
    }
  }, [customers]);

  // Parse path to view
  const parsePathToView = useCallback((pathname: string): ActiveView => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return 'dashboard';
    
    // /admin or /employee
    if (segments.length === 1 && (segments[0] === 'admin' || segments[0] === 'employee')) {
      return 'dashboard';
    }
    
    const viewSegment = segments[1] || segments[0];
    const pathnameLower = pathname.toLowerCase();
    if (pathnameLower.startsWith('/reports') || pathnameLower.includes('/reports')) {
      return 'reports';
    }
    if (pathnameLower.startsWith('/dashboard') || pathnameLower.includes('/dashboard')) {
      return 'dashboard';
    }
    if (pathnameLower.includes('/sales')) {
      return 'sales';
    }
    if (pathnameLower.startsWith('/finance') || pathnameLower.includes('/finance')) {
      return 'finance';
    }
    if (pathnameLower.startsWith('/settings/bank') || pathnameLower.includes('/settings/bank-accounts')) {
      return 'settings';
    }
    if (pathnameLower.includes('/hr/attendance')) {
      return 'attendance';
    }
    if (pathnameLower.startsWith('/admin/hr') || pathnameLower.includes('/settings/roles')) {
      return 'hr';
    }
    if (viewSegment === 'sales') return 'sales';
    if (viewSegment === 'communication') return 'communication';
    if (viewSegment === 'inventory') return 'inventory';
    if (viewSegment === 'purchases' || viewSegment === 'suppliers') return 'purchases';
    if (viewSegment === 'tasks') return 'tasks';
    if (viewSegment === 'attendance') return 'attendance';
    if (viewSegment === 'leave' || viewSegment === 'leaves') return 'leave';
    if (viewSegment === 'hr') return 'hr';

    const validViews: ActiveView[] = [
      'dashboard', 'sales', 'leads', 'customers', 'sts', 'calls', 'followups',
      'proposals', 'finance', 'communication', 'emails', 'notifications',
      'products', 'services', 'inventory', 'purchases', 'tasks', 'attendance',
      'leave', 'employees', 'hr', 'bulk-upload', 'reports', 'activities', 'settings'
    ];
    if (validViews.includes(viewSegment as ActiveView)) {
      return viewSegment as ActiveView;
    }
    return 'dashboard';
  }, []);

  // Sync URL with user role and active view
  const syncRoute = useCallback((view: ActiveView, replace = false) => {
    const base = isAdmin ? '/admin' : '/employee';
    const targetPath = view === 'dashboard' ? base : `${base}/${view}`;

    if (window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState(null, '', targetPath);
      } else {
        window.history.pushState(null, '', targetPath);
      }
    }
  }, [isAdmin]);

  // Navigate handler with permission guard
  const navigateTo = useCallback((targetView: ActiveView) => {
    setPermissionNotice(null);

    // If employee tries to access admin-only view
    if (!isAdmin && ADMIN_ONLY_VIEWS.includes(targetView)) {
      setPermissionNotice(`Super Administrator privileges are required to access "${targetView.replace('-', ' ')}".`);
      syncRoute('dashboard', true);
      setActiveView('dashboard');
      return;
    }

    // If employee lacks view permission
    if (!isAdmin) {
      const requiredPerm = VIEW_PERMISSION_MAP[targetView];
      if (requiredPerm && !hasPermission(requiredPerm)) {
        setPermissionNotice(`Access Restricted: You do not have permission (${requiredPerm}) to access this module.`);
        syncRoute('dashboard', true);
        setActiveView('dashboard');
        return;
      }
    }

    setActiveView(targetView);
    syncRoute(targetView);
  }, [isAdmin, hasPermission, syncRoute]);

  // Initial routing on user authentication & popstate handling
  useEffect(() => {
    if (!currentUser) return;

    const currentPath = window.location.pathname;
    const initialView = parsePathToView(currentPath);

    // Redirect rule enforcement
    if (isAdmin) {
      if (!currentPath.startsWith('/admin')) {
        syncRoute(initialView, true);
      }
      setActiveView(initialView);
    } else {
      // Employee role: block /admin paths
      if (currentPath.startsWith('/admin') || ADMIN_ONLY_VIEWS.includes(initialView)) {
        syncRoute('dashboard', true);
        setActiveView('dashboard');
      } else {
        const requiredPerm = VIEW_PERMISSION_MAP[initialView];
        if (requiredPerm && !hasPermission(requiredPerm)) {
          syncRoute('dashboard', true);
          setActiveView('dashboard');
        } else {
          if (!currentPath.startsWith('/employee')) {
            syncRoute(initialView, true);
          }
          setActiveView(initialView);
        }
      }
    }

    const handlePopState = () => {
      const popView = parsePathToView(window.location.pathname);
      if (!isAdmin && ADMIN_ONLY_VIEWS.includes(popView)) {
        syncRoute('dashboard', true);
        setActiveView('dashboard');
      } else {
        setActiveView(popView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, isAdmin, syncRoute, parsePathToView, hasPermission]);

  // Public proposal view route: /proposal/:proposalId (Section 28)
  const pathname = window.location.pathname;
  if (pathname.startsWith('/proposal/')) {
    const proposalIdOrNumber = pathname.replace('/proposal/', '').split('/')[0];
    if (proposalIdOrNumber) {
      return <PublicProposalView proposalIdOrNumber={proposalIdOrNumber} />;
    }
  }

  // Public customer payment routes (Phase 13)
  if (pathname.startsWith('/pay/')) {
    const token = pathname.replace('/pay/', '').split('/')[0].split('?')[0];
    if (token) {
      return <CustomerPaymentPage token={token} />;
    }
  }

  if (pathname === '/payment/success' || pathname.startsWith('/payment/success')) {
    return <PaymentSuccessPage />;
  }

  if (pathname === '/payment/failed' || pathname.startsWith('/payment/failed')) {
    return <PaymentFailedPage />;
  }

  if (pathname === '/payment/pending' || pathname.startsWith('/payment/pending')) {
    return <PaymentPendingPage />;
  }

  // Customer Portal Routes (Phase 14)
  if (pathname.startsWith('/customer')) {
    if (pathname === '/customer/login' || pathname.startsWith('/customer/login')) {
      return <CustomerLoginView />;
    }
    const tabSegment = pathname.replace('/customer/', '').replace('/customer', '').split('/')[0].split('?')[0] as CustomerPortalTab;
    const validTabs: CustomerPortalTab[] = [
      'dashboard', 'company', 'proposals', 'invoices', 'payments', 'receipts',
      'outstanding', 'ledger', 'documents', 'support', 'profile', 'notifications', 'settings'
    ];
    const initialTab = validTabs.includes(tabSegment) ? tabSegment : 'dashboard';
    return (
      <CustomerPortalProvider>
        <CustomerPortalLayout initialTab={initialTab} />
      </CustomerPortalProvider>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Initializing SparkGenTechnology CRM & Real-Time Sync...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  // Deactivated Employee screen
  if (isDeactivated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Employee Account Inactive</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Your account status is currently set to <strong className="text-rose-400">inactive</strong> at SparkGenTechnology.
              Access to CRM operations, leads, and customer data has been suspended by the administrator.
            </p>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono">
            Employee ID: {userProfile?.employeeId || 'N/A'}<br />
            Email: {userProfile?.email}
          </div>
          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row antialiased text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={navigateTo}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Sticky Header with Search and Role Controls */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigate={(view) => navigateTo(view)}
          onSelectCustomer={(cust) => {
            setDetailCustomer(cust);
          }}
          onSelectLead={() => {
            navigateTo('leads');
          }}
          onSelectProposal={(prop) => {
            setSelectedProposalDirect(prop);
            navigateTo('proposals');
          }}
        />

        {/* Global Permission Warning Banner */}
        {permissionNotice && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-amber-700 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{permissionNotice}</span>
            </div>
            <button
              onClick={() => setPermissionNotice(null)}
              className="p-1 hover:bg-amber-500/10 rounded-md text-amber-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Workspace Views */}
        <main className="flex-1 pb-16">
          {activeView === 'dashboard' && (
            <DashboardView
              onNavigate={navigateTo}
              onOpenCustomerModal={() => {
                setCustomerToEdit(null);
                setIsCustomerModalOpen(true);
              }}
              onOpenLeadModal={() => {
                setLeadToEdit(null);
                setIsLeadModalOpen(true);
              }}
              onOpenProposalModal={() => {
                setProposalTargetCustomer(null);
                setIsProposalModalOpen(true);
              }}
            />
          )}

          {activeView === 'sales' && (
            <SalesHubView
              employeeMode={!isAdmin}
              onOpenProposalModal={(proposal) => {
                setProposalTargetCustomer(null);
                setProposalTargetLead(null);
                setProposalTargetSTS(null);
                setProposalToEdit(proposal || null);
                setIsProposalModalOpen(true);
              }}
              initialTab={
                window.location.pathname.includes('/sales/leads/import')
                  ? 'import-leads'
                  : window.location.pathname.includes('/sales/sts/import')
                  ? 'import-sts'
                  : window.location.pathname.includes('/sales/leads')
                  ? 'leads'
                  : window.location.pathname.includes('/sales/sts')
                  ? 'sts'
                  : window.location.pathname.includes('/sales/pipeline')
                  ? 'pipeline'
                  : window.location.pathname.includes('/sales/follow-ups') || window.location.pathname.includes('/sales/followups')
                  ? 'follow-ups'
                  : window.location.pathname.includes('/sales/calls')
                  ? 'calls'
                  : window.location.pathname.includes('/sales/meetings')
                  ? 'meetings'
                  : window.location.pathname.includes('/sales/proposals')
                  ? 'proposals'
                  : window.location.pathname.includes('/sales/activities')
                  ? 'activities'
                  : window.location.pathname.includes('/sales/reports')
                  ? 'reports'
                  : window.location.pathname.includes('/sales/today')
                  ? 'today'
                  : window.location.pathname.includes('/sales/settings')
                  ? 'settings'
                  : 'dashboard'
              }
            />
          )}

          {activeView === 'customers' && (
            <CustomersView
              onOpenCustomerModal={(cust) => {
                setCustomerToEdit(cust || null);
                setIsCustomerModalOpen(true);
              }}
              onOpenCustomerDetail={(cust) => setDetailCustomer(cust)}
              onOpenProposalModal={(cust) => {
                setProposalTargetCustomer(cust || null);
                setProposalTargetLead(null);
                setProposalTargetSTS(null);
                setProposalToEdit(null);
                setIsProposalModalOpen(true);
              }}
              onOpenSTSModal={(cust) => {
                setStsTargetCustomer(cust);
                setStsToEdit(null);
                setIsSTSModalOpen(true);
              }}
            />
          )}

          {activeView === 'leads' && (
            <LeadsView
              onOpenLeadModal={(lead) => {
                setLeadToEdit(lead || null);
                setIsLeadModalOpen(true);
              }}
              onOpenProposalModal={(lead) => {
                setProposalTargetCustomer(null);
                setProposalTargetLead(lead || null);
                setProposalTargetSTS(null);
                setProposalToEdit(null);
                setIsProposalModalOpen(true);
              }}
              onOpenSTSModal={() => {
                setStsTargetCustomer(null);
                setStsToEdit(null);
                setIsSTSModalOpen(true);
              }}
            />
          )}

          {activeView === 'sts' && (
            <STSView
              onOpenSTSModal={(sts) => {
                setStsToEdit(sts || null);
                setStsTargetCustomer(null);
                setIsSTSModalOpen(true);
              }}
              onOpenProposalModal={(sts) => {
                setProposalTargetCustomer(null);
                setProposalTargetLead(null);
                setProposalTargetSTS(sts || null);
                setProposalToEdit(null);
                setIsProposalModalOpen(true);
              }}
            />
          )}

          {activeView === 'calls' && <CallsView />}

          {activeView === 'followups' && <FollowUpsView />}

          {activeView === 'proposals' && (
            <ProposalsView
              onOpenProposalModal={(propToEdit) => {
                setProposalTargetCustomer(null);
                setProposalTargetLead(null);
                setProposalTargetSTS(null);
                setProposalToEdit(propToEdit || null);
                setIsProposalModalOpen(true);
              }}
              selectedProposalDirect={selectedProposalDirect}
            />
          )}

          {activeView === 'finance' && (() => {
            const path = window.location.pathname.toLowerCase();
            let initialTab: any = 'dashboard';
            if (path.includes('/finance/invoices')) initialTab = 'invoices';
            else if (path.includes('/finance/payments')) initialTab = 'payments';
            else if (path.includes('/finance/receipts')) initialTab = 'receipts';
            else if (path.includes('/finance/receivables') || path.includes('/finance/outstanding')) initialTab = 'outstanding';
            else if (path.includes('/finance/aging')) initialTab = 'aging';
            else if (path.includes('/finance/credit-notes')) initialTab = 'credit-notes';
            else if (path.includes('/finance/debit-notes')) initialTab = 'debit-notes';
            else if (path.includes('/finance/expenses')) initialTab = 'expenses';
            else if (path.includes('/finance/expense-categories')) initialTab = 'expense-categories';
            else if (path.includes('/finance/vendors')) initialTab = 'vendors';
            else if (path.includes('/finance/reconciliation')) initialTab = 'reconciliation';
            else if (path.includes('/finance/online-payments')) initialTab = 'online-payments';
            else if (path.includes('/finance/ledger')) initialTab = 'ledger';
            else if (path.includes('/finance/reports')) initialTab = 'reports';
            else if (path.includes('/finance/settings')) initialTab = 'settings';

            // Extract customerId if /finance/ledger/:customerId
            let initialCustId: string | undefined;
            if (path.includes('/finance/ledger/')) {
              const segments = window.location.pathname.split('/');
              const ledgerIndex = segments.findIndex((s) => s.toLowerCase() === 'ledger');
              if (ledgerIndex !== -1 && segments[ledgerIndex + 1]) {
                initialCustId = segments[ledgerIndex + 1];
              }
            }

            return (
              <FinanceView
                initialTab={initialTab}
                initialCustomerId={initialCustId}
              />
            );
          })()}

          {activeView === 'communication' && (
            <CommunicationHubView />
          )}

          {activeView === 'emails' && <EmailsView />}

          {activeView === 'notifications' && (
            <NotificationsView
              onNavigate={navigateTo}
              onSelectProposalDirect={(propId) => {
                const match = proposals.find((p) => p.id === propId || p.proposalNumber === propId);
                if (match) setSelectedProposalDirect(match);
                navigateTo('proposals');
              }}
              onSelectCustomerDirect={(custId) => {
                const match = customers.find((c) => c.customerId === custId || c.id === custId);
                if (match) setDetailCustomer(match);
              }}
            />
          )}

          {activeView === 'products' && <ProductsView />}

          {activeView === 'services' && <ServicesView />}

          {activeView === 'inventory' && <InventoryView />}

          {activeView === 'purchases' && <PurchasesView />}

          {activeView === 'tasks' && <TasksView />}

          {activeView === 'attendance' && <AttendanceView />}

          {activeView === 'leave' && <LeaveView />}

          {activeView === 'employees' && <EmployeesView />}

          {activeView === 'hr' && (
            <HRHubView
              initialTab={
                window.location.pathname.includes('/hr/designations')
                  ? 'designations'
                  : window.location.pathname.includes('/hr/leave-types')
                  ? 'leave-types'
                  : window.location.pathname.includes('/hr/holidays')
                  ? 'holidays'
                  : window.location.pathname.includes('/hr/payroll')
                  ? 'payroll'
                  : window.location.pathname.includes('/settings/roles')
                  ? 'roles'
                  : 'departments'
              }
            />
          )}

          {activeView === 'bulk-upload' && <BulkUploadView />}

          {activeView === 'reports' && <ReportsView />}

          {activeView === 'activities' && <ActivitiesView />}

          {activeView === 'settings' && (
            <SettingsView
              initialTab={
                window.location.pathname.includes('/settings/bank') || window.location.pathname.includes('/settings/bank-accounts')
                  ? 'bank'
                  : window.location.pathname.includes('/settings/products')
                  ? 'products'
                  : window.location.pathname.includes('/settings/payment')
                  ? 'payment'
                  : undefined
              }
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customerToEdit={customerToEdit}
      />

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        leadToEdit={leadToEdit}
      />

      <ProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => {
          setIsProposalModalOpen(false);
          setProposalTargetCustomer(null);
          setProposalTargetLead(null);
          setProposalTargetSTS(null);
          setProposalToEdit(null);
        }}
        initialCustomer={proposalTargetCustomer}
        initialLead={proposalTargetLead}
        initialSTS={proposalTargetSTS}
        proposalToEdit={proposalToEdit}
      />

      <STSModal
        isOpen={isSTSModalOpen}
        onClose={() => {
          setIsSTSModalOpen(false);
          setStsToEdit(null);
          setStsTargetCustomer(null);
        }}
        stsToEdit={stsToEdit}
        initialCustomer={stsTargetCustomer}
      />

      <CustomerDetailDrawer
        customer={detailCustomer}
        initialTab={customerDetailInitialTab}
        onClose={() => {
          setDetailCustomer(null);
          setCustomerDetailInitialTab('overview');
        }}
        onEdit={(cust) => {
          setCustomerToEdit(cust);
          setIsCustomerModalOpen(true);
        }}
        onOpenProposalModal={(cust) => {
          setProposalTargetCustomer(cust || null);
          setProposalTargetLead(null);
          setProposalTargetSTS(null);
          setProposalToEdit(null);
          setIsProposalModalOpen(true);
        }}
        onOpenSTSModal={(cust) => {
          setStsTargetCustomer(cust);
          setStsToEdit(null);
          setIsSTSModalOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CrmDataProvider>
        <CommunicationProvider>
          <MainApp />
        </CommunicationProvider>
      </CrmDataProvider>
    </AuthProvider>
  );
}
