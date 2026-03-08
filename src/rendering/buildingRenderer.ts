// ---------------------------------------------------------------------------
// Building Renderer — draws buildings as colored rectangles
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from 'pixi.js';
import type { GameState } from '../core/state.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';
import { TILE_SIZE } from './gridRenderer.ts';

const BUILDING_COLORS: Record<string, number> = {
  fishing_boat: 0x2255aa,
  fish_market: 0xe87f22,
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
    }
  }
}
