import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  Edit2,
  DollarSign,
  Download,
  Phone,
  MessageSquare,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { STSRecord } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { TalkHuiModal } from '../sales/TalkHuiModal';
import { CallModal } from '../modals/ActionModals';

interface STSViewProps {
  onOpenSTSModal: (sts?: STSRecord) => void;
  onOpenProposalModal?: (sts?: STSRecord) => void;
}

export const STSView: React.FC<STSViewProps> = ({ onOpenSTSModal, onOpenProposalModal }) => {
  const { stsRecords, updateSTS, employees, initiateCall } = useCrmData();
  const { isAdmin, hasPermission, userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');

  // Talk Hui & Call Modals
  const [talkHuiSTS, setTalkHuiSTS] = useState<STSRecord | null>(null);
  const [callSTS, setCallSTS] = useState<STSRecord | null>(null);

  const permittedSts = useMemo(() => {
    if (isAdmin || hasPermission('canViewAllCustomers')) {
      return stsRecords;
    }
    return stsRecords.filter(
      (s) => s.assignedEmployeeId === userProfile?.uid || s.createdBy === userProfile?.uid
    );
  }, [stsRecords, isAdmin, hasPermission, userProfile]);

  const filteredSts = useMemo(() => {
    return permittedSts.filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        s.stsNumber.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.requirement.toLowerCase().includes(q) ||
        (s.remarks && s.remarks.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchesEmployee = employeeFilter === 'ALL' || s.assignedEmployeeId === employeeFilter;

      return matchesSearch && matchesStatus && matchesEmployee;
    });
  }, [permittedSts, searchTerm, statusFilter, employeeFilter]);

  const handleStatusChange = async (id: string, newStatus: STSRecord['status']) => {
    await updateSTS(id, { status: newStatus });
  };

  const handleExportCsv = () => {
    const exportRows = filteredSts.map((s) => ({
      'STS Number': s.stsNumber,
      'Client / Organization': s.companyName,
      'Contact Person': s.contactPerson,
      Date: s.date,
      Status: s.status,
      'Amount (INR)': s.amount,
      'Assigned Employee': s.assignedEmployeeName || '',
      Requirement: s.requirement,
      'Follow-up Date': s.followUpDate || '',
      Remarks: s.remarks || '',
      'Created By': s.createdByName,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'STS_Records');
    XLSX.writeFile(wb, `sts_export_${Date.now()}.xlsx`);
  };

  const getStatusBadge = (status: STSRecord['status']) => {
    const map: Record<string, string> = {
      Draft: 'bg-slate-100 text-slate-800 border-slate-200',
      'Pending Review': 'bg-amber-100 text-amber-800 border-amber-200',
      Approved: 'bg-blue-100 text-blue-800 border-blue-200',
      'Sent to Customer': 'bg-purple-100 text-purple-800 border-purple-200',
      Closed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    return map[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-amber-600" />
            STS Management (Sales Technical Specifications)
          </h2>
          <p className="text-xs text-slate-500">
            Define requirements, engineering specifications, estimates, and customer approvals
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('canExportData') && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          )}

          {hasPermission('canCreateSTS') && (
            <button
              onClick={() => onOpenSTSModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Create STS
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search STS #, client, requirement..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Sent to Customer">Sent to Customer</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {isAdmin && (
          <div>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Assigned Executives</option>
              {employees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* STS Records List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">STS Number</th>
                <th className="py-3 px-4 font-semibold">Client Organization</th>
                <th className="py-3 px-4 font-semibold">Requirement Summary</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Valuation</th>
                <th className="py-3 px-4 font-semibold">Assigned Executive</th>
                <th className="py-3 px-4 font-semibold">Follow-up</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No STS records found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredSts.map((sts) => (
                  <tr key={sts.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono text-slate-900">{sts.stsNumber}</td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{sts.companyName}</div>
                      <span className="text-[11px] text-slate-500">{sts.contactPerson}</span>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-600">{sts.requirement}</p>
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={sts.status}
                        onChange={(e) => handleStatusChange(sts.id, e.target.value as any)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${getStatusBadge(
                          sts.status
                        )} bg-transparent`}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Pending Review">Pending Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Sent to Customer">Sent to Customer</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹{sts.amount.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-slate-600">{sts.assignedEmployeeName}</td>

                    <td className="py-3 px-4">
                      {sts.followUpDate ? (
                        <span className="font-medium text-amber-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {sts.followUpDate}
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Talk Hui Quick Action */}
                        <button
                          onClick={() => setTalkHuiSTS(sts)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold shadow-2xs transition-colors flex items-center gap-1"
                          title="Record Talk Hui (Conversation Status)"
                        >
                          <MessageSquare className="w-3 h-3 text-amber-600" />
                          <span>Talk Hui: {sts.talkStatus || 'Pending'}</span>
                        </button>

                        {/* Quick Direct Call */}
                        {hasPermission('makeCalls') && (
                          <button
                            onClick={() => {
                              const phoneNum = sts.phone || sts.mobile;
                              if (phoneNum) {
                                window.location.href = `tel:${phoneNum}`;
                                initiateCall({
                                  stsId: sts.id,
                                  companyName: sts.companyName,
                                  contactPerson: sts.contactPerson,
                                  mobile: phoneNum,
                                }).catch(console.error);
                              }
                              setCallSTS(sts);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Call STS Client"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onOpenProposalModal && hasPermission('canCreateProposal') && (
                          <button
                            onClick={() => onOpenProposalModal(sts)}
                            className="p-1.5 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Generate Proposal from STS"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenSTSModal(sts)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit STS"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Talk Hui Modal */}
      {talkHuiSTS && (
        <TalkHuiModal
          isOpen={!!talkHuiSTS}
          onClose={() => setTalkHuiSTS(null)}
          sts={talkHuiSTS}
        />
      )}

      {/* Call Modal */}
      {callSTS && (
        <CallModal
          isOpen={!!callSTS}
          onClose={() => setCallSTS(null)}
          entity={callSTS}
          entityType="sts"
        />
      )}
    </div>
  );
};
