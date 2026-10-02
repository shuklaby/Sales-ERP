import React, { useState, useMemo } from 'react';
import {
  Kanban,
  List,
  Search,
  Filter,
  DollarSign,
  Phone,
  Calendar,
  Sparkles,
  ArrowRight,
  User,
  Plus,
  ArrowUpRight,
  TrendingUp,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Lead, Customer, STSRecord } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';

interface SalesPipelineKanbanProps {
  onOpenLeadModal: (lead?: Lead) => void;
  onOpenCallModal?: (lead: Lead) => void;
  onOpenFollowUpModal?: (lead: Lead) => void;
  onConvertLead?: (lead: Lead) => void;
}

export const SalesPipelineKanban: React.FC<SalesPipelineKanbanProps> = ({
  onOpenLeadModal,
  onOpenCallModal,
  onOpenFollowUpModal,
  onConvertLead,
}) => {
  const { leads, salesStatuses, updateLeadPipelineStage, employees, initiateCall } = useCrmData();
  const { isAdmin, userProfile, hasPermission } = useAuth();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [repFilter, setRepFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Permission filter
  const permittedLeads = useMemo(() => {
    if (isAdmin || hasPermission('canViewAllCustomers') || hasPermission('viewCustomers')) {
      return leads;
    }
    return leads.filter(
      (l) => l.assignedEmployeeId === userProfile?.uid || l.createdBy === userProfile?.uid
    );
  }, [leads, isAdmin, hasPermission, userProfile]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return permittedLeads.filter((l) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.companyName.toLowerCase().includes(q) ||
        l.contactPerson.toLowerCase().includes(q) ||
        (l.leadNumber && l.leadNumber.toLowerCase().includes(q)) ||
        (l.leadId && l.leadId.toLowerCase().includes(q)) ||
        (l.mobile && l.mobile.includes(q));

      const matchesRep = repFilter === 'ALL' || l.assignedEmployeeId === repFilter;
      const matchesPriority = priorityFilter === 'ALL' || l.priority === priorityFilter;

      return matchesSearch && matchesRep && matchesPriority;
    });
  }, [permittedLeads, searchTerm, repFilter, priorityFilter]);

  // Stages from salesStatuses or standard fallback
  const pipelineStages = useMemo(() => {
    if (salesStatuses && salesStatuses.length > 0) {
      return salesStatuses
        .filter((s) => s.isActive)
        .sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0))
        .map((s) => s.name);
    }
    return [
      'New',
      'Contacted',
      'Interested',
      'Proposal Sent',
      'Negotiation',
      'Won',
      'Lost',
    ];
  }, [salesStatuses]);

  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    pipelineStages.forEach((stage) => {
      map[stage] = [];
    });

    filteredLeads.forEach((lead) => {
      const stage = pipelineStages.includes(String(lead.status)) ? String(lead.status) : 'New';
      if (!map[stage]) map[stage] = [];
      map[stage].push(lead);
    });

    return map;
  }, [filteredLeads, pipelineStages]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId || l.leadId === leadId);
    if (!lead || lead.status === targetStage) return;

    setIsUpdating(leadId);
    try {
      await updateLeadPipelineStage(lead.id, targetStage);
    } catch (err) {
      console.error('Failed to move stage:', err);
    } finally {
      setIsUpdating(null);
      setDraggedLeadId(null);
    }
  };

  const handleQuickMove = async (lead: Lead, targetStage: string) => {
    if (lead.status === targetStage) return;
    setIsUpdating(lead.id);
    try {
      await updateLeadPipelineStage(lead.id, targetStage);
    } catch (err) {
      console.error('Quick move failed:', err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCallLead = async (lead: Lead) => {
    const num = lead.phone || lead.mobile;
    if (num) {
      await initiateCall({
        leadId: lead.id,
        companyName: lead.companyName,
        contactPerson: lead.contactPerson,
        mobile: num,
      });
      if (onOpenCallModal) {
        onOpenCallModal(lead);
      }
    }
  };

  const getStageColor = (stage: string) => {
    const s = stage.toLowerCase();
    if (s.includes('new')) return 'border-t-blue-500 bg-blue-50/40 text-blue-900';
    if (s.includes('contacted')) return 'border-t-indigo-500 bg-indigo-50/40 text-indigo-900';
    if (s.includes('interested')) return 'border-t-amber-500 bg-amber-50/40 text-amber-900';
    if (s.includes('proposal')) return 'border-t-purple-500 bg-purple-50/40 text-purple-900';
    if (s.includes('negotiation')) return 'border-t-cyan-500 bg-cyan-50/40 text-cyan-900';
    if (s.includes('won') || s.includes('converted')) return 'border-t-emerald-500 bg-emerald-50/40 text-emerald-900';
    if (s.includes('lost')) return 'border-t-rose-500 bg-rose-50/40 text-rose-900';
    return 'border-t-slate-400 bg-slate-50 text-slate-800';
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'Urgent':
        return <span className="px-1.5 py-0.5 rounded text-3xs font-extrabold uppercase bg-rose-100 text-rose-700">Urgent</span>;
      case 'High':
        return <span className="px-1.5 py-0.5 rounded text-3xs font-bold uppercase bg-amber-100 text-amber-800">High</span>;
      case 'Low':
        return <span className="px-1.5 py-0.5 rounded text-3xs font-medium uppercase bg-slate-100 text-slate-600">Low</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-3xs font-medium uppercase bg-blue-100 text-blue-700">Med</span>;
    }
  };

  const totalValue = filteredLeads.reduce((acc, l) => acc + (Number(l.estimatedValue) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search pipeline leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Sales Rep Filter */}
          {(isAdmin || hasPermission('canViewAllCustomers')) && (
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Executives</option>
              {employees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.name} ({emp.department || 'Sales'})
                </option>
              ))}
            </select>
          )}

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="text-xs text-slate-500 font-medium">
            Active Deals:{' '}
            <span className="font-black text-slate-900">{filteredLeads.length}</span> (
            <span className="font-bold text-emerald-600">
              ₹{totalValue.toLocaleString('en-IN')}
            </span>
            )
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <button
            onClick={() => onOpenLeadModal()}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1300px]">
            {pipelineStages.map((stage, sIdx) => {
              const stageLeads = leadsByStage[stage] || [];
              const stageValue = stageLeads.reduce(
                (sum, l) => sum + (Number(l.estimatedValue) || 0),
                0
              );

              return (
                <div
                  key={stage}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage)}
                  className="flex-1 bg-slate-100/70 rounded-2xl border border-slate-200 flex flex-col max-h-[750px] shadow-2xs"
                >
                  {/* Column Header */}
                  <div className={`p-3.5 rounded-t-2xl border-t-4 border-b border-slate-200 ${getStageColor(stage)}`}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm tracking-tight">{stage}</h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-white/90 shadow-2xs">
                        {stageLeads.length}
                      </span>
                    </div>
                    <div className="text-2xs font-semibold text-slate-600 mt-1">
                      ₹{stageValue.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Column Cards Dropzone */}
                  <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                    {stageLeads.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                        No leads in {stage}
                      </div>
                    ) : (
                      stageLeads.map((lead) => {
                        const isBeingUpdated = isUpdating === lead.id;

                        return (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            className={`bg-white rounded-xl border border-slate-200 p-3 shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing group relative ${
                              isBeingUpdated ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5 mb-1.5">
                              <div>
                                <div className="text-3xs font-mono font-bold text-slate-400">
                                  {lead.leadNumber || lead.leadId}
                                </div>
                                <h5
                                  onClick={() => onOpenLeadModal(lead)}
                                  className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-1"
                                >
                                  {lead.companyName}
                                </h5>
                              </div>
                              <div className="shrink-0">{getPriorityBadge(lead.priority)}</div>
                            </div>

                            <div className="text-xs text-slate-600 flex items-center gap-1.5 mb-2">
                              <User className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{lead.contactPerson}</span>
                            </div>

                            {/* Estimated Value & Source */}
                            <div className="flex items-center justify-between text-xs font-semibold py-1.5 border-t border-slate-100 mb-2">
                              <span className="text-emerald-700 font-bold">
                                ₹{(Number(lead.estimatedValue) || 0).toLocaleString('en-IN')}
                              </span>
                              <span className="text-3xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {lead.source || lead.leadSource || 'Direct'}
                              </span>
                            </div>

                            {/* Assigned Rep & Quick Action Buttons */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="text-3xs text-slate-400 truncate max-w-[90px]">
                                {lead.assignedEmployeeName || 'Unassigned'}
                              </div>

                              <div className="flex items-center gap-1">
                                {lead.phone || lead.mobile ? (
                                  <button
                                    title="Quick Call (tel:)"
                                    onClick={() => handleCallLead(lead)}
                                    className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </button>
                                ) : null}

                                <button
                                  title="Add Follow-up"
                                  onClick={() => onOpenFollowUpModal && onOpenFollowUpModal(lead)}
                                  className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors"
                                >
                                  <Calendar className="w-3 h-3" />
                                </button>

                                {lead.status !== 'Won' && (
                                  <button
                                    title="Convert to Customer"
                                    onClick={() => onConvertLead && onConvertLead(lead)}
                                    className="p-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                  </button>
                                )}

                                {/* Move Stage Arrow */}
                                {sIdx < pipelineStages.length - 1 && (
                                  <button
                                    title={`Move to next: ${pipelineStages[sIdx + 1]}`}
                                    onClick={() => handleQuickMove(lead, pipelineStages[sIdx + 1])}
                                    className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black uppercase tracking-wider text-3xs border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Lead Code</th>
                  <th className="px-4 py-3">Company & Contact</th>
                  <th className="px-4 py-3">Stage / Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Est. Value</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No leads matching filter criteria
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">
                        {lead.leadNumber || lead.leadId}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onOpenLeadModal(lead)}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                        >
                          {lead.companyName}
                        </button>
                        <div className="text-3xs text-slate-500">
                          {lead.contactPerson} • {lead.phone || lead.mobile}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => handleQuickMove(lead, e.target.value)}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        >
                          {pipelineStages.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">{getPriorityBadge(lead.priority)}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        ₹{(Number(lead.estimatedValue) || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {lead.source || lead.leadSource || 'Direct'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {lead.assignedEmployeeName || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.phone || lead.mobile ? (
                            <button
                              onClick={() => handleCallLead(lead)}
                              title="Call"
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => onOpenFollowUpModal && onOpenFollowUpModal(lead)}
                            title="Follow-up"
                            className="p-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          {lead.status !== 'Won' && (
                            <button
                              onClick={() => onConvertLead && onConvertLead(lead)}
                              title="Convert to Customer"
                              className="p-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
