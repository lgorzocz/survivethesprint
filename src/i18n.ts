/**
 * i18n — tiny bilingual (cs/en) string table.
 *
 * Czech is the default. The active language persists in localStorage. Scenes and
 * components read strings via t(key) at build time; changing the language
 * restarts the menu / re-applies DOM strings so everything re-reads t().
 *
 * t() supports {placeholders}: t("gameover.deathMonster", { sprints: 3 }).
 */

export type Lang = "cs" | "en";

const KEY = "survivethesprint.lang";

function load(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "cs" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "cs"; // default
}

let lang: Lang = load();
const listeners = new Set<(l: Lang) => void>();

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  for (const cb of listeners) cb(next);
}

/** Subscribe to language changes (returns an unsubscribe fn). */
export function onLangChange(cb: (l: Lang) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

type Entry = { cs: string; en: string };

const DICT: Record<string, Entry> = {
  // ---- main menu ----
  "menu.subtitle": {
    cs: "// utíkáš před rostoucí hromadou bugů",
    en: "// outrun the growing pile of bugs",
  },
  "menu.play": { cs: "▶  HRÁT", en: "▶  PLAY" },
  "menu.controls1": {
    cs: "↑ / ↓  ·  W / S  ·  swipe  —  změna řádku",
    en: "↑ / ↓  ·  W / S  ·  swipe  —  change line",
  },
  "menu.controls2": {
    cs: "MEZERNÍK  ·  tap  —  skok",
    en: "SPACE  ·  tap  —  jump",
  },
  "menu.donate": { cs: "Podpoř autora", en: "Support the author" },
  "menu.lang": { cs: "Jazyk", en: "Language" },

  // toggles (sound / haptics)
  "sound.on": { cs: "🔊  Zvuk: ZAP", en: "🔊  Sound: ON" },
  "sound.off": { cs: "🔈  Zvuk: VYP", en: "🔈  Sound: OFF" },
  "sound.na": { cs: "🔇  Zvuk nedostupný", en: "🔇  Sound unavailable" },
  "haptics.on": { cs: "📳  Vibrace: ZAP", en: "📳  Haptics: ON" },
  "haptics.off": { cs: "🔕  Vibrace: VYP", en: "🔕  Haptics: OFF" },
  "haptics.na": { cs: "🔇  Vibrace nedostupné", en: "🔇  Haptics unavailable" },

  // ---- HUD (status bar) ----
  "hud.sprint": { cs: "Sprint", en: "Sprint" },
  "hud.bugs": { cs: "bugy", en: "bugs" },
  "hud.coffeeSlow": { cs: "☕ pomaleji", en: "☕ slower" },

  // ---- in-game menu dropdown ----
  "menu.mainMenu": { cs: "≡  Hlavní menu", en: "≡  Main menu" },
  "menu.donateItem": { cs: "Podpoř autora", en: "Support the author" },

  // ---- catastrophe cut-in ----
  "cutin.run": { cs: "utíkej!", en: "run!" },

  // ---- game over ----
  "gameover.title": { cs: "GAME OVER", en: "GAME OVER" },
  "gameover.deathMonster": {
    cs: "✖ Přežil jsi {sprints} sprintů — pohřben pod {tickets} tickety.",
    en: "✖ You survived {sprints} sprints — buried under {tickets} tickets.",
  },
  "gameover.deathCatastrophe": {
    cs: "✖ {cause} → okamžitý game over po {sprints} sprintech.",
    en: "✖ {cause} → instant game over after {sprints} sprints.",
  },
  "gameover.retry": { cs: "↻  Zkusit znovu", en: "↻  Try again" },
  "gameover.share": { cs: "⇪  Sdílet výsledek", en: "⇪  Share result" },
  "gameover.mainMenu": { cs: "≡  Hlavní menu", en: "≡  Main menu" },
  "gameover.funnelQuestion": {
    cs: "Máš přehled nad vykázaným časem v Jira?",
    en: "Got a handle on your logged time in Jira?",
  },
  "gameover.worklogSub": {
    cs: "Time tracker pro Jira  →",
    en: "Time tracker for Jira  →",
  },
  "stats.line": { cs: "Ln", en: "Ln" },
  "stats.sprints": { cs: "Sprinty", en: "Sprints" },
  "stats.ticketsClosed": { cs: "Zavřené tickety", en: "Closed tickets" },
  "stats.time": { cs: "Čas", en: "Time" },

  // share-to-social caption
  "share.captionMonster": {
    cs: "Survive the Sprint — přežil jsem {sprints} sprintů, pohřben pod {tickets} tickety (Ln {line}). Zvládneš víc?",
    en: "Survive the Sprint — I survived {sprints} sprints, buried under {tickets} tickets (Ln {line}). Can you beat it?",
  },
  "share.captionCatastrophe": {
    cs: "Survive the Sprint — smazal mě {cause} po {sprints} sprintech (Ln {line}). Zvládneš víc?",
    en: "Survive the Sprint — {cause} wiped me out after {sprints} sprints (Ln {line}). Can you beat it?",
  },

  // ---- share dialog ----
  "shareDlg.title": { cs: "Sdílej výsledek", en: "Share your result" },
  "shareDlg.do": { cs: "📤 Sdílet", en: "📤 Share" },
  "shareDlg.save": { cs: "⬇ Uložit obrázek", en: "⬇ Save image" },
  "shareDlg.close": { cs: "Zavřít", en: "Close" },

  // ---- donate dialog ----
  "donate.title": { cs: "Podpoř autora", en: "Support the author" },
  "donate.text": {
    cs: "Survive the Sprint i Worklog Hub dělám ve volném čase. Když tě to baví, můžeš přispět dobrovolným darem — díky moc!",
    en: "I build Survive the Sprint and Worklog Hub in my free time. If you enjoy it, you can chip in with a voluntary donation — thank you!",
  },
  "donate.revolut": { cs: "Revolut", en: "Revolut" },
  "donate.copyBtc": { cs: "₿ Kopírovat BTC adresu", en: "₿ Copy BTC address" },
  "donate.copyLn": {
    cs: "⚡ Kopírovat Lightning adresu",
    en: "⚡ Copy Lightning address",
  },
  "donate.copied": { cs: "Zkopírováno ✓", en: "Copied ✓" },
  "donate.close": { cs: "Zavřít", en: "Close" },

  // ---- DOM overlays ----
  "rotate.title": {
    cs: "Otoč zařízení na šířku",
    en: "Rotate your device to landscape",
  },
  "rotate.sub": {
    cs: "Survive the Sprint se hraje na šířku 🖥️",
    en: "Survive the Sprint is played in landscape 🖥️",
  },
  "consent.text": {
    cs: "Survive the Sprint používá <strong>Google Analytics</strong> k anonymním statistikám hraní. Kliknutím na „Souhlasím a hrát“ souhlasíš s analytickými cookies.",
    en: "Survive the Sprint uses <strong>Google Analytics</strong> for anonymous play stats. By clicking “Agree and play” you consent to analytics cookies.",
  },
  "consent.accept": { cs: "Souhlasím a hrát", en: "Agree and play" },
  "consent.fine": {
    cs: "Bez souhlasu hru bohužel nelze spustit.",
    en: "Without consent the game can’t start, sorry.",
  },
  "install.button": {
    cs: "Nainstalovat na plochu",
    en: "Install to Home Screen",
  },
  "install.sub": {
    cs: "Hraj na celou obrazovku, bez lišt prohlížeče",
    en: "Play fullscreen, without browser bars",
  },
  "installed.text": {
    cs: "💡 Z ikony na ploše běží Survive the Sprint na celou obrazovku bez lišt prohlížeče.",
    en: "💡 From the Home Screen icon Survive the Sprint runs fullscreen, without browser bars.",
  },
  "ios.title": { cs: "Přidat na plochu 📲", en: "Add to Home Screen 📲" },
  "ios.text": {
    cs: "Survive the Sprint poběží na celou obrazovku bez lišt prohlížeče.",
    en: "Survive the Sprint will run fullscreen, without browser bars.",
  },
  "ios.step1": {
    cs: "1. Klepni na <strong>Sdílet</strong>",
    en: "1. Tap <strong>Share</strong>",
  },
  "ios.step2": {
    cs: "2. Zvol <strong>Přidat na plochu</strong>",
    en: "2. Choose <strong>Add to Home Screen</strong>",
  },
  "ios.ok": { cs: "Rozumím", en: "Got it" },
  "useApp.title": {
    cs: "Survive the Sprint máš na ploše",
    en: "Survive the Sprint is on your Home Screen",
  },
  "useApp.text1": {
    cs: "Spusť ho z ikony na ploše — poběží na celou obrazovku.",
    en: "Launch it from the Home Screen icon — it runs fullscreen.",
  },
  "useApp.text2": {
    cs: "V prohlížeči je kvůli lištám oříznutý.",
    en: "In the browser it’s cropped by the bars.",
  },
  "useApp.anyway": {
    cs: "Přesto hrát v prohlížeči",
    en: "Play in the browser anyway",
  },

  // ---- power-up blurbs (shown on the tech card) ----
  "pw.docker": { cs: "Krátká imunita", en: "Brief immunity" },
  "pw.k8s": { cs: "Vyčistí obrazovku", en: "Clears the screen" },
  "pw.unittests": { cs: "Větší úklid bugů", en: "Big bug cleanup" },
  "pw.ai": { cs: "Největší úklid bugů", en: "Biggest bug cleanup" },
  "pw.worklog": { cs: "Time tracker pro Jira.", en: "Time tracker for Jira." },
  "pw.worklog.pitch1": { cs: "Vykazujte chytře.", en: "Log smart." },
  "pw.worklog.pitch2": { cs: "Fakturujte snadno.", en: "Invoice easily." },
  "pw.hotfix": {
    cs: "Dlouhá imunita — přežij katastrofu!",
    en: "Long immunity — survive a catastrophe!",
  },
};

/** Translate a key, with optional {placeholder} interpolation. */
export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const entry = DICT[key];
  let s = entry ? entry[lang] : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
