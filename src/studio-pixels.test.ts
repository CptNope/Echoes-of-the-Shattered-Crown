import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultPixelClip,
  validatePixelClip,
  editPixelClip,
  renderPixelFrame,
  compilePixelSheet,
  pixelFrameAt,
  PIXEL_ACTORS,
} from "./studio-pixels";
import {
  createLevelProject,
  applyProjectEdits,
  travelProjectHistory,
  exportLevelProject,
  parseLevelProject,
  compileLevelProject,
  editProject,
} from "./studio-project";

test("pixel source validates fixed canvas/layer bounds and rejects lossy unknown fields", () => {
  const p = defaultPixelClip();
  assert.deepEqual(validatePixelClip(p), p);
  assert.deepEqual(
    new Set(PIXEL_ACTORS),
    new Set(createLevelProject().placements.map((p) => p.id)),
  );
  for (const mutate of [
    (p: any) => (p.width = 32),
    (p: any) => (p.palette[0] = "#ffffffff"),
    (p: any) => (p.palette[1] = "#11223344"),
    (p: any) => (p.frames[0].cels[0][0] = 99),
    (p: any) => p.frames[0].cels[0].pop(),
    (p: any) => (p.frames[0].durationMs = 0),
    (p: any) => (p.frames[1].id = p.frames[0].id),
    (p: any) => (p.layers[1].id = "base"),
    (p: any) => (p.actorId = "new-actor"),
    (p: any) => (p.extension = {}),
  ]) {
    const bad = structuredClone(p);
    mutate(bad);
    assert.throws(() => validatePixelClip(bad));
  }
});
test("multi-point brushes are atomic and erasing reveals the underlying layer", () => {
  const p = defaultPixelClip(),
    before = structuredClone(p);
  assert.throws(() =>
    editPixelClip(p, {
      type: "paint",
      frameId: "frame-1",
      layerId: "detail",
      points: [
        { x: 0, y: 0, color: 6 },
        { x: 16, y: 0, color: 6 },
      ],
    }),
  );
  assert.deepEqual(p, before);
  const painted = editPixelClip(p, {
    type: "paint",
    frameId: "frame-1",
    layerId: "detail",
    points: [
      { x: 0, y: 0, color: 7 },
      { x: 6, y: 7, color: 0 },
    ],
  });
  const bytes = renderPixelFrame(painted, 0);
  assert.deepEqual([...bytes.slice(0, 4)], [245, 227, 161, 255]);
  assert.deepEqual(
    [...bytes.slice((7 * 16 + 6) * 4, (7 * 16 + 6) * 4 + 4)],
    [212, 173, 128, 255],
  );
  assert.deepEqual(p, before);
});
test("layer reorder retains stable cel identity, visibility and palette edits preserve sources", () => {
  const p = defaultPixelClip(),
    swapped = editPixelClip(p, { type: "swap-layers" });
  assert.equal(swapped.layers[0].id, "detail");
  assert.deepEqual(swapped.frames[0].cels[0], p.frames[0].cels[1]);
  const hidden = editPixelClip(p, {
    type: "visible",
    layerId: "detail",
    visible: false,
  });
  assert.notDeepEqual(renderPixelFrame(hidden, 0), renderPixelFrame(p, 0));
  assert.throws(
    () =>
      editPixelClip(hidden, {
        type: "paint",
        frameId: "frame-1",
        layerId: "detail",
        points: [{ x: 0, y: 0, color: 1 }],
      }),
    /visible/,
  );
  const recolored = editPixelClip(p, {
    type: "palette",
    index: 6,
    color: "#ff0000ff",
  });
  assert.deepEqual(recolored.frames, p.frames);
  assert.notDeepEqual(renderPixelFrame(recolored, 0), renderPixelFrame(p, 0));
  assert.throws(() =>
    editPixelClip(p, { type: "palette", index: 0, color: "#ff0000ff" }),
  );
});
test("frame duplication is independent, order retains identity and timing wraps at exact boundaries", () => {
  let p = editPixelClip(defaultPixelClip(), {
    type: "duplicate",
    frameId: "frame-1",
  });
  assert.equal(p.frames[1].id, "frame-3");
  p.frames[1].cels[0][0] = 7;
  assert.equal(p.frames[0].cels[0][0], 0);
  p = editPixelClip(p, { type: "move", frameId: "frame-3", direction: 1 });
  assert.equal(p.frames[2].id, "frame-3");
  p = editPixelClip(p, { type: "delete", frameId: "frame-3" });
  p = editPixelClip(p, { type: "timing", frameId: "frame-1", durationMs: 100 });
  p = editPixelClip(p, { type: "timing", frameId: "frame-2", durationMs: 200 });
  assert.equal(pixelFrameAt(p, 99), 0);
  assert.equal(pixelFrameAt(p, 100), 1);
  assert.equal(pixelFrameAt(p, 299), 1);
  assert.equal(pixelFrameAt(p, 300), 0);
  assert.equal(pixelFrameAt(p, 150, true), 0);
  assert.equal(pixelFrameAt(p, -4), 0);
  p = editPixelClip(p, { type: "delete", frameId: "frame-2" });
  assert.throws(() => editPixelClip(p, { type: "delete", frameId: "frame-1" }));
});
test("packed sheet contains every exact composited RGBA pixel at the declared frame offset", () => {
  const p = defaultPixelClip(),
    sheet = compilePixelSheet(p);
  assert.equal(sheet.width, 32);
  assert.equal(sheet.height, 24);
  for (let frame = 0; frame < 2; frame++) {
    const rgba = renderPixelFrame(p, frame);
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 16; x++)
        assert.deepEqual(
          sheet.pixels.slice(
            (y * 32 + frame * 16 + x) * 4,
            (y * 32 + frame * 16 + x) * 4 + 4,
          ),
          rgba.slice((y * 16 + x) * 4, (y * 16 + x) * 4 + 4),
        );
  }
  assert(sheet.pixels.some((v, i) => i % 4 === 3 && v === 0));
  assert(sheet.pixels.some((v, i) => i % 4 === 3 && v === 255));
});
test("project history and JSON preserve layered cels, timing and registration atomically", () => {
  const p = createLevelProject(),
    clip = defaultPixelClip();
  clip.pivot = { x: 7, y: 22 };
  const state = applyProjectEdits({ project: p, past: [], future: [] }, [
    { type: "pixels", clip },
  ]);
  const imported = parseLevelProject(exportLevelProject(state.project));
  assert.deepEqual(imported.pixels, clip);
  assert.equal(p.pixels, undefined);
  assert.deepEqual(
    compilePixelSheet(imported.pixels!),
    compilePixelSheet(clip),
  );
  assert.equal(travelProjectHistory(state, "undo").project.pixels, undefined);
  assert.deepEqual(
    travelProjectHistory(travelProjectHistory(state, "undo"), "redo").project
      .pixels,
    clip,
  );
  assert.throws(() =>
    editProject(p, 0, [
      { type: "tile", x: 3, z: 4, h: 1 },
      { type: "pixels", clip: { ...clip, width: 32 } as any },
    ]),
  );
  assert.equal(p.revision, 0);
});
test("pixel compilation and playback selection do not affect battle state or RNG", () => {
  const p = createLevelProject(),
    battle = compileLevelProject(p),
    before = structuredClone(battle),
    clip = defaultPixelClip();
  const withArt = { ...p, pixels: clip };
  assert.deepEqual(compileLevelProject(withArt), battle);
  for (let t = 0; t < 1000; t += 17) {
    renderPixelFrame(clip, pixelFrameAt(clip, t));
  }
  assert.deepEqual(battle, before);
});
test("actor binding and pivot edits are bounded and four frames remain independently editable", () => {
  let p = editPixelClip(defaultPixelClip(), {
    type: "binding",
    actorId: "ilya",
    enabled: false,
  });
  p = editPixelClip(p, { type: "pivot", x: 16, y: 24 });
  assert.equal(p.actorId, "ilya");
  assert.equal(p.enabled, false);
  assert.throws(() => editPixelClip(p, { type: "pivot", x: 17, y: 24 }));
  p = editPixelClip(p, { type: "duplicate", frameId: "frame-1" });
  p = editPixelClip(p, { type: "duplicate", frameId: "frame-1" });
  assert.equal(p.frames.length, 4);
  assert.throws(() =>
    editPixelClip(p, { type: "duplicate", frameId: "frame-1" }),
  );
});
