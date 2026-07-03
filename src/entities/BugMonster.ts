/**
 * BugMonster — a churning mass of red errors, not a creature (CLAUDE.md §4).
 *
 * It is anchored to the LEFT edge and grows rightwards. Its width = the bug
 * ratio, so its size and its proximity to the player are the same readout:
 *   thin red haze -> nervous blob -> a wall of churning errors.
 * When its right edge reaches the player's X, the player is caught (slow death).
 */
import Phaser from "phaser";
import { COLORS, MONSTER, PLAYER, VIEW } from "../config/balance.ts";

const ERROR_NOISE = [
  "TypeError: undefined",
  "at <anonymous>:1:1",
  "NullPointerException",
  "[ERROR] segfault",
  "unhandled rejection",
  "stack overflow",
  "Cannot read 'x'",
];

export class BugMonster extends Phaser.GameObjects.Container {
  private bodyGfx: Phaser.GameObjects.Graphics;
  private face: Phaser.GameObjects.Graphics;
  private noise: Phaser.GameObjects.Text[] = [];
  private width_ = MONSTER.minWidth;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.bodyGfx = scene.add.graphics();
    this.face = scene.add.graphics();
    this.add([this.bodyGfx, this.face]);

    for (let i = 0; i < 6; i++) {
      const t = scene.add
        .text(0, 0, ERROR_NOISE[i % ERROR_NOISE.length], {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#ff8a80",
        })
        .setAlpha(0.5);
      this.noise.push(t);
      this.add(t);
    }

    scene.add.existing(this);
    this.setDepth(20);
  }

  /** Width in px given the 0..1 bug ratio. */
  private widthForRatio(ratio: number): number {
    return Phaser.Math.Linear(
      MONSTER.minWidth,
      PLAYER.x + MONSTER.overreach,
      ratio,
    );
  }

  hasCaught(ratio: number): boolean {
    return this.widthForRatio(ratio) >= PLAYER.x;
  }

  update(dtMs: number, ratio: number): void {
    // ease toward the target width so growth reads as churning, not snapping
    const target = this.widthForRatio(ratio);
    this.width_ += (target - this.width_) * Math.min(1, dtMs / 140);
    const w = this.width_;
    const jitter = () => (Math.random() - 0.5) * (4 + ratio * 10);

    // body — layered translucent red slabs for a churning look
    this.bodyGfx.clear();
    this.bodyGfx.fillStyle(COLORS.monster, 0.32);
    this.bodyGfx.fillRect(0, 0, w + 10, VIEW.height);
    this.bodyGfx.fillStyle(COLORS.monster, 0.55);
    this.bodyGfx.fillRect(0, 0, w * 0.7, VIEW.height);
    this.bodyGfx.fillStyle(COLORS.monsterCore, 0.28);
    this.bodyGfx.fillRect(0, 0, w * 0.4, VIEW.height);
    // ragged leading edge
    this.bodyGfx.fillStyle(COLORS.monster, 0.5);
    for (let y = 0; y < VIEW.height; y += 22) {
      this.bodyGfx.fillRect(w - 6, y, 12 + jitter(), 16);
    }

    // churning error text
    for (let i = 0; i < this.noise.length; i++) {
      const t = this.noise[i];
      t.setPosition(
        6 + Math.random() * Math.max(2, w - 90),
        40 + i * ((VIEW.height - 80) / this.noise.length) + jitter(),
      );
      if (Math.random() < 0.02) {
        t.setText(ERROR_NOISE[Math.floor(Math.random() * ERROR_NOISE.length)]);
      }
    }

    // face at the leading edge — escalates with proximity (ratio)
    this.drawFace(Math.max(34, w - 30), VIEW.height / 2, ratio, jitter);
  }

  /**
   * The face gets scarier the closer the monster is (ratio ~ proximity):
   *   far  → small, calm-ish eyes, a thin gritted mouth
   *   near → big face, angry brows, glowing red eyes, a gaping fanged maw
   */
  private drawFace(
    fx: number,
    cy: number,
    ratio: number,
    jitter: () => number,
  ): void {
    const g = this.face;
    g.clear();

    const s = 0.75 + ratio * 1.5; // whole face scales up as it nears
    const eyeR = 5 + ratio * 9;
    const eyeDX = 15 * s;
    const eyeY = cy - 18 * s + jitter() * 0.3;

    // dread glow behind the face when it's getting close
    if (ratio > 0.35) {
      g.fillStyle(COLORS.monsterCore, (ratio - 0.35) * 0.6);
      g.fillCircle(fx, cy, 70 * s);
    }

    // eyes — white sclera
    g.fillStyle(0xffffff, 0.94);
    g.fillCircle(fx - eyeDX, eyeY, eyeR);
    g.fillCircle(fx + eyeDX, eyeY, eyeR);

    // pupils — black when far, burning red when close
    const close = ratio > 0.5;
    const pr = eyeR * (close ? 0.6 : 0.42);
    g.fillStyle(close ? 0xff2b20 : 0x000000, 1);
    g.fillCircle(fx - eyeDX + jitter() * 0.5, eyeY, pr);
    g.fillCircle(fx + eyeDX + jitter() * 0.5, eyeY, pr);
    if (ratio > 0.7) {
      // white-hot core in the pupils
      g.fillStyle(0xffe08a, 0.95);
      g.fillCircle(fx - eyeDX, eyeY, pr * 0.4);
      g.fillCircle(fx + eyeDX, eyeY, pr * 0.4);
    }

    // angry eyebrows — thicker and more slanted (a menacing V) as it nears
    const slant = 3 + ratio * 16;
    const bl = eyeR * 1.9;
    g.lineStyle(3 + ratio * 4, 0x000000, 0.92);
    // left brow: outer high → inner low
    g.lineBetween(
      fx - eyeDX - bl * 0.6,
      eyeY - eyeR * 1.5,
      fx - eyeDX + bl * 0.6,
      eyeY - eyeR * 0.7 + slant,
    );
    // right brow (mirrored)
    g.lineBetween(
      fx + eyeDX + bl * 0.6,
      eyeY - eyeR * 1.5,
      fx + eyeDX - bl * 0.6,
      eyeY - eyeR * 0.7 + slant,
    );

    // mouth — grows from a gritted line into a gaping fanged maw
    const mw = 16 + ratio * 36;
    const mh = 4 + ratio * 34;
    const mouthY = cy + 12 * s + jitter() * 0.4;
    const bot = mouthY + mh;
    g.fillStyle(0x160000, 0.97);
    g.fillRoundedRect(fx - mw, mouthY, mw * 2, mh, Math.min(8, mh / 2));

    // teeth — more and longer fangs the closer it gets
    const teeth = 4 + Math.floor(ratio * 7);
    const tW = (mw * 2) / teeth;
    const fang = Math.min(mh * 0.55, 5 + ratio * 12);
    g.fillStyle(0xf3f3f3, 0.96);
    for (let i = 0; i < teeth; i++) {
      const x = fx - mw + i * tW;
      g.fillTriangle(x, mouthY, x + tW, mouthY, x + tW / 2, mouthY + fang);
      g.fillTriangle(x, bot, x + tW, bot, x + tW / 2, bot - fang);
    }

    // dripping menace when very close
    if (ratio > 0.6) {
      g.fillStyle(COLORS.monsterCore, 0.85);
      for (let i = 0; i < 3; i++) {
        const dx = fx - mw + ((i + 0.5) / 3) * mw * 2;
        const dl = 6 + Math.random() * (ratio * 22);
        g.fillTriangle(dx - 3, bot, dx + 3, bot, dx, bot + dl);
      }
    }
  }
}
