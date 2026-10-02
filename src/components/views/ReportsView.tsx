import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  FileCheck,
  PhoneCall,
  CalendarClock,
  FileText,
  DollarSign,
  TrendingDown,
  PieChart,
  Package,
  Boxes,
  Users,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SalesReportView } from '../reports/SalesReportView';
import { LeadAnalyticsView } from '../reports/LeadAnalyticsView';
import { STSAnalyticsView } from '../reports/STSAnalyticsView';
import { CallsReportView } from '../reports/CallsReportView';
import { FollowupsReportView } from '../reports/FollowupsReportView';
import { ProposalsReportView } from '../reports/ProposalsReportView';
import { InvoicesReportView } from '../reports/InvoicesReportView';
import { CollectionReportView } from '../reports/CollectionReportView';
import { ExpensesReportView } from '../reports/ExpensesReportView';
import { ProfitabilityReportView } from '../reports/ProfitabilityReportView';
import { ProductsReportView } from '../reports/ProductsReportView';
import { InventoryReportView } from '../reports/InventoryReportView';
import { EmployeesReportView } from '../reports/EmployeesReportView';
import { AttendanceReportView } from '../reports/AttendanceReportView';
import { ScheduledMISView } from '../reports/ScheduledMISView';
import { ReportId } from '../../types/crm';

export type ExtendedReportTab =
  | 'sales'
  | 'leads'
  | 'sts'
  | 'calls'
  | 'followups'
  | 'followups_today'
  | 'proposals'
  | 'invoices'
  | 'collection'
  | 'expenses'
  | 'profitability'
  | 'products'
  | 'inventory'
  | 'employees'
  | 'attendance'
  | 'mis';

interface ReportNavGroup {
  groupName: string;
  items: {
    id: ExtendedReportTab;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
    path: string;
  }[];
}

export const ReportsView: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ExtendedReportTab>('sales');

  // Parse path on initial mount or popstate (e.g. /reports/sales, /reports/followups/today, etc.)
  useEffect(() => {
    const handleUrlSync = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/reports/followups/today')) {
        setActiveTab('followups_today');
      } else if (path.includes('/reports/sales')) {
        setActiveTab('sales');
      } else if (path.includes('/reports/leads')) {
        setActiveTab('leads');
      } else if (path.includes('/reports/sts')) {
        setActiveTab('sts');
      } else if (path.includes('/reports/calls')) {
        setActiveTab('calls');
      } else if (path.includes('/reports/followups')) {
        setActiveTab('followups');
      } else if (path.includes('/reports/proposals')) {
        setActiveTab('proposals');
      } else if (path.includes('/reports/invoices')) {
        setActiveTab('invoices');
      } else if (path.includes('/reports/collection')) {
        setActiveTab('collection');
      } else if (path.includes('/reports/expenses')) {
        setActiveTab('expenses');
      } else if (path.includes('/reports/profitability')) {
        setActiveTab('profitability');
      } else if (path.includes('/reports/products')) {
        setActiveTab('products');
      } else if (path.includes('/reports/inventory')) {
        setActiveTab('inventory');
      } else if (path.includes('/reports/employees')) {
        setActiveTab('employees');
      } else if (path.includes('/reports/attendance')) {
        setActiveTab('attendance');
      } else if (path.includes('/reports/mis') || path.includes('/reports/scheduled')) {
        setActiveTab('mis');
      }
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, []);

  const handleSelectTab = (tab: ExtendedReportTab, path: string) => {
    setActiveTab(tab);
    const basePath = isAdmin ? '/admin' : '/employee';
    const targetUrl = `${basePath}${path}`;
    window.history.pushState(null, '', targetUrl);
  };

  const reportGroups: ReportNavGroup[] = useMemo(
    () => [
      {
        groupName: 'Sales & Pipeline',
        items: [
          { id: 'sales', label: 'Sales Analytics', icon: <TrendingUp className="w-3.5 h-3.5" />, path: '/reports/sales' },
          { id: 'leads', label: 'Lead Analytics', icon: <Target className="w-3.5 h-3.5" />, path: '/reports/leads' },
          { id: 'sts', label: 'STS Technical', icon: <FileCheck className="w-3.5 h-3.5" />, path: '/reports/sts' },
          { id: 'proposals', label: 'Proposals', icon: <FileText className="w-3.5 h-3.5" />, path: '/reports/proposals' },
          { id: 'products', label: 'Products Sold', icon: <Package className="w-3.5 h-3.5" />, path: '/reports/products' },
        ],
      },
      {
        groupName: 'Financial MIS',
        items: [
          { id: 'invoices', label: 'Invoice Report', icon: <FileText className="w-3.5 h-3.5" />, path: '/reports/invoices' },
          { id: 'collection', label: 'Collection Audit', icon: <DollarSign className="w-3.5 h-3.5" />, path: '/reports/collection' },
          { id: 'expenses', label: 'Expense Report', icon: <TrendingDown className="w-3.5 h-3.5" />, path: '/reports/expenses' },
          { id: 'profitability', label: 'Profitability', icon: <PieChart className="w-3.5 h-3.5" />, path: '/reports/profitability', adminOnly: true },
        ],
      },
      {
        groupName: 'Operations',
        items: [
          { id: 'calls', label: 'Calling Report', icon: <PhoneCall className="w-3.5 h-3.5" />, path: '/reports/calls' },
          { id: 'followups', label: 'Follow-up Report', icon: <CalendarClock className="w-3.5 h-3.5" />, path: '/reports/followups' },
          { id: 'followups_today', label: "Today's Follow-up", icon: <Clock className="w-3.5 h-3.5" />, path: '/reports/followups/today' },
          { id: 'inventory', label: 'Inventory & Stock', icon: <Boxes className="w-3.5 h-3.5" />, path: '/reports/inventory' },
        ],
      },
      {
        groupName: 'Workforce & MIS',
        items: [
          { id: 'employees', label: 'Employee Activity', icon: <Users className="w-3.5 h-3.5" />, path: '/reports/employees', adminOnly: true },
          { id: 'attendance', label: 'Attendance Report', icon: <Calendar className="w-3.5 h-3.5" />, path: '/reports/attendance' },
          { id: 'mis', label: 'Scheduled MIS & Pack', icon: <CalendarClock className="w-3.5 h-3.5" />, path: '/reports/mis', adminOnly: true },
        ],
      },
    ],
    []
  );

  // Guard admin-only reports
  const isCurrentReportRestricted = useMemo(() => {
    if (isAdmin) return false;
    if (['profitability', 'employees', 'mis'].includes(activeTab)) {
      return true;
    }
    return false;
  }, [isAdmin, activeTab]);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-widest uppercase font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/50">
                Phase 20 Executive Analytics Suite
              </span>
              <span className="text-xs text-slate-400">• SparkGenTechnology</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-1 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-indigo-400" />
              Corporate MIS & Analytical Reporting Desk
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl mt-1">
              Factual, auditable enterprise intelligence streaming 16 operational domains directly from live Firestore records.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Categorized Report Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {reportGroups.map((group) => (
            <div key={group.groupName} className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">
                {group.groupName}
              </span>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  if (item.adminOnly && !isAdmin) return null;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id, item.path)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Restricted View Notice */}
      {isCurrentReportRestricted ? (
        <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center space-y-3 shadow-xs">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-base font-black text-slate-900">Super Administrator Privileges Required</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Access to corporate profitability, management packs, and personnel activity reports is restricted to authorized executive management.
          </p>
        </div>
      ) : (
        /* 4. Active Report Module */
        <div className="transition-all duration-150">
          {activeTab === 'sales' && <SalesReportView />}
          {activeTab === 'leads' && <LeadAnalyticsView />}
          {activeTab === 'sts' && <STSAnalyticsView />}
          {activeTab === 'calls' && <CallsReportView />}
          {activeTab === 'followups' && <FollowupsReportView initialTodayOnly={false} />}
          {activeTab === 'followups_today' && <FollowupsReportView initialTodayOnly={true} />}
          {activeTab === 'proposals' && <ProposalsReportView />}
          {activeTab === 'invoices' && <InvoicesReportView />}
          {activeTab === 'collection' && <CollectionReportView />}
          {activeTab === 'expenses' && <ExpensesReportView />}
          {activeTab === 'profitability' && <ProfitabilityReportView />}
          {activeTab === 'products' && <ProductsReportView />}
          {activeTab === 'inventory' && <InventoryReportView />}
          {activeTab === 'employees' && <EmployeesReportView />}
          {activeTab === 'attendance' && <AttendanceReportView />}
          {activeTab === 'mis' && <ScheduledMISView />}
        </div>
      )}
    </div>
  );
};
