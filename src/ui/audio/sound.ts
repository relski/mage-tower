// Sound effects, made with the Web Audio API: each one is a few short tones, so there are no
// sound files yet (real ones can replace `playSound`'s insides later, and nothing else changes).
// Everything here can fail quietly: audio may be missing, blocked or muted, and the game must
// still run. Browsers only start audio after a tap, so `unlockAudio` runs at the start of every click.

export type SoundName =
  | "draw" // a safe card is drawn
  | "unstable" // an Unstable card is drawn (still safe)
  | "backfire" // the second Unstable card
  | "step" // one step of the cast animation (the caller raises the pitch with each step)
  | "hit" // the enemy takes the damage
  | "clear" // the stage is cleared
  | "lost" // the run is lost
  | "tap" // a light tap: tabs, selecting a slot, popup buttons
  | "coin" // buying or selling
  | "place"; // a card is placed, or a reward is taken

type Tone = {
  freq: number, // Hz at the start
  endFreq?: number, // Hz at the end: the pitch glides there
  durationMs: number,
  wave: OscillatorType,
  volume: number, // 0 to 1
  delayMs?: number, // from the start of the sound
};

const SOUNDS: Record<SoundName, readonly Tone[]> = {
  draw: [{ freq: 440, endFreq: 660, durationMs: 80, wave: "triangle", volume: 0.3 }],
  unstable: [
    { freq: 330, endFreq: 240, durationMs: 140, wave: "square", volume: 0.14 },
    { freq: 247, endFreq: 175, durationMs: 180, wave: "square", volume: 0.14, delayMs: 110 },
  ],
  backfire: [
    { freq: 260, endFreq: 55, durationMs: 450, wave: "sawtooth", volume: 0.32 },
    { freq: 90, endFreq: 40, durationMs: 500, wave: "square", volume: 0.2 },
  ],
  step: [{ freq: 523, durationMs: 110, wave: "triangle", volume: 0.25 }],
  hit: [
    { freq: 160, endFreq: 50, durationMs: 200, wave: "sine", volume: 0.55 },
    { freq: 120, endFreq: 60, durationMs: 120, wave: "square", volume: 0.15 },
  ],
  clear: [
    { freq: 523, durationMs: 140, wave: "triangle", volume: 0.28, delayMs: 0 },
    { freq: 659, durationMs: 140, wave: "triangle", volume: 0.28, delayMs: 90 },
    { freq: 784, durationMs: 140, wave: "triangle", volume: 0.28, delayMs: 180 },
    { freq: 1047, durationMs: 320, wave: "triangle", volume: 0.28, delayMs: 270 },
  ],
  lost: [
    { freq: 392, durationMs: 240, wave: "sawtooth", volume: 0.2, delayMs: 0 },
    { freq: 330, durationMs: 240, wave: "sawtooth", volume: 0.2, delayMs: 160 },
    { freq: 262, durationMs: 240, wave: "sawtooth", volume: 0.2, delayMs: 320 },
    { freq: 196, durationMs: 480, wave: "sawtooth", volume: 0.2, delayMs: 480 },
  ],
  tap: [{ freq: 700, durationMs: 45, wave: "sine", volume: 0.14 }],
  coin: [
    { freq: 988, durationMs: 60, wave: "square", volume: 0.12 },
    { freq: 1319, durationMs: 160, wave: "square", volume: 0.12, delayMs: 60 },
  ],
  place: [{ freq: 300, endFreq: 190, durationMs: 100, wave: "triangle", volume: 0.35 }],
};

// the player's choice to turn sound off, kept under its own key so abandoning a run keeps it
export const MUTED_KEY = "mage-tower:muted";

const MASTER_VOLUME = 0.4;

function readMuted(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

let muted = readMuted();
let context: AudioContext | null = null;
let master: GainNode | null = null;

export function isMuted(): boolean {
  return muted;
}

// switches sound on or off and remembers the choice; returns whether sound is now muted
export function toggleMuted(): boolean {
  muted = !muted;

  try {
    localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
  } catch {
    // storage is missing or blocked: the choice only lasts until the page is closed
  }

  return muted;
}

// Creates the audio context on first use and wakes it up if the browser put it to sleep.
// Call it from a tap; before the first tap, sounds are silently skipped.
export function unlockAudio(): void {
  try {
    if (context === null) {
      if (typeof AudioContext === "undefined") {
        return;
      }

      context = new AudioContext();
      master = context.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(context.destination);
    }

    if (context.state === "suspended") {
      void context.resume().catch(() => {
        // the browser refused: sounds stay silent until a later tap works
      });
    }
  } catch {
    context = null;
    master = null;
  }
}

function playTone(
  audio: AudioContext,
  output: AudioNode,
  tone: Tone,
  startAt: number,
  rate: number,
): void {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const endAt = startAt + tone.durationMs / 1000;

  oscillator.type = tone.wave;
  oscillator.frequency.setValueAtTime(tone.freq * rate, startAt);

  if (tone.endFreq !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(tone.endFreq * rate, endAt);
  }

  // a quick fade in and a fade out, so the tone does not click
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(tone.volume, startAt + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(output);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
}

// Plays a sound. `rate` multiplies its pitch (1 is normal, 2 is an octave higher).
export function playSound(name: SoundName, rate = 1): void {
  if (muted || context === null || master === null) {
    return;
  }

  try {
    const startAt = context.currentTime;

    for (const tone of SOUNDS[name]) {
      playTone(context, master, tone, startAt + (tone.delayMs ?? 0) / 1000, rate);
    }
  } catch {
    // a sound that cannot play is skipped
  }
}
