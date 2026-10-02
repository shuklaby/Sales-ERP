import React from 'react';
import { X, Download, ShieldCheck, CheckCircle2, Sparkles, Building2, CreditCard, FileText } from 'lucide-react';
import {
  CompanySettings,
  BrandingSettings,
  BankAccount,
  ProposalTemplateSettings,
  SignatorySettings,
  TermItem,
  ProposalRecord,
} from '../../types/crm';
import { generateProposalPdf } from '../../utils/proposalPdfGenerator';

interface ProposalTemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  companySettings: CompanySettings;
  brandingSettings: BrandingSettings;
  defaultBank?: BankAccount;
  templateSettings: ProposalTemplateSettings;
  signatorySettings: SignatorySettings;
  termsList: TermItem[];
}

export const ProposalTemplatePreviewModal: React.FC<ProposalTemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  companySettings,
  brandingSettings,
  defaultBank,
  templateSettings,
  signatorySettings,
  termsList,
}) => {
  if (!isOpen) return null;

  const primaryColor = templateSettings.primaryColor || brandingSettings.primaryColor || '#0f172a';
  const logoUrl = brandingSettings.logoUrl || companySettings.logoUrl;
  const activeTerms = termsList.filter((t) => t.isActive);

  // Construct realistic preview proposal object
  const previewProposal: ProposalRecord = {
    id: 'sample_preview_proposal',
    proposalId: 'sample_preview_proposal',
    proposalNumber: 'PROP-2026-SAMPLE',
    proposalDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    customerId: 'cust_sample_123',
    customerName: 'Acme Industrial Technologies Ltd',
    customerEmail: 'procurement@acme-ind.com',
    customerMobile: '+91 98200 12345',
    customerGst: '27AABCA1234F1Z5',
    customerAddress: 'Plot 45, Sector 8, MIDC Industrial Area',
    customerSnapshot: {
      companyName: 'Acme Industrial Technologies Ltd',
      contactPerson: 'Vikram Malhotra (VP - Technology Infrastructure)',
      mobile: '+91 98200 12345',
      email: 'procurement@acme-ind.com',
      gstNumber: '27AABCA1234F1Z5',
      address: 'Plot 45, Sector 8, MIDC Industrial Area',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411018',
    },
    items: [
      {
        id: 'sample_item_1',
        type: 'product',
        name: 'Enterprise Cloud Firewall Appliance (FW-ENT-500)',
        description: 'Next-Gen hardware firewall with AI threat detection, 10Gbps throughput and dual redundant power supply',
        unit: 'Unit',
        quantity: 1,
        unitPrice: 185000,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: 185000,
        gstRate: 18,
        gstAmount: 33300,
        totalAmount: 218300,
      },
      {
        id: 'sample_item_2',
        type: 'product',
        name: 'Managed Core Switch 48-Port PoE+ (SW-CORE-48)',
        description: 'Layer 3 Managed Gigabit Switch with redundant dual power supply and enterprise stacking modules',
        unit: 'Unit',
        quantity: 2,
        unitPrice: 95000,
        discountPercent: 5,
        discountAmount: 9500,
        taxableAmount: 180500,
        gstRate: 18,
        gstAmount: 32490,
        totalAmount: 212990,
      },
      {
        id: 'sample_item_3',
        type: 'service',
        name: '24/7 Enterprise Mission-Critical SLA & SOC Monitoring',
        description: '1-Year comprehensive enterprise managed SLA with guaranteed 15-minute response time',
        unit: 'Year',
        quantity: 1,
        unitPrice: 120000,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: 120000,
        gstRate: 18,
        gstAmount: 21600,
        totalAmount: 141600,
      },
    ],
    subtotal: 375000,
    discount: 9500,
    taxableAmount: 485500,
    gstTotal: 87390,
    grandTotal: 572890,
    status: 'Draft',
    isImmutable: false,
    terms: companySettings.termsAndConditions || '',
    companySnapshot: { ...companySettings },
    bankSnapshot: defaultBank
      ? {
          accountHolderName: defaultBank.accountHolderName,
          bankName: defaultBank.bankName,
          accountNumber: defaultBank.accountNumber,
          ifscCode: defaultBank.ifscCode,
          branch: defaultBank.branch,
          upiId: defaultBank.upiId,
          isDefault: defaultBank.isDefault,
          status: defaultBank.status,
        }
      : {
          accountHolderName: companySettings.legalName || companySettings.companyName,
          bankName: 'HDFC Bank Ltd',
          accountNumber: '50200034891234',
          ifscCode: 'HDFC0001234',
          branch: 'Innovation Tech Branch',
          isDefault: true,
          status: 'active',
        },
    brandingSnapshot: { ...brandingSettings },
    templateSnapshot: { ...templateSettings },
    termsSnapshot: activeTerms,
    signatureSnapshot: { ...signatorySettings },
    settingsVersion: companySettings.settingsVersion || 1,
    createdBy: 'admin_preview',
    createdByName: 'Administrator',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleDownloadSamplePdf = () => {
    const doc = generateProposalPdf(previewProposal);
    doc.save(`TEMPLATE_PREVIEW_${companySettings.companyName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Top Action Bar */}
        <div className="bg-slate-950 text-white p-4 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Proposal Template Live Preview</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Sample Data Only • Not Saved
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Evaluating style: <strong className="text-slate-200 capitalize">{templateSettings.headerStyle}</strong> Header •{' '}
                <strong className="text-slate-200 capitalize">{templateSettings.tableStyle}</strong> Table •{' '}
                Primary Accent: <span className="font-mono text-indigo-300">{primaryColor}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSamplePdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download Sample PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Realistic Proposal Canvas Preview */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-100">
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 max-w-3xl mx-auto overflow-hidden text-slate-800">
            {/* Watermark Banner */}
            <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-center py-1.5 text-[11px] font-semibold tracking-wide flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              CONFIDENTIAL COMMERCIAL PROPOSAL TEMPLATE PREVIEW
            </div>

            {/* Configured Header */}
            <div
              style={{ backgroundColor: primaryColor }}
              className={`p-6 text-white ${
                templateSettings.headerStyle === 'minimal'
                  ? 'bg-slate-900'
                  : templateSettings.headerStyle === 'modern'
                  ? 'border-b-4 border-indigo-400'
                  : ''
              }`}
            >
              <div
                className={`flex flex-col md:flex-row justify-between gap-4 ${
                  templateSettings.logoPosition === 'center'
                    ? 'items-center text-center'
                    : templateSettings.logoPosition === 'right'
                    ? 'flex-row-reverse'
                    : 'items-start'
                }`}
              >
                {/* Logo Area */}
                {brandingSettings.showLogo !== false && logoUrl && (
                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 backdrop-blur-xs max-w-[160px] max-h-[70px] flex items-center justify-center">
                    <img src={logoUrl} alt="Company Logo" className="max-h-12 max-w-full object-contain" />
                  </div>
                )}

                {/* Company Details */}
                {templateSettings.showCompanyDetails !== false && (
                  <div className="space-y-1">
                    <h1 className="text-xl font-black tracking-tight">{companySettings.companyName || 'SparkGenTechnology'}</h1>
                    {companySettings.legalName && (
                      <p className="text-xs text-white/80">{companySettings.legalName}</p>
                    )}
                    {companySettings.tagline && (
                      <p className="text-[11px] text-white/70 italic">{companySettings.tagline}</p>
                    )}

                    <div className="text-[11px] text-white/80 space-y-0.5 pt-1">
                      {brandingSettings.showCompanyAddress !== false && companySettings.address && (
                        <p>{companySettings.address}, {companySettings.city || 'Tech Hub'} - {companySettings.pincode}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {brandingSettings.showPhone !== false && companySettings.phone && (
                          <p>Phone: {companySettings.phone}</p>
                        )}
                        {brandingSettings.showEmail !== false && companySettings.email && (
                          <p>Email: {companySettings.email}</p>
                        )}
                        {brandingSettings.showWebsite !== false && companySettings.website && (
                          <p>Web: {companySettings.website}</p>
                        )}
                      </div>
                      {brandingSettings.showGST !== false && companySettings.gstNumber && (
                        <p className="font-mono text-[10px] text-white/90">GSTIN: {companySettings.gstNumber}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Proposal Meta & Client Bar */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Prepared Exclusively For:
                </span>
                <p className="font-bold text-slate-900 text-sm">Acme Industrial Technologies Ltd</p>
                <p className="text-slate-600">Attn: Vikram Malhotra (VP - Tech)</p>
                <p className="text-slate-500">Plot 45, Sector 8, MIDC Area, Pune - 411018</p>
                <p className="text-slate-500 font-mono text-[11px]">GSTIN: 27AABCA1234F1Z5</p>
              </div>

              <div className="sm:text-right space-y-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Proposal Reference:
                  </span>
                  <span className="font-mono font-bold text-sm text-indigo-950">
                    PROP-2026-SAMPLE
                  </span>
                </div>
                <p className="text-slate-500">Proposal Date: <strong>{new Date().toLocaleDateString('en-IN')}</strong></p>
                <p className="text-slate-500">Validity: <strong>30 Days</strong></p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Scope of Supply & Pricing Breakdown
              </h4>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead
                    style={{ backgroundColor: `${primaryColor}15` }}
                    className="border-b border-slate-200 text-slate-900 font-bold"
                  >
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item & Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      {templateSettings.showGST !== false && (
                        <th className="py-2.5 px-3 text-right">GST (18%)</th>
                      )}
                      <th className="py-2.5 px-3 text-right">Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewProposal.items.map((it, idx) => (
                      <tr
                        key={it.id}
                        className={
                          templateSettings.tableStyle === 'striped' && idx % 2 === 1
                            ? 'bg-slate-50/70'
                            : ''
                        }
                      >
                        <td className="py-3 px-3 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{it.name}</p>
                          <p className="text-[11px] text-slate-500">{it.description}</p>
                        </td>
                        <td className="py-3 px-3 text-center font-medium">{it.quantity} {it.unit}</td>
                        <td className="py-3 px-3 text-right font-mono font-medium">₹{it.unitPrice.toLocaleString('en-IN')}</td>
                        {templateSettings.showGST !== false && (
                          <td className="py-3 px-3 text-right font-mono text-slate-600">₹{it.gstAmount.toLocaleString('en-IN')}</td>
                        )}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">₹{it.totalAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="mt-4 flex flex-col sm:flex-row justify-end">
                <div className="w-full sm:w-72 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹4,75,000.00</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount (5%):</span>
                    <span className="font-mono">- ₹9,500.00</span>
                  </div>
                  {templateSettings.showGST !== false && (
                    <div className="flex justify-between text-slate-600">
                      <span>Total GST (18%):</span>
                      <span className="font-mono">+ ₹87,390.00</span>
                    </div>
                  )}
                  <div
                    style={{ backgroundColor: primaryColor }}
                    className="flex justify-between items-center text-white font-bold p-2.5 rounded-lg mt-2 pt-2"
                  >
                    <span>Grand Total:</span>
                    <span className="font-mono text-sm">₹5,72,890.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Details Box */}
            {templateSettings.showBankSection !== false && defaultBank && (
              <div className="mx-6 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold text-xs">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Bank Remittance Details (For Wire Transfer / RTGS / NEFT)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Beneficiary Name</span>
                    <span className="font-semibold text-slate-800">{defaultBank.accountHolderName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Bank & Branch</span>
                    <span className="font-semibold text-slate-800">{defaultBank.bankName} {defaultBank.branch && `(${defaultBank.branch})`}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Account Number (Full)</span>
                    <span className="font-mono font-bold text-slate-900">{defaultBank.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">IFSC Code</span>
                    <span className="font-mono font-bold text-slate-900">{defaultBank.ifscCode}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Commercial Terms & Conditions */}
            {templateSettings.showTerms !== false && activeTerms.length > 0 && (
              <div className="mx-6 mb-6 p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2 mb-2 text-slate-900 font-bold text-xs">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Standard Commercial Terms & Conditions
                </div>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1 pl-1">
                  {activeTerms.map((term) => (
                    <li key={term.id}>
                      <strong className="text-slate-800">{term.title}:</strong> {term.content}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Authorized Signatory */}
            {templateSettings.showSignature !== false && signatorySettings.showSignature !== false && (
              <div className="mx-6 mb-6 flex justify-end">
                <div className="w-64 text-right">
                  <p className="text-xs font-bold text-slate-800 mb-1">
                    For {companySettings.companyName || 'SparkGenTechnology'}
                  </p>
                  {signatorySettings.signatureImageUrl ? (
                    <div className="h-14 flex items-center justify-end my-1">
                      <img
                        src={signatorySettings.signatureImageUrl}
                        alt="Signature"
                        className="max-h-12 max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-12 border-b border-dashed border-slate-300 my-2" />
                  )}
                  <p className="text-xs font-bold text-slate-900">
                    {signatorySettings.signatoryName || 'Authorized Signatory'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {signatorySettings.designation || 'Director / Commercial Operations'}
                  </p>
                </div>
              </div>
            )}

            {/* Configured Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
              {templateSettings.footerText || companySettings.footerText || `Thank you for choosing ${companySettings.companyName || 'SparkGenTechnology'}.`}
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="bg-white border-t border-slate-200 p-4 px-6 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
