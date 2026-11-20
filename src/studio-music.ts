export const MUSIC_RATE = 22050;
export interface MusicPattern {
  version: 1;
  tempo: number;
  gain: number;
  gate: number;
  waveform: "sine" | "triangle" | "square";
  enabled: boolean;
  notes: (number | null)[];
}
export function defaultMusicPattern(): MusicPattern {
  return {
    version: 1,
    tempo: 100,
    gain: 0.45,
    gate: 0.7,
    waveform: "triangle",
    enabled: true,
    notes: [
      57,
      null,
      60,
      null,
      64,
      null,
      62,
      null,
      55,
      null,
      59,
      null,
      62,
      60,
      59,
      null,
    ],
  };
}
function check(v: unknown, message: string): asserts v {
  if (!v) throw new Error(message);
}
export function validateMusicPattern(raw: unknown): MusicPattern {
  check(
    raw && typeof raw === "object" && !Array.isArray(raw),
    "Expected music pattern.",
  );
  const p = raw as Record<string, unknown>;
  check(
    Object.keys(p).every((k) =>
      [
        "version",
        "tempo",
        "gain",
        "gate",
        "waveform",
        "enabled",
        "notes",
      ].includes(k),
    ),
    "Unsupported music source field.",
  );
  const range = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  check(
    p.version === 1 && range(p.tempo, 60, 180),
    "Tempo must be 60–180 BPM.",
  );
  check(
    range(p.gain, 0, 1) && range(p.gate, 0.2, 0.95),
    "Invalid music gain or gate.",
  );
  check(
    typeof p.waveform === "string" &&
      ["sine", "triangle", "square"].includes(p.waveform) &&
      typeof p.enabled === "boolean",
    "Invalid music instrument or preview binding.",
  );
  check(
    Array.isArray(p.notes) &&
      p.notes.length === 16 &&
      p.notes.every(
        (n) => n === null || (range(n, 48, 84) && Number.isInteger(n)),
      ),
    "Use sixteen notes/rests, MIDI 48–84.",
  );
  return structuredClone(p) as unknown as MusicPattern;
}
export function noteName(midi: number | null): string {
  return midi === null
    ? "Rest"
    : ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][
        midi % 12
      ] +
        (Math.floor(midi / 12) - 1);
}
/** A single four-beat bar. Every note has a silent release and every rest is zero. */
export function renderMusic(pattern: MusicPattern): Float32Array {
  const p = validateMusicPattern(pattern),
    stepSeconds = 60 / p.tempo / 4;
  const pcm = new Float32Array(Math.round(stepSeconds * 16 * MUSIC_RATE));
  for (let step = 0; step < 16; step++) {
    const note = p.notes[step];
    if (note === null) continue;
    const start = Math.round(step * stepSeconds * MUSIC_RATE),
      end = Math.round((step + 1) * stepSeconds * MUSIC_RATE);
    const count = Math.floor((end - start) * p.gate),
      frequency = 440 * Math.pow(2, (note - 69) / 12);
    for (let i = 0; i < count; i++) {
      const progress = i / Math.max(1, count - 1),
        t = i / MUSIC_RATE;
      const phase = Math.sin(2 * Math.PI * frequency * t);
      const wave =
        p.waveform === "sine"
          ? phase
          : p.waveform === "triangle"
            ? (2 / Math.PI) * Math.asin(phase)
            : phase >= 0
              ? 1
              : -1;
      const envelope =
        Math.min(1, i / (MUSIC_RATE * 0.005)) * Math.pow(1 - progress, 1.5);
      pcm[start + i] = wave * envelope * p.gain * 0.3;
    }
  }
  return pcm;
}
