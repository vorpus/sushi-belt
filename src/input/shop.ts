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
};

const UPGRADE_ICONS: Record<string, string> = {
  belt_speed: '\u{26A1}',
};

export class Shop {
  private state: GameState;
  private events: EventBus;
  private toolState: ToolState;
  private toolbar: Toolbar;
  private buildingsContainer: HTMLElement;
  private upgradesContainer: HTMLElement;

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
    this.buildingsContainer = document.getElementById('shop-buildings')!;
    this.upgradesContainer = document.getElementById('shop-upgrades')!;

    this.buildUI();

    // Re-render on funds/unlock changes
    events.on('fundsChanged', () => this.updateUI());
    events.on('unlockPurchased', () => this.updateUI());
  }

  private buildUI(): void {
    // Buildings section
    for (const [id, def] of Object.entries(BUILDINGS)) {
      if (def.unlockCost <= 0) continue; // Skip free starter buildings

      const item = document.createElement('div');
      item.className = 'shop-item';
      item.dataset.buildingId = id;
      item.innerHTML = `
        <span class="shop-icon">${BUILDING_ICONS[id] ?? '\u{1F3E0}'}</span>
        <span class="shop-info">
          <span class="shop-name">${def.name}</span>
          <span class="shop-cost">$${def.unlockCost}</span>
        </span>
        <span class="shop-status"></span>
      `;
      item.addEventListener('click', () => this.onBuildingClick(id as BuildingId));
      this.buildingsContainer.appendChild(item);
    }

    // Upgrades section
    for (const [id, def] of Object.entries(UPGRADES)) {
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.dataset.upgradeId = id;
      item.innerHTML = `
        <span class="shop-icon">${UPGRADE_ICONS[id] ?? '\u{2B06}'}</span>
        <span class="shop-info">
          <span class="shop-name">${def.name}</span>
          <span class="shop-cost">$${def.cost}</span>
        </span>
        <span class="shop-status"></span>
      `;
      item.addEventListener('click', () => this.onUpgradeClick(id as UpgradeId));
      this.upgradesContainer.appendChild(item);
    }

    this.updateUI();
  }

  private onBuildingClick(buildingId: BuildingId): void {
    if (this.state.unlocks.has(buildingId)) {
      // Already unlocked — select it for placement
      this.toolState.selectedBuilding = buildingId;
      this.toolState.activeTool = 'place_building';
      this.toolbar.syncUI();
      return;
    }

    if (purchaseUnlock(this.state, buildingId, this.events)) {
      // Auto-select the newly unlocked building
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
    // Update building items
    const buildingItems = this.buildingsContainer.querySelectorAll('.shop-item');
    for (const item of buildingItems) {
      const id = (item as HTMLElement).dataset.buildingId as BuildingId;
      if (!id) continue;
      const def = BUILDINGS[id];
      if (!def) continue;

      const status = item.querySelector('.shop-status') as HTMLElement;
      const isUnlocked = this.state.unlocks.has(id);
      const canAfford = this.state.funds >= def.unlockCost;

      item.className = 'shop-item';
      if (isUnlocked) {
        item.classList.add('unlocked');
        status.textContent = '\u{2705}';
      } else if (canAfford) {
        item.classList.add('affordable');
        status.textContent = '\u{1F6D2}';
      } else {
        item.classList.add('locked');
        status.textContent = '\u{1F512}';
      }
    }

    // Update upgrade items
    const upgradeItems = this.upgradesContainer.querySelectorAll('.shop-item');
    for (const item of upgradeItems) {
      const id = (item as HTMLElement).dataset.upgradeId as UpgradeId;
      if (!id) continue;
      const def = UPGRADES[id];
      if (!def) continue;

      const status = item.querySelector('.shop-status') as HTMLElement;
      const costEl = item.querySelector('.shop-cost') as HTMLElement;
      const currentLevel = this.state.upgrades[id] ?? 0;
      const maxed = currentLevel >= def.maxLevel;
      const canAfford = this.state.funds >= def.cost;

      item.className = 'shop-item';
      if (maxed) {
        item.classList.add('unlocked');
        status.textContent = `${currentLevel}/${def.maxLevel}`;
        costEl.textContent = 'MAX';
      } else if (canAfford) {
        item.classList.add('affordable');
        status.textContent = `${currentLevel}/${def.maxLevel}`;
        costEl.textContent = `$${def.cost}`;
      } else {
        item.classList.add('locked');
        status.textContent = `${currentLevel}/${def.maxLevel}`;
        costEl.textContent = `$${def.cost}`;
      }
    }
  }
}
