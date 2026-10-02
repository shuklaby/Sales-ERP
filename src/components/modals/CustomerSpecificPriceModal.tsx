import React, { useState } from 'react';
import { X, Tag, Plus, Trash2, Calendar, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import { ProductItem, CustomerSpecificPrice } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';

interface CustomerSpecificPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
}

export const CustomerSpecificPriceModal: React.FC<CustomerSpecificPriceModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { customers, customerSpecificPricings, saveCustomerSpecificPrice, deleteCustomerSpecificPrice } = useCrmData();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [specialPrice, setSpecialPrice] = useState<number>(0);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !product) return null;

  const standardPrice = product.sellingPrice ?? product.price ?? product.basePrice ?? 0;

  // Filter pricings for this product
  const productPricings = customerSpecificPricings.filter((csp) => csp.productId === product.id);

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a client organization.');
      return;
    }
    if (specialPrice <= 0) {
      setError('Special price must be greater than zero.');
      return;
    }

    const matchedCustomer = customers.find((c) => c.id === selectedCustomerId);

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await saveCustomerSpecificPrice({
        pricingId: `CSP-${Date.now()}`,
        customerId: selectedCustomerId,
        customerName: matchedCustomer?.companyName || 'Valued Customer',
        productId: product.id,
        productCode: product.productCode,
        productName: product.productName || product.name,
        specialPrice: Number(specialPrice),
        validFrom,
        validUntil,
        status: 'Active',
      });

      setSuccess(`Special price of ₹${specialPrice.toLocaleString('en-IN')} configured for ${matchedCustomer?.companyName}`);
      setSelectedCustomerId('');
      setSpecialPrice(0);
    } catch (err: any) {
      setError(err.message || 'Failed to save customer specific price');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, custName?: string) => {
    if (confirm(`Remove custom pricing rule for ${custName || 'this customer'}?`)) {
      await deleteCustomerSpecificPrice(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Customer-Specific Contract Pricing</h3>
              <p className="text-xs text-slate-400">
                {product.name} ({product.productCode}) • Standard Price: ₹{standardPrice.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Add Rule Form */}
          <form onSubmit={handleAddPrice} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" /> Configure Special Rate for Customer
            </h4>

            {error && (
              <div className="bg-rose-50 text-rose-700 text-xs p-2.5 rounded-lg border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 text-emerald-700 text-xs p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Customer Organization *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    if (specialPrice === 0) setSpecialPrice(standardPrice);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.customerId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Negotiated Special Price (INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={specialPrice || ''}
                  onChange={(e) => setSpecialPrice(Number(e.target.value))}
                  placeholder={`Standard: ₹${standardPrice}`}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Valid From *
                </label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Valid Until *
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Rule...' : 'Save Special Pricing Rule'}
              </button>
            </div>
          </form>

          {/* Active Pricing Rules List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Configured Custom Rates ({productPricings.length})
            </h4>

            {productPricings.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                No customer-specific contract prices defined yet. The standard catalog rate (₹{standardPrice.toLocaleString('en-IN')}) applies to all clients.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Special Price</th>
                      <th className="py-2.5 px-3">Discount vs Std</th>
                      <th className="py-2.5 px-3">Validity Window</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productPricings.map((p) => {
                      const discountDiff = standardPrice - p.specialPrice;
                      const discountPct = standardPrice > 0 ? ((discountDiff / standardPrice) * 100).toFixed(1) : '0';

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {p.customerName || p.customerId}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-indigo-700">
                            ₹{p.specialPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              -₹{discountDiff.toLocaleString()} ({discountPct}%)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {p.validFrom} to {p.validUntil}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDelete(p.id, p.customerName)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
