import { Application } from 'pixi.js';
import { createInitialState } from './core/state';
import { EventBus } from './core/eventBus';
import { GameLoop } from './core/gameLoop';

(async () => {
  // 1. Initialize PixiJS v8 Application
  const app = new Application();
  await app.init({ background: 0x1a1a2e, resizeTo: window });
  document.body.appendChild(app.canvas);

  // 2. Create game state (32x24 grid)
  const state = createInitialState(32, 24);

  // 3. Create event bus
  const events = new EventBus();

  // 4. Create and start game loop (no renderer for M1)
  const gameLoop = new GameLoop({ state, events, renderer: null });
  gameLoop.start();

  // 5. Log tick count every second to verify loop is running
  setInterval(() => console.log('Tick:', state.tick), 1000);
})();
