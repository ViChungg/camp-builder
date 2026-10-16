// components/AssetsDrawer.tsx
'use client';

import { CAMPING_DAYS, FLOORING } from "./AssetsList";
import { Box, Button } from "@mui/material";
import CategoryAccordion from "../category-accordion/CategoryAccordion";
import { usePlacement } from "../context/PlacementContext";

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
  category?: string;       // Optional category for grouping
}

export default function AssetsDrawer() {
  const { triggerClearAll } = usePlacement();
  return (
    <Box
      className="bg-neutral-800 rounded-lg p-4"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: 2,
        width: "30%",
        height: "100%",
        
      }}
    >
      <h2 className="text-lg font-bold text-white mb-2">Asset Palette</h2>
      <Button 
        variant="contained" 
        color="error"
        onClick={() => {
          // Clear all placed assets logic here
          triggerClearAll();
        }}
      >
        Clear All
      </Button>
      <Box
        sx={{
          overflowY: "auto",
        }}
      >
        <CategoryAccordion title="Camping Days" assetDefs={CAMPING_DAYS} />
        <CategoryAccordion title="Flooring" assetDefs={FLOORING} />
      </Box>
    </Box>
  );
}