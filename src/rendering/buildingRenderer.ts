// ---------------------------------------------------------------------------
// Building Renderer — draws buildings as colored rectangles
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from 'pixi.js';
import type { GameState } from '../core/state.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';
import { RECIPES } from '../data/recipes.ts';
import type { ConnectionPoint } from '../core/entity.ts';
import { TILE_SIZE } from './gridRenderer.ts';

const BUILDING_COLORS: Record<string, number> = {
  fishing_boat: 0x2255aa,
  fish_market: 0xe87f22,
  cutting_board: 0x8b6914,
  rice_paddy: 0x55aa22,
  rice_cooker: 0xaa5522,
  nigiri_press: 0x884488,
  sushi_shop: 0xcc3344,
};

export class BuildingRenderer {
  readonly container = new Container();
  private graphics = new Graphics();
  private labels = new Container();

  constructor() {
    this.container.addChild(this.graphics);
    this.container.addChild(this.labels);
  }

  render(state: GameState): void {
    this.graphics.clear();
    // Remove old labels
    this.labels.removeChildren();

    for (const entity of state.entities.values()) {
      if (!entity.building) continue;

      const def = BUILDINGS[entity.building.buildingId as BuildingId];
      if (!def) continue;

      const px = entity.position.x * TILE_SIZE;
      const py = entity.position.y * TILE_SIZE;
      const pw = def.size.w * TILE_SIZE;
      const ph = def.size.h * TILE_SIZE;

      const color = BUILDING_COLORS[def.id] ?? 0x888888;

      // Draw building rectangle with slight inset
      const inset = 2;
      this.graphics.rect(px + inset, py + inset, pw - inset * 2, ph - inset * 2);
      this.graphics.fill(color);

      // Draw connection point arrows on placed buildings
      if (entity.beltNode) {
        for (const cp of entity.beltNode.inputs) {
          this.drawConnectionArrow(entity.position.x, entity.position.y, def.size.w, def.size.h, cp, 0x44aaff, true);
        }
        for (const cp of entity.beltNode.outputs) {
          this.drawConnectionArrow(entity.position.x, entity.position.y, def.size.w, def.size.h, cp, 0xff8844, false);
        }
      }

      // Draw label
      const label = new Text({
        text: def.name,
        style: {
          fontSize: 10,
          fill: 0xffffff,
          fontFamily: 'monospace',
        },
      });
      label.anchor.set(0.5);
      label.x = px + pw / 2;
      label.y = py + ph / 2;
      this.labels.addChild(label);

      // Draw processing progress bar for processor or assembler buildings
      const activeProcessor = entity.processor?.processing ? entity.processor : null;
      const activeAssembler = entity.assembler?.processing ? entity.assembler : null;
      if (activeProcessor) {
        const recipe = RECIPES[activeProcessor.recipeId as keyof typeof RECIPES];
        if (recipe) {
          const progress = Math.min(activeProcessor.progress / recipe.processingTime, 1);
          const barWidth = pw - inset * 4;
          const barHeight = 4;
          const barX = px + inset * 2;
          const barY = py + ph - inset - barHeight - 2;

          // Background
          this.graphics.rect(barX, barY, barWidth, barHeight);
          this.graphics.fill({ color: 0x000000, alpha: 0.4 });

          // Fill
          this.graphics.rect(barX, barY, barWidth * progress, barHeight);
          this.graphics.fill({ color: 0x44ff44, alpha: 0.8 });
        }
      } else if (activeAssembler) {
        const recipe = RECIPES[activeAssembler.recipeId as keyof typeof RECIPES];
        if (recipe) {
          const progress = Math.min(activeAssembler.progress / recipe.processingTime, 1);
          const barWidth = pw - inset * 4;
          const barHeight = 4;
          const barX = px + inset * 2;
          const barY = py + ph - inset - barHeight - 2;

          this.graphics.rect(barX, barY, barWidth, barHeight);
          this.graphics.fill({ color: 0x000000, alpha: 0.4 });

          this.graphics.rect(barX, barY, barWidth * progress, barHeight);
          this.graphics.fill({ color: 0x44ff44, alpha: 0.8 });
        }
      }
    }
  }

  /** Draw an arrow indicating a connection point on a placed building. */
  private drawConnectionArrow(
    gx: number,
    gy: number,
    bw: number,
    bh: number,
    cp: ConnectionPoint,
    color: number,
    isInput: boolean,
  ): void {
    let edgeX: number, edgeY: number;
    let arrowDx: number, arrowDy: number;

    const halfTile = TILE_SIZE / 2;

    switch (cp.side) {
      case 'north':
        edgeX = (gx + cp.offset) * TILE_SIZE + halfTile;
        edgeY = gy * TILE_SIZE;
        arrowDx = 0;
        arrowDy = isInput ? 1 : -1;
        break;
      case 'south':
        edgeX = (gx + cp.offset) * TILE_SIZE + halfTile;
        edgeY = (gy + bh) * TILE_SIZE;
        arrowDx = 0;
        arrowDy = isInput ? -1 : 1;
        break;
      case 'west':
        edgeX = gx * TILE_SIZE;
        edgeY = (gy + cp.offset) * TILE_SIZE + halfTile;
        arrowDx = isInput ? 1 : -1;
        arrowDy = 0;
        break;
      case 'east':
        edgeX = (gx + bw) * TILE_SIZE;
        edgeY = (gy + cp.offset) * TILE_SIZE + halfTile;
        arrowDx = isInput ? -1 : 1;
        arrowDy = 0;
        break;
    }

    const arrowLen = 8;
    const arrowWidth = 5;
    const tipX = edgeX + arrowDx * arrowLen;
    const tipY = edgeY + arrowDy * arrowLen;

    const baseX1 = edgeX + arrowDy * arrowWidth;
    const baseY1 = edgeY - arrowDx * arrowWidth;
    const baseX2 = edgeX - arrowDy * arrowWidth;
    const baseY2 = edgeY + arrowDx * arrowWidth;

    this.graphics.moveTo(tipX, tipY);
    this.graphics.lineTo(baseX1, baseY1);
    this.graphics.lineTo(baseX2, baseY2);
    this.graphics.closePath();
    this.graphics.fill({ color, alpha: 0.85 });
  }
}
