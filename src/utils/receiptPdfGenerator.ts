/**
 * Professional Official Payment Receipt PDF Generator
 * SparkGenTechnology — SalesSphere CRM
 */

import jsPDF from 'jspdf';
import { PaymentReceipt } from '../types/crm';
import { formatCurrency } from './financeUtils';

export function generateReceiptPdf(receipt: PaymentReceipt): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;

  const company = receipt.companySnapshot || {
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

  const customer = receipt.customerSnapshot || {
    companyName: 'Valued Client',
    contactPerson: 'Commercial Operations',
    email: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
  };

  const bank = receipt.bankSnapshot || {
    accountHolderName: 'SparkGenTechnology Private Limited',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50200034891234',
    ifscCode: 'HDFC0001234',
    branch: 'Innovation Tech Branch',
    upiId: 'sparkgen@hdfcbank',
  };

  let y = margin + 15;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, pageWidth - margin * 2, 64, 'F');

  // SparkGen Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(company.companyName || 'SparkGenTechnology', margin + 16, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(company.legalName || 'SparkGenTechnology Private Limited', margin + 16, y + 42);
  doc.text(`GSTIN: ${company.gstNumber || 'N/A'} • PAN: ${company.pan || 'N/A'}`, margin + 16, y + 54);

  // Receipt Label & Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('PAYMENT RECEIPT', pageWidth - margin - 16, y + 28, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(receipt.receiptNumber, pageWidth - margin - 16, y + 46, { align: 'right' });

  y += 82;

  // Receipt Information Bar
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 42, 'FD');

  const colWidth = (pageWidth - margin * 2) / 3;

  // Receipt Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT DATE', margin + 12, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.paymentDate || 'N/A', margin + 12, y + 28);

  // Payment Method
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT METHOD', margin + colWidth + 12, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.paymentMethod || 'Bank Transfer', margin + colWidth + 12, y + 28);

  // Reference Number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TRANSACTION REFERENCE / UTR', margin + colWidth * 2 + 12, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(receipt.referenceNumber || 'N/A', margin + colWidth * 2 + 12, y + 28);

  y += 58;

  // Highlight Box: Received Amount
  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(187, 247, 208); // green-200
  doc.roundedRect(margin, y, pageWidth - margin * 2, 60, 6, 6, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text('AMOUNT RECEIVED IN FULL CONFIRMATION:', margin + 16, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(21, 128, 61); // green-700
  doc.text(formatCurrency(receipt.amount, 'INR'), margin + 16, y + 48);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('OFFICIAL SETTLEMENT CONFIRMATION', pageWidth - margin - 16, y + 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text('Status: CONFIRMED & AUDITED', pageWidth - margin - 16, y + 45, { align: 'right' });

  y += 75;

  // Received From (Customer Info)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('RECEIVED WITH THANKS FROM:', margin, y);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y + 6, pageWidth - margin * 2, 62, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(customer.companyName || 'Valued Client', margin + 14, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Contact: ${customer.contactPerson || 'Accounts'} | Phone: ${customer.mobile || 'N/A'} | Email: ${customer.email || 'N/A'}`, margin + 14, y + 38);
  doc.text(`GSTIN: ${customer.gstNumber || 'Unregistered / Not Applicable'}`, margin + 14, y + 52);

  y += 82;

  // Details Table
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, pageWidth - margin * 2, 22, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('SETTLEMENT DETAILS & ALLOCATION', margin + 10, y + 14);

  y += 22;

  const rows = [
    ['Associated Invoice Number:', receipt.invoiceNumber || 'Direct Payment / Customer Advance'],
    ['Payment Record Reference:', receipt.paymentId],
    ['Transaction Reference / UTR:', receipt.referenceNumber || 'N/A'],
    ['Payment Channel:', receipt.paymentMethod || 'Bank Transfer'],
    ['Credited Bank Account:', `${bank.bankName || 'HDFC Bank'} (A/C: ${bank.accountNumber || 'N/A'})`],
    ['Amount in Words:', receipt.amountInWords || ''],
  ];

  rows.forEach((r, idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 250, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, pageWidth - margin * 2, 18, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 18, pageWidth - margin, y + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(r[0], margin + 10, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(r[1], margin + 180, y + 12);

    y += 18;
  });

  y += 24;

  // Notes if any
  if (receipt.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Notes:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(receipt.notes, margin + 40, y);
    y += 22;
  }

  // Terms and Signatory Box
  const sigY = pageHeight - margin - 80;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('TERMS OF RECEIPT:', margin, sigY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('1. Receipts issued are valid subject to actual realization of funds in SparkGenTechnology account.', margin, sigY + 12);
  doc.text('2. This is an authenticated, tamper-evident digital receipt generated by SalesSphere CRM.', margin, sigY + 23);
  doc.text('3. For billing or ledger queries, contact accounts@sparkgentechnology.com.', margin, sigY + 34);

  // Signatory
  const sigX = pageWidth - margin - 160;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`For ${company.companyName}`, sigX, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Finance Signatory', sigX, sigY + 34);

  // Bottom Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`${company.companyName} • ${company.email} • ${company.phone}`, margin, pageHeight - 12);
  doc.text(`Receipt: ${receipt.receiptNumber}`, pageWidth - margin, pageHeight - 12, { align: 'right' });

  return doc;
}
