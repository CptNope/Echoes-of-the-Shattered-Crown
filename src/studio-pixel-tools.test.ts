import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultPixelClip,
  editPixelClip,
  renderPixelFrame,
  type PixelEdit,
} from "./studio-pixels";
import {
  createLevelProject,
  editProject,
  exportLevelProject,
  parseLevelProject,
} from "./studio-project";
const target = { frameId: "frame-1", layerId: "detail" };
function blank() {
  const p = defaultPixelClip();
  p.frames[0].cels[1].fill(0);
  return p;
}
test("fill respects four-connected source regions, diagonal gaps and row edges", () => {
  const p = blank(),
    c = p.frames[0].cels[1];
  c[0] = c[1] = c[16] = c[17] = 2;
  c[34] = c[15] = c[32] = 2;
  const before = structuredClone(p);
  const next = editPixelClip(p, {
    type: "fill",
    ...target,
    x: 0,
    y: 0,
    color: 7,
  });
  assert.deepEqual(
    [0, 1, 16, 17].map((i) => next.frames[0].cels[1][i]),
    [7, 7, 7, 7],
  );
  assert.equal(next.frames[0].cels[1][34], 2);
  assert.equal(next.frames[0].cels[1][15], 2);
  // 32 is adjacent vertically to 16 and must fill, but 15 never wraps to 16.
  assert.equal(next.frames[0].cels[1][32], 7);
  assert.deepEqual(p, before);
  assert.deepEqual(next.frames[0].cels[0], p.frames[0].cels[0]);
  assert.deepEqual(next.frames[1], p.frames[1]);
  assert.deepEqual(
    editPixelClip(next, { type: "fill", ...target, x: 0, y: 0, color: 7 }),
    next,
  );
});
test("fill transparency and erase operate on source even beneath an opaque layer", () => {
  const p = blank();
  p.frames[0].cels[0].fill(1);
  const next = editPixelClip(p, {
    type: "fill",
    ...target,
    x: 0,
    y: 0,
    color: 7,
  });
  assert.ok(next.frames[0].cels[1].every((c) => c === 7));
  assert.deepEqual(
    [...renderPixelFrame(next, 0).slice(0, 4)],
    [245, 227, 161, 255],
  );
  const erased = editPixelClip(next, {
    type: "fill",
    ...target,
    x: 0,
    y: 0,
    color: 0,
  });
  assert.deepEqual(
    [...renderPixelFrame(erased, 0).slice(0, 4)],
    [36, 59, 49, 255],
  );
});
test("flips are reversible and preserve registration, timing, clips and other cels", () => {
  const p = editPixelClip(blank(), { type: "create-clips" });
  p.frames[0].cels[1][0] = 7;
  p.frames[0].cels[1][383] = 2;
  for (const operation of ["flip-x", "flip-y"] as const) {
    const flipped = editPixelClip(p, {
      type: "transform",
      ...target,
      operation,
    });
    assert.equal(
      flipped.frames[0].cels[1][operation === "flip-x" ? 15 : 368],
      7,
    );
    assert.deepEqual(
      editPixelClip(flipped, { type: "transform", ...target, operation }),
      p,
    );
    assert.deepEqual(flipped.clips, p.clips);
    assert.deepEqual(flipped.pivot, p.pivot);
    assert.deepEqual(flipped.frames.slice(1), p.frames.slice(1));
  }
});
test("one-pixel nudges crop at every edge without wrapping and fill vacated cells with transparency", () => {
  const p = blank();
  p.frames[0].cels[1][0] = 7;
  p.frames[0].cels[1][383] = 2;
  for (const [operation, index, value] of [
    ["left", 382, 2],
    ["right", 1, 7],
    ["up", 367, 2],
    ["down", 16, 7],
  ] as const) {
    const c = editPixelClip(p, { type: "transform", ...target, operation })
      .frames[0].cels[1];
    assert.equal(c[index], value);
    assert.equal(c.filter(Boolean).length, 1);
    assert.equal(c[0], 0);
    assert.equal(c[383], 0);
  }
});
test("cel paste maps colors rather than stale indices, replaces transparent pixels and rejects missing colors atomically", () => {
  const p = blank();
  p.frames[0].cels[1][0] = 7;
  const colors = p.frames[0].cels[1].map((i) => p.palette[i]);
  const source = editPixelClip(p, { type: "swap-layers" });
  [source.palette[6], source.palette[7]] = [
    source.palette[7],
    source.palette[6],
  ];
  const result = editPixelClip(source, {
    type: "paste-cel",
    frameId: "frame-2",
    layerId: "base",
    colors,
  });
  assert.equal(result.frames[1].cels[1][0], 6);
  assert.equal(result.frames[1].cels[1][1], 0);
  assert.deepEqual(result.frames[1].cels[0], source.frames[1].cels[0]);
  const before = structuredClone(source);
  colors[100] = "#abcdefFF";
  assert.throws(
    () => editPixelClip(source, { type: "paste-cel", ...target, colors }),
    /missing/,
  );
  assert.deepEqual(source, before);
});
test("tools reject malformed or hidden-layer writes and edited action sources survive project export", () => {
  const p = blank(),
    before = structuredClone(p);
  const hidden = editPixelClip(p, {
    type: "visible",
    layerId: "detail",
    visible: false,
  });
  const operations: PixelEdit[] = [
    { type: "fill", ...target, x: 0, y: 0, color: 7 },
    { type: "transform", ...target, operation: "left" },
    { type: "paste-cel", ...target, colors: Array(384).fill("#00000000") },
  ];
  for (const operation of operations)
    assert.throws(() => editPixelClip(hidden, operation), /visible/);
  for (const operation of [
    { type: "fill", ...target, x: 16, y: 0, color: 7 },
    { type: "fill", ...target, x: 0, y: 0, color: 99 },
    { type: "transform", ...target, operation: "rotate" },
    { type: "paste-cel", ...target, colors: [] },
    { type: "paste-cel", ...target, colors: Array(384).fill(null) },
    { type: "transform", ...target, frameId: "missing", operation: "left" },
  ])
    assert.throws(() => editPixelClip(p, operation as PixelEdit));
  assert.deepEqual(p, before);
  const converted = editPixelClip(p, { type: "create-clips" });
  const painted = editPixelClip(converted, {
    type: "fill",
    ...target,
    x: 0,
    y: 0,
    color: 7,
  });
  const project = editProject(createLevelProject(), 0, [
    {
      type: "pixels",
      clip: painted,
    },
  ]);
  assert.deepEqual(parseLevelProject(exportLevelProject(project)), project);
});
