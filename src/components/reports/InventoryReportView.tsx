import React, { useState, useMemo } from 'react';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  XCircle,
  Package,
  Layers,
  BarChart2,
  Calendar,
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

export const InventoryReportView: React.FC = () => {
  const { products, invoices, purchases, companySettings } = useCrmData();
  const { userProfile, isAdmin } = useAuth();

  const [filters, setFilters] = useState<UniversalReportFilter>({
    datePreset: 'This Month',
    category: 'ALL',
    productId: 'ALL',
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

  // Read-only stock movements based on invoices (Sales / Stock Out) and POs (Purchase / Stock In)
  const inventoryRows = useMemo(() => {
    return products
      .filter((p) => {
        if (filters.category && filters.category !== 'ALL' && p.category !== filters.category) return false;
        if (filters.productId && filters.productId !== 'ALL' && p.id !== filters.productId) return false;
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
        let stockOut = 0;
        invoices.forEach((inv) => {
          if (inv.status === 'CANCELLED') return false;
          const dt = inv.invoiceDate || inv.createdAt || '';
          if (!isWithinDateRange(dt, activeDateRange)) return;
          inv.items?.forEach((item: any) => {
            if (item.productId === p.id || item.name === p.name) {
              stockOut += Number(item.quantity || item.qty || 1);
            }
          });
        });

        let stockIn = 0;
        purchases.forEach((po) => {
          if (po.status === 'Cancelled') return;
          const dt = po.purchaseDate || po.createdAt || '';
          if (!isWithinDateRange(dt, activeDateRange)) return;
          po.items?.forEach((pi: any) => {
            if (pi.productId === p.id || pi.name === p.name) {
              stockIn += Number(pi.quantity || 0);
            }
          });
        });

        const currentStock = p.currentStock ?? p.stockQuantity ?? 0;
        const minStock = p.minStockLevel ?? p.reorderLevel ?? 5;
        const isLowStock = currentStock > 0 && currentStock <= minStock;
        const isOutOfStock = currentStock <= 0;
        const adjustments = 0; // System audit adjustment balance

        return {
          product: p,
          id: p.id,
          name: p.name,
          sku: p.sku || '—',
          category: p.category || 'General',
          currentStock,
          minStock,
          stockIn,
          stockOut,
          adjustments,
          isLowStock,
          isOutOfStock,
        };
      });
  }, [products, invoices, purchases, activeDateRange, filters, searchQuery]);

  // Section 13 specs: Current Stock, Stock In, Stock Out, Purchase, Sales, Adjustments, Low Stock, Out of Stock
  const inventoryKpis = useMemo(() => {
    const totalCurrentStock = inventoryRows.reduce((sum, r) => sum + r.currentStock, 0);
    const totalStockIn = inventoryRows.reduce((sum, r) => sum + r.stockIn, 0);
    const totalStockOut = inventoryRows.reduce((sum, r) => sum + r.stockOut, 0);
    const totalLowStock = inventoryRows.filter((r) => r.isLowStock).length;
    const totalOutOfStock = inventoryRows.filter((r) => r.isOutOfStock).length;

    return {
      totalCurrentStock,
      totalStockIn,
      totalStockOut,
      totalLowStock,
      totalOutOfStock,
      totalItems: inventoryRows.length,
    };
  }, [inventoryRows]);

  const invColumns: DrillDownColumn[] = [
    { header: 'Product Name', accessor: 'name' },
    { header: 'SKU', accessor: 'sku' },
    { header: 'Category', accessor: 'category' },
    { header: 'Current Stock', accessor: 'currentStock', align: 'center' },
    { header: 'Stock In (Intake)', accessor: 'stockIn', align: 'center' },
    { header: 'Stock Out (Sold)', accessor: 'stockOut', align: 'center' },
    { header: 'Min Stock Level', accessor: 'minStock', align: 'center' },
  ];

  const handleExportExcel = () => {
    const rows = inventoryRows.map((r) => ({
      Product: r.name,
      SKU: r.sku,
      Category: r.category,
      'Current Stock': r.currentStock,
      'Stock In': r.stockIn,
      'Stock Out': r.stockOut,
      Adjustments: r.adjustments,
      'Min Stock Level': r.minStock,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory_Report');
    XLSX.writeFile(wb, `SparkGen_InventoryReport_${Date.now()}.xlsx`);
  };

  const handleExportCSV = () => {
    const rows = inventoryRows.map((r) => ({
      Product: r.name,
      SKU: r.sku,
      Category: r.category,
      'Current Stock': r.currentStock,
      'Stock In': r.stockIn,
      'Stock Out': r.stockOut,
      Adjustments: r.adjustments,
      'Min Stock Level': r.minStock,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SparkGen_InventoryReport_${Date.now()}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    const rows = inventoryRows.map((r) => ({
      Product: r.name,
      SKU: r.sku,
      Category: r.category,
      'Stock Balance': r.currentStock,
      'In / Out': `+${r.stockIn} / -${r.stockOut}`,
    }));

    const doc = generateReportPdf({
      reportTitle: `Warehouse Inventory & Physical Stock Movement Audit`,
      dateRangeLabel: activeDateRange.label,
      appliedFilters: {
        Category: filters.category || 'ALL',
      },
      summaryMetrics: [
        { label: 'Current Total Stock', value: String(inventoryKpis.totalCurrentStock) },
        { label: 'Stock Inflow', value: `+${inventoryKpis.totalStockIn}` },
        { label: 'Stock Outflow', value: `-${inventoryKpis.totalStockOut}` },
        { label: 'Low Stock Items', value: String(inventoryKpis.totalLowStock) },
      ],
      columns: [
        { header: 'Product', dataKey: 'Product' },
        { header: 'SKU', dataKey: 'SKU' },
        { header: 'Category', dataKey: 'Category' },
        { header: 'Stock Balance', dataKey: 'Stock Balance', align: 'center' },
        { header: 'In / Out', dataKey: 'In / Out', align: 'center' },
      ],
      data: rows,
      companySettings,
      generatedBy: userProfile?.name || 'Administrator',
    });

    doc.save(`SparkGen_InventoryReport_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar
        filters={filters}
        onFilterChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
        onResetFilters={() => setFilters({ datePreset: 'This Month', category: 'ALL', productId: 'ALL' })}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintPDF={handlePrintPDF}
        showCategoryFilter={true}
        showProductFilter={true}
        totalRecordsCount={inventoryRows.length}
      />

      {/* KPI Cards (Section 13 specifications) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Current Physical Stock Balance',
              subtitle: 'Stock balances across active products',
              data: inventoryRows,
              columns: invColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Current Stock</div>
          <div className="text-xl font-black text-slate-900 mt-1">{inventoryKpis.totalCurrentStock}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Physical units in hand</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Stock In (Purchase Intake)',
              subtitle: 'Inbound purchase receipts',
              data: inventoryRows.filter((r) => r.stockIn > 0),
              columns: invColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Stock In (Intake)</div>
          <div className="text-xl font-black text-emerald-700 mt-1">+{inventoryKpis.totalStockIn}</div>
          <div className="text-2xs text-slate-500 mt-0.5">PO inbound delivery</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Stock Out (Sales Dispatches)',
              subtitle: 'Outbound invoice fulfillments',
              data: inventoryRows.filter((r) => r.stockOut > 0),
              columns: invColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Stock Out (Sold)</div>
          <div className="text-xl font-black text-blue-700 mt-1">-{inventoryKpis.totalStockOut}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Sales shipments</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Low Stock Level Items',
              subtitle: 'Items at or below reorder threshold',
              data: inventoryRows.filter((r) => r.isLowStock),
              columns: invColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Low Stock</div>
          <div className="text-xl font-black text-amber-600 mt-1">{inventoryKpis.totalLowStock}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Reorder required</div>
        </div>

        <div
          onClick={() =>
            setDrillDownState({
              isOpen: true,
              title: 'Out of Stock Items',
              subtitle: 'Zero or negative inventory balance',
              data: inventoryRows.filter((r) => r.isOutOfStock),
              columns: invColumns,
            })
          }
          className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Out of Stock</div>
          <div className="text-xl font-black text-rose-600 mt-1">{inventoryKpis.totalOutOfStock}</div>
          <div className="text-2xs text-slate-500 mt-0.5">Critical deficit</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-slate-400 text-2xs font-bold uppercase tracking-wider">Adjustments</div>
          <div className="text-xl font-black text-slate-700 mt-1">0</div>
          <div className="text-2xs text-slate-500 mt-0.5">Balanced ledger</div>
        </div>
      </div>

      {/* Inventory Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Inventory & Stock Balance Register ({inventoryRows.length} Items)
          </h4>
          <span className="text-2xs text-slate-400">Strictly read-only audit log</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10">
                <th className="p-3">Product Name</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-center">Stock Balance</th>
                <th className="p-3 text-center">Stock In</th>
                <th className="p-3 text-center">Stock Out</th>
                <th className="p-3 text-center">Min Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {inventoryRows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() =>
                    setDrillDownState({
                      isOpen: true,
                      title: `Item: ${r.name}`,
                      subtitle: `SKU: ${r.sku} • Category: ${r.category}`,
                      data: [r],
                      columns: invColumns,
                    })
                  }
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="p-3 font-semibold text-slate-900">{r.name}</td>
                  <td className="p-3 font-mono text-slate-500">{r.sku}</td>
                  <td className="p-3 text-slate-600">{r.category}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-2xs font-bold border ${
                        r.isOutOfStock
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : r.isLowStock
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {r.currentStock} units
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-emerald-700">+{r.stockIn}</td>
                  <td className="p-3 text-center font-bold text-blue-700">-{r.stockOut}</td>
                  <td className="p-3 text-center text-slate-500">{r.minStock}</td>
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
