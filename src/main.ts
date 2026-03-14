import { Application } from 'pixi.js';
import { createInitialState } from './core/state';
import { EventBus } from './core/eventBus';
import { GameLoop } from './core/gameLoop';
import { Renderer } from './rendering/renderer';
import { MinimapRenderer } from './rendering/minimapRenderer';
import { createCamera } from './input/camera';
import { createToolState } from './input/tools';
import { InputManager } from './input/inputManager';
import { Toolbar } from './input/toolbar';
import { Shop } from './input/shop';
import { createDemoState } from './debug/demoFactory';
import { createEconomySystem } from './systems/economySystem';

const GRID_WIDTH = 32;
const GRID_HEIGHT = 24;

(async () => {
  // 1. Initialize PixiJS v8 Application
  const app = new Application();
  await app.init({ background: 0x1a1a2e, resizeTo: window });
  document.body.appendChild(app.canvas);

  // 2. Create game state
  let state = createInitialState(GRID_WIDTH, GRID_HEIGHT);
  let events = new EventBus();

  // 3. Create renderer
  const renderer = new Renderer();

  // 4. Set up camera (viewport)
  const viewport = createCamera({
    app,
    worldWidth: GRID_WIDTH,
    worldHeight: GRID_HEIGHT,
  });
  app.stage.addChild(viewport);
  viewport.addChild(renderer.root);

  // 4b. Add HUD overlay directly to stage (not affected by camera)
  app.stage.addChild(renderer.uiRenderer.container);

  // 5. Set up minimap
  const minimap = new MinimapRenderer(viewport, app, GRID_WIDTH, GRID_HEIGHT);

  // 6. Set up input manager, toolbar, and shop
  const toolState = createToolState();
  let inputManager = new InputManager(viewport, state, events, toolState, renderer);
  const toolbar = new Toolbar(toolState, state);
  inputManager.setToolbar(toolbar);
  let shop = new Shop(state, events, toolState, toolbar);

  events.on('unlockPurchased', () => {
    toolbar.syncUI();
    shop.updateUI();
  });

  // 7. Create and start game loop
  let gameLoop = new GameLoop({ state, events, renderer });

  // Render minimap each frame via the game loop's render cycle
  const originalRender = renderer.render.bind(renderer);
  renderer.render = (s, alpha) => {
    originalRender(s, alpha);
    minimap.render(s);
  };

  gameLoop.start();

  // 8. Demo mode button (F9 or click)
  const demoBtn = document.getElementById('demo-btn');
  const activateDemo = () => {
    gameLoop.stop();
    const demo = createDemoState(GRID_WIDTH, GRID_HEIGHT);
    state = demo.state;
    events = demo.events;

    // Reinitialize systems with new state
    inputManager = new InputManager(viewport, state, events, toolState, renderer);
    inputManager.setToolbar(toolbar);
    shop = new Shop(state, events, toolState, toolbar);
    events.on('unlockPurchased', () => {
      toolbar.syncUI();
      shop.updateUI();
    });

    // Update toolbar to reflect new unlocks
    // Point toolbar at new state
    (toolbar as any).state = state;
    toolbar.syncUI();

    const economySystem = createEconomySystem();
    economySystem(state, events);

    gameLoop = new GameLoop({ state, events, renderer });
    renderer.render = (s, alpha) => {
      originalRender(s, alpha);
      minimap.render(s);
    };
    gameLoop.start();
  };

  demoBtn?.addEventListener('click', activateDemo);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F9') activateDemo();
  });
})();
