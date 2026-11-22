export interface GameAudio {
  version: 1;
  enabled: boolean;
  notes: number[];
  stepMs: number;
  noteMs: number;
  bassMs: number;
  waveform: "triangle" | "sine" | "square";
  volume: number;
  leadGain: number;
  bassGain: number;
  skillHz: number;
  moveHz: number;
  feedbackMs: number;
  feedbackGain: number;
}
export function gameAudio(): GameAudio {
  return {
    version: 1,
    enabled: true,
    notes: [
      220, 261.63, 329.63, 293.66, 196, 246.94, 293.66, 261.63, 174.61, 220,
      261.63, 329.63, 196, 246.94, 293.66, 392,
    ],
    stepMs: 650,
    noteMs: 1800,
    bassMs: 3500,
    waveform: "triangle",
    volume: 0.12,
    leadGain: 0.45,
    bassGain: 0.8,
    skillHz: 440,
    moveHz: 280,
    feedbackMs: 150,
    feedbackGain: 0.5,
  };
}
export function validateGameAudio(raw: unknown): GameAudio {
  const p = raw as GameAudio,
    base = gameAudio();
  if (
    !p ||
    typeof p !== "object" ||
    Array.isArray(p) ||
    Object.keys(p).some((k) => !Object.keys(base).includes(k)) ||
    p.version !== 1 ||
    typeof p.enabled !== "boolean" ||
    !["triangle", "sine", "square"].includes(p.waveform) ||
    !Array.isArray(p.notes) ||
    p.notes.length !== 16 ||
    !p.notes.every((n) => Number.isFinite(n) && n >= 40 && n <= 2000)
  )
    throw Error("Invalid existing game audio source.");
  for (const [key, min, max] of [
    ["stepMs", 100, 2000],
    ["noteMs", 40, 5000],
    ["bassMs", 40, 6000],
    ["volume", 0, 1],
    ["leadGain", 0, 1],
    ["bassGain", 0, 1],
    ["skillHz", 40, 2000],
    ["moveHz", 40, 2000],
    ["feedbackMs", 40, 1000],
    ["feedbackGain", 0, 1],
  ] as const)
    if (!Number.isFinite(p[key]) || p[key] < min || p[key] > max)
      throw Error("Invalid game audio " + key + ".");
  return structuredClone(p);
}
