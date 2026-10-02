import React, { useState, useMemo } from 'react';
import {
  Package,
  DollarSign,
  AlertTriangle,
  XCircle,
  TrendingUp,
  BarChart2,
  Boxes,
  CheckCircle2,
} from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportDrillDownModal, DrillDownColumn } from './ReportDrillDownModal';
import { UniversalReportFilter, ProductItem } from '../../types/crm';
import {
  getDateRangeFromPreset,
  isWithinDateRange,
  formatINR,
  formatDateDisplayIST,
} from '../../utils/dateRangeUtils';
import * as XLSX from 'xlsx';
import { generateReportPdf } from '../../utils/reportPdfGenerator';

export const ProductsReportView: React.FC = () => {
  const { products, invoices, proposals, purchases, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    category: 'ALL',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [drillDownState, setDrillDownState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    data: any[];
    columns: DrillDownColumn[];
  }>({
    isOpen: false,
    title: '',
    data: [],
    columns: [],
  });

  const activeDateRange = useMemo(() => {
    return getDateRangeFromPreset(filters.datePreset, filters.startDate, filters.endDate);
  }, [filters.datePreset, filters.startDate, filters.endDate]);

  // Non-cancelled invoices in date range
  const periodInvoices = useMemo(() => {
    return invoices.filter((i) => {
      if (i.status === 'CANCELLED') return false;
      const dt = i.invoiceDate || i.createdAt || '';
      return isWithinDateRange(dt, activeDateRange);
    });
  }, [invoices, activeDateRange]);

  // Product metrics calculated strictly from actual invoice line items & stock records
  const productPerformanceList = useMemo(() => {
    return products
      .filter((p) => {
        if (filters.category && filters.category !== 'ALL' && p.category !== filters.category) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const match =
            (p.name || '').toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .map((p) => {
        let quantitySold = 0;
        let revenue = 0;

        periodInvoices.forEach((inv) => {
          inv.items?.forEach((item: any) => {
            if (item.productId === p.id || item.name === p.name) {
              const qty = Number(item.quantity || item.qty || 1);
              const total = Number(item.total || item.amount || (item.unitPrice || 0) * qty);
              quantitySold += qty;
              revenue += total;
            }
          });
        });

        // Purchase quantity from purchase orders
        let purchaseQty = 0;
        purchases.forEach((po: any) => {
          po.items?.forEach((pi: any) => {
            if (pi.productId === p.id || pi.name === p.name) {
              purchaseQty += Number(pi.quantity || 0);
            }
          });
        });

        const currentStock = p.currentStock ?? p.stockQuantity ?? 0;
        const minStock = p.minStockLevel ?? p.reorderLevel ?? 5;
        const isLowStock = currentStock > 0 && currentStock <= minStock;
        const isOutOfStock = currentStock <= 0;

        return {
          product: p,
          id: p.id,
          name: p.name,
          sku: p.sku || '—',
          category: p.category || 'General',
          currentStock,
          minStock,
          isLowStock,
          isOutOfStock,
          quantitySold,
          revenue,
          purchaseQty,
        };
      });
  }, [products, periodInvoices, purchases, filters.category, searchQuery]);

  // Section 12 KPI Summary
  const summaryKpis = useMemo(() => {
    const totalProducts = products.length;
    const productsSold = productPerformanceList.filter((p) => p.quantitySold > 0).length;
    const totalQtySold = productPerformanceList.reduce((sum, p) => sum + p.quantitySold, 0);
    const totalRevenue = productPerformanceList.reduce((sum, p) => sum + p.revenue, 0);

    const lowStockCount = products.filter((p) => {
      const stock = p.currentStock ?? p.stockQuantity ?? 0;
      const min = p.minStockLevel ?? p.reorderLevel ?? 5;
      return stock > 0 && stock <= min;
    }).length;

    const outOfStockCount = products.filter((p) => (p.currentStock ?? p.stockQuantity ?? 0) <= 0).length;
    const totalPurchaseQty = productPerformanceList.reduce((sum, p) => sum + p.purchaseQty, 0);

    return {
      totalProducts,
      productsSold,
      totalQtySold,
      totalRevenue,
      lowStockCount,
      outOfStockCount,
      totalPurchaseQty,
    };
  }, [products, productPerformanceList]);

  const productDrillDownCols: DrillDownColumn[] = [
    { header: 'Product Name', accessor: 'name' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Category', accessor: 'category' },
    { header: 'Qty Sold', accessor: 'quantitySold', align: 'center' },
    { header: 'Revenue (INR)', accessor: 'revenue', align: 'right', format: (val) => formatINR(val || 0) },
    { header: 'Stock Balance', accessor: 'currentStock', align: 'center' },
  ];

  const handleExportExcel = () => {
    const rows = productPerformanceList.map((p) => ({
      Product: p.name,
      SKU: p.sku,
      Category: p.category,
      'Qty Sold': p.quantitySold,
      Revenue: p.revenue,
      'Current Stock': p.currentStock,
      'Min Stock': p.minStock,
      'Purchase Qty': p.purchaseQty,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Product_Analytics');
    XLSX.writeFile(wb, `SparkGen_ProductAnalytics_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = productPerformanceList.map((p) => ({
      Product: p.name,
      SKU: p.sku,
      Category: p.category,
      'Qty Sold': p.quantitySold,
      Revenue: p.revenue,
      'Current Stock': p.currentStock,
      'Min Stock': p.minStock,
      'Purchase Qty': p.purchaseQty,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_ProductAnalytics_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = productPerformanceList.map((p) => ({
      Product: p.name,
      SKU: p.sku,
      Category: p.category,
      'Qty Sold': p.quantitySold,
      'Revenue (INR)': p.revenue,
      Stock: p.currentStock,
    }));

    const doc = generateReportPdf({
      reportTitle: `Catalog Item & Product Performance Analytics`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Category: filters.category || 'ALL',
      },
      summaryMetrics: [
        { label: 'Products Sold', value: String(summaryKpis.productsSold) },
        { label: 'Quantity Sold', value: String(summaryKpis.totalQtySold) },
        { label: 'Total Revenue', value: formatINR(summaryKpis.totalRevenue) },
        { label: 'Low Stock', value: String(summaryKpis.lowStockCount) },
      ],
      columns: [
        { header: 'Product', dataKey: 'Product' },
        { header: 'SKU', dataKey: 'SKU' },
        { header: 'Category', dataKey: 'Category' },
        { header: 'Qty Sold', dataKey: 'Qty Sold', align: 'center' },
        { header: 'Revenue (INR)', dataKey: 'Revenue (INR)', align: 'right' },
        { header: 'Stock', dataKey: 'Stock', align: 'center' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_ProductAnalytics_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() => setFilters({ datePreset: 'This Month', category: 'ALL' })}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showCategoryFilter={true}
        totalRecordsCount={productPerformanceList.length}
      />

      {/* KPI Cards (Section 12 specifications) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Active Catalog Products',
              subtitle: 'All products currently configured',
              data: productPerformanceList,
              columns: productDrillDownCols,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Catalog Items</div>
          <div className="text-xl font-black text-slate-900 mt-1">{summaryKpis.totalProducts}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Total products</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Products Sold in Period',
              subtitle: 'Products with at least 1 unit sold',
              data: productPerformanceList.filter((p) => p.quantitySold > 0),
              columns: productDrillDownCols,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Products Sold</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{summaryKpis.productsSold}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Active item sales</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Quantity Sold</div>
          <div className="text-xl font-black text-indigo-700 mt-1">{summaryKpis.totalQtySold}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Units dispatched</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Revenue</div>
          <div className="text-xl font-black text-blue-700 font-mono mt-1">
            {formatINR(summaryKpis.totalRevenue)}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">Recognized item revenue</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Low Stock Products',
              subtitle: 'Below threshold level',
              data: productPerformanceList.filter((p) => p.isLowStock),
              columns: productDrillDownCols,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Low Stock</div>
          <div className="text-xl font-black text-amber-600 mt-1">{summaryKpis.lowStockCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Reorder required</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Out of Stock Items',
              subtitle: 'Zero or negative inventory level',
              data: productPerformanceList.filter((p) => p.isOutOfStock),
              columns: productDrillDownCols,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Out of Stock</div>
          <div className="text-xl font-black text-rose-600 mt-1">{summaryKpis.outOfStockCount}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Critical zero stock</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Purchase Qty</div>
          <div className="text-xl font-black text-slate-800 mt-1">{summaryKpis.totalPurchaseQty}</div>
          <div className="text-2xs text-slate-500 mt-0.5">PO intake units</div>
        </div>
      </div>

      {/* Product Level Factual Register */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Product Performance Table ({productPerformanceList.length} Items)
          </h4>
          <span className="text-2xs text-slate-400">Click any row to drill down</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10">
                <th className="p-3">Product</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-center">Stock</th>
                <th className="p-3 text-center">Qty Sold</th>
                <th className="p-3 text-center">Purchase Qty</th>
                <th className="p-3 text-right">Revenue (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {productPerformanceList.map((p) => (
                <tr
                  key={p.id}
                  onClick={() =>
                    setDrillDownState({
                      isOpen: true,
                      title: `Product: ${p.name}`,
                      subtitle: `SKU: ${p.sku} • Stock: ${p.currentStock}`,
                      data: [p],
                      columns: productDrillDownCols,
                    })
                  }
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="p-3 font-semibold text-slate-900">{p.name}</td>
                  <td className="p-3 font-mono text-slate-500">{p.sku}</td>
                  <td className="p-3 text-slate-600">{p.category}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-2xs font-bold border ${
                        p.isOutOfStock
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : p.isLowStock
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {p.currentStock} units
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900">{p.quantitySold}</td>
                  <td className="p-3 text-center text-slate-600">{p.purchaseQty}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{formatINR(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-down Modal */}
      <ReportDrillDownModal
        isOpen={drillDownState.isOpen}
        onClose={() => setDrillDownState((prev) => ({ ...prev, isOpen: false }))}
        title={drillDownState.title}
        subtitle={drillDownState.subtitle}
        data={drillDownState.data}
        columns={drillDownState.columns}
      />
    </div>
  );
};
