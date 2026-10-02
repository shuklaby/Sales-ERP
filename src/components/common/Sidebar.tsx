import React from 'react';
import {
  LayoutDashboard,
  Target,
  Building2,
  FileCheck,
  PhoneCall,
  CalendarClock,
  FileText,
  Mail,
  Bell,
  Package,
  Wrench,
  Users,
  UploadCloud,
  BarChart3,
  Activity,
  Settings,
  ShieldAlert,
  CreditCard,
  ExternalLink,
  MessagesSquare,
  Boxes,
  ShoppingBag,
  CheckSquare,
  Clock,
  Calendar,
  TrendingUp,
  Kanban,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCrmData } from '../../context/CrmDataContext';
import { EmployeePermissions } from '../../types/crm';

export type ActiveView =
  | 'dashboard'
  | 'sales'
  | 'leads'
  | 'customers'
  | 'sts'
  | 'calls'
  | 'followups'
  | 'proposals'
  | 'finance'
  | 'communication'
  | 'emails'
  | 'notifications'
  | 'products'
  | 'services'
  | 'inventory'
  | 'purchases'
  | 'tasks'
  | 'attendance'
  | 'leave'
  | 'employees'
  | 'hr'
  | 'bulk-upload'
  | 'reports'
  | 'activities'
  | 'settings';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
  const { isAdmin, hasPermission, userProfile } = useAuth();
  const { companySettings, notifications, invoices, products } = useCrmData();

  const unreadNotifCount = React.useMemo(() => {
    return notifications.filter(
      (n) => (isAdmin || n.userId === 'all_admins' || n.userId === userProfile?.uid) && !n.read
    ).length;
  }, [notifications, isAdmin, userProfile]);

  const overdueInvoicesCount = React.useMemo(() => {
    return invoices.filter((i) => i.status === 'Overdue').length;
  }, [invoices]);

  const lowStockCount = React.useMemo(() => {
    return products.filter((p) => p.stockEnabled !== false && (p.currentStock ?? 0) <= (p.minimumQuantity ?? 10)).length;
  }, [products]);

  const navItems: {
    id: ActiveView;
    label: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
    permission?: keyof EmployeePermissions;
    badge?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'sales',
      label: 'Sales Hub',
      icon: <TrendingUp className="w-4 h-4" />,
      badge: 'Hub',
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: <Target className="w-4 h-4" />,
      permission: 'viewLeads',
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: <Building2 className="w-4 h-4" />,
      permission: 'viewCustomers',
    },
    {
      id: 'sts',
      label: 'STS Management',
      icon: <FileCheck className="w-4 h-4" />,
      permission: 'createSTS',
    },
    {
      id: 'calls',
      label: 'Calls Log',
      icon: <PhoneCall className="w-4 h-4" />,
      permission: 'makeCalls',
    },
    {
      id: 'followups',
      label: 'Follow-ups',
      icon: <CalendarClock className="w-4 h-4" />,
      permission: 'createFollowup',
    },
    {
      id: 'proposals',
      label: 'Proposals',
      icon: <FileText className="w-4 h-4" />,
      permission: 'createProposal',
    },
    {
      id: 'finance',
      label: 'Finance & Invoices',
      icon: <CreditCard className="w-4 h-4" />,
      permission: 'viewInvoices',
      badge: overdueInvoicesCount > 0 ? `${overdueInvoicesCount} overdue` : undefined,
    },
    {
      id: 'communication',
      label: 'Communication Hub',
      icon: <MessagesSquare className="w-4 h-4" />,
      badge: 'Hub',
    },
    {
      id: 'emails',
      label: 'Email Center',
      icon: <Mail className="w-4 h-4" />,
      permission: 'sendEmail',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4" />,
      badge: unreadNotifCount > 0 ? String(unreadNotifCount) : undefined,
    },
    {
      id: 'products',
      label: 'Products',
      icon: <Package className="w-4 h-4" />,
      permission: 'viewProducts',
    },
    {
      id: 'services',
      label: 'Services',
      icon: <Wrench className="w-4 h-4" />,
      permission: 'viewProducts',
    },
    {
      id: 'inventory',
      label: 'Inventory & Stock',
      icon: <Boxes className="w-4 h-4" />,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
    },
    {
      id: 'purchases',
      label: 'Purchase Orders',
      icon: <ShoppingBag className="w-4 h-4" />,
    },
    {
      id: 'tasks',
      label: 'Tasks & Deadlines',
      icon: <CheckSquare className="w-4 h-4" />,
    },
    {
      id: 'attendance',
      label: 'Attendance & Clock',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'leave',
      label: 'Leave & Holidays',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'employees',
      label: 'Employees',
      icon: <Users className="w-4 h-4" />,
      adminOnly: true,
      badge: 'Admin',
    },
    {
      id: 'hr',
      label: 'HR Governance Hub',
      icon: <Building2 className="w-4 h-4" />,
      adminOnly: true,
      badge: 'HR',
    },
    {
      id: 'bulk-upload',
      label: 'Bulk Upload',
      icon: <UploadCloud className="w-4 h-4" />,
      permission: 'bulkUpload',
      badge: isAdmin ? 'Admin' : undefined,
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      permission: 'viewReports',
    },
    {
      id: 'activities',
      label: 'System Activity',
      icon: <Activity className="w-4 h-4" />,
      adminOnly: true,
      badge: 'Admin',
    },
    {
      id: 'settings',
      label: 'Settings & Branding',
      icon: <Settings className="w-4 h-4" />,
      adminOnly: true,
      badge: 'Admin',
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800/80 transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
            S
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm text-white tracking-tight truncate">
              {companySettings.companyName || 'SparkGenTechnology'}
            </h1>
            <span className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase block">
              ● Live Real-Time CRM
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 px-3 pb-1 tracking-wider">
            Workspace
          </div>

          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            if (item.permission && !isAdmin && !hasPermission(item.permission)) return null;

            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-indigo-700 text-indigo-100'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Customer Portal Shortcut */}
        <div className="p-3 border-t border-slate-800/60">
          <a
            href="/customer/dashboard"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-blue-300 bg-blue-950/40 border border-blue-800/40 hover:bg-blue-900/40 transition group"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
              <span>Customer Portal</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          </a>
        </div>

        {/* Current User Card */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <span className="text-xs font-semibold text-white block truncate">
                {userProfile?.name}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {userProfile?.role === 'admin' ? 'Super Administrator' : userProfile?.designation || 'Sales Executive'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
