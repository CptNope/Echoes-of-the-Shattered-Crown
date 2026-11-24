import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
import { activeUnit, aiTurn, command, validateSave } from "./engine";
import { previewExpedition } from "./studio-authoring";
import { returnToCamp, validateExpedition } from "./campaign";
import { gameAudio } from "./game-audio";
import type { EmberMissionId } from "./ember-missions";
const ids: EmberMissionId[] = ["ashen-weir", "cinder-archive"];
const mission = (id: EmberMissionId) =>
  editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: id },
  ]);
for (const id of ids) {
  test(`${id}: complete editable source, connected deployment, native class binding and exact published fixture`, () => {
    const p = mission(id),
      b = compileLevelProject(p),
      report = analyzeProject(p);
    assert.equal(report.errors, 0, JSON.stringify(report.findings));
    assert.equal(report.warnings, 0, JSON.stringify(report.findings));
    assert.equal(p.content!.actors.length, 10);
    assert.equal(p.content!.enemyTemplates!.length, 6);
    assert.equal(p.content!.dialogue.redoubt.length, 5);
    assert.equal(b.units.filter((u) => u.team === "enemy").length, 6);
    assert.equal(p.rules!.jobs["custom-emberwarden"].baseJob, "runewarden");
    assert.equal(
      Object.keys(p.rules!.skills).filter((k) => k.startsWith("custom-"))
        .length,
      4,
    );
    assert.equal(
      Object.keys(p.rules!.gear).filter((k) => k.startsWith("custom-")).length,
      18,
    );
    assert.equal(p.tiles.length, id === "ashen-weir" ? 320 : 432);
    assert(validateSave(b));
    const fixture = parseLevelProject(
      readFileSync(`public/missions/${id}.json`, "utf8"),
    );
    p.id = `${id}-mission`;
    assert.deepEqual(fixture, p);
  });
  test(`${id}: source roundtrip and reversible preset loading preserve existing audio`, () => {
    const original = createLevelProject();
    original.gameAudio = gameAudio();
    original.gameAudio.stepMs = 710;
    const before = exportLevelProject(original);
    const h = applyProjectEdits({ project: original, past: [], future: [] }, [
      { type: "mission-preset", preset: id },
    ]);
    assert.deepEqual(h.project.gameAudio, original.gameAudio);
    assert.equal(exportLevelProject(original), before);
    assert.deepEqual(
      parseLevelProject(exportLevelProject(h.project)),
      h.project,
    );
    assert.deepEqual(
      travelProjectHistory(h, "undo").project.tiles,
      original.tiles,
    );
    assert.deepEqual(
      travelProjectHistory(travelProjectHistory(h, "undo"), "redo").project
        .content,
      h.project.content,
    );
    assert.deepEqual(mission(id).content, h.project.content);
  });
  test(`${id}: victory settles authored bounty and unique first-clear relic exactly once`, () => {
    const p = mission(id),
      b = compileLevelProject(p);
    b.units.filter((u) => u.team === "enemy").forEach((u) => (u.hp = 0));
    b.result = "victory";
    const g = previewExpedition(b),
      out = returnToCamp(g, p.content!.contracts),
      relic = p.content!.contracts.redoubt.firstClearRelic!;
    assert(validateExpedition(out));
    assert.equal(
      out.company.gold,
      g.company.gold + p.content!.contracts.redoubt.reward,
    );
    assert.equal(out.company.inventory[relic], 1);
    assert.deepEqual(returnToCamp(out, p.content!.contracts), out);
    const repeat = {
      ...structuredClone(out),
      stage: "battle" as const,
      battle: b,
    };
    repeat.company.deployments++;
    assert.equal(
      returnToCamp(repeat, p.content!.contracts).company.inventory[relic],
      1,
    );
  });
  test(`${id}: deterministic multi-seed play reaches valid terminal outcomes without source mutation`, () => {
    const p = mission(id),
      source = exportLevelProject(p);
    for (const seed of [74319, 9001, 42]) {
      let b = compileLevelProject({ ...p, seed }),
        n = 0;
      for (; n < 400 && b.result === "playing"; n++) {
        if (activeUnit(b).team === "ally") {
          let t = structuredClone(b);
          t.units.forEach(
            (u) => (u.team = u.team === "ally" ? "enemy" : "ally"),
          );
          t = aiTurn(t);
          t.units.forEach(
            (u) => (u.team = u.team === "ally" ? "enemy" : "ally"),
          );
          if (t.result === "victory") t.result = "defeat";
          else if (t.result === "defeat") t.result = "victory";
          b = t;
        } else b = aiTurn(b);
        assert(validateSave(b));
      }
      assert(n < 400);
      assert.notEqual(b.result, "playing");
      console.log(
        JSON.stringify({
          mission: id,
          seed,
          result: b.result,
          activations: n,
          survivors: b.units.filter((u) => u.team === "ally" && u.hp > 0)
            .length,
        }),
      );
    }
    assert.equal(exportLevelProject(p), source);
  });
}
test("Emberwarden guard, timeline advance, heal and revival resolve through actual commands", () => {
  const b = compileLevelProject(mission("ashen-weir"));
  const ally = b.units.find((u) => u.id === "mae")!;
  ally.status.burn = 2;
  ally.x = 4;
  ally.z = 8;
  ally.next = 100;
  const guard = command(b, {
    type: "skill",
    skill: "custom-hearthguard",
    x: 4,
    z: 8,
  });
  const protectedAlly = guard.units.find((u) => u.id === "mae")!;
  assert(protectedAlly.guard);
  assert.equal(protectedAlly.status.burn, 0);
  assert.equal(guard.units[0].mp, b.units[0].mp - 6);
  const step = command(b, {
    type: "skill",
    skill: "custom-cinderstep",
    x: 4,
    z: 8,
  });
  assert.equal(step.units.find((u) => u.id === "mae")!.next, 65);
  const hurt = structuredClone(b);
  hurt.units.find((u) => u.id === "mae")!.hp = 20;
  const healed = command(hurt, {
    type: "skill",
    skill: "custom-kindlethread",
    x: 4,
    z: 8,
  });
  assert.equal(healed.units.find((u) => u.id === "mae")!.hp, 46);
  hurt.units.find((u) => u.id === "mae")!.hp = 0;
  const revived = command(hurt, {
    type: "skill",
    skill: "custom-kindlethread",
    x: 4,
    z: 8,
  });
  assert.equal(revived.units.find((u) => u.id === "mae")!.hp, 24);
  assert(validateSave(revived));
});
test("Ashfall ignites grass and charges its authored cost without altering source", () => {
  const p = mission("ashen-weir"),
    source = exportLevelProject(p),
    b = compileLevelProject(p);
  const cast = command(b, {
    type: "skill",
    skill: "custom-ashfall",
    x: 6,
    z: 6,
  });
  assert.equal(cast.units[0].mp, b.units[0].mp - 8);
  assert(cast.tiles.some((t) => t.x === 6 && t.z === 6 && t.burn > 0));
  assert.equal(exportLevelProject(p), source);
  assert(validateSave(cast));
});
