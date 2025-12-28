import React, { useState, useMemo } from 'react';
import {
  Package, Truck, FileText, ChevronRight, Plus, Search, Calendar, DollarSign,
  CheckCircle, Clock, Building2, Phone, Receipt, Eye, Edit, X, Calculator,
  Trash2, Info, Gavel, TrendingDown, ChevronDown, ChevronUp, Sun,
} from 'lucide-react';
import type { Vendor, ProductMaster, VendorOffering, Order, Invoice } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

type OrderStatus = 'draft' | 'ordered' | 'confirmed' | 'partial' | 'complete' | 'cancelled';
type PaymentStatus = 'unpaid' | 'prepaid' | 'partial' | 'paid';
type DeliveryStatus = 'awaiting_call' | 'scheduled' | 'in_transit';

interface LocalOrderLineItem {
  id: string;
  productId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  unit: string;
  unitPrice: number;
  packageType?: string;
}

interface LocalOrder {
  id: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  orderDate: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus?: DeliveryStatus;
  deliveryWindow?: { month?: string; notes?: string };
  scheduledDate?: string;
  lineItems: LocalOrderLineItem[];
  subtotal: number;
  receivedTotal: number;
  invoiceCount: number;
  bidEventId?: string;
}

interface PackageTier {
  id: string;
  packageType: string;
  packageSize: number;
  unit: string;
  pricePerUnit: number;
  minQuantity?: number;
}

interface LocalProduct {
  id: string;
  name: string;
  vendorId: string;
  unit: string;
  unitPrice: number;
  productType: 'specialty' | 'commodity';
  packageTiers?: PackageTier[];
}

interface LocalVendor {
  id: string;
  name: string;
  phone?: string;
  type: 'specialty' | 'commodity' | 'both';
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockVendors: LocalVendor[] = [
  { id: 'v1', name: 'Nutrien Ag Solutions', phone: '(320) 555-0123', type: 'commodity' },
  { id: 'v2', name: 'BW Fusion', phone: '(612) 555-0456', type: 'specialty' },
  { id: 'v3', name: 'CHS', phone: '(320) 555-0789', type: 'both' },
];

const mockProducts: LocalProduct[] = [
  { id: 'p1', name: 'AMS 21-0-0-24S', vendorId: 'v1', unit: 'tons', unitPrice: 415, productType: 'commodity' },
  { id: 'p2', name: 'Urea 46-0-0', vendorId: 'v1', unit: 'tons', unitPrice: 510, productType: 'commodity' },
  { id: 'p3', name: 'Humical', vendorId: 'v2', unit: 'gal', unitPrice: 42, productType: 'specialty',
    packageTiers: [
      { id: 'pt1', packageType: '2.5 gal jug', packageSize: 2.5, unit: 'gal', pricePerUnit: 48 },
      { id: 'pt2', packageType: '30 gal drum', packageSize: 30, unit: 'gal', pricePerUnit: 45 },
      { id: 'pt3', packageType: '275 gal tote', packageSize: 275, unit: 'gal', pricePerUnit: 42 },
      { id: 'pt4', packageType: 'Bulk (tanker)', packageSize: 0, unit: 'gal', pricePerUnit: 38, minQuantity: 500 },
    ]
  },
  { id: 'p4', name: 'BW-AmiNo', vendorId: 'v2', unit: 'gal', unitPrice: 45.50, productType: 'specialty',
    packageTiers: [
      { id: 'pt5', packageType: '2.5 gal jug', packageSize: 2.5, unit: 'gal', pricePerUnit: 52 },
      { id: 'pt6', packageType: '275 gal tote', packageSize: 275, unit: 'gal', pricePerUnit: 45.50 },
    ]
  },
  { id: 'p5', name: 'Glyphosate 4.5#', vendorId: 'v3', unit: 'gal', unitPrice: 15, productType: 'commodity' },
];

const mockOrders: LocalOrder[] = [
  {
    id: '1', orderNumber: 'ORD-2026-001', vendorId: 'v1', vendorName: 'Nutrien Ag Solutions', vendorPhone: '(320) 555-0123',
    orderDate: '2026-01-15', status: 'ordered', paymentStatus: 'prepaid', deliveryStatus: 'awaiting_call',
    deliveryWindow: { month: 'March', notes: 'Call when ground thaws' },
    lineItems: [
      { id: 'li-1', productId: 'p1', productName: 'AMS 21-0-0-24S', orderedQuantity: 15, receivedQuantity: 0, remainingQuantity: 15, unit: 'tons', unitPrice: 415 },
      { id: 'li-2', productId: 'p2', productName: 'Urea 46-0-0', orderedQuantity: 12, receivedQuantity: 0, remainingQuantity: 12, unit: 'tons', unitPrice: 510 },
    ],
    subtotal: 12345, receivedTotal: 0, invoiceCount: 0, bidEventId: 'bid-1',
  },
  {
    id: '2', orderNumber: 'ORD-2026-002', vendorId: 'v2', vendorName: 'BW Fusion', vendorPhone: '(612) 555-0456',
    orderDate: '2026-02-01', status: 'ordered', paymentStatus: 'unpaid', deliveryStatus: 'awaiting_call',
    deliveryWindow: { month: 'April' },
    lineItems: [
      { id: 'li-3', productId: 'p3', productName: 'Humical', orderedQuantity: 275, receivedQuantity: 0, remainingQuantity: 275, unit: 'gal', unitPrice: 42, packageType: '275 gal tote' },
    ],
    subtotal: 11550, receivedTotal: 0, invoiceCount: 0,
  },
  {
    id: '3', orderNumber: 'ORD-2026-003', vendorId: 'v3', vendorName: 'CHS', vendorPhone: '(320) 555-0789',
    orderDate: '2026-02-10', status: 'ordered', paymentStatus: 'unpaid', deliveryStatus: 'in_transit',
    deliveryWindow: { month: 'March' }, scheduledDate: '2026-03-15',
    lineItems: [
      { id: 'li-4', productId: 'p5', productName: 'Glyphosate 4.5#', orderedQuantity: 100, receivedQuantity: 0, remainingQuantity: 100, unit: 'gal', unitPrice: 15 },
    ],
    subtotal: 1500, receivedTotal: 0, invoiceCount: 0,
  },
  {
    id: '4', orderNumber: 'ORD-2026-004', vendorId: 'v1', vendorName: 'Nutrien Ag Solutions',
    orderDate: '2026-01-20', status: 'complete', paymentStatus: 'paid',
    lineItems: [
      { id: 'li-5', productId: 'p1', productName: 'MAP 11-52-0', orderedQuantity: 8, receivedQuantity: 8, remainingQuantity: 0, unit: 'tons', unitPrice: 680 },
    ],
    subtotal: 5440, receivedTotal: 5612, invoiceCount: 1,
  },
];

const mockBidAwards = [
  {
    bidEventId: 'bid-1', bidEventName: 'Spring 2026 Dry Fertilizer', vendorId: 'v1', vendorName: 'Nutrien Ag Solutions', awardDate: '2026-01-10',
    lineItems: [
      { commoditySpecId: 'cs1', productName: 'AMS 21-0-0-24S', quantity: 15, unit: 'tons', unitPrice: 415 },
      { commoditySpecId: 'cs2', productName: 'Urea 46-0-0', quantity: 12, unit: 'tons', unitPrice: 510 },
    ],
  },
];

// ============================================================================
// CONFIG
// ============================================================================

const orderStatusConfig: Record<OrderStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', icon: Edit },
  ordered: { label: 'Ordered', bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  confirmed: { label: 'Confirmed', bg: 'bg-cyan-100', text: 'text-cyan-700', icon: CheckCircle },
  partial: { label: 'Partial', bg: 'bg-amber-100', text: 'text-amber-700', icon: Package },
  complete: { label: 'Complete', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700', icon: X },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; bg: string; text: string }> = {
  unpaid: { label: 'Unpaid', bg: 'bg-gray-100', text: 'text-gray-700' },
  prepaid: { label: 'Prepaid', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  partial: { label: 'Partial Pay', bg: 'bg-amber-100', text: 'text-amber-700' },
  paid: { label: 'Paid', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const deliveryStatusConfig: Record<DeliveryStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  awaiting_call: { label: 'Awaiting Call', bg: 'bg-gray-100', text: 'text-gray-700', icon: Phone },
  scheduled: { label: 'Scheduled', bg: 'bg-blue-100', text: 'text-blue-700', icon: Calendar },
  in_transit: { label: 'In Transit', bg: 'bg-amber-100', text: 'text-amber-700', icon: Truck },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const allocateFreightByWeight = (lineItems: any[], totalCharges: number) => {
  const totalWeight = lineItems.reduce((sum, item) => {
    const mult = item.unit === 'tons' ? 2000 : item.unit === 'gal' ? 10 : 1;
    return sum + (item.quantity * mult);
  }, 0);

  if (totalWeight === 0) return lineItems.map(item => ({ ...item, allocatedFreight: 0, landedCost: item.unitPrice }));

  return lineItems.map(item => {
    const mult = item.unit === 'tons' ? 2000 : item.unit === 'gal' ? 10 : 1;
    const weight = item.quantity * mult;
    const ratio = weight / totalWeight;
    const allocated = totalCharges * ratio;
    const landed = item.quantity > 0 ? (item.subtotal + allocated) / item.quantity : 0;
    return { ...item, allocatedFreight: allocated, landedCost: landed };
  });
};

// ============================================================================
// RECORD INVOICE MODAL
// ============================================================================

interface RecordInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: LocalOrder | null;
  onSave?: (invoice: any) => void;
}

const RecordInvoiceModal: React.FC<RecordInvoiceModalProps> = ({ isOpen, onClose, order, onSave }) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [charges, setCharges] = useState<{ id: string; type: string; description: string; amount: number }[]>([]);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [newChargeDesc, setNewChargeDesc] = useState('Freight');

  const [lineItems, setLineItems] = useState<any[]>([]);

  // Initialize line items when order changes
  React.useEffect(() => {
    if (order) {
      setLineItems(order.lineItems.map(li => ({
        ...li,
        quantity: li.remainingQuantity,
        scaleTicket: '',
        subtotal: li.remainingQuantity * li.unitPrice,
      })));
      setCharges([]);
      setInvoiceNumber('');
    }
  }, [order]);

  const productSubtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const chargesTotal = charges.reduce((sum, c) => sum + c.amount, 0);
  const invoiceTotal = productSubtotal + chargesTotal;
  const lineItemsWithFreight = allocateFreightByWeight(lineItems, chargesTotal);

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(items => items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated.subtotal = updated.quantity * updated.unitPrice;
      }
      return updated;
    }));
  };

  const addCharge = () => {
    if (!newChargeAmount) return;
    setCharges([...charges, { id: `c-${Date.now()}`, type: 'freight', description: newChargeDesc, amount: parseFloat(newChargeAmount) }]);
    setNewChargeAmount('');
    setNewChargeDesc('Freight');
    setShowAddCharge(false);
  };

  const handleSave = () => {
    onSave?.({
      invoiceNumber, invoiceDate, receivedDate, orderId: order?.id,
      lineItems: lineItemsWithFreight, charges, productSubtotal, chargesTotal, totalAmount: invoiceTotal,
    });
    onClose();
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Record Invoice</h2>
              <p className="text-sm text-gray-500">{order.orderNumber} · {order.vendorName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Invoice #</label>
              <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-2026-0342" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
              <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Products Received</h3>
            <div className="space-y-4">
              {lineItems.map((item, idx) => {
                const wf = lineItemsWithFreight[idx];
                return (
                  <div key={item.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-gray-900">{item.productName}</div>
                        <div className="text-sm text-gray-500">Ordered: {item.orderedQuantity} {item.unit} · Remaining: {item.remainingQuantity} {item.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">${item.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="text-xs text-gray-500">@ ${item.unitPrice.toFixed(2)}/{item.unit.replace(/s$/, '')}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Qty Received</label>
                        <div className="flex">
                          <input type="number" value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} step="0.01" className="flex-1 px-3 py-2 border border-gray-200 rounded-l-lg" />
                          <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-200 rounded-r-lg text-gray-500 text-sm">{item.unit}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                        <div className="flex">
                          <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm">$</span>
                          <input type="number" value={item.unitPrice} onChange={e => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} step="0.01" className="flex-1 px-3 py-2 border border-gray-200 rounded-r-lg" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Scale Ticket #</label>
                        <input type="text" value={item.scaleTicket || ''} onChange={e => updateLineItem(item.id, 'scaleTicket', e.target.value)} placeholder="4521" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                      </div>
                    </div>
                    {chargesTotal > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">+ Allocated Freight</span>
                          <span className="text-gray-600">${wf.allocatedFreight.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-medium mt-1">
                          <span className="text-emerald-600">Landed Cost</span>
                          <span className="text-emerald-600">${wf.landedCost.toFixed(2)}/{item.unit.replace(/s$/, '')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mt-3">
              <span className="text-sm text-gray-500">Product Subtotal:</span>
              <span className="ml-3 text-lg font-semibold text-gray-900">${productSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Freight */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Truck className="w-4 h-4" /> Freight & Charges</h3>
              <button onClick={() => setShowAddCharge(true)} className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"><Plus className="w-4 h-4" /> Add Charge</button>
            </div>
            {charges.length === 0 && !showAddCharge && (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No freight or charges</p>
                <button onClick={() => setShowAddCharge(true)} className="mt-2 text-sm text-emerald-600 hover:underline">Add freight charge</button>
              </div>
            )}
            {charges.length > 0 && (
              <div className="space-y-2 mb-3">
                {charges.map(charge => (
                  <div key={charge.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3"><Truck className="w-5 h-5 text-gray-400" /><span className="text-gray-900">{charge.description}</span></div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">${charge.amount.toFixed(2)}</span>
                      <button onClick={() => setCharges(charges.filter(c => c.id !== charge.id))} className="p-1 hover:bg-gray-200 rounded"><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showAddCharge && (
              <div className="p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <input type="text" value={newChargeDesc} onChange={e => setNewChargeDesc(e.target.value)} placeholder="Freight" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Amount</label>
                    <div className="flex">
                      <span className="px-2 py-2 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm">$</span>
                      <input type="number" value={newChargeAmount} onChange={e => setNewChargeAmount(e.target.value)} placeholder="485.00" step="0.01" className="flex-1 px-3 py-2 border border-gray-200 rounded-r-lg text-sm" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => setShowAddCharge(false)} className="px-3 py-1.5 text-sm text-gray-600">Cancel</button>
                  <button onClick={addCharge} disabled={!newChargeAmount} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium">Add</button>
                </div>
              </div>
            )}
            {charges.length > 0 && (
              <div className="flex justify-end mt-3">
                <span className="text-sm text-gray-500">Charges Total:</span>
                <span className="ml-3 text-lg font-semibold text-gray-900">${chargesTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {chargesTotal > 0 && (
            <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 text-sm text-emerald-800 mb-2"><Calculator className="w-4 h-4" /><span className="font-medium">Landed Costs (freight allocated by weight)</span></div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {lineItemsWithFreight.map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-emerald-700">{item.productName}:</span>
                    <span className="font-medium text-emerald-800">${item.landedCost.toFixed(2)}/{item.unit.replace(/s$/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Invoice Total</div>
              <div className="text-2xl font-bold text-gray-900">${invoiceTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={handleSave} disabled={!invoiceNumber} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg font-medium">
                <CheckCircle className="w-5 h-5" /> Save Invoice & Update Inventory
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CREATE ORDER MODAL
// ============================================================================

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (order: any) => void;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onSave }) => {
  const [mode, setMode] = useState<'from-bid' | 'manual'>('from-bid');
  const [selectedBidAward, setSelectedBidAward] = useState<any>(null);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [deliveryMonth, setDeliveryMonth] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isPrepaid, setIsPrepaid] = useState(false);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [selectedPackageTier, setSelectedPackageTier] = useState('');
  const [packageCount, setPackageCount] = useState('');

  const handleSelectBidAward = (award: any) => {
    setSelectedBidAward(award);
    setSelectedVendorId(award.vendorId);
    setLineItems(award.lineItems.map((li: any, idx: number) => ({
      id: `li-${idx}`, productId: li.commoditySpecId, productName: li.productName, quantity: li.quantity, unit: li.unit, unitPrice: li.unitPrice, subtotal: li.quantity * li.unitPrice,
    })));
  };

  const vendorProducts = useMemo(() => mockProducts.filter(p => p.vendorId === selectedVendorId), [selectedVendorId]);
  const selectedProduct = mockProducts.find(p => p.id === selectedProductId);

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    let quantity = 0, unitPrice = selectedProduct.unitPrice, packageType: string | undefined;

    if (selectedProduct.packageTiers && selectedPackageTier) {
      const tier = selectedProduct.packageTiers.find(t => t.id === selectedPackageTier);
      if (tier) {
        packageType = tier.packageType;
        const pkgCount = parseInt(packageCount) || 1;
        quantity = tier.packageSize > 0 ? pkgCount * tier.packageSize : parseFloat(productQuantity) || 0;
        unitPrice = tier.pricePerUnit;
      }
    } else {
      quantity = parseFloat(productQuantity) || 0;
    }

    setLineItems([...lineItems, {
      id: `li-${Date.now()}`, productId: selectedProduct.id, productName: selectedProduct.name, quantity, unit: selectedProduct.unit, unitPrice, packageType, subtotal: quantity * unitPrice,
    }]);
    setShowAddProduct(false);
    setSelectedProductId('');
    setProductQuantity('');
    setSelectedPackageTier('');
    setPackageCount('');
  };

  const orderSubtotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0);
  const isValid = (selectedVendorId || selectedBidAward) && lineItems.length > 0;

  const handleSave = () => {
    onSave?.({
      vendorId: selectedVendorId, vendorName: mockVendors.find(v => v.id === selectedVendorId)?.name,
      deliveryWindow: { month: deliveryMonth, notes: deliveryNotes }, lineItems, subtotal: orderSubtotal,
      paymentStatus: isPrepaid ? 'prepaid' : 'unpaid', bidEventId: selectedBidAward?.bidEventId,
    });
    onClose();
  };

  const resetModal = () => {
    setMode('from-bid');
    setSelectedBidAward(null);
    setSelectedVendorId('');
    setLineItems([]);
    setDeliveryMonth('');
    setDeliveryNotes('');
    setIsPrepaid(false);
  };

  React.useEffect(() => {
    if (!isOpen) resetModal();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Package className="w-5 h-5 text-blue-600" /></div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create Order</h2>
              <p className="text-sm text-gray-500">{mode === 'from-bid' ? 'From bid award' : 'Manual entry'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button onClick={() => { setMode('from-bid'); setSelectedVendorId(''); setLineItems([]); setSelectedBidAward(null); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'from-bid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              <Gavel className="w-4 h-4" /> From Bid Award
            </button>
            <button onClick={() => { setMode('manual'); setSelectedBidAward(null); setLineItems([]); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              <FileText className="w-4 h-4" /> Manual Entry
            </button>
          </div>

          {/* From Bid - Select Award */}
          {mode === 'from-bid' && !selectedBidAward && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Bid Award</h3>
              <div className="space-y-3">
                {mockBidAwards.map(award => (
                  <button key={award.bidEventId} onClick={() => handleSelectBidAward(award)} className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors text-left">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2"><Gavel className="w-4 h-4 text-purple-500" /><span className="font-medium text-gray-900">{award.bidEventName}</span></div>
                      <span className="text-sm text-gray-500">Awarded {new Date(award.awardDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2"><Building2 className="w-4 h-4" />{award.vendorName}</div>
                    <div className="text-sm text-gray-500">{award.lineItems.map((li: any) => `${li.quantity} ${li.unit} ${li.productName}`).join(' · ')}</div>
                    <div className="mt-2 text-right font-semibold text-gray-900">${award.lineItems.reduce((sum: number, li: any) => sum + li.quantity * li.unitPrice, 0).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual - Select Vendor */}
          {mode === 'manual' && !selectedVendorId && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Vendor</h3>
              <div className="grid grid-cols-2 gap-3">
                {mockVendors.map(vendor => (
                  <button key={vendor.id} onClick={() => setSelectedVendorId(vendor.id)} className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><Building2 className="w-5 h-5 text-gray-500" /></div>
                      <div>
                        <div className="font-medium text-gray-900">{vendor.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{vendor.type}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order Details (after selection) */}
          {(selectedVendorId || selectedBidAward) && (
            <>
              {/* Vendor Header */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-900">{selectedBidAward?.vendorName || mockVendors.find(v => v.id === selectedVendorId)?.name}</span>
                  {selectedBidAward && <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">From: {selectedBidAward.bidEventName}</span>}
                </div>
                <button onClick={() => { setSelectedVendorId(''); setSelectedBidAward(null); setLineItems([]); }} className="text-sm text-gray-500 hover:text-gray-700">Change</button>
              </div>

              {/* Delivery Window */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                  <select value={deliveryMonth} onChange={e => setDeliveryMonth(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                    <option value="">Select month...</option>
                    {['January', 'February', 'March', 'April', 'May', 'June'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Notes</label>
                  <input type="text" value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} placeholder="e.g., Call when ready" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Package className="w-4 h-4" /> Order Items</h3>
                  {mode === 'manual' && <button onClick={() => setShowAddProduct(true)} className="flex items-center gap-1 text-sm text-blue-600"><Plus className="w-4 h-4" /> Add Product</button>}
                </div>
                {lineItems.length > 0 ? (
                  <div className="space-y-3">
                    {lineItems.map(item => (
                      <div key={item.id} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          {item.packageType && <div className="text-sm text-gray-500">{item.packageType}</div>}
                          <div className="text-sm text-gray-500">{item.quantity} {item.unit} @ ${item.unitPrice.toFixed(2)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-gray-900">${item.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          {mode === 'manual' && <button onClick={() => setLineItems(lineItems.filter(li => li.id !== item.id))} className="p-1 hover:bg-gray-200 rounded"><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl"><Package className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-500">No products added yet</p></div>
                )}

                {/* Add Product Form */}
                {showAddProduct && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border-2 border-dashed border-blue-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Add Product</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Product</label>
                        <select value={selectedProductId} onChange={e => { setSelectedProductId(e.target.value); setSelectedPackageTier(''); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                          <option value="">Select product...</option>
                          {vendorProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      {selectedProduct && (
                        <>
                          {selectedProduct.packageTiers ? (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Package Type</label>
                                <select value={selectedPackageTier} onChange={e => setSelectedPackageTier(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                  <option value="">Select package...</option>
                                  {selectedProduct.packageTiers.map(tier => <option key={tier.id} value={tier.id}>{tier.packageType} (${tier.pricePerUnit}/{tier.unit})</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">{selectedProduct.packageTiers.find(t => t.id === selectedPackageTier)?.packageSize ? 'Qty (packages)' : `Qty (${selectedProduct.unit})`}</label>
                                <input type="number" value={selectedProduct.packageTiers.find(t => t.id === selectedPackageTier)?.packageSize ? packageCount : productQuantity} onChange={e => selectedProduct.packageTiers?.find(t => t.id === selectedPackageTier)?.packageSize ? setPackageCount(e.target.value) : setProductQuantity(e.target.value)} placeholder="e.g., 1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Quantity ({selectedProduct.unit})</label>
                              <input type="number" value={productQuantity} onChange={e => setProductQuantity(e.target.value)} placeholder={`e.g., 15 ${selectedProduct.unit}`} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button onClick={() => setShowAddProduct(false)} className="px-3 py-1.5 text-sm text-gray-600">Cancel</button>
                      <button onClick={handleAddProduct} disabled={!selectedProductId || (!productQuantity && !packageCount && !selectedPackageTier)} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium">Add to Order</button>
                    </div>
                  </div>
                )}

                {lineItems.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <span className="text-sm text-gray-500">Order Subtotal:</span>
                    <span className="ml-3 text-xl font-bold text-gray-900">${orderSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Prepayment */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={isPrepaid} onChange={e => setIsPrepaid(e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-emerald-600" />
                  <div>
                    <span className="font-medium text-gray-900">Prepaid</span>
                    <p className="text-sm text-gray-500">Mark if payment made before delivery (early order program)</p>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {lineItems.length > 0 && (
                <>
                  <div className="text-sm text-gray-500">Order Total</div>
                  <div className="text-2xl font-bold text-gray-900">${orderSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={handleSave} disabled={!isValid} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium">
                <CheckCircle className="w-5 h-5" /> Create Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PACKAGE PRICING CALCULATOR
// ============================================================================

interface PackagePricingProps {
  product?: LocalProduct;
}

const PackagePricingSection: React.FC<PackagePricingProps> = ({ product }) => {
  const [selectedProduct, setSelectedProduct] = useState<LocalProduct | null>(product || mockProducts.find(p => p.packageTiers) || null);
  const [needed, setNeeded] = useState('100');
  const [expanded, setExpanded] = useState(true);

  const productsWithTiers = mockProducts.filter(p => p.packageTiers && p.packageTiers.length > 0);
  const tiers = selectedProduct?.packageTiers || [];
  const qty = parseFloat(needed) || 0;
  const maxPrice = tiers.length > 0 ? Math.max(...tiers.map(t => t.pricePerUnit)) : 0;

  const tierCosts = tiers.map(tier => {
    if (tier.minQuantity && qty < tier.minQuantity) return { tier, packages: 0, totalQty: 0, cost: Infinity, eligible: false };
    let packages = 0, totalQty = 0;
    if (tier.packageSize > 0) {
      packages = Math.ceil(qty / tier.packageSize);
      totalQty = packages * tier.packageSize;
    } else {
      packages = 1;
      totalQty = qty;
    }
    return { tier, packages, totalQty, cost: totalQty * tier.pricePerUnit, eligible: true };
  }).filter(tc => tc.eligible);

  const best = tierCosts.length > 0 ? tierCosts.reduce((b, c) => c.cost < b.cost ? c : b, tierCosts[0]) : null;

  return (
    <div className="space-y-4">
      {/* Product Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Product</label>
        <select value={selectedProduct?.id || ''} onChange={e => setSelectedProduct(productsWithTiers.find(p => p.id === e.target.value) || null)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
          {productsWithTiers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.vendorId === 'v2' ? 'BW Fusion' : 'Vendor'})</option>)}
        </select>
      </div>

      {selectedProduct && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-emerald-600" />
              <div className="text-left">
                <div className="font-semibold text-gray-900">{selectedProduct.name} Package Pricing</div>
                <div className="text-sm text-gray-500">{tiers.length} package options</div>
              </div>
            </div>
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>

          {expanded && (
            <div className="p-4 border-t border-gray-200 space-y-4">
              {/* Tiers List */}
              <div className="space-y-2">
                {tiers.map((tier, idx) => {
                  const savings = maxPrice > 0 ? ((maxPrice - tier.pricePerUnit) / maxPrice) * 100 : 0;
                  return (
                    <div key={tier.id} className={`flex items-center justify-between p-3 rounded-lg ${idx === tiers.length - 1 ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
                      <div>
                        <div className="font-medium text-gray-900">{tier.packageType}</div>
                        {tier.packageSize > 0 && <div className="text-sm text-gray-500">{tier.packageSize} {tier.unit}</div>}
                        {tier.minQuantity && <div className="text-xs text-amber-600">Min {tier.minQuantity} {tier.unit}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">${tier.pricePerUnit.toFixed(2)}/{tier.unit}</div>
                        {savings > 0 && <div className="text-sm text-emerald-600 flex items-center gap-1 justify-end"><TrendingDown className="w-3 h-3" /> Save {savings.toFixed(0)}%</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Calculator */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-200">
                <div className="text-sm font-medium text-gray-700 mb-2">How much do you need?</div>
                <div className="flex gap-2 mb-4">
                  <input type="number" value={needed} onChange={e => setNeeded(e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg" />
                  <span className="px-4 py-2 bg-white rounded-lg text-gray-500 border border-gray-200">{selectedProduct.unit}</span>
                </div>

                {qty > 0 && tierCosts.length > 0 && (
                  <div className="space-y-2">
                    {tierCosts.slice(0, 4).map(({ tier, packages, totalQty, cost }) => {
                      const isBest = cost === best?.cost;
                      return (
                        <div key={tier.id} className={`p-3 rounded-lg ${isBest ? 'bg-emerald-100 border border-emerald-300' : 'bg-white'}`}>
                          <div className="flex justify-between">
                            <div>
                              <span className="font-medium">{tier.packageType}</span>
                              {isBest && <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">Best Value</span>}
                            </div>
                            <span className="font-bold">${cost.toFixed(2)}</span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {tier.packageSize > 0 ? `${packages} × ${tier.packageSize} ${tier.unit} = ${totalQty} ${tier.unit}` : `${totalQty} ${tier.unit} bulk`}
                            {totalQty > qty && <span className="text-amber-600 ml-1">(+{(totalQty - qty).toFixed(0)} extra)</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN PROCUREMENT PAGE
// ============================================================================

type TabType = 'orders' | 'pending' | 'pricing';

export const ProcurementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'complete'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<LocalOrder | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);

  // Filter orders
  const filteredOrders = mockOrders.filter(order => {
    if (orderFilter === 'pending' && !['ordered', 'confirmed'].includes(order.status)) return false;
    if (orderFilter === 'complete' && order.status !== 'complete') return false;
    if (searchQuery && !order.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) && !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pendingOrders = mockOrders.filter(o => ['ordered', 'confirmed'].includes(o.status));
  const inTransitOrders = mockOrders.filter(o => o.deliveryStatus === 'in_transit');
  const awaitingCallOrders = mockOrders.filter(o => o.deliveryStatus === 'awaiting_call');

  // Summary calculations
  const totalOrdered = mockOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalReceived = mockOrders.reduce((sum, o) => sum + o.receivedTotal, 0);
  const totalPrepaid = mockOrders.filter(o => o.paymentStatus === 'prepaid').reduce((sum, o) => sum + o.subtotal, 0);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'orders' as TabType, label: 'Orders', icon: FileText },
              { id: 'pending' as TabType, label: 'Pending Deliveries', icon: Truck },
              { id: 'pricing' as TabType, label: 'Package Pricing', icon: Package },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* ==================== ORDERS TAB ==================== */}
        {activeTab === 'orders' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
                <p className="text-gray-500">Track purchases from order to delivery</p>
              </div>
              <button onClick={() => setShowCreateOrderModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">
                <Plus className="w-5 h-5" /> New Order
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-sm text-gray-500 mb-1">Total Ordered</div>
                <div className="text-2xl font-bold text-gray-900">${totalOrdered.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-sm text-gray-500 mb-1">On Order</div>
                <div className="text-2xl font-bold text-blue-600">${(totalOrdered - totalReceived).toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-sm text-gray-500 mb-1">Prepaid</div>
                <div className="text-2xl font-bold text-emerald-600">${totalPrepaid.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="text-sm text-gray-500 mb-1">Awaiting Delivery</div>
                <div className="text-2xl font-bold text-amber-600">{pendingOrders.length} orders</div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                {[
                  { id: 'all' as const, label: 'All' },
                  { id: 'pending' as const, label: `Pending (${pendingOrders.length})` },
                  { id: 'complete' as const, label: 'Complete' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setOrderFilter(tab.id)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${orderFilter === tab.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm w-64" />
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const statusInfo = orderStatusConfig[order.status];
                const paymentInfo = paymentStatusConfig[order.paymentStatus];
                const deliveryInfo = order.deliveryStatus ? deliveryStatusConfig[order.deliveryStatus] : null;
                const StatusIcon = statusInfo.icon;
                const isExpanded = expandedOrderId === order.id;

                return (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${statusInfo.bg} flex items-center justify-center`}>
                          <StatusIcon className={`w-5 h-5 ${statusInfo.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{order.orderNumber}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.bg} ${statusInfo.text}`}>{statusInfo.label}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${paymentInfo.bg} ${paymentInfo.text}`}>{paymentInfo.label}</span>
                            {deliveryInfo && <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${deliveryInfo.bg} ${deliveryInfo.text}`}>{deliveryInfo.label}</span>}
                            {order.bidEventId && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">From Bid</span>}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{order.vendorName}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : order.deliveryWindow?.month || 'TBD'}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">${order.subtotal.toLocaleString()}</div>
                          {order.invoiceCount > 0 && <div className="text-xs text-gray-400">{order.invoiceCount} invoice{order.invoiceCount !== 1 ? 's' : ''}</div>}
                        </div>
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Order Items</h4>
                        <div className="space-y-2 mb-4">
                          {order.lineItems.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-gray-900">{item.productName} {item.packageType && `(${item.packageType})`}</span>
                              <span className="text-gray-500">{item.orderedQuantity} {item.unit} @ ${item.unitPrice} = ${(item.orderedQuantity * item.unitPrice).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        {order.deliveryWindow?.notes && (
                          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 mb-4"><strong>Note:</strong> {order.deliveryWindow.notes}</div>
                        )}
                        <div className="flex gap-3">
                          {order.status !== 'complete' && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setInvoiceModalOrder(order); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
                                <Receipt className="w-4 h-4" /> Record Invoice
                              </button>
                              {order.deliveryStatus === 'awaiting_call' && (
                                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                                  <Phone className="w-4 h-4" /> Call In Delivery
                                </button>
                              )}
                            </>
                          )}
                          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700">
                            <Eye className="w-4 h-4" /> View Details
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500 mb-4">{orderFilter !== 'all' ? 'Try changing your filter.' : 'Create your first order to get started.'}</p>
              </div>
            )}
          </>
        )}

        {/* ==================== PENDING DELIVERIES TAB ==================== */}
        {activeTab === 'pending' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pending Deliveries</h1>
                <p className="text-gray-500">Track orders awaiting delivery</p>
              </div>
            </div>

            {/* Weather Hint */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3">
                <Sun className="w-6 h-6 text-amber-500" />
                <div>
                  <div className="font-medium text-gray-900">Good delivery weather this week</div>
                  <div className="text-sm text-gray-600">Clear skies through Friday. Good time to call in pending deliveries.</div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Phone className="w-5 h-5 text-gray-500" /></div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{awaitingCallOrders.length}</div>
                    <div className="text-sm text-gray-500">Awaiting Call</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><Truck className="w-5 h-5 text-amber-600" /></div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{inTransitOrders.length}</div>
                    <div className="text-sm text-gray-500">In Transit</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">${((totalOrdered - totalReceived) / 1000).toFixed(1)}k</div>
                    <div className="text-sm text-gray-500">Total Pending</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending List */}
            <div className="space-y-3">
              {pendingOrders.map(order => {
                const isInTransit = order.deliveryStatus === 'in_transit';
                const DeliveryIcon = isInTransit ? Truck : Phone;
                return (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${isInTransit ? 'bg-amber-100' : 'bg-gray-100'} flex items-center justify-center`}>
                        <DeliveryIcon className={`w-6 h-6 ${isInTransit ? 'text-amber-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">{order.vendorName}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isInTransit ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                            {isInTransit ? 'In Transit' : 'Awaiting Call'}
                          </span>
                          {order.paymentStatus === 'prepaid' && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Prepaid</span>}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{order.lineItems.map(li => li.productName).join(', ')}</div>
                        {order.vendorPhone && <div className="text-sm text-blue-600 mt-1">{order.vendorPhone}</div>}
                      </div>
                      <div className="text-right mr-4">
                        <div className="font-semibold text-gray-900">${order.subtotal.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">{order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : order.deliveryWindow?.month}</div>
                      </div>
                      {isInTransit ? (
                        <button onClick={() => setInvoiceModalOrder(order)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">Record Invoice</button>
                      ) : (
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Call to Schedule</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pendingOrders.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                <p className="text-gray-500">No pending deliveries at this time.</p>
              </div>
            )}
          </>
        )}

        {/* ==================== PACKAGE PRICING TAB ==================== */}
        {activeTab === 'pricing' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Package Tier Pricing</h1>
              <p className="text-gray-500">Volume discounts for specialty products</p>
            </div>

            <div className="max-w-xl">
              <PackagePricingSection />
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200 max-w-xl">
              <div className="flex gap-3 text-sm text-blue-800">
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>How it works:</strong> When creating an order, select your package type. FarmCalc shows the total cost and any overage. Larger packages typically offer better per-unit pricing.
                </div>
              </div>
            </div>
          </>
        )}

        {/* Info Box */}
        {activeTab === 'orders' && (
          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="flex gap-3 text-sm text-emerald-800">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div><strong>Tip:</strong> Click on an order to expand it. Use "Record Invoice" to enter actual quantities and freight when product arrives. Landed costs are calculated automatically.</div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <RecordInvoiceModal isOpen={!!invoiceModalOrder} onClose={() => setInvoiceModalOrder(null)} order={invoiceModalOrder} />
      <CreateOrderModal isOpen={showCreateOrderModal} onClose={() => setShowCreateOrderModal(false)} />
    </div>
  );
};

export default ProcurementPage;
