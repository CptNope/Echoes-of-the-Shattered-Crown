export const TERRAIN_IDS = ["grass", "stone", "water", "ice"] as const;
export type TerrainId = (typeof TERRAIN_IDS)[number];
export const TERRAIN_PALETTE = {
  grass: [0x7d9161, 0x879b6c, 0x74895d, 0x8b9a6a],
  stone: [0xa1a58d, 0xabad96, 0x999e88],
  water: [0x548e91, 0x5e9899, 0x659da0],
  ice: [0xb8d8cc, 0xb8d8cc, 0xb8d8cc],
};
export interface TerrainMaterial {
  colors: string[];
  painted: boolean;
  pixels: number[];
}
export interface TerrainMaterials {
  version: 1;
  surfaces: Record<TerrainId, TerrainMaterial>;
}
export function gameMaterials(): TerrainMaterials {
  return {
    version: 1,
    surfaces: Object.fromEntries(
      TERRAIN_IDS.map((id) => [
        id,
        {
          colors: TERRAIN_PALETTE[id].map(
            (n) => "#" + n.toString(16).padStart(6, "0"),
          ),
          painted: false,
          pixels: Array(256).fill(0),
        },
      ]),
    ) as Record<TerrainId, TerrainMaterial>,
  };
}
export function validateMaterials(raw: unknown): TerrainMaterials {
  const p = raw as TerrainMaterials;
  if (
    !p ||
    typeof p !== "object" ||
    Array.isArray(p) ||
    p.version !== 1 ||
    Object.keys(p).some((k) => !["version", "surfaces"].includes(k)) ||
    !p.surfaces ||
    Object.keys(p.surfaces).length !== 4
  )
    throw Error("Invalid terrain material source.");
  for (const id of TERRAIN_IDS) {
    const s = p.surfaces[id];
    if (
      !s ||
      Object.keys(s).some(
        (k) => !["colors", "painted", "pixels"].includes(k),
      ) ||
      !Array.isArray(s.colors) ||
      s.colors.length !== TERRAIN_PALETTE[id].length ||
      !s.colors.every(
        (c) => typeof c === "string" && /^#[a-f0-9]{6}$/i.test(c),
      ) ||
      typeof s.painted !== "boolean" ||
      !Array.isArray(s.pixels) ||
      s.pixels.length !== 256 ||
      !s.pixels.every(
        (n) => Number.isInteger(n) && n >= 0 && n < s.colors.length,
      )
    )
      throw Error("Invalid " + id + " material pixels or palette.");
  }
  return structuredClone(p);
}
export function terrainColor(
  id: TerrainId,
  x: number,
  z: number,
  source?: TerrainMaterials,
) {
  const colors =
    source?.surfaces[id].colors ??
    TERRAIN_PALETTE[id].map((n) => "#" + n.toString(16).padStart(6, "0"));
  const index = id === "grass" ? (x * 3 + z) % 4 : (x * 17 + z * 29) % 3;
  return parseInt(colors[index].slice(1), 16);
}
export function terrainRgba(source: TerrainMaterials, id: TerrainId) {
  const s = validateMaterials(source).surfaces[id],
    bytes = new Uint8ClampedArray(256 * 4);
  s.pixels.forEach((n, i) => {
    for (let c = 0; c < 3; c++)
      bytes[i * 4 + c] = parseInt(s.colors[n].slice(1 + c * 2, 3 + c * 2), 16);
    bytes[i * 4 + 3] = 255;
  });
  return bytes;
}
