// ---------------------------------------------------------------------------
// Recipe definitions for Sushi Belt
// ---------------------------------------------------------------------------

import type { DataItemId } from './items.ts';

/** Shape of a single recipe definition. */
export interface RecipeDefinition {
  id: string;
  inputs: { item: DataItemId; count: number }[];
  outputs: { item: DataItemId; count: number }[];
  processingTime: number;
  building: string;
}

export const RECIPES = {
  cut_fish: {
    id: 'cut_fish',
    inputs: [{ item: 'fish', count: 1 }],
    outputs: [{ item: 'fish_cut', count: 2 }],
    processingTime: 2.0,
    building: 'cutting_board',
  },
  cook_rice: {
    id: 'cook_rice',
    inputs: [{ item: 'rice', count: 1 }],
    outputs: [{ item: 'sushi_rice', count: 1 }],
    processingTime: 3.0,
    building: 'rice_cooker',
  },
  make_nigiri: {
    id: 'make_nigiri',
    inputs: [{ item: 'fish_cut', count: 1 }, { item: 'sushi_rice', count: 1 }],
    outputs: [{ item: 'nigiri', count: 1 }],
    processingTime: 3.0,
    building: 'nigiri_press',
  },
} as const satisfies Record<string, RecipeDefinition>;

export type RecipeId = keyof typeof RECIPES;
