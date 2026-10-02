import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Upload,
  Download,
  Eye,
  Trash2,
  Share2,
  Lock,
  Globe,
  FileText,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  X,
  Plus,
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Customer, CustomerDocument } from '../../types/crm';
import { useAuth } from '../../context/AuthContext';

interface CustomerDocumentsTabProps {
  customer: Customer;
}

export const CustomerDocumentsTab: React.FC<CustomerDocumentsTabProps> = ({ customer }) => {
  const { userProfile, isAdmin } = useAuth();
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'Customer' | 'Internal'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Requirement Document');
  const [docDescription, setDocDescription] = useState('');
  const [docVisibility, setDocVisibility] = useState<'Customer' | 'Internal'>('Customer');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Real-time listener for customer documents
  useEffect(() => {
    const custId = customer.id;
    const q = query(collection(db, 'documents'), where('customerId', '==', custId));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CustomerDocument));
        list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setDocuments(list);
      },
      (err) => console.warn('Customer documents listener error:', err)
    );

    return () => unsub();
  }, [customer.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadError(null);

      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > 15) {
        setUploadError(`Selected file (${sizeMb.toFixed(1)}MB) exceeds maximum limit of 15MB.`);
        return;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowed = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx'];
      if (!ext || !allowed.includes(ext)) {
        setUploadError(`File format .${ext} is not allowed. Supported formats: PDF, JPG, PNG, DOCX, XLSX.`);
        return;
      }

      setFileToUpload(file);
      if (!docName.trim()) {
        setDocName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/customer/upload-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: docName.trim() || fileToUpload.name,
              type: docType,
              fileBase64: base64Data,
              mimeType: fileToUpload.type,
              customerId: customer.id,
              uploadedBy: userProfile?.uid || 'admin',
              uploadedByName: userProfile?.name || 'Administrator',
              uploadedByRole: 'Admin',
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            setUploadError(data.error || 'Document upload failed.');
            setIsUploading(false);
            return;
          }

          // Save to Firestore documents collection
          const docId = data.documentId;
          const newDocRecord: CustomerDocument = {
            id: docId,
            documentId: docId,
            customerId: customer.id,
            organizationId: customer.id,
            name: docName.trim() || fileToUpload.name,
            type: docType,
            fileUrl: data.fileUrl,
            fileSize: data.fileSize,
            fileType: data.fileType,
            uploadedBy: userProfile?.uid || 'admin',
            uploadedByName: userProfile?.name || 'Administrator',
            uploadedByRole: 'Admin',
            uploadedAt: new Date().toISOString(),
            visibility: docVisibility,
            status: 'Active',
            description: docDescription.trim(),
          };

          await setDoc(doc(db, 'documents', docId), newDocRecord);

          setUploadSuccess(`Document "${newDocRecord.name}" successfully uploaded and shared as ${docVisibility}.`);
          setFileToUpload(null);
          setDocName('');
          setDocDescription('');
          setIsUploading(false);

          setTimeout(() => {
            setIsUploadOpen(false);
            setUploadSuccess(null);
          }, 2000);
        } catch (err: any) {
          console.error(err);
          setUploadError(err.message || 'File processing failed');
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(fileToUpload);
    } catch (e: any) {
      setUploadError(e.message || 'Failed to upload document');
      setIsUploading(false);
    }
  };

  const handleToggleVisibility = async (d: CustomerDocument) => {
    const newVisibility = d.visibility === 'Customer' ? 'Internal' : 'Customer';
    try {
      await updateDoc(doc(db, 'documents', d.id), {
        visibility: newVisibility,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  const handleDeleteDocument = async (d: CustomerDocument) => {
    // Section 22: Do not permanently delete historical financial documents accidentally
    const isFinancial =
      d.type === 'Invoice' ||
      d.type === 'Receipt' ||
      d.name.toLowerCase().includes('invoice') ||
      d.name.toLowerCase().includes('receipt') ||
      d.name.toLowerCase().includes('tax');

    if (isFinancial) {
      setDeleteWarning(`"${d.name}" is designated as a historical financial document. Statutory compliance rules prohibit accidental deletion.`);
      setTimeout(() => setDeleteWarning(null), 5000);
      return;
    }

    if (confirm(`Are you sure you want to delete "${d.name}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'documents', d.id));
      } catch (e) {
        console.error('Failed to delete document:', e);
      }
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      if (!d.name.toLowerCase().includes(q) && !d.type.toLowerCase().includes(q)) return false;
    }
    if (visibilityFilter !== 'all' && d.visibility !== visibilityFilter) {
      return false;
    }
    if (typeFilter !== 'all' && d.type !== typeFilter) {
      return false;
    }
    return true;
  });

  const customerCount = documents.filter((d) => d.visibility === 'Customer').length;
  const internalCount = documents.filter((d) => d.visibility === 'Internal').length;

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-600" />
            Document Management Center
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Admin Path: <span className="font-mono text-indigo-600 font-semibold">/admin/customers/{customer.customerId}/documents</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Upload className="w-3.5 h-3.5" /> Upload Document
          </button>
        </div>
      </div>

      {deleteWarning && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{deleteWarning}</span>
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 block text-[10px] font-bold uppercase">Total Documents</span>
          <span className="text-lg font-black text-slate-800">{documents.length}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-emerald-600 block text-[10px] font-bold uppercase">Shared with Customer</span>
          <span className="text-lg font-black text-emerald-600">{customerCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 block text-[10px] font-bold uppercase">Internal Only</span>
          <span className="text-lg font-black text-slate-600">{internalCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents by title or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="all">All Visibility</option>
            <option value="Customer">Shared with Customer</option>
            <option value="Internal">Internal Only</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium"
          >
            <option value="all">All Types</option>
            <option value="GST Certificate">GST Certificate</option>
            <option value="Company Profile">Company Profile</option>
            <option value="Purchase Order">Purchase Order</option>
            <option value="Requirement Document">Requirement Document</option>
            <option value="Contract / Agreement">Contract / Agreement</option>
            <option value="NDA">NDA</option>
            <option value="Proposal">Proposal</option>
            <option value="Invoice">Invoice</option>
            <option value="Receipt">Receipt</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No documents found</p>
            <p className="text-[11px] text-slate-400">
              Upload compliance files, purchase orders, or agreements to share with this customer.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocs.map((docItem) => {
              const isShared = docItem.visibility === 'Customer';
              return (
                <div key={docItem.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-4 transition">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {docItem.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600">
                          {docItem.type}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                            isShared
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isShared ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {isShared ? 'Customer Shared' : 'Internal Only'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                        <span>Uploaded: {new Date(docItem.uploadedAt).toLocaleDateString()}</span>
                        <span>By: {docItem.uploadedByName || 'Staff'}</span>
                        {docItem.fileSize && <span>{(docItem.fileSize / 1024).toFixed(0)} KB</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Toggle Share / Hide with Customer */}
                    <button
                      onClick={() => handleToggleVisibility(docItem)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition ${
                        isShared
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                      title={isShared ? 'Hide from Customer' : 'Share with Customer'}
                    >
                      <Share2 className="w-3 h-3" />
                      {isShared ? 'Hide from Customer' : 'Share with Customer'}
                    </button>

                    {/* View / Download */}
                    {docItem.fileUrl && (
                      <a
                        href={docItem.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        title="Download / View"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}

                    {/* Delete / Archive */}
                    <button
                      onClick={() => handleDeleteDocument(docItem)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      title="Delete / Archive Document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" /> Upload Organization Document
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Document File <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                  onChange={handleFileSelect}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-xl p-1"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Allowed formats: PDF, JPG, PNG, DOCX, XLSX (Max size: 15MB)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Master Services Agreement 2026"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Category</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800"
                  >
                    <option value="GST Certificate">GST Certificate</option>
                    <option value="Company Profile">Company Profile</option>
                    <option value="Purchase Order">Purchase Order</option>
                    <option value="Requirement Document">Requirement Document</option>
                    <option value="Contract / Agreement">Contract / Agreement</option>
                    <option value="NDA">NDA</option>
                    <option value="Tax Compliance">Tax Compliance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Visibility Permission</label>
                  <select
                    value={docVisibility}
                    onChange={(e) => setDocVisibility(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-semibold"
                  >
                    <option value="Customer">Share with Customer (Portal)</option>
                    <option value="Internal">Internal Only (Staff Eyes Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional internal notes or instructions for the customer..."
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isUploading ? 'Uploading...' : 'Save & Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
