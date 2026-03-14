import { Application } from 'pixi.js';
import { createInitialState } from './core/state';
import { EventBus } from './core/eventBus';
import { GameLoop } from './core/gameLoop';
import { Renderer } from './rendering/renderer';
import { createCamera } from './input/camera';
import { createToolState } from './input/tools';
import { InputManager } from './input/inputManager';
import { Toolbar } from './input/toolbar';

const GRID_WIDTH = 32;
const GRID_HEIGHT = 24;

(async () => {
  // 1. Initialize PixiJS v8 Application
  const app = new Application();
  await app.init({ background: 0x1a1a2e, resizeTo: window });
  document.body.appendChild(app.canvas);

  // 2. Create game state
  const state = createInitialState(GRID_WIDTH, GRID_HEIGHT);

  // 3. Create event bus
  const events = new EventBus();

  // 4. Create renderer
  const renderer = new Renderer();

  // 5. Set up camera (viewport)
  const viewport = createCamera({
    app,
    worldWidth: GRID_WIDTH,
    worldHeight: GRID_HEIGHT,
  });
  app.stage.addChild(viewport);
  viewport.addChild(renderer.root);

  // 5b. Add HUD overlay directly to stage (not affected by camera)
  app.stage.addChild(renderer.uiRenderer.container);

  // 6. Set up input manager and toolbar
  const toolState = createToolState();
  const inputManager = new InputManager(viewport, state, events, toolState, renderer);
  const toolbar = new Toolbar(toolState);
  inputManager.setToolbar(toolbar);

  // 7. Create and start game loop
  const gameLoop = new GameLoop({ state, events, renderer });
  gameLoop.start();
})();
