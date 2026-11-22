import { previewExpedition } from "./studio-authoring";
import { activeUnit } from "./engine";
import { returnToCamp } from "./campaign";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createCatalogRecord,
  deleteCatalogRecord,
  recordReferences,
  createEnemyTemplate,
  spawnEnemy,
  removeEnemy,
  applyEnemyTemplate,
  templateDifferences,
} from "./studio-authoring";
import { gameRules, validateRules } from "./studio-rules";
import { gameContent, validateGameContent } from "./studio-content";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  exportLevelProject,
  parseLevelProject,
  applyProjectEdits,
  travelProjectHistory,
  saveProjectCheckpoint,
  loadProjectCheckpoint,
} from "./studio-project";
import {
  validateSave,
  command,
  availableSkills,
  unitStats,
  aiTurn,
} from "./engine";
import { baseJobId, baseSkillId } from "./data";
import { planCombatEffect } from "./combat-effects";
import {
  createExpedition,
  purchase,
  equip,
  setMemberJob,
  depart,
  train,
  validateExpedition,
} from "./campaign";
import { analyzeProject } from "./studio-validation";
import { nativeSource } from "./studio-native-sprites";
const expansion = () =>
  editProject(createLevelProject(), 0, [{ type: "expansion" }]);
test("new and duplicated catalog records preserve originals and use independent stable IDs", () => {
  const r = gameRules(),
    before = structuredClone(r);
  let n = createCatalogRecord(r, "skills", "custom-test", "frost");
  n.skills["custom-test"].power = 70;
  assert.equal(n.skills.frost.power, r.skills.frost.power);
  assert.equal(baseSkillId("custom-test", n.skills), "frost");
  n = createCatalogRecord(n, "jobs", "custom-school", "runewarden");
  assert.equal(baseJobId("custom-school", n.jobs), "runewarden");
  n = createCatalogRecord(n, "gear", "custom-blade");
  assert.equal(n.gear["custom-blade"].slot, "weapon");
  assert.deepEqual(r, before);
});
test("reserved duplicate malformed and over-budget custom IDs reject", () => {
  const r = gameRules();
  for (const id of [
    "strike",
    "custom-BAD",
    "custom-__proto__",
    "constructor",
    "custom-1bad",
  ])
    assert.throws(() => createCatalogRecord(r, "skills", id));
  const n = createCatalogRecord(r, "skills", "custom-test");
  assert.throws(() => createCatalogRecord(n, "skills", "custom-test"));
  assert.throws(() =>
    validateRules({
      ...n,
      skills: {
        ...n.skills,
        "custom-test": { ...n.skills["custom-test"], baseSkill: "custom-test" },
      },
    }),
  );
  const overflow = gameRules();
  for (let i = 0; i < 121; i++)
    (overflow.skills as any)["custom-extra-" + i] = {
      ...overflow.skills.strike,
      id: "custom-extra-" + i,
      baseSkill: "strike",
    };
  assert.throws(() => validateRules(overflow));
});
test("deletion exposes real class actor template proficiency and reward references", () => {
  const p = expansion(),
    r = p.rules!,
    c = p.content!;
  assert(recordReferences(r, "skills", "custom-brine-lance", c).length > 0);
  assert(
    recordReferences(r, "jobs", "custom-tidewarden", c).some((s) =>
      s.startsWith("Gear proficiency"),
    ),
  );
  c.contracts.causeway.firstClearRelic = "custom-waystone";
  validateGameContent(c, r);
  assert(
    recordReferences(r, "gear", "custom-waystone", c).some((ref) =>
      ref.startsWith("Reward:"),
    ),
  );
  assert.throws(
    () => deleteCatalogRecord(r, "gear", "custom-tidal-trident", c),
    /in use/,
  );
  assert.throws(() => deleteCatalogRecord(r, "skills", "strike", c));
  const n = createCatalogRecord(r, "skills", "custom-unused");
  assert(
    !Object.hasOwn(
      deleteCatalogRecord(n, "skills", "custom-unused", c).skills,
      "custom-unused",
    ),
  );
});
test("custom class and ability references validate including prerequisite cycle rejection", () => {
  const p = expansion(),
    r = p.rules!;
  assert.equal(validateRules(r).jobs["custom-tidewarden"].skills.length, 4);
  const bad = structuredClone(r);
  bad.jobs["custom-tidewarden"].requires = { vanguard: 1 };
  bad.jobs.vanguard.requires = { "custom-tidewarden": 1 };
  assert.throws(() => validateRules(bad), /cycle/);
  const missing = structuredClone(r);
  missing.jobs["custom-tidewarden"].skills.push("custom-missing");
  assert.throws(() => validateRules(missing));
});
test("guided expansion creates the complete editable content slice with no diagnostics", () => {
  const p = expansion(),
    b = compileLevelProject(p);
  assert.equal(Object.keys(p.rules!.jobs).length, 9);
  assert.equal(Object.keys(p.rules!.skills).length, 17);
  assert.equal(Object.keys(p.rules!.gear).length, 16);
  assert.equal(p.content!.enemyTemplates!.length, 3);
  assert.equal(b.units.length, 7);
  assert.equal(p.tiles.length, 192);
  assert.equal(analyzeProject(p).findings.length, 0);
  assert(validateSave(b));
  assert.equal(unitStats(b.units[0], b.rules).hp, 140);
});
test("custom ability command spends energy and applies guard with the authored name", () => {
  const p = expansion(),
    b = compileLevelProject(p),
    after = command(b, {
      type: "skill",
      skill: "custom-tidal-ward",
      x: 3,
      z: 4,
    });
  assert(availableSkills(b.units[0], b.rules).includes("custom-tidal-ward"));
  assert.equal(after.units[0].mp, 25);
  assert(after.units[0].guard);
  assert.match(after.log.at(-1)!, /Tidal ward/);
  assert(validateSave(JSON.parse(JSON.stringify(after))));
});
test("custom damage and status execute through normal combat formulas", () => {
  const b = compileLevelProject(expansion()),
    enemy = b.units.find((u) => u.id === "enemy-brineguard-1")!;
  enemy.x = 4;
  enemy.z = 4;
  const after = command(b, {
      type: "skill",
      skill: "custom-brine-lance",
      x: 4,
      z: 4,
    }),
    target = after.units.find((u) => u.id === enemy.id)!;
  assert.equal(after.units[0].mp, 24);
  assert(target.hp < enemy.hp);
  assert.equal(target.status.soaked, 3);
  assert(validateSave(after));
});
test("custom enemy AI uses its scoped ability list deterministically", () => {
  const b = compileLevelProject(expansion()),
    enemy = b.units.find((u) => u.id === "enemy-brineguard-1")!;
  enemy.x = 4;
  enemy.z = 4;
  b.active = enemy.id;
  enemy.next = 0;
  b.units.filter((u) => u.id !== enemy.id).forEach((u) => (u.next = 100));
  const after = aiTurn(b);
  assert(after.lastAction?.skill.startsWith("custom-"));
  assert.deepEqual(aiTurn(b), after);
  assert(validateSave(after));
});
test("spawned enemies are independent snapshots of a reusable template", () => {
  let p = expansion();
  const result = spawnEnemy(
    p.content!,
    p.placements,
    "enemy-brineguard",
    "enemy-guard-two",
    10,
    4,
    p.rules,
  );
  p = editProject(p, p.revision, [{ type: "roster", ...result }]);
  assert.equal(compileLevelProject(p).units.length, 8);
  const next = structuredClone(p.content!);
  next.enemyTemplates![0].baseHp = 200;
  assert.notEqual(
    next.actors.find((a) => a.id === "enemy-guard-two")!.baseHp,
    200,
  );
  assert(validateGameContent(next, p.rules));
});
test("roster transactions protect occupancy identity and dialogue references", () => {
  const p = expansion(),
    before = exportLevelProject(p);
  assert.throws(() =>
    editProject(p, p.revision, [
      {
        type: "roster",
        ...spawnEnemy(
          p.content!,
          p.placements,
          "enemy-brineguard",
          "enemy-overlap",
          3,
          4,
          p.rules,
        ),
      },
    ]),
  );
  const c = structuredClone(p.content!);
  c.dialogue.causeway.push({
    id: "enemy-speaks",
    speaker: "enemy-brineguard-1",
    text: "Hold the crossing.",
  });
  assert.throws(() =>
    removeEnemy(c, p.placements, "enemy-brineguard-1", p.rules),
  );
  assert.throws(() => removeEnemy(c, p.placements, "sera", p.rules));
  assert.equal(exportLevelProject(p), before);
});
test("roster cap accepts twenty enemies and rejects a twenty-first", () => {
  const p = expansion();
  let c = p.content!,
    positions = p.placements;
  for (let i = 0; i < 17; i++) {
    const n = spawnEnemy(
      c,
      positions,
      "enemy-brineguard",
      "enemy-extra-" + i,
      0,
      i,
      p.rules,
    );
    c = n.content;
    positions = n.placements;
  }
  assert.equal(c.actors.length, 24);
  assert.throws(() =>
    spawnEnemy(
      c,
      positions,
      "enemy-brineguard",
      "enemy-over-cap",
      1,
      1,
      p.rules,
    ),
  );
});
test("archetype presentation resolves existing sheets and effects outside legacy bounds", () => {
  const p = expansion(),
    b = compileLevelProject(p);
  assert.equal(baseJobId(b.units[0].job, b.rules!.jobs), "runewarden");
  const cue = {
    unit: "sera",
    skill: "custom-brine-lance" as const,
    turn: 1,
    target: { x: 11, z: 4 },
    outcomes: [],
  };
  const plan = planCombatEffect(cue, b)!;
  assert(plan);
  assert.equal(plan.skill, "raincall");
  assert(plan.tiles.some((t) => t.x === 11));
  assert.equal(planCombatEffect({ ...cue, target: { x: 16, z: 4 } }, b), null);
});
test("expansion and custom source round trip checkpoint and undo with native art intact", () => {
  let p = createLevelProject();
  const manifest = JSON.parse(
      readFileSync("public/art/animations/manifest.json", "utf8"),
    ),
    m = manifest.sheets.vanguard;
  p = editProject(p, 0, [
    {
      type: "native-sprite",
      sprite: nativeSource(
        "vanguard",
        "sera",
        m,
        "data:image/webp;base64," +
          readFileSync("public/" + m.file).toString("base64"),
      ),
    },
  ]);
  const h = applyProjectEdits({ project: p, past: [], future: [] }, [
      { type: "expansion" },
    ]),
    out = h.project;
  assert.deepEqual(out.nativeSprite, p.nativeSprite);
  assert.deepEqual(parseLevelProject(exportLevelProject(out)), out);
  const values = new Map<string, string>(),
    storage = {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        values.set(k, v);
      },
    };
  saveProjectCheckpoint(storage, out, null);
  assert.deepEqual(loadProjectCheckpoint(storage).project, out);
  assert.deepEqual(travelProjectHistory(h, "undo").project.rules, p.rules);
  assert.equal(
    travelProjectHistory(travelProjectHistory(h, "undo"), "redo").project
      .content!.actors.length,
    7,
  );
});
test("scoped shop equipment class change learning and deployment accept created records", () => {
  const p = expansion();
  let game = createExpedition();
  game.battle.rules = p.rules;
  game = setMemberJob(game, "sera", "custom-tidewarden", "lifebinder");
  game = purchase(game, "custom-tidal-trident");
  assert.equal(game.company.gold, 50);
  game = equip(game, "sera", "weapon", "custom-tidal-trident");
  game.company.members[0].jp["custom-tidewarden"] = 200;
  game = train(game, "sera", "custom-tidewarden", "custom-brine-lance");
  assert(game.company.members[0].learned.includes("custom-brine-lance"));
  assert(validateExpedition(game));
  const field = depart(game, "shrine");
  assert.equal(field.battle.units[0].job, "custom-tidewarden");
  assert(validateSave(field.battle));
});

test("Saltglass reaches a valid terminal outcome and isolated reward settlement", () => {
  const p = expansion(),
    before = exportLevelProject(p);
  let b = compileLevelProject(p),
    count = 0;
  for (; count < 400 && b.result === "playing"; count++) {
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
  assert.equal(b.result, "victory");
  assert(count < 400);
  const settled = returnToCamp(previewExpedition(b), p.content!.contracts);
  assert(validateExpedition(settled));
  assert(settled.company.completed.includes("causeway"));
  assert.equal(exportLevelProject(p), before);
});

test("template field updates preserve identity positions and individual overrides", () => {
  const p = expansion(),
    c = p.content!,
    before = exportLevelProject(p);
  c.actors.find((a) => a.id === "enemy-brineguard-1")!.name =
    "Crossing captain";
  const old = structuredClone(c),
    t = c.enemyTemplates![0];
  t.baseHp = 180;
  t.maxMp = 70;
  const next = applyEnemyTemplate(
    c,
    t.id,
    ["enemy-brineguard-1", "enemy-rimeweaver-1"],
    ["baseHp", "maxMp"],
    p.rules,
  );
  for (const id of ["enemy-brineguard-1", "enemy-rimeweaver-1"]) {
    const a = next.actors.find((a) => a.id === id)!,
      original = old.actors.find((a) => a.id === id)!;
    assert.deepEqual(a, { ...original, baseHp: 180, maxMp: 70 });
  }
  assert.equal(c.actors[4].baseHp, old.actors[4].baseHp);
  const out = editProject(p, p.revision, [{ type: "content", content: next }]);
  assert.deepEqual(out.placements, p.placements);
  assert.deepEqual(out.content!.dialogue, c.dialogue);
  assert(validateSave(compileLevelProject(out)));
});
test("template comparison treats set order empty equipment and zero JP consistently", () => {
  const c = expansion().content!,
    a = structuredClone(c.enemyTemplates![0]),
    b = structuredClone(a);
  b.id = "enemy-other";
  b.learned.reverse();
  b.jp = { ...b.jp, vanguard: 0 };
  a.jp = Object.fromEntries(Object.entries(b.jp).filter(([, v]) => v !== 0));
  delete a.equipment;
  b.equipment = { relic: null, armor: null, weapon: null };
  assert.deepEqual(templateDifferences(a, b), []);
  b.baseHp++;
  assert.deepEqual(templateDifferences(a, b), ["baseHp"]);
});
test("template update rejects heroes missing targets bad fields and invalid combinations atomically", () => {
  const p = expansion(),
    c = p.content!,
    original = structuredClone(c),
    t = c.enemyTemplates![0].id;
  for (const ids of [
    [],
    ["sera"],
    ["enemy-missing"],
    ["enemy-brineguard-1", "enemy-brineguard-1"],
  ])
    assert.throws(() => applyEnemyTemplate(c, t, ids, ["baseHp"], p.rules));
  for (const fields of [[], ["id"], ["baseHp", "baseHp"]])
    assert.throws(() =>
      applyEnemyTemplate(c, t, ["enemy-brineguard-1"], fields as any, p.rules),
    );
  assert.throws(() =>
    applyEnemyTemplate(
      c,
      "enemy-missing",
      ["enemy-brineguard-1"],
      ["baseHp"],
      p.rules,
    ),
  );
  c.actors.find((a) => a.id === "enemy-rimeweaver-1")!.equipment = {
    weapon: "cedarrod",
    armor: null,
    relic: null,
  };
  validateGameContent(c, p.rules);
  const changed = structuredClone(c);
  assert.throws(() =>
    applyEnemyTemplate(
      c,
      t,
      ["enemy-brineguard-1", "enemy-rimeweaver-1"],
      ["job"],
      p.rules,
    ),
  );
  assert.deepEqual(c, changed);
  assert.deepEqual(c.enemyTemplates, original.enemyTemplates);
});
test("template equipment and learned transfers own arrays and clear optional equipment", () => {
  const p = expansion(),
    c = p.content!,
    t = c.enemyTemplates![0];
  c.actors[4].equipment = {
    weapon: "custom-tidal-trident",
    armor: null,
    relic: null,
  };
  delete t.equipment;
  const next = applyEnemyTemplate(
    c,
    t.id,
    [c.actors[4].id],
    ["equipment", "learned", "jp"],
    p.rules,
  );
  assert.equal(next.actors[4].equipment, undefined);
  next.actors[4].learned.push("strike");
  next.actors[4].jp.vanguard = 99;
  assert(!t.learned.includes("strike"));
  assert.notEqual(t.jp.vanguard, 99);
});
test("template batch update round trips and undo restores every instance", () => {
  const p = expansion();
  p.content!.enemyTemplates![0].baseHp = 190;
  const h = applyProjectEdits({ project: p, past: [], future: [] }, [
    {
      type: "content",
      content: applyEnemyTemplate(
        p.content!,
        p.content!.enemyTemplates![0].id,
        ["enemy-brineguard-1", "enemy-rimeweaver-1"],
        ["baseHp"],
        p.rules,
      ),
    },
  ]);
  assert.deepEqual(parseLevelProject(exportLevelProject(h.project)), h.project);
  const undo = travelProjectHistory(h, "undo");
  assert.deepEqual(undo.project.content, p.content);
  assert.equal(
    travelProjectHistory(undo, "redo").project.content!.actors[4].baseHp,
    190,
  );
});
