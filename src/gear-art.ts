import source from "./gear-art-source.json";
export const GEAR_ICON_SIZE = 64;
export interface GearIconSource {
  name: string;
  palette: string[];
  pixels: number[];
}
export const gearIconSources = source as Record<string, GearIconSource>;
export interface GearArtwork {
  source: string;
  patches: [number, string][];
}
export interface IllustratedItem {
  id: string;
  icon?: GearArtwork;
  slot?: string;
  effect?: string;
}
export function validateGearArtwork(raw: unknown): GearArtwork {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw Error("Expected gear artwork.");
  const v = raw as GearArtwork;
  if (
    Object.keys(v).some((k) => !["source", "patches"].includes(k)) ||
    typeof v.source !== "string" ||
    !Object.hasOwn(gearIconSources, v.source) ||
    !Array.isArray(v.patches) ||
    v.patches.length > 4096
  )
    throw Error(
      "Choose a shipped gear artwork source and at most 4096 pixel edits.",
    );
  const seen = new Set<number>();
  for (const p of v.patches) {
    if (
      !Array.isArray(p) ||
      p.length !== 2 ||
      !Number.isInteger(p[0]) ||
      p[0] < 0 ||
      p[0] >= 4096 ||
      seen.has(p[0]) ||
      typeof p[1] !== "string" ||
      !/^#[\da-f]{8}$/i.test(p[1])
    )
      throw Error("Invalid or duplicate gear pixel.");
    seen.add(p[0]);
  }
  return structuredClone(v);
}
export function gearArtwork(item: IllustratedItem): GearArtwork {
  if (item.icon) return item.icon;
  const fallback =
    item.slot === "armor"
      ? "leather"
      : item.slot === "relic"
        ? "watchcharm"
        : item.slot === "weapon"
          ? "ironblade"
          : item.effect === "revive"
            ? "phoenix-seed"
            : item.effect === "cleanse"
              ? "cleansing-salts"
              : item.effect === "energy"
                ? "ether-draught"
                : "field-tonic";
  return {
    source: Object.hasOwn(gearIconSources, item.id) ? item.id : fallback,
    patches: [],
  };
}
export function gearPixels(art: GearArtwork): Uint8ClampedArray<ArrayBuffer> {
  const s = gearIconSources[art.source];
  const out = new Uint8ClampedArray(4096 * 4);
  function write(i: number, c: string) {
    for (let ch = 0; ch < 4; ch++)
      out[i * 4 + ch] = parseInt(c.slice(1 + ch * 2, 3 + ch * 2), 16);
  }
  s.pixels.forEach((n, i) => write(i, s.palette[n]));
  art.patches.forEach(([i, c]) => write(i, c));
  return out;
}
export function paintGearPixel(
  art: GearArtwork,
  index: number,
  color: string | null,
): GearArtwork {
  const patches = new Map(art.patches);
  if (color === null) patches.delete(index);
  else patches.set(index, color);
  return validateGearArtwork({
    source: art.source,
    patches: [...patches].sort((a, b) => a[0] - b[0]),
  });
}
