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
    description: 'Increase belt speed by 25%',
    cost: 50,
    maxLevel: 3,
  },
} as const satisfies Record<string, UpgradeDefinition>;

export type UpgradeId = keyof typeof UPGRADES;
