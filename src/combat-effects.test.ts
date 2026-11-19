import { test } from "node:test";
import assert from "node:assert/strict";
import { skills } from "./data";
import { createBattle, command, preview, validateSave } from "./engine";
import {
  effectRecipes,
  effectFrame,
  planCombatEffect,
  effectSeed,
  particleOffset,
} from "./combat-effects";
test("all thirteen abilities select a valid effect sequence", () => {
  assert.deepEqual(
    Object.keys(effectRecipes).sort(),
    Object.keys(skills).sort(),
  );
  const used = new Set(
    Object.values(effectRecipes).map((r) => r.atlas + ":" + r.clip),
  );
  assert.equal(used.size, 12);
  for (const id of Object.keys(skills) as (keyof typeof skills)[]) {
    const r = effectRecipes[id];
    assert(r.clip >= 0 && r.clip < 4);
    assert(r.frameMs >= 60);
    assert(r.travelMs >= 0);
  }
  assert.equal(effectRecipes.strike.travelMs, 0);
  assert.equal(effectRecipes.ember.atlas, "elements");
  assert.notEqual(effectRecipes.haste.color, effectRecipes.delay.color);
});
test("effect playback spans eight frames and reduced motion holds contact", () => {
  for (const id of Object.keys(skills) as (keyof typeof skills)[]) {
    const r = effectRecipes[id],
      first = r.clip * 8;
    assert.equal(effectFrame(id, -1), first);
    assert.equal(effectFrame(id, r.frameMs), first + 1);
    assert.equal(effectFrame(id, 999999), first + 7);
    assert.equal(effectFrame(id, 0, true), effectFrame(id, 999999, true));
  }
});
test("area effects follow the legal cross and clip at map edges", () => {
  const s = createBattle(),
    cue = {
      unit: s.units[0].id,
      skill: "ember" as const,
      turn: 1,
      target: { x: 0, z: 0 },
      outcomes: [],
    };
  const p = planCombatEffect(cue, s)!;
  assert.equal(p.tiles.length, 3);
  assert(p.tiles.every((t) => t.x + t.z <= 1));
  assert.equal(
    planCombatEffect({ ...cue, target: { x: 4, z: 4 } }, s)!.tiles.length,
    5,
  );
  assert.equal(planCombatEffect({ ...cue, target: { x: 9, z: 4 } }, s), null);
  assert.equal(planCombatEffect({ ...cue, target: undefined }, s), null);
});
test("missed and absent outcomes never create successful hit motes", () => {
  const s = createBattle(),
    snapshot = structuredClone(s),
    cue = {
      unit: s.units[0].id,
      skill: "strike" as const,
      turn: 1,
      target: { x: 6, z: 4 },
      outcomes: [{ unit: s.units[4].id, result: "miss" as const }],
    };
  assert.equal(planCombatEffect(cue, s)!.hits.length, 0);
  assert.equal(
    planCombatEffect({ ...cue, outcomes: undefined }, s)!.hits.length,
    0,
  );
  assert.equal(
    planCombatEffect(
      { ...cue, outcomes: [{ unit: s.units[4].id, result: "hit" }] },
      s,
    )!.hits.length,
    1,
  );
  assert.deepEqual(s, snapshot);
});
test("real commands record resolved hit and miss cues without extra RNG rolls", () => {
  const s = createBattle(17);
  s.units[4].x = 3;
  s.units[4].z = 5;
  const a = s.units[0],
    v = s.units[4],
    hit = preview(s, a, v, skills.strike).hit;
  let missed = false,
    landed = false;
  for (let seed = 0; seed < 100000 && (!missed || !landed); seed++) {
    const roll =
      (((Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 100;
    if ((roll > hit && missed) || (roll <= hit && landed)) continue;
    s.seed = seed;
    const n = command(s, { type: "skill", skill: "strike", x: 3, z: 5 });
    assert.deepEqual(n.lastAction!.target, { x: 3, z: 5 });
    assert.equal(
      n.lastAction!.outcomes![0].result,
      roll > hit ? "miss" : "hit",
    );
    let rng = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    if (roll <= hit) rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    assert.equal(n.seed, rng);
    if (roll > hit) missed = true;
    else landed = true;
  }
  assert(missed && landed);
});
test("cue validation accepts old saves and rejects malformed targets and outcomes", () => {
  const s = createBattle();
  s.units[4].x = 3;
  s.units[4].z = 5;
  const n = command(s, { type: "skill", skill: "strike", x: 3, z: 5 });
  assert(validateSave(n));
  const old = structuredClone(n);
  delete old.lastAction!.target;
  delete old.lastAction!.outcomes;
  assert(validateSave(old));
  for (const target of [
    { x: -1, z: 0 },
    { x: 1.5, z: 1 },
    { x: 1, z: 9 },
    null,
  ]) {
    const bad = structuredClone(n);
    (bad.lastAction as any).target = target;
    assert(!validateSave(bad));
  }
  for (const outcomes of [
    [{ unit: "missing", result: "hit" }],
    [{ unit: s.units[4].id, result: "maybe" }],
    [null],
    [n.lastAction!.outcomes![0], n.lastAction!.outcomes![0]],
  ]) {
    const bad = structuredClone(n);
    (bad.lastAction as any).outcomes = outcomes;
    assert(!validateSave(bad));
  }
});
test("visual particles are repeatable and do not consume battle state", () => {
  const s = createBattle(),
    cue = {
      unit: s.units[0].id,
      skill: "ember" as const,
      turn: 1,
      target: { x: 4, z: 4 },
    };
  const seed = effectSeed(cue),
    values = Array.from({ length: 32 }, (_, i) => particleOffset(seed, i));
  assert.deepEqual(
    values,
    Array.from({ length: 32 }, (_, i) => particleOffset(seed, i)),
  );
  assert(values.every((v) => v >= 0 && v < 1));
  assert(new Set(values).size > 30);
  assert.notEqual(seed, effectSeed({ ...cue, turn: 2 }));
  assert.equal(s.seed, createBattle().seed);
});
