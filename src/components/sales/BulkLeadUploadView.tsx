import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  RefreshCw,
  Building,
  User,
  Phone,
  Mail,
  Check,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  validateAndPrepareLeadImport,
  ParsedLeadImportRow,
} from '../../services/salesService';

interface BulkLeadUploadViewProps {
  onDone?: () => void;
}

export const BulkLeadUploadView: React.FC<BulkLeadUploadViewProps> = ({ onDone }) => {
  const { customers, leads, employees, addLead } = useCrmData();
  const { userProfile } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedLeadImportRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    imported: number;
    skipped: number;
    failed: number;
  } | null>(null);

  const handleDownloadSample = () => {
    const sampleHeaders = [
      {
        'Company Name': 'Apex Industrial Infra Ltd',
        'Contact Person': 'Rajesh Sharma',
        'Phone': '9876543210',
        'Alternate Phone': '9876543211',
        'Email': 'rajesh@apexinfra.com',
        'GST Number': '27ABCDE1234F1Z5',
        'Website': 'https://apexinfra.com',
        'Address': 'Plot 42, MIDC Industrial Area',
        'City': 'Pune',
        'State': 'Maharashtra',
        'Pincode': '411018',
        'Source': 'IndiaMART',
        'Industry': 'Manufacturing & Infrastructure',
        'Requirement': 'Substation automation & 33kV switchgear',
        'Estimated Value': 450000,
        'Assigned Employee': employees[0]?.name || '',
        'Status': 'New',
        'Priority': 'High',
        'Next Follow-up': new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      },
      {
        'Company Name': 'Zenith Agro Technologies',
        'Contact Person': 'Pooja Verma',
        'Phone': '9823012345',
        'Alternate Phone': '',
        'Email': 'pooja@zenithagro.in',
        'GST Number': '',
        'Website': '',
        'Address': 'Warehouse 8, GIDC',
        'City': 'Vadodara',
        'State': 'Gujarat',
        'Pincode': '390001',
        'Source': 'Website',
        'Industry': 'Agriculture',
        'Requirement': 'Solar water pumping controller',
        'Estimated Value': 180000,
        'Assigned Employee': '',
        'Status': 'Contacted',
        'Priority': 'Medium',
        'Next Follow-up': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleHeaders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample_Leads');
    XLSX.writeFile(wb, 'Lead_Import_Template.xlsx');
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

        const result = validateAndPrepareLeadImport(rawJson, customers, leads, employees);
        setTotalRows(result.totalRows);
        setParsedRows(result.allParsed);
      } catch (err) {
        console.error('Failed to parse file:', err);
        alert('Failed to read Excel/CSV file. Please ensure it is a valid format.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(f);
  };

  const validRows = parsedRows.filter((r) => r.isValid && !r.isDuplicate);
  const duplicateRows = parsedRows.filter((r) => r.isValid && r.isDuplicate);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const [includeDuplicates, setIncludeDuplicates] = useState(false);

  const handleStartImport = async () => {
    const rowsToImport = includeDuplicates
      ? parsedRows.filter((r) => r.isValid)
      : validRows;

    if (rowsToImport.length === 0) {
      alert('No valid rows available to import.');
      return;
    }

    setIsImporting(true);
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < rowsToImport.length; i++) {
      const row = rowsToImport[i];
      try {
        await addLead({
          companyName: row.companyName,
          contactPerson: row.contactPerson,
          mobile: row.phone,
          phone: row.phone,
          alternateMobile: row.alternatePhone || '',
          alternatePhone: row.alternatePhone || '',
          email: row.email || '',
          gstNumber: row.gstNumber || '',
          website: row.website || '',
          address: row.address || '',
          city: row.city || '',
          state: row.state || '',
          pincode: row.pincode || '',
          source: row.source || 'Bulk Import',
          leadSource: row.source || 'Bulk Import',
          industry: row.industry || '',
          requirement: row.requirement || '',
          estimatedValue: row.estimatedValue || 0,
          assignedEmployeeId: row.assignedEmployeeId || '',
          assignedEmployeeName: row.assignedEmployeeName || '',
          status: (row.status as any) || 'New',
          priority: row.priority || 'Medium',
          nextFollowUp: row.nextFollowUp || '',
        });
        imported++;
      } catch (err) {
        console.error('Import failed for row', row.rowIndex, err);
        failed++;
      }
      setImportProgress(Math.round(((i + 1) / rowsToImport.length) * 100));
    }

    setIsImporting(false);
    setImportSummary({
      total: rowsToImport.length,
      imported,
      skipped: invalidRows.length + (includeDuplicates ? 0 : duplicateRows.length),
      failed,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <UploadCloud className="w-4 h-4" />
            Lead Management / Import
          </div>
          <h2 className="text-xl font-black text-slate-900">Bulk Lead Upload & Duplicate Detection</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Import leads via CSV or Excel spreadsheet. Validates required fields, checks against existing customer phone/email/GST records, and safely imports qualified rows.
          </p>
        </div>

        <button
          onClick={handleDownloadSample}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-slate-600" />
          Download Sample Template (.xlsx)
        </button>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-blue-500 transition-colors">
        <input
          type="file"
          id="bulk-lead-file-input"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor="bulk-lead-file-input"
          className="cursor-pointer flex flex-col items-center justify-center space-y-2"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            {file ? file.name : 'Choose an Excel (.xlsx) or CSV file to import'}
          </div>
          <p className="text-xs text-slate-400">Drag and drop or click here to browse files</p>
        </label>
      </div>

      {/* Parsing indicator */}
      {isParsing && (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Parsing & validating rows...</p>
        </div>
      )}

      {/* Results & Previews */}
      {parsedRows.length > 0 && !isParsing && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold">Total Rows</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalRows}</div>
            </div>
            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
              <div className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Valid & Ready
              </div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{validRows.length}</div>
            </div>
            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
              <div className="text-xs text-amber-800 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Possible Duplicates
              </div>
              <div className="text-2xl font-black text-amber-900 mt-1">{duplicateRows.length}</div>
            </div>
            <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200">
              <div className="text-xs text-rose-800 font-bold flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                Invalid / Errors
              </div>
              <div className="text-2xl font-black text-rose-900 mt-1">{invalidRows.length}</div>
            </div>
          </div>

          {/* Import Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {duplicateRows.length > 0 && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDuplicates}
                    onChange={(e) => setIncludeDuplicates(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>
                    Also import {duplicateRows.length} possible duplicate record(s)
                  </span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-3">
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
                disabled={isImporting || (validRows.length === 0 && !includeDuplicates)}
                onClick={handleStartImport}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing ({importProgress}%)...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm & Import ({includeDuplicates ? validRows.length + duplicateRows.length : validRows.length}) Leads
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Complete Success Banner */}
          {importSummary && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-emerald-900">Import Completed Successfully!</div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    Imported: <strong>{importSummary.imported}</strong> | Skipped: <strong>{importSummary.skipped}</strong> | Failed: <strong>{importSummary.failed}</strong>
                  </div>
                </div>
              </div>
              {onDone && (
                <button
                  onClick={onDone}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs"
                >
                  View Leads Registry
                </button>
              )}
            </div>
          )}

          {/* Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-5 py-3 border-b border-slate-200 font-black text-xs text-slate-700 uppercase tracking-wider bg-slate-50">
              File Preview & Validation ({parsedRows.length} Rows)
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Row</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Company Name</th>
                    <th className="px-3 py-2.5">Contact Person</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">Email</th>
                    <th className="px-3 py-2.5">Source</th>
                    <th className="px-3 py-2.5">Est. Value</th>
                    <th className="px-3 py-2.5">Assigned To</th>
                    <th className="px-3 py-2.5">Remarks / Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {parsedRows.map((r) => {
                    return (
                      <tr
                        key={r.rowIndex}
                        className={
                          !r.isValid
                            ? 'bg-rose-50/40 text-rose-950'
                            : r.isDuplicate
                            ? 'bg-amber-50/40 text-amber-950'
                            : 'hover:bg-slate-50/60'
                        }
                      >
                        <td className="px-3 py-2 font-mono text-3xs text-slate-400">#{r.rowIndex}</td>
                        <td className="px-3 py-2">
                          {!r.isValid ? (
                            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-rose-100 text-rose-800">
                              Invalid
                            </span>
                          ) : r.isDuplicate ? (
                            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-amber-100 text-amber-800">
                              Duplicate
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold uppercase bg-emerald-100 text-emerald-800">
                              Valid
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">{r.companyName || '—'}</td>
                        <td className="px-3 py-2">{r.contactPerson || '—'}</td>
                        <td className="px-3 py-2 font-mono">{r.phone || '—'}</td>
                        <td className="px-3 py-2 truncate max-w-[140px]">{r.email || '—'}</td>
                        <td className="px-3 py-2">{r.source || '—'}</td>
                        <td className="px-3 py-2 font-bold text-slate-800">
                          {r.estimatedValue ? `₹${r.estimatedValue.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="px-3 py-2">{r.assignedEmployeeName || r.assignedEmployee || 'Unassigned'}</td>
                        <td className="px-3 py-2 text-3xs">
                          {r.validationError ? (
                            <span className="text-rose-600 font-semibold">{r.validationError}</span>
                          ) : r.duplicateInfo ? (
                            <span className="text-amber-700 font-medium">{r.duplicateInfo}</span>
                          ) : (
                            <span className="text-slate-400">Pass</span>
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
    </div>
  );
};
