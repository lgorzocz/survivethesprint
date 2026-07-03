/**
 * BugMeter — the heart of the game (CLAUDE.md §9).
 *
 * One number drives everything downstream: monster size, monster proximity,
 * the code-degrade effect, and game over. Passive growth ESCALATES over time
 * (the growth rate itself climbs), which guarantees every run ends.
 *
 * Only technologies REMOVE bugs. Coffee calls slowGrowth(): it temporarily
 * throttles the passive growth but never shrinks the pile — so coffee-only play
 * can only delay the end, never win.
 */
import { BUGS, COFFEE_EFFECT } from "../config/balance.ts";

export class BugMeter {
  private value: number;
  private elapsedSec = 0;
  private slowSec = 0; // remaining seconds of coffee's growth slowdown

  constructor() {
    this.value = BUGS.start;
  }

  /** Advance passive growth. `dtSec` is delta time in seconds. */
  update(dtSec: number): void {
    this.elapsedSec += dtSec;
    const factor = this.slowSec > 0 ? COFFEE_EFFECT.growthFactor : 1;
    this.value += this.currentGrowthPerSec() * factor * dtSec;
    if (this.value < 0) this.value = 0;
    if (this.slowSec > 0) this.slowSec = Math.max(0, this.slowSec - dtSec);
  }

  /** Coffee: throttle growth for a while (stacks, capped). Does NOT remove bugs. */
  slowGrowth(sec = COFFEE_EFFECT.slowSec): void {
    this.slowSec = Math.min(this.slowSec + sec, COFFEE_EFFECT.maxSec);
  }

  /** True while a coffee slowdown is active (for HUD feedback). */
  isSlowed(): boolean {
    return this.slowSec > 0;
  }

  /** Passive bugs/sec right now — climbs with time survived (escalation). */
  currentGrowthPerSec(): number {
    return BUGS.baseGrowthPerSec + BUGS.growthRampPerSec * this.elapsedSec;
  }

  /** Obstacles add bugs. */
  add(n: number): void {
    this.value += Math.max(0, n);
  }

  /** Pickups remove bugs. */
  remove(n: number): void {
    this.value = Math.max(0, this.value - Math.max(0, n));
  }

  getValue(): number {
    return this.value;
  }

  /** 0..1 fill of the meter — the value most systems actually want. */
  getRatio(): number {
    return Math.min(1, this.value / BUGS.max);
  }

  /** The monster has fully caught the player. */
  isFatal(): boolean {
    return this.value >= BUGS.max;
  }
}
