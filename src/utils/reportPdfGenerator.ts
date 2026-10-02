import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanySettings } from '../types/crm';
import { formatDateTimeDisplayIST } from './dateRangeUtils';

export interface ReportPdfConfig {
  reportTitle: string;
  dateRangeLabel: string;
  appliedFilters: Record<string, string>;
  summaryMetrics?: { label: string; value: string }[];
  columns: { header: string; dataKey: string; align?: 'left' | 'center' | 'right' }[];
  data: Record<string, any>[];
  companySettings?: Partial<CompanySettings>;
  generatedBy?: string;
}

export function generateReportPdf(config: ReportPdfConfig): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  const comp = config.companySettings || {
    companyName: 'SparkGenTechnology',
    address: 'SparkGen Technology Innovation Park, Phase 2, Tech Hub',
    phone: '+91 98765 43210',
    email: 'sales@sparkgentechnology.com',
    website: 'https://sparkgentechnology.com',
    gstNumber: '29AAECS1234F1Z8',
  };

  // 1. Top Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 56, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(comp.companyName || 'SparkGenTechnology', margin, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('SalesSphere CRM & Enterprise MIS Reporting Suite', margin, 42);

  // Right Header Info
  const nowStr = formatDateTimeDisplayIST(new Date().toISOString());
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${nowStr}`, pageWidth - margin, 26, { align: 'right' });
  doc.text(`Issuer: ${config.generatedBy || 'Authorized Administrator'}`, pageWidth - margin, 40, { align: 'right' });

  // 2. Report Sub-Header
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(config.reportTitle, margin, 84);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Reporting Period: ${config.dateRangeLabel}`, margin, 100);

  // Applied Filters string
  const filterEntries = Object.entries(config.appliedFilters)
    .filter(([_, v]) => v && v !== 'ALL' && v !== 'All')
    .map(([k, v]) => `${k}: ${v}`);
  const filterText = filterEntries.length > 0 ? `Filters: ${filterEntries.join(' | ')}` : 'Filters: All Records';
  doc.text(filterText, margin, 114);

  // Summary Metrics Badges
  let startY = 126;
  if (config.summaryMetrics && config.summaryMetrics.length > 0) {
    const cardWidth = 130;
    const cardHeight = 32;
    config.summaryMetrics.slice(0, 5).forEach((m, idx) => {
      const x = margin + idx * (cardWidth + 12);
      if (x + cardWidth <= pageWidth - margin) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, startY, cardWidth, cardHeight, 4, 4, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(m.label.toUpperCase(), x + 8, startY + 12);

        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(m.value, x + 8, startY + 25);
      }
    });
    startY += cardHeight + 14;
  }

  // 3. AutoTable Grid
  const head = [config.columns.map((c) => c.header)];
  const body = config.data.map((row) =>
    config.columns.map((c) => {
      const val = row[c.dataKey];
      if (val === undefined || val === null) return '-';
      return String(val);
    })
  );

  const columnStyles: Record<number, any> = {};
  config.columns.forEach((col, idx) => {
    if (col.align) {
      columnStyles[idx] = { halign: col.align };
    }
  });

  autoTable(doc, {
    startY,
    head,
    body,
    margin: { left: margin, right: margin, bottom: 40 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 4,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
    },
    columnStyles,
    didDrawPage: (data) => {
      // Footer on every page
      const pageStr = `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Commercial Confidential • SparkGenTechnology SalesSphere ERP • ${config.reportTitle}`,
        margin,
        pageHeight - 20
      );
      doc.text(pageStr, pageWidth - margin, pageHeight - 20, { align: 'right' });
    },
  });

  return doc;
}
