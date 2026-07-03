# Survive the Sprint — Project Context & Development Plan

> This file is the single source of truth for the project. Keep it at the repo root.
> Claude Code reads `CLAUDE.md` automatically at the start of every session, so all
> design decisions and rules below travel with the project to any machine.

---

## 1. One-line pitch

> You are a developer running from a growing pile of bugs, holding it back with coffee
> and modern technologies — all inside a code editor.

Web game (instant-play link is core to its viral spread among developers).

---

## 2. Core game loop

- The developer runs forward automatically.
- A **Bug Monster** chases from the left. **Its size = the player's HP.**
- **Coffee** briefly *slows* the monster's growth (never shrinks it); only **technologies** shrink it.
- **Obstacles** feed the monster (`+bugs`) — survivable mistakes.
- **Catastrophes** = instant game over.
- Bugs also grow on their own over time (`+N/sec`), and the rate **escalates** as the run goes on — this guarantees every run eventually ends.
- The player **survives only by grabbing technologies**; coffee alone cannot keep up. This is the central tension: *risk an obstacle to grab Docker, or play it safe with coffee?*

**Win/lose:** there is no winning — it is an endless runner. Score = how long you lasted.
The monster catching you = game over (slow death). A catastrophe = game over (instant death).

**Scoring (thematic, not meters):** sprints survived, tickets closed, current line number
(`Ln 4312`). Example death line: *"Survived 17 sprints. Buried under 4,312 open tickets."*

---

## 3. Controls

- **3 lanes** (the three code lines on screen) + **jump**.
- Switch lanes (up/down) to collect pickups and dodge obstacles; jump for elevated pickups / low obstacles.
- Support both: **desktop** (Arrow keys / W-S + Space) and **mobile** (swipe up/down + tap to jump).

---

## 4. Visual direction (locked)

The whole game looks like a **code editor (VS Code dark theme)**. This is both the most
thematic choice for a developer audience and the cheapest to produce.

- **Three lanes are three lines of code** (e.g. lines 42 / 43 / 44) with line numbers in a gutter and faint syntax-highlighted code on each line.
- The **active lane** = the editor's active line: lighter highlight, accent in the gutter, a blinking cursor.
- The **HUD is the editor status bar** at the bottom: branch (`main*`), sprint, coffee count, bug meter, `Ln 43`.
- A **tab bar** at top (`bug_tide.js`) frames it as a real editor window.

**Bug Monster:** not a creature — a churning mass of red errors (squiggly underlines,
falling stack traces, `[ERROR]` eyes, a jagged mouth). It chases from the left and
appears to **eat the code** (sits over the gutter / start of lines). Its size must read
instantly: thin red haze → nervous blob → a wall of churning errors filling half the screen.

**Code on the lanes changes:**
- It **scrolls** with the world (you run along an endless file). Keep it faint — texture, not something to read.
- Mostly **ambient procedural snippets** from a pool (cheap, infinite).
- **Themed snippets** hand-authored near key objects (`docker.run()` by Docker, `coffee.sip()` by coffee, `rm('-rf','/')` by the catastrophe).
- It **degrades with the bug count**: as bugs rise, red squiggles + error markers creep into the code = a *second* danger readout besides the monster. Grabbing tech briefly "cleans" it.
- Line numbers / `Ln` counter climb as you progress = ambient distance metric.

**Character:** a developer (hoodie + headphones + glasses), distinctive silhouette.
Build it as a **layered sprite** (body / head / headwear / accessory as separate layers)
so the running animation is shared and **customization is just swapping one layer's
texture**. Detailed character art is an implementation-phase task — only the silhouette
and proportions matter at design stage.

---

## 5. Element rules — DO NOT BREAK

| Type | Look | On contact | Notes |
|---|---|---|---|
| **Obstacle** | amber / warning | `+bugs` (survivable) | prod incident +40, legacy system +30, urgent "ASAP" req +25, missing docs +20, unplanned meeting +15 |
| **Catastrophe** | red, skull, `GAME OVER` | **instant death** | `git push --force main`, deploy Friday 17:00, `DROP TABLE`, `rm -rf /`. **Must be heavily telegraphed** (flash, warning sound, slow-mo) — death must always be the player's fault, never bad luck. |
| **Coffee** | amber cup | *slows* bug growth briefly (never removes bugs) | the "safe" pickup; only delays, can't win alone |
| **Technology** | branded/blue | `-big` + effect | Docker = brief immunity (plough through), Kubernetes = clear screen, Git/Unit Tests = big bug cut, AI Assistant = biggest cut |

**Sponsorship rules (Phase 4):**
- Sponsor logos go **only on positive power-ups**, NEVER on obstacles/catastrophes.
- Always keep **generic versions** in the mix so the game never looks like an ad and never breaks if a deal lapses.
- Sponsors buy **visibility / share-of-voice / a slot**, never game balance. Balance is not for sale.

---

## 6. Tech stack

- **Phaser 4** — 2D HTML5 game framework, batteries-included (sprites, input, collisions, tweens, scenes, cameras, particles, audio).
- **TypeScript** — strict mode.
- **Vite** — dev server + bundler.
- **Target:** static web build (deployable to Netlify / Vercel / GitHub Pages). No backend for the MVP; all state in-memory.

Rationale: matches a frontend/React/TS skill set, deploys as a shareable link (essential for virality), and has a current official endless-runner tutorial to bootstrap from.

---

## 7. Environment setup (new machine)

**Prerequisites**
- Node.js 18+ (LTS recommended)
- VS Code 1.98+

**Claude Code in VS Code**
1. Install the CLI: `npm install -g @anthropic-ai/claude-code` then verify with `claude --version`.
2. In VS Code open Extensions (`Ctrl+Shift+X`), search **"Claude Code"**, install the one by publisher **anthropic** (the extension bundles its own CLI for the chat panel; the global CLI is still recommended for the integrated terminal).
3. Open the project folder (`File > Open Folder`) and click the **Spark icon** (top-right of the editor) to open Claude. Sign in with a paid Claude subscription — **no API key needed**.
4. Optional: run `/terminal-setup` for `Shift+Enter` multiline in the terminal.

**Scaffold the project** (pick one)
```bash
# Option A — Vite vanilla-ts, then add Phaser (simplest)
npm create vite@latest bug-tide -- --template vanilla-ts
cd bug-tide
npm install
npm install phaser
npm run dev

# Option B — use an official Phaser + Vite + TypeScript template
#   (search "phaser vite typescript template" and follow its README)
```

**Repo hygiene for Claude Code**
- Keep this `CLAUDE.md` at the repo root.
- Add `.claude/settings.json` to pre-approve safe commands (fewer interruptions):
```json
{
  "permissions": {
    "allow": ["Read", "Edit", "Bash(npm run dev)", "Bash(npm test)", "Bash(git status)"]
  }
}
```
- Add `.claudeignore` to keep context lean and safe:
```
node_modules/
dist/
*.log
.env
```

---

## 8. Project structure (proposed)

```
bug-tide/
├─ CLAUDE.md
├─ index.html
├─ vite.config.ts
├─ src/
│  ├─ main.ts                 # Phaser game config + boot
│  ├─ scenes/
│  │  ├─ BootScene.ts         # preload assets
│  │  ├─ MenuScene.ts
│  │  ├─ GameScene.ts         # the run
│  │  └─ GameOverScene.ts     # shareable result + donate + Worklog Hub link
│  ├─ systems/
│  │  ├─ LaneSystem.ts        # 3 lanes, player lane index, switch + jump
│  │  ├─ Spawner.ts           # pattern/wave spawning + difficulty curve
│  │  ├─ BugMeter.ts          # HP/bug count: growth, +obstacle, -pickup
│  │  ├─ ScoreSystem.ts       # sprints / tickets / line number
│  │  └─ CodeBackground.ts    # scrolling code + degrade-with-bugs
│  ├─ entities/
│  │  ├─ Player.ts            # layered sprite container
│  │  ├─ BugMonster.ts        # visual that scales to bug count
│  │  ├─ Pickup.ts
│  │  └─ Hazard.ts            # obstacle (survivable) / catastrophe (fatal)
│  ├─ config/
│  │  ├─ powerups.ts          # data-driven, sponsorable flag
│  │  ├─ hazards.ts           # data-driven, fatal flag
│  │  └─ balance.ts           # all tunable numbers in one place
│  └─ analytics/
│     └─ track.ts             # event tracking (Phase 1+)
└─ assets/
   ├─ sprites/  (character layers, monster, pickups, hazards)
   └─ audio/
```

---

## 9. Architecture notes

- **Data-driven content.** Power-ups and hazards live in config files, not hard-coded. A config entry looks roughly like:
```ts
interface PowerUp {
  id: string;            // "docker"
  label: string;         // "Docker"
  bugDelta: number;      // negative
  effect?: "immunity" | "clearScreen" | "scoreBonus";
  sprite: string;        // asset key (generic by default)
  sponsorable: boolean;  // Phase 4: can be swapped to a branded slot
}
```
  This makes the generic → branded swap (Phase 4) a config + asset change, not a refactor.

- **BugMeter is the heart.** One number drives everything: monster size, monster proximity,
  the code-degrade effect, and game over. Tune growth rate, coffee value, and tech value so
  that **coffee-only play loses** — this is what forces the risk/reward.

- **Difficulty = spawn patterns, not raw speed.** Early waves put pickups in safe lanes and
  obstacles sparse; later waves push the player into risky lanes with denser catastrophes
  and less reaction time. Level design = lane patterns.

- **Readability rule:** objects must be visible far enough ahead that the player can react
  and switch lanes. Run speed and spawn distance must be tuned together — do this in Phase 1.

- **Player = layered container.** Shared run animation; customization swaps a layer texture.

---

## 10. Phased roadmap

**Phase 0 — Setup**
Scaffold, run dev server, commit, drop in this `CLAUDE.md`.

**Phase 1 — MVP (prove the fun)**
Auto-run + 3 lanes + jump; Bug Monster chase driven by BugMeter; coffee + 1 technology;
2 obstacles + 1 catastrophe; basic game-over screen. *Goal: is the risk-vs-safety choice fun?*
Get the balance numbers feeling right here before adding content.

**Phase 2 — Content + juice**
All obstacles & catastrophes; technology effects (Docker immunity, K8s clear screen);
catastrophe telegraphing (flash/sound/slow-mo); code degrades with bug level; sprint scoring;
**shareable game-over screen** (cause of death + stats).

**Phase 3 — Retention + monetization baseline**
Customization unlocks (headwear / hoodie colours earned by milestones); **Ko-fi "buy me a
coffee" donate**; **Worklog Hub funnel link** on the game-over screen (non-intrusive);
analytics events live.

**Phase 4 — Sponsorship infrastructure (later)**
Swap generic → branded power-ups via config; sponsor rotation / share-of-voice; brand asset
slots; a simple metrics view to use as the sponsor pitch.

---

## 11. Analytics from day one (Phase 1+)

Track: plays, completions, **cause of death**, run length (sprints / line number), shares,
and **click-throughs to Worklog Hub**. These numbers ARE the sponsor pitch in Phase 4 — no
data, no deal.

---

## 12. Monetization summary

- **Donate** (Ko-fi, themed as buying coffee) — baseline, near-zero effort.
- **Highest ROI:** funnel to **Worklog Hub** — the game targets the exact same audience
  (freelance devs living in Jira/sprints). Always keep one game-over slot pointing there.
- **Phase 2 sponsorship:** sell via DevRel / community-marketing budgets, not media buying.
  Best thematic fits first: error-monitoring tools (Sentry, Sonar, Snyk), dev-loving infra
  (Vercel, Netlify, Railway, Supabase), AI tooling (Cursor, Copilot). Big names (GitHub,
  Atlassian, Microsoft) later, once there are numbers and a smaller signed reference.
- Coordinating multiple sponsors = a rotating ad inventory: differentiate by share-of-voice /
  prominence / category exclusivity, never by power. Logo usage needs a trademark/brand
  agreement even when paid.

---

## 13. Open decisions (resolve during implementation)

- Final balance numbers (bug growth rate, coffee/tech values) — tune in Phase 1.
- Art production: AI-generated layered sprites vs hand-drawn.
- Hosting target (Netlify / Vercel / GitHub Pages).
- In-game UI text language: **Czech** strings (audience), code/identifiers in English.

---

## 14. Suggested kickoff prompt for Claude Code

> Read `CLAUDE.md`. Scaffold a Phaser 4 + TypeScript + Vite project per section 7, then
> implement **Phase 1 (MVP)** from section 10: a 3-lane auto-runner where a Bug Monster
> chases from the left, its size driven by a central `BugMeter` (section 9). Add coffee
> (−5 bugs) and one technology power-up (big cut), two obstacles (+bugs, survivable) and
> one catastrophe (instant game over, telegraphed), plus a basic game-over screen. Use the
> editor visual style from section 4 and the data-driven config from section 9. Put all
> tunable numbers in `config/balance.ts`. Keep it running with `npm run dev` at each step.
