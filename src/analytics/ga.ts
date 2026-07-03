/**
 * ga.ts — routes tracked game events into Google Analytics (gtag.js).
 *
 * The gtag.js snippet + config live in index.html; here we just point the
 * analytics sink at `window.gtag`, so every track() call becomes a GA4 custom
 * event with its fields as event parameters. If gtag is missing (blocked by an
 * ad-blocker, or not loaded yet) we no-op and the game is unaffected.
 *
 * Note (GDPR): the audience is EU — for production you should gate this behind
 * consent (Google Consent Mode or a cookie banner). Right now GA loads on page
 * load per the index.html snippet.
 */
import { setSink } from "./track.ts";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initGA(): void {
  setSink((event) => {
    const gtag = window.gtag;
    if (typeof gtag !== "function") return; // not loaded / blocked
    const { name, ...params } = event;
    // In dev, flag events as debug so they show up live in GA4 DebugView
    // (no browser extension needed). Production builds send them normally.
    gtag(
      "event",
      name,
      import.meta.env.DEV ? { ...params, debug_mode: true } : params,
    );
  });
}
