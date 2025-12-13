import React, { useState } from 'react';
import type { Vendor, ProductMaster, VendorOffering, InventoryItem } from '@/types';
import { VendorsListView } from './VendorsListView';
import { VendorDetailView } from './VendorDetailView';

interface VendorsViewNewProps {
  vendors: Vendor[];
  productMasters: ProductMaster[];
  vendorOfferings: VendorOffering[];
  inventory: InventoryItem[];
  onUpdateVendors: (vendors: Vendor[]) => void;
  onNavigateToProduct: (productId: string) => void;
}

export const VendorsViewNew: React.FC<VendorsViewNewProps> = ({
  vendors,
  productMasters,
  vendorOfferings,
  inventory,
  onUpdateVendors,
  onNavigateToProduct,
}) => {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const selectedVendor = selectedVendorId 
    ? vendors.find(v => v.id === selectedVendorId) 
    : null;

  const handleUpdateVendor = (updatedVendor: Vendor) => {
    onUpdateVendors(
      vendors.map(v => v.id === updatedVendor.id ? updatedVendor : v)
    );
  };

  if (selectedVendor) {
    return (
      <VendorDetailView
        vendor={selectedVendor}
        productMasters={productMasters}
        vendorOfferings={vendorOfferings}
        inventory={inventory}
        onUpdateVendor={handleUpdateVendor}
        onNavigateToProduct={onNavigateToProduct}
        onBack={() => setSelectedVendorId(null)}
      />
    );
  }

  return (
    <VendorsListView
      vendors={vendors}
      productMasters={productMasters}
      vendorOfferings={vendorOfferings}
      onUpdateVendors={onUpdateVendors}
      onSelectVendor={setSelectedVendorId}
    />
  );
};
