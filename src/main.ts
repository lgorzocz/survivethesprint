/**
 * main.ts — Phaser game config + boot (CLAUDE.md §8).
 */
import Phaser from "phaser";
import { COLORS, VIEW, recomputeDesign } from "./config/balance.ts";
import { RENDER_SCALE } from "./render.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { MenuScene } from "./scenes/MenuScene.ts";
import { GameScene } from "./scenes/GameScene.ts";
import { GameOverScene } from "./scenes/GameOverScene.ts";
import { initGA } from "./analytics/ga.ts";
import { track } from "./analytics/track.ts";
import { t, onLangChange } from "./i18n.ts";

/** Fill every [data-i18n] / [data-i18n-html] element from the string table. */
function applyDomStrings(): void {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    const key = el.dataset.i18nHtml;
    if (key) el.innerHTML = t(key);
  });
}
applyDomStrings();
onLangChange(applyDomStrings);

/**
 * Render text at the higher backing resolution too. Camera zoom (see render.ts)
 * scales up Text textures and would blur them; bumping each Text's resolution as
 * it's created keeps labels/code crisp. Patch the factory once, before boot, so
 * every `scene.add.text(...)` across the game benefits without touching callers.
 */
const addText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (
  this: Phaser.GameObjects.GameObjectFactory,
  ...args: Parameters<typeof addText>
) {
  return addText.apply(this, args).setResolution(RENDER_SCALE);
};

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "stage",
  backgroundColor: COLORS.editorBg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Bigger backing store; the camera zooms by RENDER_SCALE so the visible
    // design stays 960×540 but is drawn at this higher resolution.
    width: VIEW.width * RENDER_SCALE,
    height: VIEW.height * RENDER_SCALE,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
});

/**
 * Landscape only. In portrait we freeze the game loop (the CSS #rotate overlay
 * covers the screen and asks the player to rotate). Best-effort orientation lock
 * where the browser allows it (installed PWA / fullscreen Android); iOS ignores
 * it, which is why the overlay + loop pause is the real safeguard.
 */
function applyOrientation(): void {
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  if (portrait) game.loop.sleep();
  else game.loop.wake();
}

/**
 * iOS Safari reports a *layout* viewport (100vh / window.innerHeight) that is
 * taller than what's actually visible behind the collapsing toolbars, so Phaser
 * would fit the canvas to that taller box and push the top tab bar (and bottom
 * status bar) off-screen. Bind #game to `visualViewport` — the genuinely visible
 * rect — and refresh the scale manager so FIT recomputes against it. #stage then
 * insets from the notch / home indicator inside that visible box.
 */
const gameEl = document.getElementById("game");
/** Size the #game box (Phaser's grandparent) to the actually-visible viewport. */
function sizeGameToViewport(): void {
  const vv = window.visualViewport;
  if (gameEl && vv) {
    gameEl.style.width = `${Math.round(vv.width)}px`;
    gameEl.style.height = `${Math.round(vv.height)}px`;
    gameEl.style.transform = `translate(${vv.offsetLeft}px, ${vv.offsetTop}px)`;
  }
}
function fitToVisibleViewport(): void {
  sizeGameToViewport();
  game.scale.refresh();
}

/**
 * When the visible aspect ratio changes for real — a desktop window resize /
 * maximise, or a mobile browser hiding its toolbar after load — recompute the
 * responsive design height, resize the backing store and relayout.
 *
 * On touch devices we DON'T rebuild an in-progress run (a toolbar collapse must
 * never wipe the game); it re-syncs on its next scene via applyResponsiveSize().
 * On desktop a resize is deliberate and rare, so anything may rebuild.
 */
function onViewportChange(): void {
  // Size #game to the new viewport FIRST, so setGameSize/refresh fit against the
  // correct parent bounds (otherwise Phaser fits one resize behind — stale box).
  sizeGameToViewport();
  if (recomputeDesign()) {
    game.scale.setGameSize(VIEW.width * RENDER_SCALE, VIEW.height * RENDER_SCALE);
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    for (const s of game.scene.getScenes(true)) {
      if (coarse && s.scene.key === "GameScene") continue;
      s.scene.restart();
    }
  }
  game.scale.refresh();
}

let viewportTimer = 0;
function scheduleViewportChange(): void {
  window.clearTimeout(viewportTimer);
  viewportTimer = window.setTimeout(onViewportChange, 200);
}

window.visualViewport?.addEventListener("resize", scheduleViewportChange);
window.visualViewport?.addEventListener("scroll", fitToVisibleViewport);
window.addEventListener("resize", scheduleViewportChange);
// orientationchange fires before the new viewport settles — refit after a beat.
window.addEventListener("orientationchange", () => {
  window.setTimeout(onViewportChange, 350);
});
fitToVisibleViewport();

/**
 * Diagnostic overlay (enable with ?debug in the URL). Prints the real viewport /
 * canvas metrics on screen so mobile layout issues can be read off a screenshot
 * instead of guessed at. No effect for normal players.
 */
if (location.search.includes("debug")) {
  const dbg = document.createElement("div");
  dbg.style.cssText =
    "position:fixed;top:0;left:0;z-index:99;background:rgba(0,0,0,.8);" +
    "color:#3fd;font:11px/1.35 monospace;padding:6px 8px;white-space:pre;" +
    "pointer-events:none;max-width:60vw;";
  document.body.appendChild(dbg);
  const modes = ["fullscreen", "standalone", "minimal-ui", "browser"];
  const rect = (el: Element | null): string => {
    const r = el?.getBoundingClientRect();
    return r ? `${r.width | 0}x${r.height | 0} @${r.left | 0},${r.top | 0}` : "-";
  };
  const update = (): void => {
    const vv = window.visualViewport;
    const mode = modes.find((m) => matchMedia(`(display-mode:${m})`).matches);
    dbg.textContent =
      `inner ${innerWidth}x${innerHeight} dpr ${devicePixelRatio}\n` +
      `visualVP ${vv ? `${vv.width | 0}x${vv.height | 0} off ${vv.offsetLeft | 0},${vv.offsetTop | 0}` : "-"}\n` +
      `screen ${screen.width}x${screen.height} avail ${screen.availWidth}x${screen.availHeight}\n` +
      `#game   ${rect(document.getElementById("game"))}\n` +
      `#stage  ${rect(document.getElementById("stage"))}\n` +
      `canvas  ${rect(document.querySelector("#stage canvas"))}\n` +
      `mode ${mode ?? "?"}`;
  };
  update();
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
  window.addEventListener("resize", update);
  window.setInterval(update, 1000);
}

const orientation = screen.orientation as ScreenOrientation & {
  lock?: (o: string) => Promise<void>;
};
orientation?.lock?.("landscape").catch(() => {
  /* not permitted here — the overlay handles it */
});

window.addEventListener("resize", applyOrientation);
window.addEventListener("orientationchange", applyOrientation);
applyOrientation();

/**
 * Consent wall — the player must agree before playing. On accept we grant
 * Google Consent Mode, start sending analytics (initGA), and hide the overlay.
 * The choice is remembered so returning players aren't asked again.
 */
const CONSENT_KEY = "survivethesprint.consent";

function grantConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, "1");
  } catch {
    /* private mode — proceed for this session */
  }
  window.gtag?.("consent", "update", { analytics_storage: "granted" });
  initGA();
  const el = document.getElementById("consent");
  if (el) el.style.display = "none";
}

const hasConsent = (() => {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
})();

if (hasConsent) {
  grantConsent();
} else {
  document
    .getElementById("consent-accept")
    ?.addEventListener("click", grantConsent);
}

/**
 * PWA install — one unified chip for both platforms. Android/desktop Chromium
 * fire `beforeinstallprompt`, so the chip triggers the native one-tap install.
 * iOS has no such API, so the same chip opens the Share → "Přidat na plochu"
 * steps instead. The chip stays hidden once the game runs as an installed PWA.
 */
const installBtn = document.getElementById("install");
const installedHint = document.getElementById("installed");
const iosSheet = document.getElementById("ios-install");

const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOS = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS 13+ reports as a Mac — detect it by the touch screen instead.
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Phone / tablet (coarse primary pointer). On desktop the browser's own URL-bar
// install icon is enough, so the custom install chip / notice stay hidden there.
const isMobileLike = (): boolean =>
  window.matchMedia("(pointer: coarse)").matches;

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
let deferredPrompt: InstallPrompt | null = null;

function showInstallChip(): void {
  if (!isStandalone() && isMobileLike()) installBtn?.classList.add("show");
}

/**
 * Show a passive notice that the app is installed. The web CANNOT launch an
 * installed PWA (no such API), so this is informational only — the player must
 * tap the Home Screen icon. It stays until the player closes it with the ✕.
 * Mobile/tablet only (desktop has the URL-bar install icon).
 */
function showInstalledHint(): void {
  installBtn?.classList.remove("show");
  iosSheet?.classList.remove("show");
  if (isStandalone() || !installedHint || !isMobileLike()) return;
  installedHint.classList.add("show");
}

// Android / desktop Chromium: a real install prompt is available.
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e as InstallPrompt;
  showInstallChip();
});

// iOS: no install event exists — offer the manual steps when not yet installed.
if (isIOS() && !isStandalone()) showInstallChip();

// (3) Already installed but opened in the browser tab (Chromium only — the API
// is absent on iOS/Safari/Firefox, so those simply fall through). On a touch
// device we WALL OFF browser play and send the player to the Home Screen app
// (where it runs fullscreen); on desktop we just show the passive hint.
const useAppOverlay = document.getElementById("use-app");
const nav = navigator as unknown as {
  getInstalledRelatedApps?: () => Promise<unknown[]>;
};
if (!isStandalone()) {
  nav
    .getInstalledRelatedApps?.()
    .then((apps) => {
      if (apps.length === 0) return;
      const touch = window.matchMedia("(pointer: coarse)").matches;
      if (touch && useAppOverlay) {
        // opaque overlay (z-index above everything) blocks input + hides the game
        useAppOverlay.classList.add("show");
        track({ name: "pwa_install", outcome: "browser_blocked" });
      } else {
        showInstalledHint();
      }
    })
    .catch(() => {
      /* unsupported — leave the normal install chip */
    });
}

// Escape hatch: let the player dismiss the wall and play in the browser anyway.
document.getElementById("use-app-anyway")?.addEventListener("click", () => {
  useAppOverlay?.classList.remove("show");
});

installBtn?.addEventListener("click", async () => {
  if (deferredPrompt) {
    installBtn.classList.remove("show");
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    track({ name: "pwa_install", outcome });
    deferredPrompt = null;
  } else {
    iosSheet?.classList.add("show");
    track({ name: "pwa_install", outcome: "ios_instructions" });
  }
});

document
  .getElementById("ios-install-close")
  ?.addEventListener("click", () => iosSheet?.classList.remove("show"));

// Close the notice with the ✕ (it can't launch the PWA — the user taps the icon).
document
  .getElementById("installed-close")
  ?.addEventListener("click", () => installedHint?.classList.remove("show"));

// (1) After a successful install, replace the chip with the open-from-Home hint.
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  track({ name: "pwa_install", outcome: "installed" });
  showInstalledHint();
});

