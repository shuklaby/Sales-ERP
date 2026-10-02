import React, { useState } from 'react';
import {
  Settings,
  Bell,
  Users,
  Shield,
  LogOut,
  UserPlus,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { CustomerRole } from '../../../types/crm';

export const CustomerSettingsView: React.FC = () => {
  const {
    customerUser,
    customerCompany,
    customerUsers,
    inviteOrganizationUser,
    deactivateOrganizationUser,
    logout,
  } = useCustomerPortal();

  // Notification Preferences
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [paymentNotifs, setPaymentNotifs] = useState(true);
  const [proposalNotifs, setProposalNotifs] = useState(true);
  const [supportNotifs, setSupportNotifs] = useState(true);
  const [savedPreferences, setSavedPreferences] = useState(false);

  // Invite Team Member Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CustomerRole>('Customer User');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  const isCustomerAdmin = customerUser?.role === 'Customer Admin';

  const handleSavePreferences = () => {
    setSavedPreferences(true);
    setTimeout(() => setSavedPreferences(false), 3000);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError('');
    setInviteSuccess('');

    const res = await inviteOrganizationUser(inviteName, inviteEmail, inviteRole);
    setIsInviting(false);

    if (res.success) {
      setInviteSuccess(`Invitation dispatched to ${inviteEmail}.`);
      setInviteName('');
      setInviteEmail('');
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteSuccess('');
      }, 2500);
    } else {
      setInviteError(res.error || 'Failed to send invitation');
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    if (confirm(`Deactivate access for ${userName}? They will no longer be able to log in.`)) {
      await deactivateOrganizationUser(userId);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" /> Portal Settings & Organization
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure notification dispatch, collaborate with organization colleagues, and manage security
        </p>
      </div>

      {/* 1. Notification Preferences (Section 35) */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" /> Notification Dispatch Preferences
          </h3>
          {savedPreferences && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-800/20 transition">
            <div>
              <span className="font-semibold text-white block">Email Dispatch Alerts</span>
              <span className="text-[11px] text-slate-400">Receive summary notifications in your primary inbox</span>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => {
                setEmailNotifs(e.target.checked);
                handleSavePreferences();
              }}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-800/20 transition">
            <div>
              <span className="font-semibold text-white block">Payment & Receipt Confirmations</span>
              <span className="text-[11px] text-slate-400">Immediate alerts when invoice transactions settle</span>
            </div>
            <input
              type="checkbox"
              checked={paymentNotifs}
              onChange={(e) => {
                setPaymentNotifs(e.target.checked);
                handleSavePreferences();
              }}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-800/20 transition">
            <div>
              <span className="font-semibold text-white block">Proposal & Contract Updates</span>
              <span className="text-[11px] text-slate-400">Notifications when proposals are issued or revised</span>
            </div>
            <input
              type="checkbox"
              checked={proposalNotifs}
              onChange={(e) => {
                setProposalNotifs(e.target.checked);
                handleSavePreferences();
              }}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-800/20 transition">
            <div>
              <span className="font-semibold text-white block">Support Ticket Replies</span>
              <span className="text-[11px] text-slate-400">Updates when engineers and support personnel respond</span>
            </div>
            <input
              type="checkbox"
              checked={supportNotifs}
              onChange={(e) => {
                setSupportNotifs(e.target.checked);
                handleSavePreferences();
              }}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
          </label>
        </div>
      </div>

      {/* 2. Organization User Management (Section 37, 38, 39) */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> Authorized Organization Users ({customerUsers.length})
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Colleagues authorized to view proposals, invoices, and tickets for {customerCompany?.companyName}
            </p>
          </div>

          {isCustomerAdmin && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
            >
              <UserPlus className="w-3.5 h-3.5" /> Invite Colleague
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-800/60 text-xs">
          {customerUsers.map((u) => {
            const isMe = u.customerUserId === customerUser?.customerUserId;
            const isSuspended = u.status === 'Suspended' || u.status === 'Disabled';
            return (
              <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{u.name}</span>
                    {isMe && (
                      <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        You
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                        u.role === 'Customer Admin'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {u.role}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                        isSuspended
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : u.status === 'Invited'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {u.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{u.email}</div>
                </div>

                {isCustomerAdmin && !isMe && !isSuspended && (
                  <button
                    onClick={() => handleDeactivate(u.id, u.name)}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-medium"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Session & Security Logout */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" /> Session Security
        </h3>
        <p className="text-xs text-slate-400">
          Active authenticated session for {customerUser?.email}. Sign out to terminate portal access on this device.
        </p>

        <button
          onClick={logout}
          className="px-4 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 rounded-xl text-xs font-bold transition inline-flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out of Customer Portal
        </button>
      </div>

      {/* Invite Organization Colleague Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" /> Invite Organization Colleague
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Colleague Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="rahul@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Access Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as CustomerRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Customer User">Customer User (View & Pay)</option>
                  <option value="Customer Admin">Customer Admin (Manage Users & Approvals)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {isInviting ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
