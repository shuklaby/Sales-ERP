import React, { useState } from 'react';
import { X, History, TrendingUp, TrendingDown, Clock, User, AlertCircle, Plus, DollarSign } from 'lucide-react';
import { ProductItem, ServiceItem } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProductItem | ServiceItem | null;
  type: 'product' | 'service';
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  isOpen,
  onClose,
  item,
  type,
}) => {
  const { productPriceHistories, servicePriceHistories, updateProduct, updateService } = useCrmData();
  const { isAdmin } = useAuth();

  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(0);
  const [newPurchasePrice, setNewPurchasePrice] = useState<number | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !item) return null;

  const isProduct = type === 'product';
  const prod = isProduct ? (item as ProductItem) : null;
  const srv = !isProduct ? (item as ServiceItem) : null;

  const currentSellingPrice = isProduct
    ? (prod?.sellingPrice ?? prod?.price ?? prod?.basePrice ?? 0)
    : (srv?.price ?? srv?.basePrice ?? 0);

  const currentPurchasePrice = prod?.purchasePrice;

  // Filter price history for this item
  const histories = (isProduct ? productPriceHistories : servicePriceHistories).filter(
    (h) => h.itemId === item.id || h.itemCode === (prod?.productCode || srv?.serviceCode || srv?.serviceId)
  );

  const handleStartEdit = () => {
    setNewSellingPrice(currentSellingPrice);
    setNewPurchasePrice(currentPurchasePrice);
    setReason('');
    setError('');
    setIsEditingPrice(true);
  };

  const handleSavePriceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSellingPrice <= 0) {
      setError('Selling price must be greater than zero.');
      return;
    }
    if (!reason.trim()) {
      setError('A mandatory reason is required for recording price changes.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isProduct) {
        await updateProduct(
          item.id,
          {
            sellingPrice: newSellingPrice,
            price: newSellingPrice,
            basePrice: newSellingPrice,
            purchasePrice: newPurchasePrice,
          },
          reason.trim()
        );
      } else {
        await updateService(
          item.id,
          {
            price: newSellingPrice,
            basePrice: newSellingPrice,
          },
          reason.trim()
        );
      }
      setIsEditingPrice(false);
      setReason('');
    } catch (err: any) {
      setError(err.message || 'Failed to update price');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                Price History — {prod?.productName || prod?.name || srv?.serviceName || srv?.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {prod?.productCode || srv?.serviceCode || srv?.serviceId} • {isProduct ? 'Product' : 'Service'} Catalog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Price Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Current Selling Price
              </span>
              <span className="text-xl font-black text-slate-900">
                ₹{currentSellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {isProduct && currentPurchasePrice !== undefined && (
              <div className="border-l border-slate-200 pl-6">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Current Purchase Price
                </span>
                <span className="text-xl font-black text-slate-700">
                  ₹{currentPurchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {isAdmin && !isEditingPrice && (
            <button
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" /> Record Price Change
            </button>
          )}
        </div>

        {/* Edit Price Form if active */}
        {isEditingPrice && (
          <form onSubmit={handleSavePriceChange} className="p-4 bg-indigo-50/50 border-b border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-indigo-600" /> Update Master Price
              </span>
              <button
                type="button"
                onClick={() => setIsEditingPrice(false)}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Cancel
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 text-rose-700 text-xs p-2.5 rounded-lg border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  New Selling Price (INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newSellingPrice}
                  onChange={(e) => setNewSellingPrice(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {isProduct && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    New Purchase Price (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPurchasePrice ?? ''}
                    onChange={(e) => setNewPurchasePrice(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Mandatory Reason for Price Change *
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Vendor price revision, annual inflation adjustment, market correction..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingPrice(false)}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Apply & Record in Audit Log'}
              </button>
            </div>
          </form>
        )}

        {/* History Table */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Audit Trail of Price Changes ({histories.length})
            </h4>
            <span className="text-[11px] text-slate-400">
              Historical proposals & finalized invoices retain their locked snapshots
            </span>
          </div>

          {histories.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No historical price changes recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                The current price is the initial catalog base price. Future updates will be tracked chronologically.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Old Price</th>
                    <th className="py-2.5 px-3">New Price</th>
                    <th className="py-2.5 px-3">Change</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Changed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {histories.map((h) => {
                    const delta = (h.newPrice || 0) - (h.oldPrice || 0);
                    const pct = h.oldPrice ? ((delta / h.oldPrice) * 100).toFixed(1) : '0';
                    const isIncrease = delta > 0;

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(h.changedAt).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          ₹{h.oldPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          ₹{h.newPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                              isIncrease ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {isIncrease ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {isIncrease ? `+₹${delta.toLocaleString()} (+${pct}%)` : `-₹${Math.abs(delta).toLocaleString()} (${pct}%)`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-xs text-slate-700">
                          <div className="font-medium text-slate-800 line-clamp-2">{h.reason}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {h.changedBy || 'Administrator'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
