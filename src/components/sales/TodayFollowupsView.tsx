import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Clock,
  AlertTriangle,
  Calendar,
  PhoneCall,
  CheckCircle2,
  Phone,
  RotateCcw,
  User,
  Building,
  ArrowRight,
  FileText,
  Search,
  Check,
} from 'lucide-react';
import { FollowUpRecord, Lead, Customer, STSRecord, ProposalRecord } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { FollowUpOutcomeModal } from './FollowUpOutcomeModal';

interface TodayFollowupsViewProps {
  onOpenCallModal?: (entity: any) => void;
  onOpenLeadModal?: (lead?: Lead) => void;
  onOpenSTSModal?: (sts?: STSRecord) => void;
  onOpenProposalModal?: (proposal?: ProposalRecord) => void;
}

export const TodayFollowupsView: React.FC<TodayFollowupsViewProps> = ({
  onOpenCallModal,
  onOpenLeadModal,
  onOpenSTSModal,
  onOpenProposalModal,
}) => {
  const {
    followups,
    leads,
    stsRecords,
    proposals,
    initiateCall,
    customers,
  } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'today' | 'overdue' | 'upcoming' | 'callbacks' | 'pending_proposals'>('today');
  const [selectedFollowupForOutcome, setSelectedFollowupForOutcome] = useState<FollowUpRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Employee authorization filtering
  const myFollowups = useMemo(() => {
    if (isAdmin) return followups;
    return followups.filter((f) => f.employeeId === userProfile?.uid);
  }, [followups, userProfile, isAdmin]);

  const mySTS = useMemo(() => {
    if (isAdmin) return stsRecords;
    return stsRecords.filter(
      (s) => s.assignedEmployeeId === userProfile?.uid || s.createdBy === userProfile?.uid
    );
  }, [stsRecords, userProfile, isAdmin]);

  const myProposals = useMemo(() => {
    if (isAdmin) return proposals;
    return proposals.filter(
      (p) => p.assignedEmployeeId === userProfile?.uid || p.createdBy === userProfile?.uid
    );
  }, [proposals, userProfile, isAdmin]);

  // Today's Follow-ups sorted by due time
  const todayList = useMemo(() => {
    return myFollowups
      .filter((f) => f.date === todayStr && f.status !== 'Completed' && f.status !== 'Cancelled')
      .sort((a, b) => (a.time || '11:00').localeCompare(b.time || '11:00'));
  }, [myFollowups, todayStr]);

  // Overdue follow-ups
  const overdueList = useMemo(() => {
    return myFollowups
      .filter((f) => f.date < todayStr && f.status !== 'Completed' && f.status !== 'Cancelled')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [myFollowups, todayStr]);

  // Upcoming follow-ups
  const upcomingList = useMemo(() => {
    return myFollowups
      .filter((f) => f.date > todayStr && f.status !== 'Completed' && f.status !== 'Cancelled')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [myFollowups, todayStr]);

  // Callbacks requested (from STS talkStatus == 'Callback' or follow-up reason containing callback)
  const callbacksList = useMemo(() => {
    const fromSTS = mySTS.filter((s) => s.talkStatus === 'Callback' && s.status !== 'Closed');
    return fromSTS;
  }, [mySTS]);

  // Pending Proposals (Proposals sent or draft awaiting approval/client sign)
  const pendingProposalsList = useMemo(() => {
    return myProposals.filter((p) => p.status === 'Sent' || p.status === 'Pending Approval');
  }, [myProposals]);

  const handleDial = async (fup: FollowUpRecord) => {
    const cust = customers.find((c) => c.id === fup.customerId || c.customerId === fup.customerId);
    const lead = leads.find((l) => l.id === fup.leadId || l.leadId === fup.leadId);
    const phone = cust?.mobile || cust?.phone || lead?.phone || lead?.mobile;

    if (phone) {
      await initiateCall({
        customerId: fup.customerId,
        leadId: fup.leadId,
        companyName: fup.companyName,
        contactPerson: fup.contactPerson,
        mobile: phone,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <CalendarClock className="w-4 h-4" />
            Executive Sales Action Center • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <h2 className="text-xl font-black text-slate-900">Today's Priority Follow-ups & Actions</h2>
          <p className="text-xs text-slate-500 mt-1">
            Zero-in on customer calls due today, resolve overdue tasks, and track pending proposals.
          </p>
        </div>

        {/* Quick KPI badges */}
        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Today: {todayList.length}</span>
          </div>
          {overdueList.length > 0 && (
            <div className="px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>OVERDUE: {overdueList.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('today')}
          className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'today'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Today's Follow-ups
          <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-3xs font-black">
            {todayList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('overdue')}
          className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'overdue'
              ? 'border-rose-600 text-rose-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Overdue Follow-ups
          {overdueList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-3xs font-black">
              {overdueList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('upcoming')}
          className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'upcoming'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Upcoming Follow-ups
          <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-3xs font-black">
            {upcomingList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('callbacks')}
          className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'callbacks'
              ? 'border-amber-600 text-amber-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Phone className="w-4 h-4" />
          Callbacks Requested
          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-700 text-3xs font-black">
            {callbacksList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('pending_proposals')}
          className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'pending_proposals'
              ? 'border-purple-600 text-purple-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Pending Proposals
          <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 text-3xs font-black">
            {pendingProposalsList.length}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {activeSubTab === 'today' && (
          <div className="space-y-3">
            {todayList.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <h4 className="font-bold text-slate-900 text-base">All Caught Up for Today!</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You have no pending follow-ups scheduled for today. Check upcoming follow-ups or explore the pipeline.
                </p>
              </div>
            ) : (
              todayList.map((fup) => (
                <div
                  key={fup.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase bg-blue-100 text-blue-800">
                        Due Today at {fup.time || '11:00 AM'}
                      </span>
                      {fup.priority && (
                        <span className="text-3xs font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {fup.priority} Priority
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400" />
                      {fup.companyName}
                    </h4>

                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {fup.contactPerson}
                      </span>
                      <span>•</span>
                      <span className="text-slate-500">{fup.reason}</span>
                    </div>

                    {fup.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                        "{fup.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleDial(fup)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call Client
                    </button>
                    <button
                      onClick={() => setSelectedFollowupForOutcome(fup)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Complete / Reschedule
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeSubTab === 'overdue' && (
          <div className="space-y-3">
            {overdueList.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-bold text-slate-900 text-base">No Overdue Follow-ups</h4>
                <p className="text-xs text-slate-500 mt-1">Excellent job staying on top of client commitments!</p>
              </div>
            ) : (
              overdueList.map((fup) => (
                <div
                  key={fup.id}
                  className="bg-white rounded-2xl border border-rose-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase bg-rose-100 text-rose-800">
                        OVERDUE • Due was {fup.date}
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400" />
                      {fup.companyName}
                    </h4>

                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{fup.contactPerson}</span>
                      <span>•</span>
                      <span>{fup.reason}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDial(fup)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call Now
                    </button>
                    <button
                      onClick={() => setSelectedFollowupForOutcome(fup)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5"
                    >
                      Resolve Outcome
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeSubTab === 'upcoming' && (
          <div className="space-y-3">
            {upcomingList.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No future follow-ups scheduled yet
              </div>
            ) : (
              upcomingList.map((fup) => (
                <div
                  key={fup.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                      <Calendar className="w-3.5 h-3.5" />
                      Scheduled for {fup.date} at {fup.time || '11:00'}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{fup.companyName}</h4>
                    <p className="text-xs text-slate-500">{fup.contactPerson} • {fup.reason}</p>
                  </div>
                  <button
                    onClick={() => setSelectedFollowupForOutcome(fup)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold shrink-0"
                  >
                    Update / Reschedule
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeSubTab === 'callbacks' && (
          <div className="space-y-3">
            {callbacksList.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No pending callback requests in STS
              </div>
            ) : (
              callbacksList.map((sts) => (
                <div
                  key={sts.id}
                  className="bg-white rounded-2xl border border-amber-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                      <Phone className="w-3.5 h-3.5 text-amber-600" />
                      Callback Requested on STS: {sts.stsNumber}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{sts.companyName}</h4>
                    <p className="text-xs text-slate-600 font-mono">{sts.phone || 'Phone not listed'}</p>
                    <p className="text-xs text-slate-500 italic">{sts.remarks || sts.requirement}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sts.phone && (
                      <a
                        href={`tel:${sts.phone}`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call Back
                      </a>
                    )}
                    {onOpenSTSModal && (
                      <button
                        onClick={() => onOpenSTSModal(sts)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                      >
                        Open STS
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeSubTab === 'pending_proposals' && (
          <div className="space-y-3">
            {pendingProposalsList.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No proposals pending response
              </div>
            ) : (
              pendingProposalsList.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700">
                        {p.proposalNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-purple-100 text-purple-800">
                        {p.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{p.clientName}</h4>
                    <div className="text-xs text-slate-500">
                      Amount: <span className="font-bold text-emerald-700">₹{(p.grandTotal || 0).toLocaleString('en-IN')}</span> • Sent: {p.sentAt ? new Date(p.sentAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onOpenProposalModal && (
                      <button
                        onClick={() => onOpenProposalModal(p)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                      >
                        View Proposal
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Outcome Modal */}
      <FollowUpOutcomeModal
        isOpen={!!selectedFollowupForOutcome}
        onClose={() => setSelectedFollowupForOutcome(null)}
        followup={selectedFollowupForOutcome}
      />
    </div>
  );
};
