import React, { useState, useMemo } from 'react';
import { Plus, Truck, CheckCircle, DollarSign, Package, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/calculations';
import type { Vendor, ProductMaster, Order } from '@/types';

interface PurchasesViewProps {
  orders: Order[];
  vendors: Vendor[];
  products: ProductMaster[];
  currentSeasonYear: number;
  onUpdateOrders: (orders: Order[]) => Promise<void>;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  orders,
  vendors,
  products,
  currentSeasonYear,
  onUpdateOrders,
}) => {
  // Filter to current season
  const seasonOrders = useMemo(() => 
    orders.filter(o => o.seasonYear === currentSeasonYear),
    [orders, currentSeasonYear]
  );

  // Split by status
  const awaitingDelivery = seasonOrders.filter(o => 
    o.status === 'ordered' || o.status === 'draft' || o.status === 'confirmed'
  );
  const received = seasonOrders.filter(o => 
    o.status === 'complete' || o.status === 'partial'
  );

  // Calculate summaries
  const totalSpent = seasonOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const receivedTotal = received.reduce((sum, o) => sum + o.subtotal, 0);
  const awaitingTotal = awaitingDelivery.reduce((sum, o) => sum + o.subtotal, 0);

  const getVendorName = (vendorId: string) => 
    vendors.find(v => v.id === vendorId)?.name || 'Unknown Vendor';

  const getProductNames = (lineItems: any[]) => {
    if (!lineItems || lineItems.length === 0) return 'No items';
    const names = lineItems.slice(0, 3).map(item => {
      const product = products.find(p => p.id === item.productId);
      return product?.name || 'Unknown';
    });
    const suffix = lineItems.length > 3 ? `, +${lineItems.length - 3} more` : '';
    return names.join(', ') + suffix;
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-stone-800">Purchases</h2>
          <p className="text-stone-500 mt-1">Track orders and deliveries for {currentSeasonYear}</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Record Purchase
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-800">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-stone-500">{currentSeasonYear} season</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(receivedTotal)}</div>
            <p className="text-xs text-stone-500">{received.length} purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Awaiting Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(awaitingTotal)}</div>
            <p className="text-xs text-stone-500">{awaitingDelivery.length} purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-stone-500">Freight (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-stone-600">$0</div>
            <p className="text-xs text-stone-500">Not tracked yet</p>
          </CardContent>
        </Card>
      </div>

      {/* Awaiting Delivery */}
      {awaitingDelivery.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-stone-700 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            Awaiting Delivery
          </h3>
          <div className="space-y-3">
            {awaitingDelivery.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-stone-500">
                          {new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="font-semibold text-stone-800">{getVendorName(order.vendorId)}</span>
                        <span className="font-bold text-stone-900">{formatCurrency(order.subtotal)}</span>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Ordered
                        </Badge>
                      </div>
                      <p className="text-sm text-stone-500 mt-1">{getProductNames(order.lineItems)}</p>
                    </div>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Received */}
      {received.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-stone-700 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Received
          </h3>
          <div className="space-y-3">
            {received.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-stone-500">
                          {new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="font-semibold text-stone-800">{getVendorName(order.vendorId)}</span>
                        <span className="font-bold text-stone-900">{formatCurrency(order.subtotal)}</span>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Received
                        </Badge>
                      </div>
                      <p className="text-sm text-stone-500 mt-1">{getProductNames(order.lineItems)}</p>
                    </div>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {seasonOrders.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-600 mb-2">No purchases recorded</h3>
            <p className="text-stone-500 mb-4">Record your first purchase to start tracking orders and prices.</p>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Record Purchase
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
