/**
 * haptics.ts — best-effort vibration feedback (Web Vibration API).
 *
 * Works on Android browsers; iOS Safari does NOT expose navigator.vibrate, so
 * there it silently no-ops. Everything is feature-detected and wrapped in
 * try/catch — haptics must never break the game. The on/off choice persists in
 * localStorage. Coffee pickups intentionally don't buzz (too frequent).
 */

const KEY = "survivethesprint.haptics";

let enabled = load();

function load(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function isSupported(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
  );
}

export function isEnabled(): boolean {
  return enabled;
}

export function setEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* private mode / disabled storage — keep the in-memory value */
  }
}

/** Flip the setting; returns the new state. */
export function toggle(): boolean {
  setEnabled(!enabled);
  return enabled;
}

function fire(pattern: number | number[]): void {
  if (!enabled || !isSupported()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

/** Semantic buzzes wired into game events (§ juice). */
export const haptics = {
  /** Obstacle hit — quick tap. */
  hit: () => fire(22),
  /** Catastrophe entering range — strong warning pattern. */
  catastrophe: () => fire([40, 60, 40]),
  /** Game over — one long buzz. */
  death: () => fire(220),
  /** Kubernetes clear-screen — double pulse. */
  clearScreen: () => fire([15, 45, 15]),
  /** Tiny confirmation buzz (e.g. when enabling in the menu). */
  test: () => fire(30),
};
