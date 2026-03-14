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
  season_rice: {
    id: 'season_rice',
    inputs: [{ item: 'sushi_rice', count: 1 }],
    outputs: [{ item: 'seasoned_rice', count: 1 }],
    processingTime: 2.0,
    building: 'seasoning_station',
  },
  pickle_veg: {
    id: 'pickle_veg',
    inputs: [{ item: 'vegetables', count: 1 }],
    outputs: [{ item: 'pickled_veg', count: 1 }],
    processingTime: 4.0,
    building: 'pickling_barrel',
  },
  make_maki: {
    id: 'make_maki',
    inputs: [{ item: 'fish_cut', count: 1 }, { item: 'seasoned_rice', count: 1 }, { item: 'nori', count: 1 }],
    outputs: [{ item: 'maki', count: 1 }],
    processingTime: 4.0,
    building: 'maki_roller',
  },
  make_gunkan: {
    id: 'make_gunkan',
    inputs: [{ item: 'fish_cut', count: 1 }, { item: 'sushi_rice', count: 1 }, { item: 'nori', count: 1 }],
    outputs: [{ item: 'gunkan', count: 1 }],
    processingTime: 3.5,
    building: 'gunkan_wrapper',
  },
  make_veggie_roll: {
    id: 'make_veggie_roll',
    inputs: [{ item: 'pickled_veg', count: 1 }, { item: 'seasoned_rice', count: 1 }, { item: 'nori', count: 1 }],
    outputs: [{ item: 'veggie_roll', count: 1 }],
    processingTime: 4.0,
    building: 'veggie_roll_station',
  },
  make_temaki: {
    id: 'make_temaki',
    inputs: [{ item: 'fish_cut', count: 1 }, { item: 'sushi_rice', count: 1 }, { item: 'nori', count: 1 }, { item: 'pickled_veg', count: 1 }],
    outputs: [{ item: 'temaki', count: 1 }],
    processingTime: 5.0,
    building: 'temaki_station',
  },
} as const satisfies Record<string, RecipeDefinition>;

export type RecipeId = keyof typeof RECIPES;
