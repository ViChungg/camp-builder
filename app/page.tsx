'use client';

import Grid from "@mui/material/Grid";
import AssetsDrawer from "./components/assets-drawer/AssetsDrawer";

import dynamic from 'next/dynamic';
import { PlacementProvider } from "./components/context/PlacementContext";

// Disable SSR to prevent server-side HTML evaluation errors with PixiJS
const IsoMap = dynamic(() => import('./components/canvas/IsoMap'), {
  ssr: false,
});

export default function Home() {
  return (
    <PlacementProvider>
      <Grid 
        container 
        spacing={2}
        sx={{
          margin: 'auto',
          height: '90vh',
          width: '80vw',
        }}
      >
        <IsoMap />
        <AssetsDrawer />
      </Grid>
    </PlacementProvider>
  );
}
