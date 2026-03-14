// ---------------------------------------------------------------------------
// Shop — connects HTML shop panel to game state and economy
// ---------------------------------------------------------------------------

import type { GameState } from '../core/state.ts';
import type { EventBus } from '../core/eventBus.ts';
import { BUILDINGS, type BuildingId } from '../data/buildings.ts';
import { UPGRADES, type UpgradeId } from '../data/upgrades.ts';
import { purchaseUnlock, purchaseUpgrade } from '../systems/economySystem.ts';
import type { ToolState } from './tools.ts';
import type { Toolbar } from './toolbar.ts';

const BUILDING_ICONS: Record<string, string> = {
  fishing_boat: '\u{1F3A3}',
  fish_market: '\u{1F3EA}',
  cutting_board: '\u{1F52A}',
  rice_paddy: '\u{1F33E}',
  rice_cooker: '\u{1F35A}',
  nigiri_press: '\u{1F363}',
  sushi_shop: '\u{1F3EC}',
  splitter: '\u{1F500}',
  merger: '\u{1F504}',
  tunnel: '\u{1F573}',
  seaweed_farm: '\u{1F33F}',
  garden_plot: '\u{1F96C}',
  seasoning_station: '\u{1F9C2}',
  pickling_barrel: '\u{1F952}',
  maki_roller: '\u{1F371}',
  gunkan_wrapper: '\u{1F358}',
  veggie_roll_station: '\u{1F957}',
  temaki_station: '\u{1F32E}',
};

const UPGRADE_ICONS: Record<string, string> = {
  belt_speed: '\u{26A1}',
};

export class Shop {
  private state: GameState;
  private events: EventBus;
  private toolState: ToolState;
  private toolbar: Toolbar;
  private scrollContainer: HTMLElement;

  constructor(
    state: GameState,
    events: EventBus,
    toolState: ToolState,
    toolbar: Toolbar,
  ) {
    this.state = state;
    this.events = events;
    this.toolState = toolState;
    this.toolbar = toolbar;
    this.scrollContainer = document.getElementById('shop-scroll')!;

    this.buildUI();

    events.on('fundsChanged', () => this.updateUI());
    events.on('unlockPurchased', () => this.updateUI());
  }

  private buildUI(): void {
    // Buildings with unlock costs
    for (const [id, def] of Object.entries(BUILDINGS)) {
      if (def.unlockCost <= 0) continue;

      const item = document.createElement('div');
      item.className = 'shop-item';
      item.dataset.buildingId = id;
      item.innerHTML = `
        <span class="si-icon">${BUILDING_ICONS[id] ?? '\u{1F3E0}'}</span>
        <span>${def.name}</span>
        <span class="si-cost">$${def.unlockCost}</span>
        <span class="si-status"></span>
      `;
      item.addEventListener('click', () => this.onBuildingClick(id as BuildingId));
      this.scrollContainer.appendChild(item);
    }

    // Upgrades
    for (const [id, def] of Object.entries(UPGRADES)) {
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.dataset.upgradeId = id;
      item.innerHTML = `
        <span class="si-icon">${UPGRADE_ICONS[id] ?? '\u{2B06}'}</span>
        <span>${def.name}</span>
        <span class="si-cost">$${def.cost}</span>
        <span class="si-status"></span>
      `;
      item.addEventListener('click', () => this.onUpgradeClick(id as UpgradeId));
      this.scrollContainer.appendChild(item);
    }

    this.updateUI();
  }

  private onBuildingClick(buildingId: BuildingId): void {
    if (this.state.unlocks.has(buildingId)) {
      this.toolState.selectedBuilding = buildingId;
      this.toolState.activeTool = 'place_building';
      this.toolbar.syncUI();
      return;
    }

    if (purchaseUnlock(this.state, buildingId, this.events)) {
      this.toolState.selectedBuilding = buildingId;
      this.toolState.activeTool = 'place_building';
      this.toolbar.syncUI();
      this.events.flush();
    }
  }

  private onUpgradeClick(upgradeId: UpgradeId): void {
    if (purchaseUpgrade(this.state, upgradeId, this.events)) {
      this.events.flush();
      this.updateUI();
    }
  }

  updateUI(): void {
    const items = this.scrollContainer.querySelectorAll('.shop-item');
    for (const item of items) {
      const el = item as HTMLElement;
      const buildingId = el.dataset.buildingId as BuildingId;
      const upgradeId = el.dataset.upgradeId as UpgradeId;
      const status = el.querySelector('.si-status') as HTMLElement;
      const costEl = el.querySelector('.si-cost') as HTMLElement;

      if (buildingId) {
        const def = BUILDINGS[buildingId];
        if (!def) continue;
        const isUnlocked = this.state.unlocks.has(buildingId);
        const canAfford = this.state.funds >= def.unlockCost;

        el.className = 'shop-item';
        if (isUnlocked) {
          el.classList.add('unlocked');
          status.textContent = '\u{2705}';
        } else if (canAfford) {
          el.classList.add('affordable');
          status.textContent = '\u{1F6D2}';
        } else {
          el.classList.add('locked');
          status.textContent = '\u{1F512}';
        }
      } else if (upgradeId) {
        const def = UPGRADES[upgradeId];
        if (!def) continue;
        const currentLevel = this.state.upgrades[upgradeId] ?? 0;
        const maxed = currentLevel >= def.maxLevel;
        const canAfford = this.state.funds >= def.cost;

        el.className = 'shop-item';
        if (maxed) {
          el.classList.add('unlocked');
          status.textContent = `${currentLevel}/${def.maxLevel}`;
          costEl.textContent = 'MAX';
        } else if (canAfford) {
          el.classList.add('affordable');
          status.textContent = `${currentLevel}/${def.maxLevel}`;
        } else {
          el.classList.add('locked');
          status.textContent = `${currentLevel}/${def.maxLevel}`;
        }
      }
    }
  }
}
