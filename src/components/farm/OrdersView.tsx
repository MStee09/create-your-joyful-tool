import React, { useState } from 'react';
import {
  Package,
  Truck,
  FileText,
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
  XCircle
} from 'lucide-react';
import { RecordInvoiceModal, Order as ModalOrder } from './RecordInvoiceModal';

// Types
type OrderStatus = 'draft' | 'ordered' | 'confirmed' | 'partial' | 'complete' | 'cancelled';
type PaymentStatus = 'unpaid' | 'prepaid' | 'partial' | 'paid';

interface Order {
  id: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryWindow?: { month?: string; notes?: string };
  lineItems: { productName: string; quantity: number; unit: string; unitPrice: number }[];
  subtotal: number;
  receivedTotal: number;
  invoiceCount: number;
  bidEventId?: string;
  notes?: string;
}

// Mock data
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2026-001',
    vendorId: 'v1',
    vendorName: 'Nutrien Ag Solutions',
    orderDate: '2026-01-15',
    status: 'ordered',
    paymentStatus: 'prepaid',
    deliveryWindow: { month: 'March', notes: 'Call when ground thaws' },
    lineItems: [
      { productName: 'AMS 21-0-0-24S', quantity: 15, unit: 'tons', unitPrice: 415 },
      { productName: 'Urea 46-0-0', quantity: 12, unit: 'tons', unitPrice: 510 },
    ],
    subtotal: 12345,
    receivedTotal: 0,
    invoiceCount: 0,
    bidEventId: 'bid-1',
  },
  {
    id: '2',
    orderNumber: 'ORD-2026-002',
    vendorId: 'v2',
    vendorName: 'BW Fusion',
    orderDate: '2026-02-01',
    status: 'ordered',
    paymentStatus: 'unpaid',
    deliveryWindow: { month: 'April' },
    lineItems: [
      { productName: 'Humical', quantity: 20, unit: 'gal', unitPrice: 42 },
      { productName: 'BW-AmiNo', quantity: 15, unit: 'gal', unitPrice: 45.50 },
    ],
    subtotal: 1522.50,
    receivedTotal: 0,
    invoiceCount: 0,
  },
  {
    id: '3',
    orderNumber: 'ORD-2026-003',
    vendorId: 'v3',
    vendorName: 'CHS',
    orderDate: '2026-02-10',
    status: 'partial',
    paymentStatus: 'partial',
    deliveryWindow: { month: 'March' },
    lineItems: [
      { productName: 'Glyphosate 4.5#', quantity: 100, unit: 'gal', unitPrice: 15 },
      { productName: 'Dicamba DGA', quantity: 30, unit: 'gal', unitPrice: 42 },
    ],
    subtotal: 2760,
    receivedTotal: 1500,
    invoiceCount: 1,
  },
  {
    id: '4',
    orderNumber: 'ORD-2026-004',
    vendorId: 'v1',
    vendorName: 'Nutrien Ag Solutions',
    orderDate: '2026-01-20',
    status: 'complete',
    paymentStatus: 'paid',
    lineItems: [
      { productName: 'MAP 11-52-0', quantity: 8, unit: 'tons', unitPrice: 680 },
    ],
    subtotal: 5440,
    receivedTotal: 5612,
    invoiceCount: 1,
  },
];

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'gray', icon: Edit },
  ordered: { label: 'Ordered', color: 'blue', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'cyan', icon: CheckCircle },
  partial: { label: 'Partial', color: 'amber', icon: Package },
  complete: { label: 'Complete', color: 'emerald', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'red', icon: XCircle },
};

const paymentConfig: Record<PaymentStatus, { label: string; color: string }> = {
  unpaid: { label: 'Unpaid', color: 'gray' },
  prepaid: { label: 'Prepaid', color: 'emerald' },
  partial: { label: 'Partial', color: 'amber' },
  paid: { label: 'Paid', color: 'emerald' },
};

const getStatusClasses = (color: string) => ({
  bg: color === 'gray' ? 'bg-muted' : 
      color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
      color === 'cyan' ? 'bg-cyan-100 dark:bg-cyan-900/30' :
      color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30' :
      color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
      color === 'red' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted',
  text: color === 'gray' ? 'text-muted-foreground' :
        color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
        color === 'cyan' ? 'text-cyan-600 dark:text-cyan-400' :
        color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
        color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
        color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
});

export const OrdersView: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'partial' | 'complete'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<ModalOrder | null>(null);

  // Convert local Order to modal Order format
  const toModalOrder = (order: Order): ModalOrder => ({
    id: order.id,
    orderNumber: order.orderNumber,
    vendorName: order.vendorName,
    orderDate: order.orderDate,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveryWindow: order.deliveryWindow,
    subtotal: order.subtotal,
    receivedTotal: order.receivedTotal,
    invoiceCount: order.invoiceCount,
    bidEventId: order.bidEventId,
    lineItems: order.lineItems.map((li, idx) => ({
      id: `li-${idx}`,
      productName: li.productName,
      orderedQuantity: li.quantity,
      receivedQuantity: 0,
      remainingQuantity: li.quantity,
      unit: li.unit,
      unitPrice: li.unitPrice,
    })),
  });

  const filteredOrders = mockOrders.filter(order => {
    if (filter === 'pending' && !['ordered', 'confirmed'].includes(order.status)) return false;
    if (filter === 'partial' && order.status !== 'partial') return false;
    if (filter === 'complete' && order.status !== 'complete') return false;
    if (searchQuery && !order.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const pendingCount = mockOrders.filter(o => ['ordered', 'confirmed'].includes(o.status)).length;
  const partialCount = mockOrders.filter(o => o.status === 'partial').length;

  // Calculate totals
  const totalOrdered = mockOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalReceived = mockOrders.reduce((sum, o) => sum + o.receivedTotal, 0);
  const totalPending = totalOrdered - totalReceived;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Track purchases from order to delivery</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">
          <Plus className="w-5 h-5" />
          New Order
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Total Ordered</div>
          <div className="text-2xl font-bold text-foreground">
            ${totalOrdered.toLocaleString()}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Received</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ${totalReceived.toLocaleString()}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Pending Delivery</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${totalPending.toLocaleString()}
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground mb-1">Awaiting Delivery</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingCount} orders
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex bg-muted rounded-lg p-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: `Pending (${pendingCount})` },
            { id: 'partial', label: `Partial (${partialCount})` },
            { id: 'complete', label: 'Complete' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-card text-foreground shadow-sm'
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
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground text-sm w-64"
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
          const statusClasses = getStatusClasses(statusInfo.color);
          const paymentClasses = getStatusClasses(paymentInfo.color);

          return (
            <div
              key={order.id}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              {/* Order Header */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  <div className={`w-10 h-10 rounded-full ${statusClasses.bg} flex items-center justify-center`}>
                    <StatusIcon className={`w-5 h-5 ${statusClasses.text}`} />
                  </div>

                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">
                        {order.orderNumber}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusClasses.bg} ${statusClasses.text}`}>
                        {statusInfo.label}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${paymentClasses.bg} ${paymentClasses.text}`}>
                        {paymentInfo.label}
                      </span>
                      {order.bidEventId && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                          From Bid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {order.vendorName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Ordered {new Date(order.orderDate).toLocaleDateString()}
                      </span>
                      {order.deliveryWindow?.month && (
                        <span className="flex items-center gap-1">
                          <Truck className="w-4 h-4" />
                          Delivery: {order.deliveryWindow.month}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount & Progress */}
                  <div className="text-right">
                    <div className="font-semibold text-foreground">
                      ${order.subtotal.toLocaleString()}
                    </div>
                    {order.status === 'partial' && (
                      <div className="text-sm text-muted-foreground">
                        ${order.receivedTotal.toLocaleString()} received
                      </div>
                    )}
                    {order.invoiceCount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {order.invoiceCount} invoice{order.invoiceCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Expand Arrow */}
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {/* Progress Bar (for partial) */}
                {order.status === 'partial' && (
                  <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30">
                  {/* Line Items */}
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Order Items</h4>
                    <div className="space-y-2">
                      {order.lineItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{item.productName}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              {item.quantity} {item.unit} @ ${item.unitPrice}/{item.unit.replace(/s$/, '')}
                            </span>
                            <span className="font-medium text-foreground w-24 text-right">
                              ${(item.quantity * item.unitPrice).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Notes */}
                  {order.deliveryWindow?.notes && (
                    <div className="px-4 pb-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                        <strong>Delivery Notes:</strong> {order.deliveryWindow.notes}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-3">
                    {['ordered', 'confirmed', 'partial'].includes(order.status) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvoiceModalOrder(toModalOrder(order));
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
                      >
                        <Receipt className="w-4 h-4" />
                        Record Invoice
                      </button>
                    )}
                    {['ordered', 'confirmed'].includes(order.status) && (
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                        <Phone className="w-4 h-4" />
                        Call In Delivery
                      </button>
                    )}
                    <button className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors">
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-lg text-sm font-medium text-foreground transition-colors">
                      <FileText className="w-4 h-4" />
                      View Invoices
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No orders found</h3>
          <p className="text-muted-foreground mb-4">
            {filter !== 'all' ? 'Try changing your filter.' : 'Create your first order to get started.'}
          </p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">
            <Plus className="w-5 h-5" />
            New Order
          </button>
        </div>
      )}

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
