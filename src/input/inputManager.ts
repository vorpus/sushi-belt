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
import { BUILDINGS, type BuildingDefinition, type BuildingConnectionPoint } from '../data/buildings.ts';
import { rotateDirectionCW } from '../core/types.ts';
import { placeBuilding, removeBuilding } from '../systems/buildingPlacement.ts';
import { rebuildSegments } from '../systems/segmentBuilder.ts';
import type { Renderer } from '../rendering/renderer.ts';
import type { Toolbar } from './toolbar.ts';

/**
 * Compute an L-shaped path of grid positions from start to end.
 * Goes horizontal first, then vertical.
 * Returns array of { pos, direction } for each step.
 */
export function computeBeltPath(
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
  private toolbar: Toolbar | null = null;

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
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  setToolbar(toolbar: Toolbar): void {
    this.toolbar = toolbar;
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

  /** Keys currently held down for camera panning. */
  private keysDown = new Set<string>();
  private panTickerId: number | null = null;

  private startPanLoop(): void {
    if (this.panTickerId !== null) return;
    const PAN_SPEED = 8;
    const tick = () => {
      let dx = 0;
      let dy = 0;
      if (this.keysDown.has('left')) dx -= PAN_SPEED;
      if (this.keysDown.has('right')) dx += PAN_SPEED;
      if (this.keysDown.has('up')) dy -= PAN_SPEED;
      if (this.keysDown.has('down')) dy += PAN_SPEED;
      if (dx !== 0 || dy !== 0) {
        this.viewport.moveCenter(
          this.viewport.center.x + dx / this.viewport.scale.x,
          this.viewport.center.y + dy / this.viewport.scale.y,
        );
      }
      if (this.keysDown.size > 0) {
        this.panTickerId = requestAnimationFrame(tick);
      } else {
        this.panTickerId = null;
      }
    };
    this.panTickerId = requestAnimationFrame(tick);
  }

  private onKeyUp(e: KeyboardEvent): void {
    const dir = this.keyToDir(e.key);
    if (dir) this.keysDown.delete(dir);
  }

  private keyToDir(key: string): string | null {
    switch (key) {
      case 'w': case 'W': case 'ArrowUp': return 'up';
      case 's': case 'S': case 'ArrowDown': return 'down';
      case 'a': case 'A': case 'ArrowLeft': return 'left';
      case 'd': case 'D': case 'ArrowRight': return 'right';
      default: return null;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Camera panning
    const dir = this.keyToDir(e.key);
    if (dir) {
      this.keysDown.add(dir);
      this.startPanLoop();
      return;
    }

    if (e.key === 'b' || e.key === 'B') {
      this.toolState.activeTool =
        this.toolState.activeTool === 'place_belt' ? 'place_building' : 'place_belt';
      this.updatePreview();
      this.toolbar?.syncUI();
    } else if (e.key === 'x' || e.key === 'X') {
      this.toolState.activeTool =
        this.toolState.activeTool === 'delete' ? 'select' : 'delete';
      this.updatePreview();
      this.toolbar?.syncUI();
    } else if (e.key === 'r' || e.key === 'R') {
      this.toolState.rotation = (this.toolState.rotation + 1) % 4;
      this.updatePreview();
      this.toolbar?.syncUI();
    } else if (e.key === 'Escape') {
      this.toolState.activeTool = 'select';
      this.beltDragStart = null;
      this.dragging = false;
      this.updatePreview();
      this.toolbar?.syncUI();
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
        this.toolState.rotation,
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
      const rot = this.toolState.rotation;
      const valid = this.isPlacementValid(
        this.gridX,
        this.gridY,
        def.size.w,
        def.size.h,
        def.terrain,
      );
      const rotateCPs = (cps: readonly BuildingConnectionPoint[]) =>
        cps.map((cp) => ({ side: rotateDirectionCW(cp.side, rot), offset: cp.offset }));
      this.renderer.gridRenderer.renderGhost(
        this.gridX,
        this.gridY,
        def.size.w,
        def.size.h,
        valid,
        {
          inputs: def.connectionPoints.inputs ? rotateCPs(def.connectionPoints.inputs) : [],
          outputs: def.connectionPoints.outputs ? rotateCPs(def.connectionPoints.outputs) : [],
          buildingW: def.size.w,
          buildingH: def.size.h,
        },
      );
      this.renderer.gridRenderer.renderHighlight(null, null);
      this.renderer.gridRenderer.renderBeltPreview(null);
    } else if (
      this.toolState.activeTool === 'place_belt' &&
      this.gridX !== null &&
      this.gridY !== null
    ) {
      // Show belt path preview while dragging, or single-tile highlight otherwise
      this.renderer.gridRenderer.renderGhost(null, null, 0, 0, false);
      if (this.dragging && this.beltDragStart) {
        const path = computeBeltPath(this.beltDragStart, { x: this.gridX, y: this.gridY });
        this.renderer.gridRenderer.renderBeltPreview(path);
        this.renderer.gridRenderer.renderHighlight(null, null);
      } else {
        this.renderer.gridRenderer.renderBeltPreview(null);
        this.renderer.gridRenderer.renderHighlight(this.gridX, this.gridY);
      }
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
      this.renderer.gridRenderer.renderBeltPreview(null);
    } else {
      this.renderer.gridRenderer.renderGhost(null, null, 0, 0, false);
      this.renderer.gridRenderer.renderHighlight(this.gridX, this.gridY);
      this.renderer.gridRenderer.renderBeltPreview(null);
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
