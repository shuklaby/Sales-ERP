import React from 'react';
import {
  Bell,
  CheckCircle2,
  FileText,
  CreditCard,
  LifeBuoy,
  FileCheck,
  FolderOpen,
  CheckCheck,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';

export const CustomerNotificationsView: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead, setActiveTab } = useCustomerPortal();

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'PROPOSAL_SENT':
      case 'PROPOSAL_VIEWED':
      case 'PROPOSAL_ACCEPTED':
      case 'PROPOSAL_REJECTED':
        return <FileText className="w-4 h-4 text-purple-400" />;
      case 'INVOICE_CREATED':
      case 'PAYMENT_REMINDER':
      case 'PAYMENT_CONFIRMED':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'RECEIPT_GENERATED':
        return <FileCheck className="w-4 h-4 text-emerald-400" />;
      case 'TICKET_UPDATED':
        return <LifeBuoy className="w-4 h-4 text-blue-400" />;
      case 'DOCUMENT_SHARED':
        return <FolderOpen className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleNotificationClick = (n: any) => {
    markNotificationRead(n.id);
    if (n.relatedType === 'proposal') {
      setActiveTab('proposals');
    } else if (n.relatedType === 'invoice') {
      setActiveTab('invoices');
    } else if (n.relatedType === 'ticket') {
      setActiveTab('support');
    } else if (n.relatedType === 'document') {
      setActiveTab('documents');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" /> Notifications & Activity
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time alerts regarding proposals, invoices, payment confirmations, and support updates
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={() => markAllNotificationsRead()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <CheckCheck className="w-3.5 h-3.5 text-blue-400" /> Mark All as Read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {notifications.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Bell className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Notifications</p>
            <p className="text-[11px] text-slate-500">
              When documents are shared, invoices generated, or tickets replied to, you will receive notifications here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer transition ${
                  !n.read ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotifIcon(n.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs font-bold ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                        {n.title}
                      </h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-500 block">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markNotificationRead(n.id);
                    }}
                    className="p-1 text-slate-500 hover:text-slate-300 text-[10px] font-semibold"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
