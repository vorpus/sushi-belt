// ---------------------------------------------------------------------------
// Toolbar — connects HTML toolbar buttons to tool state
// ---------------------------------------------------------------------------

import type { ToolState, Tool } from './tools.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';

export class Toolbar {
  private toolState: ToolState;
  private toolButtons: NodeListOf<Element>;
  private buildingButtons: NodeListOf<Element>;
  private buildingPicker: HTMLElement;

  constructor(toolState: ToolState) {
    this.toolState = toolState;
    this.toolButtons = document.querySelectorAll('#toolbar .tool-btn');
    this.buildingButtons = document.querySelectorAll('#building-picker .building-btn');
    this.buildingPicker = document.getElementById('building-picker')!;

    // Tool button clicks
    this.toolButtons.forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const tool = (btn as HTMLElement).dataset.tool as Tool;
        if (tool) this.setTool(tool);
      });
    });

    // Building button clicks
    this.buildingButtons.forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const buildingId = (btn as HTMLElement).dataset.building as BuildingId;
        if (buildingId && buildingId in BUILDINGS) {
          this.setBuilding(buildingId);
        }
      });
    });

    // Sync initial state
    this.syncUI();
  }

  setTool(tool: Tool): void {
    this.toolState.activeTool = tool;
    this.syncUI();
  }

  setBuilding(buildingId: BuildingId): void {
    this.toolState.selectedBuilding = buildingId;
    this.toolState.activeTool = 'place_building';
    this.syncUI();
  }

  /** Call this whenever toolState changes externally (e.g. keyboard shortcut). */
  syncUI(): void {
    // Update tool buttons
    this.toolButtons.forEach((btn) => {
      const tool = (btn as HTMLElement).dataset.tool;
      btn.classList.toggle('active', tool === this.toolState.activeTool);
    });

    // Show/hide building picker
    const showPicker = this.toolState.activeTool === 'place_building';
    this.buildingPicker.classList.toggle('visible', showPicker);

    // Update building buttons
    this.buildingButtons.forEach((btn) => {
      const id = (btn as HTMLElement).dataset.building;
      btn.classList.toggle('active', id === this.toolState.selectedBuilding);
    });
  }
}
