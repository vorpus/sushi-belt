// ---------------------------------------------------------------------------
// Camera — viewport with pan and zoom using pixi-viewport
// ---------------------------------------------------------------------------

import { Viewport } from 'pixi-viewport';
import type { Application } from 'pixi.js';
import { TILE_SIZE } from '../rendering/gridRenderer.ts';

export interface CameraOptions {
  app: Application;
  worldWidth: number;
  worldHeight: number;
}

export function createCamera(options: CameraOptions): Viewport {
  const { app, worldWidth, worldHeight } = options;

  const worldPixelWidth = worldWidth * TILE_SIZE;
  const worldPixelHeight = worldHeight * TILE_SIZE;

  const viewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    worldWidth: worldPixelWidth,
    worldHeight: worldPixelHeight,
    events: app.renderer.events,
  });

  viewport
    .drag({ mouseButtons: 'right-middle' })
    .pinch()
    .wheel()
    .clampZoom({ minScale: 0.25, maxScale: 3 })
    .clamp({
      left: -worldPixelWidth * 0.25,
      right: worldPixelWidth * 1.25,
      top: -worldPixelHeight * 0.25,
      bottom: worldPixelHeight * 1.25,
    });

  // Center camera on the grid
  viewport.moveCenter(worldPixelWidth / 2, worldPixelHeight / 2);

  return viewport;
}
