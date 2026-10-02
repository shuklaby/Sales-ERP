import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  LogOut,
  Sparkles,
  Building2,
  Target,
  FileText,
  FileCheck,
  User,
  Shield,
  RefreshCw,
  Bell,
  AlertCircle,
  Clock,
  CheckCircle,
  CalendarClock,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCrmData } from '../../context/CrmDataContext';
import { ActiveView } from './Sidebar';
import { Customer, Lead, ProposalRecord, STSRecord, FollowUpRecord } from '../../types/crm';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (view: ActiveView) => void;
  onSelectCustomer: (customer: Customer) => void;
  onSelectLead: (lead: Lead) => void;
  onSelectProposal: (proposal: ProposalRecord) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onNavigate,
  onSelectCustomer,
  onSelectLead,
  onSelectProposal,
}) => {
  const { userProfile, isAdmin, logout, switchActiveRole, hasPermission } = useAuth();
  const {
    customers,
    leads,
    proposals,
    stsRecords,
    followups,
    completeFollowUp,
    notifications,
    markNotificationAsRead,
    seedInitialDataIfEmpty,
    checkAndNotifyFollowupReminders,
  } = useCrmData();

  // Run follow-up reminders periodically (every 60 seconds)
  useEffect(() => {
    checkAndNotifyFollowupReminders();
    const timer = setInterval(() => {
      checkAndNotifyFollowupReminders();
    }, 60000);
    return () => clearInterval(timer);
  }, [checkAndNotifyFollowupReminders]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Follow-up authorization filter
  const permittedFollowups = React.useMemo(() => {
    if (isAdmin || hasPermission('canViewAllCustomers') || hasPermission('viewCustomers')) {
      return followups;
    }
    return followups.filter((f) => f.employeeId === userProfile?.uid);
  }, [followups, isAdmin, hasPermission, userProfile]);

  const overdueFollowups = React.useMemo(
    () => permittedFollowups.filter((f) => f.date < todayStr && f.status !== 'Completed' && f.status !== 'Cancelled'),
    [permittedFollowups, todayStr]
  );

  const dueTodayFollowups = React.useMemo(
    () => permittedFollowups.filter((f) => f.date === todayStr && f.status !== 'Completed' && f.status !== 'Cancelled'),
    [permittedFollowups, todayStr]
  );

  const userNotifications = React.useMemo(() => {
    return notifications.filter((n) => {
      if (isAdmin) return true;
      return n.userId === 'all_admins' || n.userId === userProfile?.uid;
    });
  }, [notifications, isAdmin, userProfile]);

  const unreadNotifications = React.useMemo(() => {
    return userNotifications.filter((n) => !n.read);
  }, [userNotifications]);

  const totalAlertsCount = overdueFollowups.length + dueTodayFollowups.length + unreadNotifications.length;

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = searchQuery.trim().toLowerCase();

  const filteredCustomers = q
    ? customers.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.gstNumber && c.gstNumber.toLowerCase().includes(q)) ||
          c.customerId.toLowerCase().includes(q)
      )
    : [];

  const filteredLeads = q
    ? leads.filter(
        (l) =>
          l.companyName.toLowerCase().includes(q) ||
          l.contactPerson.toLowerCase().includes(q) ||
          l.mobile.includes(q) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          l.leadId.toLowerCase().includes(q)
      )
    : [];

  const filteredProposals = q
    ? proposals.filter(
        (p) =>
          p.proposalNumber.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q)
      )
    : [];

  const filteredSts = q
    ? stsRecords.filter(
        (s) =>
          s.stsNumber.toLowerCase().includes(q) ||
          s.companyName.toLowerCase().includes(q) ||
          s.requirement.toLowerCase().includes(q)
      )
    : [];

  const totalResults =
    filteredCustomers.length + filteredLeads.length + filteredProposals.length + filteredSts.length;

  const handleSeed = async () => {
    if (!isAdmin) return;
    setIsSeeding(true);
    try {
      await seedInitialDataIfEmpty();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 lg:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Box */}
        <div ref={searchRef} className="relative w-72 md:w-96">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search customers, leads, proposals, mobile..."
              className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
            />
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && q && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-96 overflow-y-auto p-2 z-50">
              {totalResults === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching client or proposal found
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Customers */}
                  {filteredCustomers.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                        Customers ({filteredCustomers.length})
                      </div>
                      {filteredCustomers.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            onSelectCustomer(c);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            <div>
                              <span className="font-semibold text-slate-800">{c.companyName}</span>
                              <span className="text-[10px] text-slate-400 block">{c.contactPerson} • {c.mobile}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{c.customerId}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Leads */}
                  {filteredLeads.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                        Leads ({filteredLeads.length})
                      </div>
                      {filteredLeads.slice(0, 3).map((l) => (
                        <div
                          key={l.id}
                          onClick={() => {
                            onSelectLead(l);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-amber-600" />
                            <div>
                              <span className="font-semibold text-slate-800">{l.companyName}</span>
                              <span className="text-[10px] text-slate-400 block">{l.contactPerson} • {l.mobile}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{l.leadId}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Proposals */}
                  {filteredProposals.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                        Proposals ({filteredProposals.length})
                      </div>
                      {filteredProposals.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            onSelectProposal(p);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="font-semibold text-slate-800">{p.proposalNumber}</span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-700">₹{p.grandTotal.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Seed button for empty instances */}
        {isAdmin && customers.length === 0 && (
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold shadow-2xs"
            title="Populate initial demo products, services, leads & customers"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            {isSeeding ? 'Seeding...' : 'Seed Sample Catalog'}
          </button>
        )}

        {/* 9. IN-APP FOLLOW-UP NOTIFICATIONS CENTER */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`p-2 rounded-xl border transition-all relative ${
              totalAlertsCount > 0
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Follow-up Notifications (Due Today & Overdue)"
          >
            <Bell className="w-4 h-4" />
            {totalAlertsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-bounce">
                {totalAlertsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-xs">Notifications & Alerts</span>
                </div>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                  {totalAlertsCount} action items
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {totalAlertsCount === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-1">
                    <CheckCircle className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                    <p className="font-semibold text-slate-700">No Pending Follow-up Alerts</p>
                    <p className="text-[11px]">All scheduled touchpoints are completely up to date.</p>
                  </div>
                ) : (
                  <>
                    {/* Real-time CRM Notifications */}
                    {unreadNotifications.length > 0 && (
                      <div className="p-2 bg-indigo-50/60">
                        <div className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Bell className="w-3 h-3 text-indigo-600" /> CRM Notifications ({unreadNotifications.length})
                          </span>
                          <button
                            onClick={() => {
                              setIsNotificationsOpen(false);
                              onNavigate('notifications');
                            }}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 lowercase hover:underline"
                          >
                            view all
                          </button>
                        </div>
                        {unreadNotifications.slice(0, 4).map((n) => (
                          <div
                            key={n.id}
                            className="p-2 rounded-xl bg-white border border-indigo-200 mb-1.5 shadow-2xs hover:bg-indigo-50/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-slate-900 block text-[11px]">{n.title}</span>
                                <span className="text-[10px] text-slate-600 line-clamp-1">{n.message}</span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 mt-1 pt-1 border-t border-slate-100">
                              <button
                                onClick={() => markNotificationAsRead(n.id)}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium rounded-md transition-colors"
                              >
                                Mark read
                              </button>
                              <button
                                onClick={() => {
                                  setIsNotificationsOpen(false);
                                  markNotificationAsRead(n.id);
                                  onNavigate('notifications');
                                }}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md transition-colors"
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Overdue Section */}
                    {overdueFollowups.length > 0 && (
                      <div className="p-2 bg-rose-50/60">
                        <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" /> Overdue Tasks ({overdueFollowups.length})
                        </div>
                        {overdueFollowups.map((f) => (
                          <div
                            key={f.id}
                            className="p-2.5 rounded-xl bg-white border border-rose-200 mb-1.5 shadow-2xs hover:bg-rose-50/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-slate-900 block">{f.companyName}</span>
                                <span className="text-[11px] text-slate-500">{f.contactPerson} • {f.reason}</span>
                              </div>
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                {f.date}
                              </span>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 mt-2 pt-1 border-t border-slate-100">
                              <button
                                onClick={() => {
                                  completeFollowUp(f.id);
                                }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Mark Done
                              </button>
                              <button
                                onClick={() => {
                                  setIsNotificationsOpen(false);
                                  onNavigate('followups');
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Manage
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Due Today Section */}
                    {dueTodayFollowups.length > 0 && (
                      <div className="p-2 bg-amber-50/60">
                        <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> Due Today ({dueTodayFollowups.length})
                        </div>
                        {dueTodayFollowups.map((f) => (
                          <div
                            key={f.id}
                            className="p-2.5 rounded-xl bg-white border border-amber-200 mb-1.5 shadow-2xs hover:bg-amber-50/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-slate-900 block">{f.companyName}</span>
                                <span className="text-[11px] text-slate-500">{f.contactPerson} • {f.reason}</span>
                              </div>
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                Today {f.time}
                              </span>
                            </div>
                            <div className="flex items-center justify-end gap-1.5 mt-2 pt-1 border-t border-slate-100">
                              <button
                                onClick={() => completeFollowUp(f.id)}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Mark Done
                              </button>
                              <button
                                onClick={() => {
                                  setIsNotificationsOpen(false);
                                  onNavigate('followups');
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors"
                              >
                                Manage
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-4">
                <button
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    onNavigate('notifications');
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Bell className="w-3 h-3" /> Notifications Center →
                </button>
                <button
                  onClick={() => {
                    setIsNotificationsOpen(false);
                    onNavigate('followups');
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  Follow-ups Schedule →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher Pill */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => switchActiveRole('admin')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              isAdmin
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Admin View
          </button>
          <button
            onClick={() => switchActiveRole('employee')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              !isAdmin
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Employee View
          </button>
        </div>

        {/* User Info / Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <span className="text-xs font-semibold text-slate-800 block leading-tight">
              {userProfile?.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {userProfile?.email}
            </span>
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
