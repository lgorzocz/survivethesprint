/**
 * Player — the developer (CLAUDE.md §4).
 *
 * Built as a LAYERED container (body / head / headwear / accessory) so the run
 * animation is shared and customization (Phase 3) is just swapping one layer's
 * texture. For the MVP the layers are procedural graphics, not sprites.
 *
 * Position composes two independent values so a lane switch and a jump never
 * fight over `y`:
 *   y = laneYCurrent - jumpOffset
 * The scene calls `update()` each frame to apply it.
 */
import Phaser from "phaser";
import { COLORS, PLAYER } from "../config/balance.ts";
import type { LaneSystem } from "../systems/LaneSystem.ts";

export class Player extends Phaser.GameObjects.Container {
  private readonly lanes: LaneSystem;
  private lane: number;

  private laneYCurrent: number;
  private jumpOffset = 0;
  private jumping = false;

  private immuneUntil = 0; // scene time (ms) immunity lasts to
  private shieldFrom = 0; // catastrophe-proof window start (after deploy delay)
  private shieldUntil = 0; // catastrophe-proof window end
  private auraGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, lanes: LaneSystem, startLane = 1) {
    super(scene, PLAYER.x, lanes.laneY(startLane));
    this.lanes = lanes;
    this.lane = startLane;
    this.laneYCurrent = lanes.laneY(startLane);

    this.auraGfx = scene.add.graphics();
    this.add(this.auraGfx);
    this.drawLayers();

    scene.add.existing(this);

    // Subtle run bob so the developer reads as "running".
    scene.tweens.add({
      targets: this,
      scaleY: { from: 1, to: 0.94 },
      duration: 180,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  /**
   * Draw the developer as a SIDE PROFILE facing right (the running direction).
   * Near limbs (front) are drawn brighter and over the torso; far limbs (back)
   * are darker and behind it. Limbs swing front↔back from their pivots, which in
   * profile reads as a proper run cycle.
   */
  private drawLayers(): void {
    const skin = 0xe8b58a;

    // legs — pivoted at the hip; shoe points right (forward)
    const makeLeg = (
      hipX: number,
      legColor: number,
      shoeColor: number,
    ): Phaser.GameObjects.Container => {
      const c = this.scene.add.container(hipX, 24);
      c.add([
        this.scene.add.rectangle(0, 9, 7, 18, legColor),
        this.scene.add.rectangle(3, 19, 12, 5, shoeColor), // shoe forward
      ]);
      return c;
    };
    const legFar = makeLeg(-1, 0x2a4059, 0x141414);
    const legNear = makeLeg(3, 0x35506e, 0x1c1c1c);

    // arms — pivoted at the shoulder; sleeve + hand
    const makeArm = (shoulderX: number, sleeve: number) => {
      const c = this.scene.add.container(shoulderX, -3);
      c.add([
        this.scene.add.rectangle(0, 8, 6, 15, sleeve),
        this.scene.add.circle(0, 16, 3.5, skin), // hand
      ]);
      return c;
    };
    const armFar = makeArm(0, 0x2f5988); // darker = further away
    const armNear = makeArm(4, 0x3b6ea5);

    // torso — a narrow side-view hoodie
    const body = this.scene.add.graphics();
    body.setData("layer", "body");
    body.fillStyle(0x2f5988, 1);
    body.fillCircle(-8, -3, 5); // hood resting on the back of the neck
    body.fillStyle(0x3b6ea5, 1);
    body.fillRoundedRect(-9, -6, 21, 34, 6);
    body.fillStyle(0x2f5988, 1);
    body.fillRoundedRect(-9, 14, 21, 12, 5); // hoodie pocket band
    body.lineStyle(2, 0xd8d8d8, 0.9);
    body.lineBetween(5, -3, 5, 9); // drawstrings at the front
    body.lineBetween(8, -3, 8, 9);

    // head — profile: skin, a nose jutting right, light stubble on the jaw
    const head = this.scene.add.graphics();
    head.setData("layer", "head");
    head.fillStyle(skin, 1);
    head.fillCircle(2, -18, 11);
    head.fillTriangle(12, -20, 12, -13, 18, -16); // nose (points right)
    head.fillStyle(0x5c3a1e, 0.22); // stubble along the lower/front jaw
    head.fillCircle(6, -9, 3);
    head.fillCircle(10, -11, 3);

    // brown hair (top + back of head in profile) + headphones
    const headwear = this.scene.add.graphics();
    headwear.setData("layer", "headwear");
    headwear.fillStyle(0x6e4a2a, 1); // brown
    headwear.fillRoundedRect(-9, -30, 19, 10, 5); // hair on top
    headwear.fillCircle(-6, -20, 6); // hair down the back of the head
    headwear.fillTriangle(4, -28, 11, -28, 10, -21); // short fringe at the front
    // headphones (profile): ear cup + a straight black band going up from it
    headwear.fillStyle(0x1a1a1a, 1);
    headwear.fillRoundedRect(-4, -33, 5, 19, 2); // straight band up from the cup
    headwear.fillCircle(-2, -15, 7); // ear cup (side-view disc)
    headwear.fillStyle(0x3a3d42, 1);
    headwear.fillCircle(-2, -15, 3.3); // cup inner detail

    // glasses — single lens in profile, temple back to the ear
    const acc = this.scene.add.graphics();
    acc.setData("layer", "accessory");
    acc.fillStyle(0x9fd3ff, 0.9);
    acc.fillRoundedRect(3, -22, 10, 7, 2);
    acc.lineStyle(2, 0x101418, 1);
    acc.strokeRoundedRect(3, -22, 10, 7, 2);
    acc.lineBetween(3, -19, -5, -18); // temple arm to the ear
    acc.fillStyle(0xffffff, 0.85);
    acc.fillRect(6, -21, 2, 2); // lens glint

    // back→front: far arm, both legs, torso, near arm, then the face
    this.add([
      armFar,
      legFar,
      legNear,
      body,
      armNear,
      head,
      headwear,
      acc,
    ]);

    // run cycle — limbs swing front↔back; near limbs counter the far ones, and
    // arm counters the leg on the same side (natural contralateral gait)
    const swing = (
      target: Phaser.GameObjects.Container,
      from: number,
      to: number,
    ) =>
      this.scene.tweens.add({
        targets: target,
        angle: { from, to },
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut",
      });
    swing(legNear, 24, -24);
    swing(legFar, -24, 24);
    swing(armNear, -26, 26);
    swing(armFar, 26, -26);
  }

  /** Move up (-1) or down (+1) a lane. */
  moveLane(delta: number): void {
    const next = this.lanes.move(this.lane, delta);
    if (next === this.lane) return;
    this.lane = next;
    // Tween the numeric field directly; update() composes it into y.
    this.scene.tweens.add({
      targets: this,
      laneYCurrent: this.lanes.laneY(this.lane),
      duration: PLAYER.laneSwitchMs,
      ease: "Quad.out",
    });
  }

  jump(): void {
    if (this.jumping) return;
    this.jumping = true;
    // 0 -> jumpHeight -> 0 via yoyo; update() subtracts it from y.
    this.scene.tweens.add({
      targets: this,
      jumpOffset: PLAYER.jumpHeight,
      duration: PLAYER.jumpDurationMs / 2,
      ease: "Sine.out",
      yoyo: true,
      onComplete: () => {
        this.jumpOffset = 0;
        this.jumping = false;
      },
    });
  }

  /** Grant plain (obstacle) immunity for `ms`. */
  grantImmunity(ms: number): void {
    this.immuneUntil = Math.max(this.immuneUntil, this.scene.time.now + ms);
  }

  /**
   * Hotfix: obstacle immunity right away, but the catastrophe-proof shield only
   * "deploys" after `deployMs`, then lasts `durationMs`.
   */
  grantShield(deployMs: number, durationMs: number): void {
    const now = this.scene.time.now;
    this.shieldFrom = now + deployMs;
    this.shieldUntil = this.shieldFrom + durationMs;
    this.immuneUntil = Math.max(this.immuneUntil, this.shieldUntil);
  }

  isImmune(): boolean {
    return this.scene.time.now < this.immuneUntil;
  }

  /** Catastrophe-proof window active (Hotfix shield fully deployed)? */
  isShielded(): boolean {
    const now = this.scene.time.now;
    return now >= this.shieldFrom && now < this.shieldUntil;
  }

  /** Hotfix grabbed, shield still deploying (not yet catastrophe-proof). */
  isShieldDeploying(): boolean {
    return this.scene.time.now < this.shieldFrom;
  }

  getLane(): number {
    return this.lane;
  }

  isAirborne(): boolean {
    return this.jumpOffset > 8;
  }

  /** Composed vertical position this frame (lane minus jump), for collisions. */
  currentY(): number {
    return this.laneYCurrent - this.jumpOffset;
  }

  /** Called each frame by the scene. */
  update(): void {
    this.setY(this.laneYCurrent - this.jumpOffset);
    this.auraGfx.clear();
    if (this.isShielded()) {
      // solid gold ring — catastrophe-proof
      const t = (this.scene.time.now % 400) / 400;
      this.auraGfx.lineStyle(4, 0xf1c40f, 1 - t * 0.6);
      this.auraGfx.strokeCircle(0, 4, 27 + t * 6);
    } else if (this.isShieldDeploying()) {
      // fast-blinking faint gold while the hotfix is still deploying
      const on = Math.floor(this.scene.time.now / 120) % 2 === 0;
      this.auraGfx.lineStyle(2, 0xf1c40f, on ? 0.7 : 0.2);
      this.auraGfx.strokeCircle(0, 4, 27);
    } else if (this.isImmune()) {
      const t = (this.scene.time.now % 400) / 400;
      this.auraGfx.lineStyle(3, COLORS.tech, 1 - t * 0.7);
      this.auraGfx.strokeCircle(0, 4, 26 + t * 6);
    }
  }
}
