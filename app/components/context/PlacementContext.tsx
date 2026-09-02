// context/PlacementContext.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';
import { AssetDef } from '../assets-drawer/AssetsDrawer';

interface PlacementContextType {
  placingAsset: AssetDef | null;
  startPlacing: (asset: AssetDef) => void;
  clearPlacing: () => void;
}

const PlacementContext = createContext<PlacementContextType | undefined>(undefined);

export function PlacementProvider({ children }: { children: React.ReactNode }) {
  const [placingAsset, setPlacingAsset] = useState<AssetDef | null>(null);

  const startPlacing = (asset: AssetDef) => setPlacingAsset(asset);
  const clearPlacing = () => setPlacingAsset(null);

  return (
    <PlacementContext.Provider value={{ placingAsset, startPlacing, clearPlacing }}>
      {children}
    </PlacementContext.Provider>
  );
}

export function usePlacement() {
  const context = useContext(PlacementContext);
  if (!context) {
    throw new Error('usePlacement must be used within a PlacementProvider');
  }
  return context;
}