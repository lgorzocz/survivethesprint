/**
 * CodeBackground — the world IS a scrolling source file (CLAUDE.md §4).
 *
 * - Three lanes = three lines of code with a line-number gutter.
 * - The active lane is highlighted with a blinking cursor (the editor's caret).
 * - Code scrolls with the world; line numbers climb (ambient distance metric).
 * - It DEGRADES with the bug count: red error squiggles creep into the code as a
 *   second danger readout. Grabbing tech briefly `clean()`s it.
 *
 * Everything is procedural/faint — texture, not something to read.
 */
import Phaser from "phaser";
import { CHROME, COLORS, LANES, VIEW } from "../config/balance.ts";
import type { LaneSystem } from "./LaneSystem.ts";

/** Cheap infinite pool of ambient snippets (§4). */
const AMBIENT: string[] = [
  "const state = useStore(s => s.value);",
  "export function reduce(acc, x) { return acc + x; }",
  "await fetch(`/api/${id}`).then(r => r.json());",
  "if (!ready) return queue.push(task);",
  "for (const node of tree) visit(node, depth + 1);",
  "type Result<T> = { ok: true; value: T } | { ok: false };",
  "return items.filter(Boolean).map(toDto);",
  "const [open, setOpen] = useState(false);",
  "logger.debug('cache miss', { key, ttl });",
  "db.transaction(async (tx) => tx.commit());",
];

const CHUNK_W = 640; // scroll distance before the line is regenerated

export class CodeBackground {
  private readonly scene: Phaser.Scene;
  private readonly lanes: LaneSystem;

  private laneBg: Phaser.GameObjects.Rectangle[] = [];
  private gutter: Phaser.GameObjects.Text[] = [];
  private code: Phaser.GameObjects.Text[] = [];
  private squiggle: Phaser.GameObjects.Graphics[] = [];
  private cursor!: Phaser.GameObjects.Rectangle;

  private activeLane = 1;
  private cleanTimerMs = 0;
  private lastBucket = -1;

  constructor(scene: Phaser.Scene, lanes: LaneSystem) {
    this.scene = scene;
    this.lanes = lanes;
    this.build();
  }

  private build(): void {
    const codeX = CHROME.gutterWidth + 6;
    for (let i = 0; i < this.lanes.count; i++) {
      const y = this.lanes.laneY(i);

      const bg = this.scene.add
        .rectangle(
          VIEW.width / 2,
          y,
          VIEW.width - CHROME.gutterWidth,
          LANES.gap - 8,
          COLORS.activeLaneBg,
          0,
        )
        .setOrigin(0.5)
        .setPosition(CHROME.gutterWidth + (VIEW.width - CHROME.gutterWidth) / 2, y);
      this.laneBg.push(bg);

      const gutter = this.scene.add
        .text(CHROME.gutterWidth - 10, y, "0", {
          fontFamily: "monospace",
          fontSize: "16px",
          color: COLORS.gutterText,
        })
        .setOrigin(1, 0.5);
      this.gutter.push(gutter);

      const code = this.scene.add
        .text(codeX, y, this.buildLine(), {
          fontFamily: "monospace",
          fontSize: "17px",
          color: COLORS.codeFaint,
        })
        .setOrigin(0, 0.5);
      code.setData("originX", codeX);
      this.code.push(code);

      const sq = this.scene.add.graphics();
      this.squiggle.push(sq);
    }

    // Blinking caret on the active lane.
    this.cursor = this.scene.add
      .rectangle(codeX, this.lanes.laneY(this.activeLane), 2, 22, COLORS.cursor)
      .setOrigin(0, 0.5);
    this.scene.tweens.add({
      targets: this.cursor,
      alpha: { from: 1, to: 0 },
      duration: 530,
      yoyo: true,
      repeat: -1,
    });

    this.setActiveLane(this.activeLane);
  }

  private buildLine(): string {
    // Long enough to always cover the viewport with no gaps.
    let s = "";
    while (s.length < 140) {
      s += AMBIENT[Math.floor(Math.random() * AMBIENT.length)] + "   ";
    }
    return s;
  }

  setActiveLane(index: number): void {
    this.activeLane = index;
    for (let i = 0; i < this.laneBg.length; i++) {
      this.laneBg[i].setFillStyle(COLORS.activeLaneBg, i === index ? 1 : 0);
      this.gutter[i].setColor(
        i === index ? COLORS.activeGutterText : COLORS.gutterText,
      );
    }
    this.cursor.setY(this.lanes.laneY(index));
  }

  /** Briefly suppress the degrade effect when tech is grabbed (§4). */
  clean(): void {
    this.cleanTimerMs = 900;
  }

  update(dtMs: number, linesScrolled: number, bugRatio: number): void {
    const dx = (dtMs / 1000) * 90; // faint parallax scroll of the code itself

    for (let i = 0; i < this.code.length; i++) {
      const t = this.code[i];
      const originX: number = t.getData("originX");
      t.x -= dx;
      if (t.x <= originX - CHUNK_W) {
        t.x = originX;
        t.setText(this.buildLine());
      }
      this.gutter[i].setText(String(this.lanes.lineNumber(i, linesScrolled)));
    }

    if (this.cleanTimerMs > 0) this.cleanTimerMs -= dtMs;
    const effRatio = this.cleanTimerMs > 0 ? 0 : bugRatio;

    // Bucket the degrade redraw so we don't rebuild graphics every frame.
    const bucket = Math.round(effRatio * 8);
    if (bucket !== this.lastBucket) {
      this.lastBucket = bucket;
      this.redrawDegrade(effRatio);
    }
  }

  /** Red squiggles + a reddening tint scale with the bug ratio. */
  private redrawDegrade(ratio: number): void {
    const marks = Math.round(ratio * 7);
    // Tint the code from faint green toward danger red as bugs rise.
    const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(COLORS.codeFaint),
      Phaser.Display.Color.ValueToColor(COLORS.danger),
      100,
      Math.round(ratio * 70),
    );
    const hex = Phaser.Display.Color.RGBToString(tint.r, tint.g, tint.b);

    for (let i = 0; i < this.squiggle.length; i++) {
      const g = this.squiggle[i];
      g.clear();
      this.code[i].setColor(hex);
      const y = this.lanes.laneY(i) + 12;
      g.lineStyle(2, COLORS.danger, 0.8);
      for (let m = 0; m < marks; m++) {
        const x0 = CHROME.gutterWidth + 20 + m * 130;
        g.beginPath();
        for (let x = 0; x <= 70; x += 6) {
          const yy = y + (x % 12 === 0 ? 0 : 3);
          if (x === 0) g.moveTo(x0 + x, yy);
          else g.lineTo(x0 + x, yy);
        }
        g.strokePath();
      }
    }
  }
}
