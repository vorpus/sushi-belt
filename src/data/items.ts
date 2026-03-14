// ---------------------------------------------------------------------------
// Item definitions for Sushi Belt
// ---------------------------------------------------------------------------

/** Shape of a single item definition. */
export interface ItemDefinition {
  id: string;
  name: string;
  category: 'raw' | 'processed' | 'sushi';
  sprite: string;
}

export const ITEMS = {
  fish: { id: 'fish', name: 'Fish', category: 'raw', sprite: 'item_fish' },
  fish_cut: { id: 'fish_cut', name: 'Fish Cut', category: 'processed', sprite: 'item_fish_cut' },
  rice: { id: 'rice', name: 'Rice', category: 'raw', sprite: 'item_rice' },
  sushi_rice: { id: 'sushi_rice', name: 'Sushi Rice', category: 'processed', sprite: 'item_sushi_rice' },
  seasoned_rice: { id: 'seasoned_rice', name: 'Seasoned Rice', category: 'processed', sprite: 'item_seasoned_rice' },
  nori: { id: 'nori', name: 'Nori', category: 'raw', sprite: 'item_nori' },
  vegetables: { id: 'vegetables', name: 'Vegetables', category: 'raw', sprite: 'item_vegetables' },
  pickled_veg: { id: 'pickled_veg', name: 'Pickled Veg', category: 'processed', sprite: 'item_pickled_veg' },
  nigiri: { id: 'nigiri', name: 'Nigiri', category: 'sushi', sprite: 'item_nigiri' },
  maki: { id: 'maki', name: 'Maki', category: 'sushi', sprite: 'item_maki' },
  gunkan: { id: 'gunkan', name: 'Gunkan', category: 'sushi', sprite: 'item_gunkan' },
  veggie_roll: { id: 'veggie_roll', name: 'Veggie Roll', category: 'sushi', sprite: 'item_veggie_roll' },
  temaki: { id: 'temaki', name: 'Temaki', category: 'sushi', sprite: 'item_temaki' },
} as const satisfies Record<string, ItemDefinition>;

export type DataItemId = keyof typeof ITEMS;
