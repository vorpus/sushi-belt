// ---------------------------------------------------------------------------
// Upgrade definitions for Sushi Belt
// ---------------------------------------------------------------------------

/** Shape of a single upgrade definition. */
export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
}

export const UPGRADES = {
  belt_speed: {
    id: 'belt_speed',
    name: 'Belt Speed',
    description: 'Increase belt speed by 25% per level',
    cost: 100,
    maxLevel: 3,
  },
  bulk_cutting: {
    id: 'bulk_cutting',
    name: 'Bulk Cutting',
    description: 'Cutting board outputs 3 fish cuts instead of 2',
    cost: 250,
    maxLevel: 1,
  },
  fast_cooker: {
    id: 'fast_cooker',
    name: 'Fast Cooker',
    description: 'Rice cooker processes 50% faster',
    cost: 200,
    maxLevel: 1,
  },
  efficient_assembly: {
    id: 'efficient_assembly',
    name: 'Efficient Assembly',
    description: 'All assembly stations process 30% faster',
    cost: 800,
    maxLevel: 1,
  },
} as const satisfies Record<string, UpgradeDefinition>;

export type UpgradeId = keyof typeof UPGRADES;
