import type { Battle } from "./engine";

export const SFX_RATE = 22050;
export const SOUND_EVENTS = ["hit", "miss", "heal", "buff"] as const;
export type SoundEvent = (typeof SOUND_EVENTS)[number];
export interface SoundLayer {
  id: string;
  waveform: "sine" | "triangle" | "square" | "noise";
  frequency: number;
  endFrequency: number;
  durationMs: number;
  delayMs: number;
  attackMs: number;
  gain: number;
  enabled: boolean;
}
export interface SoundCue {
  event: SoundEvent;
  seed: number;
  layers: SoundLayer[];
}
export interface SoundBank {
  version: 1;
  gain: number;
  cues: SoundCue[];
}
const layer = (
  id: string,
  frequency: number,
  endFrequency: number,
  durationMs: number,
  waveform: SoundLayer["waveform"] = "sine",
): SoundLayer => ({
  id,
  frequency,
  endFrequency,
  durationMs,
  waveform,
  delayMs: 0,
  attackMs: 5,
  gain: 0.45,
  enabled: true,
});
export function defaultSoundBank(): SoundBank {
  return {
    version: 1,
    gain: 0.65,
    cues: [
      {
        event: "hit",
        seed: 17,
        layers: [
          layer("body", 180, 55, 180, "triangle"),
          { ...layer("contact", 900, 350, 75, "noise"), gain: 0.2 },
        ],
      },
      {
        event: "miss",
        seed: 23,
        layers: [{ ...layer("air", 700, 180, 160, "noise"), gain: 0.18 }],
      },
      {
        event: "heal",
        seed: 31,
        layers: [
          layer("rise", 440, 880, 400),
          { ...layer("chime", 660, 1320, 350), delayMs: 90, gain: 0.25 },
        ],
      },
      {
        event: "buff",
        seed: 41,
        layers: [
          layer("oath", 220, 330, 300, "triangle"),
          { ...layer("overtone", 440, 660, 300), delayMs: 70, gain: 0.2 },
        ],
      },
    ],
  };
}
function obj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function check(v: unknown, message: string): asserts v {
  if (!v) throw new Error(message);
}
const range = (v: unknown, a: number, b: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= a && v <= b;
function fields(v: Record<string, unknown>, names: string[]) {
  check(
    Object.keys(v).every((k) => names.includes(k)),
    "Unsupported sound-source field.",
  );
}
export function validateSoundBank(raw: unknown): SoundBank {
  check(obj(raw), "Expected sound source.");
  fields(raw, ["version", "gain", "cues"]);
  check(
    raw.version === 1 && range(raw.gain, 0, 1),
    "Invalid sound version or master gain.",
  );
  check(
    Array.isArray(raw.cues) && raw.cues.length === 4,
    "Keep all four combat sound bindings.",
  );
  const events = new Set();
  for (const c of raw.cues) {
    check(obj(c), "Invalid sound cue.");
    fields(c, ["event", "seed", "layers"]);
    check(
      typeof c.event === "string" &&
        SOUND_EVENTS.includes(c.event as SoundEvent) &&
        !events.has(c.event),
      "Invalid or duplicate sound binding.",
    );
    events.add(c.event);
    check(
      range(c.seed, 0, 0xffffffff) && Number.isInteger(c.seed),
      "Invalid sound noise seed.",
    );
    check(
      Array.isArray(c.layers) && c.layers.length >= 1 && c.layers.length <= 4,
      "Each cue needs 1–4 layers.",
    );
    const ids = new Set();
    for (const l of c.layers) {
      check(obj(l), "Invalid sound layer.");
      fields(l, [
        "id",
        "waveform",
        "frequency",
        "endFrequency",
        "durationMs",
        "delayMs",
        "attackMs",
        "gain",
        "enabled",
      ]);
      check(
        typeof l.id === "string" &&
          /^[a-zA-Z0-9_-]{1,40}$/.test(l.id) &&
          !ids.has(l.id),
        "Invalid or duplicate layer identity.",
      );
      ids.add(l.id);
      check(
        ["sine", "triangle", "square", "noise"].includes(String(l.waveform)) &&
          typeof l.waveform === "string",
        "Invalid sound waveform.",
      );
      check(
        range(l.frequency, 40, 2400) && range(l.endFrequency, 40, 2400),
        "Pitch must be 40–2,400 Hz.",
      );
      check(
        range(l.durationMs, 20, 1200) &&
          range(l.delayMs, 0, 400) &&
          range(l.attackMs, 1, 100) &&
          l.attackMs < l.durationMs,
        "Invalid sound timing.",
      );
      check(
        range(l.gain, 0, 0.8) && typeof l.enabled === "boolean",
        "Invalid layer gain or mute state.",
      );
    }
  }
  return structuredClone(raw) as unknown as SoundBank;
}
export function cueFor(bank: SoundBank, event: SoundEvent): SoundCue {
  return bank.cues.find((c) => c.event === event)!;
}
/** One deterministic PCM renderer feeds both Web Audio playback and WAV export. */
export function renderSound(bank: SoundBank, event: SoundEvent): Float32Array {
  const b = validateSoundBank(bank),
    cue = cueFor(b, event);
  const length = Math.ceil(
    (Math.max(...cue.layers.map((l) => l.delayMs + l.durationMs)) * SFX_RATE) /
      1000,
  );
  const mix = new Float32Array(length);
  for (const l of cue.layers) {
    if (!l.enabled) continue;
    // Layer-local generator: muting/reordering another layer does not alter its noise.
    let seed = cue.seed;
    for (const char of l.id)
      seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
    const start = Math.round((l.delayMs * SFX_RATE) / 1000),
      count = Math.min(
        length - start,
        Math.round((l.durationMs * SFX_RATE) / 1000),
      );
    const duration = l.durationMs / 1000,
      attack = l.attackMs / 1000;
    for (let i = 0; i < count && start + i < length; i++) {
      const t = i / SFX_RATE,
        progress = i / Math.max(1, count - 1);
      const phase =
        l.frequency * t +
        ((l.endFrequency - l.frequency) * t * t) / (2 * duration);
      let value: number;
      if (l.waveform === "noise") {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        value = (seed / 0x100000000) * 2 - 1;
      } else if (l.waveform === "sine") value = Math.sin(2 * Math.PI * phase);
      else if (l.waveform === "triangle")
        value = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * phase));
      else value = Math.sin(2 * Math.PI * phase) >= 0 ? 1 : -1;
      const envelope =
        t < attack
          ? t / attack
          : Math.pow(Math.max(0, (1 - progress) / (1 - attack / duration)), 2);
      mix[start + i] += value * envelope * l.gain;
    }
  }
  for (let i = 0; i < mix.length; i++)
    mix[i] = Math.tanh(mix[i]) * b.gain * 0.6;
  return mix;
}
export function soundWav(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2),
    view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i);
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SFX_RATE, true);
  view.setUint32(28, SFX_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(s * (s < 0 ? 32768 : 32767)), true);
  }
  return bytes;
}
export function resolvedSoundEvents(
  before: Battle["lastAction"],
  after: Battle["lastAction"],
): SoundEvent[] {
  if (!after) return [];
  const identity = (c: NonNullable<Battle["lastAction"]>) =>
    JSON.stringify([c.unit, c.skill, c.turn, c.target]);
  if (before && identity(before) === identity(after)) return [];
  return SOUND_EVENTS.filter((event) =>
    after.outcomes?.some((o) => o.result === event),
  );
}
export class StudioSfxPlayer {
  private ctx: AudioContext | null = null;
  private voices: AudioBufferSourceNode[] = [];
  private disposed = false;
  async unlock() {
    if (this.disposed) throw new Error("Sound player closed.");
    this.ctx ??= new AudioContext();
    await this.ctx.resume();
    if (this.disposed || this.ctx.state !== "running")
      throw new Error("Audio is suspended. Enable sound again.");
  }
  play(bank: SoundBank, event: SoundEvent): boolean {
    if (this.disposed || this.ctx?.state !== "running") return false;
    const pcm = renderSound(bank, event),
      ctx = this.ctx,
      buffer = ctx.createBuffer(1, pcm.length, SFX_RATE);
    buffer.getChannelData(0).set(pcm);
    if (this.voices.length >= 4) {
      const oldest = this.voices.shift()!;
      oldest.onended = null;
      oldest.stop();
      oldest.disconnect();
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      this.voices = this.voices.filter((v) => v !== source);
      source.disconnect();
    };
    this.voices.push(source);
    source.start();
    return true;
  }
  stop() {
    for (const v of this.voices) {
      v.onended = null;
      v.stop();
      v.disconnect();
    }
    this.voices = [];
  }
  dispose() {
    this.disposed = true;
    this.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
