import React, { useState, useEffect } from 'react';
import { X, Sliders, AlertCircle, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react';
import { ProductItem, StockMovementType } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: string;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  initialProductId,
}) => {
  const { products, adjustStock, productSettings } = useCrmData();

  const [selectedProductId, setSelectedProductId] = useState(initialProductId || '');
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');
  const [quantity, setQuantity] = useState<number>(1);
  const [movementType, setMovementType] = useState<StockMovementType>('Adjustment');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedProductId(initialProductId || (products.find((p) => p.stockEnabled !== false)?.id || ''));
      setDirection('increase');
      setQuantity(1);
      setMovementType('Adjustment');
      setReason('');
      setError('');
    }
  }, [isOpen, initialProductId, products]);

  if (!isOpen) return null;

  const activeProduct = products.find((p) => p.id === selectedProductId);
  const currentStock = Number(activeProduct?.currentStock ?? 0);
  const delta = direction === 'increase' ? quantity : -quantity;
  const expectedStock = currentStock + delta;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Please select a product.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (!reason.trim()) {
      setError('A valid reason is required for stock adjustments.');
      return;
    }
    if (expectedStock < 0 && !productSettings.allowNegativeStock) {
      setError(`Cannot decrease stock below zero. Current stock is ${currentStock} units.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await adjustStock({
        productId: selectedProductId,
        quantityDelta: delta,
        type: movementType,
        reason: reason.trim(),
        referenceType: 'Stock Adjustment',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record stock adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base">Record Stock Adjustment</h3>
              <p className="text-[11px] text-slate-400">Atomic inventory update with complete movement audit trail</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Product *</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
            >
              {products
                .filter((p) => p.stockEnabled !== false && p.status !== 'Archived')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.productCode} — {p.productName || p.name} (Stock: {p.currentStock ?? 0} {p.unit || 'Units'})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Action</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setDirection('increase');
                    if (movementType === 'Damaged') setMovementType('Adjustment');
                  }}
                  className={`flex items-center justify-center gap-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    direction === 'increase'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> + In
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('decrease')}
                  className={`flex items-center justify-center gap-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    direction === 'decrease'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" /> - Out
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity || ''}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full text-xs font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Movement Classification</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as any)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="Adjustment">Stock Adjustment (Audit Discrepancy)</option>
              {direction === 'decrease' && <option value="Damaged">Damaged / Written-Off Goods</option>}
              <option value="Return">Customer / Vendor Return</option>
              <option value="Transfer">Warehouse Internal Transfer</option>
            </select>
          </div>

          {/* Stock Calculation Preview */}
          {activeProduct && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Current Stock</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{currentStock} {activeProduct.unit}</span>
              </div>
              <div className="text-slate-400 font-bold text-lg">→</div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Resulting Stock</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    expectedStock < (activeProduct.minimumQuantity || 10)
                      ? 'text-amber-600'
                      : expectedStock < 0
                      ? 'text-rose-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {expectedStock} {activeProduct.unit}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Adjustment *</label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Physical inventory cycle count discrepancy, water damage in bay B..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

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
              {isSubmitting ? 'Adjusting Stock...' : 'Confirm Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
