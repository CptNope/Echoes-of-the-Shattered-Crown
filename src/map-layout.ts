/** Legacy encounters omit dimensions and remain 9 × 9. */
export interface MapDimensions {
  width: number;
  height: number;
}
export const MIN_MAP_SIDE = 9;
export const MAX_MAP_SIDE = 32;
export function mapDimensions(source: {
  dimensions?: MapDimensions;
}): MapDimensions {
  return source.dimensions ?? { width: 9, height: 9 };
}
export function validMapDimensions(raw: unknown): raw is MapDimensions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const d = raw as MapDimensions;
  return (
    Object.keys(d).length === 2 &&
    [d.width, d.height].every(
      (n) => Number.isInteger(n) && n >= MIN_MAP_SIDE && n <= MAX_MAP_SIDE,
    )
  );
}
export function adjacentCell(
  x: number,
  z: number,
  key: string,
  d: MapDimensions,
) {
  const delta: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const step = delta[key];
  return step
    ? {
        x: Math.max(0, Math.min(d.width - 1, x + step[0])),
        z: Math.max(0, Math.min(d.height - 1, z + step[1])),
      }
    : null;
}
export function brushCells(
  x: number,
  z: number,
  size: 1 | 3 | 5,
  d: MapDimensions,
) {
  const result: { x: number; z: number }[] = [];
  const radius = (size - 1) / 2;
  for (
    let row = Math.max(0, z - radius);
    row <= Math.min(d.height - 1, z + radius);
    row++
  )
    for (
      let col = Math.max(0, x - radius);
      col <= Math.min(d.width - 1, x + radius);
      col++
    )
      result.push({ x: col, z: row });
  return result;
}
export function mapFrame(d: MapDimensions) {
  return {
    x: (d.width - 9) / 2,
    z: (d.height - 9) / 2,
    scale: Math.max(d.width, d.height) / 9,
  };
}
