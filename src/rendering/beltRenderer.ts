// ---------------------------------------------------------------------------
// Belt Renderer — draws belt tiles and items on belts
// ---------------------------------------------------------------------------

import { Container, Graphics } from 'pixi.js';
import type { GameState, BeltSegment, BeltItem } from '../core/state.ts';
import type { Direction } from '../core/types.ts';
import { TILE_SIZE } from './gridRenderer.ts';

const BELT_COLOR = 0x999999;
const BELT_ARROW_COLOR = 0xcccccc;

const ITEM_COLORS: Record<string, number> = {
  fish: 0x4a90d9,
  fish_cut: 0xff8866,
  rice: 0xeedd88,
  sushi_rice: 0xffffff,
  seasoned_rice: 0xffeeaa,
  nori: 0x224422,
  vegetables: 0x44bb44,
  pickled_veg: 0x88cc44,
  nigiri: 0xff6699,
  maki: 0x336633,
  gunkan: 0x445544,
  veggie_roll: 0x55aa55,
  temaki: 0x884444,
};

const ITEM_RADIUS = 5;

/** How fast the visual position chases the simulation position (0–1, higher = snappier). */
const SMOOTH_FACTOR = 0.35;

export class BeltRenderer {
  readonly container = new Container();
  private beltGraphics = new Graphics();
  private itemGraphics = new Graphics();

  /** Smoothed visual positions for belt items, keyed by object reference. */
  private smoothPositions = new WeakMap<BeltItem, { x: number; y: number }>();

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

  /** Compute the target pixel position of an item within a segment. */
  private getItemTargetPos(
    segment: BeltSegment,
    distFromEnd: number,
  ): { px: number; py: number } {
    const tileIndex = segment.tiles.length - 1 - distFromEnd;
    const clampedIndex = Math.max(0, Math.min(tileIndex, segment.tiles.length - 1));
    const floorIdx = Math.floor(clampedIndex);
    const ceilIdx = Math.min(floorIdx + 1, segment.tiles.length - 1);
    const frac = clampedIndex - floorIdx;

    const tileA = segment.tiles[floorIdx];
    const tileB = segment.tiles[ceilIdx];

    return {
      px: (tileA.x + (tileB.x - tileA.x) * frac) * TILE_SIZE + TILE_SIZE / 2,
      py: (tileA.y + (tileB.y - tileA.y) * frac) * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  private drawSegmentItems(segment: BeltSegment): void {
    if (segment.items.length === 0 || segment.tiles.length === 0) return;

    // First pass: compute smoothed positions for all items
    const positions: { px: number; py: number }[] = [];
    let distFromEnd = 0;

    for (const item of segment.items) {
      distFromEnd += item.distanceToNext;
      const target = this.getItemTargetPos(segment, distFromEnd);

      // Smooth toward target position
      const prev = this.smoothPositions.get(item);
      let px: number, py: number;
      if (prev) {
        px = prev.x + (target.px - prev.x) * SMOOTH_FACTOR;
        py = prev.y + (target.py - prev.y) * SMOOTH_FACTOR;
      } else {
        px = target.px;
        py = target.py;
      }
      this.smoothPositions.set(item, { x: px, y: py });

      positions.push({ px, py });
    }

    // Perpendicular offset direction for piling up bunched items
    const perpX = segment.direction === 'north' || segment.direction === 'south' ? 1 : 0;
    const perpY = segment.direction === 'east' || segment.direction === 'west' ? 1 : 0;

    // Second pass: detect bunched items and offset them perpendicular to belt
    // Draw back-to-front so front items render on top
    for (let i = segment.items.length - 1; i >= 0; i--) {
      let { px, py } = positions[i];

      // Count how many items ahead share roughly the same position (bunched)
      let bunchIndex = 0;
      for (let j = i - 1; j >= 0; j--) {
        const dx = Math.abs(positions[j].px - positions[i].px);
        const dy = Math.abs(positions[j].py - positions[i].py);
        if (dx < ITEM_RADIUS * 2 && dy < ITEM_RADIUS * 2) {
          bunchIndex++;
        } else {
          break;
        }
      }

      // Fan out bunched items perpendicular to belt direction
      if (bunchIndex > 0) {
        const spread = (bunchIndex - (bunchIndex + 1) / 2) * ITEM_RADIUS * 1.4;
        px += perpX * spread;
        py += perpY * spread;
      }

      const color = ITEM_COLORS[segment.items[i].itemId] ?? 0xcccccc;
      this.itemGraphics.circle(px, py, ITEM_RADIUS);
      this.itemGraphics.fill(color);
      this.itemGraphics.setStrokeStyle({ width: 1, color: 0x000000, alpha: 0.3 });
      this.itemGraphics.circle(px, py, ITEM_RADIUS);
      this.itemGraphics.stroke();
    }
  }
}
