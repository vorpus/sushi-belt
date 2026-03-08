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

export const RECIPES = {} as const satisfies Record<string, RecipeDefinition>;
