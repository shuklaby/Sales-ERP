import React, { useState } from 'react';
import {
  PhoneCall,
  CheckCircle2,
  XCircle,
  Clock,
  PhoneOff,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { STSRecord } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';

interface TalkHuiModalProps {
  isOpen: boolean;
  onClose: () => void;
  sts: STSRecord | null;
}

export const TalkHuiModal: React.FC<TalkHuiModalProps> = ({ isOpen, onClose, sts }) => {
  const { recordTalkHui } = useCrmData();
  const [talkStatus, setTalkStatus] = useState<'Yes' | 'No' | 'Callback' | 'Not Reachable'>('Yes');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sts) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await recordTalkHui(sts.id, talkStatus, remarks.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to record Talk Hui status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const options: Array<{
    value: 'Yes' | 'No' | 'Callback' | 'Not Reachable';
    label: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      value: 'Yes',
      label: 'Yes (बात हुई)',
      desc: 'Successfully connected & spoke with client',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      color: 'border-emerald-300 hover:bg-emerald-50 text-emerald-900',
    },
    {
      value: 'No',
      label: 'No (बात नहीं हुई)',
      desc: 'Attempted call, did not connect or disconnected',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      color: 'border-rose-300 hover:bg-rose-50 text-rose-900',
    },
    {
      value: 'Callback',
      label: 'Callback (कॉल बैक बोला)',
      desc: 'Client requested to call back at later time',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      color: 'border-amber-300 hover:bg-amber-50 text-amber-900',
    },
    {
      value: 'Not Reachable',
      label: 'Not Reachable (संपर्क नहीं हो पाया)',
      desc: 'Switched off, network issue, or out of coverage',
      icon: <PhoneOff className="w-5 h-5 text-slate-600" />,
      color: 'border-slate-300 hover:bg-slate-50 text-slate-900',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="bg-linear-to-r from-amber-600 to-amber-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <PhoneCall className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-lg">Talk Hui (बात हुई?) Quick Action</h3>
              <p className="text-xs text-amber-100">
                STS: {sts.stsNumber} • {sts.companyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white p-1 rounded-lg hover:bg-amber-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Discussion Outcome
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {options.map((opt) => {
                const isSelected = talkStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTalkStatus(opt.value)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="mt-0.5">{opt.icon}</div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">{opt.label}</div>
                      <div className="text-xs text-slate-500 leading-tight">{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Discussion Remarks / Key Points (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Client requested technical specs for 500kVA transformer; call back Friday 2pm"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
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
              className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Recording...' : 'Save & Record Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
