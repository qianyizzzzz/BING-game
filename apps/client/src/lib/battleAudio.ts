import { type BattleSoundCue } from "./turnTimeline";

interface CueProfile {
  frequency: number;
  durationMs: number;
  gain: number;
  type: OscillatorType;
}

const CUE_PROFILES: Record<BattleSoundCue, CueProfile> = {
  "turn-reveal": { frequency: 420, durationMs: 110, gain: 0.025, type: "triangle" },
  hit: { frequency: 120, durationMs: 120, gain: 0.034, type: "square" },
  "area-hit": { frequency: 92, durationMs: 150, gain: 0.032, type: "sawtooth" },
  block: { frequency: 260, durationMs: 105, gain: 0.025, type: "triangle" },
  reflect: { frequency: 520, durationMs: 130, gain: 0.026, type: "sine" },
  break: { frequency: 150, durationMs: 145, gain: 0.033, type: "sawtooth" },
  heal: { frequency: 640, durationMs: 150, gain: 0.022, type: "sine" },
  clash: { frequency: 180, durationMs: 120, gain: 0.03, type: "square" },
  skill: { frequency: 760, durationMs: 140, gain: 0.024, type: "triangle" },
  defeat: { frequency: 82, durationMs: 210, gain: 0.032, type: "sawtooth" },
  victory: { frequency: 880, durationMs: 230, gain: 0.024, type: "sine" },
  system: { frequency: 330, durationMs: 90, gain: 0.018, type: "triangle" }
};

let audioContext: AudioContext | null = null;
let enabledByInteraction = false;

if (typeof window !== "undefined") {
  const enableAudio = () => {
    enabledByInteraction = true;
  };
  window.addEventListener("pointerdown", enableAudio, { once: true, passive: true });
  window.addEventListener("keydown", enableAudio, { once: true });
}

export function playBattleCue(cue: BattleSoundCue | undefined): void {
  if (!cue || !enabledByInteraction || prefersReducedMotion()) {
    return;
  }

  const profile = CUE_PROFILES[cue];
  const context = getAudioContext();
  if (!context || context.state === "closed") {
    return;
  }

  const startedAt = context.currentTime;
  const endedAt = startedAt + profile.durationMs / 1000;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = profile.type;
  oscillator.frequency.setValueAtTime(profile.frequency, startedAt);
  gain.gain.setValueAtTime(0.0001, startedAt);
  gain.gain.exponentialRampToValueAtTime(profile.gain, startedAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, endedAt);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startedAt);
  oscillator.stop(endedAt + 0.02);
}

export function getBattleCueProfile(cue: BattleSoundCue): Readonly<CueProfile> {
  return CUE_PROFILES[cue];
}

function getAudioContext(): AudioContext | null {
  if (audioContext) {
    void audioContext.resume().catch(() => undefined);
    return audioContext;
  }

  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }

  audioContext = new AudioContextConstructor();
  void audioContext.resume().catch(() => undefined);
  return audioContext;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
