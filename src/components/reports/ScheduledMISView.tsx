import React, { useState } from 'react';
import {
  CalendarClock,
  Calendar,
  DollarSign,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileDown,
  Clock,
  Send,
  Download,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ScheduledReportRecord, ReportId, UserRole } from '../../types/crm';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';
import { formatINR, formatDateDisplayIST } from '../../utils/dateRangeUtils';

export const ScheduledMISView: React.FC = () => {
  const {
    scheduledReports,
    createScheduledReport,
    updateScheduledReport,
    deleteScheduledReport,
    proposals,
    invoices,
    payments,
    expenses,
    leads,
    customers,
    calls,
    followups,
    products,
    employees,
    companySettings,
  } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportId, setReportId] = useState<ReportId>('sales');
  const [reportName, setReportName] = useState('Daily Sales MIS');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [time, setTime] = useState('09:00');
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [recipientsInput, setRecipientsInput] = useState(userProfile?.email || 'admin@sparkgentechnology.com');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const recipientList = recipientsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await createScheduledReport({
        reportId,
        reportName,
        frequency,
        time,
        recipients: recipientList,
        recipientRoles: ['admin', 'super_admin'] as UserRole[],
        format,
        isActive: true,
      });

      setStatusMessage('Scheduled MIS configuration successfully saved to Firestore.');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Failed: ${err.message || 'Error creating schedule'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (s: ScheduledReportRecord) => {
    try {
      await updateScheduledReport(s.id, { isActive: !s.isActive });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this scheduled report?')) return;
    try {
      await deleteScheduledReport(id);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // MANAGEMENT PACK GENERATOR (EXCEL WORKBOOK)
  // Combines 6 Core Operational Dimensions
  // ==========================================
  const handleGenerateManagementPackExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Executive Summary Sheet
    const totalSales = proposals
      .filter((p) => p.status === 'Accepted')
      .reduce((sum, p) => sum + (Number(p.grandTotal || p.totalAmount) || 0), 0);
    const totalInvoiced = invoices
      .filter((i) => i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
    const totalCollected = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalExpenses = expenses
      .filter((e) => e.status === 'APPROVED' || e.status === 'PAID')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const summaryData = [
      { Metric: 'Total Sales (Accepted Proposals)', Value: totalSales, Currency: 'INR' },
      { Metric: 'Total Invoiced Value', Value: totalInvoiced, Currency: 'INR' },
      { Metric: 'Total Collections (Completed Payments)', Value: totalCollected, Currency: 'INR' },
      { Metric: 'Total Expenses (Approved/Paid)', Value: totalExpenses, Currency: 'INR' },
      { Metric: 'Net Commercial Cash Margin', Value: totalCollected - totalExpenses, Currency: 'INR' },
      { Metric: 'Total Customer Accounts', Value: customers.length, Currency: 'Count' },
      { Metric: 'Total Leads Handled', Value: leads.length, Currency: 'Count' },
      { Metric: 'Active Catalog Products', Value: products.length, Currency: 'Count' },
    ];
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Executive_Summary');

    // 2. Sales Orders Sheet
    const salesData = proposals.map((p) => ({
      'Proposal #': p.proposalNumber,
      Customer: p.customerName || p.clientName,
      Status: p.status,
      'Amount (INR)': p.grandTotal || p.totalAmount || 0,
      Date: p.proposalDate || p.createdAt || '',
      Employee: p.assignedEmployeeName || p.createdByName || '',
    }));
    const salesWs = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, salesWs, 'Sales_Proposals');

    // 3. Invoices Sheet
    const invData = invoices.map((i) => ({
      'Invoice #': i.invoiceNumber,
      Customer: i.customerName,
      Status: i.status,
      'Grand Total (INR)': i.grandTotal || 0,
      'Paid (INR)': i.paidAmount || 0,
      Date: i.invoiceDate || '',
      'Due Date': i.dueDate || '',
    }));
    const invWs = XLSX.utils.json_to_sheet(invData);
    XLSX.utils.book_append_sheet(wb, invWs, 'Invoices');

    // 4. Collections Sheet
    const colData = payments.map((p) => ({
      'Payment #': p.paymentNumber,
      Customer: p.customerName,
      Method: p.paymentMethod,
      'Amount (INR)': p.amount || 0,
      Date: p.paymentDate || p.createdAt || '',
      Status: p.status,
    }));
    const colWs = XLSX.utils.json_to_sheet(colData);
    XLSX.utils.book_append_sheet(wb, colWs, 'Collections');

    // 5. Expenses Sheet
    const expData = expenses.map((e) => ({
      Description: e.description,
      Category: e.category,
      Vendor: e.vendor || '',
      'Amount (INR)': e.amount || 0,
      Status: e.status,
      Date: e.date || '',
    }));
    const expWs = XLSX.utils.json_to_sheet(expData);
    XLSX.utils.book_append_sheet(wb, expWs, 'Expenses');

    // 6. Inventory Sheet
    const prodData = products.map((p) => ({
      Product: p.name,
      SKU: p.sku,
      Category: p.category,
      'Current Stock': p.currentStock ?? p.stockQuantity ?? 0,
      'Min Stock': p.minStockLevel ?? p.reorderLevel ?? 5,
    }));
    const prodWs = XLSX.utils.json_to_sheet(prodData);
    XLSX.utils.book_append_sheet(wb, prodWs, 'Inventory_Stock');

    XLSX.writeFile(wb, `SparkGen_Executive_Management_Pack_${Date.now()}.xlsx`);
  };

  // Management Pack PDF
  const handleGenerateManagementPackPDF = () => {
    const totalSales = proposals
      .filter((p) => p.status === 'Accepted')
      .reduce((sum, p) => sum + (Number(p.grandTotal || p.totalAmount) || 0), 0);
    const totalInvoiced = invoices
      .filter((i) => i.status !== 'CANCELLED')
      .reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
    const totalCollected = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalExpenses = expenses
      .filter((e) => e.status === 'APPROVED' || e.status === 'PAID')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const rows = [
      { Domain: 'Commercial Sales', Metrics: 'Accepted Orders Value', RealTotal: formatINR(totalSales), Records: `${proposals.length} Proposals` },
      { Domain: 'Billing & Receivables', Metrics: 'Total Invoiced Portfolio', RealTotal: formatINR(totalInvoiced), Records: `${invoices.length} Invoices` },
      { Domain: 'Cash Collections', Metrics: 'Liquid Receipts Cleared', RealTotal: formatINR(totalCollected), Records: `${payments.length} Payments` },
      { Domain: 'Operational Outflow', Metrics: 'Approved Expenditures', RealTotal: formatINR(totalExpenses), Records: `${expenses.length} Vouchers` },
      { Domain: 'Net Margin', Metrics: 'Cash Margin (Collection - Exp)', RealTotal: formatINR(totalCollected - totalExpenses), Records: 'Audited' },
      { Domain: 'Accounts & Pipeline', Metrics: 'Active Customers & Leads', RealTotal: `${customers.length} Cust / ${leads.length} Leads`, Records: 'CRM' },
      { Domain: 'Warehouse', Metrics: 'Catalog Inventory Items', RealTotal: `${products.length} Products`, Records: 'Physical' },
    ];

    const doc = generateReportPdf({
      reportTitle: 'Executive Management Pack — Consolidated Corporate MIS Audit',
      dateRangeLabel: 'All Records Active Database',
      appliedFilters: {
        Scope: 'Enterprise Consolidated',
      },
      summaryMetrics: [
        { label: 'Inflow (Collected)', value: formatINR(totalCollected) },
        { label: 'Outflow (Expenses)', value: formatINR(totalExpenses) },
        { label: 'Net Cash Result', value: formatINR(totalCollected - totalExpenses) },
        { label: 'Total Invoiced', value: formatINR(totalInvoiced) },
      ],
      columns: [
        { header: 'Operational Domain', dataKey: 'Domain' },
        { header: 'Key Metric Description', dataKey: 'Metrics' },
        { header: 'Factual Total', dataKey: 'RealTotal', align: 'right' },
        { header: 'Source Records', dataKey: 'Records', align: 'center' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_Management_Pack_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Management Pack Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Section 16: MIS & Scheduled Reporting
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-600" />
            Executive MIS & Automated Scheduled Dispatches
          </h2>
          <p className="text-xs text-slate-500">
            Generate full corporate management packs (Daily, Weekly, Monthly) and configure scheduled reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateManagementPackExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" /> Management Pack (Excel)
          </button>
          <button
            onClick={handleGenerateManagementPackPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Management Pack (PDF)
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Scheduled MIS
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-medium">
          {statusMessage}
        </div>
      )}

      {/* Preset MIS Packs Quick Launch Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div
          onClick={handleGenerateManagementPackExcel}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-2xs text-indigo-700">Daily MIS</span>
            <Sparkles className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Daily Operational Summary</div>
          <div className="text-2xs text-slate-400 mt-1">Calls, Follow-ups, and Fresh Leads</div>
        </div>

        <div
          onClick={handleGenerateManagementPackExcel}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-2xs text-blue-700">Weekly MIS</span>
            <Calendar className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Weekly Sales Pipeline</div>
          <div className="text-2xs text-slate-400 mt-1">Proposals, Win-rate & Quotations</div>
        </div>

        <div
          onClick={handleGenerateManagementPackExcel}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-2xs text-emerald-700">Monthly MIS</span>
            <DollarSign className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Monthly Financial Close</div>
          <div className="text-2xs text-slate-400 mt-1">Invoices, Collections & Outflow</div>
        </div>

        <div
          onClick={handleGenerateManagementPackPDF}
          className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-xl border border-slate-800 shadow-2xs cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-indigo-300 mb-1">
            <span className="font-bold uppercase tracking-wider text-2xs">Boardroom MIS</span>
            <FileText className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="font-bold text-white text-sm">Corporate Management Pack</div>
          <div className="text-2xs text-slate-400 mt-1">Multi-sheet PDF & Excel audit ready</div>
        </div>
      </div>

      {/* Scheduled Reports List from Firestore */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Active Scheduled MIS Jobs in Firestore ({scheduledReports.length})
          </h3>
          <span className="text-2xs text-slate-400">Automated recurring background dispatches</span>
        </div>

        {scheduledReports.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No scheduled reports configured yet. Click "New Scheduled MIS" above to schedule automated delivery.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {scheduledReports.map((sch) => (
              <div key={sch.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{sch.reportName}</span>
                    <span className="text-2xs px-2 py-0.5 rounded-full uppercase font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {sch.frequency} @ {sch.time}
                    </span>
                    <span className="text-2xs px-2 py-0.5 rounded-full uppercase font-mono bg-slate-100 text-slate-600 border border-slate-200">
                      {sch.format}
                    </span>
                    <span
                      className={`text-2xs px-2 py-0.5 rounded-full font-bold border ${
                        sch.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {sch.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="text-2xs text-slate-500">
                    Recipients: <span className="font-mono text-slate-700">{sch.recipients.join(', ')}</span>
                  </div>
                  <div className="text-2xs text-slate-400">
                    Created by {sch.createdByName} on {formatDateDisplayIST(sch.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(sch)}
                    className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    {sch.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(sch.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete schedule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Configure Scheduled MIS</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Report Domain</label>
                <select
                  value={reportId}
                  onChange={(e) => {
                    const rid = e.target.value as ReportId;
                    setReportId(rid);
                    setReportName(`${rid.toUpperCase()} Routine MIS`);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="sales">Sales & Commercial Revenue</option>
                  <option value="leads">Lead Analytics & Conversions</option>
                  <option value="sts">STS Technical Requirements</option>
                  <option value="calls">Telephony Calling Report</option>
                  <option value="followups">Follow-ups Matrix</option>
                  <option value="proposals">Commercial Proposals</option>
                  <option value="invoices">Invoices & Receivables</option>
                  <option value="collection">Cash Inflows & Collections</option>
                  <option value="expenses">Expenditure & Outflow</option>
                  <option value="profitability">Net Profitability Margins</option>
                  <option value="products">Catalog Products Sold</option>
                  <option value="inventory">Warehouse Inventory Balance</option>
                  <option value="employees">Personnel Activity</option>
                  <option value="attendance">HR Attendance & Clocking</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Schedule Name</label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="excel">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                    <option value="pdf">PDF Document</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Recipients (comma separated)</label>
                <input
                  type="text"
                  value={recipientsInput}
                  onChange={(e) => setRecipientsInput(e.target.value)}
                  placeholder="admin@sparkgen.com, director@sparkgen.com"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
