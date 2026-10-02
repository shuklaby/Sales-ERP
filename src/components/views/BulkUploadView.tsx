import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers,
  HelpCircle,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ExternalLink,
  ChevronRight,
  Users,
  Briefcase,
  FileText,
  Filter,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  readSpreadsheetFile,
  autoDetectMappings,
  validateAndDeduplicateRows,
  downloadCustomerTemplate,
  downloadLeadTemplate,
  exportErrorReport,
  ParsedRowRecord,
  ColumnMapping,
  BulkValidationSummary,
  RowAction,
  CUSTOMER_FIELDS_CONFIG,
  LEAD_FIELDS_CONFIG,
} from '../../utils/bulkUploadParser';
import { ImportHistoryRecord } from '../../types/crm';

export const BulkUploadView: React.FC = () => {
  const { customers, leads, employees, importHistory, bulkImportData, deleteImportHistory } = useCrmData();
  const { isAdmin, userProfile, hasPermission } = useAuth();

  const canAccess = isAdmin || hasPermission('bulkUpload');

  // View state
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');

  // Upload wizard steps: 1: select, 2: mapping, 3: preview & deduplicate, 4: results
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [targetType, setTargetType] = useState<'customers' | 'leads'>('customers');

  // File & Raw Data State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // Validation & Deduplication State
  const [validationSummary, setValidationSummary] = useState<BulkValidationSummary | null>(null);
  const [records, setRecords] = useState<ParsedRowRecord[]>([]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'new' | 'duplicates' | 'invalid'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Execution & Progress State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  const [importResult, setImportResult] = useState<{
    importId: string;
    totalRows: number;
    importedRows: number;
    updatedRows: number;
    skippedRows: number;
    invalidRows: number;
    failedRows: number;
    status: string;
  } | null>(null);

  // History Diagnostics Modal
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ImportHistoryRecord | null>(null);
  const [isDeletingHistoryId, setIsDeletingHistoryId] = useState<string | null>(null);

  // ----------------------------------------------------
  // Step 1: File Selection & Initial Parse
  // ----------------------------------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsingFile(true);
    setValidationSummary(null);
    setRecords([]);

    try {
      const { rawRows: parsedRows, columns } = await readSpreadsheetFile(file);
      if (parsedRows.length === 0) {
        alert('The uploaded spreadsheet contains no data rows.');
        setIsParsingFile(false);
        return;
      }

      setRawRows(parsedRows);
      setDetectedColumns(columns);

      // Auto-detect column mappings
      const initialMappings = autoDetectMappings(columns, targetType);
      setColumnMappings(initialMappings);

      // Advance to Step 2: Column Mapping
      setStep(2);
    } catch (err: any) {
      console.error('Error reading spreadsheet:', err);
      alert('Failed to parse file. Please ensure it is a valid .xlsx, .xls, or .csv document.');
    } finally {
      setIsParsingFile(false);
    }
  };

  // ----------------------------------------------------
  // Step 2: Column Mapping Adjustment
  // ----------------------------------------------------
  const handleMappingChange = (field: string, newCol: string) => {
    setColumnMappings((prev) =>
      prev.map((m) => (m.field === field ? { ...m, detectedColumn: newCol } : m))
    );
  };

  const handleProceedToValidation = () => {
    if (!selectedFile || rawRows.length === 0) return;

    // Check mandatory companyName and mobile mapping
    const compMap = columnMappings.find((m) => m.field === 'companyName');
    const mobileMap = columnMappings.find((m) => m.field === 'mobile');

    if (!compMap?.detectedColumn) {
      alert('Please map the mandatory "Company Name" column before proceeding.');
      return;
    }
    if (!mobileMap?.detectedColumn) {
      alert('Please map the mandatory "Mobile Number" column before proceeding.');
      return;
    }

    // Run validation and deduplication
    const summary = validateAndDeduplicateRows(
      rawRows,
      columnMappings,
      targetType,
      customers,
      leads,
      employees
    );

    setValidationSummary(summary);
    setRecords(summary.records);
    setStep(3);
  };

  // ----------------------------------------------------
  // Step 3: Duplicate Action Management
  // ----------------------------------------------------
  const handleSetRowAction = (rowIndex: number, action: RowAction) => {
    setRecords((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex ? { ...r, action } : r))
    );
  };

  const handleBulkSetDuplicateAction = (action: RowAction) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.duplicateStatus === 'exact_duplicate' || r.duplicateStatus === 'possible_duplicate') {
          return { ...r, action };
        }
        return r;
      })
    );
  };

  // Filtered preview records
  const displayedRecords = useMemo(() => {
    let list = records;
    if (filterCategory === 'new') {
      list = list.filter((r) => r.isValid && r.duplicateStatus === 'new');
    } else if (filterCategory === 'duplicates') {
      list = list.filter(
        (r) =>
          r.duplicateStatus === 'exact_duplicate' ||
          r.duplicateStatus === 'possible_duplicate' ||
          r.duplicateStatus === 'intra_batch_duplicate'
      );
    } else if (filterCategory === 'invalid') {
      list = list.filter((r) => !r.isValid);
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.companyName.toLowerCase().includes(q) ||
          r.mobile.includes(q) ||
          (r.email && r.email.toLowerCase().includes(q)) ||
          (r.gstNumber && r.gstNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }, [records, filterCategory, searchFilter]);

  // Counts for current actions
  const actionCounts = useMemo(() => {
    const toImportNew = records.filter((r) => r.isValid && r.action === 'new').length;
    const toUpdate = records.filter((r) => r.isValid && r.action === 'update').length;
    const toSkip = records.filter((r) => r.action === 'skip').length;
    const invalidCount = records.filter((r) => !r.isValid).length;
    return { toImportNew, toUpdate, toSkip, invalidCount };
  }, [records]);

  // ----------------------------------------------------
  // Step 4: Confirm & Execute Import
  // ----------------------------------------------------
  const handleExecuteImport = async () => {
    if (!selectedFile) return;

    const totalEligible = actionCounts.toImportNew + actionCounts.toUpdate;
    if (totalEligible === 0) {
      alert('No valid records are marked for import or update. Please review action selections.');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to proceed with importing ${actionCounts.toImportNew} new records and updating ${actionCounts.toUpdate} existing records in SparkGenTechnology CRM?`
      )
    ) {
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: totalEligible, percent: 0 });

    try {
      const fileExt = selectedFile.name.split('.').pop() || 'xlsx';
      const summary = await bulkImportData({
        recordType: targetType,
        fileName: selectedFile.name,
        fileType: fileExt,
        totalFileRows: rawRows.length,
        records: records,
        onProgress: (current, total) => {
          const percent = total > 0 ? Math.round((current / total) * 100) : 0;
          setImportProgress({ current, total, percent });
        },
      });

      setImportResult(summary);
      setStep(4);
    } catch (err: any) {
      console.error('Bulk import error:', err);
      alert('Bulk import encountered an unexpected error: ' + (err.message || 'Check network connection'));
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleResetWizard = () => {
    setSelectedFile(null);
    setRawRows([]);
    setDetectedColumns([]);
    setColumnMappings([]);
    setValidationSummary(null);
    setRecords([]);
    setImportResult(null);
    setStep(1);
  };

  // ----------------------------------------------------
  // Access Guard
  // ----------------------------------------------------
  if (!canAccess) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-rose-900">Access Restricted</h2>
          <p className="text-xs text-rose-700 max-w-md mx-auto">
            You do not have permission to access the Bulk Excel/CSV Import Module. Super Administrator privileges or the explicit &quot;Bulk Upload&quot; employee permission is required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
              Phase 8 Enterprise Module
            </span>
            <span className="text-xs font-semibold text-slate-400">• SparkGenTechnology CRM</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UploadCloud className="w-7 h-7 text-indigo-600 stroke-[2.2]" />
            Bulk Excel & CSV Import Engine
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Import customers and sales leads with real-time column auto-mapping, strict validation, phone & GSTIN normalization, duplicate detection, and automated audit logging.
          </p>
        </div>

        {/* Action Tabs & Template Downloads */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Import Wizard
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Import History ({importHistory.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => downloadCustomerTemplate('xlsx')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
              title="Download official Customer import template with pre-configured headers (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Customer Template
            </button>
            <button
              onClick={() => downloadLeadTemplate('xlsx')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
              title="Download official Lead import template with pre-configured headers (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              Lead Template
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: IMPORT WIZARD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Wizard Steps Breadcrumb */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  1
                </div>
                <span className={`text-xs font-bold ${step >= 1 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Target & File
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />

              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  2
                </div>
                <span className={`text-xs font-bold ${step >= 2 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Column Mapping
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />

              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  3
                </div>
                <span className={`text-xs font-bold ${step >= 3 ? 'text-slate-900' : 'text-slate-400'}`}>
                  Validation & Deduplication
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />

              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  4
                </div>
                <span className={`text-xs font-bold ${step >= 4 ? 'text-emerald-700' : 'text-slate-400'}`}>
                  Import Report
                </span>
              </div>
            </div>
          </div>

          {/* STEP 1: Select Target & File Upload */}
          {step === 1 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              {/* Destination Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  1. Select Destination Module:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                  <button
                    type="button"
                    onClick={() => setTargetType('customers')}
                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      targetType === 'customers'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        targetType === 'customers' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Active Customers</div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Import client directory with contact person, GSTIN, and account details.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('leads')}
                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      targetType === 'leads'
                        ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        targetType === 'leads' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Sales Leads</div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Import pipeline inquiries with estimated deal value, source, and follow-up.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  2. Upload Spreadsheet File:
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-10 text-center transition-all bg-slate-50/50">
                  <input
                    type="file"
                    id="spreadsheetInput"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="spreadsheetInput" className="cursor-pointer block space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                      <FileSpreadsheet className="w-8 h-8 stroke-[1.8]" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-indigo-600 hover:text-indigo-700">
                        Click to select an Excel or CSV file
                      </span>
                      <span className="text-xs text-slate-500 block mt-1">
                        Supported formats: Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Automatic duplicate checks against Firestore before database writes
                    </div>
                  </label>
                </div>
              </div>

              {/* Template Guidance Callout */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Sample Template Note:</span> Downloadable templates include an illustrative example row marked{' '}
                  <code className="text-indigo-700 font-mono text-[11px]">[EXAMPLE - DO NOT IMPORT]</code>. The system automatically detects and ignores sample guidance rows so you do not have to worry about cleaning them out manually.
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 2 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Step 2: Verify Column Mapping</h3>
                  <p className="text-xs text-slate-500">
                    File: <span className="font-semibold text-slate-700">{selectedFile?.name}</span> ({rawRows.length} data rows found, {detectedColumns.length} columns detected)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Change File
                  </button>
                  <button
                    onClick={handleProceedToValidation}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Validate & Check Duplicates <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Column Mapping Grid */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 font-bold">Target CRM Field</th>
                      <th className="py-2.5 px-4 font-bold">Requirement</th>
                      <th className="py-2.5 px-4 font-bold">Detected Column in File</th>
                      <th className="py-2.5 px-4 font-bold">Preview (Row 1 Value)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {columnMappings.map((mapping) => {
                      const sampleVal = mapping.detectedColumn && rawRows[0] ? rawRows[0][mapping.detectedColumn] : '-';
                      return (
                        <tr key={mapping.field} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {mapping.label}
                          </td>
                          <td className="py-2.5 px-4">
                            {mapping.required ? (
                              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                Required
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Optional</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <select
                              value={mapping.detectedColumn}
                              onChange={(e) => handleMappingChange(mapping.field, e.target.value)}
                              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            >
                              <option value="">-- Do Not Import / Not in File --</option>
                              {detectedColumns.map((col) => (
                                <option key={col} value={col}>
                                  {col}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] truncate max-w-xs">
                            {sampleVal !== undefined && sampleVal !== null ? String(sampleVal) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Validation, Deduplication & Duplicate Actions */}
          {step === 3 && validationSummary && (
            <div className="space-y-6">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Records
                  </span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">
                    {validationSummary.totalRows}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Found in spreadsheet</span>
                </div>

                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Clean New
                  </span>
                  <span className="text-2xl font-black text-emerald-900 mt-1 block">
                    {validationSummary.newCount}
                  </span>
                  <span className="text-[11px] text-emerald-700 mt-0.5 block">Ready to import as new</span>
                </div>

                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                    Duplicates
                  </span>
                  <span className="text-2xl font-black text-amber-900 mt-1 block">
                    {validationSummary.exactDuplicateCount + validationSummary.possibleDuplicateCount}
                  </span>
                  <span className="text-[11px] text-amber-700 mt-0.5 block">
                    {validationSummary.exactDuplicateCount} Exact, {validationSummary.possibleDuplicateCount} Possible
                  </span>
                </div>

                <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                    Invalid Records
                  </span>
                  <span className="text-2xl font-black text-rose-900 mt-1 block">
                    {validationSummary.invalidRows}
                  </span>
                  <span className="text-[11px] text-rose-700 mt-0.5 block">Missing or malformed fields</span>
                </div>
              </div>

              {/* Execution Action Bar */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Validation & Duplicate Rules Applied
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Plan: <span className="text-emerald-300 font-semibold">{actionCounts.toImportNew} new</span> records to create,{' '}
                    <span className="text-amber-300 font-semibold">{actionCounts.toUpdate} existing</span> to update,{' '}
                    <span className="text-slate-400 font-semibold">{actionCounts.toSkip}</span> skipped,{' '}
                    <span className="text-rose-400 font-semibold">{actionCounts.invalidCount}</span> invalid.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => exportErrorReport(records, selectedFile?.name.replace(/\.[^/.]+$/, '') || 'Report')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Diagnostics Report
                  </button>

                  <button
                    onClick={handleExecuteImport}
                    disabled={isImporting || actionCounts.toImportNew + actionCounts.toUpdate === 0}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Importing ({importProgress?.current} / {importProgress?.total})...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Execute Import ({actionCounts.toImportNew + actionCounts.toUpdate})
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Duplicate Bulk Action Controls & Filters */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Filter View:</span>
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                      <button
                        onClick={() => setFilterCategory('all')}
                        className={`px-2.5 py-1 rounded-md font-semibold ${
                          filterCategory === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        All ({records.length})
                      </button>
                      <button
                        onClick={() => setFilterCategory('new')}
                        className={`px-2.5 py-1 rounded-md font-semibold ${
                          filterCategory === 'new' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Clean New ({validationSummary.newCount})
                      </button>
                      <button
                        onClick={() => setFilterCategory('duplicates')}
                        className={`px-2.5 py-1 rounded-md font-semibold ${
                          filterCategory === 'duplicates' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Duplicates ({validationSummary.exactDuplicateCount + validationSummary.possibleDuplicateCount})
                      </button>
                      <button
                        onClick={() => setFilterCategory('invalid')}
                        className={`px-2.5 py-1 rounded-md font-semibold ${
                          filterCategory === 'invalid' ? 'bg-white text-rose-800 shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        Invalid ({validationSummary.invalidRows})
                      </button>
                    </div>
                  </div>

                  {/* Bulk Duplicate Action Setter */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-500">Apply to All Duplicates:</span>
                    <button
                      onClick={() => handleBulkSetDuplicateAction('skip')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold"
                      title="Set action to Skip for all duplicates (Default requirement)"
                    >
                      Skip All
                    </button>
                    <button
                      onClick={() => handleBulkSetDuplicateAction('update')}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md font-semibold"
                      title="Update existing CRM records without overwriting empty fields"
                    >
                      Update All
                    </button>
                    <button
                      onClick={() => handleBulkSetDuplicateAction('new')}
                      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md font-semibold"
                      title="Force import duplicates as new separate entries"
                    >
                      Import All as New
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search by company name, mobile, email, or GSTIN..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full max-w-sm px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Data Table with Side-by-Side Comparison */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold">Showing {displayedRecords.length} records</span>
                  <span>Row actions can be toggled individually below</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Company Name</th>
                        <th className="py-2.5 px-3">Mobile</th>
                        <th className="py-2.5 px-3">Email & GSTIN</th>
                        <th className="py-2.5 px-3">Assigned / Status</th>
                        <th className="py-2.5 px-3">Duplicate / Integrity State</th>
                        <th className="py-2.5 px-3">Import Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedRecords.map((r) => {
                        return (
                          <tr
                            key={r.rowIndex}
                            className={
                              !r.isValid
                                ? 'bg-rose-50/40 hover:bg-rose-50/70'
                                : r.duplicateStatus === 'exact_duplicate'
                                ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                : r.duplicateStatus === 'possible_duplicate'
                                ? 'bg-orange-50/30 hover:bg-orange-50/60'
                                : 'hover:bg-slate-50'
                            }
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-400">#{r.rowIndex}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {r.companyName || <span className="text-rose-500 italic">[Empty]</span>}
                              {r.contactPerson && (
                                <span className="text-[11px] text-slate-400 block font-normal">
                                  POC: {r.contactPerson}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">
                              {r.mobile}
                              {r.alternateMobile && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  Alt: {r.alternateMobile}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <div>{r.email || '-'}</div>
                              {r.gstNumber && (
                                <span className="text-[10px] font-mono text-slate-400 block">
                                  GST: {r.gstNumber}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <span className="font-medium text-slate-800">{r.status}</span>
                              <span className="text-[11px] text-slate-400 block">
                                {r.assignedEmployeeName || 'Unassigned'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {!r.isValid ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                    <XCircle className="w-3 h-3" /> Format Error
                                  </span>
                                  <div className="text-[10px] text-rose-600 max-w-xs">
                                    {r.errors.join('; ')}
                                  </div>
                                </div>
                              ) : r.duplicateStatus === 'exact_duplicate' ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                    <AlertTriangle className="w-3 h-3" /> Exact Duplicate
                                  </span>
                                  {r.matchedRecord && (
                                    <div className="text-[10px] text-slate-500 bg-white p-1 rounded border border-amber-200 max-w-xs">
                                      Matches CRM: <strong className="text-slate-800">{r.matchedRecord.companyName}</strong> ({r.matchedRecord.id})
                                    </div>
                                  )}
                                </div>
                              ) : r.duplicateStatus === 'possible_duplicate' ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-md">
                                    <AlertCircle className="w-3 h-3" /> Possible Duplicate
                                  </span>
                                  {r.matchedRecord && (
                                    <div className="text-[10px] text-slate-500 bg-white p-1 rounded border border-orange-200 max-w-xs">
                                      Same phone/tax with CRM: <strong className="text-slate-800">{r.matchedRecord.companyName}</strong>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                  <CheckCircle className="w-3 h-3" /> Clean New
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {!r.isValid ? (
                                <span className="text-[11px] font-semibold text-rose-500">Excluded</span>
                              ) : (
                                <select
                                  value={r.action}
                                  onChange={(e) => handleSetRowAction(r.rowIndex, e.target.value as RowAction)}
                                  className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                >
                                  <option value="skip">Skip (Default)</option>
                                  <option value="new">Import as New</option>
                                  {r.matchedRecord && <option value="update">Update Existing</option>}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Import Complete & Post-Import Report */}
          {step === 4 && importResult && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-xl font-black text-emerald-950">Bulk Import Processed Successfully!</h3>
                <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                  Import ID: <span className="font-mono font-bold text-emerald-900">{importResult.importId}</span>. All operations have been synced to Google Cloud Firestore in real time.
                </p>
              </div>

              {/* Results Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-500 block">Total Rows</span>
                  <span className="text-xl font-black text-slate-900 mt-1 block">{importResult.totalRows}</span>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[11px] font-bold text-emerald-700 block">Created New</span>
                  <span className="text-xl font-black text-emerald-900 mt-1 block">{importResult.importedRows}</span>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <span className="text-[11px] font-bold text-amber-700 block">Updated Existing</span>
                  <span className="text-xl font-black text-amber-900 mt-1 block">{importResult.updatedRows}</span>
                </div>
                <div className="p-4 bg-slate-100 rounded-xl border border-slate-300 text-center">
                  <span className="text-[11px] font-bold text-slate-600 block">Skipped</span>
                  <span className="text-xl font-black text-slate-800 mt-1 block">{importResult.skippedRows}</span>
                </div>
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 text-center">
                  <span className="text-[11px] font-bold text-rose-700 block">Invalid</span>
                  <span className="text-xl font-black text-rose-900 mt-1 block">{importResult.invalidRows}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-500 block">Failed</span>
                  <span className="text-xl font-black text-slate-900 mt-1 block">{importResult.failedRows}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => exportErrorReport(records, selectedFile?.name.replace(/\.[^/.]+$/, '') || 'Report')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  <Download className="w-4 h-4 text-indigo-600" />
                  Download Complete Diagnostics Report
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetWizard}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Upload Another File
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    View Import History
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: IMPORT HISTORY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Historical Import Logs</h3>
              <p className="text-xs text-slate-500">
                Persistent Firestore record of all batch operations, audit trails, and error diagnostics.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveTab('upload');
                handleResetWizard();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              <UploadCloud className="w-4 h-4" />
              Start New Import
            </button>
          </div>

          {importHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <FileSpreadsheet className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No bulk imports recorded yet.</p>
              <p className="text-xs text-slate-400">
                Uploaded files and their diagnostic reports will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Import ID</th>
                    <th className="py-2.5 px-4">File Name & Type</th>
                    <th className="py-2.5 px-4">Target Module</th>
                    <th className="py-2.5 px-4">Uploaded By</th>
                    <th className="py-2.5 px-4">Metrics (Total / New / Upd / Skip)</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{item.importId}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block truncate max-w-xs">
                          {item.fileName}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">.{item.fileType} format</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.recordType === 'customers'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.recordType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block">{item.uploadedByName}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {item.uploadedAt ? new Date(item.uploadedAt).toLocaleString('en-IN') : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span title="Total Rows" className="text-slate-700 font-bold">
                            {item.totalRows}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span title="Imported New" className="text-emerald-700 font-semibold">
                            +{item.importedRows}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span title="Updated Existing" className="text-amber-700 font-semibold">
                            ~{item.updatedRows}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span title="Skipped / Excluded" className="text-slate-400">
                            -{item.skippedRows}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'Completed with Errors'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : item.status === 'Processing'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {item.errorReport && item.errorReport.length > 0 && (
                            <button
                              onClick={() => setSelectedHistoryItem(item)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-indigo-600 transition-colors"
                              title="View Diagnostics Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`Delete import history entry ${item.importId}?`)) {
                                  setIsDeletingHistoryId(item.id);
                                  try {
                                    await deleteImportHistory(item.id);
                                  } finally {
                                    setIsDeletingHistoryId(null);
                                  }
                                }
                              }}
                              disabled={isDeletingHistoryId === item.id}
                              className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                              title="Delete from History Log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Historical Diagnostics Modal */}
          {selectedHistoryItem && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      Diagnostics Log: {selectedHistoryItem.importId}
                    </h4>
                    <span className="text-xs text-slate-500">
                      File: {selectedHistoryItem.fileName} ({selectedHistoryItem.errorReport?.length || 0} recorded issues)
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedHistoryItem(null)}
                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-2 flex-1">
                  {selectedHistoryItem.errorReport?.map((err, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-800">
                          Row #{err.rowIndex}: {err.companyName || 'Unknown Entity'}
                        </span>
                        <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          {err.duplicateStatus || 'Validation Issue'}
                        </span>
                      </div>
                      <p className="text-rose-600 font-mono text-[11px]">{err.error}</p>
                      {err.suggestedAction && (
                        <p className="text-slate-400 text-[10px]">Action: {err.suggestedAction}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <button
                    onClick={() => setSelectedHistoryItem(null)}
                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
