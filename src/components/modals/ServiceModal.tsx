import React, { useState, useEffect } from 'react';
import { X, Wrench, AlertCircle, Clock } from 'lucide-react';
import { ServiceItem, ServiceBillingType } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceToEdit?: ServiceItem | null;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, serviceToEdit }) => {
  const {
    addService,
    updateService,
    productCategories,
    generateNextServiceCode,
    productSettings,
  } = useCrmData();

  const [name, setName] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('1 Year');
  const [billingType, setBillingType] = useState<ServiceBillingType>('One Time');
  const [price, setPrice] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Archived'>('Active');
  const [terms, setTerms] = useState('');
  const [priceChangeReason, setPriceChangeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (serviceToEdit) {
      setName(serviceToEdit.serviceName || serviceToEdit.name || '');
      setServiceCode(serviceToEdit.serviceCode || serviceToEdit.serviceId || '');
      setCategoryId(serviceToEdit.categoryId || '');
      setDescription(serviceToEdit.description || '');
      setDuration(serviceToEdit.duration || '1 Year');
      setBillingType(serviceToEdit.billingType || 'One Time');
      setPrice(serviceToEdit.price ?? serviceToEdit.basePrice ?? 0);
      setTaxRate(serviceToEdit.taxRate ?? serviceToEdit.gstRate ?? 18);
      setStatus(serviceToEdit.status || (serviceToEdit.active ? 'Active' : 'Inactive'));
      setTerms(serviceToEdit.terms || '');
      setPriceChangeReason('');
    } else {
      generateNextServiceCode().then((code) => setServiceCode(code));
      setName('');
      setCategoryId(productCategories.find((c) => c.type === 'service' || c.type === 'both')?.id || '');
      setDescription('');
      setDuration('1 Year');
      setBillingType('One Time');
      setPrice(0);
      setTaxRate(productSettings.defaultTaxRate || 18);
      setStatus('Active');
      setTerms('');
      setPriceChangeReason('');
    }
    setError('');
  }, [serviceToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Service Name is required.');
      return;
    }
    if (price <= 0) {
      setError('Service Fee / Price must be greater than zero.');
      return;
    }

    const matchedCat = productCategories.find((c) => c.id === categoryId);

    setIsSubmitting(true);
    try {
      const payload: Partial<ServiceItem> = {
        name: name.trim(),
        serviceName: name.trim(),
        serviceCode: serviceCode.trim().toUpperCase(),
        categoryId,
        category: matchedCat?.name || 'Professional Services',
        description: description.trim(),
        duration: duration.trim(),
        billingType,
        price: Number(price),
        basePrice: Number(price),
        taxRate: Number(taxRate),
        gstRate: Number(taxRate),
        terms: terms.trim(),
        status,
        active: status === 'Active',
      };

      if (serviceToEdit) {
        await updateService(serviceToEdit.id, payload, priceChangeReason);
      } else {
        await addService(payload as any);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save service');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base">{serviceToEdit ? 'Edit Service Catalog Item' : 'Register New Billable Service'}</h3>
              <p className="text-[11px] text-slate-400">Professional Services & SLA Contracts (No physical stock)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs px-5 py-2.5 border-b border-rose-100 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Service Code *</label>
              <input
                type="text"
                required
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono uppercase bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="">-- General Services --</option>
                {productCategories
                  .filter((c) => c.status !== 'Archived')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Service Title *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Annual Cloud Infrastructure Architecture & 24x7 Monitoring"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Cadence</label>
              <select
                value={billingType}
                onChange={(e) => setBillingType(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
              >
                <option value="One Time">One Time</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rate / Fee (₹) *</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="0.00"
                className="w-full text-sm font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST Tax Rate %</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
              >
                <option value="0">0% (Nil / Exempt)</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST (Standard)</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Duration / SLA Terms</label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 1 Year, 40 Hours Milestone, 24x7 Production SLA"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Scope of Work & Deliverables</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deliverables, exclusions, milestones, support hours, ticket turnaround SLA..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          {serviceToEdit && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Reason for Price / Fee Adjustment (Logged to Audit History)
              </label>
              <input
                type="text"
                value={priceChangeReason}
                onChange={(e) => setPriceChangeReason(e.target.value)}
                placeholder="e.g. Annual contract escalation or expanded scope of work"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              {isSubmitting ? 'Saving to Catalog...' : serviceToEdit ? 'Save Service Changes' : 'Register Service in Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
