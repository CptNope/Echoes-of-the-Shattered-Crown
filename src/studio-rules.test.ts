import { test } from "node:test";
import assert from "node:assert/strict";
import { gameRules, validateRules } from "./studio-rules";
import { jobs, skills, unlocked } from "./data";
import { equipment, canEquip } from "./equipment";
import {
  createBattle,
  unitStats,
  reachable,
  availableSkills,
  command,
  aiTurn,
  preview,
  validateSave,
} from "./engine";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  exportLevelProject,
  parseLevelProject,
  applyProjectEdits,
  travelProjectHistory,
} from "./studio-project";
import { gameContent } from "./studio-content";
import {
  createExpedition,
  purchase,
  equip,
  train,
  depart,
  validateExpedition,
} from "./campaign";
import { mastered } from "./supports";
import { actionClip } from "./animation";
import { planCombatEffect } from "./combat-effects";
test("shipped rules import exact catalogs with independent source arrays and leave global defaults unchanged", () => {
  const r = gameRules();
  assert.equal(Object.keys(r.jobs).length, 8);
  assert.equal(Object.keys(r.skills).length, 13);
  assert.equal(Object.keys(r.gear).length, 22);
  assert.deepEqual(r.jobs, jobs);
  assert.deepEqual(r.skills, skills);
  assert.deepEqual(r.gear, equipment);
  assert.deepEqual(validateRules(r), r);
  const defaults = JSON.stringify({ jobs, skills, equipment });
  r.jobs.vanguard.skills.push("ember");
  r.gear.ironblade.bonuses.attack = 80;
  r.skills.strike.power = 120;
  assert.equal(JSON.stringify({ jobs, skills, equipment }), defaults);
});
test("scoped job and gear stats change health, movement and initiative through actual engine paths", () => {
  const r = gameRules(),
    content = gameContent();
  r.jobs.vanguard.move = 6;
  r.jobs.vanguard.speed = 20;
  r.gear.ironblade.bonuses = { attack: 20, hp: 25 };
  content.actors[0].equipment = {
    weapon: "ironblade",
    armor: null,
    relic: null,
  };
  const p = editProject(createLevelProject(), 0, [
      { type: "rules", rules: r },
      { type: "content", content },
    ]),
    b = compileLevelProject(p),
    u = b.units[0];
  assert.equal(u.maxHp, 137);
  assert.equal(unitStats(u, b.rules).attack, 29);
  assert.equal(unitStats(u, b.rules).move, 6);
  assert.ok(
    reachable(b, u).size >
      reachable(createBattle(), createBattle().units[0]).size,
  );
  assert.equal(command(b, { type: "end" }).units[0].next, 50);
  assert.equal(unitStats(createBattle().units[0]).move, 3);
});
test("ability cost, range and power overrides drive real commands and preserve existing RNG consumption", () => {
  const r = gameRules();
  r.skills.strike = {
    ...r.skills.strike,
    name: "Crown reach",
    cost: 4,
    range: 3,
    power: 40,
  };
  const b = createBattle();
  b.rules = r;
  const target = b.units[4];
  target.x = 4;
  target.z = 5;
  const u = b.units[0],
    old = { ...b, rules: undefined };
  assert.equal(
    command(old, { type: "skill", skill: "strike", x: 4, z: 5 }),
    old,
  );
  const predicted = preview(b, u, target, r.skills.strike),
    next = command(b, { type: "skill", skill: "strike", x: 4, z: 5 });
  assert.notEqual(next, b);
  assert.equal(next.units[0].mp, 28);
  const damage = target.hp - next.units[4].hp;
  assert.ok(
    damage === predicted.amount ||
      damage === Math.round(predicted.amount * 1.5),
  );
  assert.equal(b.units[0].mp, 32);
  assert.equal(next.lastAction?.skill, "strike");
});
test("edited kind and radius feed animation classification and combat effect footprint", () => {
  const b = createBattle(),
    r = gameRules();
  r.skills.strike.element = "fire";
  r.skills.strike.radius = 2;
  b.rules = r;
  assert.equal(actionClip("strike", r.skills), "cast");
  assert.equal(actionClip("strike"), "attack");
  const plan = planCombatEffect(
    {
      unit: "sera",
      skill: "strike",
      turn: 1,
      target: { x: 3, z: 4 },
      outcomes: [],
    },
    b,
  );
  assert.ok(plan);
  assert.equal(plan.tiles.length, 13);
  assert.deepEqual(r.skills.strike.element, "fire");
});
test("monster AI uses edited native ability lists, resource cost, target range and damage source", () => {
  const b = createBattle(),
    r = gameRules();
  r.jobs.vanguard.skills = ["ember"];
  r.skills.ember = {
    ...r.skills.ember,
    power: 120,
    cost: 0,
    range: 8,
    radius: 0,
  };
  b.rules = r;
  b.active = "sentinel";
  assert.ok(availableSkills(b.units[4], r).includes("ember"));
  const result = aiTurn(b);
  assert.equal(result.lastAction?.skill, "ember");
  assert.equal(result.lastAction?.unit, "sentinel");
  assert.ok(result.units.some((u) => u.team === "ally" && u.hp < u.maxHp));
  assert.equal(b.units[4].mp, 32);
});
test("shop prices and gear proficiency are consumed by real purchase, equip and deployment functions", () => {
  const r = gameRules(),
    g = createExpedition();
  r.gear.cedarrod.price = 15;
  r.gear.cedarrod.jobs = ["vanguard"];
  r.gear.cedarrod.bonuses = { magic: 20 };
  g.battle.rules = r;
  g.company.members[1].equipment.weapon = null;
  const bought = purchase(g, "cedarrod");
  assert.equal(bought.company.gold, 125);
  assert.equal(bought.company.inventory.cedarrod, 2);
  assert.equal(canEquip("vanguard", "cedarrod"), false);
  assert.equal(canEquip("vanguard", "cedarrod", r.gear), true);
  const equipped = equip(bought, "sera", "weapon", "cedarrod");
  assert.equal(equipped.company.members[0].equipment.weapon, "cedarrod");
  assert.equal(validateExpedition(equipped), true);
  const deployed = depart(equipped, "shrine");
  assert.equal(deployed.battle.rules!.gear.cedarrod.price, 15);
  assert.equal(
    unitStats(deployed.battle.units[0], deployed.battle.rules).magic,
    20,
  );
  assert.equal(g.company.gold, 140);
});
test("job prerequisites, learning and mastery use catalog assignments instead of built-in lists", () => {
  const r = gameRules(),
    g = createExpedition(),
    m = g.company.members[0];
  r.jobs.vanguard.skills = ["ember"];
  r.jobs.vanguard.requires = { arcanist: 3 };
  g.battle.rules = r;
  m.jp.vanguard = 240;
  assert.equal(unlocked("vanguard", m.jp, r.jobs), false);
  m.jp.arcanist = 120;
  assert.equal(unlocked("vanguard", m.jp, r.jobs), true);
  const next = train(g, "sera", "vanguard", "ember");
  assert.notEqual(next, g);
  assert.ok(next.company.members[0].learned.includes("ember"));
  assert.equal(next.company.members[0].jpSpent.vanguard, 60);
  assert.equal(mastered(next.company.members[0], "vanguard", r.jobs), true);
  assert.equal(mastered(next.company.members[0], "vanguard"), false);
});
test("catalog validation rejects unresolved IDs, effects, bounds, prerequisite cycles and unknown fields", () => {
  for (const mutate of [
    (r: any) => delete r.skills.strike,
    (r: any) => (r.skills.strike.id = "other"),
    (r: any) => (r.skills.strike.cost = -1),
    (r: any) => (r.skills.strike.radius = 5),
    (r: any) => (r.skills.strike.element = ["fire"]),
    (r: any) => (r.skills.strike.effect = "script"),
    (r: any) => {
      r.skills.strike.kind = "heal";
      r.skills.strike.effect = "aegis";
    },
    (r: any) => (r.jobs.vanguard.skills = ["missing"]),
    (r: any) => {
      r.jobs.vanguard.requires = { arcanist: 2 };
      r.jobs.arcanist.requires = { vanguard: 2 };
    },
    (r: any) => (r.jobs.vanguard.move = 0),
    (r: any) => (r.gear.ironblade.price = -1),
    (r: any) => (r.gear.ironblade.bonuses.hp = 501),
    (r: any) => (r.gear.ironblade.jobs = ["fake"]),
    (r: any) => (r.extension = { script: "ignored" }),
  ]) {
    const r = gameRules();
    mutate(r);
    assert.throws(() => validateRules(r));
    assert.equal(validateSave({ ...createBattle(), rules: r }), false);
  }
});
test("actor loadouts validate against scoped slots and proficiencies and reject incompatible catalog removal", () => {
  const r = gameRules(),
    c = gameContent();
  r.gear.cedarrod.jobs = ["vanguard"];
  c.actors[0].equipment = { weapon: "cedarrod", armor: null, relic: null };
  const p = editProject(createLevelProject(), 0, [
    { type: "rules", rules: r },
    { type: "content", content: c },
  ]);
  assert.equal(unitStats(compileLevelProject(p).units[0], r).magic, 4);
  assert.throws(
    () => editProject(p, p.revision, [{ type: "rules", rules: null }]),
    /slot and job/,
  );
  const wrong = structuredClone(c);
  wrong.actors[0].equipment!.relic = "ironblade";
  assert.throws(
    () => editProject(p, p.revision, [{ type: "content", content: wrong }]),
    /slot and job/,
  );
  assert.equal(p.content!.actors[0].equipment!.weapon, "cedarrod");
});
test("catalog projects and battles round-trip, undo and reset without contaminating another project", () => {
  const base = createLevelProject(),
    r = gameRules();
  r.skills.strike.power = 88;
  r.gear.ironblade.price = 25;
  const state = applyProjectEdits({ project: base, past: [], future: [] }, [
    { type: "rules", rules: r },
  ]);
  assert.deepEqual(
    parseLevelProject(exportLevelProject(state.project)),
    state.project,
  );
  assert.equal(
    compileLevelProject(state.project).rules!.skills.strike.power,
    88,
  );
  assert.equal(
    validateSave(
      JSON.parse(JSON.stringify(compileLevelProject(state.project))),
    ),
    true,
  );
  assert.equal(travelProjectHistory(state, "undo").project.rules, undefined);
  const reset = editProject(state.project, state.project.revision, [
    { type: "rules", rules: null },
  ]);
  assert.equal(reset.rules, undefined);
  assert.equal(compileLevelProject(base).rules, undefined);
  assert.notEqual(skills.strike.power, 88);
  assert.equal(
    compileLevelProject(parseLevelProject(exportLevelProject(base))).rules,
    undefined,
  );
});
