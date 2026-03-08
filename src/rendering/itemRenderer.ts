// ---------------------------------------------------------------------------
// Item Renderer — draws items from entity output buffers
// ---------------------------------------------------------------------------

import { Container, Graphics } from 'pixi.js';
import type { GameState } from '../core/state.ts';
import { BUILDINGS, type BuildingId, type BuildingDefinition } from '../data/buildings.ts';
import { TILE_SIZE } from './gridRenderer.ts';

const ITEM_COLORS: Record<string, number> = {
  fish: 0x4a90d9,
};

const ITEM_RADIUS = 6;
const STACK_OFFSET = 4;

export class ItemRenderer {
  readonly container = new Container();
  private graphics = new Graphics();

  constructor() {
    this.container.addChild(this.graphics);
  }

  render(state: GameState): void {
    this.graphics.clear();

    for (const entity of state.entities.values()) {
      if (!entity.source || entity.source.outputBuffer.length === 0) continue;

      const def: BuildingDefinition | null = entity.building
        ? BUILDINGS[entity.building.buildingId as BuildingId]
        : null;

      // Determine output point — use the first output connection point if available
      let outX = entity.position.x;
      let outY = entity.position.y;

      if (def) {
        // Default: bottom-center of the building
        outX = entity.position.x + def.size.w / 2;
        outY = entity.position.y + def.size.h;

        if (def.connectionPoints.outputs && def.connectionPoints.outputs.length > 0) {
          const cp = def.connectionPoints.outputs[0];
          if (cp.side === 'south') {
            outX = entity.position.x + cp.offset + 0.5;
            outY = entity.position.y + def.size.h;
          } else if (cp.side === 'north') {
            outX = entity.position.x + cp.offset + 0.5;
            outY = entity.position.y;
          } else if (cp.side === 'east') {
            outX = entity.position.x + def.size.w;
            outY = entity.position.y + cp.offset + 0.5;
          } else if (cp.side === 'west') {
            outX = entity.position.x;
            outY = entity.position.y + cp.offset + 0.5;
          }
        }
      }

      const px = outX * TILE_SIZE;
      const py = outY * TILE_SIZE;

      // Draw each item in the buffer, stacked slightly
      for (let i = 0; i < entity.source.outputBuffer.length; i++) {
        const itemId = entity.source.outputBuffer[i];
        const color = ITEM_COLORS[itemId] ?? 0xcccccc;
        const offsetY = -i * STACK_OFFSET;

        this.graphics.circle(px, py + offsetY, ITEM_RADIUS);
        this.graphics.fill(color);
        this.graphics.setStrokeStyle({ width: 1, color: 0x000000, alpha: 0.3 });
        this.graphics.circle(px, py + offsetY, ITEM_RADIUS);
        this.graphics.stroke();
      }
    }
  }
}
