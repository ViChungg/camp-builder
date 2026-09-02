// components/IsoMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { AssetDef } from '../assets-drawer/AssetsDrawer';
import { usePlacement } from '../context/PlacementContext';

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const GRID_SIZE = 60;

interface MovingAssetData {
  sprite: PIXI.Sprite;
  asset: AssetDef;
  isFlipped: boolean;
}

interface SelectedAssetState {
  sprite: PIXI.Sprite;
  asset: AssetDef;
  gx: number;
  gy: number;
  isFlipped: boolean;
  menuPos: { x: number; y: number };
}

export default function IsoMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);
  const highlightGraphicRef = useRef<PIXI.Graphics | null>(null);

  const { placingAsset, clearPlacing } = usePlacement();

  const [selectedAsset, setSelectedAsset] = useState<SelectedAssetState | null>(null);
  const [movingAsset, setMovingAsset] = useState<MovingAssetData | null>(null);

  const movingAssetRef = useRef<MovingAssetData | null>(null);
  movingAssetRef.current = movingAsset;

  // React to Context updates when an asset is clicked in CategoryAccordion
  useEffect(() => {
    if (!placingAsset || !worldRef.current) return;

    // Capture in a constant so TypeScript knows it won't mutate or become null
    const currentAsset = placingAsset;
    let isActive = true;

    async function preparePlacement() {
      const imageSrc = currentAsset.src || '/assets/placeholder.png';
      try {
        const texture = await PIXI.Assets.load(imageSrc);
        if (!isActive || !worldRef.current) return;

        const sprite = new PIXI.Sprite(texture);
        const W = currentAsset.widthInTiles;
        const L = currentAsset.lengthInTiles;

        const targetFootprintWidth = (W + L) * (TILE_WIDTH / 2);
        const baseScale = targetFootprintWidth / texture.width;
        const finalScale = baseScale * (currentAsset.scaleModifier || 1.0);

        sprite.scale.set(finalScale);
        sprite.anchor.set(0.5, 1.0);
        sprite.alpha = 0.6;

        worldRef.current.addChild(sprite);

        setSelectedAsset(null);
        setMovingAsset({
          sprite,
          asset: currentAsset,
          isFlipped: false,
        });

        // Clear context state now that IsoMap internal state owns movingAsset
        clearPlacing();
      } catch (err) {
        console.error('Failed to load asset for placement:', err);
      }
    }

    preparePlacement();

    return () => {
      isActive = false;
    };
  }, [placingAsset, clearPlacing]);

  // Screen to Grid math helpers
  const gridToScreen = (gx: number, gy: number) => ({
    x: (gx - gy) * (TILE_WIDTH / 2),
    y: (gx + gy) * (TILE_HEIGHT / 2),
  });

  const screenToGrid = (sx: number, sy: number) => {
    const gx = (sx / (TILE_WIDTH / 2) + sy / (TILE_HEIGHT / 2)) / 2;
    const gy = (sy / (TILE_HEIGHT / 2) - sx / (TILE_WIDTH / 2)) / 2;
    return { gx: Math.floor(gx), gy: Math.floor(gy) };
  };

  const drawFootprintHighlight = (gx: number, gy: number, W: number, L: number, isValid: boolean) => {
    const graphic = highlightGraphicRef.current;
    if (!graphic) return;

    graphic.clear();

    if (gx < 0 || gy < 0 || gx + W > GRID_SIZE || gy + L > GRID_SIZE) {
      return;
    }

    // 1. Top apex: Top corner of origin tile (gx, gy)
    const top = gridToScreen(gx, gy);

    // 2. Right corner: Rightmost point of tile (gx + W - 1, gy)
    const rightBase = gridToScreen(gx + W - 1, gy);
    const right = {
      x: rightBase.x + TILE_WIDTH / 2,
      y: rightBase.y + TILE_HEIGHT / 2,
    };

    // 3. Bottom apex: Bottommost point of tile (gx + W - 1, gy + L - 1)
    const bottomBase = gridToScreen(gx + W - 1, gy + L - 1);
    const bottom = {
      x: bottomBase.x,
      y: bottomBase.y + TILE_HEIGHT,
    };

    // 4. Left corner: Leftmost point of tile (gx, gy + L - 1)
    const leftBase = gridToScreen(gx, gy + L - 1);
    const left = {
      x: leftBase.x - TILE_WIDTH / 2,
      y: leftBase.y + TILE_HEIGHT / 2,
    };

    const fillColor = isValid ? 0x3b82f6 : 0xef4444;
    const strokeColor = isValid ? 0x60a5fa : 0xf87171;

    graphic.poly([
      top.x, top.y,
      right.x, right.y,
      bottom.x, bottom.y,
      left.x, left.y,
    ]);
    graphic.fill({ color: fillColor, alpha: 0.35 });
    graphic.stroke({ width: 2, color: strokeColor });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let isDestroyed = false;

    async function init() {
      const app = new PIXI.Application();
      await app.init({
        width: 1000,
        height: 800,
        backgroundColor: 0x1a1a1a,
        antialias: true,
      });

      if (isDestroyed) {
        if (typeof app.destroy === 'function') {
          app.destroy(true, { children: true, texture: true });
        }
        return;
      }

      appRef.current = app;
      if (containerRef.current) containerRef.current.appendChild(app.canvas);

      const world = new PIXI.Container();
      world.x = app.screen.width / 2;
      world.y = 80;
      world.sortableChildren = true;
      app.stage.addChild(world);
      worldRef.current = world;

      // Overlay Graphic for footprint selection
      const highlightGraphic = new PIXI.Graphics();
      highlightGraphic.zIndex = 999999;
      world.addChild(highlightGraphic);
      highlightGraphicRef.current = highlightGraphic;

      // -------------------------------------------------------------
      // 1. PAN / MOVE EVENTS (Using Refs to access current state)
      // -------------------------------------------------------------
      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;

      let isDraggingPan = false;
      let dragStart = { x: 0, y: 0 };
      let pointerDownPos = { x: 0, y: 0 };

      app.stage.on('pointerdown', (e) => {
        if (movingAssetRef.current) return;

        isDraggingPan = true;
        dragStart = {
          x: e.global.x - world.x,
          y: e.global.y - world.y,
        };
        pointerDownPos = { x: e.global.x, y: e.global.y };
      });

      app.stage.on('pointermove', (e) => {
        const activeMoving = movingAssetRef.current;

        if (activeMoving) {
          const localPos = world.toLocal(e.global);
          const cursorGrid = screenToGrid(localPos.x, localPos.y);

          const W = activeMoving.asset.widthInTiles;
          const L = activeMoving.asset.lengthInTiles;

          // Treat cursor tile as the bottom-most tile (front corner) of the asset
          const gx = cursorGrid.gx - (W - 1);
          const gy = cursorGrid.gy - (L - 1);

          const top = gridToScreen(gx, gy);
          const bottomBase = gridToScreen(gx + W - 1, gy + L - 1);

          const footprintCenterX = top.x;
          const footprintCenterY = (top.y + bottomBase.y + TILE_HEIGHT) / 2;

          activeMoving.sprite.x = footprintCenterX + (activeMoving.asset.offsetX || 0);
          activeMoving.sprite.y = footprintCenterY + (activeMoving.asset.offsetY || 0);
          activeMoving.sprite.zIndex = bottomBase.y + TILE_HEIGHT;

          const isValid = gx >= 0 && gy >= 0 && gx + W <= GRID_SIZE && gy + L <= GRID_SIZE;
          drawFootprintHighlight(gx, gy, W, L, isValid);
          return;
        }

        if (isDraggingPan) {
          world.x = e.global.x - dragStart.x;
          world.y = e.global.y - dragStart.y;
        }
      });

      const stopDragging = (e: PIXI.FederatedPointerEvent) => {
        const distMoved = Math.hypot(e.global.x - pointerDownPos.x, e.global.y - pointerDownPos.y);
        if (distMoved < 5 && e.target === app.stage) {
          setSelectedAsset(null);
        }
        isDraggingPan = false;
      };

      app.stage.on('pointerup', stopDragging);
      app.stage.on('pointerupoutside', stopDragging);

      // -------------------------------------------------------------
      // 2. ZOOM LOGIC
      // -------------------------------------------------------------
      const canvasElement = app.canvas;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const minScale = 0.2;
        const maxScale = 3.0;

        const currentScale = world.scale.x;
        let newScale = currentScale * zoomFactor;
        newScale = Math.max(minScale, Math.min(maxScale, newScale));

        if (newScale === currentScale) return;

        const rect = canvasElement.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldPos = {
          x: (mouseX - world.x) / currentScale,
          y: (mouseY - world.y) / currentScale,
        };

        world.scale.set(newScale);
        world.x = mouseX - worldPos.x * newScale;
        world.y = mouseY - worldPos.y * newScale;

        setSelectedAsset(null);
      };

      canvasElement.addEventListener('wheel', handleWheel, { passive: false });

      // -------------------------------------------------------------
      // 3. OPTIMIZED TILE RENDER
      // -------------------------------------------------------------
      const tileContext = new PIXI.GraphicsContext()
        .poly([
          0, 0,
          TILE_WIDTH / 2, TILE_HEIGHT / 2,
          0, TILE_HEIGHT,
          -TILE_WIDTH / 2, TILE_HEIGHT / 2,
        ])
        .fill({ color: 0x55aa55 })
        .stroke({ width: 1, color: 0x338833 });

      for (let rx = 0; rx < GRID_SIZE; rx++) {
        for (let ry = 0; ry < GRID_SIZE; ry++) {
          const { x, y } = gridToScreen(rx, ry);
          const tile = new PIXI.Graphics(tileContext);
          tile.x = x;
          tile.y = y;
          tile.zIndex = y;
          world.addChild(tile);
        }
      }
    }

    init();

    return () => {
      isDestroyed = true;
      if (appRef.current && typeof appRef.current.destroy === 'function') {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!movingAssetRef.current || !containerRef.current || !worldRef.current) return;

    const activeMoving = movingAssetRef.current;
    const world = worldRef.current;
    const rect = containerRef.current.getBoundingClientRect();

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const localPos = world.toLocal({ x: clientX, y: clientY });
    const cursorGrid = screenToGrid(localPos.x, localPos.y);

    const W = activeMoving.asset.widthInTiles;
    const L = activeMoving.asset.lengthInTiles;

    // Align footprint so cursor is on the bottom-most tile
    const gx = cursorGrid.gx - (W - 1);
    const gy = cursorGrid.gy - (L - 1);

    if (gx >= 0 && gy >= 0 && gx + W <= GRID_SIZE && gy + L <= GRID_SIZE) {
      const top = gridToScreen(gx, gy);
      const bottomBase = gridToScreen(gx + W - 1, gy + L - 1);

      const footprintCenterX = top.x;
      const footprintCenterY = (top.y + bottomBase.y + TILE_HEIGHT) / 2;

      activeMoving.sprite.x = footprintCenterX + (activeMoving.asset.offsetX || 0);
      activeMoving.sprite.y = footprintCenterY + (activeMoving.asset.offsetY || 0);

      activeMoving.sprite.zIndex = bottomBase.y + TILE_HEIGHT;
      activeMoving.sprite.alpha = 1.0;

      bindSpriteInteraction(activeMoving.sprite, activeMoving.asset, gx, gy, activeMoving.isFlipped);

      if (highlightGraphicRef.current) {
        highlightGraphicRef.current.clear();
      }

      setMovingAsset(null);
    }
  };

  const bindSpriteInteraction = (
    sprite: PIXI.Sprite,
    asset: AssetDef,
    gx: number,
    gy: number,
    isFlipped: boolean
  ) => {
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';

    sprite.removeAllListeners();

    sprite.on('pointerdown', (e) => {
      e.stopPropagation();

      if (!containerRef.current || !worldRef.current) return;

      const world = worldRef.current;
      const screenX = sprite.x * world.scale.x + world.x;
      const screenY = (sprite.y - sprite.height / 2) * world.scale.y + world.y;

      setSelectedAsset({
        sprite,
        asset,
        gx,
        gy,
        isFlipped,
        menuPos: { x: screenX, y: screenY },
      });
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current || !worldRef.current) return;

    const world = worldRef.current;
    const rect = containerRef.current.getBoundingClientRect();

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const localPos = world.toLocal({ x: clientX, y: clientY });
    const { gx, gy } = screenToGrid(localPos.x, localPos.y);

    try {
      const assetData: AssetDef = JSON.parse(
        e.dataTransfer.getData('application/json')
      );

      if (
        gx >= 0 &&
        gy >= 0 &&
        gx + assetData.widthInTiles <= GRID_SIZE &&
        gy + assetData.lengthInTiles <= GRID_SIZE
      ) {
        spawnAssetOnGrid(gx, gy, assetData);
      }
    } catch (err) {
      console.error('Failed to parse drag-and-drop asset payload:', err);
    }
  };

  const spawnAssetOnGrid = async (gx: number, gy: number, asset: AssetDef) => {
    if (!worldRef.current) return;

    const W = asset.widthInTiles;
    const L = asset.lengthInTiles;

    const top = gridToScreen(gx, gy);
    const bottomBase = gridToScreen(gx + W - 1, gy + L - 1);

    const footprintCenterX = top.x;
    const footprintCenterY = (top.y + bottomBase.y + TILE_HEIGHT) / 2;

    const imageSrc = asset.src || '/assets/placeholder.png';

    try {
      const texture = await PIXI.Assets.load(imageSrc);
      if (!worldRef.current) return;

      const sprite = new PIXI.Sprite(texture);

      const targetFootprintWidth = (W + L) * (TILE_WIDTH / 2);
      const baseScale = targetFootprintWidth / texture.width;
      const finalScale = baseScale * (asset.scaleModifier || 1.0);

      sprite.scale.set(finalScale);
      sprite.anchor.set(0.5, 1.0);

      sprite.x = footprintCenterX + (asset.offsetX || 0);
      sprite.y = footprintCenterY + (asset.offsetY || 0);

      sprite.zIndex = bottomBase.y + TILE_HEIGHT;

      bindSpriteInteraction(sprite, asset, gx, gy, false);

      worldRef.current.addChild(sprite);
    } catch (error) {
      console.error(`Failed to load asset texture at ${imageSrc}:`, error);
    }
  };

  // -------------------------------------------------------------
  // ACTIONS MENU HANDLERS
  // -------------------------------------------------------------
  const handleFlip = () => {
    if (!selectedAsset) return;
    const { sprite } = selectedAsset;

    sprite.scale.x = -sprite.scale.x;

    setSelectedAsset((prev) =>
      prev ? { ...prev, isFlipped: !prev.isFlipped } : null
    );
  };

  const handleStartMove = () => {
    if (!selectedAsset) return;
    const { sprite, asset, isFlipped } = selectedAsset;

    sprite.alpha = 0.6;
    setMovingAsset({ sprite, asset, isFlipped });
    setSelectedAsset(null);
  };

  const handleDelete = () => {
    if (!selectedAsset || !worldRef.current) return;
    worldRef.current.removeChild(selectedAsset.sprite);
    selectedAsset.sprite.destroy();
    setSelectedAsset(null);
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
      className={`relative rounded-lg overflow-hidden border border-neutral-700 select-none ${
        movingAsset ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* FLOATING ACTION MENU */}
      {selectedAsset && (
        <div
          style={{
            left: `${selectedAsset.menuPos.x}px`,
            top: `${selectedAsset.menuPos.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="absolute z-50 flex items-center gap-1 bg-neutral-900/90 text-white p-1.5 rounded-lg shadow-xl border border-neutral-700 backdrop-blur-sm transition-all"
        >
          <button
            onClick={handleStartMove}
            className="px-2.5 py-1 text-xs font-medium bg-neutral-800 hover:bg-blue-600 rounded transition-colors"
          >
            Move
          </button>
          <button
            onClick={handleFlip}
            className="px-2.5 py-1 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
          >
            Flip
          </button>
          <button
            onClick={handleDelete}
            className="px-2.5 py-1 text-xs font-medium bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white rounded transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      {/* MOVING TOOLTIP BANNER */}
      {movingAsset && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600/90 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm pointer-events-none">
          Click on desired tile footprint to place asset
        </div>
      )}
    </div>
  );
}