import React, { useState } from 'react';
import { Activity, Clock, Search, Filter, Phone, FileText, Target, Building2, User } from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';

export const ActivitiesView: React.FC = () => {
  const { activities } = useCrmData();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filtered = activities.filter((a) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.userName.toLowerCase().includes(q);

    const matchesType = typeFilter === 'ALL' || a.type.includes(typeFilter);
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Complete CRM Activity & Audit Feed ({filtered.length})
          </h2>
          <p className="text-xs text-slate-500">
            Real-time chronological timeline of all user actions, stage conversions, calls, and dispatched proposals
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search activity description, user..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">All Event Types</option>
            <option value="lead">Lead Events</option>
            <option value="customer">Customer Events</option>
            <option value="call">Call Records</option>
            <option value="followup">Follow-ups</option>
            <option value="sts">STS Events</option>
            <option value="proposal">Proposals</option>
            <option value="email">Emails</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 stroke-1" />
            <p className="text-xs">No activity records match current filter.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filtered.map((act) => (
              <div key={act.id} className="relative group">
                <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-white ring-2 ring-slate-100" />
                <div className="bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-1">
                    <span className="font-bold text-slate-900 text-sm">{act.title}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(act.timestamp).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{act.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> Logged by: {act.userName} ({act.userRole})
                    </span>
                    <span>•</span>
                    <span className="font-mono uppercase text-[10px] bg-slate-200/80 px-1.5 py-0.5 rounded-sm text-slate-700 font-semibold">
                      {act.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
