// ---------------------------------------------------------------------------
// Sprite Pool — reusable sprite object pool for rendering
// ---------------------------------------------------------------------------

import { Sprite, type Texture } from 'pixi.js';

/**
 * A simple pool of Sprite objects to avoid GC pressure
 * from creating/destroying sprites every frame.
 */
export class SpritePool {
  private pool: Sprite[] = [];
  private active: Sprite[] = [];
  private texture: Texture;

  constructor(texture: Texture, warmCount = 0) {
    this.texture = texture;
    // Pre-warm the pool
    for (let i = 0; i < warmCount; i++) {
      const sprite = new Sprite(this.texture);
      sprite.visible = false;
      this.pool.push(sprite);
    }
  }

  /** Acquire a sprite from the pool (or create a new one). */
  acquire(): Sprite {
    const sprite = this.pool.pop() ?? new Sprite(this.texture);
    sprite.visible = true;
    this.active.push(sprite);
    return sprite;
  }

  /** Release a specific sprite back to the pool. */
  release(sprite: Sprite): void {
    sprite.visible = false;
    const idx = this.active.indexOf(sprite);
    if (idx !== -1) {
      this.active.splice(idx, 1);
    }
    this.pool.push(sprite);
  }

  /** Release all active sprites back to the pool. */
  releaseAll(): void {
    for (const sprite of this.active) {
      sprite.visible = false;
      this.pool.push(sprite);
    }
    this.active.length = 0;
  }

  /** Number of currently active sprites. */
  get activeCount(): number {
    return this.active.length;
  }

  /** Total sprites (active + pooled). */
  get totalCount(): number {
    return this.active.length + this.pool.length;
  }
}
