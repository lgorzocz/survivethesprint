/**
 * Hazard — obstacle (survivable, +bugs) or catastrophe (instant death).
 * (CLAUDE.md §5.)
 *
 * Obstacles are amber warnings. Catastrophes are red, skull-marked, and pulse
 * hard so they read as lethal from far away — the heavy telegraphing (§5) means
 * a death is always the player's own miss, never bad luck. Scene-level slow-mo
 * and screen shake add the rest of the telegraph.
 */
import Phaser from "phaser";
import { COLORS } from "../config/balance.ts";
import type { Hazard as HazardConfig } from "../config/hazards.ts";
import { loc } from "../i18n.ts";

export class Hazard extends Phaser.GameObjects.Container {
  readonly config: HazardConfig;
  readonly lane: number;
  readonly elevated: boolean;
  readonly fatal: boolean;
  /** Baseline Y used for geometric collision. */
  readonly baseY: number;
  consumed = false;
  /** true once the scene has fired the catastrophe telegraph for this token. */
  telegraphed = false;

  constructor(
    scene: Phaser.Scene,
    config: HazardConfig,
    lane: number,
    x: number,
    y: number,
  ) {
    super(scene, x, y);
    this.config = config;
    this.lane = lane;
    this.elevated = config.elevated;
    this.fatal = config.fatal;
    this.baseY = y;

    if (config.fatal) {
      this.drawCatastrophe();
    } else {
      this.drawObstacle();
    }

    scene.add.existing(this);
    this.setDepth(10);
  }

  private drawObstacle(): void {
    const g = this.scene.add.graphics();
    // amber warning triangle
    g.fillStyle(this.config.color, 1);
    g.beginPath();
    g.moveTo(0, -18);
    g.lineTo(22, 18);
    g.lineTo(-22, 18);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x111111, 0.8);
    g.strokePath();
    this.add(g);
    this.add(
      this.scene.add
        .text(0, 6, "!", {
          fontFamily: "monospace",
          fontSize: "18px",
          color: "#1e1e1e",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    this.add(
      this.scene.add
        .text(0, 30, loc(this.config.label), {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#e0a030",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
  }

  private drawCatastrophe(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(COLORS.danger, 1);
    g.fillRoundedRect(-34, -20, 68, 40, 6);
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeRoundedRect(-34, -20, 68, 40, 6);
    this.add(g);
    this.add(
      this.scene.add.text(0, -6, "☠", { fontSize: "20px" }).setOrigin(0.5),
    );
    this.add(
      this.scene.add
        .text(0, 12, loc(this.config.label), {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    // hard pulse = "this will kill you"
    this.scene.tweens.add({
      targets: this,
      scale: { from: 1, to: 1.18 },
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  /** Amber "bugs fed" pop when an obstacle is hit. */
  hitFx(): void {
    this.consumed = true;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.4,
      duration: 160,
      onComplete: () => this.destroy(),
    });
  }
}
