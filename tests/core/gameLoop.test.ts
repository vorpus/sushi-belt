import { describe, it, expect, vi } from 'vitest';
import {
  GameLoop,
  TICK_DURATION_MS,
} from '../../src/core/gameLoop';
import { createInitialState, type GameState } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';

function makeLoop(renderer?: { render: (state: GameState, alpha: number) => void }) {
  const state = createInitialState(10, 10);
  const events = new EventBus();
  const loop = new GameLoop({ state, events, renderer });
  return { state, events, loop };
}

describe('GameLoop', () => {
  it('tick() increments state.tick', () => {
    const { state, loop } = makeLoop();
    expect(state.tick).toBe(0);

    loop.tick();
    expect(state.tick).toBe(1);

    loop.tick();
    loop.tick();
    expect(state.tick).toBe(3);
  });

  it('frame() runs the correct number of ticks for elapsed time', () => {
    const { state, loop } = makeLoop();

    const startTime = 1000;
    loop.frame(startTime); // establish baseline
    expect(state.tick).toBe(0);

    // Advance by enough time for exactly 5 ticks (use integer math to avoid fp issues).
    loop.frame(startTime + 100); // 100ms = 6 ticks at 60Hz (16.67ms each)
    expect(state.tick).toBe(6);
  });

  it('accumulates fractional frame times correctly', () => {
    const { state, loop } = makeLoop();

    const t0 = 1000;
    loop.frame(t0); // establish baseline

    // Advance by 10ms — less than one tick (16.67ms), so no ticks fire.
    loop.frame(t0 + 10);
    expect(state.tick).toBe(0);

    // Advance by another 10ms — total accumulated = 20ms, enough for 1 tick.
    loop.frame(t0 + 20);
    expect(state.tick).toBe(1);
  });

  it('caps frame time at MAX_FRAME_TIME_MS to prevent runaway ticks', () => {
    const { state, loop } = makeLoop();

    const t0 = 1000;
    loop.frame(t0); // establish baseline

    // Simulate a huge gap (10 seconds) — should be capped at MAX_FRAME_TIME_MS.
    loop.frame(t0 + 10_000);

    // 250ms / 16.67ms = ~15 ticks max
    expect(state.tick).toBeGreaterThan(0);
    expect(state.tick).toBeLessThanOrEqual(16); // reasonable upper bound
    // Crucially, it should NOT be ~600 ticks (10000 / 16.67)
    expect(state.tick).toBeLessThan(20);
  });

  it('works in headless mode (no renderer) without errors', () => {
    const { state, loop } = makeLoop(); // no renderer

    const t0 = 1000;
    loop.frame(t0); // establish baseline
    loop.frame(t0 + 50); // 50ms = 3 ticks

    expect(state.tick).toBe(3);
  });

  it('calls renderer.render with state and alpha when renderer is provided', () => {
    const renderFn = vi.fn();
    const { state, loop } = makeLoop({ render: renderFn });

    const t0 = 1000;
    loop.frame(t0);

    // Advance by 2.5 tick durations.
    loop.frame(t0 + TICK_DURATION_MS * 2.5);

    expect(renderFn).toHaveBeenCalled();
    // Last call should have alpha ~0.5 (half a tick remaining).
    const lastCall = renderFn.mock.calls[renderFn.mock.calls.length - 1];
    expect(lastCall[0]).toBe(state);
    expect(lastCall[1]).toBeCloseTo(0.5, 1);
  });

  it('start() and stop() control the running state', () => {
    // Mock requestAnimationFrame and performance.now for this test.
    const rafMock = vi.fn();
    const perfMock = vi.fn(() => 5000);
    vi.stubGlobal('requestAnimationFrame', rafMock);
    vi.stubGlobal('performance', { now: perfMock });

    const { loop } = makeLoop();

    loop.start();
    expect(rafMock).toHaveBeenCalledTimes(1);

    loop.stop();
    // After stop, frame() should not schedule another rAF.
    // Simulate the pending rAF callback firing after stop.
    const callback = rafMock.mock.calls[0][0];
    rafMock.mockClear();
    callback(5000 + TICK_DURATION_MS);
    expect(rafMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
