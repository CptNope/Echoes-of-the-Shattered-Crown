import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createExpedition,
  learnSupport,
  setSupport,
  setMemberJob,
  memberUnit,
  depart,
  returnToCamp,
  decodeSave,
  validateExpedition,
} from "./campaign";
import { mastered, supports, validSupports } from "./supports";
import {
  createBattle,
  command,
  unitStats,
  preview,
  validateSave,
  reachable,
  key,
} from "./engine";
import { skills } from "./data";

test("mastery requires lifetime JP and all permanently learned native skills", () => {
  const g = createExpedition(),
    m = g.company.members[0];
  m.jp.vanguard = 240;
  assert(!mastered(m, "vanguard"));
  assert.equal(learnSupport(g, m.id, "bulwark"), g);
  m.learned.push("cleave");
  assert(mastered(m, "vanguard"));
  const next = learnSupport(g, m.id, "bulwark");
  assert.equal(next.company.members[0].jpSpent.vanguard, 120);
  assert.equal(next.company.members[0].jp.vanguard, 240);
  assert.equal(g.company.members[0].learnedSupport, undefined);
  assert.equal(learnSupport(next, m.id, "bulwark"), next);
  assert.equal(
    learnSupport(depart(next, "shrine"), m.id, "bulwark").stage,
    "battle",
  );
  m.jpSpent.vanguard = 200;
  assert.equal(learnSupport(g, m.id, "bulwark"), g);
  m.jp.shadowrunner = 240;
  m.learned.push("veil");
  assert(!mastered(m, "shadowrunner"));
});
test("support slots enforce ownership and type, survive job changes, and change real stats", () => {
  let g = createExpedition();
  const m = g.company.members[0];
  m.jp.vanguard = 240;
  m.learned.push("cleave");
  assert.equal(setSupport(g, m.id, "passive", "bulwark"), g);
  g = learnSupport(g, m.id, "bulwark");
  assert.equal(setSupport(g, m.id, "movement", "bulwark"), g);
  g = setSupport(g, m.id, "passive", "bulwark");
  assert.equal(unitStats(memberUnit(g.company.members[0])).armor, 12);
  g = setMemberJob(g, m.id, "arcanist", "vanguard");
  assert.equal(g.company.members[0].supportSlots?.passive, "bulwark");
  assert.equal(unitStats(memberUnit(g.company.members[0])).armor, 5);
  const field = depart(g, "shrine");
  assert.equal(field.battle.units[0].supportSlots?.passive, "bulwark");
  field.battle.result = "defeat";
  const camp = returnToCamp(field);
  assert.equal(camp.company.members[0].supportSlots?.passive, "bulwark");
  assert(validateExpedition(camp));
  assert.equal(
    decodeSave({ game: JSON.parse(JSON.stringify(camp)) })?.migrated,
    false,
  );
  g = setSupport(g, m.id, "passive", null);
  assert.equal(unitStats(memberUnit(g.company.members[0])).armor, 3);
});
test("all support stat bonuses apply only while learned and equipped", () => {
  const s = createBattle(),
    moving = s.units[0];
  assert(!reachable(s, moving).has(key(3, 2)));
  moving.learnedSupport = ["fleetfoot"];
  moving.supportSlots = {
    passive: null,
    reaction: null,
    movement: "fleetfoot",
  };
  assert(reachable(s, moving).has(key(3, 2)));
  for (const item of Object.values(supports)) {
    const u = createBattle().units[0];
    const before = unitStats(u);
    u.learnedSupport = [item.id];
    u.supportSlots = { passive: null, reaction: null, movement: null };
    u.supportSlots[item.slot] = item.id;
    const after = unitStats(u);
    for (const [k, v] of Object.entries(item.bonuses ?? {}))
      assert.equal(
        after[k as keyof typeof after],
        before[k as keyof typeof before] + v,
      );
    u.learnedSupport = [];
    assert.deepEqual(unitStats(u), before);
  }
});
test("Second wind reacts to surviving hits, pays energy, and cannot revive", () => {
  const hazard = createBattle();
  Object.assign(hazard.units[0], {
    hp: 20,
    learnedSupport: ["secondwind"],
    supportSlots: { passive: null, reaction: "secondwind", movement: null },
  });
  hazard.units[0].status.burn = 1;
  const burned = command(hazard, { type: "end" });
  assert.equal(burned.units[0].hp, 14);
  assert.equal(burned.units[0].mp, 32);
  let s = createBattle(17);
  s.units[0].x = 5;
  s.units[0].z = 4;
  const v = s.units[4];
  v.learnedSupport = ["secondwind"];
  v.supportSlots = { passive: null, reaction: "secondwind", movement: null };
  const damage = preview(s, s.units[0], v, skills.strike).amount;
  s = command(s, { type: "skill", skill: "strike", x: 6, z: 4 });
  assert.equal(s.units[4].hp, 100 - damage + 4);
  assert.equal(s.units[4].mp, 30);
  const lethal = createBattle(17);
  lethal.units[0].x = 5;
  lethal.units[0].z = 4;
  Object.assign(lethal.units[4], {
    hp: 1,
    learnedSupport: ["secondwind"],
    supportSlots: { passive: null, reaction: "secondwind", movement: null },
  });
  assert.equal(
    command(lethal, { type: "skill", skill: "strike", x: 6, z: 4 }).units[4].hp,
    0,
  );
  const dry = createBattle(17);
  dry.units[0].x = 5;
  dry.units[0].z = 4;
  Object.assign(dry.units[4], {
    mp: 1,
    learnedSupport: ["secondwind"],
    supportSlots: { passive: null, reaction: "secondwind", movement: null },
  });
  assert(
    !command(dry, { type: "skill", skill: "strike", x: 6, z: 4 }).log.some(
      (t) => t.includes("Second wind"),
    ),
  );
});
test("Close reprisal can end an attacker activation without leaving a dead active unit", () => {
  const s = createBattle(17);
  s.units[0].x = 5;
  s.units[0].z = 4;
  s.units[0].hp = 4;
  Object.assign(s.units[4], {
    learnedSupport: ["reprisal"],
    supportSlots: { passive: null, reaction: "reprisal", movement: null },
  });
  const next = command(s, { type: "skill", skill: "strike", x: 6, z: 4 });
  assert.equal(next.units[0].hp, 0);
  assert.notEqual(next.active, "sera");
  assert.equal(s.units[0].hp, 4);
});
test("v2 saves without support fields load; malformed or unowned slots are rejected", () => {
  const g = createExpedition();
  assert(validateExpedition(g));
  assert(decodeSave({ game: g }));
  const u = g.battle.units[0];
  u.learnedSupport = ["bulwark"];
  u.supportSlots = { passive: "bulwark", reaction: null, movement: null };
  assert(validSupports(u));
  assert(validateSave(g.battle));
  u.learnedSupport = [];
  assert(!validateSave(g.battle));
  const bad: any = createExpedition();
  bad.company.members[0].learnedSupport = ["constructor"];
  bad.company.members[0].supportSlots = {
    passive: null,
    reaction: null,
    movement: null,
  };
  assert(!validateExpedition(bad));
  const extra: any = createExpedition();
  Object.assign(extra.company.members[0], {
    learnedSupport: ["bulwark"],
    supportSlots: {
      passive: "bulwark",
      reaction: null,
      movement: null,
      extra: "bulwark",
    },
  });
  assert(!validateExpedition(extra));
});
