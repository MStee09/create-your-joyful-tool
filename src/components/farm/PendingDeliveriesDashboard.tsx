import React, { useState } from 'react';
import {
  Truck,
  Phone,
  Calendar,
  Building2,
  DollarSign,
  CheckCircle,
  ChevronRight,
  Receipt,
  Sun,
  Bell,
  MoreVertical
} from 'lucide-react';

// Types
interface PendingDelivery {
  id: string;
  orderId: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  vendorPhone?: string;
  expectedMonth: string;
  deliveryNotes?: string;
  status: 'awaiting_call' | 'scheduled' | 'in_transit' | 'ready_to_receive';
  scheduledDate?: string;
  paymentStatus: 'unpaid' | 'prepaid' | 'paid';
  lineItems: {
    productName: string;
    quantity: number;
    unit: string;
    value: number;
  }[];
  totalValue: number;
  priority: 'normal' | 'urgent';
}

// Mock data
const mockDeliveries: PendingDelivery[] = [
  {
    id: 'd1',
    orderId: 'ord-1',
    orderNumber: 'ORD-2026-001',
    vendorId: 'v1',
    vendorName: 'Nutrien Ag Solutions',
    vendorPhone: '(320) 555-0123',
    expectedMonth: 'March',
    deliveryNotes: 'Call when ground thaws',
    status: 'awaiting_call',
    paymentStatus: 'prepaid',
    lineItems: [
      { productName: 'AMS 21-0-0-24S', quantity: 15, unit: 'tons', value: 6225 },
      { productName: 'Urea 46-0-0', quantity: 12, unit: 'tons', value: 6120 },
    ],
    totalValue: 12345,
    priority: 'normal',
  },
  {
    id: 'd2',
    orderId: 'ord-2',
    orderNumber: 'ORD-2026-002',
    vendorId: 'v2',
    vendorName: 'BW Fusion',
    vendorPhone: '(612) 555-0456',
    expectedMonth: 'April',
    status: 'awaiting_call',
    paymentStatus: 'unpaid',
    lineItems: [
      { productName: 'Humical', quantity: 20, unit: 'gal', value: 840 },
      { productName: 'BW-AmiNo', quantity: 15, unit: 'gal', value: 682.50 },
    ],
    totalValue: 1522.50,
    priority: 'normal',
  },
  {
    id: 'd3',
    orderId: 'ord-3',
    orderNumber: 'ORD-2026-005',
    vendorId: 'v1',
    vendorName: 'Nutrien Ag Solutions',
    vendorPhone: '(320) 555-0123',
    expectedMonth: 'March',
    status: 'scheduled',
    scheduledDate: '2026-03-18',
    paymentStatus: 'prepaid',
    lineItems: [
      { productName: 'MAP 11-52-0', quantity: 10, unit: 'tons', value: 6800 },
    ],
    totalValue: 6800,
    priority: 'normal',
  },
  {
    id: 'd4',
    orderId: 'ord-4',
    orderNumber: 'ORD-2026-006',
    vendorId: 'v3',
    vendorName: 'CHS',
    vendorPhone: '(320) 555-0789',
    expectedMonth: 'March',
    status: 'in_transit',
    scheduledDate: '2026-03-15',
    paymentStatus: 'unpaid',
    lineItems: [
      { productName: 'Glyphosate 4.5#', quantity: 50, unit: 'gal', value: 750 },
    ],
    totalValue: 750,
    priority: 'urgent',
  },
];

const statusConfig = {
  awaiting_call: {
    label: 'Awaiting Call-In',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    icon: Phone,
  },
  scheduled: {
    label: 'Scheduled',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    icon: Calendar,
  },
  in_transit: {
    label: 'In Transit',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: Truck,
  },
  ready_to_receive: {
    label: 'Ready to Receive',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    icon: CheckCircle,
  },
};

export const PendingDeliveriesDashboard: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'awaiting_call' | 'scheduled' | 'in_transit'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter deliveries
  const filteredDeliveries = mockDeliveries.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  // Group by status for summary
  const awaitingCall = mockDeliveries.filter(d => d.status === 'awaiting_call');
  const scheduled = mockDeliveries.filter(d => d.status === 'scheduled');
  const inTransit = mockDeliveries.filter(d => d.status === 'in_transit');

  // Calculate totals
  const totalPendingValue = mockDeliveries.reduce((sum, d) => sum + d.totalValue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pending Deliveries</h1>
          <p className="text-muted-foreground">Track orders awaiting delivery</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted">
            <Bell className="w-4 h-4" />
            Set Reminders
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Phone className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{awaitingCall.length}</div>
              <div className="text-sm text-muted-foreground">Awaiting Call</div>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{scheduled.length}</div>
              <div className="text-sm text-muted-foreground">Scheduled</div>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{inTransit.length}</div>
              <div className="text-sm text-muted-foreground">In Transit</div>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                ${(totalPendingValue / 1000).toFixed(1)}k
              </div>
              <div className="text-sm text-muted-foreground">Total Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Hint */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="w-6 h-6 text-amber-500" />
            <div>
              <div className="font-medium text-foreground">Good delivery weather this week</div>
              <div className="text-sm text-muted-foreground">
                Clear skies through Friday. Good time to call in pending deliveries.
              </div>
            </div>
          </div>
          <button className="text-sm text-blue-600 hover:underline">
            View forecast →
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'awaiting_call', label: 'Awaiting Call' },
          { id: 'scheduled', label: 'Scheduled' },
          { id: 'in_transit', label: 'In Transit' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as typeof filter)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === tab.id
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deliveries List */}
      <div className="space-y-3">
        {filteredDeliveries.map(delivery => {
          const statusInfo = statusConfig[delivery.status];
          const StatusIcon = statusInfo.icon;
          const isExpanded = expandedId === delivery.id;

          return (
            <div
              key={delivery.id}
              className="bg-card rounded-xl border border-border overflow-hidden"
            >
              {/* Header */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : delivery.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Status Icon */}
                  <div className={`w-12 h-12 rounded-full ${statusInfo.bg} flex items-center justify-center`}>
                    <StatusIcon className={`w-6 h-6 ${statusInfo.text}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">
                        {delivery.vendorName}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.label}
                      </span>
                      {delivery.priority === 'urgent' && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Urgent
                        </span>
                      )}
                      {delivery.paymentStatus === 'prepaid' && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                          Prepaid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{delivery.orderNumber}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {delivery.scheduledDate 
                          ? new Date(delivery.scheduledDate).toLocaleDateString()
                          : `Expected: ${delivery.expectedMonth}`
                        }
                      </span>
                      <span>•</span>
                      <span>
                        {delivery.lineItems.map(li => `${li.quantity} ${li.unit} ${li.productName}`).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right">
                    <div className="font-semibold text-foreground">
                      ${delivery.totalValue.toLocaleString()}
                    </div>
                  </div>

                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 p-4">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left - Products */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Products</h4>
                      <div className="space-y-2">
                        {delivery.lineItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-card rounded-lg">
                            <div>
                              <div className="font-medium text-foreground">{item.productName}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.quantity} {item.unit}
                              </div>
                            </div>
                            <div className="font-medium text-foreground">
                              ${item.value.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right - Vendor & Actions */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Vendor Contact</h4>
                      <div className="p-3 bg-card rounded-lg mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{delivery.vendorName}</div>
                            {delivery.vendorPhone && (
                              <a href={`tel:${delivery.vendorPhone}`} className="text-sm text-blue-600 hover:underline">
                                {delivery.vendorPhone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {delivery.deliveryNotes && (
                        <div className="p-3 bg-amber-50 rounded-lg mb-4">
                          <div className="text-sm text-amber-800">
                            <strong>Note:</strong> {delivery.deliveryNotes}
                          </div>
                        </div>
                      )}

                      {/* Actions based on status */}
                      <div className="flex flex-col gap-2">
                        {delivery.status === 'awaiting_call' && (
                          <>
                            <button className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
                              <Phone className="w-4 h-4" />
                              Call to Schedule
                            </button>
                            <button className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted">
                              <Calendar className="w-4 h-4" />
                              Set Scheduled Date
                            </button>
                          </>
                        )}
                        {delivery.status === 'scheduled' && (
                          <>
                            <button className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium">
                              <Truck className="w-4 h-4" />
                              Mark In Transit
                            </button>
                            <button className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted">
                              <Calendar className="w-4 h-4" />
                              Reschedule
                            </button>
                          </>
                        )}
                        {delivery.status === 'in_transit' && (
                          <button className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">
                            <Receipt className="w-4 h-4" />
                            Record Invoice / Delivery
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredDeliveries.length === 0 && (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No pending deliveries</h3>
          <p className="text-muted-foreground">
            All orders have been delivered or there are no orders matching this filter.
          </p>
        </div>
      )}

      {/* Upcoming This Week */}
      {scheduled.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Upcoming This Week</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {scheduled.map(delivery => (
                <div key={delivery.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {delivery.scheduledDate ? new Date(delivery.scheduledDate).getDate() : '--'}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {delivery.scheduledDate ? new Date(delivery.scheduledDate).toLocaleDateString('en-US', { weekday: 'short' }) : ''}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{delivery.vendorName}</div>
                      <div className="text-sm text-muted-foreground">
                        {delivery.lineItems.map(li => li.productName).join(', ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">
                      ${delivery.totalValue.toLocaleString()}
                    </span>
                    <button className="p-2 hover:bg-muted rounded-lg">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingDeliveriesDashboard;
