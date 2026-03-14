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
  nigiri: { id: 'nigiri', name: 'Nigiri', category: 'sushi', sprite: 'item_nigiri' },
} as const satisfies Record<string, ItemDefinition>;

export type DataItemId = keyof typeof ITEMS;
