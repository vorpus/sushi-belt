import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/core/state';
import { EventBus } from '../src/core/eventBus';
import { GameLoop } from '../src/core/gameLoop';

describe('Smoke tests', () => {
  it('creates a GameState with correct initial values', () => {
    const state = createInitialState(32, 24);

    expect(state.tick).toBe(0);
    expect(state.funds).toBe(0);
    expect(state.grid.length).toBe(24);
    expect(state.grid[0].length).toBe(32);
    expect(state.entities.size).toBe(0);
  });

  it('runs 60 ticks and state.tick equals 60', () => {
    const state = createInitialState(32, 24);
    const events = new EventBus();
    const gameLoop = new GameLoop({ state, events, renderer: null });

    for (let i = 0; i < 60; i++) {
      gameLoop.tick();
    }

    expect(state.tick).toBe(60);
  });

  it('grid has water in top 3 rows and land below', () => {
    const state = createInitialState(32, 24);

    expect(state.grid[0][0].terrain).toBe('water');
    expect(state.grid[2][15].terrain).toBe('water');
    expect(state.grid[3][15].terrain).toBe('land');
  });
});
