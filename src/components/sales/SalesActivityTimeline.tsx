import React from 'react';
import {
  Clock,
  PhoneCall,
  Calendar,
  FileCheck,
  FileText,
  CreditCard,
  Target,
  Sparkles,
  ArrowRight,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { Activity } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';

interface SalesActivityTimelineProps {
  leadId?: string;
  customerId?: string;
  stsId?: string;
  limit?: number;
}

export const SalesActivityTimeline: React.FC<SalesActivityTimelineProps> = ({
  leadId,
  customerId,
  stsId,
  limit = 50,
}) => {
  const { activities } = useCrmData();

  const filteredActivities = activities
    .filter((act) => {
      if (leadId && (act.leadId === leadId || act.relatedId === leadId || act.metadata?.leadId === leadId)) {
        return true;
      }
      if (customerId && (act.customerId === customerId || act.relatedId === customerId || act.metadata?.customerId === customerId)) {
        return true;
      }
      if (stsId && (act.stsId === stsId || act.relatedId === stsId || act.metadata?.stsId === stsId)) {
        return true;
      }
      return false;
    })
    .slice(0, limit);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead_created':
        return <Target className="w-4 h-4 text-blue-600" />;
      case 'CALL_INITIATED':
      case 'call_initiated':
      case 'call_made':
        return <PhoneCall className="w-4 h-4 text-emerald-600" />;
      case 'CALL_UPDATED':
      case 'call_note_added':
        return <PhoneCall className="w-4 h-4 text-amber-600" />;
      case 'TALK_HUI':
      case 'STS_TALK_HUI':
        return <MessageSquare className="w-4 h-4 text-amber-600" />;
      case 'FOLLOWUP_CREATED':
      case 'followup_scheduled':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'FOLLOWUP_COMPLETED':
      case 'followup_completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'FOLLOWUP_RESCHEDULED':
      case 'followup_rescheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'LEAD_STATUS_CHANGED':
      case 'status_changed':
      case 'CUSTOMER_STATUS_CHANGED':
      case 'STS_STATUS_CHANGED':
        return <ArrowRight className="w-4 h-4 text-purple-600" />;
      case 'proposal_created':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'proposal_sent':
      case 'PROPOSAL_EMAIL_SENT':
        return <Mail className="w-4 h-4 text-indigo-600" />;
      case 'proposal_viewed':
      case 'PROPOSAL_VIEWED':
        return <Eye className="w-4 h-4 text-cyan-600" />;
      case 'proposal_accepted':
      case 'PROPOSAL_ACCEPTED':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case 'lead_converted':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'STS_CREATED':
      case 'sts_created':
        return <FileCheck className="w-4 h-4 text-amber-600" />;
      case 'invoice_created':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'payment_recorded':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTimestamp = (rawTs: string) => {
    try {
      const d = new Date(rawTs);
      return {
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      };
    } catch {
      return { date: rawTs, time: '' };
    }
  };

  if (filteredActivities.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-semibold">No sales activities recorded yet</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Calls, Talk Hui, follow-ups, and stage changes will appear here in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {filteredActivities.map((act) => {
        const ts = formatTimestamp(act.timestamp || act.createdAt || '');
        return (
          <div key={act.id} className="relative group">
            {/* Timeline bullet icon */}
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center group-hover:border-blue-500 group-hover:scale-110 transition-all shadow-2xs">
              {getActivityIcon(act.type)}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span>{act.title}</span>
                  <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {act.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  {ts.date} • {ts.time}
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{act.description}</p>

              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>{act.userName || 'System Executive'}</span>
                </span>
                {act.metadata?.status && (
                  <span className="font-semibold text-slate-700">
                    Status: {act.metadata.status}
                  </span>
                )}
                {act.metadata?.talkStatus && (
                  <span className="font-semibold text-amber-700">
                    Talk Hui: {act.metadata.talkStatus}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
