// ---------------------------------------------------------------------------
// Belt Renderer — draws belt tiles and items on belts
// ---------------------------------------------------------------------------

import { Container, Graphics } from 'pixi.js';
import type { GameState, BeltSegment } from '../core/state.ts';
import type { Direction } from '../core/types.ts';
import { TILE_SIZE } from './gridRenderer.ts';

const BELT_COLOR = 0x999999;
const BELT_ARROW_COLOR = 0xcccccc;

const ITEM_COLORS: Record<string, number> = {
  fish: 0x4a90d9,
  fish_cut: 0xff8866,
  rice: 0xeedd88,
  sushi_rice: 0xffffff,
  nigiri: 0xff6699,
};

const ITEM_RADIUS = 5;

export class BeltRenderer {
  readonly container = new Container();
  private beltGraphics = new Graphics();
  private itemGraphics = new Graphics();

  constructor() {
    this.container.addChild(this.beltGraphics);
    this.container.addChild(this.itemGraphics);
  }

  render(state: GameState): void {
    this.beltGraphics.clear();
    this.itemGraphics.clear();

    // Draw belt tiles
    for (const [key, tile] of state.beltGrid) {
      const [x, y] = key.split(',').map(Number);
      this.drawBeltTile(x, y, tile.direction);
    }

    // Draw items on belt segments
    for (const segment of state.segments.values()) {
      this.drawSegmentItems(segment);
    }
  }

  private drawBeltTile(gx: number, gy: number, direction: Direction): void {
    const px = gx * TILE_SIZE;
    const py = gy * TILE_SIZE;
    const inset = 2;

    // Belt background
    this.beltGraphics.rect(px + inset, py + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
    this.beltGraphics.fill(BELT_COLOR);

    // Draw directional arrow
    const cx = px + TILE_SIZE / 2;
    const cy = py + TILE_SIZE / 2;
    const arrowSize = TILE_SIZE * 0.25;

    this.beltGraphics.setStrokeStyle({ width: 2, color: BELT_ARROW_COLOR });

    if (direction === 'east') {
      this.drawArrow(cx - arrowSize, cy, cx + arrowSize, cy, arrowSize * 0.6);
    } else if (direction === 'west') {
      this.drawArrow(cx + arrowSize, cy, cx - arrowSize, cy, arrowSize * 0.6);
    } else if (direction === 'south') {
      this.drawArrow(cx, cy - arrowSize, cx, cy + arrowSize, arrowSize * 0.6);
    } else if (direction === 'north') {
      this.drawArrow(cx, cy + arrowSize, cx, cy - arrowSize, arrowSize * 0.6);
    }
  }

  private drawArrow(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    headSize: number,
  ): void {
    // Arrow shaft
    this.beltGraphics.moveTo(fromX, fromY);
    this.beltGraphics.lineTo(toX, toY);
    this.beltGraphics.stroke();

    // Arrow head
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const a1 = angle + (Math.PI * 3) / 4;
    const a2 = angle - (Math.PI * 3) / 4;

    this.beltGraphics.moveTo(toX, toY);
    this.beltGraphics.lineTo(toX + Math.cos(a1) * headSize, toY + Math.sin(a1) * headSize);
    this.beltGraphics.stroke();

    this.beltGraphics.moveTo(toX, toY);
    this.beltGraphics.lineTo(toX + Math.cos(a2) * headSize, toY + Math.sin(a2) * headSize);
    this.beltGraphics.stroke();
  }

  private drawSegmentItems(segment: BeltSegment): void {
    if (segment.items.length === 0 || segment.tiles.length === 0) return;

    // Items are ordered front-to-back.
    // Front item (index 0) has distanceToNext = distance to segment end.
    // We walk items from front to back, accumulating distance from the end.
    let distFromEnd = 0;

    for (const item of segment.items) {
      distFromEnd += item.distanceToNext;

      // Convert distance to tile index (from end)
      // distFromEnd=0 → last tile, distFromEnd=tiles.length-1 → first tile
      const tileIndexFromEnd = distFromEnd;
      const tileIndex = segment.tiles.length - 1 - tileIndexFromEnd;

      // Interpolate position
      const floorIdx = Math.max(0, Math.min(Math.floor(tileIndex), segment.tiles.length - 1));
      const tile = segment.tiles[floorIdx];

      const px = tile.x * TILE_SIZE + TILE_SIZE / 2;
      const py = tile.y * TILE_SIZE + TILE_SIZE / 2;

      const color = ITEM_COLORS[item.itemId] ?? 0xcccccc;
      this.itemGraphics.circle(px, py, ITEM_RADIUS);
      this.itemGraphics.fill(color);
      this.itemGraphics.setStrokeStyle({ width: 1, color: 0x000000, alpha: 0.3 });
      this.itemGraphics.circle(px, py, ITEM_RADIUS);
      this.itemGraphics.stroke();
    }
  }
}
