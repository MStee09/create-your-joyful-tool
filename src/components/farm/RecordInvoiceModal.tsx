import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  Receipt,
  X,
  Calculator,
  Trash2,
  Plus,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface OrderLineItem {
  id: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity?: number;
  remainingQuantity: number;
  unit: string;
  unitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  vendorName: string;
  orderDate: string;
  status: 'draft' | 'ordered' | 'confirmed' | 'partial' | 'complete' | 'cancelled';
  paymentStatus: 'unpaid' | 'prepaid' | 'partial' | 'paid';
  deliveryWindow?: { month?: string; notes?: string };
  lineItems: OrderLineItem[];
  subtotal: number;
  receivedTotal: number;
  invoiceCount: number;
  bidEventId?: string;
}

interface InvoiceLineItem extends OrderLineItem {
  quantity: number;
  scaleTicket: string;
  subtotal: number;
}

interface Charge {
  id: string;
  type: string;
  description: string;
  amount: number;
}

interface RecordInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSave?: (data: {
    invoiceNumber: string;
    invoiceDate: string;
    receivedDate: string;
    lineItems: InvoiceLineItem[];
    charges: Charge[];
    total: number;
  }) => void;
}

export const RecordInvoiceModal: React.FC<RecordInvoiceModalProps> = ({
  isOpen,
  onClose,
  order,
  onSave,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [charges, setCharges] = useState<Charge[]>([
    { id: '1', type: 'freight', description: 'Freight', amount: 0 }
  ]);
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  useEffect(() => {
    if (order) {
      setLineItems(
        order.lineItems.map(li => ({
          ...li,
          quantity: li.remainingQuantity,
          scaleTicket: '',
          subtotal: li.remainingQuantity * li.unitPrice,
        }))
      );
    }
  }, [order]);

  const productSubtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
  const chargesTotal = charges.reduce((sum, c) => sum + c.amount, 0);
  const invoiceTotal = productSubtotal + chargesTotal;

  // Calculate freight allocation by weight
  const totalWeight = lineItems.reduce((sum, item) => {
    const mult = item.unit === 'tons' ? 2000 : 10;
    return sum + (item.quantity * mult);
  }, 0);

  const lineItemsWithFreight = lineItems.map(item => {
    const mult = item.unit === 'tons' ? 2000 : 10;
    const weight = item.quantity * mult;
    const ratio = totalWeight > 0 ? weight / totalWeight : 0;
    const allocated = chargesTotal * ratio;
    const landed = item.quantity > 0 ? (item.subtotal + allocated) / item.quantity : 0;
    return { ...item, allocatedFreight: allocated, landedCost: landed };
  });

  const updateQuantity = (id: string, qty: number) => {
    setLineItems(items => items.map(item => {
      if (item.id !== id) return item;
      return { ...item, quantity: qty, subtotal: qty * item.unitPrice };
    }));
  };

  const updateScaleTicket = (id: string, ticket: string) => {
    setLineItems(items => items.map(item => {
      if (item.id !== id) return item;
      return { ...item, scaleTicket: ticket };
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        invoiceNumber,
        invoiceDate,
        receivedDate,
        lineItems,
        charges,
        total: invoiceTotal,
      });
    }
    onClose();
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-border">
        {/* Header */}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="block text-sm font-medium mb-1">Vendor Invoice #</Label>
              <Input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2026-0342"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Received Date</Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" /> Products Received
            </h3>
            <div className="space-y-4">
              {lineItems.map((item, idx) => {
                const withFreight = lineItemsWithFreight[idx];
                return (
                  <div key={item.id} className="p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-foreground">{item.productName}</div>
                        <div className="text-sm text-muted-foreground">
                          Ordered: {item.orderedQuantity} {item.unit} · Remaining: {item.remainingQuantity} {item.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          ${item.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @ ${item.unitPrice}/{item.unit.replace(/s$/, '')}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="block text-xs text-muted-foreground mb-1">Quantity Received</Label>
                        <div className="flex">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseFloat(e.target.value) || 0)}
                            step="0.01"
                            className="rounded-r-none"
                          />
                          <span className="px-3 py-2 bg-muted border border-l-0 border-input rounded-r-md text-muted-foreground text-sm flex items-center">
                            {item.unit}
                          </span>
                        </div>
                      </div>
                      <div>
                        <Label className="block text-xs text-muted-foreground mb-1">Unit Price</Label>
                        <div className="flex">
                          <span className="px-3 py-2 bg-muted border border-r-0 border-input rounded-l-md text-muted-foreground text-sm flex items-center">$</span>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            readOnly
                            className="rounded-l-none bg-muted/50"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="block text-xs text-muted-foreground mb-1">Scale Ticket #</Label>
                        <Input
                          type="text"
                          placeholder="4521"
                          value={item.scaleTicket}
                          onChange={(e) => updateScaleTicket(item.id, e.target.value)}
                        />
                      </div>
                    </div>
                    {chargesTotal > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">+ Allocated Freight</span>
                          <span className="text-foreground">${withFreight.allocatedFreight.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-medium mt-1">
                          <span className="text-emerald-600">Landed Cost</span>
                          <span className="text-emerald-600">
                            ${withFreight.landedCost.toFixed(2)}/{item.unit.replace(/s$/, '')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mt-3">
              <div className="text-right">
                <span className="text-sm text-muted-foreground">Product Subtotal:</span>
                <span className="ml-3 text-lg font-semibold text-foreground">
                  ${productSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Freight & Charges */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Truck className="w-4 h-4" /> Freight & Charges
              </h3>
              <button
                onClick={() => setCharges([...charges, { id: Date.now().toString(), type: 'other', description: 'Additional Charge', amount: 0 }])}
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
              >
                <Plus className="w-4 h-4" /> Add Charge
              </button>
            </div>
            <div className="space-y-2">
              {charges.map(charge => (
                <div key={charge.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <Truck className="w-5 h-5 text-muted-foreground" />
                    <Input
                      value={charge.description}
                      onChange={(e) => setCharges(charges.map(c => c.id === charge.id ? { ...c, description: e.target.value } : c))}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex">
                      <span className="px-3 py-2 bg-muted border border-r-0 border-input rounded-l-md text-muted-foreground text-sm flex items-center">$</span>
                      <Input
                        type="number"
                        value={charge.amount}
                        onChange={(e) => setCharges(charges.map(c => c.id === charge.id ? { ...c, amount: parseFloat(e.target.value) || 0 } : c))}
                        className="w-24 rounded-l-none"
                      />
                    </div>
                    <button
                      onClick={() => setCharges(charges.filter(c => c.id !== charge.id))}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {charges.length > 0 && (
              <div className="flex justify-end mt-3">
                <span className="text-sm text-muted-foreground">Charges Total:</span>
                <span className="ml-3 text-lg font-semibold text-foreground">${chargesTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
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
                    <span className="font-medium text-emerald-800">
                      ${item.landedCost.toFixed(2)}/{item.unit.replace(/s$/, '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Invoice Total</div>
              <div className="text-2xl font-bold text-foreground">
                ${invoiceTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Save Invoice & Update Inventory
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
