import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Sliders,
  AlertTriangle,
  History,
  Download,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  TrendingUp,
  Package,
  Layers,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ProductItem, StockMovementType, InventoryMovement } from '../../types/crm';
import { StockAdjustmentModal } from '../modals/StockAdjustmentModal';

export const InventoryView: React.FC = () => {
  const {
    products,
    inventoryMovements,
    productCategories,
    productSettings,
    adjustStock,
  } = useCrmData();
  const { isAdmin, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'movements' | 'alerts' | 'valuation'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'LOW' | 'OUT' | 'UNTRACKED'>('ALL');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('ALL');

  // Modals
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<string | undefined>(undefined);

  // Opening stock modal state
  const [isOpeningStockModalOpen, setIsOpeningStockModalOpen] = useState(false);
  const [openingStockProduct, setOpeningStockProduct] = useState('');
  const [openingStockQty, setOpeningStockQty] = useState<number>(0);
  const [openingStockReason, setOpeningStockReason] = useState('Initial physical inventory count audit');
  const [isSubmittingOpening, setIsSubmittingOpening] = useState(false);
  const [openingStockError, setOpeningStockError] = useState('');

  // Products with inventory enabled
  const trackedProducts = useMemo(() => {
    return products.filter((p) => p.stockEnabled !== false);
  }, [products]);

  // Status mapping
  const getProductStockStatus = (p: ProductItem) => {
    if (p.stockEnabled === false) return 'Not Tracked';
    const cur = Number(p.currentStock ?? 0);
    const min = Number(p.minimumQuantity ?? productSettings.lowStockThreshold ?? 10);
    if (cur <= 0) return 'Out of Stock';
    if (cur <= min) return 'Low Stock';
    return 'Available';
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchSearch =
        (p.productName || p.name || '').toLowerCase().includes(search) ||
        (p.productCode || '').toLowerCase().includes(search) ||
        (p.sku || '').toLowerCase().includes(search) ||
        (p.hsnSac || '').toLowerCase().includes(search);

      if (!matchSearch) return false;

      // Category
      if (categoryFilter !== 'ALL') {
        const catMatch = p.categoryId === categoryFilter || p.category === categoryFilter;
        if (!catMatch) return false;
      }

      // Stock Status
      const status = getProductStockStatus(p);
      if (stockStatusFilter === 'AVAILABLE' && status !== 'Available') return false;
      if (stockStatusFilter === 'LOW' && status !== 'Low Stock') return false;
      if (stockStatusFilter === 'OUT' && status !== 'Out of Stock') return false;
      if (stockStatusFilter === 'UNTRACKED' && status !== 'Not Tracked') return false;

      return true;
    });
  }, [products, searchTerm, categoryFilter, stockStatusFilter, productSettings]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return inventoryMovements.filter((m) => {
      if (movementTypeFilter !== 'ALL' && m.type !== movementTypeFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const match =
          (m.productName || '').toLowerCase().includes(search) ||
          (m.productCode || '').toLowerCase().includes(search) ||
          (m.reason || '').toLowerCase().includes(search) ||
          (m.referenceId || '').toLowerCase().includes(search);
        if (!match) return false;
      }
      return true;
    });
  }, [inventoryMovements, movementTypeFilter, searchTerm]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalStock = 0;
    let totalReserved = 0;
    let totalAvailable = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValuationCost = 0;
    let totalValuationRetail = 0;

    trackedProducts.forEach((p) => {
      const cur = Number(p.currentStock ?? 0);
      const res = Number(p.reservedStock ?? 0);
      const avail = cur - res;
      const min = Number(p.minimumQuantity ?? productSettings.lowStockThreshold ?? 10);
      const costPrice = p.purchasePrice ?? (p.sellingPrice ?? p.price ?? 0) * 0.7; // fallback 70% if unentered
      const retailPrice = p.sellingPrice ?? p.price ?? 0;

      totalStock += cur;
      totalReserved += res;
      totalAvailable += Math.max(0, avail);
      if (cur <= 0) outOfStockCount++;
      else if (cur <= min) lowStockCount++;

      totalValuationCost += cur * costPrice;
      totalValuationRetail += cur * retailPrice;
    });

    return {
      totalProductsTracked: trackedProducts.length,
      totalStock,
      totalReserved,
      totalAvailable,
      lowStockCount,
      outOfStockCount,
      totalValuationCost,
      totalValuationRetail,
    };
  }, [trackedProducts, productSettings]);

  // Low Stock Items for alerts
  const lowStockProducts = useMemo(() => {
    return trackedProducts.filter((p) => {
      const cur = Number(p.currentStock ?? 0);
      const min = Number(p.minimumQuantity ?? productSettings.lowStockThreshold ?? 10);
      return cur <= min;
    });
  }, [trackedProducts, productSettings]);

  // Handle Opening Stock Submit
  const handleOpeningStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openingStockProduct) {
      setOpeningStockError('Please select a product.');
      return;
    }
    if (openingStockQty < 0) {
      setOpeningStockError('Opening stock quantity cannot be negative.');
      return;
    }

    setIsSubmittingOpening(true);
    setOpeningStockError('');

    try {
      const targetProd = products.find((p) => p.id === openingStockProduct);
      const current = Number(targetProd?.currentStock ?? 0);
      const delta = openingStockQty - current;

      await adjustStock({
        productId: openingStockProduct,
        quantityDelta: delta,
        type: 'Opening Stock',
        reason: openingStockReason.trim() || 'Opening inventory balance initialized',
        referenceType: 'Opening Stock',
      });

      setIsOpeningStockModalOpen(false);
      setOpeningStockProduct('');
      setOpeningStockQty(0);
    } catch (err: any) {
      setOpeningStockError(err.message || 'Failed to initialize opening stock');
    } finally {
      setIsSubmittingOpening(false);
    }
  };

  // CSV Exporters
  const handleExportStockCSV = () => {
    const headers = [
      'Product Code',
      'Product Name',
      'SKU',
      'Category',
      'Unit',
      'Current Stock',
      'Reserved Stock',
      'Available Stock',
      'Minimum Threshold',
      'Stock Status',
      'Selling Price (INR)',
      'Purchase Price (INR)',
      'Valuation (Cost)',
    ];

    const rows = filteredProducts.map((p) => {
      const cur = Number(p.currentStock ?? 0);
      const res = Number(p.reservedStock ?? 0);
      const avail = cur - res;
      const status = getProductStockStatus(p);
      const cost = p.purchasePrice ?? 0;
      const valCost = cur * cost;

      return [
        `"${p.productCode || ''}"`,
        `"${(p.productName || p.name || '').replace(/"/g, '""')}"`,
        `"${p.sku || ''}"`,
        `"${p.category || ''}"`,
        `"${p.unit || 'Unit'}"`,
        cur,
        res,
        avail,
        p.minimumQuantity ?? productSettings.lowStockThreshold ?? 10,
        `"${status}"`,
        p.sellingPrice ?? p.price ?? 0,
        cost,
        valCost,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inventory_Stock_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMovementsCSV = () => {
    const headers = [
      'Movement ID',
      'Date & Time',
      'Product Code',
      'Product Name',
      'Movement Type',
      'Quantity Delta',
      'Previous Stock',
      'New Stock',
      'Reference Type',
      'Reference ID',
      'Reason',
      'Recorded By',
    ];

    const rows = filteredMovements.map((m) => [
      `"${m.movementId || m.id}"`,
      `"${m.createdAt}"`,
      `"${m.productCode || ''}"`,
      `"${(m.productName || '').replace(/"/g, '""')}"`,
      `"${m.type}"`,
      m.quantity,
      m.previousStock,
      m.newStock,
      `"${m.referenceType || ''}"`,
      `"${m.referenceId || ''}"`,
      `"${(m.reason || '').replace(/"/g, '""')}"`,
      `"${m.createdByName || m.createdBy || ''}"`,
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inventory_Movements_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-indigo-600" />
            Inventory & Stock Management Hub
          </h2>
          <p className="text-xs text-slate-500">
            Real-time stock tracking, reservation engine, automated movements audit, and low-stock replenishment
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setSelectedProductForAdjust(undefined);
                  setIsAdjustModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Sliders className="w-4 h-4" /> Stock Adjustment
              </button>

              <button
                onClick={() => {
                  setOpeningStockProduct(products[0]?.id || '');
                  setOpeningStockQty(0);
                  setOpeningStockError('');
                  setIsOpeningStockModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" /> Opening Stock
              </button>
            </>
          )}

          <button
            onClick={activeTab === 'movements' ? handleExportMovementsCSV : handleExportStockCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
            title="Download Spreadsheet"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Tracked SKUs
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {metrics.totalProductsTracked}
          </span>
          <span className="text-[10px] text-slate-400">Active catalog items</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
            Current Stock
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {metrics.totalStock.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Total physical units</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 block">
            Reserved Stock
          </span>
          <span className="text-xl font-black text-indigo-700 mt-1 block">
            {metrics.totalReserved.toLocaleString()}
          </span>
          <span className="text-[10px] text-indigo-400">Committed to orders</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 block">
            Available Stock
          </span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">
            {metrics.totalAvailable.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-500">Free to promise</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-500" /> Low Stock
          </span>
          <span className="text-xl font-black text-amber-700 mt-1 block">
            {metrics.lowStockCount}
          </span>
          <span className="text-[10px] text-amber-600">At or below threshold</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 block flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-500" /> Out of Stock
          </span>
          <span className="text-xl font-black text-rose-700 mt-1 block">
            {metrics.outOfStockCount}
          </span>
          <span className="text-[10px] text-rose-600">Zero physical inventory</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" /> Stock Overview ({filteredProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'movements'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" /> Stock Movements Audit ({inventoryMovements.length})
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'alerts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Low Stock Alerts ({lowStockProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('valuation')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === 'valuation'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Valuation & Cost Summary
        </button>
      </div>

      {/* TAB 1: Stock Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search inventory by title, SKU, HSN/SAC, code..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-xl bg-white px-3 py-2 text-slate-700"
              >
                <option value="ALL">All Categories</option>
                {productCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-xl bg-white px-3 py-2 text-slate-700"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="LOW">Low Stock</option>
                <option value="OUT">Out of Stock</option>
                <option value="UNTRACKED">Not Tracked</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Product Specs</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Reserved Stock</th>
                    <th className="py-3 px-4 text-right">Available Stock</th>
                    <th className="py-3 px-4 text-right">Min Threshold</th>
                    <th className="py-3 px-4">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No products match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const cur = Number(p.currentStock ?? 0);
                      const res = Number(p.reservedStock ?? 0);
                      const avail = cur - res;
                      const min = Number(p.minimumQuantity ?? productSettings.lowStockThreshold ?? 10);
                      const status = getProductStockStatus(p);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            <div>{p.productCode}</div>
                            {p.sku && <span className="text-[10px] text-slate-400 block">SKU: {p.sku}</span>}
                          </td>

                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-bold text-slate-900">{p.productName || p.name}</div>
                            <span className="text-[11px] text-slate-500 line-clamp-1">{p.category || 'General'}</span>
                          </td>

                          <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                            {p.stockEnabled !== false ? cur.toLocaleString() : '—'}
                            <span className="text-[10px] font-normal text-slate-400 ml-1">{p.unit}</span>
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-indigo-600">
                            {p.stockEnabled !== false ? res.toLocaleString() : '—'}
                          </td>

                          <td className="py-3 px-4 text-right font-black text-sm">
                            {p.stockEnabled !== false ? (
                              <span className={avail < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                                {avail.toLocaleString()}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="py-3 px-4 text-right text-slate-500 font-medium">
                            {p.stockEnabled !== false ? min : '—'}
                          </td>

                          <td className="py-3 px-4">
                            {status === 'Available' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle className="w-3 h-3" /> Available
                              </span>
                            )}
                            {status === 'Low Stock' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" /> Low Stock
                              </span>
                            )}
                            {status === 'Out of Stock' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3" /> Out of Stock
                              </span>
                            )}
                            {status === 'Not Tracked' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                                Not Tracked
                              </span>
                            )}
                          </td>

                          {isAdmin && (
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {p.stockEnabled !== false && (
                                <button
                                  onClick={() => {
                                    setSelectedProductForAdjust(p.id);
                                    setIsAdjustModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition"
                                >
                                  <Sliders className="w-3 h-3" /> Adjust
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

      {/* TAB 2: Movements Audit History */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search audit trail by item, reason, PO/invoice reference..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl bg-white px-3 py-2 text-slate-700"
            >
              <option value="ALL">All Movement Types</option>
              <option value="Opening Stock">Opening Stock</option>
              <option value="Purchase">Purchase (Goods Received)</option>
              <option value="Sale">Sale (Delivered)</option>
              <option value="Adjustment">Adjustment</option>
              <option value="Return">Return</option>
              <option value="Damaged">Damaged</option>
              <option value="Transfer">Transfer</option>
              <option value="Reservation">Reservation</option>
              <option value="Release">Release</option>
              <option value="Deduction">Deduction</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Quantity Delta</th>
                    <th className="py-3 px-4 text-right">Previous Stock</th>
                    <th className="py-3 px-4 text-right">New Stock</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No stock movement records found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((m) => {
                      const isAddition = m.quantity > 0 && m.type !== 'Reservation' && m.type !== 'Release';
                      const isReduction = m.quantity < 0 || m.type === 'Deduction';

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div>{m.productName || 'Product'}</div>
                            <span className="text-[10px] font-mono text-slate-400">{m.productCode}</span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                              {m.type}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right font-black text-sm whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isAddition
                                  ? 'text-emerald-700'
                                  : isReduction
                                  ? 'text-rose-600'
                                  : 'text-indigo-600'
                              }`}
                            >
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right text-slate-500 font-medium">
                            {m.previousStock}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-slate-900">
                            {m.newStock}
                          </td>

                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {m.referenceId ? (
                              <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {m.referenceType ? `${m.referenceType}: ` : ''}{m.referenceId}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="py-3 px-4 max-w-xs text-slate-700">
                            <div className="line-clamp-2">{m.reason}</div>
                          </td>

                          <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                            {m.createdByName || m.createdBy || 'System'}
                          </td>
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

      {/* TAB 3: Low Stock Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-900 text-sm">Replenishment Priority Action Queue</h4>
                <p className="text-xs text-amber-700">
                  {lowStockProducts.length} items have reached or breached their safety reorder thresholds.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.map((p) => {
              const cur = Number(p.currentStock ?? 0);
              const min = Number(p.minimumQuantity ?? productSettings.lowStockThreshold ?? 10);
              const isOut = cur <= 0;

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border shadow-2xs space-y-3 bg-white ${
                    isOut ? 'border-rose-300' : 'border-amber-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">{p.productCode}</span>
                      <h4 className="font-bold text-slate-900 text-sm">{p.productName || p.name}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isOut ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isOut ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Remaining Stock:</span>
                      <span className="font-black text-slate-900 text-sm">{cur} {p.unit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Reorder Point:</span>
                      <span className="font-bold text-slate-700 text-sm">{min} {p.unit}</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedProductForAdjust(p.id);
                          setIsAdjustModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition"
                      >
                        Adjust Stock
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Valuation & Analytics */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Total Inventory Valuation at Purchase Cost
              </span>
              <span className="text-2xl font-black text-slate-900">
                ₹{metrics.totalValuationCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-xs text-slate-500">
                Calculated using configured unit purchase prices (or standard cost estimations) across all {metrics.totalStock.toLocaleString()} physical items in stock.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Total Inventory Valuation at Retail Value
              </span>
              <span className="text-2xl font-black text-indigo-700">
                ₹{metrics.totalValuationRetail.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-xs text-slate-500">
                Gross potential revenue realizable from currently held physical inventory at master catalog selling rates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        initialProductId={selectedProductForAdjust}
      />

      {/* Opening Stock Entry Modal */}
      {isOpeningStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base">Enter Opening Stock</h3>
                  <p className="text-[11px] text-slate-400">Initialize baseline stock count with audit reason</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpeningStockModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {openingStockError && (
              <div className="bg-rose-50 text-rose-700 text-xs px-5 py-2.5 border-b border-rose-100 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{openingStockError}</span>
              </div>
            )}

            <form onSubmit={handleOpeningStockSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product *</label>
                <select
                  value={openingStockProduct}
                  onChange={(e) => setOpeningStockProduct(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                >
                  {trackedProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productCode} — {p.productName || p.name} (Current: {p.currentStock ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Physical Quantity *</label>
                <input
                  type="number"
                  min="0"
                  value={openingStockQty}
                  onChange={(e) => setOpeningStockQty(Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Reason / Justification *</label>
                <input
                  type="text"
                  value={openingStockReason}
                  onChange={(e) => setOpeningStockReason(e.target.value)}
                  placeholder="e.g. FY initial stock audit, warehouse physical verification..."
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpeningStockModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOpening}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {isSubmittingOpening ? 'Recording...' : 'Save Opening Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
