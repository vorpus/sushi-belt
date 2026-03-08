// ---------------------------------------------------------------------------
// Renderer — orchestrates all rendering layers
// ---------------------------------------------------------------------------

import { Container } from 'pixi.js';
import type { GameState } from '../core/state.ts';
import type { Renderer as IRenderer } from '../core/gameLoop.ts';
import { GridRenderer } from './gridRenderer.ts';
import { BuildingRenderer } from './buildingRenderer.ts';
import { ItemRenderer } from './itemRenderer.ts';

export class Renderer implements IRenderer {
  readonly root = new Container();
  readonly gridRenderer: GridRenderer;
  readonly buildingRenderer: BuildingRenderer;
  readonly itemRenderer: ItemRenderer;

  constructor() {
    this.gridRenderer = new GridRenderer();
    this.buildingRenderer = new BuildingRenderer();
    this.itemRenderer = new ItemRenderer();

    // Layer order: grid → buildings → items
    this.root.addChild(this.gridRenderer.container);
    this.root.addChild(this.buildingRenderer.container);
    this.root.addChild(this.itemRenderer.container);
  }

  render(state: GameState, _alpha: number): void {
    this.gridRenderer.render(state);
    this.buildingRenderer.render(state);
    this.itemRenderer.render(state);
  }
}
