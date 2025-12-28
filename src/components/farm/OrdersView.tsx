import React, { useState } from 'react';
import {
  Package,
  Truck,
  ChevronRight,
  Plus,
  Search,
  Calendar,
  CheckCircle,
  Clock,
  Building2,
  Phone,
  Receipt,
  Eye,
  Edit,
  XCircle,
  Info,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from './Breadcrumb';
import { RecordInvoiceModal, Order, OrderLineItem } from './RecordInvoiceModal';

// Status configuration
const statusConfig = {
  draft: { label: 'Draft', icon: Edit, bg: 'bg-muted', text: 'text-muted-foreground' },
  ordered: { label: 'Ordered', icon: Clock, bg: 'bg-blue-100', text: 'text-blue-700' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, bg: 'bg-cyan-100', text: 'text-cyan-700' },
  partial: { label: 'Partial', icon: Package, bg: 'bg-amber-100', text: 'text-amber-700' },
  complete: { label: 'Complete', icon: CheckCircle, bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelled: { label: 'Cancelled', icon: XCircle, bg: 'bg-red-100', text: 'text-red-700' },
};

const paymentConfig = {
  unpaid: { label: 'Unpaid', bg: 'bg-muted', text: 'text-muted-foreground' },
  prepaid: { label: 'Prepaid', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  partial: { label: 'Partial Pay', bg: 'bg-amber-100', text: 'text-amber-700' },
  paid: { label: 'Paid', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

// Mock data - will be replaced with real data later
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2026-001',
    vendorName: 'Nutrien Ag Solutions',
    orderDate: '2026-01-15',
    status: 'ordered',
    paymentStatus: 'prepaid',
    deliveryWindow: { month: 'March', notes: 'Call when ground thaws' },
    lineItems: [
      { id: 'li-1', productName: 'AMS 21-0-0-24S', orderedQuantity: 15, receivedQuantity: 0, remainingQuantity: 15, unit: 'tons', unitPrice: 415 },
      { id: 'li-2', productName: 'Urea 46-0-0', orderedQuantity: 12, receivedQuantity: 0, remainingQuantity: 12, unit: 'tons', unitPrice: 510 },
    ],
    subtotal: 12345,
    receivedTotal: 0,
    invoiceCount: 0,
    bidEventId: 'bid-1',
  },
  {
    id: '2',
    orderNumber: 'ORD-2026-002',
    vendorName: 'BW Fusion',
    orderDate: '2026-02-01',
    status: 'ordered',
    paymentStatus: 'unpaid',
    deliveryWindow: { month: 'April' },
    lineItems: [
      { id: 'li-3', productName: 'Humical', orderedQuantity: 20, remainingQuantity: 20, unit: 'gal', unitPrice: 42 },
      { id: 'li-4', productName: 'BW-AmiNo', orderedQuantity: 15, remainingQuantity: 15, unit: 'gal', unitPrice: 45.50 },
    ],
    subtotal: 1522.50,
    receivedTotal: 0,
    invoiceCount: 0,
  },
  {
    id: '3',
    orderNumber: 'ORD-2026-003',
    vendorName: 'CHS',
    orderDate: '2026-02-10',
    status: 'partial',
    paymentStatus: 'partial',
    deliveryWindow: { month: 'March' },
    lineItems: [
      { id: 'li-5', productName: 'Glyphosate 4.5#', orderedQuantity: 100, remainingQuantity: 50, unit: 'gal', unitPrice: 15 },
      { id: 'li-6', productName: 'Dicamba DGA', orderedQuantity: 30, remainingQuantity: 30, unit: 'gal', unitPrice: 42 },
    ],
    subtotal: 2760,
    receivedTotal: 750,
    invoiceCount: 1,
  },
  {
    id: '4',
    orderNumber: 'ORD-2026-004',
    vendorName: 'Nutrien Ag Solutions',
    orderDate: '2026-01-20',
    status: 'complete',
    paymentStatus: 'paid',
    lineItems: [
      { id: 'li-7', productName: 'MAP 11-52-0', orderedQuantity: 8, remainingQuantity: 0, unit: 'tons', unitPrice: 680 },
    ],
    subtotal: 5440,
    receivedTotal: 5612,
    invoiceCount: 1,
  },
];

interface OrdersViewProps {
  onBack?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onBack }) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<Order | null>(null);

  // Use mock data for now
  const orders = mockOrders;

  const filteredOrders = orders.filter(order => {
    if (filter === 'pending' && !['ordered', 'confirmed'].includes(order.status)) return false;
    if (filter === 'partial' && order.status !== 'partial') return false;
    if (filter === 'complete' && order.status !== 'complete') return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.vendorName.toLowerCase().includes(query) ||
        order.lineItems.some(li => li.productName.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const pendingCount = orders.filter(o => ['ordered', 'confirmed'].includes(o.status)).length;
  const partialCount = orders.filter(o => o.status === 'partial').length;
  const totalOrdered = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalReceived = orders.reduce((sum, o) => sum + o.receivedTotal, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
        )}
        <Breadcrumb items={[{ label: 'Procurement' }, { label: 'Orders' }]} />
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Orders</h1>
          <p className="text-stone-500">Track purchases from order to delivery</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-5 h-5" /> New Order
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Total Ordered</div>
          <div className="text-2xl font-bold text-foreground">${totalOrdered.toLocaleString()}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Received</div>
          <div className="text-2xl font-bold text-emerald-600">${totalReceived.toLocaleString()}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Pending Delivery</div>
          <div className="text-2xl font-bold text-blue-600">${(totalOrdered - totalReceived).toLocaleString()}</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Awaiting Delivery</div>
          <div className="text-2xl font-bold text-amber-600">{pendingCount} orders</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex bg-card rounded-lg p-1 border border-border">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'partial', label: `Partial (${partialCount})` },
            { id: 'complete', label: 'Complete' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.map(order => {
          const statusInfo = statusConfig[order.status];
          const paymentInfo = paymentConfig[order.paymentStatus];
          const StatusIcon = statusInfo.icon;
          const isExpanded = expandedOrderId === order.id;
          const progress = order.subtotal > 0 ? (order.receivedTotal / order.subtotal) * 100 : 0;

          return (
            <div key={order.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${statusInfo.bg} flex items-center justify-center`}>
                    <StatusIcon className={`w-5 h-5 ${statusInfo.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">{order.orderNumber}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${paymentInfo.bg} ${paymentInfo.text}`}>
                        {paymentInfo.label}
                      </span>
                      {order.bidEventId && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                          From Bid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />{order.vendorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />Ordered {new Date(order.orderDate).toLocaleDateString()}
                      </span>
                      {order.deliveryWindow?.month && (
                        <span className="flex items-center gap-1">
                          <Truck className="w-4 h-4" />Delivery: {order.deliveryWindow.month}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">${order.subtotal.toLocaleString()}</div>
                    {order.status === 'partial' && (
                      <div className="text-sm text-muted-foreground">${order.receivedTotal.toLocaleString()} received</div>
                    )}
                    {order.invoiceCount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {order.invoiceCount} invoice{order.invoiceCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
                {order.status === 'partial' && (
                  <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-muted/30">
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Order Items</h4>
                    <div className="space-y-2">
                      {order.lineItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{item.productName}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              {item.orderedQuantity} {item.unit} @ ${item.unitPrice}/{item.unit.replace(/s$/, '')}
                            </span>
                            <span className="font-medium text-foreground w-24 text-right">
                              ${(item.orderedQuantity * item.unitPrice).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {order.deliveryWindow?.notes && (
                    <div className="px-4 pb-4">
                      <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                        <strong>Delivery Notes:</strong> {order.deliveryWindow.notes}
                      </div>
                    </div>
                  )}
                  <div className="px-4 pb-4 flex gap-3">
                    {['ordered', 'confirmed', 'partial'].includes(order.status) && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvoiceModalOrder(order);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Receipt className="w-4 h-4" /> Record Invoice
                      </Button>
                    )}
                    {['ordered', 'confirmed'].includes(order.status) && (
                      <Button variant="secondary" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Call In Delivery
                      </Button>
                    )}
                    <Button variant="outline" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" /> View Details
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No orders found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'Create your first order to get started'}
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <strong>How it works:</strong> Orders track your purchase commitments. When product arrives, click "Record Invoice"
            to enter actual quantities and freight charges. FarmCalc calculates landed costs and updates your inventory automatically.
            <br /><br />
            <strong>Try it:</strong> Click on an order to expand it, then click "Record Invoice" to see the invoice entry flow.
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
