// ---------------------------------------------------------------------------
// UI Renderer — HUD stats (funds, smoothed income, items sold)
// ---------------------------------------------------------------------------

import { Container } from 'pixi.js';
import type { GameState } from '../core/state.ts';

/** Rolling window size in seconds for raw income measurement. */
const WINDOW_SECONDS = 5;
const TICK_DT = 1 / 60;
const WINDOW_TICKS = Math.round(WINDOW_SECONDS / TICK_DT);

/** EMA smoothing speed applied to the windowed rate. */
const SMOOTH_SPEED = 1.5;

export class UIRenderer {
  /** Empty container kept for compatibility with renderer pipeline. */
  readonly container = new Container();

  private lastFunds = 0;
  private smoothedRate = 0; // $/sec, EMA-smoothed

  /** Circular buffer tracking earnings per tick over the rolling window. */
  private earningsBuffer: number[] = new Array(WINDOW_TICKS).fill(0);
  private bufferIndex = 0;
  private windowTotal = 0;

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
    // Track earnings this tick
    const earned = Math.max(0, state.funds - this.lastFunds);
    this.lastFunds = state.funds;

    // Update rolling window: subtract the oldest entry, add the new one
    this.windowTotal -= this.earningsBuffer[this.bufferIndex];
    this.earningsBuffer[this.bufferIndex] = earned;
    this.windowTotal += earned;
    this.bufferIndex = (this.bufferIndex + 1) % WINDOW_TICKS;

    // Raw rate from rolling window ($/sec)
    const windowRate = this.windowTotal / WINDOW_SECONDS;

    // EMA smooth the windowed rate for display
    const alpha = 1 - Math.exp(-SMOOTH_SPEED * TICK_DT);
    this.smoothedRate += (windowRate - this.smoothedRate) * alpha;

    // Update HTML stats
    if (this.fundsEl) this.fundsEl.textContent = `$${state.funds}`;
    if (this.incomeEl) {
      const perMin = this.smoothedRate * 60;
      this.incomeEl.textContent = perMin >= 0.1 ? `$${perMin.toFixed(1)}/min` : '$0/min';
    }
    if (this.soldEl) this.soldEl.textContent = `${state.stats.totalItemsSold}`;
    if (this.earnedEl) this.earnedEl.textContent = `$${state.stats.totalMoneyEarned}`;
  }
}
