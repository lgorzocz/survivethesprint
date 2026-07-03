/**
 * Pickup — a positive power-up token (CLAUDE.md §5).
 *
 * Coffee sits on the line (grab it grounded); tech is drawn ELEVATED, so the
 * player must jump to reach it — that jump is the risk the design is built
 * around. The themed snippet (§4) rides just under the token.
 */
import Phaser from "phaser";
import type { PowerUp } from "../config/powerups.ts";

export class Pickup extends Phaser.GameObjects.Container {
  readonly config: PowerUp;
  readonly lane: number;
  readonly elevated: boolean;
  /** Baseline Y used for geometric collection (idle float aside). */
  readonly baseY: number;
  consumed = false;

  constructor(
    scene: Phaser.Scene,
    config: PowerUp,
    lane: number,
    x: number,
    y: number,
  ) {
    super(scene, x, y);
    this.config = config;
    this.lane = lane;
    this.elevated = config.elevated;
    this.baseY = y;

    if (config.id === "coffee") {
      this.drawCoffee();
    } else {
      this.drawTech();
    }

    // themed snippet under the token
    this.add(
      scene.add
        .text(0, 24, config.snippet, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#7aa2f7",
        })
        .setOrigin(0.5)
        .setAlpha(0.7),
    );

    scene.add.existing(this);
    this.setDepth(10);

    // gentle idle float so pickups feel collectible
    scene.tweens.add({
      targets: this,
      y: y - 4,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  private drawCoffee(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(this.config.color, 1);
    g.fillRoundedRect(-13, -10, 24, 18, 4); // cup
    g.lineStyle(3, this.config.color, 1);
    g.strokeCircle(15, -1, 6); // handle
    g.fillStyle(0x3a2a1a, 1);
    g.fillRoundedRect(-11, -9, 20, 5, 2); // coffee surface
    this.add(g);
    this.add(
      this.scene.add
        .text(0, -1, "☕", { fontSize: "14px" })
        .setOrigin(0.5),
    );
  }

  private drawTech(): void {
    if (this.config.id === "worklog_hub") {
      this.drawWorklog();
      return;
    }
    // size the token to its label so multi-word techs don't overflow the tile
    const label = this.scene.add
      .text(0, 0, this.config.label, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const w = Math.max(60, label.width + 22);
    const g = this.scene.add.graphics();
    g.fillStyle(this.config.color, 1);
    g.fillRoundedRect(-w / 2, -14, w, 28, 6);
    g.lineStyle(2, 0xffffff, 0.6);
    g.strokeRoundedRect(-w / 2, -14, w, 28, 6);
    this.add(g);
    this.add(label);
    // little "jump to grab" up-chevron for elevated tokens
    if (this.elevated) {
      this.add(
        this.scene.add
          .text(0, -24, "▲", { fontSize: "12px", color: "#7aa2f7" })
          .setOrigin(0.5)
          .setAlpha(0.8),
      );
    }
  }

  /** Branded Worklog Hub token: navy card + logo mark + wordmark. */
  private drawWorklog(): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x0b2135, 1); // dark navy so the white+blue logo pops
    g.fillRoundedRect(-38, -16, 76, 32, 6);
    g.lineStyle(2, 0x60a5fa, 0.85);
    g.strokeRoundedRect(-38, -16, 76, 32, 6);
    this.add(g);

    this.add(
      this.scene.add.image(-20, 0, "worklog_logo").setDisplaySize(25, 20),
    );
    const word = (y: number, s: string) =>
      this.scene.add
        .text(8, y, s, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    this.add(word(-5, "Worklog"));
    this.add(word(6, "Hub"));

    if (this.elevated) {
      this.add(
        this.scene.add
          .text(0, -26, "▲", { fontSize: "12px", color: "#7aa2f7" })
          .setOrigin(0.5)
          .setAlpha(0.8),
      );
    }
  }

  /** Pop + fade when collected. */
  collectFx(): void {
    this.consumed = true;
    this.scene.tweens.add({
      targets: this,
      scale: 1.6,
      alpha: 0,
      duration: 180,
      onComplete: () => this.destroy(),
    });
  }
}
