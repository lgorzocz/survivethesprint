/**
 * GameOverScene — the shareable result + Worklog Hub funnel (CLAUDE.md §2, §10, §12).
 *
 * Cause of death + thematic stats + retry + share. The game-over screen is the
 * highest-ROI slot (§12), so it carries a prominent Worklog Hub funnel banner —
 * the game funnels its (freelance-dev) audience to the product.
 */
import Phaser from "phaser";
import { VIEW, V_OFFSET } from "../config/balance.ts";
import { applyResponsiveSize, setupCamera } from "../render.ts";
import type { RunSummary } from "../systems/ScoreSystem.ts";
import { drawEditorChrome, drawStatusBar } from "../ui/EditorChrome.ts";
import { pillButton, panel, faintCodeBackdrop } from "../ui/widgets.ts";
import { track } from "../analytics/track.ts";
import { openShare } from "../ui/ShareDialog.ts";
import { t } from "../i18n.ts";

interface GameOverData {
  cause: string;
  causeLabel: string;
  summary: RunSummary;
}

const WORKLOG_HUB_URL = "https://worklog-hub.cz/";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  create(data: GameOverData): void {
    applyResponsiveSize(this);
    setupCamera(this);
    drawEditorChrome(this);
    faintCodeBackdrop(this);
    drawStatusBar(this);

    const cx = VIEW.width / 2;
    const dy = V_OFFSET; // re-centre the 540-baseline panel on taller/shorter canvases
    const { cause, causeLabel, summary } = data;
    panel(this, cx, 270 + dy, 780, 470);

    this.add
      .text(cx, 90 + dy, t("gameover.title"), {
        fontFamily: "monospace",
        fontSize: "50px",
        color: "#ff5c57",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // cause of death, styled as a thrown error / terminal line (§2)
    const deathLine =
      cause === "monster"
        ? t("gameover.deathMonster", {
            sprints: summary.sprints,
            tickets: summary.tickets.toLocaleString(),
          })
        : t("gameover.deathCatastrophe", {
            cause: causeLabel,
            sprints: summary.sprints,
          });
    this.add
      .text(cx, 152 + dy, deathLine, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ff8a80",
        align: "center",
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5);

    // stats as chips
    this.statChips(cx, 208 + dy, [
      [t("stats.line"), String(summary.line)],
      [t("stats.sprints"), String(summary.sprints)],
      [t("stats.ticketsClosed"), String(summary.ticketsClosed)],
      [t("stats.time"), `${summary.lengthSec.toFixed(1)} s`],
    ]);

    // modern pill buttons, side by side — big touch targets for mobile
    const restart = () => this.scene.start("GameScene");
    pillButton(this, {
      x: cx - 134,
      y: 286 + dy,
      w: 256,
      h: 50,
      label: t("gameover.retry"),
      variant: "primary",
      onClick: restart,
    });
    pillButton(this, {
      x: cx + 134,
      y: 286 + dy,
      w: 256,
      h: 50,
      label: t("gameover.share"),
      variant: "ghost",
      onClick: () => this.openSharePanel(data),
    });
    this.input.keyboard?.once("keydown-R", restart);
    this.input.keyboard?.once("keydown-SPACE", restart);

    // funnel — lead-in question + branded banner (highest-ROI slot §12)
    this.add
      .text(cx, 350 + dy, t("gameover.funnelQuestion"), {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#9fd3ff",
      })
      .setOrigin(0.5);
    this.funnelBanner(cx, 396 + dy);

    pillButton(this, {
      x: cx,
      y: 464 + dy,
      w: 180,
      h: 36,
      label: t("gameover.mainMenu"),
      variant: "ghost",
      onClick: () => this.scene.start("MenuScene"),
    });
    this.input.keyboard?.once("keydown-M", () => this.scene.start("MenuScene"));
  }

  /** Render key/value stats as a centered row of rounded chips. */
  private statChips(cx: number, y: number, items: [string, string][]): void {
    const chipW = 150;
    const gap = 10;
    const totalW = items.length * chipW + (items.length - 1) * gap;
    let x = cx - totalW / 2;
    for (const [key, val] of items) {
      const g = this.add.graphics();
      g.fillStyle(0x1b1d23, 1);
      g.fillRoundedRect(x, y - 20, chipW, 40, 8);
      g.lineStyle(1, 0x3a3d47, 1);
      g.strokeRoundedRect(x, y - 20, chipW, 40, 8);
      this.add
        .text(x + chipW / 2, y - 6, key, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#7f8a99",
        })
        .setOrigin(0.5);
      this.add
        .text(x + chipW / 2, y + 8, val, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: "#e6e6e6",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      x += chipW + gap;
    }
  }

  /** Prominent branded Worklog Hub funnel banner (logo + CTA), clickable. */
  private funnelBanner(cx: number, y: number): void {
    const w = 360;
    const h = 58;
    const left = cx - w / 2;

    const g = this.add.graphics();
    g.fillStyle(0x0b2135, 1);
    g.fillRoundedRect(left, y - h / 2, w, h, 10);
    g.lineStyle(2, 0x60a5fa, 0.9);
    g.strokeRoundedRect(left, y - h / 2, w, h, 10);

    this.add.image(left + 42, y, "worklog_logo").setDisplaySize(46, 37);
    this.add
      .text(left + 84, y - 11, "Worklog Hub", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.add
      .text(left + 84, y + 11, t("gameover.worklogSub"), {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#9fd3ff",
      })
      .setOrigin(0, 0.5);

    // whole banner is one click target
    const zone = this.add
      .zone(cx, y, w, h)
      .setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => {
      track({ name: "worklog_hub_click" });
      window.open(WORKLOG_HUB_URL, "_blank", "noopener");
    });

    // subtle attention pulse
    this.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0.72 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  private caption(data: GameOverData): string {
    const s = data.summary;
    return data.cause === "monster"
      ? t("share.captionMonster", {
          sprints: s.sprints,
          tickets: s.tickets.toLocaleString(),
          line: s.line,
        })
      : t("share.captionCatastrophe", {
          cause: data.causeLabel,
          sprints: s.sprints,
          line: s.line,
        });
  }

  /**
   * Snapshot the game-over screen (stats + theme) and hand it to the ShareDialog
   * component. The share/download must run from a native gesture, so it lives in
   * the DOM — a navigator.share fired straight from this Phaser callback loses
   * user activation and is silently blocked.
   */
  private openSharePanel(data: GameOverData): void {
    const text = this.caption(data);
    const url = window.location.href;
    // Disable scene input while the overlay is up. On touch, closing it fires a
    // compatibility "ghost click" on the now-revealed canvas — which was landing
    // on the Worklog Hub banner behind. Re-enable a beat after it closes.
    this.input.enabled = false;
    this.game.renderer.snapshot((snapshot) => {
      const src = snapshot instanceof HTMLImageElement ? snapshot.src : "";
      openShare(src, text, url, () => {
        this.time.delayedCall(450, () => {
          this.input.enabled = true;
        });
      });
    });
  }
}
