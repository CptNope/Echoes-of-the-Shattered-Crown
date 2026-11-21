export const PIXEL_ACTORS = [
  "sera",
  "ilya",
  "corin",
  "mae",
  "sentinel",
  "cinder",
  "wraith",
  "cantor",
] as const;
export const PIXEL_STATES = ["idle", "walk", "attack", "cast"] as const;
export type PixelState = (typeof PIXEL_STATES)[number];
export interface PixelClip {
  version: 1;
  width: 16;
  height: 24;
  actorId: string;
  enabled: boolean;
  palette: string[];
  layers: { id: "base" | "detail"; visible: boolean }[];
  frames: { id: string; durationMs: number; cels: number[][] }[];
  pivot: { x: number; y: number };
  clips?: Record<PixelState, string[]>;
}
export function defaultPixelClip(): PixelClip {
  const base = Array<number>(384).fill(0),
    detail = [...base];
  const rect = (
    pixels: number[],
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
  ) => {
    for (let row = y; row < y + h; row++)
      for (let col = x; col < x + w; col++) pixels[row * 16 + col] = color;
  };
  rect(base, 5, 20, 3, 3, 1);
  rect(base, 9, 20, 3, 3, 1);
  rect(base, 4, 10, 8, 11, 2);
  rect(base, 5, 11, 6, 7, 3);
  rect(base, 4, 18, 8, 2, 1);
  rect(base, 4, 3, 8, 7, 1);
  rect(base, 5, 5, 6, 5, 4);
  rect(base, 4, 3, 8, 3, 5);
  rect(base, 3, 11, 2, 7, 5);
  rect(base, 2, 12, 3, 5, 6);
  rect(base, 13, 7, 1, 14, 5);
  rect(base, 12, 17, 3, 1, 6);
  rect(detail, 6, 7, 1, 1, 1);
  rect(detail, 9, 7, 1, 1, 1);
  rect(detail, 7, 3, 2, 2, 6);
  rect(detail, 1, 7, 3, 3, 6);
  rect(detail, 2, 8, 1, 1, 7);
  const second = [...detail];
  second[8 * 16 + 2] = 6;
  second[7 * 16 + 2] = 7;
  return {
    version: 1,
    width: 16,
    height: 24,
    actorId: "sera",
    enabled: true,
    palette: [
      "#00000000",
      "#243b31ff",
      "#426f58ff",
      "#6b9676ff",
      "#d4ad80ff",
      "#acb6a2ff",
      "#b99a51ff",
      "#f5e3a1ff",
    ],
    layers: [
      { id: "base", visible: true },
      { id: "detail", visible: true },
    ],
    frames: [
      { id: "frame-1", durationMs: 240, cels: [base, detail] },
      { id: "frame-2", durationMs: 240, cels: [[...base], second] },
    ],
    pivot: { x: 8, y: 23 },
  };
}
function check(v: unknown, message: string): asserts v {
  if (!v) throw new Error(message);
}
function object(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
const integer = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && Number(v) >= min && Number(v) <= max;
function fields(v: Record<string, unknown>, keys: string[]) {
  check(
    Object.keys(v).every((k) => keys.includes(k)),
    "Unsupported pixel-source field.",
  );
}
export function validatePixelClip(raw: unknown): PixelClip {
  check(object(raw), "Expected pixel clip.");
  fields(raw, [
    "version",
    "width",
    "height",
    "actorId",
    "enabled",
    "palette",
    "layers",
    "frames",
    "pivot",
    "clips",
  ]);
  check(
    raw.version === 1 && raw.width === 16 && raw.height === 24,
    "The pixel pilot requires a 16 x 24 version-1 clip.",
  );
  check(
    typeof raw.actorId === "string" &&
      PIXEL_ACTORS.includes(raw.actorId as (typeof PIXEL_ACTORS)[number]) &&
      typeof raw.enabled === "boolean",
    "Invalid actor binding.",
  );
  check(
    Array.isArray(raw.palette) &&
      raw.palette.length >= 2 &&
      raw.palette.length <= 16 &&
      raw.palette[0] === "#00000000",
    "Palette index zero must be transparent.",
  );
  check(
    raw.palette
      .slice(1)
      .every((c) => typeof c === "string" && /^#[0-9a-f]{6}ff$/i.test(c)),
    "Other palette colors must be opaque RGBA hex.",
  );
  check(
    Array.isArray(raw.layers) && raw.layers.length === 2,
    "Keep the two source layers.",
  );
  const layers = new Set();
  for (const l of raw.layers) {
    check(object(l), "Invalid layer.");
    fields(l, ["id", "visible"]);
    check(
      ["base", "detail"].includes(String(l.id)) &&
        typeof l.id === "string" &&
        !layers.has(l.id) &&
        typeof l.visible === "boolean",
      "Invalid layer identity or visibility.",
    );
    layers.add(l.id);
  }
  check(
    Array.isArray(raw.frames) &&
      raw.frames.length >= 1 &&
      raw.frames.length <= (raw.clips === undefined ? 4 : 16),
    "Use up to four legacy frames or sixteen frames with action clips.",
  );
  const ids = new Set();
  for (const f of raw.frames) {
    check(object(f), "Invalid frame.");
    fields(f, ["id", "durationMs", "cels"]);
    check(
      typeof f.id === "string" &&
        /^[a-zA-Z0-9_-]{1,40}$/.test(f.id) &&
        !ids.has(f.id),
      "Invalid or duplicate frame ID.",
    );
    ids.add(f.id);
    check(
      integer(f.durationMs, 40, 1000),
      "Frame timing must be 40-1,000 whole milliseconds.",
    );
    check(
      Array.isArray(f.cels) &&
        f.cels.length === 2 &&
        f.cels.every(
          (c) =>
            Array.isArray(c) &&
            c.length === 384 &&
            c.every((n) =>
              integer(n, 0, (raw.palette as unknown[]).length - 1),
            ),
        ),
      "Cel pixels must resolve to palette indices.",
    );
  }
  if (raw.clips !== undefined) {
    check(object(raw.clips), "Invalid action clips.");
    fields(raw.clips, [...PIXEL_STATES]);
    const assigned = new Set<string>();
    for (const state of PIXEL_STATES) {
      const refs = raw.clips[state];
      check(
        Array.isArray(refs) && refs.length >= 1 && refs.length <= 4,
        "Each action clip needs 1-4 frames.",
      );
      for (const id of refs) {
        check(
          typeof id === "string" && ids.has(id) && !assigned.has(id),
          "Clip frames must resolve and belong to one action.",
        );
        assigned.add(id);
      }
    }
    check(
      assigned.size === ids.size,
      "Every source frame must belong to an action clip.",
    );
  }
  check(object(raw.pivot), "Invalid pivot.");
  fields(raw.pivot, ["x", "y"]);
  check(
    integer(raw.pivot.x, 0, 16) && integer(raw.pivot.y, 0, 24),
    "Pivot is outside the source canvas.",
  );
  return structuredClone(raw) as unknown as PixelClip;
}
export type PixelEdit =
  | {
      type: "paint";
      frameId: string;
      layerId: string;
      points: { x: number; y: number; color: number }[];
    }
  | { type: "timing"; frameId: string; durationMs: number }
  | { type: "duplicate" | "delete"; frameId: string; state?: PixelState }
  | { type: "move"; frameId: string; direction: -1 | 1; state?: PixelState }
  | { type: "create-clips" }
  | { type: "palette"; index: number; color: string }
  | { type: "visible"; layerId: string; visible: boolean }
  | { type: "swap-layers" }
  | { type: "pivot"; x: number; y: number }
  | { type: "binding"; actorId: string; enabled: boolean };
export function editPixelClip(source: PixelClip, edit: PixelEdit): PixelClip {
  const next = validatePixelClip(source);
  if (edit.type === "paint") {
    const frame = next.frames.find((f) => f.id === edit.frameId),
      layer = next.layers.findIndex((l) => l.id === edit.layerId);
    check(
      frame && layer >= 0 && next.layers[layer].visible,
      "Choose a visible source layer and valid frame.",
    );
    check(
      edit.points.length >= 1 && edit.points.length <= 384,
      "Use a bounded pixel stroke.",
    );
    for (const p of edit.points) {
      check(
        integer(p.x, 0, 15) &&
          integer(p.y, 0, 23) &&
          integer(p.color, 0, next.palette.length - 1),
        "Brush point outside the source or palette.",
      );
      frame.cels[layer][p.y * 16 + p.x] = p.color;
    }
  } else if (edit.type === "timing") {
    const f = next.frames.find((f) => f.id === edit.frameId);
    check(f, "Unknown frame.");
    f.durationMs = edit.durationMs;
  } else if (edit.type === "duplicate") {
    const i = next.frames.findIndex((f) => f.id === edit.frameId);
    const sequence = next.clips ? next.clips[edit.state!] : undefined;
    check(
      !next.clips || sequence?.includes(edit.frameId),
      "Choose the owning action clip.",
    );
    check(
      i >= 0 &&
        next.frames.length < (next.clips ? 16 : 4) &&
        (!sequence || sequence.length < 4),
      "Keep at most four frames per clip.",
    );
    const f = structuredClone(next.frames[i]);
    let n = 1;
    while (next.frames.some((f) => f.id === "frame-" + n)) n++;
    f.id = "frame-" + n;
    next.frames.splice(i + 1, 0, f);
    if (sequence) sequence.splice(sequence.indexOf(edit.frameId) + 1, 0, f.id);
  } else if (edit.type === "delete") {
    const i = next.frames.findIndex((f) => f.id === edit.frameId);
    const sequence = next.clips ? next.clips[edit.state!] : undefined;
    check(
      !next.clips || sequence?.includes(edit.frameId),
      "Choose the owning action clip.",
    );
    check(
      i >= 0 && next.frames.length > 1 && (!sequence || sequence.length > 1),
      "Keep at least one frame per clip.",
    );
    next.frames.splice(i, 1);
    if (sequence) sequence.splice(sequence.indexOf(edit.frameId), 1);
  } else if (edit.type === "move") {
    const sequence = next.clips
      ? next.clips[edit.state!]
      : next.frames.map((f) => f.id);
    check(
      sequence && sequence.includes(edit.frameId),
      "Choose the owning action clip.",
    );
    const at = sequence.indexOf(edit.frameId),
      to = at + edit.direction;
    check(
      at >= 0 &&
        (edit.direction === 1 || edit.direction === -1) &&
        to >= 0 &&
        to < sequence.length,
      "Frame cannot move further.",
    );
    const i = next.frames.findIndex((f) => f.id === sequence[at]),
      j = next.frames.findIndex((f) => f.id === sequence[to]);
    [next.frames[i], next.frames[j]] = [next.frames[j], next.frames[i]];
    if (next.clips) [sequence[at], sequence[to]] = [sequence[to], sequence[at]];
  } else if (edit.type === "create-clips") {
    check(!next.clips, "Action clips already exist.");
    const originals = structuredClone(next.frames),
      clips = {} as Record<PixelState, string[]>;
    clips.idle = originals.map((f) => f.id);
    for (const state of ["walk", "attack", "cast"] as const) {
      clips[state] = [];
      for (const original of originals) {
        const frame = structuredClone(original);
        let n = 1;
        while (next.frames.some((f) => f.id === "frame-" + n)) n++;
        frame.id = "frame-" + n;
        next.frames.push(frame);
        clips[state].push(frame.id);
      }
    }
    next.clips = clips;
  } else if (edit.type === "palette") {
    check(
      integer(edit.index, 1, next.palette.length - 1),
      "Transparent index zero is fixed.",
    );
    next.palette[edit.index] = edit.color;
  } else if (edit.type === "visible") {
    const l = next.layers.find((l) => l.id === edit.layerId);
    check(l, "Unknown layer.");
    l.visible = edit.visible;
  } else if (edit.type === "swap-layers") {
    next.layers.reverse();
    for (const f of next.frames) f.cels.reverse();
  } else if (edit.type === "pivot") {
    next.pivot = { x: edit.x, y: edit.y };
  } else if (edit.type === "binding") {
    next.actorId = edit.actorId;
    next.enabled = edit.enabled;
  } else throw new Error("Unsupported pixel operation.");
  return validatePixelClip(next);
}
export function renderPixelFrame(
  source: PixelClip,
  index: number,
): Uint8ClampedArray<ArrayBuffer> {
  const clip = validatePixelClip(source);
  check(integer(index, 0, clip.frames.length - 1), "Unknown frame index.");
  const bytes = new Uint8ClampedArray(384 * 4),
    frame = clip.frames[index];
  for (let i = 0; i < 384; i++) {
    let color = 0;
    for (let l = 0; l < 2; l++)
      if (clip.layers[l].visible && frame.cels[l][i] !== 0)
        color = frame.cels[l][i];
    const rgba = clip.palette[color];
    for (let channel = 0; channel < 4; channel++)
      bytes[i * 4 + channel] = parseInt(
        rgba.slice(1 + channel * 2, 3 + channel * 2),
        16,
      );
  }
  return bytes;
}
export function compilePixelSheet(source: PixelClip) {
  const clip = validatePixelClip(source),
    width = 16 * clip.frames.length,
    height = 24,
    pixels = new Uint8ClampedArray(width * height * 4);
  clip.frames.forEach((_, frame) => {
    const bytes = renderPixelFrame(clip, frame);
    for (let y = 0; y < 24; y++)
      pixels.set(
        bytes.subarray(y * 16 * 4, (y + 1) * 16 * 4),
        (y * width + frame * 16) * 4,
      );
  });
  return { width, height, pixels };
}
/** Input is validated at the editor/project boundary; selection uses source timing. */
export function pixelFrameAt(
  clip: PixelClip,
  elapsed: number,
  reduced = false,
): number {
  if (reduced) return 0;
  const total = clip.frames.reduce((n, f) => n + f.durationMs, 0);
  let t = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0) % total;
  for (let i = 0; i < clip.frames.length; i++) {
    if (t < clip.frames[i].durationMs) return i;
    t -= clip.frames[i].durationMs;
  }
  return 0;
}
export function pixelSequence(clip: PixelClip, state: PixelState) {
  return clip.clips
    ? clip.clips[state].map((id) => clip.frames.find((f) => f.id === id)!)
    : clip.frames;
}
export function pixelClipDuration(clip: PixelClip, state: PixelState) {
  return pixelSequence(clip, state).reduce((n, f) => n + f.durationMs, 0);
}
export function pixelStateFrame(
  clip: PixelClip,
  state: string,
  elapsed: number,
  reduced = false,
): number {
  if (!clip.clips)
    return state === "downed"
      ? clip.frames.length - 1
      : pixelFrameAt(clip, elapsed, reduced);
  const mapped = PIXEL_STATES.includes(state as PixelState)
    ? (state as PixelState)
    : "idle";
  const sequence = pixelSequence(clip, mapped);
  if (state === "downed")
    return clip.frames.findIndex((f) => f.id === sequence.at(-1)!.id);
  let t = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  if (reduced) return clip.frames.findIndex((f) => f.id === sequence[0].id);
  const duration = pixelClipDuration(clip, mapped);
  if (mapped === "attack" || mapped === "cast") t = Math.min(t, duration - 1);
  else t %= duration;
  for (const frame of sequence) {
    if (t < frame.durationMs)
      return clip.frames.findIndex((f) => f.id === frame.id);
    t -= frame.durationMs;
  }
  return clip.frames.findIndex((f) => f.id === sequence.at(-1)!.id);
}
