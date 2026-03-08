// ---------------------------------------------------------------------------
// Input Manager — mouse tracking, coordinate conversion, tool actions
// ---------------------------------------------------------------------------

import type { Viewport } from 'pixi-viewport';
import type { FederatedPointerEvent } from 'pixi.js';
import type { GameState } from '../core/state.ts';
import { setBeltTile, removeBeltTile, getBeltTile } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import type { GridPosition, Direction } from '../core/types.ts';
import { TILE_SIZE } from '../rendering/gridRenderer.ts';
import { type ToolState } from './tools.ts';
import { BUILDINGS, type BuildingDefinition } from '../data/buildings.ts';
import { placeBuilding, removeBuilding } from '../systems/buildingPlacement.ts';
import { rebuildSegments } from '../systems/segmentBuilder.ts';
import type { Renderer } from '../rendering/renderer.ts';

/**
 * Compute an L-shaped path of grid positions from start to end.
 * Goes horizontal first, then vertical.
 * Returns array of { pos, direction } for each step.
 */
function computeBeltPath(
  start: GridPosition,
  end: GridPosition,
): { pos: GridPosition; direction: Direction }[] {
  const path: { pos: GridPosition; direction: Direction }[] = [];
  let cx = start.x;
  let cy = start.y;

  // Horizontal leg
  const dx = end.x > start.x ? 1 : -1;
  const hDir: Direction = dx > 0 ? 'east' : 'west';
  while (cx !== end.x) {
    path.push({ pos: { x: cx, y: cy }, direction: hDir });
    cx += dx;
  }

  // Vertical leg
  const dy = end.y > start.y ? 1 : -1;
  const vDir: Direction = dy > 0 ? 'south' : 'north';
  while (cy !== end.y) {
    path.push({ pos: { x: cx, y: cy }, direction: vDir });
    cy += dy;
  }

  // Final tile — direction matches last movement
  if (path.length > 0) {
    path.push({ pos: { x: cx, y: cy }, direction: path[path.length - 1].direction });
  } else {
    // Start == end — single tile, default south
    path.push({ pos: { x: cx, y: cy }, direction: 'south' });
  }

  return path;
}

export class InputManager {
  /** Current grid coordinates under the mouse (null if off-grid). */
  gridX: number | null = null;
  gridY: number | null = null;

  private viewport: Viewport;
  private state: GameState;
  private events: EventBus;
  private toolState: ToolState;
  private renderer: Renderer;

  /** Belt drag state */
  private beltDragStart: GridPosition | null = null;
  private dragging = false;

  constructor(
    viewport: Viewport,
    state: GameState,
    events: EventBus,
    toolState: ToolState,
    renderer: Renderer,
  ) {
    this.viewport = viewport;
    this.state = state;
    this.events = events;
    this.toolState = toolState;
    this.renderer = renderer;

    this.viewport.on('pointermove', this.onPointerMove.bind(this));
    this.viewport.on('pointerdown', this.onPointerDown.bind(this));
    this.viewport.on('pointerup', this.onPointerUp.bind(this));

    // Keyboard shortcuts
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private screenToGrid(screenX: number, screenY: number): GridPosition | null {
    const worldPos = this.viewport.toWorld(screenX, screenY);
    const gx = Math.floor(worldPos.x / TILE_SIZE);
    const gy = Math.floor(worldPos.y / TILE_SIZE);

    const gridHeight = this.state.grid.length;
    const gridWidth = this.state.grid[0]?.length ?? 0;

    if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) {
      return null;
    }

    return { x: gx, y: gy };
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'b' || e.key === 'B') {
      this.toolState.activeTool =
        this.toolState.activeTool === 'place_belt' ? 'place_building' : 'place_belt';
      this.updatePreview();
    } else if (e.key === 'x' || e.key === 'X') {
      this.toolState.activeTool =
        this.toolState.activeTool === 'delete' ? 'select' : 'delete';
      this.updatePreview();
    } else if (e.key === 'Escape') {
      this.toolState.activeTool = 'select';
      this.beltDragStart = null;
      this.dragging = false;
      this.updatePreview();
    }
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    const pos = this.screenToGrid(e.globalX, e.globalY);
    if (pos) {
      this.gridX = pos.x;
      this.gridY = pos.y;
    } else {
      this.gridX = null;
      this.gridY = null;
    }

    this.updatePreview();
  }

  private onPointerDown(e: FederatedPointerEvent): void {
    const pos = this.screenToGrid(e.globalX, e.globalY);
    if (!pos) return;

    // Right-click: delete belt or building
    if (e.button === 2) {
      this.handleRightClick(pos);
      return;
    }

    // Only handle left-click
    if (e.button !== 0) return;

    if (
      this.toolState.activeTool === 'place_building' &&
      this.toolState.selectedBuilding
    ) {
      const result = placeBuilding(
        this.state,
        this.toolState.selectedBuilding,
        pos,
        0,
        this.events,
      );
      if (result) {
        rebuildSegments(this.state);
        this.renderer.gridRenderer.markDirty();
      }
    } else if (this.toolState.activeTool === 'place_belt') {
      this.beltDragStart = pos;
      this.dragging = true;
    } else if (this.toolState.activeTool === 'delete') {
      this.handleDelete(pos);
    }
  }

  private onPointerUp(e: FederatedPointerEvent): void {
    if (e.button !== 0) return;

    if (this.toolState.activeTool === 'place_belt' && this.dragging && this.beltDragStart) {
      const pos = this.screenToGrid(e.globalX, e.globalY);
      if (pos) {
        this.placeBeltPath(this.beltDragStart, pos);
      }
      this.beltDragStart = null;
      this.dragging = false;
      this.updatePreview();
    }
  }

  private placeBeltPath(start: GridPosition, end: GridPosition): void {
    const path = computeBeltPath(start, end);
    let placed = false;

    for (const step of path) {
      // Only place on valid tiles (not occupied by buildings, in bounds)
      const cell = this.state.grid[step.pos.y]?.[step.pos.x];
      if (!cell) continue;
      if (cell.entityId !== null) continue; // don't place on buildings

      setBeltTile(this.state, step.pos, step.direction);
      this.events.emit('beltPlaced', {
        position: step.pos,
        direction: step.direction,
      });
      placed = true;
    }

    if (placed) {
      rebuildSegments(this.state);
      this.renderer.gridRenderer.markDirty();
    }
  }

  private handleRightClick(pos: GridPosition): void {
    // Try to delete belt tile
    const beltTile = getBeltTile(this.state, pos);
    if (beltTile) {
      removeBeltTile(this.state, pos);
      this.events.emit('beltRemoved', { position: pos });
      rebuildSegments(this.state);
      this.renderer.gridRenderer.markDirty();
      return;
    }

    // Try to delete building
    const cell = this.state.grid[pos.y]?.[pos.x];
    if (cell?.entityId) {
      removeBuilding(this.state, cell.entityId, this.events);
      rebuildSegments(this.state);
      this.renderer.gridRenderer.markDirty();
    }
  }

  private handleDelete(pos: GridPosition): void {
    // Same as right-click for now
    this.handleRightClick(pos);
  }

  private updatePreview(): void {
    if (
      this.toolState.activeTool === 'place_building' &&
      this.toolState.selectedBuilding &&
      this.gridX !== null &&
      this.gridY !== null
    ) {
      const def: BuildingDefinition = BUILDINGS[this.toolState.selectedBuilding];
      const valid = this.isPlacementValid(
        this.gridX,
        this.gridY,
        def.size.w,
        def.size.h,
        def.terrain,
      );
      this.renderer.gridRenderer.renderGhost(
        this.gridX,
        this.gridY,
        def.size.w,
        def.size.h,
        valid,
      );
      this.renderer.gridRenderer.renderHighlight(null, null);
    } else if (
      this.toolState.activeTool === 'place_belt' &&
      this.gridX !== null &&
      this.gridY !== null
    ) {
      // Show single-tile highlight for belt placement
      this.renderer.gridRenderer.renderGhost(null, null, 0, 0, false);
      this.renderer.gridRenderer.renderHighlight(this.gridX, this.gridY);
    } else if (
      this.toolState.activeTool === 'delete' &&
      this.gridX !== null &&
      this.gridY !== null
    ) {
      // Show red highlight for delete mode
      this.renderer.gridRenderer.renderGhost(
        this.gridX,
        this.gridY,
        1,
        1,
        false, // red = invalid color = delete indicator
      );
      this.renderer.gridRenderer.renderHighlight(null, null);
    } else {
      this.renderer.gridRenderer.renderGhost(null, null, 0, 0, false);
      this.renderer.gridRenderer.renderHighlight(this.gridX, this.gridY);
    }
  }

  private isPlacementValid(
    gx: number,
    gy: number,
    w: number,
    h: number,
    terrain: string,
  ): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const cx = gx + dx;
        const cy = gy + dy;
        if (
          cy < 0 ||
          cy >= this.state.grid.length ||
          cx < 0 ||
          cx >= this.state.grid[0].length
        ) {
          return false;
        }
        const cell = this.state.grid[cy][cx];
        if (cell.terrain !== terrain || cell.entityId !== null) {
          return false;
        }
      }
    }
    return true;
  }
}
