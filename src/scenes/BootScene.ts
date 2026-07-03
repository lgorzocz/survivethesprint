/**
 * BootScene — preload assets (CLAUDE.md §8).
 *
 * Phase 1 is entirely procedural (graphics + text), so there is nothing to load
 * yet. This scene exists as the seam where real sprite/audio assets get wired in
 * during Phase 2 without touching the other scenes.
 */
import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    // Real sprite/audio assets get loaded here later; still procedural for now.
  }

  create(): void {
    this.makeSparkTexture();
    this.makeWorklogLogoTexture();
    this.scene.start("MenuScene");
  }

  /** Small white dot used by particle bursts (collect / hit / clear-screen juice). */
  private makeSparkTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture("spark", 16, 16);
    g.destroy();
  }

  /**
   * Worklog Hub brand mark — the two-polygon logo, rendered once into a texture.
   * Source viewBox 0..128; points are shifted so the mark's bbox (28,36)-(100,92)
   * sits padded inside an 80x64 texture ("worklog_logo").
   */
  private makeWorklogLogoTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const P = (x: number, y: number) => new Phaser.Math.Vector2(x, y);
    const white = [
      P(4, 4),
      P(36, 4),
      P(36, 22),
      P(48, 22),
      P(48, 42),
      P(36, 42),
      P(36, 60),
      P(4, 60),
    ];
    const blue = [
      P(36, 4),
      P(76, 4),
      P(76, 60),
      P(36, 60),
      P(36, 42),
      P(48, 42),
      P(48, 22),
      P(36, 22),
    ];
    g.fillStyle(0xffffff, 1);
    g.fillPoints(white, true);
    g.fillStyle(0x60a5fa, 1);
    g.fillPoints(blue, true);
    g.generateTexture("worklog_logo", 80, 64);
    g.destroy();
  }
}
