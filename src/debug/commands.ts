// ---------------------------------------------------------------------------
// Dev Console Commands — exposed on window.sushi in dev builds
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
import type { GameLoop } from '../core/gameLoop.ts';
import { BUILDINGS } from '../data/buildings.ts';
import { inspectState, dumpGrid } from './inspect.ts';
import type { ItemId, SegmentId } from '../core/types.ts';

export interface DevCommands {
  setFunds: (amount: number) => void;
  unlockAll: () => void;
  spawnItem: (itemId: string, segmentId: string) => boolean;
  fastForward: (seconds: number) => void;
  inspect: () => ReturnType<typeof inspectState>;
  grid: () => string;
  state: () => GameState;
}

export function createDevCommands(
  getState: () => GameState,
  getLoop: () => GameLoop,
): DevCommands {
  return {
    setFunds(amount: number) {
      getState().funds = amount;
    },

    unlockAll() {
      const state = getState();
      for (const id of Object.keys(BUILDINGS)) {
        state.unlocks.add(id);
      }
    },

    spawnItem(itemId: string, segmentId: string): boolean {
      const state = getState();
      const seg = state.segments.get(segmentId as SegmentId);
      if (!seg) return false;
      if (seg.items.length === 0) {
        seg.items.push({ itemId: itemId as ItemId, distanceToNext: seg.tiles.length - 1 });
      } else {
        let totalDist = 0;
        for (const item of seg.items) totalDist += item.distanceToNext;
        const space = seg.tiles.length - 1 - totalDist;
        if (space < 1) return false;
        seg.items.push({ itemId: itemId as ItemId, distanceToNext: space });
      }
      return true;
    },

    fastForward(seconds: number) {
      const loop = getLoop();
      const ticks = Math.round(seconds * 60);
      for (let i = 0; i < ticks; i++) {
        loop.tick();
      }
    },

    inspect() {
      return inspectState(getState());
    },

    grid() {
      const ascii = dumpGrid(getState());
      console.log(ascii);
      return ascii;
    },

    state() {
      return getState();
    },
  };
}
