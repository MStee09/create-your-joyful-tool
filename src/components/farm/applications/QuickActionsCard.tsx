import React from 'react';
import { Clipboard, Calculator, ShoppingCart, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsCardProps {
  onRecordApplication: () => void;
  onMixCalculator: () => void;
  onNewPurchase: () => void;
  onRecordDelivery?: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onRecordApplication,
  onMixCalculator,
  onNewPurchase,
  onRecordDelivery,
}) => {
  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border mb-8">
      <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={onRecordApplication}
        >
          <Clipboard className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium">Record Application</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={onMixCalculator}
        >
          <Calculator className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium">Mix Calculator</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={onNewPurchase}
        >
          <ShoppingCart className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-medium">New Purchase</span>
        </Button>
        
        {onRecordDelivery && (
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2"
            onClick={onRecordDelivery}
          >
            <Truck className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium">Record Delivery</span>
          </Button>
        )}
      </div>
    </div>
  );
};
