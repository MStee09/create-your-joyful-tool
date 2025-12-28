import React, { useState } from 'react';
import {
  Package, Truck, FileText, ChevronRight, Plus, Calendar, DollarSign,
  CheckCircle, Clock, Building2, Phone, Receipt, X, Calculator,
  Trash2, Info, TrendingDown, ChevronDown, ChevronUp, Sun
} from 'lucide-react';
import { PackageTierPreview } from './PackageTierPricing';
import { PendingDeliveriesDashboard } from './PendingDeliveriesDashboard';

// ============================================================================
// TYPES
// ============================================================================

type OrderStatus = 'ordered' | 'in_transit' | 'complete';
type PaymentStatus = 'unpaid' | 'prepaid';

interface OrderLineItem {
  id: string;
  productName: string;
  orderedQuantity: number;
  remainingQuantity: number;
  unit: string;
  unitPrice: number;
  packageType?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  vendorName: string;
  vendorPhone: string;
  orderDate: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryWindow: { month: string; notes?: string };
  scheduledDate?: string;
  lineItems: OrderLineItem[];
  subtotal: number;
  receivedTotal: number;
  bidEventId?: string;
}

interface PackageTier {
  id: string;
  packageType: string;
  packageSize: number;
  pricePerUnit: number;
  minQty?: number;
}

interface Charge {
  id: string;
  type: string;
  description: string;
  amount: number;
}

// ============================================================================
// SHARED DATA
// ============================================================================

const mockOrders: Order[] = [
  {
    id: '1', orderNumber: 'ORD-2026-001', vendorName: 'Nutrien Ag Solutions', vendorPhone: '(320) 555-0123',
    orderDate: '2026-01-15', status: 'ordered', paymentStatus: 'prepaid',
    deliveryWindow: { month: 'March', notes: 'Call when ground thaws' },
    lineItems: [
      { id: 'li-1', productName: 'AMS 21-0-0-24S', orderedQuantity: 15, remainingQuantity: 15, unit: 'tons', unitPrice: 415 },
      { id: 'li-2', productName: 'Urea 46-0-0', orderedQuantity: 12, remainingQuantity: 12, unit: 'tons', unitPrice: 510 },
    ],
    subtotal: 12345, receivedTotal: 0, bidEventId: 'bid-1',
  },
  {
    id: '2', orderNumber: 'ORD-2026-002', vendorName: 'BW Fusion', vendorPhone: '(612) 555-0456',
    orderDate: '2026-02-01', status: 'ordered', paymentStatus: 'unpaid',
    deliveryWindow: { month: 'April' },
    lineItems: [
      { id: 'li-3', productName: 'Humical', orderedQuantity: 20, remainingQuantity: 20, unit: 'gal', unitPrice: 42, packageType: '275 gal tote' },
    ],
    subtotal: 840, receivedTotal: 0,
  },
  {
    id: '3', orderNumber: 'ORD-2026-003', vendorName: 'CHS', vendorPhone: '(320) 555-0789',
    orderDate: '2026-02-10', status: 'in_transit', paymentStatus: 'unpaid',
    deliveryWindow: { month: 'March' }, scheduledDate: '2026-03-15',
    lineItems: [
      { id: 'li-4', productName: 'Glyphosate 4.5#', orderedQuantity: 50, remainingQuantity: 50, unit: 'gal', unitPrice: 15 },
    ],
    subtotal: 750, receivedTotal: 0,
  },
];

const packageTiers: PackageTier[] = [
  { id: 'pt1', packageType: '2.5 gal jug', packageSize: 2.5, pricePerUnit: 48 },
  { id: 'pt2', packageType: '30 gal drum', packageSize: 30, pricePerUnit: 45 },
  { id: 'pt3', packageType: '275 gal tote', packageSize: 275, pricePerUnit: 42 },
  { id: 'pt4', packageType: 'Bulk (500+ gal)', packageSize: 0, pricePerUnit: 38, minQty: 500 },
];

const statusConfig = {
  ordered: { label: 'Ordered', bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  in_transit: { label: 'In Transit', bg: 'bg-amber-100', text: 'text-amber-700', icon: Truck },
  complete: { label: 'Complete', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
};

const paymentConfig = {
  unpaid: { label: 'Unpaid', bg: 'bg-muted', text: 'text-muted-foreground' },
  prepaid: { label: 'Prepaid', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

// ============================================================================
// RECORD INVOICE MODAL
// ============================================================================

interface RecordInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

const RecordInvoiceModal: React.FC<RecordInvoiceModalProps> = ({ isOpen, onClose, order }) => {
  const [charges] = useState<Charge[]>([{ id: '1', type: 'freight', description: 'Freight', amount: 485 }]);
  
  if (!isOpen || !order) return null;

  const lineItems = order.lineItems.map(li => ({
    ...li, quantity: li.remainingQuantity, subtotal: li.remainingQuantity * li.unitPrice
  }));

  const productSubtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const chargesTotal = charges.reduce((sum, c) => sum + c.amount, 0);
  const invoiceTotal = productSubtotal + chargesTotal;

  // Freight allocation
  const totalWeight = lineItems.reduce((sum, item) => {
    const mult = item.unit === 'tons' ? 2000 : 10;
    return sum + (item.quantity * mult);
  }, 0);

  const lineItemsWithFreight = lineItems.map(item => {
    const mult = item.unit === 'tons' ? 2000 : 10;
    const ratio = totalWeight > 0 ? (item.quantity * mult) / totalWeight : 0;
    const allocated = chargesTotal * ratio;
    const landed = item.quantity > 0 ? (item.subtotal + allocated) / item.quantity : 0;
    return { ...item, allocatedFreight: allocated, landedCost: landed };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Record Invoice</h2>
              <p className="text-sm text-muted-foreground">{order.orderNumber} · {order.vendorName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Vendor Invoice #</label>
              <input type="text" placeholder="INV-2026-0342" className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Invoice Date</label>
              <input type="date" defaultValue="2026-03-15" className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Received Date</label>
              <input type="date" defaultValue="2026-03-15" className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" /> Products Received
            </h3>
            <div className="space-y-4">
              {lineItems.map((item, idx) => {
                const wf = lineItemsWithFreight[idx];
                return (
                  <div key={item.id} className="p-4 bg-muted rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-foreground">{item.productName}</div>
                        <div className="text-sm text-muted-foreground">Ordered: {item.orderedQuantity} {item.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">${item.subtotal.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">@ ${item.unitPrice}/{item.unit.replace(/s$/, '')}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Qty Received</label>
                        <div className="flex">
                          <input type="number" defaultValue={item.quantity} step="0.01" className="flex-1 px-3 py-2 border border-border rounded-l-lg bg-background" />
                          <span className="px-3 py-2 bg-muted border border-l-0 border-border rounded-r-lg text-muted-foreground text-sm">{item.unit}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Unit Price</label>
                        <div className="flex">
                          <span className="px-3 py-2 bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground text-sm">$</span>
                          <input type="number" defaultValue={item.unitPrice} readOnly className="flex-1 px-3 py-2 border border-border rounded-r-lg bg-muted" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Scale Ticket #</label>
                        <input type="text" placeholder="4521" className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                      </div>
                    </div>
                    {chargesTotal > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">+ Allocated Freight</span>
                          <span className="text-foreground">${wf.allocatedFreight.toFixed(2)}</span>
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
              <span className="text-sm text-muted-foreground">Product Subtotal:</span>
              <span className="ml-3 text-lg font-semibold text-foreground">${productSubtotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Freight */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Truck className="w-4 h-4" /> Freight & Charges
              </h3>
              <button className="flex items-center gap-1 text-sm text-emerald-600">
                <Plus className="w-4 h-4" /> Add Charge
              </button>
            </div>
            <div className="space-y-2">
              {charges.map(charge => (
                <div key={charge.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">{charge.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">${charge.amount.toFixed(2)}</span>
                    <button className="p-1 hover:bg-background rounded"><Trash2 className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <span className="text-sm text-muted-foreground">Charges Total:</span>
              <span className="ml-3 text-lg font-semibold text-foreground">${chargesTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted">
          {chargesTotal > 0 && (
            <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 text-sm text-emerald-800 mb-2">
                <Calculator className="w-4 h-4" />
                <span className="font-medium">Landed Costs (freight allocated by weight)</span>
              </div>
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
              <div className="text-sm text-muted-foreground">Invoice Total</div>
              <div className="text-2xl font-bold text-foreground">${invoiceTotal.toLocaleString()}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-background">Cancel</button>
              <button className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">
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
// PACKAGE PRICING CALCULATOR
// ============================================================================

const PackagePricingCalculator: React.FC = () => {
  const [needed, setNeeded] = useState('100');
  const [expanded, setExpanded] = useState(true);
  const qty = parseFloat(needed) || 0;
  const maxPrice = Math.max(...packageTiers.map(t => t.pricePerUnit));

  const tierCosts = packageTiers.map(tier => {
    if (tier.minQty && qty < tier.minQty) return { tier, packages: 0, totalQty: 0, cost: Infinity, eligible: false };
    let packages = 0, totalQty = 0;
    if (tier.packageSize > 0) {
      packages = Math.ceil(qty / tier.packageSize);
      totalQty = packages * tier.packageSize;
    } else {
      packages = 1; totalQty = qty;
    }
    return { tier, packages, totalQty, cost: totalQty * tier.pricePerUnit, eligible: true };
  }).filter(tc => tc.eligible);

  const best = tierCosts.reduce((b, c) => c.cost < b.cost ? c : b, tierCosts[0]);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-4 hover:bg-muted">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-emerald-600" />
          <div className="text-left">
            <div className="font-semibold text-foreground">Humical Package Pricing</div>
            <div className="text-sm text-muted-foreground">See savings by package size</div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      
      {expanded && (
        <div className="p-4 border-t border-border space-y-4">
          {/* Tiers */}
          <div className="space-y-2">
            {packageTiers.map((tier, idx) => {
              const savings = ((maxPrice - tier.pricePerUnit) / maxPrice) * 100;
              return (
                <div key={tier.id} className={`flex items-center justify-between p-3 rounded-lg ${idx === packageTiers.length - 1 ? 'bg-emerald-50 border border-emerald-200' : 'bg-muted'}`}>
                  <div>
                    <div className="font-medium text-foreground">{tier.packageType}</div>
                    {tier.packageSize > 0 && <div className="text-sm text-muted-foreground">{tier.packageSize} gal</div>}
                    {tier.minQty && <div className="text-xs text-amber-600">Min {tier.minQty} gal</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">${tier.pricePerUnit.toFixed(2)}/gal</div>
                    {savings > 0 && (
                      <div className="text-sm text-emerald-600 flex items-center gap-1 justify-end">
                        <TrendingDown className="w-3 h-3" /> Save {savings.toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calculator */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-200">
            <div className="text-sm font-medium text-foreground mb-2">How much do you need?</div>
            <div className="flex gap-2 mb-4">
              <input type="number" value={needed} onChange={e => setNeeded(e.target.value)} className="flex-1 px-3 py-2 border border-border rounded-lg bg-background" />
              <span className="px-4 py-2 bg-background rounded-lg text-muted-foreground border border-border">gal</span>
            </div>
            
            {qty > 0 && tierCosts.length > 0 && (
              <div className="space-y-2">
                {tierCosts.slice(0, 3).map(({ tier, packages, totalQty, cost }) => {
                  const isBest = cost === best?.cost;
                  return (
                    <div key={tier.id} className={`p-3 rounded-lg ${isBest ? 'bg-emerald-100 border border-emerald-300' : 'bg-background'}`}>
                      <div className="flex justify-between">
                        <div>
                          <span className="font-medium">{tier.packageType}</span>
                          {isBest && <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">Best Value</span>}
                        </div>
                        <span className="font-bold">${cost.toFixed(2)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {tier.packageSize > 0 ? `${packages} × ${tier.packageSize} gal = ${totalQty} gal` : `${totalQty} gal bulk`}
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
  );
};

// ============================================================================
// MAIN VIEW
// ============================================================================

export const OrdersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'pending' | 'pricing'>('orders');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Tabs */}
      <div className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'orders' as const, label: 'Orders', icon: FileText },
              { id: 'pending' as const, label: 'Pending Deliveries', icon: Truck },
              { id: 'pricing' as const, label: 'Package Pricing', icon: Package },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Orders</h1>
                <p className="text-muted-foreground">Track purchases from order to delivery</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">
                <Plus className="w-5 h-5" /> New Order
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Total Ordered</div>
                <div className="text-2xl font-bold text-foreground">$13,935</div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">On Order</div>
                <div className="text-2xl font-bold text-blue-600">$13,935</div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Prepaid</div>
                <div className="text-2xl font-bold text-emerald-600">$12,345</div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Awaiting Delivery</div>
                <div className="text-2xl font-bold text-amber-600">3 orders</div>
              </div>
            </div>

            <div className="space-y-3">
              {mockOrders.map(order => {
                const statusInfo = statusConfig[order.status];
                const paymentInfo = paymentConfig[order.paymentStatus];
                const StatusIcon = statusInfo.icon;
                const isExpanded = expandedOrderId === order.id;

                return (
                  <div key={order.id} className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="p-4 cursor-pointer hover:bg-muted" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${statusInfo.bg} flex items-center justify-center`}>
                          <StatusIcon className={`w-5 h-5 ${statusInfo.text}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-foreground">{order.orderNumber}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.bg} ${statusInfo.text}`}>{statusInfo.label}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${paymentInfo.bg} ${paymentInfo.text}`}>{paymentInfo.label}</span>
                            {order.bidEventId && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">From Bid</span>}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{order.vendorName}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Delivery: {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : order.deliveryWindow?.month}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">${order.subtotal.toLocaleString()}</div>
                        </div>
                        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border bg-muted p-4">
                        <div className="space-y-2 mb-4">
                          {order.lineItems.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.productName} {item.packageType && `(${item.packageType})`}</span>
                              <span>{item.orderedQuantity} {item.unit} @ ${item.unitPrice} = ${(item.orderedQuantity * item.unitPrice).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        {order.deliveryWindow?.notes && (
                          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 mb-4">
                            <strong>Note:</strong> {order.deliveryWindow.notes}
                          </div>
                        )}
                        <div className="flex gap-3">
                          {order.status === 'in_transit' ? (
                            <button onClick={() => setInvoiceModalOrder(order)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
                              <Receipt className="w-4 h-4" /> Record Invoice
                            </button>
                          ) : (
                            <>
                              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                                <Phone className="w-4 h-4" /> Call In Delivery
                              </button>
                              <button onClick={() => setInvoiceModalOrder(order)} className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-background rounded-lg text-sm font-medium text-foreground">
                                <Receipt className="w-4 h-4" /> Record Invoice
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pending Deliveries Tab */}
        {activeTab === 'pending' && (
          <PendingDeliveriesDashboard />
        )}

        {/* Package Pricing Tab */}
        {activeTab === 'pricing' && (
          <PackageTierPreview />
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
          <div className="flex gap-3 text-sm text-emerald-800">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Try it:</strong> Click on an order to expand it, then click "Record Invoice" to see the landed cost calculation with freight allocation.
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      <RecordInvoiceModal
        isOpen={!!invoiceModalOrder}
        onClose={() => setInvoiceModalOrder(null)}
        order={invoiceModalOrder}
      />
    </div>
  );
};

export default OrdersView;
