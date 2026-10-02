/**
 * Professional Credit Note and Debit Note PDF Generator
 * SparkGenTechnology — ERP/CRM Finance Module
 */

import jsPDF from 'jspdf';
import { CreditNote, DebitNote, CompanySettings } from '../types/crm';
import { formatCurrency } from './financeUtils';

export function generateCreditNotePdf(
  creditNote: CreditNote,
  companySettings?: CompanySettings
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  const company = companySettings || {
    companyName: 'SparkGenTechnology',
    address: 'SparkGen Technology Innovation Park, Phase 2, Tech Hub',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560100',
    phone: '+91 98765 43210',
    email: 'finance@sparkgentechnology.com',
    website: 'https://sparkgentechnology.com',
    gstNumber: '29AAECS1234F1Z8',
  };

  let y = margin + 15;

  // Header Box (slate-900)
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, pageWidth - margin * 2, 70, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('CREDIT NOTE', margin + 20, y + 32);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Commercial Receivable Adjustment', margin + 20, y + 48);

  // Document Number & Date (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text(creditNote.creditNoteNumber, pageWidth - margin - 20, y + 32, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Date: ${creditNote.date || new Date().toISOString().split('T')[0]}`, pageWidth - margin - 20, y + 48, { align: 'right' });

  y += 90;

  // Company and Customer 2-column info
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 95, 6, 6, 'FD');

  // Issuer details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('ISSUED BY:', margin + 16, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(company.companyName, margin + 16, y + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${company.address || ''}, ${company.city || ''} ${company.state || ''}`, margin + 16, y + 50);
  doc.text(`GSTIN: ${company.gstNumber || 'N/A'} | Email: ${company.email || ''}`, margin + 16, y + 64);

  // Customer details
  const col2X = margin + (pageWidth - margin * 2) / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('CREDITED TO (BUYER):', col2X, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(creditNote.customerName, col2X, y + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Original Invoice Ref: ${creditNote.invoiceNumber}`, col2X, y + 50);
  doc.text(`Status: ${creditNote.status.toUpperCase()}`, col2X, y + 64);

  y += 115;

  // Details Table
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 26, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 26, pageWidth - margin, y + 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('DESCRIPTION / REASON', margin + 16, y + 17);
  doc.text('ORIGINAL INVOICE', margin + 280, y + 17);
  doc.text('CREDIT AMOUNT (INR)', pageWidth - margin - 16, y + 17, { align: 'right' });

  y += 26;

  // Row
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, pageWidth - margin * 2, 45, 'F');
  doc.line(margin, y + 45, pageWidth - margin, y + 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const reasonLines = doc.splitTextToSize(creditNote.reason || 'Commercial Credit Adjustment as agreed.', 250);
  doc.text(reasonLines, margin + 16, y + 18);

  doc.text(creditNote.invoiceNumber, margin + 280, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(creditNote.amount), pageWidth - margin - 16, y + 18, { align: 'right' });

  y += 65;

  // Total Card
  const totalBoxWidth = 220;
  const totalBoxX = pageWidth - margin - totalBoxWidth;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(totalBoxX, y, totalBoxWidth, 50, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL ADJUSTED CREDIT:', totalBoxX + 14, y + 20);

  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129); // emerald
  doc.text(formatCurrency(creditNote.amount), totalBoxX + totalBoxWidth - 14, y + 36, { align: 'right' });

  y += 75;

  // Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Note: This credit note has been registered in the accounts receivable ledger and reduces the total outstanding balance accordingly.',
    margin,
    y
  );

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 50, pageWidth - margin, pageHeight - 50);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Generated automatically by SparkGenTechnology ERP/CRM Finance Module. Official computerized document.',
    margin,
    pageHeight - 34
  );

  return doc;
}

export function generateDebitNotePdf(
  debitNote: DebitNote,
  companySettings?: CompanySettings
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  const company = companySettings || {
    companyName: 'SparkGenTechnology',
    address: 'SparkGen Technology Innovation Park, Phase 2, Tech Hub',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560100',
    phone: '+91 98765 43210',
    email: 'finance@sparkgentechnology.com',
    website: 'https://sparkgentechnology.com',
    gstNumber: '29AAECS1234F1Z8',
  };

  let y = margin + 15;

  // Header Box (slate-900)
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, pageWidth - margin * 2, 70, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('DEBIT NOTE', margin + 20, y + 32);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Commercial Supplementary Debit Note', margin + 20, y + 48);

  // Document Number & Date (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246); // Blue
  doc.text(debitNote.debitNoteNumber, pageWidth - margin - 20, y + 32, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Date: ${debitNote.date || new Date().toISOString().split('T')[0]}`, pageWidth - margin - 20, y + 48, { align: 'right' });

  y += 90;

  // Company and Customer 2-column info
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 95, 6, 6, 'FD');

  // Issuer details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('ISSUED BY:', margin + 16, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(company.companyName, margin + 16, y + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${company.address || ''}, ${company.city || ''} ${company.state || ''}`, margin + 16, y + 50);
  doc.text(`GSTIN: ${company.gstNumber || 'N/A'} | Email: ${company.email || ''}`, margin + 16, y + 64);

  // Customer details
  const col2X = margin + (pageWidth - margin * 2) / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('DEBITED TO (BUYER):', col2X, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(debitNote.customerName, col2X, y + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  if (debitNote.invoiceNumber) {
    doc.text(`Related Invoice: ${debitNote.invoiceNumber}`, col2X, y + 50);
  }
  doc.text(`Status: ${debitNote.status.toUpperCase()}`, col2X, y + 64);

  y += 115;

  // Details Table
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 26, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 26, pageWidth - margin, y + 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('DESCRIPTION / REASON', margin + 16, y + 17);
  doc.text('TAXABLE (INR)', margin + 260, y + 17);
  doc.text('TAX (INR)', margin + 360, y + 17);
  doc.text('TOTAL DEBIT (INR)', pageWidth - margin - 16, y + 17, { align: 'right' });

  y += 26;

  // Row
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, pageWidth - margin * 2, 45, 'F');
  doc.line(margin, y + 45, pageWidth - margin, y + 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const reasonLines = doc.splitTextToSize(debitNote.reason || 'Additional service charges/price correction.', 230);
  doc.text(reasonLines, margin + 16, y + 18);

  doc.text(formatCurrency(debitNote.amount), margin + 260, y + 18);
  doc.text(formatCurrency(debitNote.tax), margin + 360, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(debitNote.total), pageWidth - margin - 16, y + 18, { align: 'right' });

  y += 65;

  // Total Box
  const totalBoxWidth = 220;
  const totalBoxX = pageWidth - margin - totalBoxWidth;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(totalBoxX, y, totalBoxWidth, 50, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL DEBIT AMOUNT:', totalBoxX + 14, y + 20);

  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text(formatCurrency(debitNote.total), totalBoxX + totalBoxWidth - 14, y + 36, { align: 'right' });

  y += 75;

  // Note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Note: This debit note increases the customer account liability and has been recorded in the customer financial ledger.',
    margin,
    y
  );

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 50, pageWidth - margin, pageHeight - 50);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Generated automatically by SparkGenTechnology ERP/CRM Finance Module. Official computerized document.',
    margin,
    pageHeight - 34
  );

  return doc;
}
