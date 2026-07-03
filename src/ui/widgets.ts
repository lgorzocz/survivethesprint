/**
 * widgets.ts — shared modern UI atoms (CLAUDE.md §4).
 *
 * Keeps the code-editor identity but lifts menu/game-over to a cleaner look:
 * a soft-shadowed card, a faint code backdrop for depth, and one consistent
 * rounded "pill" button with hover/press feedback.
 */
import Phaser from "phaser";
import { audio } from "../audio/AudioSystem.ts";

export type PillVariant = "primary" | "ghost";

export interface PillOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  variant?: PillVariant;
  onClick: () => void;
}

export interface Pill {
  container: Phaser.GameObjects.Container;
  setLabel: (s: string) => void;
  setEnabled: (on: boolean) => void;
}

/** A rounded pill button. Returns handles so callers can toggle label/state. */
export function pillButton(scene: Phaser.Scene, o: PillOptions): Pill {
  const { x, y, w, h, label, variant = "primary", onClick } = o;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  let enabled = true;

  const draw = (hover: boolean) => {
    g.clear();
    const r = h / 2;
    const dim = enabled ? 1 : 0.4;
    if (variant === "primary") {
      g.fillStyle(hover && enabled ? 0x2b93d6 : 0x0e78c4, dim);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    } else {
      g.fillStyle(0xffffff, (hover && enabled ? 0.14 : 0.06) * (enabled ? 1 : 0.5));
      g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      g.lineStyle(2, 0x5a6a7a, (hover && enabled ? 1 : 0.7) * dim);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    }
  };
  draw(false);

  const t = scene.add
    .text(0, 0, label, {
      fontFamily: "monospace",
      fontSize: h >= 48 ? "19px" : "14px",
      color: variant === "primary" ? "#ffffff" : "#cfd8e3",
      fontStyle: "bold",
    })
    .setOrigin(0.5);

  c.add([g, t]);
  c.setSize(w, h).setInteractive({ useHandCursor: true });
  c.on("pointerover", () => draw(true));
  c.on("pointerout", () => draw(false));
  c.on("pointerdown", () => {
    if (!enabled) return;
    audio.uiClick();
    scene.tweens.add({ targets: c, scale: 0.94, duration: 80, yoyo: true });
    onClick();
  });

  return {
    container: c,
    setLabel: (s: string) => t.setText(s),
    setEnabled: (on: boolean) => {
      enabled = on;
      draw(false);
      t.setAlpha(on ? 1 : 0.5);
    },
  };
}

/** Soft-shadowed rounded card. */
export function panel(
  scene: Phaser.Scene,
  cx: number,
  cy: number,
  w: number,
  h: number,
): void {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35); // shadow
  g.fillRoundedRect(cx - w / 2 + 4, cy - h / 2 + 9, w, h, 18);
  g.fillStyle(0x24262e, 0.97); // card
  g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 18);
  g.lineStyle(1, 0x3a3d47, 1); // hairline border
  g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 18);
}

const BACKDROP = [
  "for (const bug of backlog) triage(bug);",
  "while (coffee.level > 0) keepShipping();",
  "git commit -m 'fix: it works now (probably)'",
  "export const survive = () => grab(tech);",
  "if (Date.friday && hour >= 17) doNotDeploy();",
  "npm run build && pray();",
  "type Sprint = { closed: number; open: number };",
  "docker compose up -d --scale bugs=0",
];

/** Very faint scrolling-file texture behind the card (editor feel). */
export function faintCodeBackdrop(scene: Phaser.Scene): void {
  for (let i = 0; i < 11; i++) {
    scene.add
      .text(24, 46 + i * 44, BACKDROP[i % BACKDROP.length], {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#2b2e35",
      })
      .setAlpha(0.6);
  }
}
