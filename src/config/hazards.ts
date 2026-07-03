/**
 * hazards.ts — data-driven dangers (CLAUDE.md §5, §9).
 *
 * Two kinds share this shape:
 *   - obstacle   (fatal: false) — feeds the monster (+bugs), survivable
 *   - catastrophe(fatal: true)  — instant death, MUST be heavily telegraphed
 *
 * Never put a sponsor logo on any of these (§5).
 *
 * Player-facing text (label / quip / headers / cause) is a Loc: a plain string
 * when it reads the same in both languages (code like `rm -rf /`) or a {cs, en}
 * pair otherwise. Resolve it with loc() at render time.
 */

import type { Loc } from "../i18n.ts";

export interface Hazard {
  id: string;
  /** Label drawn on the token / the code snippet it corrupts. */
  label: Loc;
  snippet: string;
  /** Positive bugs added on hit (ignored when fatal). */
  bugDelta: number;
  /** true = instant game over. */
  fatal: boolean;
  color: number;
  /** Ground-level hazards are jumped over; elevated ones are ducked under. */
  elevated: boolean;
  /** Funny one-liner shown in the catastrophe slow-mo cut-in. */
  quip?: Loc;
}

/**
 * Phase 2: the full obstacle set (§5), amber warnings, survivable. Labels are
 * dev slang that reads the same in both languages, so they stay plain strings.
 */
export const OBSTACLES: Hazard[] = [
  {
    id: "prod_incident",
    label: "PROD DOWN",
    snippet: "throw new Error('500');",
    bugDelta: 40,
    fatal: false,
    color: 0xe0a030,
    elevated: false,
  },
  {
    id: "legacy_system",
    label: "LEGACY",
    snippet: "// TODO: refactor (2014)",
    bugDelta: 30,
    fatal: false,
    color: 0xe0a030,
    elevated: false,
  },
  {
    id: "asap_request",
    label: "ASAP!!!",
    snippet: "ticket.priority = 'NOW';",
    bugDelta: 25,
    fatal: false,
    color: 0xe0a030,
    elevated: false,
  },
  {
    id: "missing_docs",
    label: "NO DOCS",
    snippet: "/** @todo document */",
    bugDelta: 20,
    fatal: false,
    color: 0xe0a030,
    elevated: false,
  },
  {
    id: "meeting",
    label: "MEETING",
    snippet: "calendar.block(60);",
    bugDelta: 15,
    fatal: false,
    color: 0xe0a030,
    elevated: false,
  },
];

/**
 * Category tags shared by hazards and cut-in headers. The cut-in shows a header
 * drawn from the catastrophe's own category (see HAZARD_CATEGORY) mixed with the
 * always-fitting "generic" panic pool, so the shout on screen makes sense for the
 * disaster instead of being a random mismatch.
 */
export type HazardCategory =
  | "generic"
  | "coffee"
  | "git"
  | "db"
  | "build"
  | "code"
  | "prod"
  | "deploy"
  | "scope"; // planning / scope-creep disasters (changed spec, new PO idea, …)

/**
 * Funny headers for the catastrophe cut-in, bucketed by category and language.
 * "generic" is universal panic that fits any disaster and is always mixed in as
 * a fallback; the other buckets are shown only for catastrophes tagged with that
 * category. Pick with CATASTROPHE_HEADERS[category][getLang()].
 */
export const CATASTROPHE_HEADERS: Record<
  HazardCategory,
  { cs: string[]; en: string[] }
> = {
  generic: {
    cs: [
      "TO JE PRŮŠVIH!",
      "VŠECHNO HOŘÍ!",
      "JSME ZTRACENI!",
      "KONEC JE BLÍZKO!",
      "JE PO NÁS!",
      "TOHLE NEUSTOJÍŠ!",
      "VYPADÁ TO BLEDĚ!",
      "UŽ JE POZDĚ!",
      "TO NEDOPADNE DOBŘE!",
      "TOHLE JE MALÉR!",
      "VŠECHNO SE HROUTÍ!",
      "TOHLE NEPROJDE!",
      "VŠECHNO JE ROZBITÉ!",
      "TO JE KATASTROFA!",
      "JE TO HORŠÍ, NEŽ TO VYPADÁ!",
      "TOHLE JE FINÁLE!",
      "NASAĎ PANIKU!",
      "UTÍKEJ!",
      "UTÍKEJ, DOKUD MŮŽEŠ!",
      "JE PO VŠEM!",
      "TOHLE BUDE BOLET!",
      "ŠÉF UŽ VOLÁ!",
      "ZÁKAZNÍK UŽ PÍŠE!",
      "TO NIKDO NEOPRAVÍ!",
      "TO JE NA VÝPOVĚĎ!",
      "UŽ TO NESTÍHÁŠ!",
      "JSEM v KONCÍCH!",
      "GG!",
      "RIP!",
      "404 NADĚJE NENALEZENA!",
      "500 INTERNAL PANIC!",
      "FATAL ERROR!",
      "EXCEPTION!",
      "TOHLE JE BUGPOKALYPSA!",
      "NASAĎ DUCK TAPE!",
      "PROČ TO NIKDO NETESTOVAL?!",
      "ZASE BEZ VÝPLATY",
    ],
    en: [
      "THIS IS BAD!",
      "EVERYTHING'S ON FIRE!",
      "WE'RE DOOMED!",
      "THE END IS NEAR!",
      "WE'RE TOAST!",
      "YOU WON'T SURVIVE THIS!",
      "IT LOOKS GRIM!",
      "TOO LATE NOW!",
      "THIS WON'T END WELL!",
      "WHAT A MESS!",
      "IT'S ALL COLLAPSING!",
      "THIS WON'T PASS REVIEW!",
      "EVERYTHING'S BROKEN!",
      "IT'S A DISASTER!",
      "WORSE THAN IT LOOKS!",
      "THIS IS THE FINALE!",
      "PANIC MODE ON!",
      "RUN!",
      "RUN WHILE YOU CAN!",
      "IT'S ALL OVER!",
      "THIS IS GONNA HURT!",
      "THE BOSS IS CALLING!",
      "THE CLIENT IS TYPING!",
      "NOBODY CAN FIX THIS!",
      "THAT'S A FIREABLE ONE!",
      "YOU'RE OUT OF TIME!",
      "I'M OUT OF IDEAS!",
      "GG!",
      "RIP!",
      "404 HOPE NOT FOUND!",
      "500 INTERNAL PANIC!",
      "FATAL ERROR!",
      "EXCEPTION!",
      "IT'S THE BUGPOCALYPSE!",
      "GRAB THE DUCT TAPE!",
      "WHY DID NOBODY TEST THIS?!",
      "NO PAYCHECK AGAIN",
    ],
  },
  coffee: {
    cs: ["KÁVA DOŠLA!", "KÁVA NEPOMÁHÁ!", "VÝVOJÁŘ OMDLÉVÁ!"],
    en: ["OUT OF COFFEE!", "COFFEE ISN'T HELPING!", "THE DEV IS FAINTING!"],
  },
  git: {
    cs: ["KDO TO MERGNUL?!", "MERGE Z PEKLA!", "KDO TO PUSHNUL?!"],
    en: ["WHO MERGED THIS?!", "MERGE FROM HELL!", "WHO PUSHED THIS?!"],
  },
  db: {
    cs: ["ZÁLOHY NEEXISTUJÍ!", "DATA JSOU V TAHU!", "SBOHEM, DATABÁZE!"],
    en: ["NO BACKUPS EXIST!", "THE DATA IS GONE!", "GOODBYE, DATABASE!"],
  },
  build: {
    cs: ["BUILD SPADL!", "CI JE V PLAMENECH!", "PIPELINE UMŘELA!"],
    en: ["THE BUILD FAILED!", "CI IS IN FLAMES!", "THE PIPELINE DIED!"],
  },
  code: {
    cs: [
      "RAM UŽ NEMŮŽE!",
      "SEGMENTATION FAULT!",
      "NULL POINTER!",
      "STACK OVERFLOW!",
      "REFAKTORING SELHAL!",
      "LEGACY ÚTOČÍ!",
    ],
    en: [
      "RAM CAN'T TAKE IT!",
      "SEGMENTATION FAULT!",
      "NULL POINTER!",
      "STACK OVERFLOW!",
      "REFACTOR FAILED!",
      "LEGACY STRIKES BACK!",
    ],
  },
  prod: {
    cs: [
      "PRODUKCE PLAČE!",
      "SERVER BREČÍ!",
      "CPU VOLÁ O POMOC!",
      "NASAZENÍ SE NEPOVEDLO!",
      "ROLLBACK!",
      "ZAVOLEJ ADMINA!",
      "SPRÁVCE JE OFFLINE!",
    ],
    en: [
      "PRODUCTION IS CRYING!",
      "THE SERVER IS SOBBING!",
      "THE CPU IS BEGGING!",
      "DEPLOY FAILED!",
      "ROLLBACK!",
      "CALL THE ADMIN!",
      "THE ADMIN IS OFFLINE!",
    ],
  },
  deploy: {
    cs: ["NASAZENÍ V PÁTEK!", "DEPLOY ŠÍLÍ!", "PODY LÉTAJÍ!"],
    en: ["DEPLOY ON FRIDAY!", "DEPLOY GONE WILD!", "THE PODS ARE FLYING!"],
  },
  scope: {
    cs: [
      "SCOPE CREEP!",
      "TO NEBYLO V ZADÁNÍ!",
      "BACKLOG EXPLODOVAL!",
      "ZASE NOVÝ POŽADAVEK!",
      "SPRINT SE HROUTÍ!",
    ],
    en: [
      "SCOPE CREEP!",
      "THAT WASN'T IN THE SPEC!",
      "THE BACKLOG EXPLODED!",
      "ANOTHER REQUIREMENT!",
      "THE SPRINT IS COLLAPSING!",
    ],
  },
};

/** Phase 2: the full catastrophe set (§5) — all instant death, all telegraphed. */
export const CATASTROPHES: Hazard[] = [
{
  id: "merge_main",
  label: { cs: "Merge bez pullu", en: "Merge without pull" },
  snippet: "git merge main",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "Conflict? Jaký conflict?", en: "Conflict? What conflict?" },
},
{
  id: "delete_prod",
  label: { cs: "Smazat produkci", en: "Delete production" },
  snippet: "kubectl delete namespace prod",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "To měla být staging.", en: "That was supposed to be staging." },
},
{
  id: "restart_database",
  label: { cs: "Restart DB", en: "Restart DB" },
  snippet: "systemctl restart postgres",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "Pět minut výpadku. Možná.", en: "Five minutes of downtime. Maybe." },
},
{
  id: "hotfix_main",
  label: { cs: "Hotfix rovnou do main", en: "Hotfix straight to main" },
  snippet: "git commit -am 'fix' && git push origin main",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "Určitě to nic nerozbije.", en: "It definitely won't break anything." },
},
{
  id: "ssh_production",
  label: { cs: "SSH na produkci", en: "SSH to production" },
  snippet: "ssh root@prod",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "Jen něco malého opravím.", en: "Just fixing one little thing." },
},
{
  id: "copy_paste_stackoverflow",
  label: { cs: "Ctrl+C Ctrl+V", en: "Ctrl+C Ctrl+V" },
  snippet: "// from Stack Overflow",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "Autor zdroje: deleted user.", en: "Answer by: deleted user." },
},
{
  id: "disable_firewall",
  label: { cs: "Firewall OFF", en: "Firewall OFF" },
  snippet: "ufw disable",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "Teď to určitě půjde.", en: "It'll definitely work now." },
},
{
  id: "memory_leak",
  label: { cs: "Memory leak", en: "Memory leak" },
  snippet: "while (true) leak.push(x)",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "RAM je jen doporučení.", en: "RAM is just a suggestion." },
},
{
  id: "rewrite_everything",
  label: { cs: "Přepíšeme to od nuly", en: "Rewrite it from scratch" },
  snippet: "v2-final-final",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "Tentokrát už správně.", en: "This time for real." },
},
{
  id: "production_debug",
  label: { cs: "Debug v produkci", en: "Debug in production" },
  snippet: "console.log(user.password)",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "Už vím, co se děje.", en: "Now I see what's happening." },
},
{
  id: "rename_master",
  label: { cs: "Přejmenovat master → main", en: "Rename master → main" },
  snippet: "git branch -M main",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "CI už se nikdy nevzpamatuje.", en: "CI will never recover." },
},
{
  id: "fix_in_prod",
  label: { cs: "Edit na serveru", en: "Edit on the server" },
  snippet: "vim index.tsx",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: { cs: "Git je pro slabochy.", en: "Git is for the weak." },
},
{ id: "force_push", label: "git push --force main", snippet: "git push --force main", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Historii nikdo nepotřebuje.", en: "Who needs git history?" }, },
{ id: "friday_deploy", label: { cs: "deploy · Pá 17:00", en: "deploy · Fri 17:00" }, snippet: "deploy --prod # Friday 17:00", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Co se může pokazit?", en: "What could go wrong?" }, },
{ id: "drop_table", label: "DROP TABLE users;", snippet: "DROP TABLE users;", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Zálohy? Jaké zálohy?", en: "Backups? What backups?" }, },
{ id: "rm_rf", label: "sudo rm -rf /", snippet: "sudo rm -rf /", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Sbohem, úplně všechno.", en: "Goodbye, everything." }, },
{ id: "update_no_where", label: { cs: "UPDATE bez WHERE", en: "UPDATE without WHERE" }, snippet: "UPDATE users SET role=1;", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "WHERE? To přece netřeba.", en: "WHERE? Who needs it." }, },
];

/**
 * Legendary catastrophes (§5) — same instant death, but they appear only rarely
 * (Spawner rolls SPAWN.legendaryChance). Absurd, meme-tier disasters that reward
 * a long run with a memorable death line. Still red + telegraphed like any
 * catastrophe so "red = death" stays readable.
 */
export const LEGENDARY_CATASTROPHES: Hazard[] = [
  { id: "out_of_coffee", label: { cs: "☕ Došla káva", en: "☕ Out of coffee" }, snippet: "coffee.refill() // ENOENT", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Poslední kapka padla.", en: "The last drop has fallen." } },
  { id: "bug_writes_bugs", label: { cs: "Bug začal psát bugy", en: "The bug started writing bugs" }, snippet: "while(true) spawnBug();", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Rekurze zla.", en: "Recursion of evil." } },
  { id: "ai_refused", label: { cs: "🤖 AI odmítla pokračovat", en: "🤖 The AI refused to continue" }, snippet: "ai.continue() // denied", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "„Tohle já dělat nebudu.“", en: "\"I won't be doing that.\"" } },
  { id: "legacy_awakened", label: { cs: "👻 Legacy kód se probudil", en: "👻 The legacy code woke up" }, snippet: "// since 2009, do not touch", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Nikdo neví, jak funguje.", en: "Nobody knows how it works." } },
  { id: "spec_changed", label: { cs: "📄 Specifikace se změnila během buildu", en: "📄 The spec changed mid-build" }, snippet: "spec = !spec;", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Zase od začátku.", en: "Back to square one." } },
  { id: "po_new_idea", label: { cs: "📅 Product owner měl nový nápad", en: "📅 The product owner had a new idea" }, snippet: "backlog.push(idea);", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "„Jen malá změna…“", en: "\"Just a small change…\"" } },
  { id: "jira_sentient", label: { cs: "🔥 Jira ticket získal vědomí", en: "🔥 A Jira ticket became sentient" }, snippet: "ticket.self.create();", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "A chce víc ticketů.", en: "And it wants more tickets." } },
  { id: "git_self_conflict", label: { cs: "🐙 Git vytvořil merge conflict se sebou samým", en: "🐙 Git made a merge conflict with itself" }, snippet: "<<<<<<< HEAD", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "HEAD vs HEAD.", en: "HEAD vs HEAD." } },
  { id: "css_backend", label: { cs: "🌌 CSS ovlivnilo backend", en: "🌌 CSS affected the backend" }, snippet: "body { server: down; }", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Nikdo neví jak.", en: "Nobody knows how." } },
  { id: "regex_sentient", label: { cs: "🧙 Regex získal vlastní vůli", en: "🧙 The regex gained free will" }, snippet: "/(.*)+/.exec(soul)", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Teď vládne všemu.", en: "Now it rules everything." } },
  { id: "npm_1847", label: { cs: "📦 npm nainstalovalo 1847 balíčků kvůli jedné závislosti", en: "📦 npm installed 1847 packages for one dependency" }, snippet: "npm i left-pad", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "node_modules má vlastní gravitaci.", en: "node_modules has its own gravity." } },
  { id: "semicolon_moved", label: { cs: "🧩 Semicolon se přestěhoval na jiný řádek", en: "🧩 A semicolon moved to another line" }, snippet: "; // moved here", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "A nic už nefunguje.", en: "And nothing works anymore." } },
  { id: "cat_on_keyboard", label: { cs: "🐈 Kočka prošla po klávesnici a testy začaly procházet", en: "🐈 A cat walked across the keyboard and the tests passed" }, snippet: "asdfjkl; // tests pass", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Nikdo se neodváží commitnout.", en: "Nobody dares to commit." } },
  { id: "works_in_prod", label: "💀 It works in production, not locally", snippet: "// works in prod, not locally", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Opačně, než má.", en: "The wrong way around." } },
  { id: "internet_readonly", label: { cs: "🌍 Internet je dnes v read-only režimu", en: "🌍 The internet is in read-only mode today" }, snippet: "git push // 403", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Žádné pushnutí dnes.", en: "No pushing today." } },
  { id: "blackhole_gc", label: { cs: "⚫ Black Hole Garbage Collector aktivován", en: "⚫ Black Hole Garbage Collector activated" }, snippet: "gc.collect(*)", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Sebral i tvůj kód.", en: "It took your code too." } },
  { id: "k8s_one_node", label: { cs: "🚀 Kubernetes přesunul všechny pody na jeden server „pro zábavu“", en: "🚀 Kubernetes moved all pods to one server \"for fun\"" }, snippet: "kubectl drain --all", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: { cs: "Pro zábavu.", en: "For fun." } },
];

/**
 * Which header category fits each catastrophe, keyed by hazard id. Any id not
 * listed here falls back to "generic". Kept as one central table so the big
 * hazard arrays above stay untouched; add a line here when you add a catastrophe
 * that deserves a themed shout.
 */
export const HAZARD_CATEGORY: Record<string, HazardCategory> = {
  // regular catastrophes
  merge_main: "git",
  hotfix_main: "git",
  rename_master: "git",
  force_push: "git",
  restart_database: "db",
  drop_table: "db",
  update_no_where: "db",
  friday_deploy: "deploy",
  delete_prod: "prod",
  ssh_production: "prod",
  disable_firewall: "prod",
  production_debug: "prod",
  fix_in_prod: "prod",
  rm_rf: "prod",
  copy_paste_stackoverflow: "code",
  memory_leak: "code",
  rewrite_everything: "code",
  // legendary
  out_of_coffee: "coffee",
  bug_writes_bugs: "code",
  legacy_awakened: "code",
  spec_changed: "scope",
  po_new_idea: "scope",
  jira_sentient: "scope",
  git_self_conflict: "git",
  css_backend: "code",
  regex_sentient: "code",
  npm_1847: "code",
  semicolon_moved: "code",
  blackhole_gc: "code",
  works_in_prod: "prod",
  k8s_one_node: "deploy",
  // left on "generic" on purpose (no category fits better than plain panic):
  //   ai_refused, cat_on_keyboard, internet_readonly
};

/** Human-readable cause-of-death text keyed by hazard id (§11 analytics + §2). */
export const CAUSE_LABEL: Record<string, Loc> = {
  monster: { cs: "pohřben pod tickety", en: "buried under tickets" }, // the slow death
  force_push: "git push --force main",
  friday_deploy: { cs: "deploy v pátek v 17:00", en: "a Friday 17:00 deploy" },
  drop_table: "DROP TABLE users;",
  rm_rf: "rm -rf /",
  update_no_where: { cs: "UPDATE bez WHERE", en: "an UPDATE without WHERE" },
  // legendary
  out_of_coffee: { cs: "☕ Došla káva", en: "☕ Out of coffee" },
  bug_writes_bugs: { cs: "Bug začal psát bugy", en: "The bug started writing bugs" },
  ai_refused: { cs: "🤖 AI odmítla pokračovat", en: "🤖 The AI refused to continue" },
  legacy_awakened: { cs: "👻 Legacy kód se probudil", en: "👻 The legacy code woke up" },
  spec_changed: { cs: "📄 Specifikace se změnila během buildu", en: "📄 The spec changed mid-build" },
  po_new_idea: { cs: "📅 Product owner měl nový nápad", en: "📅 The product owner had a new idea" },
  jira_sentient: { cs: "🔥 Jira ticket získal vědomí", en: "🔥 A Jira ticket became sentient" },
  git_self_conflict: { cs: "🐙 Git merge conflict se sebou samým", en: "🐙 A Git merge conflict with itself" },
  css_backend: { cs: "🌌 CSS ovlivnilo backend", en: "🌌 CSS affected the backend" },
  regex_sentient: { cs: "🧙 Regex získal vlastní vůli", en: "🧙 The regex gained free will" },
  npm_1847: { cs: "📦 npm nainstalovalo 1847 balíčků", en: "📦 npm installed 1847 packages" },
  semicolon_moved: { cs: "🧩 Středník se přestěhoval na jiný řádek", en: "🧩 A semicolon moved to another line" },
  cat_on_keyboard: { cs: "🐈 Kočka prošla po klávesnici", en: "🐈 A cat walked across the keyboard" },
  works_in_prod: "💀 It works in production, not locally",
  internet_readonly: { cs: "🌍 Internet je v read-only režimu", en: "🌍 The internet is in read-only mode" },
  blackhole_gc: "⚫ Black Hole Garbage Collector",
  k8s_one_node: { cs: "🚀 Kubernetes: všechny pody na jeden server", en: "🚀 Kubernetes: all pods on one server" },
};
