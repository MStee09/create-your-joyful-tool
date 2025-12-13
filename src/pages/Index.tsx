import React, { useState } from 'react';
import { FarmProvider, useFarm } from '@/contexts/FarmContext';
import { Sidebar, DashboardView, CropPlannerView, ProductsView, VendorsView, InventoryView } from '@/components/farm';
import { ExportView } from '@/components/farm/ExportView';
import { SettingsView } from '@/components/farm/SettingsView';

const FarmApp: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const { 
    state, 
    currentSeason, 
    handleSeasonChange, 
    handleUpdateSeason, 
    handleUpdateProducts, 
    handleUpdateVendors, 
    handleUpdateInventory,
    handleAddSeason,
    handleDeleteSeason
  } = useFarm();

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView season={currentSeason} products={state.products} />;
      case 'crops':
        return (
          <CropPlannerView 
            season={currentSeason} 
            products={state.products} 
            vendors={state.vendors} 
            inventory={state.inventory} 
            onUpdateSeason={handleUpdateSeason} 
          />
        );
      case 'products':
        return (
          <ProductsView 
            products={state.products} 
            vendors={state.vendors} 
            onUpdateProducts={handleUpdateProducts} 
          />
        );
      case 'vendors':
        return (
          <VendorsView 
            vendors={state.vendors} 
            products={state.products} 
            onUpdateVendors={handleUpdateVendors} 
          />
        );
      case 'inventory':
        return (
          <InventoryView 
            inventory={state.inventory} 
            products={state.products} 
            onUpdateInventory={handleUpdateInventory} 
          />
        );
      case 'exports':
        return (
          <ExportView 
            season={currentSeason} 
            products={state.products} 
            vendors={state.vendors} 
            inventory={state.inventory} 
          />
        );
      case 'settings':
        return (
          <SettingsView 
            seasons={state.seasons} 
            onAddSeason={handleAddSeason} 
            onDeleteSeason={handleDeleteSeason} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        seasons={state.seasons} 
        currentSeasonId={state.currentSeasonId} 
        onSeasonChange={handleSeasonChange} 
      />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

const Index: React.FC = () => (
  <FarmProvider>
    <FarmApp />
  </FarmProvider>
);

export default Index;
