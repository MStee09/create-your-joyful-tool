import React, { useState, useEffect, createContext, useContext } from 'react';
import type { AppState, Season, Product, Vendor, InventoryItem } from '@/types/farm';
import { initialVendors, initialProducts, createDefaultCrop } from '@/data/initialData';
import { generateId } from '@/utils/farmUtils';

interface FarmContextType {
  state: AppState;
  currentSeason: Season | null;
  handleSeasonChange: (seasonId: string) => void;
  handleUpdateSeason: (season: Season) => void;
  handleAddSeason: (season: Season) => void;
  handleDeleteSeason: (seasonId: string) => void;
  handleUpdateProducts: (products: Product[]) => void;
  handleUpdateVendors: (vendors: Vendor[]) => void;
  handleUpdateInventory: (inventory: InventoryItem[]) => void;
}

const FarmContext = createContext<FarmContextType | null>(null);

export const useFarm = () => {
  const context = useContext(FarmContext);
  if (!context) throw new Error('useFarm must be used within FarmProvider');
  return context;
};

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('farmcalc-state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved state');
      }
    }
    
    const defaultSeason: Season = {
      id: generateId(),
      year: 2026,
      name: 'Growing Season',
      crops: [
        createDefaultCrop('Corn', 132),
        createDefaultCrop('Edible Beans', 158),
        createDefaultCrop('Small Grains', 130),
      ],
      createdAt: new Date(),
    };
    
    return {
      seasons: [defaultSeason],
      products: initialProducts,
      vendors: initialVendors,
      inventory: [],
      currentSeasonId: defaultSeason.id,
      currentCropId: null,
    };
  });

  useEffect(() => {
    localStorage.setItem('farmcalc-state', JSON.stringify(state));
  }, [state]);

  const currentSeason = state.seasons.find(s => s.id === state.currentSeasonId) || null;

  const handleSeasonChange = (seasonId: string) => {
    setState(prev => ({ ...prev, currentSeasonId: seasonId }));
  };

  const handleUpdateSeason = (updatedSeason: Season) => {
    setState(prev => ({
      ...prev,
      seasons: prev.seasons.map(s => s.id === updatedSeason.id ? updatedSeason : s),
    }));
  };

  const handleAddSeason = (season: Season) => {
    setState(prev => ({
      ...prev,
      seasons: [...prev.seasons, season],
      currentSeasonId: season.id,
    }));
  };

  const handleDeleteSeason = (seasonId: string) => {
    setState(prev => {
      const newSeasons = prev.seasons.filter(s => s.id !== seasonId);
      return {
        ...prev,
        seasons: newSeasons,
        currentSeasonId: newSeasons[0]?.id || null,
      };
    });
  };

  const handleUpdateProducts = (products: Product[]) => {
    setState(prev => ({ ...prev, products }));
  };

  const handleUpdateVendors = (vendors: Vendor[]) => {
    setState(prev => ({ ...prev, vendors }));
  };

  const handleUpdateInventory = (inventory: InventoryItem[]) => {
    setState(prev => ({ ...prev, inventory }));
  };

  return (
    <FarmContext.Provider value={{
      state,
      currentSeason,
      handleSeasonChange,
      handleUpdateSeason,
      handleAddSeason,
      handleDeleteSeason,
      handleUpdateProducts,
      handleUpdateVendors,
      handleUpdateInventory,
    }}>
      {children}
    </FarmContext.Provider>
  );
};
