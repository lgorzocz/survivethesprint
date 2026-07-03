/**
 * render.ts — high-resolution rendering for large / high-DPI monitors.
 *
 * The game is DESIGNED in a 960×540 coordinate space (see VIEW). If we render
 * the canvas at that size and let Scale.FIT stretch it up to a big monitor, the
 * whole picture is upscaled (≈2.7× on a 2560px display) and looks soft.
 *
 * Instead we make the canvas BACKING STORE `RENDER_SCALE`× bigger and zoom the
 * camera by the same factor, re-centred on the design area. Result: everything
 * is drawn at the higher resolution and merely shrunk to fit — crisp — while
 * every game object keeps using plain 960×540 coordinates (no refactor).
 *
 * Phaser Text is a rasterised texture, so camera zoom alone would still blur it;
 * main.ts bumps each Text's `resolution` to match (see the factory patch there).
 */
import Phaser from "phaser";
import { VIEW, recomputeDesign } from "./config/balance.ts";

/**
 * How many device pixels to render per design pixel. At least 2 (so even plain
 * dpr=1 large monitors get a sharp 1920×1080 buffer); higher on hi-DPI screens.
 */
export const RENDER_SCALE = Math.max(2, Math.ceil(window.devicePixelRatio || 1));

/** Zoom + centre a scene's camera so world 0..960 × 0..VIEW.height fills the canvas. */
export function setupCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(RENDER_SCALE);
  scene.cameras.main.centerOn(VIEW.width / 2, VIEW.height / 2);
}

/**
 * Re-read the responsive design height and, if it changed, resize the game's
 * backing store to the new aspect. Call at the top of every scene's create() so
 * a scene always lays out for the current viewport (e.g. after the mobile
 * browser toolbar collapsed during the previous scene). No-op when unchanged.
 */
export function applyResponsiveSize(scene: Phaser.Scene): void {
  if (recomputeDesign()) {
    scene.scale.setGameSize(VIEW.width * RENDER_SCALE, VIEW.height * RENDER_SCALE);
  }
}
