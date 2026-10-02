import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle,
  Truck,
  Building2,
  Calendar,
  AlertCircle,
  X,
  FileText,
  Trash2,
  Edit2,
  Download,
  DollarSign,
  PackageCheck,
  Ban,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  PurchaseRecord,
  PurchaseStatus,
  SupplierRecord,
  PurchaseItem,
} from '../../types/crm';

export const PurchasesView: React.FC = () => {
  const {
    purchases,
    suppliers,
    products,
    createPurchase,
    updatePurchase,
    receivePurchaseGoods,
    cancelPurchase,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    generateNextPurchaseNumber,
    generateNextSupplierCode,
  } = useCrmData();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create PO Modal state
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poNumber, setPoNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [poStatus, setPoStatus] = useState<PurchaseStatus>('Draft');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<PurchaseItem[]>([]);
  const [poSubmitting, setPoSubmitting] = useState(false);
  const [poError, setPoError] = useState('');

  // Receive Goods Modal state
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [activePoForReceive, setActivePoForReceive] = useState<PurchaseRecord | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState('');
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [receiveError, setReceiveError] = useState('');

  // Supplier Modal state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<SupplierRecord | null>(null);
  const [supCode, setSupCode] = useState('');
  const [supCompany, setSupCompany] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supGst, setSupGst] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supCity, setSupCity] = useState('');
  const [supState, setSupState] = useState('');
  const [supPincode, setSupPincode] = useState('');
  const [supStatus, setSupStatus] = useState<'Active' | 'Inactive'>('Active');
  const [supSubmitting, setSupSubmitting] = useState(false);
  const [supError, setSupError] = useState('');

  // Filtered POs
  const filteredPurchases = useMemo(() => {
    return purchases.filter((po) => {
      if (statusFilter !== 'ALL' && po.status !== statusFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match =
          po.purchaseNumber.toLowerCase().includes(s) ||
          po.supplierSnapshot?.companyName.toLowerCase().includes(s) ||
          (po.notes || '').toLowerCase().includes(s) ||
          po.items.some((it) => (it.productName || '').toLowerCase().includes(s));
        if (!match) return false;
      }
      return true;
    });
  }, [purchases, statusFilter, searchTerm]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          sup.companyName.toLowerCase().includes(s) ||
          sup.supplierCode.toLowerCase().includes(s) ||
          sup.contactPerson.toLowerCase().includes(s) ||
          sup.phone.includes(s) ||
          sup.email.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [suppliers, searchTerm]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalSpend = 0;
    let pendingReceiptCount = 0;
    let receivedCount = 0;

    purchases.forEach((po) => {
      if (po.status !== 'Cancelled') {
        totalSpend += po.grandTotal;
      }
      if (po.status === 'Ordered' || po.status === 'Partially Received') {
        pendingReceiptCount++;
      } else if (po.status === 'Received') {
        receivedCount++;
      }
    });

    return {
      totalOrders: purchases.length,
      pendingReceiptCount,
      receivedCount,
      totalSpend,
      totalSuppliers: suppliers.length,
    };
  }, [purchases, suppliers]);

  // Open Create PO Modal
  const handleOpenCreatePO = async () => {
    const nextPo = await generateNextPurchaseNumber();
    setPoNumber(nextPo);
    setSupplierId(suppliers[0]?.id || '');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setExpectedDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    setPoStatus('Ordered');
    setPoNotes('');
    setPoItems([
      {
        productId: products[0]?.id || '',
        productCode: products[0]?.productCode || '',
        productName: products[0]?.productName || products[0]?.name || '',
        quantity: 10,
        purchasePrice: products[0]?.purchasePrice || (products[0]?.sellingPrice ?? products[0]?.price ?? 1000) * 0.7,
        discount: 0,
        taxRate: 18,
        taxAmount: 0,
        lineTotal: 0,
      },
    ]);
    setPoError('');
    setIsPoModalOpen(true);
  };

  // Open Supplier Modal
  const handleOpenSupplierModal = async (sup?: SupplierRecord) => {
    if (sup) {
      setSupplierToEdit(sup);
      setSupCode(sup.supplierCode);
      setSupCompany(sup.companyName);
      setSupContact(sup.contactPerson);
      setSupPhone(sup.phone);
      setSupEmail(sup.email);
      setSupGst(sup.gstNumber || '');
      setSupAddress(sup.address);
      setSupCity(sup.city);
      setSupState(sup.state);
      setSupPincode(sup.pincode);
      setSupStatus(sup.status);
    } else {
      setSupplierToEdit(null);
      const nextCode = await generateNextSupplierCode();
      setSupCode(nextCode);
      setSupCompany('');
      setSupContact('');
      setSupPhone('');
      setSupEmail('');
      setSupGst('');
      setSupAddress('');
      setSupCity('');
      setSupState('');
      setSupPincode('');
      setSupStatus('Active');
    }
    setSupError('');
    setIsSupplierModalOpen(true);
  };

  // PO Items handling
  const handleAddItemToPo = () => {
    const defaultProd = products[0];
    setPoItems([
      ...poItems,
      {
        productId: defaultProd?.id || '',
        productCode: defaultProd?.productCode || '',
        productName: defaultProd?.productName || defaultProd?.name || '',
        quantity: 1,
        purchasePrice: defaultProd?.purchasePrice || (defaultProd?.sellingPrice ?? defaultProd?.price ?? 1000) * 0.7,
        discount: 0,
        taxRate: 18,
        taxAmount: 0,
        lineTotal: 0,
      },
    ]);
  };

  const handleRemovePoItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handlePoItemChange = (index: number, field: string, val: any) => {
    setPoItems((prev) => {
      const copy = [...prev];
      const it = { ...copy[index], [field]: val };

      if (field === 'productId') {
        const p = products.find((prod) => prod.id === val);
        if (p) {
          it.productCode = p.productCode;
          it.productName = p.productName || p.name;
          it.purchasePrice = p.purchasePrice || (p.sellingPrice ?? p.price ?? 1000) * 0.7;
          it.taxRate = p.taxRate ?? p.gstRate ?? 18;
        }
      }

      const q = Math.max(1, Number(it.quantity) || 1);
      const price = Math.max(0, Number(it.purchasePrice) || 0);
      const gross = q * price;
      const disc = Math.min(100, Math.max(0, Number(it.discount) || 0));
      const taxable = gross - (gross * disc) / 100;
      const taxRate = Math.max(0, Number(it.taxRate) || 0);
      const taxAmount = (taxable * taxRate) / 100;
      const lineTotal = taxable + taxAmount;

      it.quantity = q;
      it.purchasePrice = price;
      it.discount = disc;
      it.taxRate = taxRate;
      it.taxAmount = taxAmount;
      it.lineTotal = lineTotal;

      copy[index] = it;
      return copy;
    });
  };

  // PO Totals
  const poCalculations = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    poItems.forEach((it) => {
      const q = Number(it.quantity) || 1;
      const price = Number(it.purchasePrice) || 0;
      const gross = q * price;
      const discAmt = (gross * (Number(it.discount) || 0)) / 100;
      const taxable = gross - discAmt;
      const tax = (taxable * (Number(it.taxRate) || 0)) / 100;

      subtotal += gross;
      totalDiscount += discAmt;
      totalTax += tax;
      grandTotal += taxable + tax;
    });

    return { subtotal, totalDiscount, totalTax, grandTotal };
  }, [poItems]);

  // Submit PO
  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setPoError('Please select a supplier.');
      return;
    }
    if (poItems.length === 0) {
      setPoError('Please add at least one line item to the purchase order.');
      return;
    }

    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup) {
      setPoError('Selected supplier not found.');
      return;
    }

    setPoSubmitting(true);
    setPoError('');

    try {
      await createPurchase({
        purchaseId: poNumber,
        purchaseNumber: poNumber,
        supplierId,
        supplierSnapshot: sup,
        items: poItems,
        subtotal: poCalculations.subtotal,
        discount: poCalculations.totalDiscount,
        tax: poCalculations.totalTax,
        grandTotal: poCalculations.grandTotal,
        purchaseDate,
        expectedDate,
        status: poStatus,
        notes: poNotes,
      });

      setIsPoModalOpen(false);
    } catch (err: any) {
      setPoError(err.message || 'Failed to create purchase order');
    } finally {
      setPoSubmitting(false);
    }
  };

  // Open Receive Goods Modal
  const handleOpenReceiveModal = (po: PurchaseRecord) => {
    setActivePoForReceive(po);
    const initialQtyMap: Record<string, number> = {};

    po.items.forEach((it) => {
      const receivedSoFar = (po.receivedItems || [])
        .filter((r) => r.productId === it.productId)
        .reduce((sum, r) => sum + r.receivedQuantity, 0);
      const remaining = Math.max(0, it.quantity - receivedSoFar);
      initialQtyMap[it.productId] = remaining;
    });

    setReceiveQuantities(initialQtyMap);
    setReceiveNotes('');
    setReceiveError('');
    setIsReceiveModalOpen(true);
  };

  // Submit Receive Goods
  const handleSubmitReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePoForReceive) return;

    const itemsToReceive = Object.entries(receiveQuantities)
      .map(([productId, quantity]) => ({ productId, quantity: Number(quantity) || 0 }))
      .filter((it) => it.quantity > 0);

    if (itemsToReceive.length === 0) {
      setReceiveError('Please specify quantity to receive for at least one item.');
      return;
    }

    setReceiveSubmitting(true);
    setReceiveError('');

    try {
      await receivePurchaseGoods({
        purchaseId: activePoForReceive.id,
        itemsToReceive,
        notes: receiveNotes.trim() || undefined,
      });

      setIsReceiveModalOpen(false);
      setActivePoForReceive(null);
    } catch (err: any) {
      setReceiveError(err.message || 'Failed to record received goods');
    } finally {
      setReceiveSubmitting(false);
    }
  };

  // Supplier Save
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supCompany.trim()) {
      setSupError('Company Name is required.');
      return;
    }

    setSupSubmitting(true);
    setSupError('');

    try {
      if (supplierToEdit) {
        await updateSupplier(supplierToEdit.id, {
          companyName: supCompany.trim(),
          contactPerson: supContact.trim(),
          phone: supPhone.trim(),
          email: supEmail.trim(),
          gstNumber: supGst.trim(),
          address: supAddress.trim(),
          city: supCity.trim(),
          state: supState.trim(),
          pincode: supPincode.trim(),
          status: supStatus,
        });
      } else {
        await addSupplier({
          supplierId: supCode,
          supplierCode: supCode,
          companyName: supCompany.trim(),
          contactPerson: supContact.trim(),
          phone: supPhone.trim(),
          email: supEmail.trim(),
          gstNumber: supGst.trim(),
          address: supAddress.trim(),
          city: supCity.trim(),
          state: supState.trim(),
          pincode: supPincode.trim(),
          status: supStatus,
        });
      }

      setIsSupplierModalOpen(false);
    } catch (err: any) {
      setSupError(err.message || 'Failed to save supplier');
    } finally {
      setSupSubmitting(false);
    }
  };

  // Export POs CSV
  const handleExportPoCSV = () => {
    const headers = [
      'PO Number',
      'Supplier',
      'Purchase Date',
      'Expected Date',
      'Total Items',
      'Grand Total (INR)',
      'Status',
      'Notes',
    ];

    const rows = filteredPurchases.map((po) => [
      `"${po.purchaseNumber}"`,
      `"${(po.supplierSnapshot?.companyName || '').replace(/"/g, '""')}"`,
      `"${po.purchaseDate}"`,
      `"${po.expectedDate || ''}"`,
      po.items.length,
      po.grandTotal,
      `"${po.status}"`,
      `"${(po.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Purchase_Orders_${new Date().toISOString().split('T')[0]}.csv`);
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
            <ShoppingBag className="w-6 h-6 text-indigo-600" />
            Purchase Orders & Supplier Hub
          </h2>
          <p className="text-xs text-slate-500">
            Procurement workflow, vendor master registry, and automated stock receipt reconciliation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleOpenCreatePO}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" /> Create Purchase Order
              </button>

              <button
                onClick={() => handleOpenSupplierModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Building2 className="w-4 h-4" /> Register Supplier
              </button>
            </>
          )}

          <button
            onClick={handleExportPoCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Purchase Orders
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {metrics.totalOrders}
          </span>
          <span className="text-[10px] text-slate-400">Total procurement POs</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block">
            Pending Goods Receipt
          </span>
          <span className="text-xl font-black text-amber-700 mt-1 block">
            {metrics.pendingReceiptCount}
          </span>
          <span className="text-[10px] text-amber-600">Awaiting shipment / check-in</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 block">
            Received POs
          </span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">
            {metrics.receivedCount}
          </span>
          <span className="text-[10px] text-emerald-500">Inventory updated</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Total Spend
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            ₹{metrics.totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] text-slate-400">Across {metrics.totalSuppliers} registered vendors</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Purchase Orders ({purchases.length})
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'suppliers'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" /> Supplier Directory ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: Purchase Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search PO number, vendor, item..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl bg-white px-3 py-2 text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Ordered">Ordered</option>
              <option value="Partially Received">Partially Received</option>
              <option value="Received">Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Items / Scope</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No purchase orders found. Click &quot;Create Purchase Order&quot; to begin.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((po) => {
                      const canReceive = po.status === 'Ordered' || po.status === 'Partially Received';

                      return (
                        <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {po.purchaseNumber}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">
                              {po.supplierSnapshot?.companyName || 'Supplier'}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {po.supplierSnapshot?.supplierCode}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {po.purchaseDate}
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <span className="font-semibold text-slate-800">
                              {po.items.length} {po.items.length === 1 ? 'line item' : 'line items'}
                            </span>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {po.items.map((it) => `${it.productName} (${it.quantity})`).join(', ')}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                            ₹{po.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                po.status === 'Received'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : po.status === 'Partially Received'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : po.status === 'Ordered'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : po.status === 'Cancelled'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {po.status}
                            </span>
                          </td>

                          {isAdmin && (
                            <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                              {canReceive && (
                                <button
                                  onClick={() => handleOpenReceiveModal(po)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-300 rounded-lg transition"
                                  title="Receive Goods into Inventory"
                                >
                                  <PackageCheck className="w-3.5 h-3.5" /> Receive Goods
                                </button>
                              )}

                              {po.status !== 'Cancelled' && po.status !== 'Received' && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Cancel Purchase Order ${po.purchaseNumber}?`)) {
                                      cancelPurchase(po.id, 'Cancelled by user');
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition"
                                  title="Cancel PO"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
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
        </div>
      )}

      {/* TAB 2: Suppliers Directory */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vendor name, code, contact person, phone..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Supplier Code</th>
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Contact Phone & Email</th>
                    <th className="py-3 px-4">GSTIN</th>
                    <th className="py-3 px-4">City / State</th>
                    <th className="py-3 px-4">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No suppliers registered yet. Click &quot;Register Supplier&quot; to add vendors.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup) => (
                      <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {sup.supplierCode}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {sup.companyName}
                        </td>

                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {sup.contactPerson || '—'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-800">{sup.phone}</div>
                          <span className="text-[10px] text-slate-400">{sup.email}</span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600">
                          {sup.gstNumber || 'Unregistered'}
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {sup.city ? `${sup.city}, ${sup.state}` : '—'}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              sup.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {sup.status}
                          </span>
                        </td>

                        {isAdmin && (
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                            <button
                              onClick={() => handleOpenSupplierModal(sup)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                              title="Edit Vendor"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Remove supplier ${sup.companyName}?`)) {
                                  try {
                                    await deleteSupplier(sup.id);
                                  } catch (e: any) {
                                    alert(e.message);
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Delete Vendor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PO MODAL */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base">Create Purchase Order</h3>
                  <p className="text-xs text-slate-400">PO Number: {poNumber} • Procurement Order Sheet</p>
                </div>
              </div>
              <button
                onClick={() => setIsPoModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {poError && (
              <div className="bg-rose-50 text-rose-700 text-xs px-5 py-2.5 border-b border-rose-100 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{poError}</span>
              </div>
            )}

            <form onSubmit={handleSavePO} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="">Select a supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} ({s.supplierCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Ordered Products ({poItems.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemToPo}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:text-indigo-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Line
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Unit Price (₹)</th>
                        <th className="py-2.5 px-3 text-right">Discount %</th>
                        <th className="py-2.5 px-3 text-right">GST %</th>
                        <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                        <th className="py-2.5 px-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <select
                              value={item.productId}
                              onChange={(e) => handlePoItemChange(idx, 'productId', e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.productCode} — {p.productName || p.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handlePoItemChange(idx, 'quantity', Number(e.target.value))}
                              className="w-20 text-xs border border-slate-200 rounded px-2 py-1 text-right"
                            />
                          </td>

                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.purchasePrice}
                              onChange={(e) => handlePoItemChange(idx, 'purchasePrice', Number(e.target.value))}
                              className="w-24 text-xs border border-slate-200 rounded px-2 py-1 text-right"
                            />
                          </td>

                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount}
                              onChange={(e) => handlePoItemChange(idx, 'discount', Number(e.target.value))}
                              className="w-16 text-xs border border-slate-200 rounded px-2 py-1 text-right"
                            />
                          </td>

                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.taxRate}
                              onChange={(e) => handlePoItemChange(idx, 'taxRate', Number(e.target.value))}
                              className="w-16 text-xs border border-slate-200 rounded px-2 py-1 text-right"
                            />
                          </td>

                          <td className="py-2 px-3 text-right font-black text-slate-900">
                            ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemovePoItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="w-64 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{poCalculations.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Discount:</span>
                    <span>-₹{poCalculations.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST Tax:</span>
                    <span>₹{poCalculations.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-200 pt-1.5">
                    <span>Grand Total:</span>
                    <span>₹{poCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Payment terms, delivery instructions, packaging specs..."
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPoModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {poSubmitting ? 'Saving PO...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE GOODS MODAL */}
      {isReceiveModalOpen && activePoForReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PackageCheck className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base">Receive Goods Check-in</h3>
                  <p className="text-xs text-slate-400 font-mono">PO: {activePoForReceive.purchaseNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {receiveError && (
              <div className="bg-rose-50 text-rose-700 text-xs px-5 py-2.5 border-b border-rose-100 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{receiveError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReceiveGoods} className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Enter the quantities of physical goods received from{' '}
                <span className="font-bold">{activePoForReceive.supplierSnapshot?.companyName}</span>. Submitting will automatically increment current inventory stock and create audit trail movement records.
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-right">Ordered</th>
                      <th className="py-2.5 px-3 text-right">Prev. Received</th>
                      <th className="py-2.5 px-3 text-right">Receive Now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activePoForReceive.items.map((it) => {
                      const previouslyReceived = (activePoForReceive.receivedItems || [])
                        .filter((r) => r.productId === it.productId)
                        .reduce((sum, r) => sum + r.receivedQuantity, 0);

                      return (
                        <tr key={it.productId}>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{it.productName}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{it.productCode}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-600">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-600">{previouslyReceived}</td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max={it.quantity - previouslyReceived}
                              value={receiveQuantities[it.productId] ?? 0}
                              onChange={(e) =>
                                setReceiveQuantities({
                                  ...receiveQuantities,
                                  [it.productId]: Number(e.target.value),
                                })
                              }
                              className="w-20 text-xs border border-slate-300 rounded px-2 py-1 text-right font-bold"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Notes / Inspection Remarks</label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="e.g. Delivery Challan #88921, inspected and verified in warehouse rack B-2"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiveSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {receiveSubmitting ? 'Updating Stock...' : 'Confirm Goods Receipt & Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base">
                    {supplierToEdit ? 'Edit Supplier' : 'Register New Supplier'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">Code: {supCode}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supError && (
              <div className="bg-rose-50 text-rose-700 text-xs px-5 py-2.5 border-b border-rose-100 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{supError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={supCompany}
                  onChange={(e) => setSupCompany(e.target.value)}
                  placeholder="e.g. Cisco Systems India Pvt Ltd"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="Account Manager"
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="orders@vendor.com"
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={supGst}
                    onChange={(e) => setSupGst(e.target.value)}
                    placeholder="27ABCDE1234F1Z5"
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Street / Industrial Zone"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={supCity}
                    onChange={(e) => setSupCity(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={supState}
                    onChange={(e) => setSupState(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={supStatus}
                    onChange={(e) => setSupStatus(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-2 py-1.5 bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={supSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {supSubmitting ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
