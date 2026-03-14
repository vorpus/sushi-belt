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
} as const satisfies Record<string, ItemDefinition>;

export type DataItemId = keyof typeof ITEMS;
