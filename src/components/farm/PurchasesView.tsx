import React, { useState, useMemo } from 'react';
import { Plus, Truck, CheckCircle, DollarSign, Package, Calendar, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/calculations';
import type { Vendor, ProductMaster, VendorOffering } from '@/types';
import type { SimplePurchase, NewSimplePurchase } from '@/types/simplePurchase';
import type { NewPriceRecord, PriceRecord } from '@/types/priceRecord';
import { RecordPurchaseModal } from './RecordPurchaseModal';

interface PurchasesViewProps {
  purchases: SimplePurchase[];
  vendors: Vendor[];
  products: ProductMaster[];
  vendorOfferings: VendorOffering[];
  priceRecords: PriceRecord[];
  currentSeasonId: string;
  currentSeasonYear: number;
  onAddPurchase: (purchase: NewSimplePurchase) => Promise<SimplePurchase | null>;
  onUpdatePurchase: (id: string, updates: Partial<SimplePurchase>) => Promise<boolean>;
  onDeletePurchase: (id: string) => Promise<boolean>;
  onAddPriceRecord: (record: NewPriceRecord) => Promise<any>;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  purchases,
  vendors,
  products,
  vendorOfferings,
  priceRecords,
  currentSeasonId,
  currentSeasonYear,
  onAddPurchase,
  onUpdatePurchase,
  onDeletePurchase,
  onAddPriceRecord,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<SimplePurchase | null>(null);

  // Filter to current season
  const seasonPurchases = useMemo(() => 
    purchases.filter(p => p.seasonId === currentSeasonId),
    [purchases, currentSeasonId]
  );

  // Split by status
  const awaitingDelivery = seasonPurchases.filter(p => p.status === 'ordered');
  const received = seasonPurchases.filter(p => p.status === 'received');

  // Calculate summaries
  const totalSpent = seasonPurchases.reduce((sum, p) => sum + p.total, 0);
  const receivedTotal = received.reduce((sum, p) => sum + p.total, 0);
  const awaitingTotal = awaitingDelivery.reduce((sum, p) => sum + p.total, 0);
  const freightTotal = seasonPurchases.reduce((sum, p) => sum + (p.freightCost || 0), 0);

  const getVendorName = (vendorId: string) => 
    vendors.find(v => v.id === vendorId)?.name || 'Unknown Vendor';

  const getProductNames = (lines: any[]) => {
    if (!lines || lines.length === 0) return 'No items';
    const names = lines.slice(0, 3).map(item => {
      const product = products.find(p => p.id === item.productId);
      return product?.name || 'Unknown';
    });
    const suffix = lines.length > 3 ? `, +${lines.length - 3} more` : '';
    return names.join(', ') + suffix;
  };

  const handleMarkReceived = async (purchase: SimplePurchase) => {
    await onUpdatePurchase(purchase.id, {
      status: 'received',
      receivedDate: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Purchases</h2>
          <p className="text-muted-foreground mt-1">Track orders and deliveries for {currentSeasonYear}</p>
        </div>
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Record Purchase
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">{currentSeasonYear} season</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(receivedTotal)}</div>
            <p className="text-xs text-muted-foreground">{received.length} purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(awaitingTotal)}</div>
            <p className="text-xs text-muted-foreground">{awaitingDelivery.length} purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Freight (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{formatCurrency(freightTotal)}</div>
            <p className="text-xs text-muted-foreground">Tracked separately</p>
          </CardContent>
        </Card>
      </div>

      {/* Awaiting Delivery */}
      {awaitingDelivery.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            Awaiting Delivery
          </h3>
          <div className="space-y-3">
            {awaitingDelivery.map(purchase => (
              <Card key={purchase.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {new Date(purchase.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="font-semibold text-foreground">{getVendorName(purchase.vendorId)}</span>
                        <span className="font-bold text-foreground">{formatCurrency(purchase.total)}</span>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Ordered
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{getProductNames(purchase.lines)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMarkReceived(purchase)}
                      >
                        Mark Received
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditingPurchase(purchase);
                          setShowAddModal(true);
                        }}
                      >
                        Details
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Purchase?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this {formatCurrency(purchase.total)} purchase from {getVendorName(purchase.vendorId)}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => onDeletePurchase(purchase.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Received
          </h3>
          <div className="space-y-3">
            {received.map(purchase => (
              <Card key={purchase.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {new Date(purchase.receivedDate || purchase.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="font-semibold text-foreground">{getVendorName(purchase.vendorId)}</span>
                        <span className="font-bold text-foreground">{formatCurrency(purchase.total)}</span>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Received
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{getProductNames(purchase.lines)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setEditingPurchase(purchase);
                          setShowAddModal(true);
                        }}
                      >
                        Details
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Purchase?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this {formatCurrency(purchase.total)} purchase from {getVendorName(purchase.vendorId)}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => onDeletePurchase(purchase.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {seasonPurchases.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No purchases recorded</h3>
            <p className="text-muted-foreground mb-4">Record your first purchase to start tracking orders and prices.</p>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Record Purchase
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <RecordPurchaseModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingPurchase(null);
        }}
        onSave={async (purchase) => {
          if (editingPurchase) {
            // Update existing purchase
            const success = await onUpdatePurchase(editingPurchase.id, purchase);
            return success ? { ...editingPurchase, ...purchase } as SimplePurchase : null;
          } else {
            // Create new purchase
            return onAddPurchase(purchase);
          }
        }}
        onCreatePriceRecords={async (records) => {
          for (const record of records) {
            await onAddPriceRecord(record);
          }
        }}
        vendors={vendors}
        products={products}
        vendorOfferings={vendorOfferings}
        priceRecords={priceRecords}
        currentSeasonId={currentSeasonId}
        currentSeasonYear={currentSeasonYear}
        editingPurchase={editingPurchase || undefined}
      />
    </div>
  );
};
