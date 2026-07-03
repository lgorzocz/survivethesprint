/**
 * powerups.ts — data-driven positive pickups (CLAUDE.md §5, §9).
 *
 * `sponsorable` marks slots that CAN be swapped to a branded asset in Phase 4.
 * Sponsor logos go ONLY on positive power-ups, and balance is never for sale —
 * so `bugDelta`/`effect` are the game's, the sprite/label are the sponsor's slot.
 */

export type PowerUpEffect = "immunity" | "clearScreen" | "scoreBonus";

export interface PowerUp {
  id: string;
  /** Short label drawn on the pickup token. */
  label: string;
  /** Themed code snippet authored near this pickup (§4). */
  snippet: string;
  /** Negative — how many bugs it removes. */
  bugDelta: number;
  /** Short Czech blurb shown on the in-game tech info card (§12). */
  blurb?: string;
  /** Marketing lines shown on the pickup token itself (sponsored slots). */
  pitch?: string[];
  effect?: PowerUpEffect;
  /** Duration for time-based effects (ms). */
  effectMs?: number;
  /** Immunity that also survives a catastrophe (plough straight through it). */
  shield?: boolean;
  /** Fill colour of the generic token. */
  color: number;
  /** Must the player be airborne (jump) to grab it? */
  elevated: boolean;
  /** Phase 4: CAN this slot carry a sponsor brand? */
  sponsorable: boolean;
  /** Is a live sponsor currently in this slot? (shows the "sponsor" tag) */
  sponsored?: boolean;
}

/**
 * Phase 1 ships coffee + ONE technology (Docker). More tech arrives in Phase 2;
 * add entries here and the spawner/config pick them up automatically.
 */
export const POWERUPS: Record<string, PowerUp> = {
  coffee: {
    id: "coffee",
    label: "☕",
    snippet: "coffee.sip();",
    bugDelta: 0, // coffee slows growth (see COFFEE_EFFECT), never removes bugs
    color: 0xd7a86e,
    elevated: false,
    sponsorable: false, // coffee is the theme, not a sponsor slot
  },
  docker: {
    id: "docker",
    label: "Docker",
    snippet: "docker.run();",
    bugDelta: -24,
    blurb: "Krátká imunita",
    pitch: ["docker.run();"],
    effect: "immunity",
    effectMs: 2600,
    color: 0x2496ed,
    elevated: true, // you must jump to grab the tech — the risk you take
    sponsorable: true,
  },
  kubernetes: {
    id: "kubernetes",
    label: "K8s",
    snippet: "kubectl scale --replicas=0;",
    bugDelta: -18,
    blurb: "Vyčistí obrazovku",
    pitch: ["kubectl scale --replicas=0;"],
    effect: "clearScreen", // wipes every hazard on screen (§5)
    color: 0x326ce5,
    elevated: true,
    sponsorable: true,
  },
  unit_tests: {
    id: "unit_tests",
    label: "Unit Tests",
    snippet: "expect(bugs).toBe(0);",
    bugDelta: -20,
    blurb: "Větší úklid bugů",
    pitch: ["expect(bugs).toBe(0);"],
    color: 0x6cc644,
    elevated: true,
    sponsorable: false, // generic staple, always in the mix (§5)
  },
  ai_assistant: {
    id: "ai_assistant",
    label: "AI Assistant",
    snippet: "// ai: fix all the bugs",
    bugDelta: -34, // biggest raw cut (§5)
    blurb: "Největší úklid bugů",
    pitch: ["// ai: fix all the bugs"],
    color: 0x9b8cff,
    elevated: true,
    sponsorable: true,
  },
  worklog_hub: {
    id: "worklog_hub",
    label: "Worklog Hub",
    snippet: "worklog.track();",
    bugDelta: -30, // the funnel brand (§12)
    blurb: "Time tracker pro Jira.",
    pitch: ["Vykazujte chytře.", "Fakturujte snadno."],
    color: 0x2563eb, // darker brand blue (accent bar + collect burst)
    elevated: true,
    sponsorable: true,
    sponsored: true, // the only live sponsor right now
  },
  // Special: appears just before a catastrophe (see Spawner). Long immunity that
  // survives catastrophes — grab it and plough straight through for a reward.
  hotfix: {
    id: "hotfix",
    label: "Hotfix",
    snippet: "git cherry-pick hotfix;",
    bugDelta: -6,
    blurb: "Dlouhá imunita — přežij katastrofu!",
    pitch: ["git cherry-pick hotfix;"],
    effect: "immunity",
    effectMs: 5000,
    shield: true,
    color: 0xf1c40f, // gold — clearly special
    elevated: true,
    sponsorable: false,
  },
};

export const COFFEE = POWERUPS.coffee;
export const DOCKER = POWERUPS.docker;
export const HOTFIX = POWERUPS.hotfix;

/**
 * Technologies in the normal random rotation — everything except coffee and the
 * special catastrophe-shield Hotfix (which only spawns before catastrophes).
 */
export const TECHS: PowerUp[] = Object.values(POWERUPS).filter(
  (p) => p.id !== "coffee" && p.id !== "hotfix",
);
