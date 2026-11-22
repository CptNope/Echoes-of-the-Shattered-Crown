import {
  animationStates,
  clips,
  type AnimationState,
  type AnimationSheet,
} from "./animation";
import { jobs, type JobId } from "./data";
import { PIXEL_ACTORS } from "./studio-pixels";
export interface NativeSprite {
  version: 1;
  job: JobId;
  actorId: string;
  enabled: boolean;
  image: string;
  sha256: string;
  width: number;
  height: number;
  ground: number[];
  idleHeight: number;
  durations: number[];
  patches: Record<string, string>;
}
function check(value: unknown, message: string): asserts value {
  if (!value) throw Error(message);
}
function fields(raw: object, allowed: string[]) {
  check(
    Object.keys(raw).every((k) => allowed.includes(k)),
    "Unsupported native sprite field.",
  );
}
export function validateNativeSprite(value: unknown): NativeSprite {
  check(
    value && typeof value === "object" && !Array.isArray(value),
    "Expected native sprite source.",
  );
  const p = value as NativeSprite;
  fields(p, [
    "version",
    "job",
    "actorId",
    "enabled",
    "image",
    "sha256",
    "width",
    "height",
    "ground",
    "idleHeight",
    "durations",
    "patches",
  ]);
  check(
    p.version === 1 &&
      typeof p.job === "string" &&
      typeof p.actorId === "string" &&
      Object.hasOwn(jobs, p.job) &&
      (PIXEL_ACTORS.includes(p.actorId as any) ||
        /^enemy-[a-z][a-z0-9-]{0,55}$/.test(p.actorId)) &&
      typeof p.enabled === "boolean",
    "Invalid native sprite identity.",
  );
  check(
    Number.isInteger(p.width) &&
      Number.isInteger(p.height) &&
      p.width >= 4 &&
      p.width <= 1024 &&
      p.height >= 8 &&
      p.height <= 2048,
    "Invalid native sheet dimensions.",
  );
  check(
    typeof p.image === "string" &&
      p.image.length <= 3 * 1024 * 1024 &&
      /^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.image),
    "Native source requires an embedded WebP image.",
  );
  check(
    typeof p.sha256 === "string" && /^[a-f0-9]{64}$/.test(p.sha256),
    "Invalid original asset digest.",
  );
  check(
    Array.isArray(p.ground) &&
      p.ground.length === 32 &&
      p.ground.every((n) => Number.isFinite(n) && n >= 0 && n <= 1.1) &&
      Number.isFinite(p.idleHeight) &&
      p.idleHeight > 0 &&
      p.idleHeight <= 1.1,
    "Invalid native registration.",
  );
  check(
    Array.isArray(p.durations) &&
      p.durations.length === 32 &&
      p.durations.every((n) => Number.isInteger(n) && n >= 40 && n <= 1000),
    "Native frames require 40-1000 ms timing.",
  );
  check(
    p.patches &&
      typeof p.patches === "object" &&
      !Array.isArray(p.patches) &&
      (Object.getPrototypeOf(p.patches) === Object.prototype ||
        Object.getPrototypeOf(p.patches) === null),
    "Invalid native pixel edits.",
  );
  const entries = Object.entries(p.patches);
  check(entries.length <= p.width * p.height, "Too many native pixel edits.");
  for (const [key, color] of entries)
    check(
      /^(0|[1-9][0-9]*)$/.test(key) &&
        Number(key) < p.width * p.height &&
        typeof color === "string" &&
        /^#[a-f0-9]{8}$/i.test(color),
      "Invalid native pixel address or RGBA.",
    );
  return {
    ...p,
    ground: [...p.ground],
    durations: [...p.durations],
    patches: { ...p.patches },
  };
}
export function nativeFrameRect(
  p: Pick<NativeSprite, "width" | "height">,
  frame: number,
) {
  check(
    Number.isInteger(frame) && frame >= 0 && frame < 32,
    "Unknown native frame.",
  );
  const col = frame % 4,
    row = Math.floor(frame / 4),
    x = Math.round((col * p.width) / 4),
    y = Math.round((row * p.height) / 8);
  return {
    x,
    y,
    width: Math.round(((col + 1) * p.width) / 4) - x,
    height: Math.round(((row + 1) * p.height) / 8) - y,
  };
}
export function nativePixelIndex(
  p: NativeSprite,
  frame: number,
  x: number,
  y: number,
) {
  const rect = nativeFrameRect(p, frame);
  check(
    Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      y >= 0 &&
      x < rect.width &&
      y < rect.height,
    "Pixel outside selected native frame.",
  );
  return (rect.y + y) * p.width + rect.x + x;
}
export function nativePaint(
  p: NativeSprite,
  frame: number,
  points: { x: number; y: number; color: string }[],
): NativeSprite {
  check(
    points.length > 0 && points.length <= p.width * p.height,
    "Invalid native stroke.",
  );
  const patches = { ...p.patches };
  for (const point of points) {
    check(/^#[a-f0-9]{8}$/i.test(point.color), "Use RGBA hex.");
    patches[nativePixelIndex(p, frame, point.x, point.y)] =
      point.color.toLowerCase();
  }
  return { ...p, patches };
}
export function nativeDuration(p: NativeSprite, state: AnimationState) {
  return p.durations
    .slice(clips[state].row * 4, clips[state].row * 4 + 4)
    .reduce((a, b) => a + b, 0);
}
export function nativeFrameAt(
  p: NativeSprite,
  state: AnimationState,
  elapsed: number,
  reduced = false,
) {
  const start = clips[state].row * 4;
  if (reduced)
    return (
      start +
      (state === "downed" ? 3 : state === "walk" || state === "idle" ? 0 : 1)
    );
  const duration = nativeDuration(p, state);
  let t = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  t = clips[state].loop ? t % duration : Math.min(t, duration - 1);
  for (let i = 0; i < 4; i++) {
    if (t < p.durations[start + i]) return start + i;
    t -= p.durations[start + i];
  }
  return start + 3;
}
export function nativeSource(
  job: JobId,
  actorId: string,
  metadata: AnimationSheet,
  image: string,
): NativeSprite {
  return validateNativeSprite({
    version: 1,
    job,
    actorId,
    enabled: true,
    image,
    sha256: metadata.sha256,
    width: metadata.width,
    height: metadata.height,
    ground: metadata.ground,
    idleHeight: metadata.idleHeight,
    durations: animationStates.flatMap((state) =>
      Array(4).fill(clips[state].frameMs),
    ),
    patches: {},
  });
}
export function rgbaHex(data: ArrayLike<number>, at: number) {
  return (
    "#" +
    Array.from({ length: 4 }, (_, i) =>
      data[at + i].toString(16).padStart(2, "0"),
    ).join("")
  );
}
export function applyNativePatches(data: Uint8ClampedArray, p: NativeSprite) {
  check(
    data.length === p.width * p.height * 4,
    "Native image dimensions do not match source.",
  );
  const out = new Uint8ClampedArray(data);
  for (const [key, color] of Object.entries(p.patches))
    for (let c = 0; c < 4; c++)
      out[Number(key) * 4 + c] = parseInt(
        color.slice(1 + c * 2, 3 + c * 2),
        16,
      );
  return out;
}
export function nativeFill(
  p: NativeSprite,
  frame: number,
  rgba: Uint8ClampedArray,
  x: number,
  y: number,
  color: string,
): NativeSprite {
  check(
    rgba.length === p.width * p.height * 4,
    "Native fill requires the complete rendered sheet.",
  );
  const rect = nativeFrameRect(p, frame),
    start = nativePixelIndex(p, frame, x, y),
    target = rgbaHex(rgba, start * 4);
  if (target.toLowerCase() === color.toLowerCase()) return p;
  const pending = [{ x, y }],
    seen = new Set<number>(),
    points: { x: number; y: number; color: string }[] = [];
  while (pending.length) {
    const point = pending.pop()!,
      i = point.y * rect.width + point.x;
    if (seen.has(i)) continue;
    seen.add(i);
    if (
      rgbaHex(rgba, nativePixelIndex(p, frame, point.x, point.y) * 4) !== target
    )
      continue;
    points.push({ ...point, color });
    if (point.x > 0) pending.push({ x: point.x - 1, y: point.y });
    if (point.x + 1 < rect.width) pending.push({ x: point.x + 1, y: point.y });
    if (point.y > 0) pending.push({ x: point.x, y: point.y - 1 });
    if (point.y + 1 < rect.height) pending.push({ x: point.x, y: point.y + 1 });
  }
  return nativePaint(p, frame, points);
}
export function renderNativeFrame(
  base: Uint8ClampedArray,
  p: NativeSprite,
  frame: number,
) {
  const rect = nativeFrameRect(p, frame),
    out = new Uint8ClampedArray(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++)
    for (let x = 0; x < rect.width; x++) {
      const at = (rect.y + y) * p.width + rect.x + x,
        to = (y * rect.width + x) * 4,
        color = p.patches[at];
      if (color)
        for (let c = 0; c < 4; c++)
          out[to + c] = parseInt(color.slice(1 + c * 2, 3 + c * 2), 16);
      else out.set(base.subarray(at * 4, at * 4 + 4), to);
    }
  return { pixels: out, ...rect };
}
export function nativeBrushPoints(
  p: NativeSprite,
  frame: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number,
  color: string,
) {
  nativePixelIndex(p, frame, from.x, from.y);
  nativePixelIndex(p, frame, to.x, to.y);
  check([1, 3, 5].includes(size), "Use a supported native brush size.");
  const rect = nativeFrameRect(p, frame),
    steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)),
    seen = new Set<number>(),
    points: { x: number; y: number; color: string }[] = [];
  for (let step = 0; step <= steps; step++) {
    const x = steps
        ? Math.round(from.x + ((to.x - from.x) * step) / steps)
        : to.x,
      y = steps ? Math.round(from.y + ((to.y - from.y) * step) / steps) : to.y;
    for (let dy = -Math.floor(size / 2); dy <= Math.floor(size / 2); dy++)
      for (let dx = -Math.floor(size / 2); dx <= Math.floor(size / 2); dx++) {
        const px = x + dx,
          py = y + dy,
          index = py * rect.width + px;
        if (
          px >= 0 &&
          py >= 0 &&
          px < rect.width &&
          py < rect.height &&
          !seen.has(index)
        ) {
          seen.add(index);
          points.push({ x: px, y: py, color });
        }
      }
  }
  return points;
}
