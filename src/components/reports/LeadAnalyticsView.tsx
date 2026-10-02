import React, { useState, useMemo } from 'react';
import {
  Target,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  BarChart2,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, Lead } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const LeadAnalyticsView: React.FC = () => {
  const { leads, employees, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    employeeId: 'ALL',
    source: 'ALL',
    status: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDimension, setActiveDimension] = useState<'status' | 'source' | 'employee' | 'monthly'>('status');

  const [drillDownState, setDrillDownState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    data: any[];
    columns: DrillDownColumn[];
  }>({
    isOpen: false,
    title: '',
    data: [],
    columns: [],
  });

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPreset(filters.datePreset, filters.startDate, filters.endDate);
  }, [filters.datePreset, filters.startDate, filters.endDate]);

  const scopedLeads = useMemo(() => {
    if (isAdmin) return leads;
    return leads.filter(
      (l) => l.assignedEmployeeId === userProfile?.uid || l.createdBy === userProfile?.uid
    );
  }, [leads, isAdmin, userProfile]);

  const filteredLeads = useMemo(() => {
    return scopedLeads.filter((l) => {
      if (!isWithinDateRange(l.createdAt, activeDateRange)) return false;
      if (filters.employeeId && filters.employeeId !== 'ALL') {
        if (l.assignedEmployeeId !== filters.employeeId && l.createdBy !== filters.employeeId) return false;
      }
      if (filters.source && filters.source !== 'ALL') {
        if (l.source !== filters.source) return false;
      }
      if (filters.status && filters.status !== 'ALL') {
        if (l.status !== filters.status) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          (l.companyName || '').toLowerCase().includes(q) ||
          (l.contactPerson || '').toLowerCase().includes(q) ||
          (l.leadId || '').toLowerCase().includes(q) ||
          (l.phone || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [scopedLeads, activeDateRange, filters, searchQuery]);

  // Lead metrics according to requirements
  const leadMetrics = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const newLeads = filteredLeads.filter((l) => l.status === 'New').length;
    const contacted = filteredLeads.filter((l) => l.status === 'Contacted').length;
    const followup = filteredLeads.filter((l) => l.status === 'Follow-up' || (l.status as any) === 'Follow Up').length;
    const qualified = filteredLeads.filter((l) => l.status === 'Qualified').length;
    const proposal = filteredLeads.filter((l) => l.status === 'Proposal' || (l.status as any) === 'Proposal Sent').length;
    const won = filteredLeads.filter((l) => l.status === 'Won').length;
    const lost = filteredLeads.filter((l) => l.status === 'Lost').length;
    const converted = filteredLeads.filter(
      (l) => l.isConverted || l.status === 'Converted' || l.status === 'Customer Created'
    ).length;

    // Conversion Rate = Converted Leads / Total Leads × 100
    const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : '0.0';

    return {
      totalLeads,
      newLeads,
      contacted,
      followup,
      qualified,
      proposal,
      won,
      lost,
      converted,
      conversionRate,
    };
  }, [filteredLeads]);

  const leadColumns: DrillDownColumn[] = [
    { header: 'Lead ID', accessor: 'leadId' },
    { header: 'Company Name', accessor: 'companyName' },
    { header: 'Contact Person', accessor: 'contactPerson' },
    { header: 'Mobile/Phone', accessor: 'mobile', format: (val, row) => val || row.phone || '—' },
    { header: 'Source', accessor: 'source' },
    { header: 'Status', accessor: 'status' },
    { header: 'Assigned', accessor: 'assignedEmployeeName' },
    { header: 'Created', accessor: 'createdAt', format: (val) => formatDateDisplayIST(val) },
  ];

  // Grouped performance datasets (Source, Employee, Monthly, Status)
  const groupedData = useMemo(() => {
    const map = new Map<string, { label: string; count: number; convertedCount: number; items: Lead[] }>();

    filteredLeads.forEach((l) => {
      let key = 'Other';
      let label = 'Other';

      if (activeDimension === 'status') {
        key = l.status || 'New';
        label = key;
      } else if (activeDimension === 'source') {
        key = l.source || 'Direct';
        label = key;
      } else if (activeDimension === 'employee') {
        const emp = employees.find((e) => e.uid === l.assignedEmployeeId || e.uid === l.createdBy);
        key = emp ? emp.name || emp.email : 'Unassigned';
        label = key;
      } else if (activeDimension === 'monthly') {
        const m = (l.createdAt || '').substring(0, 7);
        key = m || 'Unknown';
        label = m || 'Unknown';
      }

      const existing = map.get(key) || { label, count: 0, convertedCount: 0, items: [] };
      existing.count += 1;
      if (l.isConverted || l.status === 'Converted' || l.status === 'Customer Created') {
        existing.convertedCount += 1;
      }
      existing.items.push(l);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filteredLeads, activeDimension, employees]);

  const maxCount = useMemo(() => {
    return Math.max(...groupedData.map((d) => d.count), 1);
  }, [groupedData]);

  // Exports
  const handleExportExcel = () => {
    const rows = filteredLeads.map((l) => ({
      'Lead ID': l.leadId || '',
      Company: l.companyName,
      Contact: l.contactPerson,
      Phone: l.mobile || l.phone || '',
      Source: l.source || '',
      Status: l.status,
      Assigned: l.assignedEmployeeName || '',
      Converted: l.isConverted ? 'Yes' : 'No',
      Date: l.createdAt || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lead_Analytics');
    XLSX.writeFile(wb, `SparkGen_LeadAnalytics_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = filteredLeads.map((l) => ({
      'Lead ID': l.leadId || '',
      Company: l.companyName,
      Contact: l.contactPerson,
      Phone: l.mobile || l.phone || '',
      Source: l.source || '',
      Status: l.status,
      Assigned: l.assignedEmployeeName || '',
      Converted: l.isConverted ? 'Yes' : 'No',
      Date: l.createdAt || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_LeadAnalytics_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = filteredLeads.map((l) => ({
      'Lead ID': l.leadId || '',
      Company: l.companyName,
      Contact: l.contactPerson,
      Phone: l.mobile || l.phone || '',
      Source: l.source || '',
      Status: l.status,
      Assigned: l.assignedEmployeeName || '',
      Converted: l.isConverted ? 'Yes' : 'No',
    }));

    const doc = generateReportPdf({
      reportTitle: `Comprehensive Lead Commercial Performance Analytics`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Employee: filters.employeeId || 'ALL',
        Source: filters.source || 'ALL',
        Status: filters.status || 'ALL',
      },
      summaryMetrics: [
        { label: 'Total Leads', value: String(leadMetrics.totalLeads) },
        { label: 'Converted', value: String(leadMetrics.converted) },
        { label: 'Conversion Rate', value: `${leadMetrics.conversionRate}%` },
        { label: 'New in Period', value: String(leadMetrics.newLeads) },
      ],
      columns: [
        { header: 'Lead ID', dataKey: 'Lead ID' },
        { header: 'Company', dataKey: 'Company' },
        { header: 'Contact', dataKey: 'Contact' },
        { header: 'Source', dataKey: 'Source' },
        { header: 'Status', dataKey: 'Status', align: 'center' },
        { header: 'Assigned', dataKey: 'Assigned' },
        { header: 'Converted', dataKey: 'Converted', align: 'center' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_LeadAnalytics_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() =>
          setFilters({
            datePreset: 'This Month',
            employeeId: 'ALL',
            source: 'ALL',
            status: 'ALL',
          })
        }
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showEmployeeFilter={true}
        showStatusFilter={true}
        showSourceFilter={true}
        statusOptions={['New', 'Contacted', 'Follow-up', 'Qualified', 'Proposal', 'Won', 'Lost', 'Converted']}
        sourceOptions={['Website', 'Referral', 'Cold Call', 'Social Media', 'Trade Show', 'Direct', 'Inbound']}
        totalRecordsCount={filteredLeads.length}
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Total Filtered Leads',
              subtitle: 'All leads meeting current filter criteria',
              data: filteredLeads,
              columns: leadColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Total Leads</div>
          <div className="text-xl font-black text-slate-900 mt-1">{leadMetrics.totalLeads}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Click for drill-down</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'New Leads',
              subtitle: 'Leads with status "New"',
              data: filteredLeads.filter((l) => l.status === 'New'),
              columns: leadColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">New Leads</div>
          <div className="text-xl font-black text-blue-600 mt-1">{leadMetrics.newLeads}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Awaiting initial action</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Qualified & In Progress',
              subtitle: 'Leads currently contacted, qualified or in follow-up',
              data: filteredLeads.filter((l) => ['Contacted', 'Qualified', 'Follow-up', 'Proposal'].includes(l.status as any)),
              columns: leadColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Active Pipeline</div>
          <div className="text-xl font-black text-indigo-600 mt-1">
            {leadMetrics.contacted + leadMetrics.qualified + leadMetrics.followup + leadMetrics.proposal}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">In communication</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Won Leads',
              subtitle: 'Leads marked as Won',
              data: filteredLeads.filter((l) => l.status === 'Won'),
              columns: leadColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Won Leads</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{leadMetrics.won}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Successful closures</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Converted to Customers',
              subtitle: 'Leads officially converted to full client accounts',
              data: filteredLeads.filter((l) => l.isConverted || l.status === 'Converted' || l.status === 'Customer Created'),
              columns: leadColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Converted</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{leadMetrics.converted}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Customer accounts created</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Conversion Rate</div>
          <div className="text-xl font-black text-purple-700 mt-1">{leadMetrics.conversionRate}%</div>
          <div className="text-2xs text-slate-500 mt-0.5">Converted / Total × 100</div>
        </div>
      </div>

      {/* Breakdown Domain Tabs & Charts */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              Lead Performance & Breakdown Analysis
            </h3>
            <p className="text-xs text-slate-500">
              Factual metrics without subjective ranking. Click any row to drill down.
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: 'status', label: 'By Status' },
                { id: 'source', label: 'By Source' },
                { id: 'employee', label: 'By Employee' },
                { id: 'monthly', label: 'Monthly Trend' },
              ] as { id: typeof activeDimension; label: string }[]
            ).map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDimension(d.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeDimension === d.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {groupedData.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No lead records found for this criteria.
            </div>
          ) : (
            groupedData.map((item, idx) => {
              const pct = Math.max(Math.round((item.count / maxCount) * 100), 4);
              const convRate = item.count > 0 ? ((item.convertedCount / item.count) * 100).toFixed(1) : '0.0';
              return (
                <div
                  key={idx}
                  onClick={() =>
                    setDrillDownState({
                      isOpen: true,
                      title: `Drill-down: ${item.label}`,
                      subtitle: `${item.count} leads, ${item.convertedCount} converted (${convRate}%)`,
                      data: item.items,
                      columns: leadColumns,
                    })
                  }
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="text-2xs text-slate-400 font-mono">#{idx + 1}</span>
                      {item.label}
                    </span>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="text-slate-500">
                        {item.count} lead(s)
                      </span>
                      <span className="text-emerald-700 text-2xs font-mono">
                        {item.convertedCount} converted ({convRate}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detailed Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Lead Records Register ({filteredLeads.length} Leads)
          </h4>
          <span className="text-2xs text-slate-400">Click any lead for drill-down</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10">
                <th className="p-3">Lead ID</th>
                <th className="p-3">Company</th>
                <th className="p-3">Contact Person</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Source</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Assigned Employee</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredLeads.slice(0, 30).map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() =>
                    setDrillDownState({
                      isOpen: true,
                      title: `Lead: ${lead.companyName}`,
                      subtitle: `Contact: ${lead.contactPerson}`,
                      data: [lead],
                      columns: leadColumns,
                    })
                  }
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="p-3 font-mono font-bold text-blue-700">{lead.leadId || '—'}</td>
                  <td className="p-3 font-semibold text-slate-900">{lead.companyName}</td>
                  <td className="p-3 text-slate-600">{lead.contactPerson}</td>
                  <td className="p-3 text-slate-500 font-mono">{lead.mobile || lead.phone || '—'}</td>
                  <td className="p-3 text-slate-600">{lead.source || 'Direct'}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-2xs font-bold border ${
                        lead.isConverted || lead.status === 'Won' || lead.status === 'Converted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : lead.status === 'Lost'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : lead.status === 'Qualified'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{lead.assignedEmployeeName || 'Unassigned'}</td>
                  <td className="p-3 text-slate-500">{formatDateDisplayIST(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReportDrillDownModal
        isOpen={drillDownState.isOpen}
        onClose={() => setDrillDownState((prev) => ({ ...prev, isOpen: false }))}
        title={drillDownState.title}
        subtitle={drillDownState.subtitle}
        data={drillDownState.data}
        columns={drillDownState.columns}
      />
    </div>
  );
};
