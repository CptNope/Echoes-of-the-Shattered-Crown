import { readFileSync } from "node:fs";
import { gameAudio } from "./game-audio";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  exportLevelProject,
  parseLevelProject,
  applyProjectEdits,
  travelProjectHistory,
} from "./studio-project";
import { analyzeProject } from "./studio-validation";
import {
  command,
  reachable,
  preview,
  validateSave,
  activeUnit,
  aiTurn,
} from "./engine";
import { previewExpedition } from "./studio-authoring";
import { returnToCamp, validateExpedition } from "./campaign";
const mission = () =>
  editProject(createLevelProject(), 0, [{ type: "greybank" }]);
test("Greybank supplies a clean complete eight-actor mission with distinct approaches", () => {
  const p = mission(),
    b = compileLevelProject(p);
  assert.deepEqual(p.dimensions, { width: 18, height: 14 });
  assert.equal(p.tiles.length, 252);
  assert.equal(p.content!.actors.length, 8);
  assert.equal(p.content!.enemyTemplates!.length, 4);
  assert.equal(p.content!.dialogue.causeway.length, 4);
  assert.equal(analyzeProject(p).errors, 0);
  assert.equal(analyzeProject(p).warnings, 0);
  assert(validateSave(b));
  for (const z of [3, 10])
    for (const x of [8, 9])
      assert.equal(
        p.tiles.find((t) => t.x === x && t.z === z)!.terrain,
        "stone",
      );
  for (const x of [8, 9])
    assert.equal(p.tiles.find((t) => t.x === x && t.z === 6)!.terrain, "water");
  assert(p.tiles.some((t) => t.h === 1));
  assert.equal(p.content!.contracts.causeway.reward, 120);
  assert.equal(p.rules!.gear["custom-waystone"].rewardOnly, true);
});
test("Glacial Chain makes the river shortcut traversable through actual commands", () => {
  const p = mission(),
    original = exportLevelProject(p),
    b = compileLevelProject(p),
    s = b.units[0];
  assert(!reachable(b, s).has("9,6"));
  const cast = command(b, {
    type: "skill",
    skill: "custom-glacial-chain",
    x: 8,
    z: 6,
  });
  for (const x of [8, 9])
    assert.equal(
      cast.tiles.find((t) => t.x === x && t.z === 6)!.terrain,
      "ice",
    );
  assert.equal(cast.units[0].mp, 24);
  assert(reachable(cast, cast.units[0]).has("9,6"));
  const moved = command(cast, { type: "move", x: 9, z: 6 });
  assert.equal(moved.units[0].x, 9);
  assert(validateSave(moved));
  assert.equal(exportLevelProject(p), original);
});
test("Greybank loadout enables authored soak and lightning synergy", () => {
  const b = compileLevelProject(mission());
  b.units[0].x = 6;
  const target = b.units.find((u) => u.id === "enemy-brineguard-greybank")!;
  target.x = 10;
  const soaked = command(b, {
    type: "skill",
    skill: "custom-brine-lance",
    x: 10,
    z: 6,
  });
  const t = soaked.units.find((u) => u.id === target.id)!;
  assert.equal(t.status.soaked, 3);
  const ilya = soaked.units.find((u) => u.id === "ilya")!;
  const wet = preview(soaked, ilya, t, soaked.rules!.skills.surge);
  const dry = structuredClone(t);
  dry.status.soaked = 0;
  assert(wet.synergy);
  assert(
    wet.amount > preview(soaked, ilya, dry, soaked.rules!.skills.surge).amount,
  );
});
test("Greybank preset resets experimental combat while retaining cosmetics and reversible source", () => {
  const p = editProject(createLevelProject(), 0, [{ type: "expansion" }]);
  p.gameAudio = gameAudio();
  p.gameAudio.stepMs = 710;
  p.rules!.skills.strike.power = 99;
  p.rules!.jobs.vanguard.move = 8;
  const before = exportLevelProject(p),
    h = applyProjectEdits({ project: p, past: [], future: [] }, [
      { type: "greybank" },
    ]);
  assert.deepEqual(h.project.gameAudio, p.gameAudio);
  assert.notEqual(h.project.rules!.skills.strike.power, 99);
  assert.notEqual(h.project.rules!.jobs.vanguard.move, 8);
  assert.equal(exportLevelProject(p), before);
  assert.deepEqual(parseLevelProject(exportLevelProject(h.project)), h.project);
  assert.deepEqual(travelProjectHistory(h, "undo").project.content, p.content);
  const again = editProject(h.project, h.project.revision, [
    { type: "greybank" },
  ]);
  assert.deepEqual(again.content, h.project.content);
  assert.deepEqual(again.placements, h.project.placements);
});
test("Greybank completes valid deterministic runs and settles first-clear rewards exactly once", () => {
  const p = mission(),
    source = exportLevelProject(p);
  for (const seed of [74319, 9001, 42]) {
    let b = compileLevelProject({ ...p, seed }),
      n = 0;
    for (; n < 400 && b.result === "playing"; n++) {
      if (activeUnit(b).team === "ally") {
        let t = structuredClone(b);
        t.units.forEach((u) => (u.team = u.team === "ally" ? "enemy" : "ally"));
        t = aiTurn(t);
        t.units.forEach((u) => (u.team = u.team === "ally" ? "enemy" : "ally"));
        if (t.result === "victory") t.result = "defeat";
        else if (t.result === "defeat") t.result = "victory";
        b = t;
      } else b = aiTurn(b);
      assert(validateSave(b));
    }
    assert(n < 400);
    assert.equal(b.result, "victory");
    const g = previewExpedition(b),
      gold = g.company.gold,
      out = returnToCamp(g, p.content!.contracts);
    assert(validateExpedition(out));
    assert.equal(out.company.gold, gold + (b.result === "victory" ? 120 : 0));
    assert.equal(
      out.company.inventory["custom-waystone"] ?? 0,
      b.result === "victory" ? 1 : 0,
    );
    assert.deepEqual(returnToCamp(out, p.content!.contracts), out);
    if (b.result === "victory") {
      const repeat = {
        ...structuredClone(out),
        stage: "battle" as const,
        battle: b,
      };
      repeat.company.deployments++;
      const settled = returnToCamp(repeat, p.content!.contracts);
      assert.equal(settled.company.inventory["custom-waystone"], 1);
      assert(validateExpedition(settled));
    }
  }
  assert.equal(exportLevelProject(p), source);
});

test("published editable mission fixture matches the current preset", () => {
  const actual = parseLevelProject(
      readFileSync("public/missions/greybank.json", "utf8"),
    ),
    expected = mission();
  expected.id = "greybank-mission";
  assert.deepEqual(actual, expected);
  assert.equal(analyzeProject(actual).errors, 0);
});
