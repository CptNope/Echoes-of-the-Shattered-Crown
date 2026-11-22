import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeProject,
  analyzeProjectText,
  exportValidationReport,
} from "./studio-validation";
import {
  createLevelProject,
  editProject,
  exportLevelProject,
  compileLevelProject,
  validateLevelProject,
} from "./studio-project";
import { gameContent } from "./studio-content";
import { gameRules } from "./studio-rules";
function flat() {
  const p = editProject(createLevelProject(), 0, [
    { type: "resize", width: 12, height: 12, terrain: "grass" },
  ]);
  p.tiles.forEach((t) =>
    Object.assign(t, { terrain: "grass", blocked: false, h: 0 }),
  );
  p.placements.forEach((a, i) =>
    Object.assign(a, {
      x: i < 4 ? 1 + (i % 2) : 9 + (i % 2),
      z: 1 + Math.floor((i % 4) / 2),
    }),
  );
  return p;
}
const ids = (p: unknown) => analyzeProject(p).findings.map((f) => f.id);
test("all four shipped sources pass schema export and compiled-battle checks", () => {
  for (const id of ["shrine", "causeway", "redoubt", "bellkeeper"] as const) {
    const r = analyzeProject(createLevelProject(id));
    assert.equal(r.errors, 0);
    assert(r.canPlaytest);
    assert(r.checks.includes("compiled-battle"));
  }
  assert.equal(
    analyzeProject(createLevelProject("bellkeeper")).findings.length,
    0,
  );
});
test("water barriers flag each separated enemy as a warning, not a completion verdict", () => {
  const p = flat();
  p.tiles.filter((t) => t.x === 6).forEach((t) => (t.terrain = "water"));
  const r = analyzeProject(p);
  assert.equal(r.errors, 0);
  assert(r.canPlaytest);
  assert.equal(
    r.findings.filter((f) => f.id.startsWith("unreachable:")).length,
    4,
  );
  const f = r.findings.find((f) => f.id === "unreachable:sentinel")!;
  assert.deepEqual(f.target, { area: "map", x: 9, z: 1 });
  assert.match(f.fix, /ranged/);
});
test("ground traversal respects elevation steps and frozen crossings", () => {
  const p = flat();
  p.tiles.filter((t) => t.x === 6).forEach((t) => (t.h = 2));
  assert(ids(p).includes("unreachable:sentinel"));
  p.tiles
    .filter((t) => t.x === 6)
    .forEach((t) => {
      t.h = 1;
      t.terrain = "ice";
    });
  assert(!ids(p).includes("unreachable:sentinel"));
  p.tiles.filter((t) => t.x === 6).forEach((t) => (t.blocked = true));
  assert(ids(p).includes("unreachable:sentinel"));
});
test("trapped spawns point to the actor tile and clear when a ground exit opens", () => {
  const p = flat();
  Object.assign(p.placements[0], { x: 4, z: 4 });
  for (const [x, z] of [
    [3, 4],
    [5, 4],
    [4, 3],
    [4, 5],
  ])
    p.tiles.find((t) => t.x === x && t.z === z)!.blocked = true;
  const r = analyzeProject(p);
  assert.deepEqual(r.findings.find((f) => f.id === "trapped:sera")!.target, {
    area: "map",
    x: 4,
    z: 4,
  });
  p.tiles.find((t) => t.x === 3 && t.z === 4)!.blocked = false;
  assert(!ids(p).includes("trapped:sera"));
});
test("unoccupied disconnected islands aggregate with a concrete inspection coordinate", () => {
  const p = flat();
  p.tiles.find((t) => t.x === 6 && t.z === 6)!.h = 2;
  const f = analyzeProject(p).findings.find((f) => f.id === "empty-regions")!;
  assert.deepEqual(f.target, { area: "map", x: 6, z: 6 });
  assert.match(f.detail, /1 open tiles/);
  assert.equal(analyzeProject(p).errors, 0);
});
test("energy and direct-offense warnings use the actual scoped availability list", () => {
  const p = flat();
  p.content = gameContent();
  p.content.actors.forEach((a) => (a.maxMp = 0));
  p.rules = gameRules();
  p.rules.skills.strike.cost = 1;
  p.rules.skills.rally.cost = 1;
  const r = analyzeProject(p);
  assert.equal(r.errors, 0);
  assert(
    r.findings.some(
      (f) =>
        f.id === "no-offense:sera" &&
        f.target.area === "content" &&
        f.target.id === "sera",
    ),
  );
  assert.deepEqual(r.findings.find((f) => f.id === "energy:strike")!.target, {
    area: "rules",
    section: "skills",
    id: "strike",
  });
});
test("inactive learned skills and unusable first-clear rewards target their records", () => {
  const p = flat();
  p.content = gameContent();
  const sera = p.content.actors.find((a) => a.id === "sera")!;
  sera.secondary = "lifebinder";
  sera.learned = ["veil"];
  p.rules = gameRules();
  p.rules.gear.crownseal.jobs = [];
  const r = analyzeProject(p);
  assert.equal(r.errors, 0);
  assert(r.findings.some((f) => f.id === "inactive-learning:sera"));
  assert.deepEqual(
    r.findings.find((f) => f.id === "unusable-reward:bellkeeper")!.target,
    { area: "rules", section: "gear", id: "crownseal" },
  );
});
test("broken actor, gear, dialogue and contract references produce addressed errors", () => {
  const p = flat() as any;
  p.content = gameContent();
  p.content.actors[0].job = "missing-job";
  p.content.actors[0].learned = ["missing-skill"];
  p.content.actors[0].equipment = {
    weapon: "missing-item",
    armor: null,
    relic: null,
  };
  p.content.dialogue.shrine[0].speaker = "missing-npc";
  p.content.contracts.shrine.requires = "missing-contract";
  p.content.contracts.shrine.firstClearRelic = "missing-reward";
  const r = analyzeProject(p);
  for (const prefix of [
    "job-reference:",
    "skill-reference:",
    "equipment:",
    "speaker:",
    "contract-reference:",
    "reward-reference:",
  ])
    assert(
      r.findings.some((f) => f.id.startsWith(prefix)),
      prefix,
    );
  assert(r.errors >= 6);
  assert(!r.canPlaytest);
  assert(r.findings.every((f) => f.fix && f.path));
});
test("invalid placements, sparse maps and malformed source are blocking", () => {
  const p = flat();
  p.placements[1].x = p.placements[0].x;
  p.placements[1].z = p.placements[0].z;
  const r = analyzeProject(p);
  assert(r.findings.some((f) => f.id === "placement:placements.ilya"));
  assert(!r.canPlaytest);
  assert(!analyzeProject({ ...flat(), tiles: [] }).canPlaytest);
  for (const raw of [null, [], { dimensions: { width: 99, height: 9 } }, "bad"])
    assert(analyzeProject(raw).errors > 0);
});
test("valid but unsaveable source blocks preview until export budget is reduced", () => {
  const p = createLevelProject();
  p.content = gameContent();
  for (const id of ["shrine", "causeway", "redoubt", "bellkeeper"] as const)
    p.content.dialogue[id] = Array.from({ length: 32 }, (_, i) => ({
      id: "line-" + i,
      speaker: "narrator",
      text: "x".repeat(2000),
    }));
  validateLevelProject(p);
  const r = analyzeProject(p);
  assert(r.findings.some((f) => f.id === "export-budget"));
  assert(!r.canPlaytest);
  p.content.dialogue.shrine = [];
  p.content.dialogue.causeway = [];
  p.content.dialogue.redoubt = [];
  assert(analyzeProject(p).canPlaytest);
});
test("import diagnostics enforce parser limits and never certify rejected or future sources", () => {
  for (const text of [
    "{",
    " ".repeat(128 * 1024 + 1),
    JSON.stringify({ ...createLevelProject(), future: true }),
  ]) {
    const r = analyzeProjectText(text);
    assert(!r.canPlaytest);
    assert.equal(r.findings[0].id, "import-invalid");
  }
  const p = flat();
  p.tiles.filter((t) => t.x === 6).forEach((t) => (t.terrain = "water"));
  const r = analyzeProjectText(exportLevelProject(p));
  assert.equal(r.errors, 0);
  assert(r.warnings > 0);
  assert(r.canPlaytest);
});
test("reports are deterministic, source-safe and round trip as standalone diagnostics", () => {
  const p = flat();
  p.tiles.filter((t) => t.x === 6).forEach((t) => (t.terrain = "water"));
  const before = structuredClone(p),
    battle = compileLevelProject(p);
  const a = analyzeProject(p),
    b = analyzeProject(p);
  assert.deepEqual(a, b);
  assert.deepEqual(p, before);
  assert.deepEqual(compileLevelProject(p), battle);
  assert.deepEqual(JSON.parse(exportValidationReport(a)), a);
  assert.equal(new Set(a.findings.map((f) => f.id)).size, a.findings.length);
});
