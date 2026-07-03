/**
 * DonateDialog — a self-contained "support the author" dialog.
 *
 * Owns its own DOM + styles (injected once, lazily) and its behaviour. It lives
 * in the DOM (not Phaser) because the Revolut link and clipboard copy must run
 * from a native user gesture. Donate details come from the Worklog Hub site.
 * Strings are re-applied from i18n on every open so the language is always live.
 *
 * Usage:
 *   openDonate(() => scene.resume());  // optional onClose callback
 */
import { track } from "../analytics/track.ts";
import { t } from "../i18n.ts";

const REVOLUT_URL = "https://revolut.me/lgorzolka";
const BTC_ADDR = "bc1qd2uv7u6nwcavgs79m2slyf0f7f6a6hueyduded";
const LN_ADDR = "lgorzocz@bitlifi.com";

const STYLE = `
#donate {
  position: fixed; inset: 0; z-index: 40; display: none;
  align-items: center; justify-content: center; padding: 20px;
  background: rgba(0, 0, 0, 0.78);
  font-family: "Cascadia Code", "Fira Code", ui-monospace, monospace;
}
#donate.show { display: flex; }
#donate .box {
  width: min(94vw, 400px); max-height: 92vh; overflow: auto;
  background: #24262e; border: 1px solid #3a3d47; border-radius: 18px;
  padding: 24px 22px; text-align: center; color: #d4d4d4;
}
#donate h2 { margin: 0 0 8px; color: #ff5c57; font-size: 23px; }
#donate p { font-size: 14px; line-height: 1.55; color: #c7ccd6; margin: 0 0 16px; }
#donate .donate-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; margin: 8px 0; padding: 14px 0;
  font: inherit; font-size: 15px; font-weight: bold; color: #fff;
  text-decoration: none; background: #3a3d47; border: none; border-radius: 24px;
  cursor: pointer;
}
#donate .donate-btn:hover { background: #4a4e5a; }
#donate .donate-btn.rev { background: #0e78c4; }
#donate .donate-btn.rev:hover { background: #2b93d6; }
#donate .donate-close {
  margin-top: 14px; background: none; border: none; color: #9aa4b2;
  font: inherit; font-size: 14px; text-decoration: underline; cursor: pointer;
}
`;

let overlay: HTMLElement | null = null;
let onCloseCb: (() => void) | undefined;

/** Copy to clipboard with a legacy fallback. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function wireCopy(btn: HTMLButtonElement, addr: string, labelKey: string): void {
  btn.addEventListener("click", async () => {
    track({ name: "donate_click" });
    const ok = await copyText(addr);
    // feedback; if copy failed, show the address so it can be copied by hand
    btn.textContent = ok ? t("donate.copied") : addr;
    window.setTimeout(
      () => {
        btn.textContent = t(labelKey);
      },
      ok ? 1600 : 5000,
    );
  });
}

/** Build the dialog DOM + styles once and wire all its buttons. */
function build(): HTMLElement {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  const el = document.createElement("div");
  el.id = "donate";
  el.innerHTML = `
    <div class="box">
      <h2 data-role="title"></h2>
      <p data-role="text"></p>
      <a class="donate-btn rev" data-role="rev" href="${REVOLUT_URL}" target="_blank" rel="noopener"></a>
      <button class="donate-btn" type="button" data-role="btc"></button>
      <button class="donate-btn" type="button" data-role="ln"></button>
      <button class="donate-close" type="button" data-role="close"></button>
    </div>`;
  document.body.appendChild(el);

  el.addEventListener("click", (e) => {
    if (e.target === el) closeDonate(); // click on the backdrop
  });
  el.querySelector('[data-role="close"]')?.addEventListener("click", closeDonate);
  el.querySelector('[data-role="rev"]')?.addEventListener("click", () =>
    track({ name: "donate_click" }),
  );
  const btc = el.querySelector<HTMLButtonElement>('[data-role="btc"]');
  const ln = el.querySelector<HTMLButtonElement>('[data-role="ln"]');
  if (btc) wireCopy(btc, BTC_ADDR, "donate.copyBtc");
  if (ln) wireCopy(ln, LN_ADDR, "donate.copyLn");

  return el;
}

/** (Re)apply translated strings — called on every open so language is live. */
function applyStrings(el: HTMLElement): void {
  const set = (role: string, text: string): void => {
    const n = el.querySelector(`[data-role="${role}"]`);
    if (n) n.textContent = text;
  };
  set("title", t("donate.title"));
  set("text", t("donate.text"));
  set("rev", t("donate.revolut"));
  set("btc", t("donate.copyBtc"));
  set("ln", t("donate.copyLn"));
  set("close", t("donate.close"));
}

/** Open the donate dialog. `onClose` fires when it's dismissed (e.g. resume a run). */
export function openDonate(onClose?: () => void): void {
  if (!overlay) overlay = build();
  applyStrings(overlay);
  onCloseCb = onClose;
  track({ name: "donate_click" });
  overlay.classList.add("show");
}

export function closeDonate(): void {
  overlay?.classList.remove("show");
  const cb = onCloseCb;
  onCloseCb = undefined;
  cb?.();
}
