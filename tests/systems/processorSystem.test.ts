import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { createEntity } from '../../src/core/entity';
import { processorSystem } from '../../src/systems/processorSystem';
import type { ItemId } from '../../src/core/types';

function setupProcessor() {
  const state = createInitialState(10, 10);
  const events = new EventBus();

  const entity = createEntity({ x: 5, y: 5 });
  entity.building = { buildingId: 'cutting_board', rotation: 0 };
  entity.processor = { recipeId: 'cut_fish', progress: 0, processing: false };
  entity.inventory = { items: [], maxSize: 5 };
  entity.source = {
    produces: '' as ItemId,
    interval: Infinity,
    timer: Infinity,
    outputBuffer: [],
  };
  entity.beltNode = {
    inputs: [{ side: 'west', offset: 0 }],
    outputs: [{ side: 'east', offset: 0 }],
  };

  state.entities.set(entity.id, entity);
  return { state, events, entity };
}

describe('processorSystem', () => {
  it('does nothing when inventory has no matching inputs', () => {
    const { state, events, entity } = setupProcessor();

    processorSystem(state, 1 / 60, events);

    expect(entity.processor!.processing).toBe(false);
    expect(entity.processor!.progress).toBe(0);
  });

  it('consumes inputs and starts processing when recipe inputs are available', () => {
    const { state, events, entity } = setupProcessor();

    entity.inventory!.items.push('fish' as ItemId);
    processorSystem(state, 1 / 60, events);

    // First tick: inputs consumed and processing starts (progress stays 0 this tick)
    expect(entity.processor!.processing).toBe(true);
    expect(entity.inventory!.items).toHaveLength(0);

    // Second tick: progress advances
    processorSystem(state, 1 / 60, events);
    expect(entity.processor!.progress).toBeCloseTo(1 / 60);
  });

  it('completes processing after enough time and produces outputs', () => {
    const { state, events, entity } = setupProcessor();

    entity.inventory!.items.push('fish' as ItemId);

    // Run for 2+ seconds (recipe processingTime = 2.0)
    // First tick starts processing, then 120 more ticks to reach 2.0s
    const dt = 1 / 60;
    for (let i = 0; i < 122; i++) {
      processorSystem(state, dt, events);
    }

    // Should have completed and produced 2 fish_cuts in outputBuffer
    expect(entity.processor!.processing).toBe(false);
    expect(entity.source!.outputBuffer.length).toBe(2);
    expect(entity.source!.outputBuffer[0]).toBe('fish_cut');
    expect(entity.source!.outputBuffer[1]).toBe('fish_cut');
  });

  it('emits recipeCompleted event when processing finishes', () => {
    const { state, events, entity } = setupProcessor();

    let completed = false;
    events.on('recipeCompleted', () => {
      completed = true;
    });

    entity.inventory!.items.push('fish' as ItemId);

    const dt = 1 / 60;
    for (let i = 0; i < 122; i++) {
      processorSystem(state, dt, events);
      events.flush();
    }

    expect(completed).toBe(true);
  });

  it('does not start new processing while outputBuffer has items', () => {
    const { state, events, entity } = setupProcessor();

    // Pre-fill outputBuffer to simulate blocked output
    entity.source!.outputBuffer.push('fish_cut' as ItemId);
    entity.inventory!.items.push('fish' as ItemId);

    processorSystem(state, 1 / 60, events);

    // Should NOT start processing because output is blocked
    expect(entity.processor!.processing).toBe(false);
    expect(entity.inventory!.items).toHaveLength(1);
  });
});
