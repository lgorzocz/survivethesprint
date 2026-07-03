/**
 * track.ts — event tracking (CLAUDE.md §11).
 *
 * These numbers ARE the Phase 4 sponsor pitch. For the MVP we just log to the
 * console and buffer in-memory; swap `sink` for a real endpoint (Plausible,
 * PostHog, a serverless function) later without touching call sites.
 */

export type GameEvent =
  | { name: "play_start" }
  | {
      name: "play_end";
      cause: string; // "monster" | catastrophe id
      lengthSec: number;
      sprints: number;
      line: number;
      tickets: number;
    }
  | { name: "quit_to_menu"; lengthSec: number; sprints: number }
  | { name: "pwa_install"; outcome: string }
  | { name: "share_click" }
  | { name: "worklog_hub_click" }
  | { name: "donate_click" }
  // brand share-of-voice (§11, §12): a tech card was shown, and how long it
  // stayed visible (impression duration) — the sponsor-pitch metric.
  // `sponsored` = a live sponsor was in the slot (only counts real SoV).
  | { name: "tech_shown"; id: string; sponsored: boolean }
  | { name: "tech_impression"; id: string; sponsored: boolean; ms: number };

type Sink = (event: GameEvent, ts: number) => void;

const buffer: Array<{ event: GameEvent; ts: number }> = [];

const consoleSink: Sink = (event, ts) => {
  // eslint-disable-next-line no-console
  console.info(`[track] ${event.name}`, { ...event, ts });
};

let sink: Sink = consoleSink;

export function setSink(next: Sink): void {
  sink = next;
}

export function track(event: GameEvent): void {
  const ts = Date.now();
  buffer.push({ event, ts });
  try {
    sink(event, ts);
  } catch {
    /* never let analytics break the game */
  }
}

/** Exposed for a future metrics view (§4 Phase 4). */
export function getBufferedEvents(): ReadonlyArray<{
  event: GameEvent;
  ts: number;
}> {
  return buffer;
}
