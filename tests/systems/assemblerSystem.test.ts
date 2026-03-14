import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/core/state';
import { EventBus } from '../../src/core/eventBus';
import { createEntity } from '../../src/core/entity';
import { assemblerSystem } from '../../src/systems/assemblerSystem';
import type { ItemId } from '../../src/core/types';

function setupAssembler() {
  const state = createInitialState(10, 10);
  const events = new EventBus();

  const entity = createEntity({ x: 5, y: 5 });
  entity.building = { buildingId: 'nigiri_press', rotation: 0 };
  entity.assembler = {
    recipeId: 'make_nigiri',
    progress: 0,
    processing: false,
    inputSlots: new Map(),
  };
  entity.inventory = { items: [], maxSize: 10 };
  entity.source = {
    produces: '' as ItemId,
    interval: Infinity,
    timer: Infinity,
    outputBuffer: [],
  };
  entity.beltNode = {
    inputs: [{ side: 'north', offset: 0 }, { side: 'south', offset: 0 }],
    outputs: [{ side: 'east', offset: 0 }],
  };

  state.entities.set(entity.id, entity);
  return { state, events, entity };
}

describe('assemblerSystem', () => {
  it('does nothing when no inputs are available', () => {
    const { state, events, entity } = setupAssembler();

    assemblerSystem(state, 1 / 60, events);

    expect(entity.assembler!.processing).toBe(false);
    expect(entity.assembler!.inputSlots.size).toBe(0);
  });

  it('waits when only one input type is present', () => {
    const { state, events, entity } = setupAssembler();

    entity.inventory!.items.push('fish_cut' as ItemId);
    assemblerSystem(state, 1 / 60, events);

    // fish_cut should be routed to input slot but not start processing
    expect(entity.assembler!.inputSlots.get('fish_cut' as ItemId)).toBe(1);
    expect(entity.assembler!.processing).toBe(false);
  });

  it('starts processing when both inputs are present', () => {
    const { state, events, entity } = setupAssembler();

    entity.inventory!.items.push('fish_cut' as ItemId);
    entity.inventory!.items.push('sushi_rice' as ItemId);

    assemblerSystem(state, 1 / 60, events);

    expect(entity.assembler!.processing).toBe(true);
    expect(entity.inventory!.items).toHaveLength(0);
    expect(entity.assembler!.inputSlots.size).toBe(0); // consumed
  });

  it('produces nigiri after processing time', () => {
    const { state, events, entity } = setupAssembler();

    entity.inventory!.items.push('fish_cut' as ItemId);
    entity.inventory!.items.push('sushi_rice' as ItemId);

    const dt = 1 / 60;
    // Need 1 tick to route + start, then ~180 ticks for 3s processing
    for (let i = 0; i < 200; i++) {
      assemblerSystem(state, dt, events);
    }

    expect(entity.assembler!.processing).toBe(false);
    expect(entity.source!.outputBuffer).toContain('nigiri');
  });

  it('does not start new assembly while output is blocked', () => {
    const { state, events, entity } = setupAssembler();

    entity.source!.outputBuffer.push('nigiri' as ItemId);
    entity.inventory!.items.push('fish_cut' as ItemId);
    entity.inventory!.items.push('sushi_rice' as ItemId);

    assemblerSystem(state, 1 / 60, events);

    // Items should route to slots but not start processing
    expect(entity.assembler!.processing).toBe(false);
  });
});
