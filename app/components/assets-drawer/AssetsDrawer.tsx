// components/AssetsDrawer.tsx
'use client';

import { CAMPING_DAYS, FLOORING } from "./AssetsList";
import { Button } from "@mui/material";
import CategoryAccordion from "../category-accordion/CategoryAccordion";

export interface AssetDef {
  id: string;
  name: string;
  widthInTiles: number;
  lengthInTiles: number;
  color: number;
  src: string;
  scaleModifier?: number; // Manual scale tweak (e.g. 1.2 or 0.85)
  anchorY?: number;       // Fine-tune bottom alignment (default 1.0)
  offsetY?: number;       // Pixel shift: positive moves DOWN, negative moves UP
  offsetX?: number;
}

export default function AssetsDrawer() {
  return (
    <div className="w-100 overflow-auto bg-neutral-800 p-4 flex flex-col gap-3 rounded-lg">
      <h2 className="text-lg font-bold text-white mb-2">Asset Palette</h2>
      <Button 
        variant="contained" 
        color="error"
        onClick={() => {
          // Clear all placed assets logic here
        }}
      >
        Clear All
      </Button>
      <CategoryAccordion title="Camping Days" assetDefs={CAMPING_DAYS} />
      <CategoryAccordion title="Flooring" assetDefs={FLOORING} />
    </div>
  );
}