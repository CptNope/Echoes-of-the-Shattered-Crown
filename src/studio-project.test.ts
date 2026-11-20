import { test } from "node:test";
import assert from "node:assert/strict";
import { command, aiTurn, activeUnit, reachable } from "./engine";
import {
  createLevelProject,
  validateLevelProject,
  parseLevelProject,
  exportLevelProject,
  editProject,
  applyProjectEdits,
  travelProjectHistory,
  compileLevelProject,
  loadProjectCheckpoint,
  saveProjectCheckpoint,
  STUDIO_STORAGE,
  PROJECT_LIMIT,
} from "./studio-project";

test("level project round trip preserves the exact editable source", () => {
  const p = editProject(createLevelProject(), 0, [
    { type: "tile", x: 3, z: 4, terrain: "ice", h: 1 },
    { type: "place", id: "sera", x: 3, z: 4 },
  ]);
  assert.deepEqual(parseLevelProject(exportLevelProject(p)), p);
  assert.equal(p.revision, 1);
});
test("imports reject save/proposal formats, future fields, malformed cells and unsafe sizes", () => {
  const p = createLevelProject();
  for (const bad of [
    { ...p, format: "echoes-studio-design-plan" },
    { ...p, version: 2 },
    { ...p, extension: {} },
    { ...p, seed: -1 },
    { ...p, tiles: [p.tiles[0], ...p.tiles.slice(1).map((t) => p.tiles[0])] },
  ])
    assert.throws(() => validateLevelProject(bad));
  const bad = structuredClone(p) as any;
  bad.tiles[0].terrain = ["grass"];
  assert.throws(() => validateLevelProject(bad));
  assert.throws(() => parseLevelProject("{"));
  assert.throws(
    () => parseLevelProject(" ".repeat(PROJECT_LIMIT + 1)),
    /128 KiB/,
  );
});
test("batches are atomic, reject stale revisions and protect actor occupancy", () => {
  const p = createLevelProject(),
    original = structuredClone(p);
  assert.throws(
    () => editProject(p, 1, [{ type: "tile", x: 3, z: 4, h: 1 }]),
    /Stale/,
  );
  assert.throws(
    () =>
      editProject(p, 0, [
        { type: "tile", x: 3, z: 4, h: 1 },
        { type: "tile", x: 2, z: 5, blocked: true },
      ]),
    /Actors/,
  );
  assert.throws(
    () => editProject(p, 0, [{ type: "place", id: "sera", x: 1, z: 4 }]),
    /Actors/,
  );
  assert.deepEqual(p, original);
  const swap = editProject(p, 0, [
    { type: "place", id: "sera", x: 1, z: 4 },
    { type: "place", id: "ilya", x: 2, z: 5 },
  ]);
  assert.equal(swap.placements.find((a) => a.id === "sera")!.x, 1);
});
test("undo and redo restore source while revisions advance, new edits discard redo", () => {
  const p = createLevelProject(),
    start = { project: p, past: [], future: [] };
  const a = applyProjectEdits(start, [{ type: "tile", x: 3, z: 4, h: 2 }]);
  const b = travelProjectHistory(a, "undo"),
    c = travelProjectHistory(b, "redo");
  assert.deepEqual(b.project.tiles, p.tiles);
  assert.equal(b.project.revision, 2);
  assert.deepEqual(c.project.tiles, a.project.tiles);
  assert.equal(c.project.revision, 3);
  assert.equal(
    applyProjectEdits(b, [{ type: "metadata", name: "New route", seed: 42 }])
      .future.length,
    0,
  );
});
test("compiled preview uses edited movement and placement, never mutates project", () => {
  const p = editProject(createLevelProject(), 0, [
    { type: "tile", x: 3, z: 5, terrain: "water" },
    { type: "place", id: "sera", x: 3, z: 4 },
  ]);
  const before = exportLevelProject(p),
    b = compileLevelProject(p);
  assert.equal(activeUnit(b).x, 3);
  assert.equal(reachable(b, activeUnit(b)).has("3,5"), false);
  const moved = command(b, { type: "move", x: 2, z: 4 });
  assert.notEqual(moved, b);
  assert.equal(moved.units.find((u) => u.id === "sera")!.x, 2);
  assert.equal(exportLevelProject(p), before);
  assert.deepEqual(compileLevelProject(p), compileLevelProject(p));
});
test("preview fail/retry/win paths leave source intact and produce repeatable results", () => {
  const p = createLevelProject(),
    source = exportLevelProject(p);
  // Force isolated combat fixtures to one hit without changing the editable source.
  const win = compileLevelProject(p);
  win.units
    .filter((u) => u.team === "enemy")
    .forEach((u) => {
      u.hp = 0;
    });
  assert.equal(command(win, { type: "end" }).result, "victory");
  const lose = compileLevelProject(p);
  lose.units
    .filter((u) => u.team === "ally")
    .forEach((u) => {
      u.hp = 0;
    });
  assert.equal(command(lose, { type: "end" }).result, "defeat");
  let replay = compileLevelProject(p);
  for (let i = 0; i < 12; i++)
    replay =
      activeUnit(replay).team === "enemy"
        ? aiTurn(replay)
        : command(replay, { type: "end" });
  let retry = compileLevelProject(p);
  for (let i = 0; i < 12; i++)
    retry =
      activeUnit(retry).team === "enemy"
        ? aiTurn(retry)
        : command(retry, { type: "end" });
  assert.deepEqual(retry, replay);
  assert.equal(exportLevelProject(p), source);
});
function memory() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
}
test("checkpoint recovery preserves a valid backup and stale writers cannot overwrite", () => {
  const storage = memory(),
    p = createLevelProject();
  const first = saveProjectCheckpoint(storage, p, null);
  const next = editProject(p, 0, [
    { type: "metadata", name: "Crossing", seed: 1 },
  ]);
  saveProjectCheckpoint(storage, next, first);
  assert.throws(() => saveProjectCheckpoint(storage, p, first), /Another tab/);
  storage.values.set(STUDIO_STORAGE, "broken");
  const recovered = loadProjectCheckpoint(storage);
  assert.deepEqual(recovered.project, p);
  assert.match(recovered.message, /Recovered/);
  saveProjectCheckpoint(storage, next, "broken");
  assert.equal(storage.getItem(STUDIO_STORAGE + ".backup"), first);
});
test("storage failure leaves the prior primary checkpoint recoverable", () => {
  const storage = memory(),
    p = createLevelProject();
  const token = saveProjectCheckpoint(storage, p, null);
  const failing = {
    getItem: storage.getItem,
    setItem: (k: string, v: string) => {
      if (k === STUDIO_STORAGE) throw Error("Quota exceeded");
      storage.setItem(k, v);
    },
  };
  assert.throws(
    () =>
      saveProjectCheckpoint(
        failing,
        editProject(p, 0, [{ type: "metadata", name: "Unsaved", seed: 1 }]),
        token,
      ),
    /Quota/,
  );
  assert.equal(storage.getItem(STUDIO_STORAGE), token);
  assert.deepEqual(loadProjectCheckpoint(storage).project, p);
});
