// ---------------------------------------------------------------------------
// UI Renderer — HUD stats (funds, smoothed income, items sold)
// ---------------------------------------------------------------------------

import { Container } from 'pixi.js';
import type { GameState } from '../core/state.ts';

/** EMA smoothing speed — converges ~63% in 1/speed seconds. */
const SMOOTH_SPEED = 2;
const TICK_DT = 1 / 60;

export class UIRenderer {
  /** Empty container kept for compatibility with renderer pipeline. */
  readonly container = new Container();

  private lastFunds = 0;
  private smoothedRate = 0; // $/sec, EMA-smoothed

  private fundsEl: HTMLElement | null = null;
  private incomeEl: HTMLElement | null = null;
  private soldEl: HTMLElement | null = null;
  private earnedEl: HTMLElement | null = null;

  constructor() {
    this.fundsEl = document.getElementById('stat-funds');
    this.incomeEl = document.getElementById('stat-income');
    this.soldEl = document.getElementById('stat-sold');
    this.earnedEl = document.getElementById('stat-earned');
  }

  render(state: GameState): void {
    // Compute instantaneous income this tick
    const earned = Math.max(0, state.funds - this.lastFunds);
    this.lastFunds = state.funds;

    const instantRate = earned / TICK_DT; // $/sec raw
    // EMA: smoothedRate += (raw - smoothed) * (1 - exp(-speed * dt))
    const alpha = 1 - Math.exp(-SMOOTH_SPEED * TICK_DT);
    this.smoothedRate += (instantRate - this.smoothedRate) * alpha;

    // Update HTML stats
    if (this.fundsEl) this.fundsEl.textContent = `$${state.funds}`;
    if (this.incomeEl) {
      const perMin = this.smoothedRate * 60;
      this.incomeEl.textContent = perMin > 0.1 ? `$${perMin.toFixed(1)}/min` : '$0/min';
    }
    if (this.soldEl) this.soldEl.textContent = `${state.stats.totalItemsSold}`;
    if (this.earnedEl) this.earnedEl.textContent = `$${state.stats.totalMoneyEarned}`;
  }
}
