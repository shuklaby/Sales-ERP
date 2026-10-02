import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Archive,
  RefreshCw,
  History,
  Tag,
  Layers,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sliders,
  Image as ImageIcon,
  DollarSign,
  Filter,
} from 'lucide-react';
import { ProductItem, ProductCategory } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ProductModal } from '../modals/ProductModal';
import { CategoryModal } from '../modals/CategoryModal';
import { PriceHistoryModal } from '../modals/PriceHistoryModal';
import { CustomerSpecificPriceModal } from '../modals/CustomerSpecificPriceModal';

export const ProductsView: React.FC = () => {
  const {
    products,
    productCategories,
    productSettings,
    deleteProduct,
    updateProduct,
    duplicateProduct,
    archiveProduct,
    reactivateProduct,
    deleteCategory,
    bulkImportProducts,
  } = useCrmData();
  const { isAdmin, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive' | 'Archived'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'Available' | 'Low Stock' | 'Out of Stock' | 'Not Tracked'>('ALL');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductItem | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<ProductCategory | null>(null);

  const [isPriceHistoryModalOpen, setIsPriceHistoryModalOpen] = useState(false);
  const [priceHistoryItem, setPriceHistoryItem] = useState<ProductItem | null>(null);

  const [isCustomPricingModalOpen, setIsCustomPricingModalOpen] = useState(false);
  const [customPricingProduct, setCustomPricingProduct] = useState<ProductItem | null>(null);

  // Bulk import file state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; failed: number } | null>(null);
  const [importError, setImportError] = useState('');

  // Handle URL sub-routes (/admin/products/categories and /admin/products/:productId/price-history)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/products/categories')) {
      setActiveTab('categories');
    } else if (path.includes('/price-history')) {
      const segments = path.split('/');
      const prodIdx = segments.indexOf('products');
      if (prodIdx !== -1 && segments[prodIdx + 1] && segments[prodIdx + 2] === 'price-history') {
        const prodIdOrCode = segments[prodIdx + 1];
        const match = products.find((p) => p.id === prodIdOrCode || p.productCode === prodIdOrCode);
        if (match) {
          setPriceHistoryItem(match);
          setIsPriceHistoryModalOpen(true);
        }
      }
    }
  }, [products]);

  // Product availability helper
  const getProductAvailability = (p: ProductItem) => {
    if (p.stockEnabled === false) return 'Not Tracked';
    const cur = Number(p.currentStock ?? 0);
    const min = Number(p.minimumQuantity ?? productSettings.lowStockThreshold ?? 10);
    if (cur <= 0) return 'Out of Stock';
    if (cur <= min) return 'Low Stock';
    return 'Available';
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchSearch =
        (p.productName || p.name || '').toLowerCase().includes(search) ||
        (p.productCode || '').toLowerCase().includes(search) ||
        (p.sku || '').toLowerCase().includes(search) ||
        (p.hsnSac || '').toLowerCase().includes(search) ||
        (p.category || '').toLowerCase().includes(search) ||
        (p.description || '').toLowerCase().includes(search);

      if (!matchSearch) return false;

      // Status
      const currentStatus = p.status || (p.active ? 'Active' : 'Inactive');
      if (statusFilter !== 'ALL' && currentStatus !== statusFilter) return false;

      // Category
      if (categoryFilter !== 'ALL') {
        const catMatch = p.categoryId === categoryFilter || p.category === categoryFilter;
        if (!catMatch) return false;
      }

      // Availability
      if (availabilityFilter !== 'ALL') {
        const avail = getProductAvailability(p);
        if (avail !== availabilityFilter) return false;
      }

      return true;
    });
  }, [products, searchTerm, statusFilter, categoryFilter, availabilityFilter, productSettings]);

  // Actions
  const handleDuplicate = async (p: ProductItem) => {
    if (confirm(`Duplicate product "${p.productName || p.name}" with a new unique product code?`)) {
      try {
        await duplicateProduct(p.id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleArchive = async (p: ProductItem) => {
    if (confirm(`Archive product "${p.productName || p.name}"? It will be hidden from new proposal line selections.`)) {
      try {
        await archiveProduct(p.id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleReactivate = async (p: ProductItem) => {
    try {
      await reactivateProduct(p.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (prod: ProductItem) => {
    if (confirm(`Delete product "${prod.name}" from catalog? If it is referenced by historical proposals or invoices, it will be safely deactivated instead of deleted.`)) {
      try {
        await deleteProduct(prod.id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleToggleActive = async (prod: ProductItem) => {
    const isNowActive = prod.status ? prod.status === 'Active' : prod.active;
    const nextStatus = isNowActive ? 'Inactive' : 'Active';
    await updateProduct(prod.id, { status: nextStatus, active: !isNowActive });
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Product Code',
      'Product Name',
      'SKU',
      'HSN/SAC',
      'Category',
      'Unit',
      'Selling Price (INR)',
      'Purchase Price (INR)',
      'GST Tax Rate %',
      'Current Stock',
      'Reserved Stock',
      'Available Stock',
      'Minimum Threshold',
      'Stock Enabled',
      'Status',
    ];

    const rows = filteredProducts.map((p) => [
      `"${p.productCode || ''}"`,
      `"${(p.productName || p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${p.hsnSac || ''}"`,
      `"${p.category || ''}"`,
      `"${p.unit || 'Unit'}"`,
      p.sellingPrice ?? p.price ?? 0,
      p.purchasePrice ?? '',
      p.taxRate ?? p.gstRate ?? 18,
      p.currentStock ?? 0,
      p.reservedStock ?? 0,
      p.availableStock ?? 0,
      p.minimumQuantity ?? 10,
      p.stockEnabled !== false ? 'Yes' : 'No',
      `"${p.status || (p.active ? 'Active' : 'Inactive')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Products_Catalog_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV / JSON Bulk Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportResult(null);

    try {
      let parsed: any[] = [];
      const trimmed = importJsonText.trim();

      if (trimmed.startsWith('[')) {
        parsed = JSON.parse(trimmed);
      } else {
        // Parse CSV lines
        const lines = trimmed.split('\n').filter(Boolean);
        if (lines.length <= 1) throw new Error('CSV must contain a header row and at least one data row.');
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx];
          });
          parsed.push({
            productCode: rowObj['Product Code'] || rowObj['productCode'],
            name: rowObj['Product Name'] || rowObj['name'],
            productName: rowObj['Product Name'] || rowObj['name'],
            sku: rowObj['SKU'] || rowObj['sku'],
            hsnSac: rowObj['HSN/SAC'] || rowObj['hsnSac'],
            unit: rowObj['Unit'] || rowObj['unit'] || 'Unit',
            sellingPrice: Number(rowObj['Selling Price (INR)'] || rowObj['price'] || rowObj['sellingPrice'] || 0),
            purchasePrice: rowObj['Purchase Price (INR)'] ? Number(rowObj['Purchase Price (INR)']) : undefined,
            taxRate: Number(rowObj['GST Tax Rate %'] || rowObj['taxRate'] || 18),
            currentStock: Number(rowObj['Current Stock'] || rowObj['currentStock'] || 0),
            minimumQuantity: Number(rowObj['Minimum Threshold'] || rowObj['minimumQuantity'] || 10),
          });
        }
      }

      const res = await bulkImportProducts(parsed);
      setImportResult(res);
      setImportJsonText('');
    } catch (err: any) {
      setImportError(err.message || 'Invalid format. Provide valid CSV or JSON array.');
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Product Catalog & Master Management
          </h2>
          <p className="text-xs text-slate-500">
            Unified catalog with SKU codes, GST rates, stock availability, immutable price snapshots, and custom customer rates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setProductToEdit(null);
                  setIsProductModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>

              <button
                onClick={() => {
                  setCategoryToEdit(null);
                  setIsCategoryModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Layers className="w-4 h-4" /> New Category
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                <Upload className="w-4 h-4 text-slate-500" /> Bulk Import
              </button>
            </>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'products'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" /> Products Catalog ({filteredProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'categories'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Categories Management ({productCategories.length})
        </button>
      </div>

      {/* TAB 1: Products */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by title, SKU, HSN, code..."
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
                {productCategories.map((c) => (
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

              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-xl bg-white px-3 py-2 text-slate-700"
              >
                <option value="ALL">All Availability</option>
                <option value="Available">Available</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
                <option value="Not Tracked">Not Tracked</option>
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
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Purchase Price</th>}
                    <th className="py-3 px-4">GST</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-400">
                        No products match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const avail = getProductAvailability(p);
                      const curPrice = p.sellingPrice ?? p.price ?? p.basePrice ?? 0;
                      const isArchived = p.status === 'Archived';
                      const isActive = p.status ? p.status === 'Active' : p.active;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                            <div>{p.productCode}</div>
                            {p.sku && <span className="text-[10px] text-slate-400 font-normal">SKU: {p.sku}</span>}
                          </td>

                          <td className="py-3 px-4 max-w-sm">
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900">{p.productName || p.name}</div>
                                <span className="text-[11px] text-slate-500 line-clamp-1">{p.description}</span>
                                {p.hsnSac && (
                                  <span className="text-[10px] text-indigo-600 font-mono">HSN: {p.hsnSac}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-600">{p.unit}</td>

                          <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                            ₹{curPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {isAdmin && (
                            <td className="py-3 px-4 text-right font-semibold text-slate-600">
                              {p.purchasePrice !== undefined
                                ? `₹${p.purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                                : '—'}
                            </td>
                          )}

                          <td className="py-3 px-4 font-medium text-slate-700">
                            {p.taxRate ?? p.gstRate ?? 18}%
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {avail === 'Available' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle className="w-3.5 h-3.5" />
                                {p.currentStock ?? 0} {p.unit}
                              </span>
                            )}
                            {avail === 'Low Stock' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {p.currentStock ?? 0} {p.unit}
                              </span>
                            )}
                            {avail === 'Out of Stock' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                                <XCircle className="w-3.5 h-3.5" /> 0 {p.unit}
                              </span>
                            )}
                            {avail === 'Not Tracked' && (
                              <span className="text-[11px] text-slate-400">Untracked</span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {isArchived ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                                Archived
                              </span>
                            ) : (
                              <button
                                disabled={!isAdmin}
                                onClick={() => handleToggleActive(p)}
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
                                    setPriceHistoryItem(p);
                                    setIsPriceHistoryModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="Price History & Audit Log"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setCustomPricingProduct(p);
                                    setIsCustomPricingModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                  title="Customer-Specific Contract Rates"
                                >
                                  <Tag className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDuplicate(p)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                  title="Duplicate Product"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setProductToEdit(p);
                                    setIsProductModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                  title="Edit Product"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {isArchived ? (
                                  <button
                                    onClick={() => handleReactivate(p)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                    title="Reactivate Product"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleArchive(p)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                    title="Archive Product"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDelete(p)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                  title="Delete Product"
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
        </div>
      )}

      {/* TAB 2: Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Categories referenced by historical proposals or finalized invoices cannot be deleted to maintain ERP data integrity.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Category Code</th>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Applies To</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No categories defined. Click &quot;New Category&quot; to organize catalog items.
                      </td>
                    </tr>
                  ) : (
                    productCategories.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {c.categoryId}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                        <td className="py-3 px-4 uppercase text-[10px] font-bold tracking-wider text-slate-500">
                          {c.type || 'Both'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-sm">
                          {c.description || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              c.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                            <button
                              onClick={() => {
                                setCategoryToEdit(c);
                                setIsCategoryModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-900 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Delete category "${c.name}"?`)) {
                                  try {
                                    await deleteCategory(c.id);
                                  } catch (e: any) {
                                    alert(e.message);
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
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

      {/* Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={categoryToEdit}
      />

      {/* Price History Modal */}
      <PriceHistoryModal
        isOpen={isPriceHistoryModalOpen}
        onClose={() => {
          setIsPriceHistoryModalOpen(false);
          setPriceHistoryItem(null);
        }}
        item={priceHistoryItem}
        type="product"
      />

      {/* Custom Specific Pricing Modal */}
      <CustomerSpecificPriceModal
        isOpen={isCustomPricingModalOpen}
        onClose={() => {
          setIsCustomPricingModalOpen(false);
          setCustomPricingProduct(null);
        }}
        product={customPricingProduct}
      />

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-base">Bulk Product Import</h3>
                  <p className="text-xs text-slate-400">Paste CSV or JSON array of products</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {importError && (
              <div className="bg-rose-50 text-rose-700 text-xs px-5 py-2.5 border-b border-rose-100 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importResult && (
              <div className="bg-emerald-50 text-emerald-700 text-xs px-5 py-2.5 border-b border-emerald-100 font-medium">
                Imported: {importResult.imported} new products, Updated: {importResult.updated} existing, Failed: {importResult.failed}
              </div>
            )}

            <form onSubmit={handleImportSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CSV or JSON Content *
                </label>
                <textarea
                  rows={8}
                  required
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`Product Code,Product Name,Selling Price (INR),GST Tax Rate %,Current Stock\nPRD-2026-0001,Edge Gateway Router,45000,18,25`}
                  className="w-full text-xs font-mono border border-slate-300 rounded-xl p-3 bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Process Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
