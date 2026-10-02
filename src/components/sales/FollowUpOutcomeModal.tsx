import React, { useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  AlertCircle,
  X,
  FileText,
  RotateCcw,
  UserX,
  ThumbsDown,
  Sparkles,
} from 'lucide-react';
import { FollowUpRecord } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';

interface FollowUpOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  followup: FollowUpRecord | null;
}

type FollowUpOutcome =
  | 'Completed'
  | 'Rescheduled'
  | 'Customer Not Available'
  | 'Not Interested'
  | 'Converted'
  | 'Other';

export const FollowUpOutcomeModal: React.FC<FollowUpOutcomeModalProps> = ({
  isOpen,
  onClose,
  followup,
}) => {
  const { completeFollowUpWithOutcome } = useCrmData();
  const [outcome, setOutcome] = useState<FollowUpOutcome>('Completed');
  const [notes, setNotes] = useState('');
  const [newDate, setNewDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [newTime, setNewTime] = useState('11:00');
  const [rescheduleReason, setRescheduleReason] = useState('Client requested rescheduling');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !followup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (outcome === 'Rescheduled' && !newDate) {
      setError('Please select a new follow-up date.');
      return;
    }

    setIsSubmitting(true);
    try {
      await completeFollowUpWithOutcome(
        followup.id,
        outcome,
        notes.trim(),
        outcome === 'Rescheduled'
          ? {
              date: newDate,
              time: newTime,
              reason: rescheduleReason.trim(),
            }
          : undefined
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const outcomeOptions: Array<{
    value: FollowUpOutcome;
    label: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      value: 'Completed',
      label: 'Completed (पूर्ण हुआ)',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      color: 'hover:border-emerald-300',
    },
    {
      value: 'Rescheduled',
      label: 'Rescheduled (आगे बढ़ाया)',
      icon: <RotateCcw className="w-4 h-4 text-blue-600" />,
      color: 'hover:border-blue-300',
    },
    {
      value: 'Customer Not Available',
      label: 'Customer Not Available',
      icon: <UserX className="w-4 h-4 text-amber-600" />,
      color: 'hover:border-amber-300',
    },
    {
      value: 'Not Interested',
      label: 'Not Interested (रुचि नहीं है)',
      icon: <ThumbsDown className="w-4 h-4 text-rose-600" />,
      color: 'hover:border-rose-300',
    },
    {
      value: 'Converted',
      label: 'Converted to Deal / Customer',
      icon: <Sparkles className="w-4 h-4 text-purple-600" />,
      color: 'hover:border-purple-300',
    },
    {
      value: 'Other',
      label: 'Other Outcome',
      icon: <FileText className="w-4 h-4 text-slate-600" />,
      color: 'hover:border-slate-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-linear-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-lg">Follow-up Outcome</h3>
              <p className="text-xs text-blue-100">
                {followup.companyName} • Due: {followup.date} {followup.time}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-blue-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Follow-up Resolution Outcome *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {outcomeOptions.map((opt) => {
                const isSelected = outcome === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOutcome(opt.value)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 text-sm font-semibold transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-blue-950 ring-2 ring-blue-500/20 shadow-xs'
                        : `border-slate-200 text-slate-700 bg-white ${opt.color}`
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {outcome === 'Rescheduled' && (
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                Reschedule Details (Mandatory)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    New Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    New Time
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reschedule Reason
                </label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Decision maker out of town till Monday"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Outcome Notes / Remarks
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record details of what was discussed, objections raised, or next action items..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Recording...' : outcome === 'Rescheduled' ? 'Save & Reschedule' : 'Complete Follow-up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
