/**
 * TechInfoCard — top-right in-game card showing the last-used technology (§12).
 *
 * A native, earned brand placement: it appears because the player grabbed that
 * tech, sits in the calm top-right corner (off the hazard reaction path, §9),
 * and auto-hides after a few seconds. The card grows to fit its content, so a
 * sponsored slot (Worklog Hub) can show a name + blurb + a marketing pitch,
 * while a plain tech shows just its one-line blurb. Analytics logs both the
 * impression and how long it stayed visible — the sponsor share-of-voice
 * metric (§11).
 */
import Phaser from "phaser";
import { CHROME, VIEW } from "../config/balance.ts";
import type { PowerUp } from "../config/powerups.ts";
import { track } from "../analytics/track.ts";
import { t } from "../i18n.ts";

/** Power-up id -> i18n blurb key (falls back to the config blurb if unmapped). */
const BLURB_KEY: Record<string, string> = {
  docker: "pw.docker",
  kubernetes: "pw.k8s",
  unit_tests: "pw.unittests",
  ai_assistant: "pw.ai",
  worklog_hub: "pw.worklog",
  hotfix: "pw.hotfix",
};

/** Power-up id -> i18n pitch keys (code pitches stay as-is; only prose is mapped). */
const PITCH_KEY: Record<string, string[]> = {
  worklog_hub: ["pw.worklog.pitch1", "pw.worklog.pitch2"],
};

const W = 264;
const SHOW_MS = 4200;
const PAD_TOP = 46; // y of the first description line
const LINE_H = 18;

export class TechInfoCard {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly badge: Phaser.GameObjects.Graphics;
  private readonly badgeText: Phaser.GameObjects.Text;
  private readonly logo: Phaser.GameObjects.Image;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly descTexts: Phaser.GameObjects.Text[] = [];
  private readonly sponsorTag: Phaser.GameObjects.Text;
  private readonly topY: number;

  private hideEvent?: Phaser.Time.TimerEvent;
  private current?: { id: string; sponsored: boolean; shownAt: number };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.topY = CHROME.tabBarHeight + 10;
    // container anchored at the card's top-left corner (grows downwards)
    this.container = scene.add
      .container(VIEW.width - 12 - W, this.topY)
      .setDepth(45)
      .setAlpha(0);

    this.bg = scene.add.graphics();
    this.badge = scene.add.graphics();
    this.badgeText = scene.add
      .text(46, 0, "", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.logo = scene.add
      .image(46, 0, "worklog_logo")
      .setDisplaySize(34, 27)
      .setVisible(false);
    this.nameText = scene.add
      .text(72, 22, "", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    for (let i = 0; i < 3; i++) {
      this.descTexts.push(
        scene.add
          .text(72, PAD_TOP + i * LINE_H, "", {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#9aa4b2",
          })
          .setOrigin(0, 0.5)
          .setVisible(false),
      );
    }
    this.sponsorTag = scene.add
      .text(W - 10, 13, "sponsor", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#9fd3ff",
      })
      .setOrigin(1, 0.5)
      .setVisible(false);

    this.container.add([
      this.bg,
      this.badge,
      this.badgeText,
      this.logo,
      this.nameText,
      ...this.descTexts,
      this.sponsorTag,
    ]);
  }

  /** Show the card for a technology, resetting the auto-hide timer. */
  show(p: PowerUp): void {
    this.finalize(); // close any previous impression first

    // description lines: blurb (muted) then any marketing pitch (brand blue)
    const lines: { text: string; brand: boolean }[] = [];
    const blurb = BLURB_KEY[p.id] ? t(BLURB_KEY[p.id]) : p.blurb;
    if (blurb) lines.push({ text: blurb, brand: false });
    const pitch = PITCH_KEY[p.id]
      ? PITCH_KEY[p.id].map((k) => t(k))
      : (p.pitch ?? []);
    pitch.forEach((l) => lines.push({ text: l, brand: true }));
    const n = Math.max(1, lines.length);
    const h = PAD_TOP + n * LINE_H + 8;

    this.drawBg(h, p.color);

    const midY = h / 2;
    if (p.id === "worklog_hub") {
      this.logo.setVisible(true).setY(midY);
      this.badge.clear();
      this.badgeText.setText("");
    } else {
      this.logo.setVisible(false);
      this.badge.clear();
      this.badge.fillStyle(p.color, 1);
      this.badge.fillRoundedRect(30, midY - 16, 32, 32, 8);
      this.badgeText.setText(p.label.charAt(0).toUpperCase()).setY(midY);
    }

    const maxTextW = W - 10 - 72;
    this.fitText(this.nameText.setText(p.label), maxTextW);
    for (let i = 0; i < this.descTexts.length; i++) {
      const t = this.descTexts[i];
      const line = lines[i];
      if (line) {
        t.setVisible(true)
          .setText(line.text)
          .setColor(line.brand ? "#9fd3ff" : "#9aa4b2")
          .setY(PAD_TOP + i * LINE_H);
        this.fitText(t, maxTextW);
      } else {
        t.setVisible(false);
      }
    }

    const sponsored = !!p.sponsored;
    this.sponsorTag.setVisible(sponsored);

    this.current = { id: p.id, sponsored, shownAt: this.scene.time.now };
    track({ name: "tech_shown", id: p.id, sponsored });

    // fade + slide in
    this.scene.tweens.killTweensOf(this.container);
    this.container.setAlpha(0).setPosition(VIEW.width - 12 - W, this.topY - 8);
    this.scene.tweens.add({
      targets: this.container,
      y: this.topY,
      alpha: 1,
      duration: 200,
      ease: "Quad.out",
    });

    this.hideEvent?.remove();
    this.hideEvent = this.scene.time.delayedCall(SHOW_MS, () => this.hide());
  }

  private drawBg(h: number, accent: number): void {
    this.bg.clear();
    this.bg.fillStyle(0x24262e, 0.96);
    this.bg.fillRoundedRect(0, 0, W, h, 10);
    this.bg.lineStyle(1, 0x3a3d47, 1);
    this.bg.strokeRoundedRect(0, 0, W, h, 10);
    this.bg.fillStyle(accent, 1);
    this.bg.fillRoundedRect(0, 0, 4, h, { tl: 10, bl: 10, tr: 0, br: 0 });
  }

  /** Scale a left-anchored text down so it fits within maxW. */
  private fitText(t: Phaser.GameObjects.Text, maxW: number): void {
    t.setScale(t.width > maxW ? maxW / t.width : 1);
  }

  private hide(): void {
    this.finalize();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 300,
    });
  }

  /** Log the impression duration for whatever is currently shown. */
  private finalize(): void {
    if (!this.current) return;
    const ms = Math.max(
      0,
      Math.round(this.scene.time.now - this.current.shownAt),
    );
    track({
      name: "tech_impression",
      id: this.current.id,
      sponsored: this.current.sponsored,
      ms,
    });
    this.current = undefined;
  }

  /** Called on game over so the final impression is captured. */
  close(): void {
    this.hideEvent?.remove();
    this.finalize();
  }
}
