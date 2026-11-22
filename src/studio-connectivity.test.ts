import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeProject, exportValidationReport } from "./studio-validation";
import {
  activeConnectivityFinding,
  overlayCellIndex,
} from "./studio-connectivity";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  exportLevelProject,
  applyProjectEdits,
  travelProjectHistory,
} from "./studio-project";
function flat(size = 12) {
  const p = editProject(createLevelProject(), 0, [
    { type: "resize", width: size, height: size, terrain: "grass" },
  ]);
  p.tiles.forEach((t) =>
    Object.assign(t, { terrain: "grass", h: 0, blocked: false }),
  );
  p.placements.forEach((a, i) =>
    Object.assign(a, {
      x: i < 4 ? 1 + (i % 2) : 9 + (i % 2),
      z: 1 + Math.floor((i % 4) / 2),
    }),
  );
  return p;
}
const disconnected = (p: ReturnType<typeof flat>) =>
  analyzeProject(p).findings.filter((f) =>
    f.id.startsWith("disconnected-enemies:"),
  );
function river() {
  const p = flat();
  p.tiles.filter((t) => t.x === 6).forEach((t) => (t.terrain = "water"));
  return p;
}
test("one river yields one grouped warning listing all four affected enemies", () => {
  const p = river(),
    r = analyzeProject(p),
    f = disconnected(p)[0];
  assert.equal(disconnected(p).length, 1);
  assert.match(f.title, /4 enemies/);
  assert.deepEqual(
    f.mapOverlay!.affectedActors.map((a) => a.id),
    ["sentinel", "cinder", "wraith", "cantor"],
  );
  assert.equal(r.errors, 0);
  assert(r.canPlaytest);
});
test("overview geometry and barrier edges exactly partition a known rectangular fixture", () => {
  const f = disconnected(river())[0],
    o = f.mapOverlay!;
  assert.equal(o.affectedCells.length, 60);
  assert.equal(o.referenceCells.length, 72);
  assert.equal(o.barriers.length, 12);
  assert(o.affectedCells.every((p) => p.x > 6));
  assert(o.referenceCells.every((p) => p.x < 6));
  assert(o.barriers.every((p) => p.x === 6 && p.reasons.join() === "water"));
  assert.equal(
    new Set(
      [...o.affectedCells, ...o.referenceCells, ...o.barriers].map(
        (p) => p.x + "," + p.z,
      ),
    ).size,
    144,
  );
});
test("independent enemy regions remain separate groups with their own affected lists", () => {
  const p = flat();
  p.tiles
    .filter((t) => t.x === 4 || t.x === 8)
    .forEach((t) => (t.blocked = true));
  Object.assign(p.placements[4], { x: 5, z: 1 });
  Object.assign(p.placements[5], { x: 6, z: 1 });
  const groups = disconnected(p);
  assert.equal(groups.length, 2);
  assert(groups.every((f) => f.mapOverlay!.affectedActors.length === 2));
  assert(groups[0].mapOverlay!.affectedCells.every((p) => p.x > 4 && p.x < 8));
  assert(groups[1].mapOverlay!.affectedCells.every((p) => p.x > 8));
});
test("collision water and elevation reasons are classified without duplicate barrier cells", () => {
  const p = river();
  p.tiles
    .filter((t) => t.x === 6)
    .forEach((t) => Object.assign(t, { blocked: true, h: 2 }));
  const o = disconnected(p)[0].mapOverlay!;
  assert.equal(o.barriers.length, 12);
  assert(
    o.barriers.every((p) => p.reasons.join() === "collision,elevation,water"),
  );
  const index = overlayCellIndex(o);
  assert.equal(index.get("6,4")!.role, "barrier");
  assert.match(
    index.get("6,4")!.description,
    /collision and elevation and water/,
  );
});
test("trapped spawn overlays mark the exact four exits and exclude outside-map coordinates", () => {
  const p = flat();
  Object.assign(p.placements[0], { x: 4, z: 4 });
  for (const [x, z] of [
    [3, 4],
    [5, 4],
    [4, 3],
    [4, 5],
  ])
    p.tiles.find((t) => t.x === x && t.z === z)!.blocked = true;
  const f = analyzeProject(p).findings.find((f) => f.id === "trapped:sera")!,
    o = f.mapOverlay!;
  assert.deepEqual(o.affectedCells, [{ x: 4, z: 4 }]);
  assert.equal(o.barriers.length, 4);
  assert.equal(o.affectedActors.length, 1);
  assert(o.barriers.every((p) => p.x >= 0 && p.z >= 0 && p.x < 12 && p.z < 12));
});
test("empty regions aggregate their cells with no invented affected actors", () => {
  const p = flat();
  p.tiles.find((t) => t.x === 6 && t.z === 6)!.h = 2;
  p.tiles.find((t) => t.x === 7 && t.z === 8)!.h = 2;
  const f = analyzeProject(p).findings.find((f) => f.id === "empty-regions")!,
    o = f.mapOverlay!;
  assert.equal(o.affectedCells.length, 2);
  assert.equal(o.affectedActors.length, 0);
  assert.equal(o.referenceActors.length, 8);
  assert.equal(
    new Set(o.barriers.map((p) => p.x + "," + p.z)).size,
    o.barriers.length,
  );
});
test("same region IDs resolve fresh geometry after edits and clear after a complete repair", () => {
  const p = river(),
    before = disconnected(p)[0],
    q = editProject(p, p.revision, [
      { type: "tile", x: 7, z: 10, blocked: true },
    ]);
  const current = activeConnectivityFinding(
    analyzeProject(q).findings,
    before.id,
  )!;
  assert.equal(
    current.mapOverlay!.affectedCells.length,
    before.mapOverlay!.affectedCells.length - 1,
  );
  assert(current.mapOverlay!.barriers.some((p) => p.x === 7 && p.z === 10));
  const fixed = editProject(q, q.revision, [
    { type: "tile", x: 6, z: 5, terrain: "ice" },
  ]);
  assert.equal(
    activeConnectivityFinding(analyzeProject(fixed).findings, before.id),
    undefined,
  );
});
test("repair and undo recompute groups without persisting overlay data in level source", () => {
  const p = river(),
    source = exportLevelProject(p),
    f = disconnected(p)[0];
  const h = applyProjectEdits({ project: p, past: [], future: [] }, [
    { type: "tile", x: 6, z: 5, terrain: "ice" },
  ]);
  assert.equal(disconnected(h.project).length, 0);
  const undo = travelProjectHistory(h, "undo");
  assert.equal(disconnected(undo.project)[0].id, f.id);
  assert(!Object.hasOwn(p, "mapOverlay"));
  assert.equal(exportLevelProject(p), source);
  assert.deepEqual(
    JSON.parse(exportValidationReport(analyzeProject(p))).findings[0]
      .mapOverlay,
    f.mapOverlay,
  );
});
test("tile and actor storage order cannot change group IDs, geometry or actor order", () => {
  const p = river(),
    q = structuredClone(p);
  q.tiles.reverse();
  q.placements.reverse();
  q.content = undefined;
  assert.deepEqual(disconnected(q), disconnected(p));
  const battle = compileLevelProject(p),
    original = structuredClone(battle);
  analyzeProject(p);
  assert.deepEqual(battle, original);
});
test("maximum maps produce bounded unique overlay cells and independent presentation indexes", () => {
  const p = flat(32);
  p.tiles.filter((t) => t.x === 6).forEach((t) => (t.terrain = "water"));
  const o = disconnected(p)[0].mapOverlay!,
    idx = overlayCellIndex(o);
  assert.equal(idx.size, 1024);
  assert.equal(o.affectedCells.length, 25 * 32);
  assert.equal(o.referenceCells.length, 6 * 32);
  assert.equal(o.barriers.length, 32);
  idx.get("6,5")!.reasons.push("elevation");
  assert.deepEqual(o.barriers.find((p) => p.z === 5)!.reasons, ["water"]);
  assert.equal(
    activeConnectivityFinding(analyzeProject(p).findings, null),
    undefined,
  );
});
