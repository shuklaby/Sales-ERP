import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  FileCheck,
  Clock,
  BookOpen,
  FolderOpen,
  LifeBuoy,
  User,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useCustomerPortal } from '../../context/CustomerPortalContext';
import { CustomerPortalTab } from '../../types/crm';
import { CustomerDashboardView } from './views/CustomerDashboardView';
import { CustomerCompanyView } from './views/CustomerCompanyView';
import { CustomerProposalsView } from './views/CustomerProposalsView';
import { CustomerInvoicesView } from './views/CustomerInvoicesView';
import { CustomerPaymentsView } from './views/CustomerPaymentsView';
import { CustomerReceiptsView } from './views/CustomerReceiptsView';
import { CustomerOutstandingView } from './views/CustomerOutstandingView';
import { CustomerLedgerView } from './views/CustomerLedgerView';
import { CustomerDocumentsView } from './views/CustomerDocumentsView';
import { CustomerSupportView } from './views/CustomerSupportView';
import { CustomerProfileView } from './views/CustomerProfileView';
import { CustomerNotificationsView } from './views/CustomerNotificationsView';
import { CustomerSettingsView } from './views/CustomerSettingsView';

interface CustomerPortalLayoutProps {
  initialTab?: CustomerPortalTab;
}

export const CustomerPortalLayout: React.FC<CustomerPortalLayoutProps> = ({ initialTab = 'dashboard' }) => {
  const {
    firebaseUser,
    customerUser,
    customerCompany,
    loading,
    authError,
    activeTab,
    setActiveTab,
    unreadNotificationCount,
    openTicketCount,
    logout,
  } = useCustomerPortal();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync tab from props or URL
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3 font-sans">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Authenticating & Loading SparkGenTechnology Customer Portal...</p>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">SparkGenTechnology Customer Portal</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Please sign in with your authorized client credentials to access proposals, invoices, and documents.
            </p>
          </div>
          <button
            onClick={() => {
              window.location.href = '/customer/login';
            }}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            Go to Customer Login
          </button>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Portal Access Restricted</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{authError}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                window.location.href = '/customer/login';
              }}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
            >
              Sign in with another account
            </button>
            <button
              onClick={logout}
              className="py-2.5 px-4 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-xl text-xs font-semibold transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: {
    id: CustomerPortalTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'company', label: 'My Company', icon: <Building2 className="w-4 h-4" /> },
    { id: 'proposals', label: 'Proposals', icon: <FileText className="w-4 h-4" /> },
    { id: 'invoices', label: 'Invoices', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'receipts', label: 'Receipts', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'outstanding', label: 'Outstanding', icon: <Clock className="w-4 h-4" /> },
    { id: 'ledger', label: 'Statement of Account', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'support', label: 'Support Desk', icon: <LifeBuoy className="w-4 h-4" />, badge: openTicketCount },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, badge: unreadNotificationCount },
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleNavigate = (tab: CustomerPortalTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    window.history.pushState(null, '', `/customer/${tab}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-blue-600 selection:text-white">
      {/* Mobile Top Header Bar */}
      <header className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white text-xs">SparkGenTechnology</div>
            <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
              {customerCompany?.companyName || 'Customer Portal'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadNotificationCount > 0 && (
            <button
              onClick={() => handleNavigate('notifications')}
              className="p-1.5 text-blue-400 bg-blue-500/10 rounded-lg relative"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-1 right-1" />
            </button>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col shrink-0 fixed inset-y-0 z-30">
        {/* Brand Banner */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-600/10">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-white tracking-tight truncate">
                SparkGenTechnology
              </h1>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                Customer Portal
              </p>
            </div>
          </div>

          {/* Customer Organization Badge */}
          <div className="mt-4 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Organization</span>
            <div className="text-xs font-bold text-white truncate">{customerCompany?.companyName || 'Loading...'}</div>
            <span className="text-[10px] text-slate-400 block truncate">{customerUser?.name}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-blue-600' : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation (Section 41) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-72 bg-slate-900 border-r border-slate-800 h-full p-4 flex flex-col animate-in slide-in-from-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="font-bold text-white text-xs">SparkGenTechnology</div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium ${
                      isActive ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Navbar */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Customer Portal</span>
            <span>/</span>
            <span className="capitalize font-semibold text-white">{activeTab.replace('-', ' ')}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => handleNavigate('notifications')}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-1.5 right-1.5" />
              )}
            </button>

            <div
              onClick={() => handleNavigate('profile')}
              className="flex items-center gap-2.5 pl-3 border-l border-slate-800 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center">
                {customerUser?.name ? customerUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left text-xs">
                <span className="font-bold text-white block">{customerUser?.name || 'Customer'}</span>
                <span className="text-[10px] text-slate-400 block">{customerUser?.role || 'Customer User'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Container */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20">
          {activeTab === 'dashboard' && <CustomerDashboardView />}
          {activeTab === 'company' && <CustomerCompanyView />}
          {activeTab === 'proposals' && <CustomerProposalsView />}
          {activeTab === 'invoices' && <CustomerInvoicesView />}
          {activeTab === 'payments' && <CustomerPaymentsView />}
          {activeTab === 'receipts' && <CustomerReceiptsView />}
          {activeTab === 'outstanding' && <CustomerOutstandingView />}
          {activeTab === 'ledger' && <CustomerLedgerView />}
          {activeTab === 'documents' && <CustomerDocumentsView />}
          {activeTab === 'support' && <CustomerSupportView />}
          {activeTab === 'profile' && <CustomerProfileView />}
          {activeTab === 'notifications' && <CustomerNotificationsView />}
          {activeTab === 'settings' && <CustomerSettingsView />}
        </div>
      </main>
    </div>
  );
};
