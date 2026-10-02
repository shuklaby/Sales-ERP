import React from 'react';
import {
  Calendar,
  Filter,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
  RotateCcw,
} from 'lucide-react';
import { UniversalReportFilter } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';

interface ReportFilterBarProps {
  filters: UniversalReportFilter;
  onFilterChange: (updated: Partial<UniversalReportFilter>) => void;
  onResetFilters: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onPrintPDF: () => void;
  showEmployeeFilter?: boolean;
  showCustomerFilter?: boolean;
  showDepartmentFilter?: boolean;
  showProductFilter?: boolean;
  showCategoryFilter?: boolean;
  showStatusFilter?: boolean;
  showSourceFilter?: boolean;
  showPaymentMethodFilter?: boolean;
  statusOptions?: string[];
  sourceOptions?: string[];
  totalRecordsCount?: number;
}

const DATE_PRESETS: UniversalReportFilter['datePreset'][] = [
  'Today',
  'Yesterday',
  'This Week',
  'Last Week',
  'This Month',
  'Last Month',
  'This Quarter',
  'Last Quarter',
  'This Year',
  'Last Year',
  'Custom',
];

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  searchQuery,
  onSearchChange,
  onExportExcel,
  onExportCSV,
  onPrintPDF,
  showEmployeeFilter = true,
  showCustomerFilter = false,
  showDepartmentFilter = false,
  showProductFilter = false,
  showCategoryFilter = false,
  showStatusFilter = false,
  showSourceFilter = false,
  showPaymentMethodFilter = false,
  statusOptions = [],
  sourceOptions = [],
  totalRecordsCount = 0,
}) => {
  const { employees, customers, products, expenseCategories, departmentRecords } = useCrmData();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4 print:hidden">
      {/* Top Bar: Search, Date Preset, and Export Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search records by keyword, name, reference..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={filters.datePreset}
              onChange={(e) => onFilterChange({ datePreset: e.target.value as any })}
              className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {DATE_PRESETS.map((dp) => (
                <option key={dp} value={dp}>
                  {dp}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range pickers if preset is Custom */}
          {filters.datePreset === 'Custom' && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onFilterChange({ startDate: e.target.value })}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                title="Start Date"
              />
              <span className="text-xs text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onFilterChange({ endDate: e.target.value })}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                title="End Date"
              />
            </div>
          )}

          {/* Export Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Export as Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Export as CSV"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={onPrintPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Print / Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dimensional Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filters:
        </span>

        {/* Employee Filter */}
        {showEmployeeFilter && (
          <select
            value={filters.employeeId || 'ALL'}
            onChange={(e) => onFilterChange({ employeeId: e.target.value === 'ALL' ? undefined : e.target.value })}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeId || emp.department || 'Sales'})
              </option>
            ))}
          </select>
        )}

        {/* Department Filter */}
        {showDepartmentFilter && (
          <select
            value={filters.department || 'ALL'}
            onChange={(e) => onFilterChange({ department: e.target.value === 'ALL' ? undefined : e.target.value })}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departmentRecords.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        )}

        {/* Customer Filter */}
        {showCustomerFilter && (
          <select
            value={filters.customerId || 'ALL'}
            onChange={(e) => onFilterChange({ customerId: e.target.value === 'ALL' ? undefined : e.target.value })}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer max-w-[200px]"
          >
            <option value="ALL">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        )}

        {/* Product Filter */}
        {showProductFilter && (
          <select
            value={filters.productId || 'ALL'}
            onChange={(e) => onFilterChange({ productId: e.target.value === 'ALL' ? undefined : e.target.value })}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer max-w-[200px]"
          >
            <option value="ALL">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku || p.productCode || ''})
              </option>
            ))}
          </select>
        )}

        {/* Category Filter */}
        {showCategoryFilter && (
          <select
            value={filters.category || 'ALL'}
            onChange={(e) => onFilterChange({ category: e.target.value === 'ALL' ? undefined : e.target.value })}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {/* Status Filter */}
        {showStatusFilter && statusOptions.length > 0 && (
          <select
            value={filters.status || 'ALL'}
            onChange={(e) => onFilterChange({ status: e.target.value === 'ALL' ? undefined : e.target.value })}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {statusOptions.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        )}

        {/* Lead Source Filter */}
        {showSourceFilter && sourceOptions.length > 0 && (
          <select
            value={filters.source || 'ALL'}
            onChange={(e) => onFilterChange({ source: e.target.value === 'ALL' ? undefined : e.target.value })}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Sources</option>
            {sourceOptions.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        )}

        {/* Payment Method Filter */}
        {showPaymentMethodFilter && (
          <select
            value={filters.paymentMethod || 'ALL'}
            onChange={(e) => onFilterChange({ paymentMethod: e.target.value === 'ALL' ? undefined : e.target.value })}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="UPI">UPI</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Cheque">Cheque</option>
            <option value="Payment Gateway">Payment Gateway</option>
          </select>
        )}

        {/* Reset button */}
        <button
          onClick={onResetFilters}
          className="ml-auto text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 font-semibold px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Reset all filters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>

        {/* Records count badge */}
        <span className="text-2xs font-extrabold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
          {totalRecordsCount} record{totalRecordsCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
};
