import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CheckCircle2,
  XCircle,
  Receipt,
  FileText,
} from 'lucide-react';
import { useCrmData, maskAccountNumber } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { VendorRecord } from '../../types/crm';
import { formatCurrency } from '../../utils/financeUtils';
import { VendorModal } from '../modals/VendorModal';

export const VendorsView: React.FC = () => {
  const { vendors, expenses, toggleVendorStatus } = useCrmData();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<VendorRecord | null>(null);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchId = (v.vendorId || '').toLowerCase().includes(term);
        const matchName = (v.vendorName || '').toLowerCase().includes(term);
        const matchComp = (v.company || '').toLowerCase().includes(term);
        const matchGst = (v.gstin || '').toLowerCase().includes(term);
        if (!matchId && !matchName && !matchComp && !matchGst) return false;
      }

      if (statusFilter !== 'all' && v.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [vendors, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Vendor Management</h2>
          <p className="text-xs text-slate-400">
            Registered corporate vendors, suppliers, contractors, and settlement accounts
          </p>
        </div>

        <button
          onClick={() => {
            setVendorToEdit(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
        >
          <Plus className="w-4 h-4" /> Add Vendor
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by vendor name, company, GSTIN, ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Vendors</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <span>No vendor records found.</span>
          </div>
        ) : (
          filteredVendors.map((vendor) => {
            const vendorExpenses = expenses.filter((e) => e.vendorId === vendor.id);
            const totalDisbursed = vendorExpenses
              .filter((e) => e.status === 'PAID')
              .reduce((sum, e) => sum + (e.total || 0), 0);

            return (
              <div
                key={vendor.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-purple-400 font-bold block mb-0.5">
                        {vendor.vendorId}
                      </span>
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {vendor.company}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Contact: {vendor.vendorName}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        vendor.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {vendor.status}
                    </span>
                  </div>

                  {vendor.gstin && (
                    <div className="mt-3 inline-block px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-md text-[11px] font-mono text-slate-300">
                      GSTIN: {vendor.gstin}
                    </div>
                  )}

                  {/* Contact details */}
                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    {vendor.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                    {vendor.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{vendor.email}</span>
                      </div>
                    )}
                    {(vendor.city || vendor.state) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{[vendor.city, vendor.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Bank snapshot info (masked) */}
                  {vendor.bankDetails && (
                    <div className="mt-3 p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 space-y-0.5">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                        <CreditCard className="w-3 h-3 text-purple-400" />
                        <span>{vendor.bankDetails.bankName || 'Settlement Bank'}</span>
                      </div>
                      <p className="text-slate-400">
                        A/C: {maskAccountNumber(vendor.bankDetails.accountNumber)}
                      </p>
                      {vendor.bankDetails.ifsc && (
                        <p className="text-slate-500 font-mono">IFSC: {vendor.bankDetails.ifsc}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Settled</span>
                    <span className="font-bold text-emerald-400">{formatCurrency(totalDisbursed)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleVendorStatus(vendor.id)}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                    >
                      {vendor.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => {
                        setVendorToEdit(vendor);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                      title="Edit Vendor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <VendorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setVendorToEdit(null);
        }}
        vendorToEdit={vendorToEdit}
      />
    </div>
  );
};
