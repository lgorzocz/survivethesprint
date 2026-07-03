/**
 * hazards.ts — data-driven dangers (CLAUDE.md §5, §9).
 *
 * Two kinds share this shape:
 *   - obstacle   (fatal: false) — feeds the monster (+bugs), survivable
 *   - catastrophe(fatal: true)  — instant death, MUST be heavily telegraphed
 *
 * Never put a sponsor logo on any of these (§5).
 */

export interface Hazard {
  id: string;
  /** Label drawn on the token / the code snippet it corrupts. */
  label: string;
  snippet: string;
  /** Positive bugs added on hit (ignored when fatal). */
  bugDelta: number;
  /** true = instant game over. */
  fatal: boolean;
  color: number;
  /** Ground-level hazards are jumped over; elevated ones are ducked under. */
  elevated: boolean;
  /** Funny one-liner shown in the catastrophe slow-mo cut-in. */
  quip?: string;
}

/** Phase 2: the full obstacle set (§5), amber warnings, survivable. */
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
  | "deploy";

/**
 * Funny headers for the catastrophe cut-in, bucketed by category. "generic" is
 * universal panic that fits any disaster and is always mixed in as a fallback;
 * the other buckets are shown only for catastrophes tagged with that category.
 */
export const CATASTROPHE_HEADERS: Record<HazardCategory, string[]> = {
  generic: [
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
  coffee: ["KÁVA DOŠLA!", "KÁVA NEPOMÁHÁ!", "VÝVOJÁŘ OMDLÉVÁ!"],
  git: ["KDO TO MERGNUL?!", "MERGE Z PEKLA!", "KDO TO PUSHNUL?!"],
  db: ["ZÁLOHY NEEXISTUJÍ!", "DATA JSOU V TAHU!", "SBOHEM, DATABÁZE!"],
  build: ["BUILD SPADL!", "CI JE V PLAMENECH!", "PIPELINE UMŘELA!"],
  code: [
    "RAM UŽ NEMŮŽE!",
    "SEGMENTATION FAULT!",
    "NULL POINTER!",
    "STACK OVERFLOW!",
    "REFAKTORING SELHAL!",
    "LEGACY ÚTOČÍ!",
  ],
  prod: [
    "PRODUKCE PLAČE!",
    "SERVER BREČÍ!",
    "CPU VOLÁ O POMOC!",
    "NASAZENÍ SE NEPOVEDLO!",
    "ROLLBACK!",
    "ZAVOLEJ ADMINA!",
    "SPRÁVCE JE OFFLINE!",
  ],
  deploy: ["NASAZENÍ V PÁTEK!", "DEPLOY ŠÍLÍ!", "PODY LÉTAJÍ!"],
};

/** Phase 2: the full catastrophe set (§5) — all instant death, all telegraphed. */
export const CATASTROPHES: Hazard[] = [
{
  id: "merge_main",
  label: "Merge bez pullu",
  snippet: "git merge main",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "Conflict? Jaký conflict?",
},
{
  id: "delete_prod",
  label: "Smazat produkci",
  snippet: "kubectl delete namespace prod",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "To měla být staging.",
},
{
  id: "restart_database",
  label: "Restart DB",
  snippet: "systemctl restart postgres",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "Pět minut výpadku. Možná.",
},
{
  id: "merge_friday",
  label: "Hotfix do main",
  snippet: "git commit -m 'quick fix'",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "Poslední slova programátora.",
},
{
  id: "sudo_production",
  label: "SSH na produkci",
  snippet: "ssh root@prod",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "Jen něco malého opravím.",
},
{
  id: "copy_paste_stackoverflow",
  label: "Ctrl+C Ctrl+V",
  snippet: "// from Stack Overflow",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "Autor odpovědi: deleted user.",
},
{
  id: "disable_firewall",
  label: "Firewall OFF",
  snippet: "ufw disable",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "Teď to určitě půjde.",
},
{
  id: "memory_leak",
  label: "Memory leak",
  snippet: "new Bug()",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "RAM je jen doporučení.",
},
{
  id: "rewrite_everything",
  label: "Přepíšeme to od nuly",
  snippet: "v2-final-final",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "Tentokrát už správně.",
},
{
  id: "production_debug",
  label: "Debug v produkci",
  snippet: "console.log(user.password)",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "Už vím, co se děje.",
},
{
  id: "rename_master",
  label: "Rename all",
  snippet: "git branch -M main",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "CI už se nikdy nevzpamatuje.",
},
{
  id: "fix_in_prod",
  label: "Edit na serveru",
  snippet: "vim index.tsx",
  bugDelta: 0,
  fatal: true,
  color: 0xff3b30,
  elevated: false,
  quip: "Git je pro slabochy.",
},
{ id: "force_push", label: "git push --force main", snippet: "git push --force main", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Kdo potřebuje code review?", }, 
{ id: "friday_deploy", label: "deploy · Pá 17:00", snippet: "deploy --prod # Friday 17:00", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Co se může pokazit?", }, 
{ id: "drop_table", label: "DROP TABLE users;", snippet: "DROP TABLE users;", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Zálohy? Jaké zálohy?", }, 
{ id: "rm_rf", label: "sudo rm -rf /", snippet: "sudo rm -rf /", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Sbohem, úplně všechno.", }, 
{ id: "update_no_where", label: "UPDATE bez WHERE", snippet: "UPDATE users SET role=1;", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "WHERE? To přece netřeba.", },
];

/**
 * Legendary catastrophes (§5) — same instant death, but they appear only rarely
 * (Spawner rolls SPAWN.legendaryChance). Absurd, meme-tier disasters that reward
 * a long run with a memorable death line. Still red + telegraphed like any
 * catastrophe so "red = death" stays readable.
 */
export const LEGENDARY_CATASTROPHES: Hazard[] = [
  { id: "out_of_coffee", label: "☕ Došla káva", snippet: "coffee.refill() // ENOENT", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Poslední kapka padla." },
  { id: "bug_writes_bugs", label: "Bug začal psát bugy", snippet: "while(true) spawnBug();", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Rekurze zla." },
  { id: "ai_refused", label: "🤖 AI odmítla pokračovat", snippet: "ai.continue() // denied", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "„Tohle já dělat nebudu.“" },
  { id: "legacy_awakened", label: "👻 Legacy kód se probudil", snippet: "// since 2009, do not touch", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Nikdo neví, jak funguje." },
  { id: "spec_changed", label: "📄 Specifikace se změnila během buildu", snippet: "spec = !spec;", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Zase od začátku." },
  { id: "po_new_idea", label: "📅 Product owner měl nový nápad", snippet: "backlog.push(idea);", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "„Jen malá změna…“" },
  { id: "jira_sentient", label: "🔥 Jira ticket získal vědomí", snippet: "ticket.self.create();", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "A chce víc ticketů." },
  { id: "git_self_conflict", label: "🐙 Git vytvořil merge conflict se sebou samým", snippet: "<<<<<<< HEAD", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "HEAD vs HEAD." },
  { id: "css_backend", label: "🌌 CSS ovlivnilo backend", snippet: "body { server: down; }", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Nikdo neví jak." },
  { id: "regex_sentient", label: "🧙 Regex získal vlastní vůli", snippet: "/(.*)+/.exec(soul)", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Teď vládne všemu." },
  { id: "npm_1847", label: "📦 npm nainstalovalo 1847 balíčků kvůli jedné závislosti", snippet: "npm i left-pad", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "node_modules má vlastní gravitaci." },
  { id: "semicolon_moved", label: "🧩 Semicolon se přestěhoval na jiný řádek", snippet: "; // moved here", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "A nic už nefunguje." },
  { id: "cat_on_keyboard", label: "🐈 Kočka prošla po klávesnici a testy začaly procházet", snippet: "asdfjkl; // tests pass", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Nikdo se neodváží commitnout." },
  { id: "works_in_prod", label: "💀 It works in production, not locally", snippet: "// works on my machine", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Opačně, než má." },
  { id: "internet_readonly", label: "🌍 Internet je dnes v read-only režimu", snippet: "fetch() // 403", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Žádné pushnutí dnes." },
  { id: "blackhole_gc", label: "⚫ Black Hole Garbage Collector aktivován", snippet: "gc.collect(*)", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Sebral i tvůj kód." },
  { id: "k8s_one_node", label: "🚀 Kubernetes přesunul všechny pody na jeden server „pro zábavu“", snippet: "kubectl drain --all", bugDelta: 0, fatal: true, color: 0xff3b30, elevated: false, quip: "Pro zábavu." },
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
  merge_friday: "git",
  rename_master: "git",
  force_push: "git",
  restart_database: "db",
  drop_table: "db",
  update_no_where: "db",
  friday_deploy: "deploy",
  delete_prod: "prod",
  sudo_production: "prod",
  disable_firewall: "prod",
  production_debug: "prod",
  fix_in_prod: "prod",
  rm_rf: "prod",
  copy_paste_stackoverflow: "code",
  memory_leak: "code",
  rewrite_everything: "code",
  // legendary
  out_of_coffee: "coffee",
  legacy_awakened: "code",
  git_self_conflict: "git",
  css_backend: "code",
  regex_sentient: "code",
  npm_1847: "code",
  semicolon_moved: "code",
  works_in_prod: "prod",
  k8s_one_node: "deploy",
};

/** Human-readable cause-of-death text keyed by hazard id (§11 analytics + §2). */
export const CAUSE_LABEL: Record<string, string> = {
  monster: "pohřben pod tickety", // "buried under tickets" — the slow death
  force_push: "git push --force main",
  friday_deploy: "deploy v pátek v 17:00",
  drop_table: "DROP TABLE users;",
  rm_rf: "rm -rf /",
  update_no_where: "UPDATE bez WHERE",
  // legendary
  out_of_coffee: "☕ Došla káva",
  bug_writes_bugs: "Bug začal psát bugy",
  ai_refused: "🤖 AI odmítla pokračovat",
  legacy_awakened: "👻 Legacy kód se probudil",
  spec_changed: "📄 Specifikace se změnila během buildu",
  po_new_idea: "📅 Product owner měl nový nápad",
  jira_sentient: "🔥 Jira ticket získal vědomí",
  git_self_conflict: "🐙 Git merge conflict se sebou samým",
  css_backend: "🌌 CSS ovlivnilo backend",
  regex_sentient: "🧙 Regex získal vlastní vůli",
  npm_1847: "📦 npm nainstalovalo 1847 balíčků",
  semicolon_moved: "🧩 Středník se přestěhoval na jiný řádek",
  cat_on_keyboard: "🐈 Kočka prošla po klávesnici",
  works_in_prod: "💀 It works in production, not locally",
  internet_readonly: "🌍 Internet je v read-only režimu",
  blackhole_gc: "⚫ Black Hole Garbage Collector",
  k8s_one_node: "🚀 Kubernetes: všechny pody na jeden server",
};
