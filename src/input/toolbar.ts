// ---------------------------------------------------------------------------
// Toolbar — connects HTML toolbar buttons to tool state
// ---------------------------------------------------------------------------

import type { ToolState, Tool } from './tools.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';
import type { GameState } from '../core/state.ts';

const ROTATION_ICONS = ['\u2B06\uFE0F', '\u27A1\uFE0F', '\u2B07\uFE0F', '\u2B05\uFE0F'];

export class Toolbar {
  private toolState: ToolState;
  private state: GameState;
  private toolButtons: NodeListOf<Element>;
  private buildingButtons: NodeListOf<Element>;
  private buildingPicker: HTMLElement;
  private rotateBtn: HTMLElement | null;
  private rotateIcon: HTMLElement | null;

  constructor(toolState: ToolState, state: GameState) {
    this.toolState = toolState;
    this.state = state;
    this.toolButtons = document.querySelectorAll('#tool-row .tool-btn[data-tool]');
    this.buildingButtons = document.querySelectorAll('#building-picker .building-btn');
    this.buildingPicker = document.getElementById('building-picker')!;
    this.rotateBtn = document.getElementById('rotate-btn');
    this.rotateIcon = document.getElementById('rotate-icon');

    // Tool button clicks
    this.toolButtons.forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const tool = (btn as HTMLElement).dataset.tool as Tool;
        if (tool) this.setTool(tool);
      });
    });

    // Rotate button click
    if (this.rotateBtn) {
      this.rotateBtn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.toolState.rotation = (this.toolState.rotation + 1) % 4;
        this.syncUI();
      });
    }

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

  syncUI(): void {
    this.toolButtons.forEach((btn) => {
      const tool = (btn as HTMLElement).dataset.tool;
      btn.classList.toggle('active', tool === this.toolState.activeTool);
    });

    const showPicker = this.toolState.activeTool === 'place_building';
    this.buildingPicker.classList.toggle('visible', showPicker);
    if (this.rotateBtn) {
      this.rotateBtn.style.display = showPicker || this.toolState.activeTool === 'place_belt' ? '' : 'none';
    }

    if (this.rotateIcon) {
      this.rotateIcon.textContent = ROTATION_ICONS[this.toolState.rotation] ?? '\u2B06\uFE0F';
    }

    this.buildingButtons.forEach((btn) => {
      const id = (btn as HTMLElement).dataset.building;
      const unlocked = id ? this.state.unlocks.has(id) : false;
      (btn as HTMLElement).style.display = unlocked ? '' : 'none';
      btn.classList.toggle('active', id === this.toolState.selectedBuilding);
    });
  }
}
