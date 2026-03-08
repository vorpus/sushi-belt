// ---------------------------------------------------------------------------
// GameLoop — fixed-timestep simulation loop for Sushi Belt
// ---------------------------------------------------------------------------

import type { GameState } from './state.ts';
import type { EventBus } from './eventBus.ts';
import { sourceSystem } from '../systems/sourceSystem.ts';

export const TICK_RATE = 60;
export const TICK_DURATION_S = 1 / TICK_RATE;
export const TICK_DURATION_MS = 1000 / TICK_RATE;
export const MAX_FRAME_TIME_MS = 250; // cap to prevent spiral-of-death

export type Renderer = {
  render(state: GameState, alpha: number): void;
};

export interface GameLoopOptions {
  state: GameState;
  events: EventBus;
  renderer?: Renderer | null;
}

export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private initialized = false;
  private state: GameState;
  private events: EventBus;
  private renderer: Renderer | null;

  constructor(options: GameLoopOptions) {
    this.state = options.state;
    this.events = options.events;
    this.renderer = options.renderer ?? null;
  }

  /** Execute a single fixed-timestep tick. */
  tick(): void {
    sourceSystem(this.state, TICK_DURATION_S, this.events);
    // Systems to be added in later milestones:
    // beltSystem(this.state, TICK_DURATION_S, this.events);
    // processorSystem(this.state, TICK_DURATION_S, this.events);
    // assemblerSystem(this.state, TICK_DURATION_S, this.events);
    // sellerSystem(this.state, TICK_DURATION_S, this.events);
    // economySystem(this.state, this.events);
    this.events.flush();
    this.state.tick++;
  }

  /** Process a single frame with accumulator-based fixed timestep. */
  frame(currentTime: number): void {
    if (!this.initialized) {
      this.lastTime = currentTime;
      this.initialized = true;
    }

    const frameTime = Math.min(currentTime - this.lastTime, MAX_FRAME_TIME_MS);
    this.lastTime = currentTime;
    this.accumulator += frameTime;

    const EPSILON = 1e-6;
    while (this.accumulator + EPSILON >= TICK_DURATION_MS) {
      this.tick();
      this.accumulator -= TICK_DURATION_MS;
    }

    if (this.renderer) {
      const alpha = this.accumulator / TICK_DURATION_MS;
      this.renderer.render(this.state, alpha);
    }

    if (this.running) {
      requestAnimationFrame((t) => this.frame(t));
    }
  }

  /** Start the game loop. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.initialized = false;
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Stop the game loop. */
  stop(): void {
    this.running = false;
  }
}
