import React, { useState, useMemo } from 'react';
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
import { RecordInvoiceModal } from './RecordInvoiceModal';
import type { Order, OrderLineItem, Invoice, Vendor, ProductMaster } from '@/types';

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

// View-friendly order type with denormalized vendor name
interface OrderViewItem {
  id: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  status: 'draft' | 'ordered' | 'confirmed' | 'partial' | 'complete' | 'cancelled';
  paymentStatus: 'unpaid' | 'prepaid' | 'partial' | 'paid';
  deliveryWindow?: { month?: string; notes?: string };
  lineItems: {
    id: string;
    productId: string;
    productName: string;
    orderedQuantity: number;
    receivedQuantity: number;
    remainingQuantity: number;
    unit: string;
    unitPrice: number;
  }[];
  subtotal: number;
  receivedTotal: number;
  invoiceCount: number;
  bidEventId?: string;
}

interface OrdersViewProps {
  orders: Order[];
  invoices: Invoice[];
  vendors: Vendor[];
  productMasters: ProductMaster[];
  currentSeasonYear: number;
  onUpdateOrders: (orders: Order[]) => void;
  onAddOrder: (order: Order) => void;
  onAddInvoice: (invoice: Invoice) => void;
  onBack?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  invoices,
  vendors,
  productMasters,
  currentSeasonYear,
  onUpdateOrders,
  onAddOrder,
  onAddInvoice,
  onBack,
}) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<OrderViewItem | null>(null);

  // Transform orders to view items with vendor names and product names
  const orderViewItems: OrderViewItem[] = useMemo(() => {
    const vendorMap = new Map(vendors.map(v => [v.id, v.name]));
    const productMap = new Map(productMasters.map(p => [p.id, p.name]));
    
    return orders
      .filter(o => o.seasonYear === currentSeasonYear)
      .map(order => {
        // Count invoices for this order
        const orderInvoices = invoices.filter(i => i.orderId === order.id);
        const receivedTotal = orderInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        
        // Map line items with product names and calculate received quantities
        const lineItems = (order.lineItems || []).map((li: any) => {
          // Sum received quantities from invoices
          const receivedQty = orderInvoices.reduce((sum, inv) => {
            const invLine = (inv.lineItems || []).find((il: any) => il.orderLineItemId === li.id);
            return sum + (invLine?.quantity || 0);
          }, 0);
          
          return {
            id: li.id,
            productId: li.productId,
            productName: productMap.get(li.productId) || li.productId,
            orderedQuantity: li.orderedQuantity || 0,
            receivedQuantity: receivedQty,
            remainingQuantity: (li.orderedQuantity || 0) - receivedQty,
            unit: li.unit || 'gal',
            unitPrice: li.unitPrice || 0,
          };
        });
        
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          vendorId: order.vendorId,
          vendorName: vendorMap.get(order.vendorId) || order.vendorId,
          orderDate: order.orderDate,
          status: order.status,
          paymentStatus: order.paymentStatus,
          deliveryWindow: order.deliveryWindow,
          lineItems,
          subtotal: order.subtotal,
          receivedTotal,
          invoiceCount: orderInvoices.length,
          bidEventId: order.bidEventId,
        };
      });
  }, [orders, invoices, vendors, productMasters, currentSeasonYear]);

  const filteredOrders = orderViewItems.filter(order => {
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

  const pendingCount = orderViewItems.filter(o => ['ordered', 'confirmed'].includes(o.status)).length;
  const partialCount = orderViewItems.filter(o => o.status === 'partial').length;
  const totalOrdered = orderViewItems.reduce((sum, o) => sum + o.subtotal, 0);
  const totalReceived = orderViewItems.reduce((sum, o) => sum + o.receivedTotal, 0);

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
