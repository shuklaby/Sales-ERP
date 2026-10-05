import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Phone,
  MessageSquare,
  Mail,
  FileText,
  FileCheck,
  Edit2,
  Trash2,
  Download,
  Eye,
  Calendar,
  X,
  Clock,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Customer, CustomerStatus } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { CallModal, WhatsAppModal, EmailModal } from '../modals/ActionModals';

interface CustomersViewProps {
  onOpenCustomerModal: (customer?: Customer) => void;
  onOpenCustomerDetail: (customer: Customer) => void;
  onOpenProposalModal: (customer: Customer) => void;
  onOpenSTSModal: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenCustomerModal,
  onOpenCustomerDetail,
  onOpenProposalModal,
  onOpenSTSModal,
}) => {
  const { customers, deleteCustomer, updateCustomer, employees } = useCrmData();
  const { isAdmin, hasPermission, userProfile } = useAuth();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [createdDateFilter, setCreatedDateFilter] = useState<string>('ALL');
  const [followupDateFilter, setFollowupDateFilter] = useState<string>('ALL');

  // Action modals state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [isWaOpen, setIsWaOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  // Role & Permission check: Admin sees all customers, Employee ONLY sees assigned customers
  const permittedCustomers = useMemo(() => {
    if (isAdmin) {
      return customers;
    }
    return customers.filter(
      (c) =>
        c.assignedEmployeeId === userProfile?.uid ||
        c.assignedEmployeeId === userProfile?.employeeId ||
        c.createdBy === userProfile?.uid
    );
  }, [customers, isAdmin, userProfile]);

  // Distinct lead sources for filter dropdown
  const leadSources = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.leadSource) set.add(c.leadSource);
    });
    return Array.from(set).sort();
  }, [customers]);

  const isFiltered = useMemo(() => {
    return (
      searchTerm.trim() !== '' ||
      statusFilter !== 'ALL' ||
      employeeFilter !== 'ALL' ||
      sourceFilter !== 'ALL' ||
      createdDateFilter !== 'ALL' ||
      followupDateFilter !== 'ALL'
    );
  }, [searchTerm, statusFilter, employeeFilter, sourceFilter, createdDateFilter, followupDateFilter]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setEmployeeFilter('ALL');
    setSourceFilter('ALL');
    setCreatedDateFilter('ALL');
    setFollowupDateFilter('ALL');
  };

  const filteredCustomers = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    return permittedCustomers.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.companyName.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.alternateMobile && c.alternateMobile.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.gstNumber && c.gstNumber.toLowerCase().includes(q)) ||
        c.customerId.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesEmployee = employeeFilter === 'ALL' || c.assignedEmployeeId === employeeFilter;
      const matchesSource = sourceFilter === 'ALL' || c.leadSource === sourceFilter;

      // Created Date Filter
      let matchesCreated = true;
      if (createdDateFilter !== 'ALL') {
        const createdDate = c.createdAt ? new Date(c.createdAt) : null;
        if (!createdDate) {
          matchesCreated = false;
        } else {
          const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);
          if (createdDateFilter === 'TODAY') {
            matchesCreated = c.createdAt.startsWith(todayStr);
          } else if (createdDateFilter === 'WEEK') {
            matchesCreated = diffDays <= 7;
          } else if (createdDateFilter === 'MONTH') {
            matchesCreated = diffDays <= 30;
          }
        }
      }

      // Follow-up Date Filter
      let matchesFollowup = true;
      if (followupDateFilter !== 'ALL') {
        const fupDate = c.nextFollowupDate || c.nextFollowUp;
        if (!fupDate) {
          matchesFollowup = false;
        } else if (followupDateFilter === 'TODAY') {
          matchesFollowup = fupDate.startsWith(todayStr);
        } else if (followupDateFilter === 'TOMORROW') {
          matchesFollowup = fupDate.startsWith(tomorrowStr);
        } else if (followupDateFilter === 'OVERDUE') {
          matchesFollowup = fupDate < todayStr;
        } else if (followupDateFilter === 'UPCOMING') {
          matchesFollowup = fupDate >= todayStr;
        }
      }

      return matchesSearch && matchesStatus && matchesEmployee && matchesSource && matchesCreated && matchesFollowup;
    });
  }, [
    permittedCustomers,
    searchTerm,
    statusFilter,
    employeeFilter,
    sourceFilter,
    createdDateFilter,
    followupDateFilter,
  ]);

  const handleStatusChange = async (id: string, newStatus: CustomerStatus) => {
    await updateCustomer(id, { status: newStatus });
  };

  const handleAssignEmployee = async (id: string, empId: string) => {
    const emp = employees.find((e) => e.uid === empId);
    await updateCustomer(id, {
      assignedEmployeeId: empId,
      assignedEmployeeName: emp?.name || 'Unassigned',
    });
  };

  const handleDelete = async (customer: Customer) => {
    if (confirm(`Are you sure you want to delete "${customer.companyName}"? This action cannot be undone.`)) {
      await deleteCustomer(customer.id);
    }
  };

  const handleExportCsv = () => {
    const exportRows = filteredCustomers.map((c) => ({
      'Customer ID': c.customerId,
      'Company Name': c.companyName,
      'Contact Person': c.contactPerson,
      Mobile: c.mobile,
      'Alternate Mobile': c.alternateMobile || c.alternateNumber || '',
      Email: c.email || '',
      'GST Number': c.gstNumber || '',
      Address: c.address || '',
      City: c.city || '',
      State: c.state || '',
      Pincode: c.pincode || '',
      Status: c.status,
      'Lead Source': c.leadSource || '',
      'Assigned Employee': c.assignedEmployeeName || '',
      'Next Follow-up Date': c.nextFollowupDate || c.nextFollowUp || '',
      'Next Follow-up Time': c.nextFollowupTime || '',
      Notes: c.notes || '',
      'Created Date': c.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `customers_export_${Date.now()}.xlsx`);
  };

  const getStatusBadge = (status: Customer['status']) => {
    const map: Record<string, string> = {
      New: 'bg-blue-100 text-blue-800 border-blue-200',
      Contacted: 'bg-purple-100 text-purple-800 border-purple-200',
      Interested: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      Meeting: 'bg-amber-100 text-amber-800 border-amber-200',
      'Proposal Sent': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      Negotiation: 'bg-orange-100 text-orange-800 border-orange-200',
      Won: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Lost: 'bg-rose-100 text-rose-800 border-rose-200',
      Inactive: 'bg-slate-200 text-slate-700 border-slate-300',
      'Follow-up': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return map[status] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-slate-800" />
            Customer Management ({filteredCustomers.length})
          </h2>
          <p className="text-xs text-slate-500">
            Real-time corporate client directory, account assignments, follow-up scheduler and timeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('exportData') && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
          )}

          {(isAdmin || hasPermission('createCustomer')) && (
            <button
              onClick={() => onOpenCustomerModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Search Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Company, Contact Person, Mobile, Email, GST Number, Customer ID..."
              className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isFiltered && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold border border-rose-200 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 border-t border-slate-100 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Meeting">Meeting</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Assigned Employee Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Assigned Executive
            </label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Executives</option>
              {employees.map((emp) => (
                <option key={emp.uid} value={emp.uid}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Source Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Lead Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Sources</option>
              {leadSources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          {/* Created Date Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Created Date
            </label>
            <select
              value={createdDateFilter}
              onChange={(e) => setCreatedDateFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Any Time</option>
              <option value="TODAY">Created Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>

          {/* Follow-up Date Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Follow-up Date
            </label>
            <select
              value={followupDateFilter}
              onChange={(e) => setFollowupDateFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Follow-ups</option>
              <option value="TODAY">Due Today</option>
              <option value="TOMORROW">Due Tomorrow</option>
              <option value="OVERDUE">Overdue</option>
              <option value="UPCOMING">Upcoming</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Customer / ID</th>
                <th className="py-3 px-4 font-semibold">Contact Person & Phone</th>
                <th className="py-3 px-4 font-semibold">GSTIN / City</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Assigned To</th>
                <th className="py-3 px-4 font-semibold">Next Follow-up</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No customers found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isFiltered ? 'Try adjusting your search criteria or clearing filters.' : 'Add your first corporate client to get started.'}
                    </p>
                    {isFiltered && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        <RotateCcw className="w-3 h-3" /> Clear All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div
                        onClick={() => onOpenCustomerDetail(cust)}
                        className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
                      >
                        {cust.companyName}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {cust.customerId}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{cust.contactPerson}</div>
                      <a
                        href={`tel:${cust.mobile}`}
                        className="text-[11px] text-indigo-600 font-mono hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-slate-400" /> {cust.mobile}
                      </a>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-slate-800 font-mono block">{cust.gstNumber || 'Unregistered'}</span>
                      <span className="text-[11px] text-slate-400">
                        {cust.city ? `${cust.city}${cust.state ? `, ${cust.state}` : ''}` : 'N/A'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={cust.status}
                        onChange={(e) => handleStatusChange(cust.id, e.target.value as CustomerStatus)}
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${getStatusBadge(
                          cust.status
                        )} bg-transparent cursor-pointer`}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Interested">Interested</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Proposal Sent">Proposal Sent</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {isAdmin ? (
                        <select
                          value={cust.assignedEmployeeId || ''}
                          onChange={(e) => handleAssignEmployee(cust.id, e.target.value)}
                          className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium focus:ring-1 focus:ring-slate-900 max-w-[130px] truncate"
                        >
                          <option value="">Unassigned</option>
                          {employees.map((emp) => (
                            <option key={emp.uid} value={emp.uid}>
                              {emp.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{cust.assignedEmployeeName || 'Unassigned'}</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {cust.nextFollowupDate || cust.nextFollowUp ? (
                        <span className="font-medium text-amber-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {cust.nextFollowupDate || cust.nextFollowUp}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Quick Call */}
                        {hasPermission('makeCalls') && (
                          <button
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsCallOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Log Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Quick WhatsApp */}
                        {hasPermission('sendWhatsApp') && (
                          <button
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsWaOpen(true);
                            }}
                            className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Send WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Quick Email */}
                        {hasPermission('sendEmail') && (
                          <button
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsEmailOpen(true);
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Send Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Create Proposal */}
                        {hasPermission('createProposal') && (
                          <button
                            onClick={() => onOpenProposalModal(cust)}
                            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Generate Proposal"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View Full 9-Tab Customer Details */}
                        <button
                          onClick={() => onOpenCustomerDetail(cust)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Full Customer Details & 9 Tabs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        {(isAdmin || hasPermission('editCustomer')) && (
                          <button
                            onClick={() => onOpenCustomerModal(cust)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        {(isAdmin || hasPermission('deleteCustomer')) && (
                          <button
                            onClick={() => handleDelete(cust)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Action Modals */}
      {selectedCustomer && (
        <>
          <CallModal
            isOpen={isCallOpen}
            onClose={() => setIsCallOpen(false)}
            entity={selectedCustomer}
            entityType="customer"
          />
          <WhatsAppModal
            isOpen={isWaOpen}
            onClose={() => setIsWaOpen(false)}
            entity={selectedCustomer}
            entityType="customer"
          />
          <EmailModal
            isOpen={isEmailOpen}
            onClose={() => setIsEmailOpen(false)}
            entity={selectedCustomer}
            entityType="customer"
          />
        </>
      )}
    </div>
  );
};
