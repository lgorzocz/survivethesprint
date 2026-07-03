/**
 * MenuScene — modern start screen, still framed as the editor (CLAUDE.md §4).
 * Czech UI strings, English code/identifiers (§13).
 */
import Phaser from "phaser";
import { VIEW, V_OFFSET } from "../config/balance.ts";
import { applyResponsiveSize, setupCamera } from "../render.ts";
import { drawEditorChrome, drawStatusBar } from "../ui/EditorChrome.ts";
import { pillButton, panel, faintCodeBackdrop } from "../ui/widgets.ts";
import { openDonate } from "../ui/DonateDialog.ts";
import { t, getLang, setLang, type Lang } from "../i18n.ts";
import {
  haptics,
  isSupported as hapticsSupported,
  isEnabled as hapticsEnabled,
  toggle as hapticsToggle,
} from "../juice/haptics.ts";
import {
  audio,
  isSupported as soundSupported,
  isEnabled as soundEnabled,
  toggle as soundToggle,
  unlock as audioUnlock,
} from "../audio/AudioSystem.ts";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    applyResponsiveSize(this);
    setupCamera(this);
    drawEditorChrome(this);
    faintCodeBackdrop(this);
    drawStatusBar(this);

    const cx = VIEW.width / 2;
    const dy = V_OFFSET; // re-centre the 540-baseline panel on taller/shorter canvases
    panel(this, cx, 270 + dy, 620, 404);

    // title with a blinking caret (editor feel)
    const title = this.add
      .text(cx - 12, 128 + dy, "Survive the Sprint", {
        fontFamily: "monospace",
        fontSize: "44px",
        color: "#ff5c57",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const caret = this.add
      .rectangle(title.x + title.width / 2 + 10, 130 + dy, 4, 36, 0xaeafad)
      .setOrigin(0.5);
    this.tweens.add({
      targets: caret,
      alpha: { from: 1, to: 0 },
      duration: 530,
      yoyo: true,
      repeat: -1,
    });

    this.add
      .text(cx, 192 + dy, t("menu.subtitle"), {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#6a9955",
      })
      .setOrigin(0.5);

    this.buildLangSwitcher(cx + 254, 80 + dy);

    // primary CTA
    const begin = () => {
      audioUnlock(); // this click is our gesture to start audio
      this.scene.start("GameScene");
    };
    pillButton(this, {
      x: cx,
      y: 260 + dy,
      w: 240,
      h: 56,
      label: t("menu.play"),
      variant: "primary",
      onClick: begin,
    });
    this.input.keyboard?.once("keydown-SPACE", begin);
    this.input.keyboard?.once("keydown-ENTER", begin);

    // controls hints
    this.add
      .text(cx, 344 + dy, t("menu.controls1"), {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#9aa4b2",
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 368 + dy, t("menu.controls2"), {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#9aa4b2",
      })
      .setOrigin(0.5);

    this.buildSoundToggle(cx - 128, 410 + dy);
    this.buildHapticsToggle(cx + 128, 410 + dy);

    // donate link
    const donate = this.add
      .text(cx, 450 + dy, t("menu.donate"), {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#9aa4b2",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    donate.on("pointerover", () => donate.setColor("#d4d4d4"));
    donate.on("pointerout", () => donate.setColor("#9aa4b2"));
    donate.on("pointerdown", () => {
      // ignore the touch "ghost click" on the menu when the overlay closes
      this.input.enabled = false;
      openDonate(() =>
        this.time.delayedCall(450, () => {
          this.input.enabled = true;
        }),
      );
    });

    // menu music — starts now if the audio context is already unlocked, else on
    // the first interaction (browsers block audio until a user gesture)
    audio.playMenuMusic();
    this.input.once("pointerdown", () => audio.playMenuMusic());
    this.input.keyboard?.once("keydown", () => audio.playMenuMusic());
  }

  /** CZ | EN language switcher; changing it persists and restarts the menu. */
  private buildLangSwitcher(x: number, y: number): void {
    const cur = getLang();
    const mk = (lx: number, code: Lang, label: string): void => {
      const active = cur === code;
      const txt = this.add
        .text(lx, y, label, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: active ? "#ffffff" : "#6a7688",
          fontStyle: active ? "bold" : "normal",
        })
        .setOrigin(0.5);
      if (active) return;
      // The 14px glyphs alone are far below the ~44px minimum touch target, so
      // on mobile the switch was almost impossible to hit. Put an invisible,
      // finger-sized tap zone behind the label and drive the interaction from it.
      const hit = this.add
        .zone(lx, y, 52, 44)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerover", () => txt.setColor("#9aa4b2"));
      hit.on("pointerout", () => txt.setColor("#6a7688"));
      hit.on("pointerdown", () => {
        setLang(code);
        this.scene.restart();
      });
    };
    mk(x - 30, "cs", "CZ");
    this.add
      .text(x, y, "|", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#3a3d47",
      })
      .setOrigin(0.5);
    mk(x + 30, "en", "EN");
  }

  private buildSoundToggle(x: number, y: number): void {
    const label = () =>
      !soundSupported() ? t("sound.na") : soundEnabled() ? t("sound.on") : t("sound.off");
    const pill = pillButton(this, {
      x,
      y,
      w: 232,
      h: 38,
      label: label(),
      variant: "ghost",
      onClick: () => {
        if (!soundSupported()) return;
        const on = soundToggle();
        pill.setLabel(label());
        if (on) {
          audio.uiClick();
          audio.playMenuMusic();
        }
      },
    });
    if (!soundSupported()) pill.setEnabled(false);
  }

  private buildHapticsToggle(x: number, y: number): void {
    const label = () =>
      !hapticsSupported()
        ? t("haptics.na")
        : hapticsEnabled()
          ? t("haptics.on")
          : t("haptics.off");
    const pill = pillButton(this, {
      x,
      y,
      w: 232,
      h: 38,
      label: label(),
      variant: "ghost",
      onClick: () => {
        if (!hapticsSupported()) return;
        const on = hapticsToggle();
        pill.setLabel(label());
        if (on) haptics.test();
      },
    });
    if (!hapticsSupported()) pill.setEnabled(false);
  }
}
