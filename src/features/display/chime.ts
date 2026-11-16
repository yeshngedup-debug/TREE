"use client";

type SafariWindow = Window & { webkitAudioContext?: typeof AudioContext };

export const SOUND_STORAGE_KEY = "bi-kiosk-sound";

/** Whether the kiosk should sound its arrival chime. Defaults to on. */
export function soundAllowed() {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function rememberSound(allowed: boolean) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, allowed ? "on" : "off");
  } catch {
    /* Private browsing or blocked storage: the session still works. */
  }
}

let context: AudioContext | null = null;
let output: GainNode | null = null;

function ensureAudio() {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as SafariWindow).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) {
    context = new Ctor();
    output = context.createGain();
    output.gain.value = 0.6;
    output.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume().catch(() => {});
  return context;
}

/**
 * Browsers only allow audio after a gesture, so the kiosk arms its context on
 * the first tap or key press. Calling this before any interaction is harmless;
 * the notification still appears when audio stays locked.
 */
export function armChime() {
  ensureAudio();
}

/** A soft two-note bell: C6 then G6, long enough to read as an arrival. */
export function playChime() {
  const audio = ensureAudio();
  const sink = output;
  if (!audio || !sink) return;
  const start = audio.currentTime + 0.02;
  [1046.5, 1567.98].forEach((frequency, index) => {
    const at = start + index * 0.13;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.22, at + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.3);
    oscillator.connect(gain).connect(sink);
    oscillator.start(at);
    oscillator.stop(at + 1.35);
  });
}
