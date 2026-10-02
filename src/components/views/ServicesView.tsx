import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  History,
  Archive,
  RefreshCw,
  Download,
  AlertCircle,
  Clock,
  Layers,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { ServiceItem } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ServiceModal } from '../modals/ServiceModal';
import { PriceHistoryModal } from '../modals/PriceHistoryModal';

export const ServicesView: React.FC = () => {
  const {
    services,
    productCategories,
    deleteService,
    updateService,
  } = useCrmData();
  const { isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive' | 'Archived'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceItem | null>(null);

  const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false);
  const [priceHistoryItem, setPriceHistoryItem] = useState<ServiceItem | null>(null);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const search = searchTerm.toLowerCase();
      const matchSearch =
        (s.serviceName || s.name || '').toLowerCase().includes(search) ||
        (s.serviceCode || s.serviceId || '').toLowerCase().includes(search) ||
        (s.category || '').toLowerCase().includes(search) ||
        (s.description || '').toLowerCase().includes(search) ||
        (s.terms || '').toLowerCase().includes(search);

      if (!matchSearch) return false;

      const currentStatus = s.status || (s.active ? 'Active' : 'Inactive');
      if (statusFilter !== 'ALL' && currentStatus !== statusFilter) return false;

      if (categoryFilter !== 'ALL') {
        const catMatch = s.categoryId === categoryFilter || s.category === categoryFilter;
        if (!catMatch) return false;
      }

      return true;
    });
  }, [services, searchTerm, statusFilter, categoryFilter]);

  const handleDelete = async (srv: ServiceItem) => {
    if (confirm(`Delete service "${srv.name}" from catalog? If it is referenced by historical proposals or invoices, it will be safely deactivated instead of deleted.`)) {
      try {
        await deleteService(srv.id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleToggleActive = async (srv: ServiceItem) => {
    const isNowActive = srv.status ? srv.status === 'Active' : srv.active;
    const nextStatus = isNowActive ? 'Inactive' : 'Active';
    await updateService(srv.id, { status: nextStatus, active: !isNowActive });
  };

  const handleArchive = async (srv: ServiceItem) => {
    if (confirm(`Archive service "${srv.serviceName || srv.name}"?`)) {
      await updateService(srv.id, { status: 'Archived', active: false });
    }
  };

  const handleReactivate = async (srv: ServiceItem) => {
    await updateService(srv.id, { status: 'Active', active: true });
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Service Code',
      'Service Name',
      'Category',
      'Billing Type',
      'Duration / SLA',
      'Price (INR)',
      'GST Tax Rate %',
      'Status',
      'Description',
    ];

    const rows = filteredServices.map((s) => [
      `"${s.serviceCode || s.serviceId || ''}"`,
      `"${(s.serviceName || s.name || '').replace(/"/g, '""')}"`,
      `"${s.category || ''}"`,
      `"${s.billingType || 'One Time'}"`,
      `"${s.duration || 'Per Project'}"`,
      s.price ?? s.basePrice ?? 0,
      s.taxRate ?? s.gstRate ?? 18,
      `"${s.status || (s.active ? 'Active' : 'Inactive')}"`,
      `"${(s.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Services_Catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            Service & AMC Offerings Catalog ({filteredServices.length})
          </h2>
          <p className="text-xs text-slate-500">
            Manage recurring maintenance, deployment services, SLA packages, and consulting rates (services do not require physical stock)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => {
                setServiceToEdit(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" /> Add Service
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search services by name, SLA, terms, code..."
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl bg-white px-3 py-2 text-slate-700"
          >
            <option value="ALL">All Categories</option>
            {productCategories
              .filter((c) => c.type === 'service' || c.type === 'both' || !c.type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-xl bg-white px-3 py-2 text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Service Code</th>
                <th className="py-3 px-4">Service Scope & Terms</th>
                <th className="py-3 px-4">Billing Model</th>
                <th className="py-3 px-4">Duration / SLA</th>
                <th className="py-3 px-4 text-right">Fee / Price</th>
                <th className="py-3 px-4">GST</th>
                <th className="py-3 px-4">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No services found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredServices.map((s) => {
                  const isArchived = s.status === 'Archived';
                  const isActive = s.status ? s.status === 'Active' : s.active;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {s.serviceCode || s.serviceId}
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-bold text-slate-900">{s.serviceName || s.name}</div>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{s.description}</span>
                        {s.category && (
                          <span className="text-[10px] text-indigo-600 block mt-0.5">{s.category}</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {s.billingType || 'One Time'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {s.duration || 'Per Project'}
                      </td>

                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                        ₹{(s.price ?? s.basePrice ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700">
                        {s.taxRate ?? s.gstRate ?? 18}%
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isArchived ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                            Archived
                          </span>
                        ) : (
                          <button
                            disabled={!isAdmin}
                            onClick={() => handleToggleActive(s)}
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {isActive ? 'Active' : 'Inactive'}
                          </button>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setPriceHistoryItem(s);
                                setIsPriceHistoryOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="Price History Audit Log"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setServiceToEdit(s);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="Edit Service"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {isArchived ? (
                              <button
                                onClick={() => handleReactivate(s)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Reactivate Service"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchive(s)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                title="Archive Service"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(s)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Service"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Service Modal */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        serviceToEdit={serviceToEdit}
      />

      {/* Price History Modal */}
      <PriceHistoryModal
        isOpen={isPriceHistoryOpen}
        onClose={() => {
          setIsPriceHistoryOpen(false);
          setPriceHistoryItem(null);
        }}
        item={priceHistoryItem}
        type="service"
      />
    </div>
  );
};
