import React, { useState } from 'react';
import {
  FolderOpen,
  Upload,
  Download,
  FileText,
  FileCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  File,
  Filter,
} from 'lucide-react';
import { useCustomerPortal } from '../../../context/CustomerPortalContext';
import { CustomerDocument } from '../../../types/crm';

export const CustomerDocumentsView: React.FC = () => {
  const { documents, uploadDocument, customerUser } = useCustomerPortal();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [docType, setDocType] = useState('GST Certificate');
  const [docDescription, setDocDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const filteredDocs = documents.filter((d) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      if (!d.name.toLowerCase().includes(q) && !d.type.toLowerCase().includes(q)) return false;
    }
    if (typeFilter !== 'all' && d.type !== typeFilter) {
      return false;
    }
    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadError(null);

      // Validate size (15MB)
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > 15) {
        setUploadError(`Selected file (${sizeMb.toFixed(1)}MB) exceeds maximum limit of 15MB.`);
        return;
      }

      // Validate extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx'];
      if (!ext || !allowed.includes(ext)) {
        setUploadError(`File format .${ext} is not allowed. Supported formats: PDF, JPG, PNG, DOCX, XLSX.`);
        return;
      }

      setFileToUpload(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const res = await uploadDocument(fileToUpload, docType, docDescription);
    setIsUploading(false);

    if (res.success) {
      setUploadSuccess('Document successfully uploaded and saved to your secure organization repository.');
      setFileToUpload(null);
      setDocDescription('');
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadSuccess(null);
      }, 2500);
    } else {
      setUploadError(res.error || 'Failed to upload document');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-400" /> Document Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access contracts, tax certificates, purchase orders, and shared deliverables
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-48 sm:w-56"
            />
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Document
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No Documents Available</p>
            <p className="text-[11px] text-slate-500">
              Shared contracts, work orders, and documents uploaded by your organization will be listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Document Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Uploaded By</th>
                  <th className="py-3.5 px-4">Uploaded Date</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                      <File className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>{doc.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{doc.type}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {doc.uploadedByName || doc.uploadedByRole}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" /> Upload Document
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="GST Certificate">GST Certificate</option>
                  <option value="Company Profile">Company Profile / Brochure</option>
                  <option value="Purchase Order">Purchase Order (PO)</option>
                  <option value="Requirement Document">Requirement Specification / RFP</option>
                  <option value="Compliance & NDA">Compliance & NDA Agreement</option>
                  <option value="Other">Other Document</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Select File (Max 15MB)</label>
                <div className="p-4 border-2 border-dashed border-slate-800 hover:border-blue-500/40 rounded-2xl bg-slate-950 text-center space-y-2">
                  <Upload className="w-7 h-7 text-slate-500 mx-auto" />
                  <input
                    type="file"
                    required
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                    className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">Allowed formats: PDF, JPG, PNG, DOCX, XLSX (Max 15MB)</p>
                  {fileToUpload && (
                    <p className="text-xs text-emerald-400 font-bold mt-1">
                      Selected: {fileToUpload.name} ({(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB)
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Description / Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Additional context or notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
