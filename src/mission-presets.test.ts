import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MISSION_PRESETS, loadMissionPreset } from "./mission-presets";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  exportLevelProject,
  parseLevelProject,
  applyProjectEdits,
  travelProjectHistory,
} from "./studio-project";
import {
  createBattle,
  activeUnit,
  aiTurn,
  validateSave,
  command,
} from "./engine";
import { analyzeProject } from "./studio-validation";
import { encounters, type EncounterId } from "./encounters";
import { previewExpedition, templateDifferences } from "./studio-authoring";
import { returnToCamp, validateExpedition } from "./campaign";
import { gameAudio } from "./game-audio";
const ids: EncounterId[] = ["shrine", "causeway", "redoubt", "bellkeeper"];
const preset = (id: EncounterId) =>
  editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: id },
  ]);
for (const id of ids)
  test(`${id} preset preserves shipped battlefield roster stats and progression`, () => {
    const p = preset(id),
      b = compileLevelProject(p),
      original = createBattle(p.seed, id);
    assert.deepEqual(
      b.tiles,
      original.tiles.map((t) => ({
        ...t,
        blocked: t.blocked || (id !== "bellkeeper" && t.x === 8 && t.z === 8),
      })),
    );
    assert.deepEqual(b.units, original.units);
    assert.equal(b.encounter, id);
    assert(validateSave(b));
    assert.deepEqual(p.content!.contracts, encounters);
    assert.equal(p.content!.dialogue[id].length, 4);
    assert.equal(p.content!.enemyTemplates!.length, 4);
    for (const actor of p.content!.actors.slice(4)) {
      const t = p.content!.enemyTemplates!.find(
        (t) => t.id === `enemy-${id}-${actor.id}-template`,
      )!;
      assert(t);
      assert.deepEqual(templateDifferences(actor, t), []);
      assert.equal(t.team, "enemy");
    }
    assert.equal(analyzeProject(p).errors, 0);
    assert.equal(analyzeProject(p).warnings, 0);
  });
test("preset transaction resets experiments preserves cosmetics and supports history recovery", () => {
  let p = preset("shrine");
  p.gameAudio = gameAudio();
  p.gameAudio.stepMs = 710;
  p.rules!.skills.strike.power = 99;
  const before = exportLevelProject(p),
    h = applyProjectEdits({ project: p, past: [], future: [] }, [
      { type: "mission-preset", preset: "bellkeeper" },
    ]);
  assert.deepEqual(h.project.gameAudio, p.gameAudio);
  assert.equal(h.project.id, p.id);
  assert.equal(h.project.seed, p.seed);
  assert.notEqual(h.project.rules!.skills.strike.power, 99);
  assert.equal(exportLevelProject(p), before);
  assert.deepEqual(parseLevelProject(exportLevelProject(h.project)), h.project);
  assert.deepEqual(travelProjectHistory(h, "undo").project.content, p.content);
  assert.deepEqual(
    travelProjectHistory(travelProjectHistory(h, "undo"), "redo").project
      .content,
    h.project.content,
  );
});
test("all five published mission files exactly match their canonical presets", () => {
  for (const m of MISSION_PRESETS) {
    const expected = editProject(createLevelProject(), 0, [
      { type: "mission-preset", preset: m.id },
    ]);
    expected.id = `${m.id}-mission`;
    assert.deepEqual(
      parseLevelProject(readFileSync(`public/missions/${m.id}.json`, "utf8")),
      expected,
    );
  }
});
test("all original preset battles reach valid terminal outcomes under a deterministic policy", () => {
  for (const id of ids) {
    const p = preset(id),
      source = exportLevelProject(p);
    let b = compileLevelProject(p),
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
    assert(n < 400, id);
    assert.notEqual(b.result, "playing");
    assert.equal(exportLevelProject(p), source);
  }
});
test("Orren keeps sentinel identity and his once-only half-health awakening", () => {
  const b = compileLevelProject(preset("bellkeeper")),
    boss = b.units.find((u) => u.id === "sentinel")!;
  assert.equal(boss.name, "Orren, Bellkeeper");
  boss.hp = 80;
  boss.mp = 0;
  boss.status.burn = 2;
  boss.status.slow = 2;
  const next = command(b, { type: "end" });
  assert(next.bossAwakened);
  const w = next.units.find((u) => u.id === "sentinel")!;
  assert.equal(w.mp, w.maxMp);
  assert.equal(w.status.burn, 0);
  assert.equal(w.status.slow, 0);
  assert(validateSave(next));
  const again = command(next, { type: "end" });
  assert(again.bossAwakened);
  assert.equal(
    again.log.filter((l) => l.includes("breaks his last oath")).length,
    1,
  );
});
test("original contract rewards and first-clear relic remain valid and idempotent", () => {
  for (const id of ids) {
    const p = preset(id),
      b = compileLevelProject(p);
    b.units.filter((u) => u.team === "enemy").forEach((u) => (u.hp = 0));
    b.result = "victory";
    const g = previewExpedition(b),
      out = returnToCamp(g, p.content!.contracts);
    assert(validateExpedition(out));
    assert.equal(out.company.gold, g.company.gold + encounters[id].reward);
    assert(out.company.completed.includes(id));
    assert.deepEqual(returnToCamp(out, p.content!.contracts), out);
    if (id === "bellkeeper") assert.equal(out.company.inventory.crownseal, 1);
  }
});
test("unknown or stale preset requests reject without mutating the open project", () => {
  const p = preset("shrine"),
    before = exportLevelProject(p);
  assert.throws(() => loadMissionPreset(p, "missing" as any));
  assert.throws(() =>
    editProject(p, p.revision + 1, [
      { type: "mission-preset", preset: "shrine" },
    ]),
  );
  assert.equal(exportLevelProject(p), before);
});
