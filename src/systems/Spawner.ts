/**
 * Spawner — pattern spawning + difficulty curve (CLAUDE.md §9).
 *
 * Difficulty = spawn patterns and cadence, NOT raw speed. The interval shrinks
 * as the run goes on; coffee is common and tech is rare, so surviving forces the
 * player to risk the rarer, elevated tech pickups. Catastrophes get a grace
 * period and only ever occupy a single lane, so a lane switch is always an out
 * (§5: death is the player's fault, never bad luck).
 *
 * The spawner is UI-agnostic: it emits SpawnRequest descriptors; GameScene turns
 * them into entities.
 */
import { SPAWN, WORLD } from "../config/balance.ts";
import { POWERUPS, TECHS, HOTFIX, type PowerUp } from "../config/powerups.ts";
import {
  OBSTACLES,
  CATASTROPHES,
  LEGENDARY_CATASTROPHES,
  type Hazard,
} from "../config/hazards.ts";

export type SpawnKind = "coffee" | "tech" | "obstacle" | "catastrophe";

export interface SpawnRequest {
  kind: SpawnKind;
  lane: number;
  powerUp?: PowerUp;
  hazard?: Hazard;
}

export class Spawner {
  private timerMs = 0;
  private elapsedSec = 0;
  private lastLane = -1;
  private techIndex = 0;
  private sinceTechMs = 0;
  private pending?: SpawnRequest; // e.g. a catastrophe queued behind its Hotfix
  private pendingTimer = 0; // ms until the pending request fires
  // Shuffle-bags per pool: draw every entry once before any repeats, so the same
  // hazard/catastrophe text doesn't recur (plain random-with-replacement felt
  // repetitive — you only meet ~2 catastrophes a run). Keyed by the pool array.
  private bags = new Map<readonly unknown[], unknown[]>();

  /** Current world scroll speed (px/sec), ramped by time. */
  scrollSpeed(): number {
    return Math.min(
      WORLD.maxScrollSpeed,
      WORLD.baseScrollSpeed + WORLD.speedRampPerSec * this.elapsedSec,
    );
  }

  private intervalMs(): number {
    return Math.max(
      SPAWN.minIntervalMs,
      SPAWN.baseIntervalMs - SPAWN.intervalRampPerSec * this.elapsedSec,
    );
  }

  /**
   * Advance the clock. Returns a SpawnRequest on the ticks a spawn is due,
   * otherwise null.
   */
  update(dtMs: number): SpawnRequest | null {
    this.elapsedSec += dtMs / 1000;
    this.sinceTechMs += dtMs;

    // a queued catastrophe fires on its own timer (a set lead after the Hotfix),
    // independent of the normal spawn cadence
    if (this.pending) {
      this.pendingTimer -= dtMs;
      if (this.pendingTimer <= 0) {
        const p = this.pending;
        this.pending = undefined;
        return p;
      }
    }

    this.timerMs += dtMs;
    if (this.timerMs < this.intervalMs()) return null;
    this.timerMs = 0;
    return this.makeRequest();
  }

  private makeRequest(): SpawnRequest {
    // Pity timer: force a tech if the player has gone too long without one.
    const kind =
      this.sinceTechMs >= SPAWN.techPityMs ? "tech" : this.pickKind();
    const lane = this.pickLane();
    if (kind === "tech") this.sinceTechMs = 0;
    switch (kind) {
      case "coffee":
        return { kind, lane, powerUp: POWERUPS.coffee };
      case "tech":
        return { kind, lane, powerUp: this.nextTech() };
      case "obstacle":
        return { kind, lane, hazard: this.pick(OBSTACLES) };
      case "catastrophe": {
        // very rarely, upgrade to a legendary catastrophe (§5) for a memorable death
        const pool =
          Math.random() < SPAWN.legendaryChance
            ? LEGENDARY_CATASTROPHES
            : CATASTROPHES;
        const cat: SpawnRequest = { kind, lane, hazard: this.pick(pool) };
        // sometimes offer a Hotfix shield first (same lane) — grab it and plough
        // through, or skip it and dodge. The catastrophe arrives a set lead later
        // (long enough that the shield can deploy if grabbed promptly).
        if (!this.pending && Math.random() < SPAWN.hotfixChance) {
          this.pending = cat;
          this.pendingTimer = SPAWN.hotfixLeadMs;
          this.sinceTechMs = 0; // the Hotfix counts for the tech pity timer
          return { kind: "tech", lane, powerUp: HOTFIX };
        }
        return cat;
      }
    }
  }

  private pickKind(): SpawnKind {
    const w: Record<SpawnKind, number> = { ...SPAWN.weights };
    if (this.elapsedSec * 1000 < SPAWN.catastropheGraceMs) w.catastrophe = 0;
    const total = w.coffee + w.tech + w.obstacle + w.catastrophe;
    let roll = Math.random() * total;
    if ((roll -= w.coffee) < 0) return "coffee";
    if ((roll -= w.tech) < 0) return "tech";
    if ((roll -= w.obstacle) < 0) return "obstacle";
    return "catastrophe";
  }

  /** Technologies alternate (Docker, Worklog Hub, Docker, …) rather than random. */
  private nextTech(): PowerUp {
    const tech = TECHS[this.techIndex % TECHS.length];
    this.techIndex += 1;
    return tech;
  }

  /** Avoid spawning in the same lane twice in a row so patterns feel varied. */
  private pickLane(): number {
    let lane = Math.floor(Math.random() * 3);
    if (lane === this.lastLane) lane = (lane + 1) % 3;
    this.lastLane = lane;
    return lane;
  }

  /**
   * Draw from a shuffle-bag: each pool entry comes up once before the bag
   * refills, so texts cycle through the whole set instead of repeating at random.
   */
  private pick<T>(arr: readonly T[]): T {
    let bag = this.bags.get(arr) as T[] | undefined;
    if (!bag || bag.length === 0) {
      bag = [...arr];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]]; // Fisher–Yates
      }
      this.bags.set(arr, bag as unknown[]);
    }
    return bag.pop() as T;
  }
}
