/**
 * AudioSystem — procedural sound via the WebAudio API (no asset files).
 *
 * All SFX are synthesized (oscillators + noise), matching the game's no-asset,
 * instant-play approach. On/off persists in localStorage. Sound is OFF by
 * default (many devs play muted at work); the menu toggle flips it. The audio
 * context is created lazily and resumed on a user gesture via unlock().
 *
 * Also drives the monster drone: a low churning tone whose loudness/harshness
 * scales with the bug ratio — a second audio danger readout (§4).
 *
 * Music is intentionally not wired yet — hook a track into `master` later.
 */

const KEY = "survivethesprint.sound";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = load();

// iOS mutes the WebAudio API when the hardware ring/silent switch is set to
// silent. Keeping a looping (silent) HTMLMediaElement playing bumps Safari into
// the "playback" audio category, which ignores that switch, so our synthesized
// SFX become audible again. See primeIOSMedia().
let iosMediaEl: HTMLAudioElement | null = null;

// monster drone nodes
let droneA: OscillatorNode | null = null;
let droneB: OscillatorNode | null = null;
let droneGain: GainNode | null = null;
let droneFilter: BiquadFilterNode | null = null;

// adaptive music: a calm layer + an intense layer, crossfaded by the bug ratio.
// Files are optional — drop them in public/audio/ (see docs/MUSIC.md). Until
// then the game just stays music-less; nothing breaks.
const MUSIC_CALM_URL = "audio/music-calm.mp3";
// Optional adaptive layer. Left null so we don't fetch a file that isn't there
// (that logs a 404 in the console). Set it to "audio/music-intense.mp3" once you
// drop the track into public/audio/ — the calm layer then crossfades into it.
const MUSIC_INTENSE_URL: string | null = null;
const MUSIC_MENU_URL = "audio/music-menu.mp3";
const MUSIC_VOL = 0.1; // master gain for music (SFX are louder)

// in-game adaptive music (calm + intense layers)
let musicGain: GainNode | null = null;
let calmGain: GainNode | null = null;
let intenseGain: GainNode | null = null;
let calmSrc: AudioBufferSourceNode | null = null;
let intenseSrc: AudioBufferSourceNode | null = null;
let calmBuf: AudioBuffer | null = null;
let intenseBuf: AudioBuffer | null = null;
let musicLoading = false;
let musicStarted = false;

// main-menu music (single loop; falls back to the calm loop if no menu file)
let menuGain: GainNode | null = null;
let menuSrc: AudioBufferSourceNode | null = null;
let menuBuf: AudioBuffer | null = null;
let menuLoading = false;
let menuStarted = false;

function load(): boolean {
  try {
    return localStorage.getItem(KEY) === "1"; // default off
  } catch {
    return false;
  }
}

export function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    (typeof window.AudioContext === "function" ||
      typeof (window as unknown as { webkitAudioContext?: unknown })
        .webkitAudioContext === "function")
  );
}

export function isEnabled(): boolean {
  return enabled;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|od|ad)/.test(navigator.platform) ||
    // iPadOS 13+ reports as a Mac — detect it by the touch screen instead.
    (navigator.userAgent.includes("Macintosh") && "ontouchend" in document)
  );
}

/** Build a tiny silent WAV as an object URL (no asset file needed). */
function silentWavUrl(): string {
  const sampleRate = 8000;
  const numSamples = 400; // ~0.05s of silence
  const bytes = 44 + numSamples * 2;
  const buf = new ArrayBuffer(bytes);
  const dv = new DataView(buf);
  const str = (o: number, s: string): void => {
    for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  dv.setUint32(4, bytes - 8, true);
  str(8, "WAVE");
  str(12, "fmt ");
  dv.setUint32(16, 16, true); // PCM chunk size
  dv.setUint16(20, 1, true); // PCM
  dv.setUint16(22, 1, true); // mono
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * 2, true); // byte rate
  dv.setUint16(32, 2, true); // block align
  dv.setUint16(34, 16, true); // bits/sample
  str(36, "data");
  dv.setUint32(40, numSamples * 2, true);
  // samples stay zero = silence
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

/**
 * iOS silences WebAudio when the ring/silent switch is on. Playing a looping
 * silent media element switches Safari to the "playback" category (which ignores
 * that switch), re-enabling our SFX. Must run from a user gesture (unlock does).
 */
function primeIOSMedia(): void {
  if (!isIOS()) return;
  if (!iosMediaEl) {
    const el = document.createElement("audio");
    el.src = silentWavUrl();
    el.loop = true;
    el.setAttribute("playsinline", "");
    iosMediaEl = el;
  }
  if (iosMediaEl.paused) void iosMediaEl.play().catch(() => {});
}

/** Create/resume the audio context — call from a user gesture (click/tap). */
export function unlock(): void {
  if (!isSupported()) return;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state !== "running") {
    void ctx.resume();
    // iOS: resume() alone often isn't enough — starting a zero-length buffer
    // inside the user gesture is what actually unlocks the context.
    try {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      /* best-effort */
    }
  }
  primeIOSMedia();
}

// Pause all audio when the tab/app is backgrounded — the WebAudio clock keeps
// running otherwise, so music plays on while the game is minimised (Android).
// Also pause the silent iOS media element. Resume on return if sound is on.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      iosMediaEl?.pause();
      if (ctx && ctx.state === "running") void ctx.suspend();
    } else if (enabled && ctx && ctx.state === "suspended") {
      void ctx.resume();
      if (iosMediaEl?.paused) void iosMediaEl.play().catch(() => {});
    }
  });
}

export function setEnabled(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (on) {
    unlock();
    // iOS honours a *DOM* user gesture for audio more reliably than Phaser's
    // synthetic pointer events. The tap that flipped this toggle is about to
    // fire touchend/pointerup on the document — unlock again on its release.
    const kick = (): void => unlock();
    window.addEventListener("touchend", kick, { once: true, passive: true });
    window.addEventListener("pointerup", kick, { once: true, passive: true });
    window.addEventListener("mouseup", kick, { once: true });
  } else {
    stopMonster();
    stopGameMusic();
    stopMenuMusic();
  }
}

export function toggle(): boolean {
  setEnabled(!enabled);
  return enabled;
}

// ---- synthesis helpers ------------------------------------------------

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  peak = 0.3,
  slideTo?: number,
  delay = 0,
): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise(dur: number, peak = 0.2, filterFreq = 1400): void {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = filterFreq;
  const g = ctx.createGain();
  const t0 = ctx.currentTime;
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur);
}

function play(fn: () => void): void {
  if (!enabled || !isSupported()) return;
  unlock();
  try {
    fn();
  } catch {
    /* audio is best-effort */
  }
}

// ---- SFX --------------------------------------------------------------

export const audio = {
  uiClick: () => play(() => tone(520, 0.05, "square", 0.12)),
  laneSwitch: () => play(() => tone(680, 0.04, "triangle", 0.1)),
  jump: () => play(() => tone(300, 0.14, "sine", 0.22, 640)),

  coffee: () =>
    play(() => {
      tone(660, 0.08, "sine", 0.22);
      tone(880, 0.1, "sine", 0.2, undefined, 0.06);
    }),

  tech: () =>
    play(() => {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(f, 0.09, "square", 0.16, undefined, i * 0.055),
      );
    }),

  obstacle: () =>
    play(() => {
      tone(150, 0.18, "sawtooth", 0.28, 90);
      noise(0.12, 0.14, 800);
    }),

  clearScreen: () =>
    play(() => {
      noise(0.35, 0.18, 3000);
      [784, 988, 1319].forEach((f, i) =>
        tone(f, 0.18, "triangle", 0.14, undefined, i * 0.05),
      );
    }),

  catastrophe: () =>
    play(() => {
      tone(220, 0.5, "square", 0.22, 70); // menacing downward slide
      tone(110, 0.5, "sawtooth", 0.18, 55);
      noise(0.4, 0.16, 600);
    }),

  death: () =>
    play(() => {
      [392, 330, 262, 196].forEach((f, i) =>
        tone(f, 0.22, "square", 0.2, undefined, i * 0.16),
      ); // sad "build failed" descent
    }),

  /** Update the monster drone from the 0..1 bug ratio (lifecycle-managed). */
  setMonster: (ratio: number) => {
    if (!enabled || !isSupported()) {
      stopMonster();
      return;
    }
    unlock();
    if (!ctx || !master) return;
    if (!droneA) startMonster();
    if (!droneGain || !droneFilter || !droneA) return;
    const t = ctx.currentTime;
    droneGain.gain.setTargetAtTime(0.014 + ratio * 0.08, t, 0.12);
    droneFilter.frequency.setTargetAtTime(130 + ratio * 520, t, 0.12);
    droneA.detune.setTargetAtTime(ratio * 32, t, 0.12);
  },

  stopMonster: () => stopMonster(),

  /** Play the looping main-menu track (stops any in-game music first). */
  playMenuMusic: () => {
    if (!enabled || !isSupported()) return;
    unlock();
    if (!ctx) return;
    stopGameMusic();
    if (menuStarted) return;
    if (menuBuf) startMenuMusic();
    else
      void loadMenuMusic().then(() => {
        if (enabled) startMenuMusic();
      });
  },

  /** Drive adaptive in-game music from the 0..1 bug ratio (calm <-> intense). */
  setMusic: (ratio: number) => {
    if (!enabled || !isSupported()) return;
    unlock();
    if (!ctx) return;
    stopMenuMusic(); // menu track gives way to gameplay music
    if (!musicStarted) {
      if (calmBuf) startMusic();
      else {
        void loadMusic().then(() => {
          if (enabled) startMusic();
        });
        return;
      }
    }
    if (!calmGain) return;
    const t = ctx.currentTime;
    if (intenseGain) {
      // adaptive: calm fades a bit as intensity rises, intense comes up
      calmGain.gain.setTargetAtTime(MUSIC_VOL * (1 - 0.55 * ratio), t, 0.4);
      intenseGain.gain.setTargetAtTime(MUSIC_VOL * ratio, t, 0.4);
    } else {
      // single-layer (no intense file yet): steady calm loop
      calmGain.gain.setTargetAtTime(MUSIC_VOL, t, 0.4);
    }
  },

  stopMusic: () => {
    stopGameMusic();
    stopMenuMusic();
  },
};

async function fetchDecode(url: string): Promise<AudioBuffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`missing ${url}`);
  return ctx!.decodeAudioData(await r.arrayBuffer());
}

async function loadMusic(): Promise<void> {
  if (musicLoading || calmBuf || !ctx) return;
  musicLoading = true;
  try {
    calmBuf = await fetchDecode(MUSIC_CALM_URL);
  } catch (e) {
    calmBuf = null; // no calm file yet -> no in-game music
    console.warn("[audio] in-game music failed to load/decode:", e);
  }
  if (MUSIC_INTENSE_URL) {
    try {
      intenseBuf = await fetchDecode(MUSIC_INTENSE_URL); // optional layer
    } catch {
      intenseBuf = null;
    }
  }
  musicLoading = false;
}

function startMusic(): void {
  if (musicStarted || !ctx || !master || !calmBuf) return;
  musicGain = ctx.createGain();
  musicGain.gain.value = 1;
  musicGain.connect(master);
  calmGain = ctx.createGain();
  calmGain.gain.value = MUSIC_VOL;
  calmSrc = ctx.createBufferSource();
  calmSrc.buffer = calmBuf;
  calmSrc.loop = true;
  calmSrc.connect(calmGain).connect(musicGain);
  const t = ctx.currentTime + 0.05;
  calmSrc.start(t);
  // intense layer is optional — added only if that file exists (in sync)
  if (intenseBuf) {
    intenseGain = ctx.createGain();
    intenseGain.gain.value = 0.0001;
    intenseSrc = ctx.createBufferSource();
    intenseSrc.buffer = intenseBuf;
    intenseSrc.loop = true;
    intenseSrc.connect(intenseGain).connect(musicGain);
    intenseSrc.start(t);
  }
  musicStarted = true;
}

function stopGameMusic(): void {
  try {
    calmSrc?.stop();
    intenseSrc?.stop();
  } catch {
    /* already stopped */
  }
  calmSrc = null;
  intenseSrc = null;
  calmGain = null;
  intenseGain = null;
  musicGain = null;
  musicStarted = false;
}

async function loadMenuMusic(): Promise<void> {
  if (menuLoading || menuBuf || !ctx) return;
  menuLoading = true;
  try {
    const r = await fetch(MUSIC_MENU_URL);
    if (r.ok) {
      menuBuf = await ctx.decodeAudioData(await r.arrayBuffer());
    } else {
      console.warn(`[audio] menu music fetch failed: HTTP ${r.status}`);
      // no dedicated menu track — reuse the calm in-game loop
      await loadMusic();
      menuBuf = calmBuf;
    }
  } catch (e) {
    console.warn("[audio] menu music failed to load/decode:", e);
    await loadMusic().catch(() => {});
    menuBuf = calmBuf;
  } finally {
    menuLoading = false;
  }
}

function startMenuMusic(): void {
  if (menuStarted || !ctx || !master || !menuBuf) return;
  menuGain = ctx.createGain();
  menuGain.gain.value = MUSIC_VOL;
  menuGain.connect(master);
  menuSrc = ctx.createBufferSource();
  menuSrc.buffer = menuBuf;
  menuSrc.loop = true;
  menuSrc.connect(menuGain);
  menuSrc.start(ctx.currentTime + 0.05);
  menuStarted = true;
  console.info(
    `[audio] menu music started (ctx=${ctx.state}, vol=${MUSIC_VOL})`,
  );
}

function stopMenuMusic(): void {
  try {
    menuSrc?.stop();
  } catch {
    /* already stopped */
  }
  menuSrc = null;
  menuGain = null;
  menuStarted = false;
}

function startMonster(): void {
  if (!ctx || !master || droneA) return;
  droneA = ctx.createOscillator();
  droneA.type = "sawtooth";
  droneA.frequency.value = 46;
  droneB = ctx.createOscillator();
  droneB.type = "sawtooth";
  droneB.frequency.value = 46;
  droneB.detune.value = 10;
  droneFilter = ctx.createBiquadFilter();
  droneFilter.type = "lowpass";
  droneFilter.frequency.value = 160;
  droneGain = ctx.createGain();
  droneGain.gain.value = 0.0001;
  droneA.connect(droneFilter);
  droneB.connect(droneFilter);
  droneFilter.connect(droneGain).connect(master);
  droneA.start();
  droneB.start();
}

function stopMonster(): void {
  try {
    droneA?.stop();
    droneB?.stop();
  } catch {
    /* already stopped */
  }
  droneA = null;
  droneB = null;
  droneGain = null;
  droneFilter = null;
}
