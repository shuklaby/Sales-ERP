import React, { useState, useEffect } from 'react';
import { X, Package, Upload, AlertCircle, Percent, TrendingUp, Image as ImageIcon } from 'lucide-react';
import { ProductItem } from '../../types/crm';
import { useCrmData } from '../../context/CrmDataContext';
import { useAuth } from '../../context/AuthContext';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: ProductItem | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, productToEdit }) => {
  const {
    addProduct,
    updateProduct,
    adjustStock,
    productCategories,
    generateNextProductCode,
    productSettings,
  } = useCrmData();
  const { isAdmin, hasPermission } = useAuth();

  const canViewCost = isAdmin || hasPermission('viewPurchaseCost');

  const [name, setName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [unit, setUnit] = useState('Unit');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number | undefined>(undefined);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [sku, setSku] = useState('');
  const [hsnSac, setHsnSac] = useState('');
  const [minimumQuantity, setMinimumQuantity] = useState<number>(10);
  const [stockEnabled, setStockEnabled] = useState(true);
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Archived'>('Active');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [priceChangeReason, setPriceChangeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (productToEdit) {
      setName(productToEdit.productName || productToEdit.name || '');
      setProductCode(productToEdit.productCode || '');
      setCategoryId(productToEdit.categoryId || '');
      setDescription(productToEdit.description || '');
      setShortDescription(productToEdit.shortDescription || '');
      setUnit(productToEdit.unit || 'Unit');
      setSellingPrice(productToEdit.sellingPrice ?? productToEdit.price ?? productToEdit.basePrice ?? 0);
      setPurchasePrice(productToEdit.purchasePrice);
      setTaxRate(productToEdit.taxRate ?? productToEdit.gstRate ?? 18);
      setSku(productToEdit.sku || '');
      setHsnSac(productToEdit.hsnSac || '');
      setMinimumQuantity(productToEdit.minimumQuantity ?? productSettings.lowStockThreshold ?? 10);
      setStockEnabled(productToEdit.stockEnabled !== false);
      setStatus(productToEdit.status || (productToEdit.active ? 'Active' : 'Inactive'));
      setImageUrl(productToEdit.imageUrl || '');
      setOpeningStock(0);
      setPriceChangeReason('');
    } else {
      generateNextProductCode().then((code) => setProductCode(code));
      setName('');
      setCategoryId(productCategories[0]?.id || '');
      setDescription('');
      setShortDescription('');
      setUnit('Unit');
      setSellingPrice(0);
      setPurchasePrice(undefined);
      setTaxRate(productSettings.defaultTaxRate || 18);
      setSku('');
      setHsnSac('');
      setMinimumQuantity(productSettings.lowStockThreshold || 10);
      setStockEnabled(productSettings.stockTracking !== false);
      setStatus('Active');
      setImageUrl('');
      setOpeningStock(0);
      setPriceChangeReason('');
    }
    setError('');
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle image upload (JPG, PNG, WEBP)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, or WEBP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image file size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const grossMargin = sellingPrice && purchasePrice !== undefined ? sellingPrice - purchasePrice : null;
  const grossMarginPct = grossMargin !== null && sellingPrice > 0 ? (grossMargin / sellingPrice) * 100 : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product Name is required.');
      return;
    }
    if (sellingPrice <= 0) {
      setError('Selling Price must be greater than zero.');
      return;
    }
    if (taxRate < 0) {
      setError('Tax Rate cannot be negative.');
      return;
    }

    const matchedCat = productCategories.find((c) => c.id === categoryId);

    setIsSubmitting(true);
    try {
      const payload: Partial<ProductItem> = {
        name: name.trim(),
        productName: name.trim(),
        productCode: productCode.trim().toUpperCase(),
        categoryId,
        category: matchedCat?.name || 'General Catalog',
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        unit: unit.trim(),
        sellingPrice: Number(sellingPrice),
        price: Number(sellingPrice),
        basePrice: Number(sellingPrice),
        purchasePrice: purchasePrice !== undefined && purchasePrice !== null ? Number(purchasePrice) : undefined,
        taxRate: Number(taxRate),
        gstRate: Number(taxRate),
        sku: sku.trim().toUpperCase(),
        hsnSac: hsnSac.trim(),
        minimumQuantity: Number(minimumQuantity),
        stockEnabled,
        status,
        active: status === 'Active',
        imageUrl: imageUrl || undefined,
      };

      if (productToEdit) {
        await updateProduct(productToEdit.id, payload, priceChangeReason);
      } else {
        const newId = await addProduct(payload as any);
        // If opening stock was specified and stockEnabled is true
        if (stockEnabled && openingStock > 0) {
          await adjustStock({
            productId: newId,
            quantityDelta: Number(openingStock),
            type: 'Opening Stock',
            reason: 'Opening stock recorded upon product registration',
            referenceType: 'Opening Stock',
          });
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base">{productToEdit ? 'Edit Product Catalog Item' : 'Register New Product'}</h3>
              <p className="text-[11px] text-slate-400">Phase 16 Product, Pricing, Inventory & Stock Master</p>
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
          {/* Top details: Code & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Code *</label>
              <input
                type="text"
                required
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
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
                <option value="">-- General Category --</option>
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
                <option value="Active">Active (Available)</option>
                <option value="Inactive">Inactive (Disabled)</option>
                <option value="Archived">Archived (Catalog Hidden)</option>
              </select>
            </div>
          </div>

          {/* Name & Short Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cisco Catalyst 9200L 48-Port PoE+ Gigabit Switch"
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. C9200L-48P-4G"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">HSN / SAC Code</label>
              <input
                type="text"
                value={hsnSac}
                onChange={(e) => setHsnSac(e.target.value)}
                placeholder="e.g. 85176290"
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="Unit">Unit</option>
                <option value="Pcs">Pcs (Pieces)</option>
                <option value="Box">Box</option>
                <option value="Set">Set</option>
                <option value="Meter">Meter</option>
                <option value="Kg">Kg</option>
                <option value="Pack">Pack</option>
              </select>
            </div>
          </div>

          {/* Pricing & Tax Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Pricing, Tax & Commercial Terms</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Selling Price (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full text-sm font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 bg-white"
                />
              </div>

              {canViewCost && (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={purchasePrice !== undefined ? purchasePrice : ''}
                    onChange={(e) => setPurchasePrice(e.target.value === '' ? undefined : Number(e.target.value))}
                    placeholder="Optional cost price"
                    className="w-full text-sm font-medium text-slate-700 border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">GST Tax Rate %</label>
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

            {/* Profitability Estimate (Section 34) */}
            {canViewCost && grossMargin !== null && (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-1.5 font-medium">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Gross Margin Estimate per Unit:</span>
                  <span className="font-bold">₹{grossMargin.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  Margin: {grossMarginPct?.toFixed(1)}%
                </div>
              </div>
            )}

            {productToEdit && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Reason for Price / Tax Modification (Logged to Audit History)
                </label>
                <input
                  type="text"
                  value={priceChangeReason}
                  onChange={(e) => setPriceChangeReason(e.target.value)}
                  placeholder="e.g. Annual vendor price revision or statutory GST slab change"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
                />
              </div>
            )}
          </div>

          {/* Inventory & Stock Tracking (Section 9 & 10) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Inventory & Stock Tracking</h4>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={stockEnabled}
                  onChange={(e) => setStockEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                Track Physical Stock for this Item
              </label>
            </div>

            {stockEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Minimum Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minimumQuantity}
                    onChange={(e) => setMinimumQuantity(Number(e.target.value))}
                    placeholder="10"
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  />
                  <span className="text-[10px] text-slate-500">Triggers Low Stock notification when inventory reaches this level.</span>
                </div>

                {!productToEdit ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Opening Stock (Initial Quantity)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={openingStock}
                      onChange={(e) => setOpeningStock(Number(e.target.value))}
                      placeholder="0"
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white font-bold"
                    />
                    <span className="text-[10px] text-slate-500">Initial stock will automatically generate an OPENING_STOCK movement.</span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Current Stock Level</label>
                    <div className="text-xs font-mono font-bold text-slate-800 px-3 py-2 bg-white border border-slate-300 rounded-lg">
                      {productToEdit.currentStock ?? 0} {productToEdit.unit || 'Units'} (Available: {productToEdit.availableStock ?? productToEdit.currentStock ?? 0})
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description & Technical Specifications */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Description / Specifications</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed commercial description, dimensions, technical data sheet references..."
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          {/* Image Upload (Section 3) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Image (JPG, PNG, WEBP)</label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                  <img src={imageUrl} alt="Product Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"
                    title="Remove Image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}

              <div className="flex-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageFileChange}
                  className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">Image will be associated with product catalog and commercial proposal cards.</p>
              </div>
            </div>
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
              {isSubmitting ? 'Saving to Catalog...' : productToEdit ? 'Save Product Changes' : 'Register Product in Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
