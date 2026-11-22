import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  validateLevelProject,
  exportLevelProject,
  parseLevelProject,
  applyProjectEdits,
  travelProjectHistory,
  saveProjectCheckpoint,
  loadProjectCheckpoint,
  LARGE_PROJECT_LIMIT,
} from "./studio-project";
import {
  createBattle,
  validateSave,
  command,
  aiTurn,
  reachable,
  activeUnit,
  tileAt,
} from "./engine";
import {
  mapDimensions,
  adjacentCell,
  brushCells,
  mapFrame,
} from "./map-layout";
import { gameRules } from "./studio-rules";
import { gameContent } from "./studio-content";
function expanded(width = 24, height = 16) {
  const p = createLevelProject();
  return editProject(p, p.revision, [
    { type: "resize", width, height, terrain: "grass" },
  ]);
}
test("legacy projects and saves retain exact 9 by 9 dimensions", () => {
  const p = createLevelProject();
  assert.equal(p.dimensions, undefined);
  assert.deepEqual(mapDimensions(p), { width: 9, height: 9 });
  assert.deepEqual(parseLevelProject(exportLevelProject(p)), p);
  assert(validateSave(createBattle()));
});
test("rectangular and maximum maps preserve every original source cell and placement", () => {
  const old = createLevelProject(),
    p = expanded(32, 32);
  assert.equal(p.tiles.length, 1024);
  for (const t of old.tiles)
    assert.deepEqual(
      p.tiles.find((n) => n.x === t.x && n.z === t.z),
      t,
    );
  assert.deepEqual(p.placements, old.placements);
  assert.deepEqual(p.tiles.at(-1), {
    x: 31,
    z: 31,
    h: 0,
    terrain: "grass",
    blocked: false,
  });
  assert.equal(expanded().tiles.length, 384);
});
test("map validation rejects malformed sizes, sparse rectangles and out of bounds actors", () => {
  const p = expanded();
  for (const dimensions of [
    { width: 8, height: 16 },
    { width: 33, height: 16 },
    { width: 10.5, height: 16 },
    { width: 24, height: 16, extra: true },
  ])
    assert.throws(() => validateLevelProject({ ...p, dimensions }));
  assert.throws(() => validateLevelProject({ ...p, tiles: p.tiles.slice(1) }));
  assert.throws(() => validateLevelProject({ ...p, dimensions: undefined }));
  const bad = structuredClone(p);
  bad.placements[0].x = 24;
  assert.throws(() => validateLevelProject(bad));
});
test("shrinking protects actors and undo restores terrain, dimensions and moved units", () => {
  const p = expanded(),
    q = editProject(p, p.revision, [
      { type: "place", id: "sera", x: 20, z: 12 },
      { type: "tile", x: 23, z: 15, h: 2, terrain: "ice" },
    ]);
  assert.throws(
    () =>
      editProject(q, q.revision, [
        { type: "resize", width: 9, height: 9, terrain: "stone" },
      ]),
    /Move actors/,
  );
  const moved = editProject(q, q.revision, [
    { type: "place", id: "sera", x: 2, z: 5 },
  ]);
  const history = applyProjectEdits({ project: moved, past: [], future: [] }, [
    { type: "resize", width: 9, height: 9, terrain: "stone" },
  ]);
  assert.equal(history.project.tiles.length, 81);
  const undone = travelProjectHistory(history, "undo");
  assert.deepEqual(undone.project.tiles, moved.tiles);
  assert.deepEqual(undone.project.dimensions, moved.dimensions);
  assert.equal(travelProjectHistory(undone, "redo").project.tiles.length, 81);
});
test("brushes clip at edges, apply as one transaction and protect actor tiles", () => {
  const p = expanded(),
    cells = brushCells(23, 15, 5, mapDimensions(p));
  assert.equal(cells.length, 9);
  const q = editProject(
    p,
    p.revision,
    cells.map((c) => ({ type: "tile", ...c, terrain: "water" })),
  );
  assert.equal(q.revision, p.revision + 1);
  assert.equal(
    q.tiles.filter((t) => t.terrain === "water").length,
    p.tiles.filter((t) => t.terrain === "water").length + 9,
  );
  const before = exportLevelProject(p);
  assert.throws(() =>
    editProject(
      p,
      p.revision,
      brushCells(2, 5, 3, mapDimensions(p)).map((c) => ({
        type: "tile",
        ...c,
        blocked: true,
      })),
    ),
  );
  assert.equal(exportLevelProject(p), before);
});
function remoteBattle() {
  let p = expanded();
  p = editProject(p, p.revision, [
    { type: "place", id: "sera", x: 17, z: 12 },
    { type: "place", id: "sentinel", x: 19, z: 12 },
  ]);
  return compileLevelProject(p);
}
test("movement and combat work beyond the legacy boundary and action saves round trip", () => {
  const b = remoteBattle(),
    u = activeUnit(b);
  assert(reachable(b, u).has("18,12"));
  const moved = command(b, { type: "move", x: 18, z: 12 });
  assert.equal(activeUnit(moved).x, 18);
  const hit = command(moved, { type: "skill", skill: "strike", x: 19, z: 12 });
  assert.equal(hit.lastAction?.target?.x, 19);
  assert(validateSave(JSON.parse(JSON.stringify(hit))));
  const bad = structuredClone(hit);
  bad.lastAction!.target!.x = 24;
  assert(!validateSave(bad));
  assert(!validateSave({ ...hit, dimensions: undefined }));
});
test("monster AI navigates and attacks on expanded coordinates deterministically", () => {
  const b = remoteBattle();
  b.active = "sentinel";
  const enemy = activeUnit(b);
  enemy.next = 0;
  b.units.filter((u) => u.id !== enemy.id).forEach((u) => (u.next = 100));
  const result = aiTurn(b);
  assert.notDeepEqual(result, b);
  assert.deepEqual(aiTurn(b), result);
  assert(validateSave(result));
  assert(result.units.find((u) => u.id === "sentinel")!.x > 8);
});
test("expanded map checkpoint and JSON preserve scoped catalogs and content", () => {
  let p = expanded(32, 32);
  p = editProject(p, p.revision, [
    { type: "rules", rules: gameRules() },
    { type: "content", content: gameContent("shrine") },
  ]);
  const text = exportLevelProject(p);
  assert(new TextEncoder().encode(text).length < LARGE_PROJECT_LIMIT);
  assert.deepEqual(parseLevelProject(text), p);
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };
  saveProjectCheckpoint(storage, p, null);
  assert.deepEqual(loadProjectCheckpoint(storage).project, p);
  assert.throws(
    () => parseLevelProject(text + " ".repeat(LARGE_PROJECT_LIMIT)),
    /limit/,
  );
});
test("encounter reload resets map dimensions while undo preserves expanded source", () => {
  const p = expanded(),
    h = applyProjectEdits({ project: p, past: [], future: [] }, [
      { type: "load-encounter", encounter: "bellkeeper" },
    ]);
  assert.equal(h.project.dimensions, undefined);
  assert.equal(h.project.tiles.length, 81);
  assert.deepEqual(travelProjectHistory(h, "undo").project.tiles, p.tiles);
});
test("navigation clamps per axis, framing centers rectangles, tile lookup follows fresh arrays", () => {
  const d = { width: 32, height: 16 };
  assert.deepEqual(adjacentCell(31, 8, "ArrowRight", d), { x: 31, z: 8 });
  assert.deepEqual(adjacentCell(0, 8, "ArrowLeft", d), { x: 0, z: 8 });
  assert.deepEqual(adjacentCell(20, 15, "ArrowDown", d), { x: 20, z: 15 });
  assert.deepEqual(adjacentCell(20, 8, "ArrowUp", d), { x: 20, z: 7 });
  assert.equal(adjacentCell(20, 8, "Enter", d), null);
  assert.deepEqual(mapFrame(d), { x: 11.5, z: 3.5, scale: 32 / 9 });
  const b = compileLevelProject(expanded(32, 32));
  assert.equal(tileAt(b, 31, 31)?.terrain, "grass");
  const clone = structuredClone(b);
  clone.tiles.find((t) => t.x === 31 && t.z === 31)!.terrain = "ice";
  assert.equal(tileAt(clone, 31, 31)?.terrain, "ice");
  assert.equal(tileAt(b, 31, 31)?.terrain, "grass");
});
