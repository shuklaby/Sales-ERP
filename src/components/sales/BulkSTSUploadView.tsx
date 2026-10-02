import React, { useState } from 'react';
import {
  UploadCloud,
  FileCheck,
  CheckCircle2,
  XCircle,
  Download,
  RefreshCw,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCrmData } from '../../context/CrmDataContext';
import {
  validateAndPrepareSTSImport,
  ParsedSTSImportRow,
} from '../../services/salesService';

interface BulkSTSUploadViewProps {
  onDone?: () => void;
}

export const BulkSTSUploadView: React.FC<BulkSTSUploadViewProps> = ({ onDone }) => {
  const { employees, addSTS } = useCrmData();

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedSTSImportRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    imported: number;
    skipped: number;
  } | null>(null);

  const handleDownloadSample = () => {
    const sampleHeaders = [
      {
        'Customer': 'Mahindra Heavy Auto Components',
        'Phone': '9819001234',
        'Email': 'purchase@mahindraauto.com',
        'Requirement': 'Turnkey PLC SCADA industrial monitoring panel',
        'Assigned Employee': employees[0]?.name || '',
        'Status': 'Draft',
        'Talk Status': 'Yes',
        'Next Follow-up': new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        'Remarks': 'Technical specification review in progress',
        'Amount': 620000,
      },
      {
        'Customer': 'Premier Packaging Pvt Ltd',
        'Phone': '9845012345',
        'Email': 'info@premierpack.com',
        'Requirement': 'Servo drive replacement and retrofitting',
        'Assigned Employee': '',
        'Status': 'Pending Review',
        'Talk Status': 'Callback',
        'Next Follow-up': '',
        'Remarks': 'Call back on Tuesday afternoon',
        'Amount': 210000,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleHeaders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample_STS');
    XLSX.writeFile(wb, 'STS_Import_Template.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      processFile(selected);
    }
  };

  const processFile = (f: File) => {
    setIsParsing(true);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);

        const result = validateAndPrepareSTSImport(rawJson, employees);
        setTotalRows(result.totalRows);
        setParsedRows(result.allParsed);
      } catch (err) {
        console.error('Failed to parse STS file:', err);
        alert('Failed to read Excel/CSV file.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(f);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleStartImport = async () => {
    if (validRows.length === 0) {
      alert('No valid STS rows to import.');
      return;
    }

    setIsImporting(true);
    let imported = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await addSTS({
          companyName: row.customerName,
          contactPerson: row.customerName,
          customerName: row.customerName,
          phone: row.phone,
          email: row.email,
          requirement: row.requirement,
          assignedEmployeeId: row.assignedEmployeeId || '',
          assignedEmployeeName: row.assignedEmployeeName || '',
          status: (row.status as any) || 'Draft',
          talkStatus: row.talkStatus,
          followUpDate: row.nextFollowUp || '',
          remarks: row.remarks || '',
          amount: row.amount || 0,
          estimatedValue: row.amount || 0,
          date: new Date().toISOString().split('T')[0],
        });
        imported++;
      } catch (err) {
        console.error('Import STS row failed:', err);
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setIsImporting(false);
    setImportSummary({
      total: validRows.length,
      imported,
      skipped: invalidRows.length,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            <FileCheck className="w-4 h-4" />
            Sales Tracking System / STS Bulk Import
          </div>
          <h2 className="text-xl font-black text-slate-900">Bulk STS (Sales Tracking Sheet) Import</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Upload STS tracking sheets in Excel or CSV format. Auto-generates unique sequential STS numbers (e.g. STS-2026-0001) and validates requirements before saving.
          </p>
        </div>

        <button
          onClick={handleDownloadSample}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-slate-600" />
          Download Sample STS (.xlsx)
        </button>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-amber-500 transition-colors">
        <input
          type="file"
          id="bulk-sts-file-input"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor="bulk-sts-file-input"
          className="cursor-pointer flex flex-col items-center justify-center space-y-2"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            {file ? file.name : 'Choose an Excel (.xlsx) or CSV file to import'}
          </div>
          <p className="text-xs text-slate-400">Drag and drop or click here to browse files</p>
        </label>
      </div>

      {isParsing && (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 text-amber-600 animate-spin mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Validating STS rows...</p>
        </div>
      )}

      {parsedRows.length > 0 && !isParsing && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold">Total Rows</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalRows}</div>
            </div>
            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
              <div className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Valid STS Records
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{validRows.length}</div>
            </div>
            <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200">
              <div className="text-xs text-rose-800 font-bold flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Invalid Rows
              </div>
              <div className="text-2xl font-black text-rose-900 mt-1">{invalidRows.length}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setParsedRows([]);
                setFile(null);
                setImportSummary(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Clear / Re-upload
            </button>
            <button
              type="button"
              disabled={isImporting || validRows.length === 0}
              onClick={handleStartImport}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing ({importProgress}%)...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm & Import ({validRows.length}) STS Records
                </>
              )}
            </button>
          </div>

          {importSummary && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-emerald-900">STS Import Completed!</div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    Imported: <strong>{importSummary.imported}</strong> | Skipped: <strong>{importSummary.skipped}</strong>
                  </div>
                </div>
              </div>
              {onDone && (
                <button
                  onClick={onDone}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs"
                >
                  View STS Registry
                </button>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3 border-b border-slate-200 font-black text-xs text-slate-700 uppercase tracking-wider bg-slate-50">
              STS File Preview
            </div>
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Row</th>
                    <th className="px-3 py-2.5">Customer</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">Requirement</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Talk Status</th>
                    <th className="px-3 py-2.5">Amount</th>
                    <th className="px-3 py-2.5">Assigned To</th>
                    <th className="px-3 py-2.5">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((r) => (
                    <tr
                      key={r.rowIndex}
                      className={!r.isValid ? 'bg-rose-50/40 text-rose-950' : 'hover:bg-slate-50/60'}
                    >
                      <td className="px-3 py-2 font-mono text-3xs text-slate-400">#{r.rowIndex}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{r.customerName}</td>
                      <td className="px-3 py-2 font-mono">{r.phone || '—'}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate">{r.requirement}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2 font-semibold text-amber-700">{r.talkStatus || '—'}</td>
                      <td className="px-3 py-2 font-bold text-emerald-700">
                        {r.amount ? `₹${r.amount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-3 py-2">{r.assignedEmployeeName || r.assignedEmployee || 'Unassigned'}</td>
                      <td className="px-3 py-2 text-3xs">
                        {r.validationError ? (
                          <span className="text-rose-600 font-semibold">{r.validationError}</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">Valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
