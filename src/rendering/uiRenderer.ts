// ---------------------------------------------------------------------------
// UI Renderer — HUD overlay (funds display, income rate)
// ---------------------------------------------------------------------------

import { Container, Text } from 'pixi.js';
import type { GameState } from '../core/state.ts';

const RECENT_WINDOW_TICKS = 60; // 1 second at 60Hz

export class UIRenderer {
  readonly container = new Container();
  private fundsText: Text;
  private incomeText: Text;
  private recentSales: { tick: number; value: number }[] = [];
  private lastFunds = 0;

  constructor() {
    this.fundsText = new Text({
      text: '$0',
      style: {
        fontFamily: 'monospace',
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.fundsText.position.set(12, 12);

    this.incomeText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 14,
        fill: 0xaaffaa,
      },
    });
    this.incomeText.position.set(12, 38);

    this.container.addChild(this.fundsText);
    this.container.addChild(this.incomeText);
  }

  render(state: GameState): void {
    this.fundsText.text = `$${state.funds}`;

    // Track income by detecting fund changes
    if (state.funds > this.lastFunds) {
      this.recentSales.push({
        tick: state.tick,
        value: state.funds - this.lastFunds,
      });
    }
    this.lastFunds = state.funds;

    // Prune old entries outside the window
    const cutoff = state.tick - RECENT_WINDOW_TICKS;
    this.recentSales = this.recentSales.filter((s) => s.tick >= cutoff);

    // Calculate income rate (per second)
    const totalRecent = this.recentSales.reduce((sum, s) => sum + s.value, 0);
    if (totalRecent > 0) {
      this.incomeText.text = `$${totalRecent}/sec`;
    } else {
      this.incomeText.text = '';
    }
  }
}
