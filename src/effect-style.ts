export const PARTICLE_KINDS = [
  "sparks",
  "embers",
  "ice",
  "electric",
  "rain",
  "motes",
  "shadow",
  "time",
] as const;
export type ParticleKind = (typeof PARTICLE_KINDS)[number];
/** Optional presentation only. Omitted fields retain the selected family's defaults. */
export interface EffectStyle {
  tint?: string;
  particleColor?: string;
  size?: number;
  frameMs?: number;
  travelMs?: number;
  particle?: ParticleKind;
  particles?: number;
  opacity?: number;
}
export function validateEffectStyle(raw: unknown): EffectStyle {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw Error("Expected ability effect settings.");
  const style = raw as Record<string, unknown>;
  const ranges = {
    size: [0.5, 4],
    frameMs: [30, 250],
    travelMs: [0, 1500],
    particles: [0, 2],
    opacity: [0, 1],
  };
  for (const [name, value] of Object.entries(style)) {
    if (name === "tint" || name === "particleColor") {
      if (typeof value !== "string" || !/^#[a-f0-9]{6}$/i.test(value))
        throw Error("Use a six-digit hex color for ability effects.");
    } else if (name === "particle") {
      if (!PARTICLE_KINDS.includes(value as ParticleKind))
        throw Error("Choose a supported particle motion.");
    } else if (Object.hasOwn(ranges, name)) {
      const [min, max] = ranges[name as keyof typeof ranges];
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        ((name === "frameMs" || name === "travelMs") &&
          !Number.isInteger(value))
      )
        throw Error(
          `Effect ${name} must be ${min}–${max}${name.endsWith("Ms") ? " whole milliseconds" : ""}.`,
        );
    } else throw Error("Unsupported ability effect setting: " + name);
  }
  return { ...style } as EffectStyle;
}
