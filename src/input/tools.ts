// ---------------------------------------------------------------------------
// Tool types and state for Sushi Belt
// ---------------------------------------------------------------------------

import type { BuildingId } from '../data/buildings.ts';

export type Tool = 'select' | 'place_building' | 'place_belt' | 'delete';

export interface ToolState {
  activeTool: Tool;
  selectedBuilding: BuildingId | null;
}

export function createToolState(): ToolState {
  return {
    activeTool: 'place_building',
    selectedBuilding: 'fishing_boat',
  };
}
