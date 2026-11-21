import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { animationStates, clips, type AnimationSheet } from "./animation";
import {
  nativeSource,
  validateNativeSprite,
  nativeFrameRect,
  nativePaint,
  nativeFill,
  nativeBrushPoints,
  nativeFrameAt,
  nativeDuration,
  applyNativePatches,
  renderNativeFrame,
  rgbaHex,
  type NativeSprite,
} from "./studio-native-sprites";
import {
  createLevelProject,
  editProject,
  exportLevelProject,
  parseLevelProject,
  applyProjectEdits,
  travelProjectHistory,
  saveProjectCheckpoint,
  loadProjectCheckpoint,
  STUDIO_STORAGE,
  NATIVE_PROJECT_LIMIT,
} from "./studio-project";
const manifest = JSON.parse(
  readFileSync("public/art/animations/manifest.json", "utf8"),
);
function original(job = "vanguard") {
  const m = manifest.sheets[job];
  return nativeSource(
    job as any,
    "sera",
    m,
    "data:image/webp;base64," +
      readFileSync("public/" + m.file).toString("base64"),
  );
}
function tiny(): NativeSprite {
  return { ...original(), width: 16, height: 32, patches: {} };
}
test("all eight game sheets retain native dimensions, every state and exact embedded original bytes", () => {
  for (const [job, m] of Object.entries(manifest.sheets) as [
    string,
    AnimationSheet,
  ][]) {
    const p = original(job);
    assert.equal(p.width, 887);
    assert.equal(p.height, 1774);
    assert.equal(p.durations.length, 32);
    assert.deepEqual(
      Buffer.from(p.image.split(",")[1], "base64"),
      readFileSync("public/" + m.file),
    );
    let area = 0;
    for (let f = 0; f < 32; f++) {
      const r = nativeFrameRect(p, f);
      area += r.width * r.height;
      assert.ok(r.width === 221 || r.width === 222);
      assert.ok(r.height === 221 || r.height === 222);
    }
    assert.equal(area, p.width * p.height);
    for (const [i, state] of animationStates.entries())
      assert.deepEqual(
        p.durations.slice(i * 4, i * 4 + 4),
        Array(4).fill(clips[state].frameMs),
      );
  }
});
test("native frame extraction preserves every decoded RGBA channel without palette reduction or resampling", async () => {
  const p = original(),
    raw = await sharp(Buffer.from(p.image.split(",")[1], "base64"))
      .ensureAlpha()
      .raw()
      .toBuffer();
  const base = new Uint8ClampedArray(raw);
  for (let f = 0; f < 32; f++) {
    const result = renderNativeFrame(base, p, f);
    for (let y = 0; y < result.height; y++)
      assert.deepEqual(
        Buffer.from(
          result.pixels.subarray(
            y * result.width * 4,
            (y + 1) * result.width * 4,
          ),
        ),
        raw.subarray(
          ((result.y + y) * p.width + result.x) * 4,
          ((result.y + y) * p.width + result.x + result.width) * 4,
        ),
      );
  }
  assert.deepEqual(Buffer.from(applyNativePatches(base, p)), raw);
});
test("native paint is atomic and preserves fractional alpha, exact addresses and unrelated source", () => {
  const p = original(),
    before = JSON.stringify(p),
    r = nativeFrameRect(p, 5);
  const next = nativePaint(p, 5, [
    { x: 0, y: 0, color: "#12345678" },
    { x: r.width - 1, y: r.height - 1, color: "#00000000" },
  ]);
  assert.equal(Object.keys(next.patches).length, 2);
  assert.equal(next.patches[r.y * p.width + r.x], "#12345678");
  assert.equal(JSON.stringify(p), before);
  const line = nativeBrushPoints(
    p,
    0,
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    1,
    "#aabbccff",
  );
  assert.equal(line.length, 101);
  assert.ok(line.every((point, index) => point.x === index && point.y === 0));
  const edge = nativeBrushPoints(
    p,
    0,
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    5,
    "#aabbccff",
  );
  assert.equal(edge.length, 9);
  const frame = renderNativeFrame(
    new Uint8ClampedArray(p.width * p.height * 4),
    next,
    5,
  );
  assert.deepEqual([...frame.pixels.slice(0, 4)], [18, 52, 86, 120]);
  assert.throws(() =>
    nativePaint(p, 5, [
      { x: 0, y: 0, color: "#ffffffff" },
      { x: r.width, y: 0, color: "#ffffffff" },
    ]),
  );
  assert.equal(JSON.stringify(p), before);
});
test("native fill compares exact RGBA and stays inside the selected frame with no diagonal or row wrapping", () => {
  const p = tiny(),
    base = new Uint8ClampedArray(16 * 32 * 4);
  for (const i of [0, 1, 16, 17, 34, 4]) base.set([1, 2, 3, 128], i * 4);
  const next = nativeFill(p, 0, base, 0, 0, "#aabbccdd");
  assert.deepEqual(
    Object.keys(next.patches)
      .map(Number)
      .sort((a, b) => a - b),
    [0, 1, 16, 17],
  );
  assert.equal(next.patches["34"], undefined);
  assert.equal(next.patches["4"], undefined);
  assert.equal(nativeFill(p, 0, base, 0, 0, "#01020380"), p);
  assert.equal(rgbaHex(applyNativePatches(base, next), 0), "#aabbccdd");
});
test("native validation rejects malformed asset, state timing, registration and sparse pixel addresses", () => {
  const p = original();
  for (const change of [
    { version: 2 },
    { job: "unknown" },
    { job: ["vanguard"] },
    { patches: new Date() },
    { actorId: "nobody" },
    { width: 4096 },
    { height: 0 },
    { image: "https://example.com/a.webp" },
    { sha256: "bad" },
    { ground: Array(32).fill(NaN) },
    { idleHeight: 0 },
    { durations: Array(32).fill(39) },
    { patches: { "-1": "#ffffffff" } },
    { patches: { "1.1": "#ffffffff" } },
    { patches: { [p.width * p.height]: "#ffffffff" } },
    { patches: { "0": "#ffffff" } },
    { extension: {} },
  ])
    assert.throws(() => validateNativeSprite({ ...p, ...change }));
});
test("all native state timings loop or clamp at exact boundaries and reduced motion uses stable poses", () => {
  const p = original();
  p.durations[0] = 100;
  p.durations[1] = 200;
  assert.equal(nativeFrameAt(p, "idle", 99), 0);
  assert.equal(nativeFrameAt(p, "idle", 100), 1);
  assert.equal(nativeFrameAt(p, "idle", nativeDuration(p, "idle")), 0);
  for (const state of animationStates) {
    const start = clips[state].row * 4;
    assert.equal(
      nativeFrameAt(p, state, 1000000, true),
      start +
        (state === "downed" ? 3 : state === "idle" || state === "walk" ? 0 : 1),
    );
    if (!clips[state].loop)
      assert.equal(nativeFrameAt(p, state, 1000000), start + 3);
  }
});
test("native projects export a self-contained original plus edits and share project history without changing combat", () => {
  const base = createLevelProject(),
    p = nativePaint(original(), 0, [{ x: 10, y: 12, color: "#fedcba80" }]);
  const state = applyProjectEdits({ project: base, past: [], future: [] }, [
    { type: "native-sprite", sprite: p },
  ]);
  const text = exportLevelProject(state.project);
  assert.ok(
    Buffer.byteLength(text) > 128 * 1024 &&
      Buffer.byteLength(text) < NATIVE_PROJECT_LIMIT,
  );
  assert.deepEqual(parseLevelProject(text), state.project);
  assert.equal(
    travelProjectHistory(state, "undo").project.nativeSprite,
    undefined,
  );
  assert.deepEqual(state.project.tiles, base.tiles);
  assert.deepEqual(state.project.placements, base.placements);
  assert.deepEqual(parseLevelProject(exportLevelProject(base)), base);
});
test("native checkpoints deduplicate original bytes, preserve backup, reject stale writers and survive failed commits", () => {
  const map = new Map<string, string>(),
    storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
    };
  const p = editProject(createLevelProject(), 0, [
    { type: "native-sprite", sprite: original() },
  ]);
  const first = saveProjectCheckpoint(storage, p, null),
    changed = editProject(p, 1, [
      {
        type: "native-sprite",
        sprite: nativePaint(p.nativeSprite!, 0, [
          { x: 0, y: 0, color: "#ff0000ff" },
        ]),
      },
    ]);
  assert.ok(first.length < 20000);
  assert.deepEqual(loadProjectCheckpoint(storage).project, p);
  const second = saveProjectCheckpoint(storage, changed, first);
  assert.equal([...map.keys()].filter((k) => k.includes(".native.")).length, 1);
  assert.deepEqual(loadProjectCheckpoint(storage).project, changed);
  assert.throws(() => saveProjectCheckpoint(storage, p, first), /Another tab/);
  const quota = {
    ...storage,
    setItem: (k: string, v: string) => {
      if (k === STUDIO_STORAGE) throw Error("quota");
      storage.setItem(k, v);
    },
  };
  assert.throws(() => saveProjectCheckpoint(quota, changed, second), /quota/);
  assert.deepEqual(loadProjectCheckpoint(storage).project, changed);
  map.set(STUDIO_STORAGE, "bad");
  assert.ok(loadProjectCheckpoint(storage).project);
  map.delete(STUDIO_STORAGE + ".native." + p.nativeSprite!.sha256);
  assert.equal(loadProjectCheckpoint(storage).project, null);
});
