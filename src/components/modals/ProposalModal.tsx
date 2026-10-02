import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Building,
  CreditCard,
  Eye,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Percent,
  Tag,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { ProposalRecord, ProposalLineItem, Customer, Lead, STSRecord } from '../../types/crm';
import { useCrmData, maskAccountNumber } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { generateProposalPdf } from '../../utils/proposalPdfGenerator';
import { numberToWordsINR } from '../../utils/numberToWords';

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomer?: Customer | null;
  initialLead?: Lead | null;
  initialSTS?: STSRecord | null;
  proposalToEdit?: ProposalRecord | null;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({
  isOpen,
  onClose,
  initialCustomer,
  initialLead,
  initialSTS,
  proposalToEdit,
}) => {
  const {
    customers,
    leads,
    stsRecords,
    products,
    services,
    companySettings,
    bankSettings,
    bankAccounts,
    customerSpecificPricings,
    createProposal,
    updateProposal,
    generateNextProposalNumber,
  } = useCrmData();
  const { userProfile, hasPermission, isAdmin } = useAuth();

  // Wizard Step: 'edit' -> 'preview' -> 'success'
  const [step, setStep] = useState<'edit' | 'preview' | 'success'>('edit');

  // Source Type Selection
  const [sourceType, setSourceType] = useState<'customer' | 'lead' | 'sts'>('customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedStsId, setSelectedStsId] = useState('');

  // Editable Proposal-Specific Customer Snapshot Data (Section 4)
  const [clientCompanyName, setClientCompanyName] = useState('');
  const [clientContactPerson, setClientContactPerson] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientGst, setClientGst] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [clientPincode, setClientPincode] = useState('');

  // Header Data (Section 3 & 7)
  const [proposalNumber, setProposalNumber] = useState('');
  const [proposalDate, setProposalDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [assignedEmployeeName, setAssignedEmployeeName] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // Line items (Section 5)
  const [items, setItems] = useState<ProposalLineItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [generatedProposal, setGeneratedProposal] = useState<ProposalRecord | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Initialize data based on props
  useEffect(() => {
    if (!isOpen) {
      setStep('edit');
      setError('');
      setGeneratedProposal(null);
      setCopiedLink(false);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const validityDays = companySettings.proposalValidityDays || 30;
    const defaultValidDate = new Date();
    defaultValidDate.setDate(defaultValidDate.getDate() + validityDays);

    setProposalDate(todayStr);
    setValidUntil(defaultValidDate.toISOString().split('T')[0]);
    setTerms(companySettings.termsAndConditions || '');

    // Select default active bank account (Phase 7 Requirement 8 & 9)
    const defaultBank = bankAccounts.find((b) => b.isDefault && b.status === 'active') || bankAccounts.find((b) => b.status === 'active');
    setSelectedBankId(defaultBank?.id || '');

    // Fetch initial atomic proposal number
    generateNextProposalNumber().then((num) => setProposalNumber(num)).catch(() => {});

    if (proposalToEdit) {
      // Reopening draft proposal
      setProposalNumber(proposalToEdit.proposalNumber);
      setSelectedCustomerId(proposalToEdit.customerId || '');
      setSelectedLeadId(proposalToEdit.leadId || '');
      setSelectedStsId(proposalToEdit.stsId || '');
      setClientCompanyName(proposalToEdit.customerSnapshot?.companyName || proposalToEdit.customerName || '');
      setClientContactPerson(proposalToEdit.customerSnapshot?.contactPerson || '');
      setClientMobile(proposalToEdit.customerSnapshot?.mobile || proposalToEdit.customerMobile || '');
      setClientEmail(proposalToEdit.customerSnapshot?.email || proposalToEdit.customerEmail || '');
      setClientGst(proposalToEdit.customerSnapshot?.gstNumber || proposalToEdit.customerGst || '');
      setClientAddress(proposalToEdit.customerSnapshot?.address || proposalToEdit.customerAddress || '');
      setClientCity(proposalToEdit.customerSnapshot?.city || '');
      setClientState(proposalToEdit.customerSnapshot?.state || '');
      setClientPincode(proposalToEdit.customerSnapshot?.pincode || '');
      setProposalDate(proposalToEdit.proposalDate || todayStr);
      setValidUntil(proposalToEdit.validUntil || defaultValidDate.toISOString().split('T')[0]);
      if (proposalToEdit.bankSnapshot?.id || proposalToEdit.bankSnapshot?.bankAccountId) {
        setSelectedBankId(proposalToEdit.bankSnapshot.id || proposalToEdit.bankSnapshot.bankAccountId || '');
      }
      setNotes(proposalToEdit.notes || '');
      setTerms(proposalToEdit.terms || companySettings.termsAndConditions || '');
      setItems(proposalToEdit.items || []);
      setStep('edit');
      return;
    }

    if (initialSTS) {
      setSourceType('sts');
      setSelectedStsId(initialSTS.id);
      setSelectedCustomerId(initialSTS.customerId || '');
      setSelectedLeadId(initialSTS.leadId || '');
      loadFromSTS(initialSTS);
    } else if (initialLead) {
      setSourceType('lead');
      setSelectedLeadId(initialLead.id);
      loadFromLead(initialLead);
    } else if (initialCustomer) {
      setSourceType('customer');
      setSelectedCustomerId(initialCustomer.id);
      loadFromCustomer(initialCustomer);
    } else {
      setSourceType('customer');
      setSelectedCustomerId('');
      clearCustomerFields();
      setItems([]);
    }
  }, [isOpen, initialCustomer, initialLead, initialSTS, proposalToEdit, companySettings]);

  const loadFromCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setClientCompanyName(cust.companyName || '');
    setClientContactPerson(cust.contactPerson || '');
    setClientMobile(cust.mobile || '');
    setClientEmail(cust.email || '');
    setClientGst(cust.gstNumber || '');
    setClientAddress(cust.address || '');
    setClientCity(cust.city || '');
    setClientState(cust.state || '');
    setClientPincode(cust.pincode || '');
    if (cust.assignedEmployeeId) {
      setAssignedEmployeeId(cust.assignedEmployeeId);
      setAssignedEmployeeName(cust.assignedEmployeeName || '');
    }
  };

  const loadFromLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setClientCompanyName(lead.companyName || '');
    setClientContactPerson(lead.contactPerson || '');
    setClientMobile(lead.mobile || '');
    setClientEmail(lead.email || '');
    setClientGst(lead.gstNumber || '');
    setClientAddress(lead.address || '');
    setClientCity(lead.city || '');
    setClientState(lead.state || '');
    setClientPincode(lead.pincode || '');
    if (lead.assignedEmployeeId) {
      setAssignedEmployeeId(lead.assignedEmployeeId);
      setAssignedEmployeeName(lead.assignedEmployeeName || '');
    }

    // Check if lead was already converted to customer
    if (lead.convertedCustomerId) {
      const matchCust = customers.find((c) => c.id === lead.convertedCustomerId || c.customerId === lead.convertedCustomerId);
      if (matchCust) setSelectedCustomerId(matchCust.id);
    }
  };

  const loadFromSTS = (sts: STSRecord) => {
    setSelectedStsId(sts.id);
    setSelectedCustomerId(sts.customerId || '');
    setSelectedLeadId(sts.leadId || '');
    setClientCompanyName(sts.companyName || '');
    setClientContactPerson(sts.contactPerson || '');
    if (sts.assignedEmployeeId) {
      setAssignedEmployeeId(sts.assignedEmployeeId);
      setAssignedEmployeeName(sts.assignedEmployeeName || '');
    }

    // Attempt lookup of customer or lead to load complete address/GST
    if (sts.customerId) {
      const matchCust = customers.find((c) => c.id === sts.customerId || c.customerId === sts.customerId);
      if (matchCust) {
        setClientMobile(matchCust.mobile || '');
        setClientEmail(matchCust.email || '');
        setClientGst(matchCust.gstNumber || '');
        setClientAddress(matchCust.address || '');
        setClientCity(matchCust.city || '');
        setClientState(matchCust.state || '');
        setClientPincode(matchCust.pincode || '');
      }
    } else if (sts.leadId) {
      const matchLead = leads.find((l) => l.id === sts.leadId || l.leadId === sts.leadId);
      if (matchLead) {
        setClientMobile(matchLead.mobile || '');
        setClientEmail(matchLead.email || '');
        setClientGst(matchLead.gstNumber || '');
        setClientAddress(matchLead.address || '');
        setClientCity(matchLead.city || '');
        setClientState(matchLead.state || '');
        setClientPincode(matchLead.pincode || '');
      }
    }

    // Pre-populate requirement notes
    if (sts.requirement) {
      setNotes((prev) => (prev ? `${prev}\nSTS Requirement: ${sts.requirement}` : `STS Requirement (${sts.stsNumber}): ${sts.requirement}`));
    }
  };

  const clearCustomerFields = () => {
    setClientCompanyName('');
    setClientContactPerson('');
    setClientMobile('');
    setClientEmail('');
    setClientGst('');
    setClientAddress('');
    setClientCity('');
    setClientState('');
    setClientPincode('');
  };

  // Add Item to Line Table
  const handleAddItem = (type: 'product' | 'service') => {
    const newItem: ProposalLineItem = {
      id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      name: '',
      description: '',
      unit: type === 'product' ? 'Unit' : 'Service',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxableAmount: 0,
      gstRate: 18,
      gstAmount: 0,
      totalAmount: 0,
      lineTotal: 0,
    };
    setItems([...items, newItem]);
  };

  // Autofill from Product or Service Master Catalog
  const handleSelectCatalogItem = (index: number, itemId: string) => {
    const currentItem = items[index];
    if (currentItem.type === 'product') {
      const prod = products.find((p) => p.id === itemId);
      if (prod) {
        // Check for active customer specific negotiated price
        const csp = customerSpecificPricings.find(
          (c) => c.customerId === selectedCustomerId && c.productId === prod.id && c.status === 'Active'
        );
        const standardRate = prod.sellingPrice ?? prod.price ?? prod.basePrice ?? 0;
        const effectiveRate = csp ? csp.specialPrice : standardRate;
        const pTaxRate = prod.taxRate ?? prod.gstRate ?? 18;

        updateItemCalculations(index, {
          itemId: prod.id,
          productId: prod.id,
          code: prod.productCode,
          name: prod.name || prod.productName || '',
          description: prod.description || '',
          unit: prod.unit || 'Unit',
          unitPrice: effectiveRate,
          originalMasterPrice: standardRate,
          gstRate: pTaxRate,
          originalGstRate: pTaxRate,
          // Phase 16 Historical Price Snapshot
          nameSnapshot: prod.productName || prod.name || '',
          descriptionSnapshot: prod.description || '',
          unitPriceSnapshot: effectiveRate,
          taxRateSnapshot: pTaxRate,
          skuSnapshot: prod.sku || prod.productCode || '',
          hsnSacSnapshot: prod.hsnSac || '',
        });
      }
    } else {
      const srv = services.find((s) => s.id === itemId);
      if (srv) {
        const standardRate = srv.price ?? srv.basePrice ?? 0;
        const sTaxRate = srv.taxRate ?? srv.gstRate ?? 18;

        updateItemCalculations(index, {
          itemId: srv.id,
          serviceId: srv.id,
          code: srv.serviceCode || srv.serviceId,
          name: srv.name || srv.serviceName || '',
          description: srv.description || '',
          unit: srv.duration || 'Service',
          unitPrice: standardRate,
          originalMasterPrice: standardRate,
          gstRate: sTaxRate,
          originalGstRate: sTaxRate,
          // Phase 16 Historical Price Snapshot
          nameSnapshot: srv.serviceName || srv.name || '',
          descriptionSnapshot: srv.description || '',
          unitPriceSnapshot: standardRate,
          taxRateSnapshot: sTaxRate,
          skuSnapshot: srv.serviceCode || srv.serviceId || '',
          hsnSacSnapshot: '',
        });
      }
    }
  };

  // Pricing Engine calculations for each line
  const updateItemCalculations = (index: number, updates: Partial<ProposalLineItem>) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], ...updates };

      const qty = Math.max(0, Number(item.quantity) || 0);
      const rate = Math.max(0, Number(item.unitPrice) || 0);
      const discPct = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));
      const gstPct = Math.max(0, Number(item.gstRate) || 0);

      const baseTotal = qty * rate;
      const discountAmount = (baseTotal * discPct) / 100;
      const taxableAmount = Math.max(0, baseTotal - discountAmount);
      const gstAmount = (taxableAmount * gstPct) / 100;
      const totalAmount = taxableAmount + gstAmount;

      item.quantity = qty;
      item.unitPrice = rate;
      item.discountPercent = discPct;
      item.discountAmount = discountAmount;
      item.taxableAmount = taxableAmount;
      item.gstRate = gstPct;
      item.gstAmount = gstAmount;
      item.totalAmount = totalAmount;
      item.lineTotal = totalAmount;

      // Track price overrides
      if (item.originalMasterPrice !== undefined && item.originalMasterPrice !== rate) {
        item.isPriceOverridden = true;
        item.customPrice = rate;
        item.priceOverrideBy = userProfile?.uid;
        item.priceOverrideAt = new Date().toISOString();
      }

      copy[index] = item;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Grand summary calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const taxableAmount = items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const gstTotal = items.reduce((sum, item) => sum + item.gstAmount, 0);
  const grandTotal = items.reduce((sum, item) => sum + item.totalAmount, 0);

  // Validate form before proceeding
  const validateForm = (): boolean => {
    if (!clientCompanyName.trim()) {
      setError('Please provide Client Company Name.');
      return false;
    }
    if (!clientContactPerson.trim()) {
      setError('Please provide Contact Person name.');
      return false;
    }
    if (!clientMobile.trim()) {
      setError('Please provide Client Mobile Number.');
      return false;
    }
    if (items.length === 0) {
      setError('Please add at least one line item (Product or Service).');
      return false;
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].name.trim()) {
        setError(`Item #${i + 1} is missing a product/service title.`);
        return false;
      }
      if (items[i].quantity <= 0) {
        setError(`Item #${i + 1} quantity must be at least 1.`);
        return false;
      }
    }
    setError('');
    return true;
  };

  // Save as Draft (Section 21)
  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setError('');

    try {
      const proposalPayload = {
        customerId: selectedCustomerId || `cust_snapshot_${Date.now()}`,
        customerName: clientCompanyName.trim(),
        customerEmail: clientEmail.trim() || undefined,
        customerMobile: clientMobile.trim() || undefined,
        customerGst: clientGst.trim() || undefined,
        customerAddress: clientAddress.trim() || undefined,
        leadId: selectedLeadId || undefined,
        stsId: selectedStsId || undefined,
        stsNumber: selectedStsId ? stsRecords.find((s) => s.id === selectedStsId)?.stsNumber : undefined,
        status: 'Draft' as const,
        isImmutable: false,
        customerSnapshot: {
          companyName: clientCompanyName.trim(),
          contactPerson: clientContactPerson.trim(),
          mobile: clientMobile.trim(),
          email: clientEmail.trim() || undefined,
          gstNumber: clientGst.trim() || undefined,
          address: clientAddress.trim() || undefined,
          city: clientCity.trim() || undefined,
          state: clientState.trim() || undefined,
          pincode: clientPincode.trim() || undefined,
        },
        items,
        subtotal,
        discount: totalDiscount,
        taxableAmount,
        gstTotal,
        grandTotal,
        validUntil,
        proposalDate,
        assignedEmployeeId: assignedEmployeeId || userProfile?.uid || undefined,
        assignedEmployeeName: assignedEmployeeName || userProfile?.name || undefined,
        notes: notes.trim() || undefined,
        terms: terms.trim() || companySettings.termsAndConditions || '',
        selectedBankId: selectedBankId || undefined,
      };

      if (proposalToEdit) {
        await updateProposal(proposalToEdit.id, proposalPayload);
        onClose();
      } else {
        const saved = await createProposal(proposalPayload, proposalNumber);
        setGeneratedProposal(saved);
        setStep('success');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save draft proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate Final Proposal (Section 20)
  const handleGenerateFinal = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    setError('');

    try {
      const finalPayload = {
        customerId: selectedCustomerId || `cust_snapshot_${Date.now()}`,
        customerName: clientCompanyName.trim(),
        customerEmail: clientEmail.trim() || undefined,
        customerMobile: clientMobile.trim() || undefined,
        customerGst: clientGst.trim() || undefined,
        customerAddress: clientAddress.trim() || undefined,
        leadId: selectedLeadId || undefined,
        stsId: selectedStsId || undefined,
        stsNumber: selectedStsId ? stsRecords.find((s) => s.id === selectedStsId)?.stsNumber : undefined,
        status: 'Generated' as const,
        isImmutable: true, // Immutable historical document snapshot
        customerSnapshot: {
          companyName: clientCompanyName.trim(),
          contactPerson: clientContactPerson.trim(),
          mobile: clientMobile.trim(),
          email: clientEmail.trim() || undefined,
          gstNumber: clientGst.trim() || undefined,
          address: clientAddress.trim() || undefined,
          city: clientCity.trim() || undefined,
          state: clientState.trim() || undefined,
          pincode: clientPincode.trim() || undefined,
        },
        items,
        subtotal,
        discount: totalDiscount,
        taxableAmount,
        gstTotal,
        grandTotal,
        validUntil,
        proposalDate,
        assignedEmployeeId: assignedEmployeeId || userProfile?.uid || undefined,
        assignedEmployeeName: assignedEmployeeName || userProfile?.name || undefined,
        notes: notes.trim() || undefined,
        terms: terms.trim() || companySettings.termsAndConditions || '',
        selectedBankId: selectedBankId || undefined,
      };

      let finalProp: ProposalRecord;
      if (proposalToEdit) {
        await updateProposal(proposalToEdit.id, finalPayload);
        finalProp = { ...proposalToEdit, ...finalPayload } as ProposalRecord;
      } else {
        finalProp = await createProposal(finalPayload, proposalNumber);
      }

      setGeneratedProposal(finalProp);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to generate final commercial proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!generatedProposal) return;
    const doc = generateProposalPdf(generatedProposal);
    doc.save(`${generatedProposal.proposalNumber}_${generatedProposal.customerName.replace(/\s+/g, '_')}.pdf`);
  };

  const handleCopyLink = () => {
    if (!generatedProposal) return;
    const publicUrl = `${window.location.origin}/proposal/${generatedProposal.proposalNumber}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full my-6 overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 rounded-xl text-indigo-400 border border-slate-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">
                  {step === 'success'
                    ? `Proposal ${generatedProposal?.proposalNumber} Finalized!`
                    : step === 'preview'
                    ? 'Commercial Proposal Review & Verification'
                    : 'Professional Commercial Proposal Builder'}
                </h3>
                <span className="font-mono text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {proposalNumber || 'PROP-2026-XXXX'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                SparkGenTechnology Enterprise CPQ • Dynamic Pricing Engine • Snapshot Architecture
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-800 text-xs px-6 py-2.5 border-b border-rose-200 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 3: SUCCESS VIEW */}
        {step === 'success' && generatedProposal && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-8 h-8 stroke-3" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-bold text-slate-900">
                Commercial Proposal {generatedProposal.proposalNumber} Generated
              </h4>
              <p className="text-xs text-slate-500">
                Prepared for <strong className="text-slate-800">{generatedProposal.customerName}</strong> • Status:{' '}
                <span className="px-2 py-0.5 bg-slate-100 rounded-full text-slate-800 font-semibold font-mono">
                  {generatedProposal.status}
                </span>
              </p>
              <div className="text-3xl font-black text-slate-900 mt-3 font-mono">
                ₹{generatedProposal.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left max-w-lg mx-auto text-xs space-y-1.5 text-slate-600">
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  <strong>Immutable Snapshot Saved:</strong> Company ({generatedProposal.companySnapshot.companyName}),
                  Bank ({generatedProposal.bankSnapshot.bankName})
                </span>
              </p>
              <p>• Items Included: {generatedProposal.items.length} lines (Products & Services)</p>
              <p>• Validity Date: {generatedProposal.validUntil}</p>
              <p>• Executive: {generatedProposal.createdByName}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
              >
                <Download className="w-4 h-4" /> Download Official PDF
              </button>

              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 shadow-2xs"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? 'Link Copied!' : 'Copy Public Viewing Link'}
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-6 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Done / Close Window
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW VIEW (Section 20) */}
        {step === 'preview' && (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-950">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Proposal Pre-Flight Verification:</strong> Review customer snapshot, line items, and bank
                  details before sealing the immutable snapshot.
                </span>
              </div>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">
                {proposalNumber}
              </span>
            </div>

            {/* Document Preview Sheet */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-5">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h4 className="font-black text-lg text-slate-900">{companySettings.companyName}</h4>
                  <p className="text-xs text-slate-500">{companySettings.address}</p>
                  <p className="text-xs text-slate-500 font-mono">GSTIN: {companySettings.gstNumber || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-indigo-700">{proposalNumber}</span>
                  <p className="text-xs text-slate-500">Date: {proposalDate}</p>
                  <p className="text-xs text-slate-500">Valid Until: {validUntil}</p>
                </div>
              </div>

              {/* Customer Snapshot Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                    Client Details (Proposal Snapshot)
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{clientCompanyName}</p>
                  <p className="text-slate-600">Attn: {clientContactPerson}</p>
                  <p className="text-slate-600 font-mono">{clientMobile} | {clientEmail || 'N/A'}</p>
                  <p className="text-slate-600">{clientAddress} {clientCity} {clientState} {clientPincode}</p>
                  <p className="text-slate-600 font-mono">GST: {clientGst || 'Not Registered'}</p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1">
                    Bank Remittance (Active Master Snapshot)
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{bankSettings.accountHolderName}</p>
                  <p className="text-slate-600">Bank: {bankSettings.bankName}</p>
                  <p className="text-slate-600 font-mono">A/C: {bankSettings.accountNumber}</p>
                  <p className="text-slate-600 font-mono">IFSC: {bankSettings.ifscCode}</p>
                  {bankSettings.upiId && <p className="text-slate-600 font-mono">UPI: {bankSettings.upiId}</p>}
                </div>
              </div>

              {/* Items Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item & Description</th>
                      <th className="py-2.5 px-2 text-center">Type</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-2 text-center">Disc</th>
                      <th className="py-2.5 px-2 text-center">GST</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-900 block">{it.name}</span>
                          {it.description && <span className="text-[11px] text-slate-500">{it.description}</span>}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="text-[10px] uppercase font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                            {it.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">{it.quantity} {it.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{it.unitPrice.toLocaleString()}</td>
                        <td className="py-2.5 px-2 text-center">{it.discountPercent}%</td>
                        <td className="py-2.5 px-2 text-center font-mono">{it.gstRate}%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          ₹{it.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculations Box */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs p-4 bg-white rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span className="font-mono">- ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Base:</span>
                    <span className="font-mono">₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total GST:</span>
                    <span className="font-mono">+ ₹{gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-300 flex justify-between font-black text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('edit')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Edit
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFinal}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-xl shadow-md transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {isSubmitting ? 'Generating Final...' : 'Generate Final Proposal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: EDIT FORM */}
        {step === 'edit' && (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Source Selection Buttons */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Create Proposal From (Auto-Fill)
                </span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setSourceType('customer');
                      clearCustomerFields();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      sourceType === 'customer' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceType('lead');
                      clearCustomerFields();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      sourceType === 'lead' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Lead
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceType('sts');
                      clearCustomerFields();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      sourceType === 'sts' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    STS Record
                  </button>
                </div>
              </div>

              {/* Source Dropdown */}
              {sourceType === 'customer' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Select Customer Record
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      const match = customers.find((c) => c.id === e.target.value);
                      if (match) loadFromCustomer(match);
                    }}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="">-- Choose Existing Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.contactPerson} - {c.mobile})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === 'lead' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Select Lead / Prospect
                  </label>
                  <select
                    value={selectedLeadId}
                    onChange={(e) => {
                      const match = leads.find((l) => l.id === e.target.value);
                      if (match) loadFromLead(match);
                    }}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="">-- Choose Existing Lead --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        [{l.leadId}] {l.companyName} ({l.contactPerson} - {l.mobile})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === 'sts' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Select Sales Technical Specification (STS)
                  </label>
                  <select
                    value={selectedStsId}
                    onChange={(e) => {
                      const match = stsRecords.find((s) => s.id === e.target.value);
                      if (match) loadFromSTS(match);
                    }}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="">-- Choose Existing STS --</option>
                    {stsRecords.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.stsNumber}] {s.companyName} - ₹{s.amount.toLocaleString()} ({s.requirement.slice(0, 50)}...)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Proposal Customer Snapshot Fields (Section 4) */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Client Information (Proposal Snapshot Data)
                </span>
                <span className="text-[11px] text-slate-400">
                  Editing here does not change master customer profile
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={clientCompanyName}
                    onChange={(e) => setClientCompanyName(e.target.value)}
                    placeholder="Acme Industries Ltd"
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={clientContactPerson}
                    onChange={(e) => setClientContactPerson(e.target.value)}
                    placeholder="Rajesh Kumar"
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={clientMobile}
                    onChange={(e) => setClientMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full text-xs font-mono border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@acme.com"
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={clientGst}
                    onChange={(e) => setClientGst(e.target.value.toUpperCase())}
                    placeholder="29AAECS1234F1Z8"
                    className="w-full text-xs font-mono uppercase border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">City / State</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={clientCity}
                      onChange={(e) => setClientCity(e.target.value)}
                      placeholder="City"
                      className="w-full text-xs border border-slate-300 rounded-xl px-2.5 py-2"
                    />
                    <input
                      type="text"
                      value={clientState}
                      onChange={(e) => setClientState(e.target.value)}
                      placeholder="State"
                      className="w-full text-xs border border-slate-300 rounded-xl px-2.5 py-2"
                    />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Delivery / Billing Address</label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="Factory Unit #4, Peenya Industrial Area Phase 1"
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Proposal Dates and Validity (Section 7) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Proposal Number</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={proposalNumber}
                  onChange={(e) => setProposalNumber(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Proposal Date</label>
                <input
                  type="date"
                  value={proposalDate}
                  onChange={(e) => setProposalDate(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">Valid Until *</label>
                  {!isAdmin && !hasPermission('editProposal') && (
                    <span className="text-[9px] text-slate-400">Locked by policy</span>
                  )}
                </div>
                <input
                  type="date"
                  required
                  disabled={!isAdmin && !hasPermission('editProposal')}
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full text-xs bg-white disabled:bg-slate-100 disabled:text-slate-500 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>
            </div>

            {/* Line Items Builder (Section 5) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Proposal Line Items ({items.length})
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddItem('product')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddItem('service')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Service
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  No products or commercial services added. Click &quot;Add Product&quot; or &quot;Add Service&quot; above to select from catalog.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          #{idx + 1} [{item.type.toUpperCase()}]
                        </span>

                        <div className="flex items-center gap-2">
                          {/* Autofill Catalog Dropdown */}
                          {item.type === 'product' && products.length > 0 && (
                            <select
                              onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                              className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-slate-50 text-slate-700"
                            >
                              <option value="">-- Load from Active Products --</option>
                              {products.filter((p) => p.active !== false).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name || p.productName} (₹{(p.price ?? p.basePrice ?? 0).toLocaleString()})
                                </option>
                              ))}
                            </select>
                          )}
                          {item.type === 'service' && services.length > 0 && (
                            <select
                              onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                              className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-slate-50 text-slate-700"
                            >
                              <option value="">-- Load from Active Services --</option>
                              {services.filter((s) => s.active !== false).map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name || s.serviceName} (₹{(s.price ?? s.basePrice ?? 0).toLocaleString()})
                                </option>
                              ))}
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            required
                            placeholder="Product / Service Title"
                            value={item.name}
                            onChange={(e) => updateItemCalculations(idx, { name: e.target.value })}
                            className="w-full text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            placeholder="Description / Technical specs / Scope notes"
                            value={item.description || ''}
                            onChange={(e) => updateItemCalculations(idx, { description: e.target.value })}
                            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">Unit</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItemCalculations(idx, { unit: e.target.value })}
                            placeholder="Unit / Set"
                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemCalculations(idx, { quantity: Number(e.target.value) })}
                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">Unit Price (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={item.unitPrice}
                            onChange={(e) => updateItemCalculations(idx, { unitPrice: Number(e.target.value) })}
                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">Discount %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => updateItemCalculations(idx, { discountPercent: Number(e.target.value) })}
                            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">Taxable Base</label>
                          <span className="font-semibold text-slate-800 block py-1.5 text-xs font-mono">
                            ₹{(item.taxableAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">GST %</label>
                          <select
                            value={item.gstRate}
                            onChange={(e) => updateItemCalculations(idx, { gstRate: Number(e.target.value) })}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-xs"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">GST Amount</label>
                          <span className="font-semibold text-slate-700 block py-1.5 text-xs font-mono">
                            ₹{(item.gstAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="text-right">
                          <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">Line Total (INR)</label>
                          <span className="font-bold text-slate-900 block py-1.5 text-xs font-mono">
                            ₹{item.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Terms & Dynamic Total Calculations (Section 6) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internal Notes / Customer Scope Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes visible in CRM tracking..."
                    className="w-full text-xs border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Remittance Bank Account (Attached to Proposal)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Active accounts only</span>
                  </label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  >
                    {bankAccounts
                      .filter((b) => b.status === 'active')
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} — {maskAccountNumber(b.accountNumber)} {b.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    {bankAccounts.filter((b) => b.status === 'active').length === 0 && (
                      <option value="">
                        {bankSettings.bankName} — {maskAccountNumber(bankSettings.accountNumber)}
                      </option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Commercial Terms & Conditions (Included in Proposal)
                  </label>
                  <textarea
                    rows={4}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Dynamic Calculation Summary (INR)
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold font-mono text-slate-800">
                    ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount:</span>
                  <span className="font-semibold font-mono">
                    - ₹{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Base:</span>
                  <span className="font-semibold font-mono text-slate-800">
                    ₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total GST:</span>
                  <span className="font-semibold font-mono text-slate-800">
                    + ₹{gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-300 flex justify-between items-baseline font-bold text-slate-900">
                  <span className="text-sm">Grand Total (INR):</span>
                  <span className="text-xl font-black font-mono text-slate-950">
                    ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-1 text-[11px] text-slate-500 italic">
                  <span className="font-semibold text-slate-700 not-italic">Amount in Words:</span> {numberToWordsINR(grandTotal)}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateForm()) setStep('preview');
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
                >
                  Review & Preview <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
