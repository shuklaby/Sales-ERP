import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProposalRecord, BrandingSettings, ProposalTemplateSettings, SignatorySettings } from '../types/crm';
import { numberToWordsINR } from './numberToWords';

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

export function generateProposalPdf(proposal: ProposalRecord): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36; // 0.5 inch

  const company = proposal.companySnapshot || {
    companyName: 'SparkGenTechnology',
    address: 'SparkGen Technology Innovation Park, Phase 2, Tech Hub',
    phone: '+91 98765 43210',
    email: 'sales@sparkgentechnology.com',
    website: 'https://sparkgentechnology.com',
    gstNumber: '29AAECS1234F1Z8',
  };

  const bank = proposal.bankSnapshot || {
    accountHolderName: 'SparkGenTechnology Private Limited',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '50200034891234',
    ifscCode: 'HDFC0001234',
    branch: 'Innovation Tech Branch',
  };

  const branding: Partial<BrandingSettings> = proposal.brandingSnapshot || {};
  const template: Partial<ProposalTemplateSettings> = proposal.templateSnapshot || {};
  const signature: Partial<SignatorySettings> = proposal.signatureSnapshot || {};

  const primaryColorRgb = hexToRgb(branding.primaryColor || template.primaryColor || '#0f172a');

  const custSnapshot = proposal.customerSnapshot || {
    companyName: proposal.customerName,
    contactPerson: proposal.customerName,
    mobile: proposal.customerMobile || '',
    email: proposal.customerEmail || '',
    gstNumber: proposal.customerGst || '',
    address: proposal.customerAddress || '',
  };

  // Header Banner Background with configured primary color
  doc.setFillColor(...primaryColorRgb);
  doc.rect(0, 0, pageWidth, 94, 'F');

  // Try embedding logo if configured & present
  const showLogo = branding.showLogo !== false;
  let headerTextLeft = margin;

  if (showLogo && company.logoUrl && company.logoUrl.startsWith('data:image')) {
    try {
      const format = company.logoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(company.logoUrl, format, margin, 18, 54, 54);
      headerTextLeft = margin + 64;
    } catch (e) {
      console.warn('Could not render logo in PDF:', e);
    }
  }

  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(company.companyName || 'SparkGenTechnology', headerTextLeft, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300

  // Filter company header lines based on header settings (Phase 7 Requirement 6)
  const showAddr = branding.showCompanyAddress !== false;
  const showPhone = branding.showPhone !== false;
  const showEmail = branding.showEmail !== false;
  const showWebsite = branding.showWebsite !== false;
  const showGST = branding.showGST !== false;

  const addrParts = [];
  if (showAddr && company.address) {
    addrParts.push(
      `${company.address}${company.city ? `, ${company.city}` : ''}${company.pincode ? ` - ${company.pincode}` : ''}`
    );
  }

  const contactParts = [];
  if (showPhone && company.phone) {
    contactParts.push(`Phone: ${company.phone}${company.alternatePhone ? ` / ${company.alternatePhone}` : ''}`);
  }
  if (showEmail && company.email) {
    contactParts.push(`Email: ${company.email}`);
  }
  if (showWebsite && company.website) {
    contactParts.push(`Web: ${company.website}`);
  }

  const taxParts = [];
  if (showGST && company.gstNumber) {
    taxParts.push(`GSTIN: ${company.gstNumber}`);
  }
  if (company.pan || company.panNumber) {
    taxParts.push(`PAN: ${company.pan || company.panNumber}`);
  }

  const compLines = [
    addrParts.join(''),
    contactParts.join(' | '),
    taxParts.join(' | '),
  ].filter(Boolean);

  let compY = 48;
  compLines.forEach((line) => {
    doc.text(line, headerTextLeft, compY);
    compY += 11;
  });

  // Proposal Badge / Status
  const badgeWidth = 155;
  const badgeX = pageWidth - margin - badgeWidth;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(badgeX, 16, badgeWidth, 62, 4, 4, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('COMMERCIAL PROPOSAL', badgeX + 10, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`No: ${proposal.proposalNumber}`, badgeX + 10, 46);
  doc.text(`Status: ${(proposal.status || 'DRAFT').toUpperCase()}`, badgeX + 10, 58);
  if (proposal.stsNumber) {
    doc.text(`STS Ref: ${proposal.stsNumber}`, badgeX + 10, 70);
  }

  // Customer Info Box & Document Details Side-by-Side
  let currentY = 108;
  const leftBoxW = (pageWidth - margin * 2) * 0.55;
  const rightBoxW = (pageWidth - margin * 2) * 0.42;
  const rightBoxX = margin + (pageWidth - margin * 2) * 0.58;
  const infoBoxH = 105;

  // Left side: Customer Snapshot
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, leftBoxW, infoBoxH, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, leftBoxW, infoBoxH, 4, 4, 'S');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PROPOSAL PREPARED FOR (CLIENT):', margin + 12, currentY + 16);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(custSnapshot.companyName || proposal.customerName || 'Customer Company', margin + 12, currentY + 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  let custY = currentY + 46;
  if (custSnapshot.contactPerson) {
    doc.text(`Attn: ${custSnapshot.contactPerson}`, margin + 12, custY);
    custY += 12;
  }
  const custContactLine = [
    custSnapshot.mobile ? `Mobile: ${custSnapshot.mobile}` : '',
    custSnapshot.email ? `Email: ${custSnapshot.email}` : '',
  ].filter(Boolean).join(' | ');
  if (custContactLine) {
    doc.text(custContactLine, margin + 12, custY);
    custY += 12;
  }
  if (custSnapshot.address) {
    const fullAddr = `${custSnapshot.address}${custSnapshot.city ? `, ${custSnapshot.city}` : ''}${custSnapshot.state ? `, ${custSnapshot.state}` : ''}${custSnapshot.pincode ? ` - ${custSnapshot.pincode}` : ''}`;
    const splitAddr = doc.splitTextToSize(fullAddr, leftBoxW - 24);
    doc.text(splitAddr, margin + 12, custY);
    custY += (splitAddr.length * 10);
  }
  doc.text(`GSTIN: ${custSnapshot.gstNumber || 'Unregistered / Not Provided'}`, margin + 12, currentY + 95);

  // Right side: Document Details
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX, currentY, rightBoxW, infoBoxH, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightBoxX, currentY, rightBoxW, infoBoxH, 4, 4, 'S');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PROPOSAL DETAILS:', rightBoxX + 12, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  const proposalDateFormatted = proposal.proposalDate
    ? new Date(proposal.proposalDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date(proposal.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.text(`Proposal Date: ${proposalDateFormatted}`, rightBoxX + 12, currentY + 34);
  doc.text(`Valid Until: ${proposal.validUntil || '30 Days from date of issue'}`, rightBoxX + 12, currentY + 48);
  doc.text(`Executive: ${proposal.createdByName || 'Sales Team'}`, rightBoxX + 12, currentY + 62);
  if (proposal.assignedEmployeeName) {
    doc.text(`Assigned To: ${proposal.assignedEmployeeName}`, rightBoxX + 12, currentY + 76);
  } else {
    doc.text(`Currency: INR (₹ - Indian Rupee)`, rightBoxX + 12, currentY + 76);
  }
  doc.text(`Payment Terms: As per commercial policy`, rightBoxX + 12, currentY + 90);

  currentY += (infoBoxH + 15);

  // Items Table
  const tableRows = proposal.items.map((item, idx) => {
    const itemNameAndDesc = item.name + (item.description ? `\n${item.description}` : '');
    const discLabel = item.discountPercent > 0 ? `${item.discountPercent}%` : '-';
    return [
      idx + 1,
      itemNameAndDesc,
      item.type ? item.type.toUpperCase() : 'PRODUCT',
      `${item.quantity} ${item.unit || ''}`,
      `₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      discLabel,
      `${item.gstRate}%`,
      `₹${item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    ];
  });

  const tableTheme = template.tableStyle || branding.tableStyle || 'striped';

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Item & Description', 'Type', 'Qty', 'Unit Rate', 'Disc', 'GST', 'Line Total (INR)']],
    body: tableRows,
    theme: tableTheme === 'bordered' ? 'grid' : tableTheme === 'clean' ? 'plain' : 'striped',
    headStyles: {
      fillColor: primaryColorRgb,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 50, halign: 'center' },
      3: { cellWidth: 46, halign: 'center' },
      4: { cellWidth: 64, halign: 'right' },
      5: { cellWidth: 38, halign: 'center' },
      6: { cellWidth: 38, halign: 'center' },
      7: { cellWidth: 80, halign: 'right' },
    },
    styles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: [15, 23, 42],
    },
    margin: { left: margin, right: margin },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 14;

  // Check if summary and bank fit on current page or need a new page
  if (finalY + 160 > pageHeight) {
    doc.addPage();
    finalY = margin + 10;
  }

  // Totals Breakdown box (Right aligned)
  const totalsWidth = 230;
  const totalsX = pageWidth - margin - totalsWidth;
  const totalsH = 115;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsX, finalY, totalsWidth, totalsH, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsX, finalY, totalsWidth, totalsH, 4, 4, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const leftLabelX = totalsX + 12;
  const rightValX = totalsX + totalsWidth - 12;

  let totY = finalY + 16;
  doc.text('Subtotal:', leftLabelX, totY);
  doc.text(`₹${proposal.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightValX, totY, { align: 'right' });

  totY += 15;
  doc.text('Total Discount:', leftLabelX, totY);
  doc.text(`- ₹${proposal.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightValX, totY, { align: 'right' });

  totY += 15;
  doc.text('Taxable Amount:', leftLabelX, totY);
  doc.text(`₹${proposal.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightValX, totY, { align: 'right' });

  totY += 15;
  doc.text('Total GST Amount:', leftLabelX, totY);
  doc.text(`+ ₹${proposal.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, rightValX, totY, { align: 'right' });

  // Grand total bar
  totY += 18;
  doc.setFillColor(...primaryColorRgb);
  doc.rect(totalsX, totY - 11, totalsWidth, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Grand Total:', leftLabelX, totY + 6);
  doc.text(
    `₹${proposal.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    rightValX,
    totY + 6,
    { align: 'right' }
  );

  // Bank Account Box (Left aligned at same Y) - check showBankSection (Phase 7 Requirement 7, 8, 15)
  const showBankSection = template.showBankSection !== false;
  const bankWidth = totalsX - margin - 15;

  if (showBankSection) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, finalY, bankWidth, totalsH, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, finalY, bankWidth, totalsH, 4, 4, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('BANK & REMITTANCE DETAILS (SNAPSHOT):', margin + 12, finalY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Beneficiary: ${bank.accountHolderName || company.companyName}`, margin + 12, finalY + 34);
    doc.text(`Bank Name: ${bank.bankName || 'HDFC Bank Ltd'}`, margin + 12, finalY + 48);
    // Unmasked account number in proposal PDF as required by Section 7
    doc.text(`Account No: ${bank.accountNumber || 'N/A'}`, margin + 12, finalY + 62);
    doc.text(`IFSC Code: ${bank.ifscCode || 'N/A'}${bank.branch ? ` | Branch: ${bank.branch}` : ''}`, margin + 12, finalY + 76);
    if (bank.upiId) {
      doc.text(`UPI VPA: ${bank.upiId}`, margin + 12, finalY + 90);
    }
  }

  // Amount in words banner
  const wordsY = finalY + totalsH + 8;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, wordsY, pageWidth - margin * 2, 20, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Amount in Words:', margin + 10, wordsY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const wordsText = numberToWordsINR(proposal.grandTotal);
  doc.text(wordsText, margin + 88, wordsY + 13);

  // Terms and Signatory Section
  let bottomY = wordsY + 28;
  if (bottomY + 120 > pageHeight) {
    doc.addPage();
    bottomY = margin + 10;
  }

  // Terms & Conditions Box (Phase 7 Requirement 12, 15)
  const showTerms = template.showTerms !== false;
  if (showTerms) {
    let termsText = proposal.terms || company.termsAndConditions || 'Standard payment and commercial terms apply.';
    if (proposal.termsSnapshot && proposal.termsSnapshot.length > 0) {
      termsText = proposal.termsSnapshot
        .map((t, i) => `${i + 1}. ${t.title}: ${t.content}`)
        .join('\n');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TERMS & CONDITIONS:', margin, bottomY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const termsBoxW = pageWidth - margin * 2 - 170;
    const splitTerms = doc.splitTextToSize(termsText, termsBoxW);
    doc.text(splitTerms, margin, bottomY + 14);
  }

  // Authorized Signatory Box (Phase 7 Requirement 14, 15)
  const showSignature = signature.showSignature !== false && template.showSignature !== false;
  if (showSignature) {
    const sigBoxW = 150;
    const sigX = pageWidth - margin - sigBoxW;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`For ${company.companyName || 'SparkGenTechnology'}`, sigX, bottomY + 14);

    // If signature image is present in signatureSnapshot, render it
    if (signature.signatureImageUrl && signature.signatureImageUrl.startsWith('data:image')) {
      try {
        const sigFormat = signature.signatureImageUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(signature.signatureImageUrl, sigFormat, sigX, bottomY + 20, 110, 40);
      } catch (sigErr) {
        console.warn('Could not render signature graphic:', sigErr);
      }
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(sigX, bottomY + 64, sigX + sigBoxW - 10, bottomY + 64);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const signatoryLabel = signature.signatoryName || 'Authorized Signatory';
    const designationLabel = signature.designation ? ` (${signature.designation})` : '';
    doc.text(`${signatoryLabel}${designationLabel}`, sigX, bottomY + 76);
  }

  // Footer on all pages (Phase 7 Requirement 13, 15)
  const totalPages = doc.getNumberOfPages();
  const configuredFooter = template.footerText || company.footerText || `Thank you for choosing ${company.companyName || 'SparkGenTechnology'}.`;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 24, pageWidth - margin, pageHeight - 24);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${configuredFooter} | Ref: ${proposal.proposalNumber}`,
      margin,
      pageHeight - 12
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 50, pageHeight - 12);
  }

  return doc;
}
