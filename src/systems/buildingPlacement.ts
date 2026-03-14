// ---------------------------------------------------------------------------
// Building Placement System — place and remove buildings on the grid
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import type { Entity } from '../core/entity.ts';
import { createEntity } from '../core/entity.ts';
import { BUILDINGS, type BuildingId, type BuildingDefinition } from '../data/buildings.ts';
import type { GridPosition, EntityId, ItemId } from '../core/types.ts';

/**
 * Validate and place a building on the grid.
 * Returns the created entity, or null if placement is invalid.
 */
export function placeBuilding(
  state: GameState,
  buildingId: BuildingId,
  position: GridPosition,
  rotation: number,
  events: EventBus,
): Entity | null {
  const def: BuildingDefinition = BUILDINGS[buildingId];

  // Check all tiles in the building footprint
  for (let dy = 0; dy < def.size.h; dy++) {
    for (let dx = 0; dx < def.size.w; dx++) {
      const gx = position.x + dx;
      const gy = position.y + dy;

      // Bounds check
      if (
        gy < 0 ||
        gy >= state.grid.length ||
        gx < 0 ||
        gx >= state.grid[0].length
      ) {
        return null;
      }

      const cell = state.grid[gy][gx];

      // Terrain check
      if (cell.terrain !== def.terrain) {
        return null;
      }

      // Occupied check
      if (cell.entityId !== null) {
        return null;
      }
    }
  }

  // Create entity
  const entity = createEntity(position);
  entity.building = { buildingId, rotation };

  // Add components based on building definition
  if (def.components.source) {
    entity.source = {
      produces: def.components.source.produces as ItemId,
      interval: def.components.source.interval,
      timer: def.components.source.interval,
      outputBuffer: [],
    };
  }

  if (def.components.seller) {
    entity.seller = {
      acceptsCategories: [...def.components.seller.acceptsCategories],
    };
    // Seller buildings need an inventory to receive items from belts
    entity.inventory = { items: [], maxSize: 5 };
  }

  if (def.components.processor) {
    entity.processor = {
      recipeId: def.components.processor.recipeId,
      progress: 0,
      processing: false,
    };
    // Processor buildings need an inventory (input) and source-like outputBuffer
    entity.inventory = { items: [], maxSize: 5 };
    entity.source = {
      produces: '' as ItemId, // not used for processors — outputBuffer is managed by processorSystem
      interval: Infinity,
      timer: Infinity,
      outputBuffer: [],
    };
  }

  // Set up connection points
  if (def.connectionPoints.inputs || def.connectionPoints.outputs) {
    entity.beltNode = {
      inputs: def.connectionPoints.inputs
        ? [...def.connectionPoints.inputs]
        : [],
      outputs: def.connectionPoints.outputs
        ? [...def.connectionPoints.outputs]
        : [],
    };
  }

  // Register entity
  state.entities.set(entity.id, entity);

  // Mark grid cells as occupied
  for (let dy = 0; dy < def.size.h; dy++) {
    for (let dx = 0; dx < def.size.w; dx++) {
      state.grid[position.y + dy][position.x + dx].entityId = entity.id;
    }
  }

  events.emit('buildingPlaced', {
    buildingDef: buildingId,
    position,
    entityId: entity.id,
  });

  return entity;
}

/**
 * Remove a building from the grid and clean up its grid cells.
 */
export function removeBuilding(
  state: GameState,
  entityId: EntityId,
  events: EventBus,
): boolean {
  const entity = state.entities.get(entityId);
  if (!entity || !entity.building) return false;

  const def: BuildingDefinition = BUILDINGS[entity.building.buildingId as BuildingId];
  if (!def) return false;

  // Clear grid cells
  for (let dy = 0; dy < def.size.h; dy++) {
    for (let dx = 0; dx < def.size.w; dx++) {
      const gx = entity.position.x + dx;
      const gy = entity.position.y + dy;
      if (
        gy >= 0 &&
        gy < state.grid.length &&
        gx >= 0 &&
        gx < state.grid[0].length
      ) {
        state.grid[gy][gx].entityId = null;
      }
    }
  }

  state.entities.delete(entityId);
  events.emit('buildingRemoved', { entityId });

  return true;
}
