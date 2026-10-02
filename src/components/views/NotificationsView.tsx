import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Mail,
  Target,
  Building,
  CheckCheck,
  Filter,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Inbox,
  AlertTriangle,
  Sparkles,
  Eye,
  XCircle,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { NotificationRecord, NotificationType } from '../../types/crm';
import { ActiveView } from '../common/Sidebar';

interface NotificationsViewProps {
  onNavigate?: (view: ActiveView) => void;
  onSelectProposalDirect?: (proposalId: string) => void;
  onSelectCustomerDirect?: (customerId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onNavigate,
  onSelectProposalDirect,
  onSelectCustomerDirect,
}) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useCrmData();
  const { isAdmin, userProfile } = useAuth();

  const [typeFilter, setTypeFilter] = useState<'all' | 'unread' | NotificationType>('all');

  // Filter notifications for current user authorization (Section 25)
  const userNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (isAdmin) return true;
      return n.userId === 'all_admins' || n.userId === userProfile?.uid;
    });
  }, [notifications, isAdmin, userProfile]);

  const filteredNotifications = useMemo(() => {
    let list = userNotifications;
    if (typeFilter === 'unread') {
      list = list.filter((n) => !n.read);
    } else if (typeFilter !== 'all') {
      list = list.filter((n) => n.type === typeFilter);
    }
    return list;
  }, [userNotifications, typeFilter]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter((n) => !n.read).length;
  }, [userNotifications]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'PROPOSAL_VIEWED':
        return <Eye className="w-4 h-4 text-blue-600" />;
      case 'PROPOSAL_ACCEPTED':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'PROPOSAL_REJECTED':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'PROPOSAL_SENT':
        return <Mail className="w-4 h-4 text-indigo-600" />;
      case 'EMAIL_FAILED':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'NEW_CUSTOMER':
        return <Building className="w-4 h-4 text-indigo-600" />;
      case 'NEW_LEAD':
        return <Target className="w-4 h-4 text-amber-600" />;
      case 'FOLLOWUP_DUE':
      case 'FOLLOWUP_OVERDUE':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleNotificationClick = async (notif: NotificationRecord) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }

    if (notif.relatedType === 'proposal' && notif.relatedId) {
      onSelectProposalDirect?.(notif.relatedId);
      onNavigate?.('proposals');
    } else if (notif.relatedType === 'customer' && notif.relatedId) {
      onSelectCustomerDirect?.(notif.relatedId);
      onNavigate?.('customers');
    } else if (notif.relatedType === 'email') {
      onNavigate?.('emails' as any);
    } else if (notif.relatedType === 'followup') {
      onNavigate?.('followups');
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Real-Time Feed
            </span>
            <span className="text-xs font-semibold text-slate-400">• SparkGenTechnology</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <Bell className="w-7 h-7 text-indigo-600" />
            Notification & Alerts Center
          </h1>
          <p className="text-xs text-slate-500">
            Real-time notifications for proposal views, customer responses, email transmission failures, and commercial follow-ups.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllNotificationsAsRead()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <CheckCheck className="w-4 h-4" /> Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2 overflow-x-auto text-xs">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            typeFilter === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({userNotifications.length})
        </button>
        <button
          onClick={() => setTypeFilter('unread')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            typeFilter === 'unread'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setTypeFilter('PROPOSAL_VIEWED')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            typeFilter === 'PROPOSAL_VIEWED'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Views
        </button>
        <button
          onClick={() => setTypeFilter('PROPOSAL_ACCEPTED')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            typeFilter === 'PROPOSAL_ACCEPTED'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Accepted
        </button>
        <button
          onClick={() => setTypeFilter('EMAIL_FAILED')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            typeFilter === 'EMAIL_FAILED'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Delivery Failures
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Inbox className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No notifications to display</p>
            <p className="text-xs text-slate-400">
              When clients interact with proposals or email dispatches occur, real-time alerts will stream here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                  !n.read ? 'bg-indigo-50/30 hover:bg-indigo-50/60' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                      !n.read ? 'bg-indigo-100 text-indigo-700 shadow-2xs' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{n.message}</p>
                    <span className="text-[11px] text-slate-400 font-mono block">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markNotificationAsRead(n.id);
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 text-xs"
                    title={n.read ? 'Read' : 'Mark as read'}
                  >
                    {n.read ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
