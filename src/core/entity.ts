// ---------------------------------------------------------------------------
// Entity and component interfaces for Sushi Belt
// ---------------------------------------------------------------------------

import type {
  Direction,
  EntityId,
  GridPosition,
  ItemId,
} from './types.ts';

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/** Describes one connection point on a building or belt node. */
export type ConnectionPoint = { side: Direction; offset: number };

/** A source produces items at a fixed interval. */
export type SourceComponent = {
  produces: ItemId;
  interval: number;
  timer: number;
};

/** A processor transforms items according to a recipe. */
export type ProcessorComponent = {
  recipeId: string;
  progress: number;
  processing: boolean;
};

/** An assembler combines multiple inputs into an output. */
export type AssemblerComponent = {
  recipeId: string;
  progress: number;
  processing: boolean;
  inputSlots: Map<ItemId, number>;
};

/** A seller accepts finished goods belonging to certain categories. */
export type SellerComponent = {
  acceptsCategories: string[];
};

/** Describes the belt‑node connectivity for an entity. */
export type BeltNodeComponent = {
  inputs: ConnectionPoint[];
  outputs: ConnectionPoint[];
};

/** A simple inventory that holds items up to a maximum size. */
export type InventoryComponent = {
  items: ItemId[];
  maxSize: number;
};

/** Identifies which building definition this entity is based on. */
export type BuildingComponent = {
  buildingId: string;
  rotation: number;
};

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------

export interface Entity {
  id: EntityId;
  position: GridPosition;

  // Optional components – an entity only carries the components it needs.
  source?: SourceComponent;
  processor?: ProcessorComponent;
  assembler?: AssemblerComponent;
  seller?: SellerComponent;
  beltNode?: BeltNodeComponent;
  inventory?: InventoryComponent;
  building?: BuildingComponent;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let nextId = 1;

/** Create a bare entity at the given grid position with a unique ID. */
export function createEntity(position: GridPosition): Entity {
  const id = `entity_${nextId++}` as EntityId;
  return { id, position };
}
