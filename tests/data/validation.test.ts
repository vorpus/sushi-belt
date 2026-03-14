import { describe, it, expect } from 'vitest';
import { ITEMS } from '../../src/data/items';
import { RECIPES } from '../../src/data/recipes';
import { BUILDINGS } from '../../src/data/buildings';
import { SELL_PRICES } from '../../src/data/economy';

describe('data validation', () => {
  it('every recipe references valid item IDs', () => {
    for (const [id, recipe] of Object.entries(RECIPES)) {
      for (const input of recipe.inputs) {
        expect(ITEMS).toHaveProperty(input.item, expect.anything());
      }
      for (const output of recipe.outputs) {
        expect(ITEMS).toHaveProperty(output.item, expect.anything());
      }
    }
  });

  it('every building with processor/assembler references a valid recipe', () => {
    for (const [id, def] of Object.entries(BUILDINGS)) {
      if (def.components.processor) {
        expect(RECIPES).toHaveProperty(def.components.processor.recipeId);
      }
      if (def.components.assembler) {
        expect(RECIPES).toHaveProperty(def.components.assembler.recipeId);
      }
    }
  });

  it('every item has a sell price', () => {
    for (const id of Object.keys(ITEMS)) {
      expect(SELL_PRICES).toHaveProperty(id);
      expect(SELL_PRICES[id as keyof typeof SELL_PRICES]).toBeGreaterThan(0);
    }
  });

  it('every building has valid connection point sides', () => {
    const validSides = new Set(['north', 'south', 'east', 'west']);
    for (const [id, def] of Object.entries(BUILDINGS)) {
      for (const cp of def.connectionPoints.inputs ?? []) {
        expect(validSides.has(cp.side)).toBe(true);
      }
      for (const cp of def.connectionPoints.outputs ?? []) {
        expect(validSides.has(cp.side)).toBe(true);
      }
    }
  });

  it('all unlock costs are non-negative', () => {
    for (const [id, def] of Object.entries(BUILDINGS)) {
      expect(def.unlockCost).toBeGreaterThanOrEqual(0);
    }
  });

  it('every source building produces a valid item', () => {
    for (const [id, def] of Object.entries(BUILDINGS)) {
      if (def.components.source) {
        expect(ITEMS).toHaveProperty(def.components.source.produces);
      }
    }
  });
});
