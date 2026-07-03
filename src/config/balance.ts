/**
 * balance.ts — ALL tunable numbers in one place (CLAUDE.md §9).
 *
 * The golden rule from the design (§9, "BugMeter is the heart"):
 *   coffee-only play must LOSE. Passive bug growth + escalation has to outpace
 *   what coffee alone can remove, so the player is forced to risk grabbing tech.
 * Tune here first (Phase 1) before adding content.
 */

/**
 * Logical game resolution. Width is fixed at 960; height MATCHES the device's
 * landscape aspect ratio so the canvas fills the screen with no letterbox
 * (CLAUDE.md §4). Computed once at load — relaunching (e.g. the installed PWA)
 * re-reads it. Everything vertical derives from VIEW.height / LANES.topY, so the
 * whole layout adapts. Design baseline stays 16:9 → 540.
 */
function designHeight(): number {
  try {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h) return 540;
    const aspect = Math.max(w, h) / Math.min(w, h); // landscape ratio (>= 1)
    // 16:9 -> 540, 16:10 -> 600, 3:2 -> 640, 4:3 -> 720, 20:9 -> 432
    return Math.min(760, Math.max(430, Math.round(960 / aspect)));
  } catch {
    return 540;
  }
}

/**
 * Logical game resolution. Width is fixed; height is mutable and tracks the
 * device aspect (see recomputeDesign, called on load and on viewport changes).
 */
export const VIEW = {
  width: 960,
  height: designHeight(),
};

/** Editor chrome — the tab bar (top) and status bar (bottom) frame the play area. */
export const CHROME = {
  tabBarHeight: 34,
  statusBarHeight: 26,
  gutterWidth: 58, // line-number gutter on the left
} as const;

const LANE_COUNT = 3;
const LANE_GAP = 92;

/**
 * Top-lane centre Y. Centres the lane block in the play area (tab bar ↔ status
 * bar), BUT never lets the bottom lane get closer to the status bar than the 540
 * baseline (80px) — otherwise on short designs (wide phones, e.g. iPhone in
 * landscape) the running player and the last code line overlap the status bar.
 * Resolves to 250 at the 540 baseline.
 */
const LANE_BLOCK = (LANE_COUNT - 1) * LANE_GAP; // 184
const BOTTOM_CLEARANCE = 80; // px between the bottom lane and the status bar
function laneTopY(height: number): number {
  const playCentre = (CHROME.tabBarHeight + (height - CHROME.statusBarHeight)) / 2;
  const centred = playCentre + 68 - LANE_GAP;
  // cap so the bottom lane keeps its clearance above the status bar
  const maxTop =
    height - CHROME.statusBarHeight - BOTTOM_CLEARANCE - LANE_BLOCK;
  return Math.min(centred, maxTop);
}

/**
 * Vertical offset to re-centre 540-baseline content on a taller/shorter canvas.
 * Add it to any Y that was tuned for the original 540 design (menus, overlays).
 * Mutable — updated by recomputeDesign().
 */
export let V_OFFSET = Math.round((VIEW.height - 540) / 2);

/** The three lanes are three lines of code. `topY` is updated on resize. */
export const LANES = {
  count: LANE_COUNT,
  topY: laneTopY(VIEW.height),
  /** Vertical distance between adjacent lanes. */
  gap: LANE_GAP,
};

/**
 * Recompute the responsive design height from the current viewport and update
 * VIEW.height / LANES.topY / V_OFFSET in place. Returns true if the height moved
 * enough to warrant a relayout (sub-8px jitter is ignored to avoid churn).
 */
export function recomputeDesign(): boolean {
  const h = designHeight();
  if (Math.abs(h - VIEW.height) < 8) return false;
  VIEW.height = h;
  LANES.topY = laneTopY(h);
  V_OFFSET = Math.round((h - 540) / 2);
  return true;
}

export const PLAYER = {
  /** Fixed screen X the developer runs at (world scrolls past). */
  x: 300,
  laneSwitchMs: 110,
  jumpHeight: 78,
  /** Longer hang time = a more forgiving window to grab elevated tech. */
  jumpDurationMs: 640,
} as const;

/**
 * Collection geometry. Elevated tech gets a WIDER horizontal window than ground
 * pickups: you commit to a whole jump for it, so hitting it must not be
 * frame-perfect (that read as "unreachable"). `elevatedY` is how far above the
 * lane a tech token floats — comfortably inside jump reach.
 */
export const COLLECT = {
  /** Horizontal half-window (px) for grabbing a ground pickup / hitting it. */
  groundX: 36,
  /** Wider window for elevated tech — you commit a whole jump to it. */
  elevatedX: 58,
  /** How far above the lane a tech token floats (within jump reach). */
  elevatedY: 46,
  /**
   * Vertical half-reach (px). Collection/collision is geometric: an item is in
   * range when the player's current Y is within this of the item's Y. Jumping
   * lifts the player up to elevated tech and over ground obstacles.
   */
  reachY: 42,
} as const;

export const WORLD = {
  /**
   * px/sec that pickups & hazards travel leftwards at the start of a run.
   * Deliberately slow so tokens are readable and there's time to react/jump;
   * it ramps up over the run for escalating pressure.
   */
  baseScrollSpeed: 185,
  /** Scroll speed gained per second survived (≈ +35 px/s per sprint). */
  speedRampPerSec: 1.6,
  /** High cap so speed keeps scaling with sprints instead of plateauing early. */
  maxScrollSpeed: 620,
} as const;

/**
 * The BugMeter — one number that drives monster size, code degrade, and death.
 *
 * Only technologies REMOVE bugs (shrink the monster). Coffee just slows the
 * growth for a moment (see COFFEE_EFFECT) — it never shrinks the pile, so
 * coffee-only play can only delay the end, never win (§9).
 */
export const BUGS = {
  start: 12,
  /** At >= max the monster has fully caught the player. */
  max: 100,
  /** Passive growth at t=0 (bugs/sec). */
  baseGrowthPerSec: 0.65,
  /** Escalation: the growth RATE itself climbs by this much each second. */
  growthRampPerSec: 0.045,
} as const;

/** Coffee doesn't remove bugs — it briefly slows the monster's growth (§9). */
export const COFFEE_EFFECT = {
  /** How long one coffee slows growth (seconds). */
  slowSec: 4.5,
  /** Growth multiplier while slowed (0.25 = quarter speed). */
  growthFactor: 0.25,
  /** Cap when stacking multiple coffees (seconds). */
  maxSec: 10,
} as const;

export const MONSTER = {
  /** Monster width (px) at 0 bugs — a thin red haze at the gutter. */
  minWidth: 46,
  /**
   * Extra px added past the player's X when bugs hit max, so the churning
   * wall visibly engulfs the player at the moment of a slow death.
   */
  overreach: 46,
} as const;

export const SPAWN = {
  baseIntervalMs: 1300,
  minIntervalMs: 480,
  /** ms shaved off the spawn interval per second survived (≈ -88 ms per sprint). */
  intervalRampPerSec: 4,
  /** How far off the right edge things spawn (reaction-time budget). */
  spawnX: VIEW.width + 60,
  /**
   * Relative spawn weights. Coffee is common (the safe, insufficient option);
   * tech is rarer (the risk you must take); catastrophe is rare and telegraphed.
   */
  weights: {
    coffee: 44,
    tech: 22,
    obstacle: 26,
    catastrophe: 6,
  },
  /**
   * Pity timer: if no technology has spawned for this long, the next spawn is
   * forced to be tech. Guarantees you're never left with no way to survive when
   * coffee stops keeping up (§9).
   */
  techPityMs: 6000,
  /** Grace period before catastrophes can appear (ms). */
  catastropheGraceMs: 6000,
  /** Rare: chance a catastrophe is preceded by a Hotfix (a tempting risk). */
  hotfixChance: 0.15,
  /** Very rare: chance a spawned catastrophe is drawn from the legendary pool. */
  legendaryChance: 0.06,
  /**
   * The Hotfix sits RIGHT in front of its catastrophe (same lane): grab it, then
   * immediately dodge — because the shield hasn't deployed yet, this catastrophe
   * can't be ploughed. Short lead so the dodge must be instant.
   */
  hotfixLeadMs: 800,
} as const;

/**
 * Hotfix shield: does NOT protect instantly — it "deploys" after a delay (longer
 * than hotfixLeadMs, so the catastrophe right behind the Hotfix must be dodged),
 * then stays catastrophe-proof for a while to cover a LATER catastrophe.
 */
export const HOTFIX_SHIELD = {
  deployMs: 1500,
  /** Active window is randomised in this range each time (ms). */
  durationMinMs: 4000,
  durationMaxMs: 8000,
} as const;

/** Bugs removed as a reward for ploughing through a catastrophe with a shield. */
export const CATASTROPHE_PLOUGH_REWARD = 20;

export const SCORING = {
  lineStart: 42,
  /** `Ln` counter climb rate — the ambient distance metric. */
  linesPerSec: 9,
  /** Every N lines = one sprint survived (200 / 9 ≈ 22 s per sprint). */
  linesPerSprint: 200,
  /** Open tickets shown at death = current bug count scaled up for drama. */
  ticketsPerBug: 47,
} as const;

/** Catastrophe telegraph (§5: heavily telegraphed; death is never bad luck). */
export const TELEGRAPH = {
  /**
   * Heavy slow-mo as a catastrophe enters range: time keeps flowing but crawls,
   * so the cut-in is readable for a couple of seconds, then speed returns.
   */
  slowMoScale: 0.25,
  slowMoMs: 3000,
  shakeMs: 220,
  shakeIntensity: 0.006,
} as const;

/** VS Code dark theme palette. */
export const COLORS = {
  editorBg: 0x1e1e1e,
  chromeBg: 0x252526,
  statusBar: 0x007acc,
  statusBarText: "#ffffff",
  gutterText: "#858585",
  activeGutterText: "#c6c6c6",
  activeLaneBg: 0x282828,
  cursor: 0xaeafad,
  codeFaint: "#5a6a5a",
  codeKeyword: "#569cd6",
  codeString: "#ce9178",
  danger: 0xff3b30,
  warning: 0xe0a030,
  coffee: 0xd7a86e,
  tech: 0x2496ed,
  monster: 0x8b1a1a,
  monsterCore: 0xff3b30,
} as const;
