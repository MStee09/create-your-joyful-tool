// ============================================================================
// Inventory Shortage Modal - Handle insufficient stock during application recording
// ============================================================================

import React, { useState } from 'react';
import { AlertTriangle, Package, ShoppingCart, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { InventoryShortage, ShortageResolution } from '@/types/applicationRecord';

function fmt(n: number, decimals = 1) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

interface InventoryShortageModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortages: InventoryShortage[];
  onResolve: (resolution: ShortageResolution) => void;
}

export const InventoryShortageModal: React.FC<InventoryShortageModalProps> = ({
  isOpen,
  onClose,
  shortages,
  onResolve,
}) => {
  const [selectedOption, setSelectedOption] = useState<ShortageResolution['type'] | null>(null);

  const handleResolve = (type: ShortageResolution['type']) => {
    setSelectedOption(type);
    onResolve({ type } as ShortageResolution);
  };

  const totalShortage = shortages.reduce((sum, s) => sum + s.shortage, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            Inventory Shortage Detected
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-stone-600">
            The following products don't have enough inventory to cover this application:
          </p>

          {/* Shortage list */}
          <div className="space-y-2">
            {shortages.map((shortage) => (
              <div
                key={shortage.productId}
                className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div>
                  <div className="font-medium text-stone-900">{shortage.productName}</div>
                  <div className="text-xs text-stone-600">
                    Need {fmt(shortage.needed)} {shortage.unit} • On hand {fmt(shortage.onHand)} {shortage.unit}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-amber-700 font-semibold">
                    -{fmt(shortage.shortage)} {shortage.unit}
                  </div>
                  <div className="text-xs text-stone-500">shortage</div>
                </div>
              </div>
            ))}
          </div>

          {/* Resolution options */}
          <div className="space-y-2 pt-2">
            <div className="text-sm font-semibold text-stone-700">How would you like to proceed?</div>

            <button
              onClick={() => handleResolve('record-purchase')}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                selectedOption === 'record-purchase'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-stone-900">Record Purchase</div>
                <div className="text-xs text-stone-600">
                  Open the purchase form to record incoming product
                </div>
              </div>
            </button>

            <button
              onClick={() => handleResolve('add-carryover')}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                selectedOption === 'add-carryover'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-stone-900">Add Carryover Inventory</div>
                <div className="text-xs text-stone-600">
                  Add existing product from last season or unrecorded stock
                </div>
              </div>
            </button>

            <button
              onClick={() => handleResolve('save-anyway')}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-colors ${
                selectedOption === 'save-anyway'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-stone-900">Save Anyway</div>
                <div className="text-xs text-stone-600">
                  Record the application without deducting inventory (will show negative balance)
                </div>
              </div>
            </button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
