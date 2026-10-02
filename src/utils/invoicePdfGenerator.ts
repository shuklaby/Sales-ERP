/**
 * Professional Invoice PDF Generator
 * SparkGenTechnology — SalesSphere CRM
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceRecord } from '../types/crm';
import { formatCurrency, numberToWords } from './financeUtils';

function hexToRgb(hex?: string, fallback = [15, 23, 42]): [number, number, number] {
  if (!hex || !hex.startsWith('#')) return fallback as [number, number, number];
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? (fallback as [number, number, number]) : [r, g, b];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? (fallback as [number, number, number]) : [r, g, b];
  }
  return fallback as [number, number, number];
}

export function generateInvoicePdf(invoice: InvoiceRecord): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const primaryRgb = hexToRgb('#0f172a');
  const accentRgb = hexToRgb('#2563eb');

  const company = invoice.companySnapshot || {
    companyName: 'SparkGenTechnology',
    legalName: 'SparkGenTechnology Private Limited',
    address: 'SparkGen Technology Innovation Park, Phase 2, Tech Hub',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560100',
    phone: '+91 98765 43210',
    email: 'sales@sparkgentechnology.com',
    website: 'https://sparkgentechnology.com',
    gstNumber: '29AAECS1234F1Z8',
    pan: 'AAECS1234F',
  };

  const customer = invoice.customerSnapshot || {
    companyName: 'Valued Client',
    contactPerson: 'Accounts Payable',
    email: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
  };

  const bank = invoice.bankSnapshot || {
    accountHolderName: 'SparkGenTechnology Private Limited',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50200034891234',
    ifscCode: 'HDFC0001234',
    branch: 'Innovation Tech Branch',
    upiId: 'sparkgen@hdfcbank',
  };

  let y = margin + 10;

  // Header Bar
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(margin, y, pageWidth - margin * 2, 60, 'F');

  // Company Brand Text inside header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(company.companyName || 'SparkGenTechnology', margin + 16, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  const legalLine = company.legalName ? `${company.legalName} • GSTIN: ${company.gstNumber || 'N/A'}` : `GSTIN: ${company.gstNumber || 'N/A'}`;
  doc.text(legalLine, margin + 16, y + 44);

  // Document Title & Number on right side of header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('TAX INVOICE', pageWidth - margin - 16, y + 26, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(147, 197, 253);
  doc.text(invoice.invoiceNumber, pageWidth - margin - 16, y + 44, { align: 'right' });

  y += 75;

  // Meta details bar (Invoice Date, Due Date, Status, Terms)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 42, 'FD');

  const colWidth = (pageWidth - margin * 2) / 4;

  // Invoice Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE DATE', margin + 12, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.invoiceDate || 'N/A', margin + 12, y + 28);

  // Due Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT DUE DATE', margin + colWidth + 12, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.dueDate || 'N/A', margin + colWidth + 12, y + 28);

  // Payment Terms
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT TERMS', margin + colWidth * 2 + 12, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.paymentTerms || 'Net 30', margin + colWidth * 2 + 12, y + 28);

  // Status Badge
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE STATUS', margin + colWidth * 3 + 12, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  if (invoice.status === 'Paid') {
    doc.setTextColor(16, 185, 129); // emerald
  } else if (invoice.status === 'Overdue') {
    doc.setTextColor(239, 68, 68); // red
  } else if (invoice.status === 'Partially Paid') {
    doc.setTextColor(245, 158, 11); // amber
  } else if (invoice.status === 'Cancelled') {
    doc.setTextColor(100, 116, 139); // slate
  } else {
    doc.setTextColor(37, 99, 235); // blue
  }
  doc.text(invoice.status.toUpperCase(), margin + colWidth * 3 + 12, y + 28);

  y += 55;

  // Two columns: Billed By (Left) vs Billed To (Right)
  const partyWidth = (pageWidth - margin * 2 - 20) / 2;

  // Billed By
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('BILLED BY (SUPPLIER)', margin, y);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y + 6, partyWidth, 75, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(company.companyName, margin + 10, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const compAddr = [company.address, [company.city, company.state, company.pincode].filter(Boolean).join(', ')].filter(Boolean).join(', ');
  const splitCompAddr = doc.splitTextToSize(compAddr, partyWidth - 20);
  doc.text(splitCompAddr, margin + 10, y + 36);

  const compContactY = y + 58;
  doc.text(`GSTIN: ${company.gstNumber || 'N/A'} • PAN: ${company.pan || 'N/A'}`, margin + 10, compContactY);
  doc.text(`Email: ${company.email || 'N/A'} | Phone: ${company.phone || 'N/A'}`, margin + 10, compContactY + 11);

  // Billed To
  const rightColX = margin + partyWidth + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('BILLED TO (BUYER / CUSTOMER)', rightColX, y);

  doc.roundedRect(rightColX, y + 6, partyWidth, 75, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(customer.companyName || 'Valued Client', rightColX + 10, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Attn: ${customer.contactPerson || 'Commercial Department'}`, rightColX + 10, y + 34);

  const custAddr = [customer.address, [customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')].filter(Boolean).join(', ');
  const splitCustAddr = doc.splitTextToSize(custAddr || 'Address on record', partyWidth - 20);
  doc.text(splitCustAddr, rightColX + 10, y + 46);

  doc.text(`GSTIN: ${customer.gstNumber || 'Unregistered / NA'} | Phone: ${customer.mobile || 'N/A'}`, rightColX + 10, y + 69);

  y += 92;

  // Table of Items
  const tableHeaders = [['#', 'Item & Description', 'Qty', 'Unit Price', 'Disc %', 'Tax %', 'Tax Amt', 'Total']];
  const tableRows = (invoice.items || []).map((it, idx) => [
    idx + 1,
    `${it.name}${it.description ? `\n${it.description}` : ''}`,
    it.quantity,
    formatCurrency(it.unitPrice, invoice.currency),
    it.discount ? `${it.discount}%` : '-',
    `${it.taxRate}%`,
    formatCurrency(it.taxAmount, invoice.currency),
    formatCurrency(it.lineTotal, invoice.currency),
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: tableRows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: primaryRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 6,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 65, halign: 'right' },
      4: { cellWidth: 42, halign: 'center' },
      5: { cellWidth: 42, halign: 'center' },
      6: { cellWidth: 60, halign: 'right' },
      7: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: () => {
      // Running header/footer if multi-page
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 14;
  y = finalY;

  // Check if we need page break for summary and bank details
  if (y > pageHeight - 210) {
    doc.addPage();
    y = margin + 10;
  }

  // Summary box (Right aligned)
  const sumWidth = 240;
  const sumX = pageWidth - margin - sumWidth;
  let curY = y;

  const summaryItems = [
    { label: 'Subtotal (Gross)', val: formatCurrency(invoice.subtotal, invoice.currency) },
    ...(invoice.discount > 0 ? [{ label: 'Discount', val: `-${formatCurrency(invoice.discount, invoice.currency)}` }] : []),
    { label: 'Taxable Value', val: formatCurrency(invoice.taxableAmount, invoice.currency) },
    ...(invoice.cgst > 0 ? [{ label: 'CGST', val: formatCurrency(invoice.cgst, invoice.currency) }] : []),
    ...(invoice.sgst > 0 ? [{ label: 'SGST', val: formatCurrency(invoice.sgst, invoice.currency) }] : []),
    ...(invoice.igst > 0 ? [{ label: 'IGST', val: formatCurrency(invoice.igst, invoice.currency) }] : []),
    { label: 'Total Tax', val: formatCurrency(invoice.tax, invoice.currency) },
  ];

  doc.setFontSize(8.5);
  summaryItems.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, sumX, curY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(item.val, pageWidth - margin, curY, { align: 'right' });
    curY += 14;
  });

  // Grand Total Bar
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(sumX - 6, curY - 2, sumWidth + 6, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Grand Total:', sumX, curY + 12);
  doc.text(formatCurrency(invoice.grandTotal, invoice.currency), pageWidth - margin, curY + 12, { align: 'right' });
  curY += 28;

  // Paid & Outstanding Breakdown
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text('Amount Paid:', sumX, curY);
  doc.text(formatCurrency(invoice.paidAmount, invoice.currency), pageWidth - margin, curY, { align: 'right' });
  curY += 13;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(225, 29, 72); // rose
  doc.text('Balance Due / Outstanding:', sumX, curY);
  doc.text(formatCurrency(invoice.outstandingAmount, invoice.currency), pageWidth - margin, curY, { align: 'right' });

  // Bank & Remittance details on Left Side
  const bankWidth = sumX - margin - 20;
  let bankY = y;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('BANK REMITTANCE DETAILS', margin, bankY);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, bankY + 6, bankWidth, 80, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(bank.accountHolderName || company.companyName, margin + 10, bankY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank Name: ${bank.bankName || 'N/A'}`, margin + 10, bankY + 33);
  doc.text(`Account No: ${bank.accountNumber || 'N/A'}`, margin + 10, bankY + 45);
  doc.text(`IFSC Code: ${bank.ifscCode || 'N/A'} | Branch: ${bank.branch || 'N/A'}`, margin + 10, bankY + 57);
  if (bank.upiId) {
    doc.text(`UPI ID: ${bank.upiId}`, margin + 10, bankY + 69);
  }

  y = Math.max(curY, bankY + 95) + 12;

  // Amount in words
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Amount in Words: ', margin + 8, y + 13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(numberToWords(invoice.grandTotal), margin + 84, y + 13);

  y += 28;

  // Terms and Authorized Signatory
  if (y > pageHeight - 90) {
    doc.addPage();
    y = margin + 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('TERMS & COMMERCIAL CONDITIONS:', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const termsText = [
    '1. Please make all cheques / direct electronic remittances payable to SparkGenTechnology Private Limited.',
    '2. Payment is due strictly as per agreed commercial milestones and the due date specified on this invoice.',
    '3. This is a computer-generated tax invoice verified under the SalesSphere Financial Management Module.',
  ];
  termsText.forEach((t, i) => {
    doc.text(t, margin, y + 12 + i * 11);
  });

  // Authorized Signatory Block on bottom-right
  const sigX = pageWidth - margin - 150;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${company.companyName}`, sigX, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Commercial Signatory', sigX, y + 42);

  // Bottom Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${company.companyName} • ${company.email} • ${company.website}`, margin, pageHeight - 12);
  doc.text(`Invoice: ${invoice.invoiceNumber}`, pageWidth - margin, pageHeight - 12, { align: 'right' });

  return doc;
}
