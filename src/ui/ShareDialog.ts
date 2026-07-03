/**
 * ShareDialog — a self-contained "share your result" dialog.
 *
 * Owns its own DOM + styles (injected once, lazily) and its behaviour. It lives
 * in the DOM (not Phaser) because navigator.share / download must fire from a
 * native user gesture — triggered from a Phaser input callback they lose "user
 * activation" and get silently blocked. GameOverScene snapshots the canvas and
 * hands the image here.
 *
 * Usage:
 *   openShare(pngDataUrl, caption, url);
 */
import { track } from "../analytics/track.ts";
import { t } from "../i18n.ts";

const STYLE = `
#share {
  position: fixed; inset: 0; z-index: 40; display: none;
  align-items: center; justify-content: center; padding: 20px;
  background: rgba(0, 0, 0, 0.78);
  font-family: "Cascadia Code", "Fira Code", ui-monospace, monospace;
}
#share.show { display: flex; }
#share .box {
  width: min(94vw, 440px); max-height: 92vh; overflow: auto;
  background: #24262e; border: 1px solid #3a3d47; border-radius: 18px;
  padding: 20px; text-align: center; color: #d4d4d4;
}
#share h2 { margin: 0 0 12px; color: #ff5c57; font-size: 22px; }
#share img { width: 100%; border-radius: 10px; border: 1px solid #3a3d47; display: block; background: #1e1e1e; }
#share .caption { font-size: 13px; line-height: 1.5; color: #9aa4b2; margin: 12px 4px 16px; }
#share .row { display: flex; gap: 10px; }
#share .row button {
  flex: 1; padding: 14px 10px; font: inherit; font-size: 15px; font-weight: bold;
  color: #fff; border: none; border-radius: 24px; cursor: pointer;
}
#share .do { background: #0e78c4; }
#share .do:hover { background: #2b93d6; }
#share .save { background: #3a3d47; }
#share .save:hover { background: #4a4e5a; }
#share .close {
  margin-top: 14px; background: none; border: none; color: #9aa4b2;
  font: inherit; font-size: 14px; text-decoration: underline; cursor: pointer;
}
`;

let overlay: HTMLElement | null = null;
let imgEl: HTMLImageElement | null = null;
let capEl: HTMLElement | null = null;

let image = ""; // data URL of the game-over screenshot
let caption = "";
let shareUrl = "";
let onCloseCb: (() => void) | undefined;

function close(): void {
  overlay?.classList.remove("show");
  const cb = onCloseCb;
  onCloseCb = undefined;
  cb?.();
}

function downloadImage(): void {
  const a = document.createElement("a");
  a.href = image;
  a.download = "bug-tide.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function imageFile(): Promise<File | null> {
  try {
    const blob = await (await fetch(image)).blob();
    return new File([blob], "bug-tide.png", { type: "image/png" });
  } catch {
    return null;
  }
}

async function doShare(): Promise<void> {
  track({ name: "share_click" });
  const nav = navigator as Navigator & {
    canShare?: (data: unknown) => boolean;
  };
  const file = await imageFile();
  // Web Share API Level 2 (with the image) — mobile Safari/Chrome, etc.
  if (file && navigator.share && nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption, url: shareUrl });
      return;
    } catch {
      /* cancelled/failed — fall through to text/download */
    }
  }
  // Web Share without files (some browsers)
  if (navigator.share) {
    try {
      await navigator.share({ text: caption, url: shareUrl });
      return;
    } catch {
      /* fall through */
    }
  }
  // No Web Share (typical desktop): save the image + copy the caption+link.
  downloadImage();
  void navigator.clipboard?.writeText(`${caption} ${shareUrl}`).catch(() => {});
}

/** Build the dialog DOM + styles once and wire all its buttons. */
function build(): HTMLElement {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  const el = document.createElement("div");
  el.id = "share";
  el.innerHTML = `
    <div class="box">
      <h2 data-role="title"></h2>
      <img alt="Survive the Sprint" />
      <p class="caption"></p>
      <div class="row">
        <button class="do" type="button" data-role="do"></button>
        <button class="save" type="button" data-role="save"></button>
      </div>
      <button class="close" type="button" data-role="close"></button>
    </div>`;
  document.body.appendChild(el);

  imgEl = el.querySelector("img");
  capEl = el.querySelector(".caption");

  el.addEventListener("click", (e) => {
    if (e.target === el) close(); // backdrop
  });
  el.querySelector(".close")?.addEventListener("click", close);
  el.querySelector(".do")?.addEventListener("click", () => void doShare());
  el.querySelector(".save")?.addEventListener("click", () => {
    track({ name: "share_click" });
    downloadImage();
  });

  return el;
}

/** (Re)apply translated button labels — called on every open. */
function applyStrings(el: HTMLElement): void {
  const set = (role: string, text: string): void => {
    const n = el.querySelector(`[data-role="${role}"]`);
    if (n) n.textContent = text;
  };
  set("title", t("shareDlg.title"));
  set("do", t("shareDlg.do"));
  set("save", t("shareDlg.save"));
  set("close", t("shareDlg.close"));
}

/**
 * Populate + show the share dialog. `onClose` fires when it's dismissed — used
 * to swallow the touch "ghost click" that would otherwise fall through to the
 * canvas behind (see GameOverScene).
 */
export function openShare(
  imageDataUrl: string,
  text: string,
  url: string,
  onClose?: () => void,
): void {
  if (!overlay) overlay = build();
  applyStrings(overlay);
  image = imageDataUrl;
  caption = text;
  shareUrl = url;
  onCloseCb = onClose;
  if (imgEl) imgEl.src = imageDataUrl;
  if (capEl) capEl.textContent = text;
  overlay.classList.add("show");
}

export function closeShare(): void {
  close();
}
