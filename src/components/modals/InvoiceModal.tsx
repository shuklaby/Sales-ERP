import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';
import { Customer, InvoiceItem, InvoiceRecord, ProposalRecord } from '../../types/crm';
import { roundTo2, formatCurrency } from '../../utils/financeUtils';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceToEdit?: InvoiceRecord | null;
  fromProposal?: ProposalRecord | null;
  targetCustomer?: Customer | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceToEdit,
  fromProposal,
  targetCustomer,
}) => {
  const {
    customers,
    products,
    services,
    bankAccounts,
    bankSettings,
    companySettings,
    financeSettings,
    customerSpecificPricings,
    createInvoice,
    updateDraftInvoice,
    createInvoiceFromProposal,
  } = useCrmData();

  const { userProfile } = useAuth();

  const [customerId, setCustomerId] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isFinalizeImmediately, setIsFinalizeImmediately] = useState<boolean>(true);

  // Line items state
  const [items, setItems] = useState<
    Array<{
      itemId: string;
      productId?: string;
      serviceId?: string;
      name: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      taxRate: number;
    }>
  >([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form on open/change
  useEffect(() => {
    if (!isOpen) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const defaultDue = new Date(Date.now() + (financeSettings.defaultDueDays || 30) * 86400000)
      .toISOString()
      .split('T')[0];

    const defaultBank = bankAccounts.find((b) => b.isDefault && b.status === 'active') || bankAccounts[0];
    setSelectedBankId(defaultBank?.id || '');
    setPaymentTerms(financeSettings.defaultPaymentTerms || 'Net 30');
    setInvoiceDate(todayStr);
    setDueDate(defaultDue);
    setError(null);

    if (invoiceToEdit) {
      setCustomerId(invoiceToEdit.customerId);
      setInvoiceDate(invoiceToEdit.invoiceDate);
      setDueDate(invoiceToEdit.dueDate);
      setPaymentTerms(invoiceToEdit.paymentTerms || 'Net 30');
      setNotes(invoiceToEdit.notes || '');
      setItems(
        (invoiceToEdit.items || []).map((it) => ({
          itemId: it.itemId,
          productId: it.productId,
          serviceId: it.serviceId,
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          taxRate: it.taxRate,
        }))
      );
      if (invoiceToEdit.bankSnapshot?.id) {
        setSelectedBankId(invoiceToEdit.bankSnapshot.id);
      }
    } else if (fromProposal) {
      setCustomerId(fromProposal.customerId);
      setNotes(`Generated for Proposal ${fromProposal.proposalNumber}`);
      setItems(
        (fromProposal.items || []).map((it) => ({
          itemId: it.itemId || it.id || `ITM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: it.productId,
          serviceId: it.serviceId,
          name: it.name,
          description: it.description || '',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discountPercent || 0,
          taxRate: it.gstRate !== undefined ? it.gstRate : 18,
        }))
      );
    } else if (targetCustomer) {
      setCustomerId(targetCustomer.id);
      setItems([
        {
          itemId: `ITM-${Date.now()}-1`,
          name: 'Professional Engineering & Industrial Services',
          description: 'Scope as agreed under technical specification',
          quantity: 1,
          unitPrice: 25000,
          discount: 0,
          taxRate: financeSettings.defaultTaxRate || 18,
        },
      ]);
    } else {
      setCustomerId(customers[0]?.id || '');
      setItems([
        {
          itemId: `ITM-${Date.now()}-1`,
          name: 'Enterprise Cloud & Industrial Automation Architecture',
          description: 'Deployment sign-off & technical architecture milestone',
          quantity: 1,
          unitPrice: 50000,
          discount: 0,
          taxRate: financeSettings.defaultTaxRate || 18,
        },
      ]);
    }
  }, [isOpen, invoiceToEdit, fromProposal, targetCustomer, customers, financeSettings, bankAccounts]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customers, customerId]);

  // Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxable = 0;
    let totalTax = 0;

    const evaluatedItems = items.map((it) => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const p = Math.max(0, Number(it.unitPrice) || 0);
      const gross = roundTo2(q * p);
      const dPercent = Math.min(100, Math.max(0, Number(it.discount) || 0));
      const dAmount = roundTo2((gross * dPercent) / 100);
      const taxBase = roundTo2(gross - dAmount);
      const tRate = Math.max(0, Number(it.taxRate) || 0);
      const tAmount = roundTo2((taxBase * tRate) / 100);
      const lineTotal = roundTo2(taxBase + tAmount);

      subtotal += gross;
      totalDiscount += dAmount;
      taxable += taxBase;
      totalTax += tAmount;

      return {
        ...it,
        quantity: q,
        unitPrice: p,
        discount: dPercent,
        discountAmount: dAmount,
        taxAmount: tAmount,
        lineTotal,
      };
    });

    const isInterState = financeSettings.defaultTaxType === 'inter_state';
    const cgst = isInterState ? 0 : roundTo2(totalTax / 2);
    const sgst = isInterState ? 0 : roundTo2(totalTax / 2);
    const igst = isInterState ? totalTax : 0;
    const grandTotal = roundTo2(taxable + totalTax);

    return {
      evaluatedItems,
      subtotal: roundTo2(subtotal),
      totalDiscount: roundTo2(totalDiscount),
      taxable: roundTo2(taxable),
      totalTax: roundTo2(totalTax),
      cgst,
      sgst,
      igst,
      grandTotal,
    };
  }, [items, financeSettings]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        itemId: `ITM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxRate: financeSettings.defaultTaxRate || 18,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSelectCatalogItem = (index: number, type: 'product' | 'service', id: string) => {
    if (type === 'product') {
      const prod = products.find((p) => p.id === id);
      if (prod) {
        const csp = customerSpecificPricings.find(
          (c) => c.customerId === customerId && c.productId === prod.id && c.status === 'Active'
        );
        const standardRate = prod.sellingPrice ?? prod.price ?? prod.basePrice ?? 0;
        const effectiveRate = csp ? csp.specialPrice : standardRate;

        setItems((prev) => {
          const copy = [...prev];
          copy[index] = {
            ...copy[index],
            productId: prod.id,
            serviceId: undefined,
            name: prod.productName || prod.name,
            description: prod.description || `Code: ${prod.productCode || 'N/A'}`,
            unitPrice: effectiveRate,
            taxRate: prod.taxRate ?? prod.gstRate ?? 18,
          };
          return copy;
        });
      }
    } else {
      const srv = services.find((s) => s.id === id);
      if (srv) {
        setItems((prev) => {
          const copy = [...prev];
          copy[index] = {
            ...copy[index],
            serviceId: srv.id,
            productId: undefined,
            name: srv.serviceName || srv.name,
            description: srv.description || srv.serviceCode || '',
            unitPrice: srv.price ?? srv.basePrice ?? 0,
            taxRate: srv.taxRate ?? srv.gstRate ?? 18,
          };
          return copy;
        });
      }
    }
  };

  const handleSave = async (asDraft: boolean) => {
    if (!customerId) {
      setError('Please select a customer for this invoice.');
      return;
    }
    if (items.length === 0) {
      setError('Invoice must have at least one line item.');
      return;
    }
    const emptyName = items.some((it) => !it.name.trim());
    if (emptyName) {
      setError('Please provide a name/description for each line item.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const selectedBank =
        bankAccounts.find((b) => b.id === selectedBankId) ||
        bankAccounts.find((b) => b.isDefault) ||
        bankSettings;

      if (invoiceToEdit) {
        // Edit draft
        await updateDraftInvoice(invoiceToEdit.id, {
          customerId,
          invoiceDate,
          dueDate,
          paymentTerms,
          notes,
          items: calculations.evaluatedItems as InvoiceItem[],
          subtotal: calculations.subtotal,
          discount: calculations.totalDiscount,
          taxableAmount: calculations.taxable,
          tax: calculations.totalTax,
          cgst: calculations.cgst,
          sgst: calculations.sgst,
          igst: calculations.igst,
          taxBreakdown: {
            taxableAmount: calculations.taxable,
            cgst: calculations.cgst,
            sgst: calculations.sgst,
            igst: calculations.igst,
            totalTax: calculations.totalTax,
          },
          grandTotal: calculations.grandTotal,
          outstandingAmount: calculations.grandTotal,
          bankSnapshot: selectedBank as any,
          status: asDraft ? 'Draft' : 'Issued',
          finalizedAt: asDraft ? undefined : new Date().toISOString(),
        });
      } else if (fromProposal && asDraft === false) {
        // Direct conversion from proposal
        await createInvoiceFromProposal(fromProposal.id);
      } else {
        await createInvoice({
          customerId,
          customerSnapshot: selectedCustomer as Customer,
          proposalId: fromProposal?.id,
          proposalSnapshot: fromProposal || undefined,
          invoiceDate,
          dueDate,
          paymentTerms,
          notes,
          items: calculations.evaluatedItems as InvoiceItem[],
          subtotal: calculations.subtotal,
          discount: calculations.totalDiscount,
          taxableAmount: calculations.taxable,
          tax: calculations.totalTax,
          cgst: calculations.cgst,
          sgst: calculations.sgst,
          igst: calculations.igst,
          taxBreakdown: {
            taxableAmount: calculations.taxable,
            cgst: calculations.cgst,
            sgst: calculations.sgst,
            igst: calculations.igst,
            totalTax: calculations.totalTax,
          },
          grandTotal: calculations.grandTotal,
          currency: 'INR',
          bankSnapshot: selectedBank as any,
          companySnapshot: companySettings,
          status: asDraft ? 'Draft' : 'Issued',
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Invoice save failed:', err);
      setError(err.message || 'Failed to save invoice.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {invoiceToEdit ? `Edit Draft ${invoiceToEdit.invoiceNumber}` : 'Create Commercial Tax Invoice'}
              </h2>
              <p className="text-xs text-slate-400">
                Official billing statement with immutable snapshots & GST breakdown
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {/* Customer & Dates Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" /> Billed Customer *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={!!invoiceToEdit || !!fromProposal}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
              >
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} ({c.customerId})
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-2">
                  <span>Contact: {selectedCustomer.contactPerson || 'N/A'}</span>
                  <span>•</span>
                  <span>GSTIN: {selectedCustomer.gstNumber || 'Unregistered'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Commercial Items & Deliverables</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.itemId || index}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    {/* Catalog item preset picker */}
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Catalog Shortcut (Optional)
                      </label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const [type, id] = val.split(':');
                          handleSelectCatalogItem(index, type as 'product' | 'service', id);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Choose catalog preset...</option>
                        <optgroup label="Products">
                          {products.map((p) => (
                            <option key={p.id} value={`product:${p.id}`}>
                              {p.name} (₹{p.price?.toLocaleString()})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Services">
                          {services.map((s) => (
                            <option key={s.id} value={`service:${s.id}`}>
                              {s.name} (₹{s.price?.toLocaleString()})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="md:col-span-8 flex justify-end">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Item Name & Title *
                      </label>
                      <input
                        type="text"
                        placeholder="Deliverable or product title"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Unit Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Disc %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) => handleItemChange(index, 'discount', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        GST Tax %
                      </label>
                      <select
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(index, 'taxRate', Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="0">0% (Exempt)</option>
                        <option value="5">5% GST</option>
                        <option value="12">12% GST</option>
                        <option value="18">18% GST (Standard)</option>
                        <option value="28">28% GST</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Optional specifications, SLA details, or milestones..."
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms, Remittance Bank, Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Credited Bank Account (Immutable Snapshot)
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} - {b.accountNumber} ({b.branch}) {b.isDefault ? '• Default' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Immediate / Due on Receipt">Immediate / Due on Receipt</option>
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="50% Advance, 50% on Delivery">50% Advance, 50% on Delivery</option>
                  <option value="Custom Milestone Agreement">Custom Milestone Agreement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Internal / Customer Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes or milestone settlement instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Calculations Breakdown Card */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Commercial Summary
              </h4>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Subtotal:</span>
                  <span className="text-slate-200">{formatCurrency(calculations.subtotal)}</span>
                </div>
                {calculations.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount:</span>
                    <span>-{formatCurrency(calculations.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Taxable Value:</span>
                  <span className="text-slate-200">{formatCurrency(calculations.taxable)}</span>
                </div>
                {calculations.cgst > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>CGST:</span>
                    <span className="text-slate-200">{formatCurrency(calculations.cgst)}</span>
                  </div>
                )}
                {calculations.sgst > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>SGST:</span>
                    <span className="text-slate-200">{formatCurrency(calculations.sgst)}</span>
                  </div>
                )}
                {calculations.igst > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>IGST:</span>
                    <span className="text-slate-200">{formatCurrency(calculations.igst)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                  <span>Grand Total:</span>
                  <span className="text-blue-400">{formatCurrency(calculations.grandTotal)}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                <span>Calculated with precise 2-decimal monetary rounding. Historical values remain immutable after issuance.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Processing...' : 'Finalize & Issue Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
