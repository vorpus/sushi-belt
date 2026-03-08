import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/core/eventBus';
import type { EntityId, ItemId } from '../../src/core/types';

// Helpers to create branded-type values for tests.
const entityId = (id: string) => id as EntityId;
const itemId = (id: string) => id as ItemId;

describe('EventBus', () => {
  it('delivers events to handlers on flush', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('fundsChanged', handler);
    bus.emit('fundsChanged', { oldAmount: 100, newAmount: 200 });
    bus.flush();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ oldAmount: 100, newAmount: 200 });
  });

  it('does not deliver events before flush is called', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('fundsChanged', handler);
    bus.emit('fundsChanged', { oldAmount: 0, newAmount: 50 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('delivers multiple events to multiple handlers', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();

    bus.on('fundsChanged', h1);
    bus.on('fundsChanged', h2);
    bus.emit('fundsChanged', { oldAmount: 0, newAmount: 10 });
    bus.flush();

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('unregisters handlers with off', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('fundsChanged', handler);
    bus.off('fundsChanged', handler);
    bus.emit('fundsChanged', { oldAmount: 0, newAmount: 10 });
    bus.flush();

    expect(handler).not.toHaveBeenCalled();
  });

  it('only unregisters the specific handler passed to off', () => {
    const bus = new EventBus();
    const kept = vi.fn();
    const removed = vi.fn();

    bus.on('fundsChanged', kept);
    bus.on('fundsChanged', removed);
    bus.off('fundsChanged', removed);
    bus.emit('fundsChanged', { oldAmount: 0, newAmount: 10 });
    bus.flush();

    expect(kept).toHaveBeenCalledOnce();
    expect(removed).not.toHaveBeenCalled();
  });

  it('processes events emitted during flush in subsequent iterations', () => {
    const bus = new EventBus();
    const order: string[] = [];

    bus.on('itemProduced', (payload) => {
      order.push(`produced:${payload.itemId}`);
      // Emit a follow-up event during handling.
      bus.emit('itemSold', {
        itemId: payload.itemId,
        value: 10,
        sellerId: entityId('seller-1'),
      });
    });

    bus.on('itemSold', (payload) => {
      order.push(`sold:${payload.itemId}`);
    });

    bus.emit('itemProduced', {
      itemId: itemId('sushi-1'),
      sourceId: entityId('kitchen-1'),
    });

    bus.flush();

    expect(order).toEqual(['produced:sushi-1', 'sold:sushi-1']);
  });

  it('prevents infinite loops with max-iterations guard', () => {
    const bus = new EventBus();
    let count = 0;

    bus.on('fundsChanged', () => {
      count++;
      // Re-emit the same event every time — would loop forever without guard.
      bus.emit('fundsChanged', { oldAmount: 0, newAmount: count });
    });

    bus.emit('fundsChanged', { oldAmount: 0, newAmount: 0 });
    bus.flush();

    // The guard is 10 iterations; each iteration processes 1 event that emits 1 more.
    expect(count).toBe(10);
  });

  it('does not error when emitting events with no handlers', () => {
    const bus = new EventBus();

    bus.emit('buildingRemoved', { entityId: entityId('b-1') });
    expect(() => bus.flush()).not.toThrow();
  });

  it('does not error when calling off for a handler that was never registered', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    expect(() => bus.off('fundsChanged', handler)).not.toThrow();
  });

  it('handles different event types independently', () => {
    const bus = new EventBus();
    const fundsHandler = vi.fn();
    const beltHandler = vi.fn();

    bus.on('fundsChanged', fundsHandler);
    bus.on('beltPlaced', beltHandler);

    bus.emit('fundsChanged', { oldAmount: 0, newAmount: 50 });
    bus.flush();

    expect(fundsHandler).toHaveBeenCalledOnce();
    expect(beltHandler).not.toHaveBeenCalled();
  });
});
