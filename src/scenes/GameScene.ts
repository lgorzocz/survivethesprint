/**
 * GameScene — the run (CLAUDE.md §2, §9).
 *
 * Ties every system together each frame:
 *   BugMeter (the heart) -> monster size + code degrade + death,
 *   Spawner -> pickups/hazards streaming right-to-left,
 *   lane + jump collisions with elevation rules,
 *   catastrophe telegraphing (slow-mo + shake + beep).
 *
 * Balance lives in config/balance.ts — tune there, not here.
 */
import Phaser from "phaser";
import {
  CATASTROPHE_PLOUGH_REWARD,
  CHROME,
  COLLECT,
  COLORS,
  HOTFIX_SHIELD,
  PLAYER,
  SPAWN,
  TELEGRAPH,
  VIEW,
  V_OFFSET,
} from "../config/balance.ts";
import {
  CAUSE_LABEL,
  CATASTROPHE_HEADERS,
  HAZARD_CATEGORY,
  type Hazard as HazardConfig,
} from "../config/hazards.ts";
import { BugMeter } from "../systems/BugMeter.ts";
import { ScoreSystem } from "../systems/ScoreSystem.ts";
import { LaneSystem } from "../systems/LaneSystem.ts";
import { Spawner } from "../systems/Spawner.ts";
import { CodeBackground } from "../systems/CodeBackground.ts";
import { Player } from "../entities/Player.ts";
import { BugMonster } from "../entities/BugMonster.ts";
import { Pickup } from "../entities/Pickup.ts";
import { Hazard } from "../entities/Hazard.ts";
import { applyResponsiveSize, setupCamera } from "../render.ts";
import { drawEditorChrome, drawStatusBar } from "../ui/EditorChrome.ts";
import { TechInfoCard } from "../ui/TechInfoCard.ts";
import { openDonate } from "../ui/DonateDialog.ts";
import { t, loc, getLang } from "../i18n.ts";
import { track } from "../analytics/track.ts";
import { haptics } from "../juice/haptics.ts";
import { audio, unlock as audioUnlock } from "../audio/AudioSystem.ts";

/** Horizontal half-width of the player's collision window (px). */
const HIT_X = 30;
/** A catastrophe fires its telegraph once it crosses this X (higher = earlier). */
const TELEGRAPH_X = 950;

export class GameScene extends Phaser.Scene {
  private lanes!: LaneSystem;
  private bugs!: BugMeter;
  private score!: ScoreSystem;
  private spawner!: Spawner;
  private codeBg!: CodeBackground;
  private player!: Player;
  private monster!: BugMonster;
  private techCard!: TechInfoCard;
  private cutIn?: Phaser.GameObjects.Container;

  private pickups: Pickup[] = [];
  private hazards: Hazard[] = [];

  private coffeeCount = 0;
  private over = false;

  // interactive UI (the Menu button); a pointer that starts on one of these
  // must NOT also fire the swipe/tap gameplay gesture.
  private controlButtons: Phaser.GameObjects.GameObject[] = [];
  private gestureFromUi = false;

  // the ☰ Menu dropdown (Hlavní menu / Donate)
  private menuPopup?: Phaser.GameObjects.Container;
  private menuCatcher?: Phaser.GameObjects.Rectangle;
  private menuOpen = false;

  // slow-mo (real-time countdown so it lasts a wall-clock moment)
  private slowFactor = 1;
  private slowTimerMs = 0;

  // HUD
  private hudSprint!: Phaser.GameObjects.Text;
  private hudCoffee!: Phaser.GameObjects.Text;
  private hudLine!: Phaser.GameObjects.Text;
  private hudBugsText!: Phaser.GameObjects.Text;
  private hudSlow!: Phaser.GameObjects.Text;
  private bugBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super("GameScene");
  }

  create(): void {
    // reset per-run state (scene is reused on retry)
    this.pickups = [];
    this.hazards = [];
    this.coffeeCount = 0;
    this.over = false;
    this.slowFactor = 1;
    this.slowTimerMs = 0;
    this.controlButtons = [];
    this.gestureFromUi = false;
    this.cutIn = undefined;
    this.menuOpen = false;
    this.menuPopup = undefined;
    this.menuCatcher = undefined;

    applyResponsiveSize(this);
    setupCamera(this);
    drawEditorChrome(this);

    this.lanes = new LaneSystem();
    this.bugs = new BugMeter();
    this.score = new ScoreSystem();
    this.spawner = new Spawner();
    this.codeBg = new CodeBackground(this, this.lanes);
    this.monster = new BugMonster(this);
    this.player = new Player(this, this.lanes, 1);
    this.player.setDepth(15);

    this.buildHud();
    this.buildMenuButton();
    this.techCard = new TechInfoCard(this);
    this.bindInput();

    audioUnlock();
    this.events.once("shutdown", () => audio.stopMonster());

    track({ name: "play_start" });
  }

  // ---- HUD (the editor status bar, §4) ---------------------------------

  private buildHud(): void {
    const cy = drawStatusBar(this);
    const style = (color: string = COLORS.statusBarText) => ({
      fontFamily: "monospace",
      fontSize: "13px",
      color,
    });

    this.add.text(10, cy, "⎇ main*", style()).setOrigin(0, 0.5);
    this.hudSprint = this.add
      .text(120, cy, "Sprint 0", style())
      .setOrigin(0, 0.5);

    // bug meter in the centre
    this.add
      .text(VIEW.width / 2 - 150, cy, t("hud.bugs"), style())
      .setOrigin(0, 0.5);
    this.bugBar = this.add.graphics();
    this.hudBugsText = this.add
      .text(VIEW.width / 2 + 92, cy, "0", style())
      .setOrigin(0, 0.5);
    // coffee slowdown indicator (shown only while active)
    this.hudSlow = this.add
      .text(VIEW.width / 2 + 128, cy, t("hud.coffeeSlow"), style("#bfe4ff"))
      .setOrigin(0, 0.5)
      .setVisible(false);

    this.hudCoffee = this.add
      .text(VIEW.width - 190, cy, "☕ 0", style())
      .setOrigin(0, 0.5);
    this.hudLine = this.add
      .text(VIEW.width - 90, cy, "Ln 42", style())
      .setOrigin(0, 0.5);
  }

  private updateHud(): void {
    const ratio = this.bugs.getRatio();
    this.hudSprint.setText(`${t("hud.sprint")} ${this.score.sprints()}`);
    this.hudCoffee.setText(`☕ ${this.coffeeCount}`);
    this.hudLine.setText(`Ln ${this.score.currentLine()}`);
    this.hudBugsText.setText(String(Math.round(this.bugs.getValue())));
    this.hudSlow.setVisible(this.bugs.isSlowed());

    // meter bar: green -> red with the ratio
    const x = VIEW.width / 2 - 108;
    const y = VIEW.height - CHROME.statusBarHeight / 2 - 5;
    const w = 190;
    const col = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x2ecc71),
      Phaser.Display.Color.ValueToColor(COLORS.danger),
      100,
      Math.round(ratio * 100),
    );
    this.bugBar.clear();
    this.bugBar.fillStyle(0x000000, 0.35);
    this.bugBar.fillRoundedRect(x, y, w, 10, 3);
    this.bugBar.fillStyle(
      Phaser.Display.Color.GetColor(col.r, col.g, col.b),
      1,
    );
    this.bugBar.fillRoundedRect(x, y, Math.max(2, w * ratio), 10, 3);
  }

  /**
   * "☰ Menu" button in the top-right of the tab bar. Tapping it toggles a small
   * dropdown with two items: Hlavní menu and Donate. Registered in controlButtons
   * so tapping never also fires a swipe/tap gesture (§3 input handling).
   */
  private buildMenuButton(): void {
    const w = 96;
    const h = 30;
    const cx = VIEW.width - 8 - w / 2;
    const cy = CHROME.tabBarHeight / 2 + 2; // nudge down off the very top edge

    // Big INVISIBLE hit zone over the whole top-right corner. A small pill is a
    // fiddly touch target near the screen edge (misses fall through to tap=jump),
    // so the actual interactive area is this generous zone; the pill is visual.
    const zoneW = 150;
    const zoneH = 56;
    const zone = this.add
      .zone(VIEW.width - zoneW / 2, zoneH / 2, zoneW, zoneH)
      .setDepth(62)
      .setInteractive({ useHandCursor: true });

    const bg = this.add
      .rectangle(cx, cy, w, h, 0xffffff, 0.1)
      .setStrokeStyle(1, 0x3a3d47, 1)
      .setDepth(60);
    const label = this.add
      .text(cx, cy, "☰ Menu", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#c7ccd6",
      })
      .setOrigin(0.5)
      .setDepth(61);

    zone.on("pointerover", () => {
      bg.setFillStyle(0xffffff, 0.18);
      label.setColor("#ffffff");
    });
    zone.on("pointerout", () => {
      bg.setFillStyle(0xffffff, 0.1);
      label.setColor("#c7ccd6");
    });
    zone.on("pointerdown", () => this.toggleMenu());
    this.controlButtons.push(zone);

    this.buildMenuPopup();
  }

  /** The dropdown shown under the ☰ Menu button (hidden until toggled). */
  private buildMenuPopup(): void {
    const items: [string, () => void][] = [
      [
        t("menu.mainMenu"),
        () => {
          this.hideMenu();
          this.quitToMenu();
        },
      ],
      [
        t("menu.donateItem"),
        () => {
          this.hideMenu();
          this.scene.pause(); // freeze the run behind the overlay
          // resume a beat after close so the touch "ghost click" is ignored
          openDonate(() =>
            window.setTimeout(() => this.scene.resume(), 450),
          );
        },
      ],
    ];

    const w = 200;
    const rowH = 42;
    const pad = 6;
    const ph = pad * 2 + rowH * items.length;
    const x = VIEW.width - 8 - w / 2;
    const y0 = CHROME.tabBarHeight + 6;

    // full-screen catcher: a tap outside the popup closes it
    this.menuCatcher = this.add
      .rectangle(VIEW.width / 2, VIEW.height / 2, VIEW.width, VIEW.height, 0x000000, 0.001)
      .setDepth(62)
      .setVisible(false)
      .setInteractive();
    this.menuCatcher.on("pointerdown", () => this.hideMenu());
    this.controlButtons.push(this.menuCatcher);

    const c = this.add.container(x, y0).setDepth(64).setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(-w / 2 + 3, 5, w, ph, 10);
    g.fillStyle(0x24262e, 1);
    g.fillRoundedRect(-w / 2, 0, w, ph, 10);
    g.lineStyle(1, 0x3a3d47, 1);
    g.strokeRoundedRect(-w / 2, 0, w, ph, 10);
    c.add(g);

    items.forEach(([text, onClick], i) => {
      const ry = pad + i * rowH + rowH / 2;
      const hit = this.add
        .rectangle(0, ry, w - 8, rowH - 4, 0xffffff, 0.001)
        .setDepth(65)
        .setInteractive({ useHandCursor: true });
      const t = this.add
        .text(-w / 2 + 18, ry, text, {
          fontFamily: "monospace",
          fontSize: "15px",
          color: "#d4d4d4",
        })
        .setOrigin(0, 0.5)
        .setDepth(65);
      hit.on("pointerover", () => {
        hit.setFillStyle(0xffffff, 0.08);
        t.setColor("#ffffff");
      });
      hit.on("pointerout", () => {
        hit.setFillStyle(0xffffff, 0.001);
        t.setColor("#d4d4d4");
      });
      hit.on("pointerdown", onClick);
      c.add([hit, t]);
      this.controlButtons.push(hit);
    });

    this.menuPopup = c;
  }

  private toggleMenu(): void {
    if (this.menuOpen) this.hideMenu();
    else this.showMenu();
  }

  private showMenu(): void {
    this.menuOpen = true;
    this.menuCatcher?.setVisible(true);
    this.menuPopup?.setVisible(true);
  }

  private hideMenu(): void {
    this.menuOpen = false;
    this.menuCatcher?.setVisible(false);
    this.menuPopup?.setVisible(false);
  }

  private quitToMenu(): void {
    if (this.over) return; // game-over flow is already leaving the scene
    const summary = this.score.summary(this.bugs.getValue());
    track({
      name: "quit_to_menu",
      lengthSec: summary.lengthSec,
      sprints: summary.sprints,
    });
    audio.stopMonster();
    this.scene.start("MenuScene");
  }

  // ---- input (§3: desktop keys + mobile swipe/tap) --------------------

  private bindInput(): void {
    const kb = this.input.keyboard;
    kb?.on("keydown-UP", () => this.changeLane(-1));
    kb?.on("keydown-DOWN", () => this.changeLane(1));
    kb?.on("keydown-W", () => this.changeLane(-1));
    kb?.on("keydown-S", () => this.changeLane(1));
    kb?.on("keydown-SPACE", () => this.tryJump());

    // swipe up/down = lane, tap = jump — but ignore gestures that begin on a
    // touch-control button (otherwise a button tap would also fire a gesture).
    let startY = 0;
    let startT = 0;
    this.input.on(
      "pointerdown",
      (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        this.gestureFromUi = over.some((o) => this.controlButtons.includes(o));
        if (this.gestureFromUi) return;
        // worldY (not screen y) so the swipe threshold stays in 960×540 design
        // units regardless of the camera zoom used for hi-res rendering.
        startY = p.worldY;
        startT = p.downTime;
      },
    );
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.gestureFromUi) {
        this.gestureFromUi = false;
        return;
      }
      const dy = p.worldY - startY;
      const dt = p.upTime - startT;
      if (Math.abs(dy) > 34) this.changeLane(dy < 0 ? -1 : 1);
      else if (dt < 300) this.tryJump();
    });
  }

  private changeLane(delta: number): void {
    if (this.over) return;
    this.player.moveLane(delta);
    this.codeBg.setActiveLane(this.player.getLane());
    audio.laneSwitch();
  }

  private tryJump(): void {
    if (this.over) return;
    this.player.jump();
    audio.jump();
  }

  // ---- main loop ------------------------------------------------------

  update(_time: number, deltaMs: number): void {
    if (this.over) return;

    // slow-mo countdown runs on real time
    if (this.slowTimerMs > 0) {
      this.slowTimerMs -= deltaMs;
      if (this.slowTimerMs <= 0) this.slowFactor = 1;
    }
    const dt = deltaMs * this.slowFactor;
    const dtSec = dt / 1000;

    this.score.update(dtSec);
    this.bugs.update(dtSec);

    // spawn
    const req = this.spawner.update(dt);
    if (req) this.spawnFromRequest(req);

    const speed = this.spawner.scrollSpeed() * dtSec;
    this.moveAndCollide(speed);

    const ratio = this.bugs.getRatio();
    this.monster.update(dt, ratio);
    audio.setMonster(ratio); // drone loudness/harshness rises with the bugs
    audio.setMusic(ratio); // adaptive music: calm <-> intense by bug ratio
    this.codeBg.update(dt, this.score.linesScrolled(), ratio);
    this.player.update();
    this.updateHud();

    if (this.bugs.isFatal() || this.monster.hasCaught(ratio)) {
      this.endRun("monster");
    }
  }

  private spawnFromRequest(req: ReturnType<Spawner["update"]>): void {
    if (!req) return;
    const laneY = this.lanes.laneY(req.lane);
    if (req.powerUp) {
      const y = req.powerUp.elevated ? laneY - COLLECT.elevatedY : laneY;
      this.pickups.push(
        new Pickup(this, req.powerUp, req.lane, SPAWN.spawnX, y),
      );
    } else if (req.hazard) {
      this.hazards.push(
        new Hazard(this, req.hazard, req.lane, SPAWN.spawnX, laneY),
      );
    }
  }

  private moveAndCollide(dx: number): void {
    const playerLane = this.player.getLane();
    const playerY = this.player.currentY();

    // pickups — collection is geometric: same lane, X overlap, and the player's
    // current Y within reach of the token (jump lifts you up to elevated tech).
    this.pickups = this.pickups.filter((p) => {
      if (!p.active) return false;
      p.x -= dx;
      if (p.x < -80) {
        p.destroy();
        return false;
      }
      const window = p.elevated ? COLLECT.elevatedX : COLLECT.groundX;
      if (
        !p.consumed &&
        p.lane === playerLane &&
        Math.abs(p.x - PLAYER.x) < window &&
        Math.abs(playerY - p.baseY) < COLLECT.reachY
      ) {
        this.collect(p);
        return false;
      }
      return true;
    });

    // hazards
    this.hazards = this.hazards.filter((h) => {
      if (!h.active) return false;
      h.x -= dx;

      // telegraph catastrophes as they approach (§5)
      if (h.fatal && !h.telegraphed && h.x <= TELEGRAPH_X) {
        h.telegraphed = true;
        this.telegraphCatastrophe(h.config);
      }

      if (h.x < -80) {
        h.destroy();
        return false;
      }
      if (
        h.consumed ||
        h.lane !== playerLane ||
        Math.abs(h.x - PLAYER.x) >= HIT_X
      ) {
        return true;
      }

      // Catastrophes are lane-wide walls: being in the lane is fatal (dodge by
      // switching lanes, never bad luck). Obstacles can be jumped over.
      if (h.fatal) {
        if (this.player.isShielded()) {
          // ploughed through with a deployed Hotfix shield — reward!
          this.bugs.remove(CATASTROPHE_PLOUGH_REWARD);
          this.cameras.main.flash(220, 40, 200, 120);
          this.floatText(h.x, h.baseY, "PROŠEL! 🛡", "#7cfc9e");
          this.burst(h.x, h.baseY, 0x2ecc71);
          audio.clearScreen();
          h.hitFx();
          return false;
        }
        this.endRun(h.config.id);
        return true;
      }
      const verticalHit = Math.abs(playerY - h.baseY) < COLLECT.reachY;
      if (verticalHit) {
        // obstacle: immunity ploughs through, otherwise feed the monster
        if (this.player.isImmune()) {
          this.floatText(h.x, h.baseY, "IMMUNE", "#2496ed");
          this.burst(h.x, h.baseY, 0x2496ed);
        } else {
          this.bugs.add(h.config.bugDelta);
          this.cameras.main.shake(120, 0.004);
          this.floatText(h.x, h.baseY, `+${h.config.bugDelta}`, "#ff6b6b");
          this.burst(h.x, h.baseY, h.config.color);
          haptics.hit();
          audio.obstacle();
        }
        h.hitFx();
        return false;
      }
      return true;
    });
  }

  private collect(p: Pickup): void {
    const cfg = p.config;
    this.score.onPickup();

    if (cfg.id === "coffee") {
      // coffee slows the monster's growth — it never removes bugs (§9)
      this.bugs.slowGrowth();
      this.coffeeCount += 1;
      audio.coffee();
      this.floatText(p.x, p.y, "☕ pomaleji", "#7ec8ff");
    } else {
      // only technologies shrink the pile
      this.bugs.remove(Math.abs(cfg.bugDelta));
      if (cfg.shield) {
        // Hotfix: shield deploys after a delay, then lasts a random 4–8 s
        const dur =
          HOTFIX_SHIELD.durationMinMs +
          Math.random() *
            (HOTFIX_SHIELD.durationMaxMs - HOTFIX_SHIELD.durationMinMs);
        this.player.grantShield(HOTFIX_SHIELD.deployMs, dur);
        this.floatText(p.x, p.y - 20, "🛡 nasazuji…", "#f1c40f");
      } else if (cfg.effect === "immunity" && cfg.effectMs) {
        this.player.grantImmunity(cfg.effectMs);
      }
      if (cfg.effect === "clearScreen") {
        this.clearAllHazards();
        audio.clearScreen();
      } else {
        audio.tech();
      }
      this.codeBg.clean(); // tech briefly cleans the degraded code (§4)
      this.techCard.show(cfg);
      this.floatText(p.x, p.y, `${cfg.bugDelta}`, "#4ade80");
    }

    this.burst(p.x, p.y, cfg.color);
    p.collectFx();
  }

  /** Kubernetes clear-screen (§5): wipe every hazard on screen with a wash. */
  private clearAllHazards(): void {
    this.cameras.main.flash(220, 50, 108, 229); // K8s-blue wash
    haptics.clearScreen();
    for (const h of this.hazards) {
      this.burst(h.x, h.baseY, h.fatal ? 0x326ce5 : h.config.color);
      h.destroy();
    }
    this.hazards = [];
  }

  // ---- juice ----------------------------------------------------------

  private floatText(x: number, y: number, str: string, color: string): void {
    const t = this.add
      .text(x, y, str, {
        fontFamily: "monospace",
        fontSize: "18px",
        color,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: t,
      y: y - 44,
      alpha: 0,
      duration: 720,
      ease: "Cubic.out",
      onComplete: () => t.destroy(),
    });
  }

  private burst(x: number, y: number, color: number): void {
    const p = this.add.particles(0, 0, "spark", {
      speed: { min: 50, max: 180 },
      angle: { min: 0, max: 360 },
      lifespan: 420,
      scale: { start: 0.7, end: 0 },
      tint: color,
      blendMode: "ADD",
      emitting: false,
    });
    p.setDepth(28);
    p.explode(12, x, y);
    this.time.delayedCall(600, () => p.destroy());
  }

  // ---- catastrophe telegraph (§5) -------------------------------------

  private telegraphCatastrophe(cfg: HazardConfig): void {
    // heavy slow-mo (time keeps flowing) for a couple of seconds so the cut-in
    // is readable, then back to normal speed
    this.slowFactor = TELEGRAPH.slowMoScale;
    this.slowTimerMs = TELEGRAPH.slowMoMs;
    this.cameras.main.shake(TELEGRAPH.shakeMs, TELEGRAPH.shakeIntensity);
    this.cameras.main.flash(160, 120, 0, 0);
    audio.catastrophe();
    haptics.catastrophe();
    this.showCatastropheCutIn(cfg);
  }

  /**
   * Comedic slow-mo cut-in: a dramatic close-up of the incoming catastrophe with
   * its command + a funny quip. Sits above the lanes so the player can still see
   * which lane to dodge to. Runs on real time while the world crawls in slow-mo.
   */
  private showCatastropheCutIn(cfg: HazardConfig): void {
    this.cutIn?.destroy();
    const c = this.add.container(VIEW.width / 2, 148 + V_OFFSET).setDepth(55);

    const g = this.add.graphics();
    g.fillStyle(0x1a0000, 0.92);
    g.fillRoundedRect(-350, -48, 700, 96, 14);
    g.lineStyle(3, COLORS.danger, 1);
    g.strokeRoundedRect(-350, -48, 700, 96, 14);
    c.add(g);
    c.add(this.add.text(-312, -2, "💀", { fontSize: "46px" }).setOrigin(0.5));
    c.add(this.add.text(312, -2, "💀", { fontSize: "46px" }).setOrigin(0.5));
    // Pick a header that fits this catastrophe's category, mixed with the
    // always-fitting generic pool so it makes sense but still varies (§ headers).
    const lang = getLang();
    const category = HAZARD_CATEGORY[cfg.id] ?? "generic";
    const headerPool =
      category === "generic"
        ? CATASTROPHE_HEADERS.generic[lang]
        : [
            ...CATASTROPHE_HEADERS[category][lang],
            ...CATASTROPHE_HEADERS.generic[lang],
          ];
    const header = headerPool[Math.floor(Math.random() * headerPool.length)];
    c.add(
      this.add
        .text(0, -30, `⚠ ${header}`, {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#ffd7d5",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    // Legendary catastrophes carry long sentence labels; shrink the font so they
    // stay on one line inside the cut-in box instead of overflowing the ~600px width.
    const label = loc(cfg.label);
    const labelSize = Math.max(12, Math.min(26, Math.floor(1000 / label.length)));
    c.add(
      this.add
        .text(0, -2, label, {
          fontFamily: "monospace",
          fontSize: `${labelSize}px`,
          color: "#ff5c57",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );
    c.add(
      this.add
        .text(0, 26, cfg.quip ? loc(cfg.quip) : t("cutin.run"), {
          fontFamily: "monospace",
          fontSize: "17px",
          color: "#ffb3b0",
        })
        .setOrigin(0.5),
    );

    this.cutIn = c;
    c.setScale(0.7).setAlpha(0);
    this.tweens.add({
      targets: c,
      scale: 1,
      alpha: 1,
      duration: 170,
      ease: "Back.out",
    });
    // comedic wobble on entry
    this.tweens.add({
      targets: c,
      angle: { from: -1.6, to: 1.6 },
      duration: 95,
      yoyo: true,
      repeat: 5,
      delay: 170,
      onComplete: () => c.setAngle(0),
    });
    // auto-hide near the end of the slow-mo, then speed returns to normal
    this.tweens.add({
      targets: c,
      alpha: 0,
      scale: 0.92,
      delay: TELEGRAPH.slowMoMs - 320,
      duration: 320,
      onComplete: () => {
        c.destroy();
        if (this.cutIn === c) this.cutIn = undefined;
      },
    });
  }

  // ---- end of run -----------------------------------------------------

  private endRun(cause: string): void {
    if (this.over) return;
    this.over = true;
    this.techCard.close();
    audio.stopMonster();
    audio.setMusic(0); // drift music back to calm on the game-over screen
    audio.death();

    const summary = this.score.summary(this.bugs.getValue());
    track({
      name: "play_end",
      cause,
      lengthSec: summary.lengthSec,
      sprints: summary.sprints,
      line: summary.line,
      tickets: summary.tickets,
    });

    this.cameras.main.flash(200, 120, 0, 0);
    this.cameras.main.shake(300, 0.01);
    haptics.death();

    this.time.delayedCall(650, () => {
      this.scene.start("GameOverScene", {
        cause,
        causeLabel: loc(CAUSE_LABEL[cause] ?? cause),
        summary,
      });
    });
  }
}
