import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBattle,
  command,
  reachable,
  key,
  preview,
  activeUnit,
  aiTurn,
  canTarget,
  validateSave,
  changeJob,
  tileAt,
  living,
  type Battle,
} from "./engine";
import { skills, jobLevel, unlocked } from "./data";

function duel() {
  const s = createBattle(42);
  s.units.forEach((u) => {
    if (!["sera", "sentinel"].includes(u.id)) u.hp = 0;
  });
  const a = s.units[0],
    b = s.units[4];
  a.x = 2;
  a.z = 4;
  b.x = 3;
  b.z = 4;
  b.hp = 100;
  b.facing = [-1, 0];
  return { s, a, b };
}
test("movement respects water, obstruction, occupancy and elevation costs", () => {
  const s = createBattle(),
    u = activeUnit(s),
    r = reachable(s, u);
  assert.equal(r.has(key(4, 3)), false);
  assert.equal(r.has(key(0, 7)), false);
  assert.equal(r.has(key(1, 4)), false);
  assert.equal(r.get(key(3, 5)), 1);
  assert.equal(r.get(key(4, 5)), 2);
  assert.equal(r.has(key(6, 5)), false);
  assert.equal(command(s, { type: "move", x: 4, z: 3 }), s);
});
test("move once, act once, reject unavailable skills without mutation", () => {
  let { s } = duel();
  const original = structuredClone(s);
  s = command(s, { type: "move", x: 2, z: 3 });
  assert.equal(s.units[0].moved, true);
  assert.equal(command(s, { type: "move", x: 3, z: 3 }), s);
  assert.equal(command(s, { type: "skill", skill: "ember", x: 3, z: 4 }), s);
  assert.deepEqual(original.units[0].x, 2);
});
test("seeded attacks replay identically and do not mutate source", () => {
  const { s } = duel(),
    copy = structuredClone(s),
    c = { type: "skill" as const, skill: "strike" as const, x: 3, z: 4 };
  assert.deepEqual(command(s, c), command(s, c));
  assert.deepEqual(s, copy);
  const out = command(s, c);
  assert(out.units[4].hp < 100);
  assert.equal(out.units[0].acted, true);
  assert.equal(command(out, c), out);
});
test("height, facing, armor, formation and guarding affect preview", () => {
  const { s, a, b } = duel();
  const base = preview(s, a, b, skills.strike);
  b.facing = [1, 0];
  assert.equal(preview(s, a, b, skills.strike).amount, base.amount + 6);
  b.guard = true;
  assert(preview(s, a, b, skills.strike).amount < base.amount);
  b.guard = false;
  tileAt(s, a.x, a.z)!.h = 2;
  assert.equal(preview(s, a, b, skills.strike).height, 2);
});
test("range and line of sight reject obstructed casts", () => {
  const s = createBattle(),
    u = s.units[1];
  s.active = u.id;
  u.x = 1;
  u.z = 3;
  assert.equal(canTarget(s, u, skills.ember, 7, 3), false);
  tileAt(s, 2, 3)!.blocked = true;
  assert.equal(canTarget(s, u, skills.ember, 3, 3), false);
  u.mp = 0;
  assert.equal(canTarget(s, u, skills.ember, 1, 3), false);
});
test("frost freezes water and fire creates hazards", () => {
  let s = createBattle(),
    u = s.units[1];
  s.active = u.id;
  u.x = 3;
  u.z = 3;
  let out = command(s, { type: "skill", skill: "frost", x: 4, z: 3 });
  assert.equal(tileAt(out, 4, 3)!.terrain, "ice");
  assert.equal(tileAt(s, 4, 3)!.terrain, "water");
  out = command(s, { type: "skill", skill: "ember", x: 3, z: 3 });
  assert.equal(tileAt(out, 3, 3)!.burn, 3);
});
test("healing revives, clears burn and caps maximum health", () => {
  const s = createBattle(),
    healer = s.units[3],
    ally = s.units[0];
  s.active = healer.id;
  ally.hp = 0;
  ally.status.burn = 2;
  let out = command(s, { type: "skill", skill: "mend", x: ally.x, z: ally.z });
  assert.equal(out.units[0].hp, 24);
  assert.equal(out.units[0].status.burn, 0);
  ally.hp = ally.maxHp - 2;
  out = command(s, { type: "skill", skill: "mend", x: ally.x, z: ally.z });
  assert.equal(out.units[0].hp, ally.maxHp);
});
test("burn and slow expire and initiative is speed driven", () => {
  const { s, a } = duel();
  a.status.burn = 2;
  a.status.slow = 2;
  const out = command(s, { type: "end" });
  assert.equal(out.units[0].hp, a.hp - 6);
  assert.equal(out.units[0].status.burn, 1);
  assert.equal(out.units[0].status.slow, 1);
  assert.equal(out.units[0].next, 130);
  assert.equal(out.active, "sentinel");
  assert.equal(out.units[0].guard, true);
});
test("job prerequisites are data driven and changing jobs preserves progress", () => {
  let s = createBattle();
  assert.equal(jobLevel(120), 3);
  assert.equal(unlocked("runewarden", { vanguard: 120, arcanist: 60 }), true);
  assert.equal(unlocked("runewarden", {}), false);
  assert.equal(changeJob(s, "sera", "runewarden", "lifebinder"), s);
  s.units[0].jp = { vanguard: 120, arcanist: 60 };
  const next = changeJob(s, "sera", "runewarden", "lifebinder");
  assert.equal(next.units[0].job, "runewarden");
  assert.deepEqual(next.units[0].jp, s.units[0].jp);
  assert.equal(
    changeJob({ ...s, turn: 2 }, "sera", "dancer", "lifebinder").units[0].job,
    "vanguard",
  );
});
test("momentum gates concord and rewards apply exactly once", () => {
  const { s, a, b } = duel();
  b.hp = 1;
  assert.equal(
    command(s, { type: "skill", skill: "rally", x: b.x, z: b.z }),
    s,
  );
  s.momentum = 3;
  const out = command(s, { type: "skill", skill: "rally", x: b.x, z: b.z });
  assert.equal(out.result, "victory");
  assert.equal(out.rewarded, true);
  assert.equal(out.units[0].jp[a.job], 70);
  assert.equal(command(out, { type: "end" }), out);
});
test("defeat occurs when last companion falls to burn", () => {
  const { s, a } = duel();
  a.hp = 4;
  a.status.burn = 1;
  const out = command(s, { type: "end" });
  assert.equal(out.result, "defeat");
  assert.equal(command(out, { type: "end" }), out);
});
test("versioned save validation rejects malformed and incompatible data", () => {
  const s = createBattle();
  assert.equal(validateSave(s), true);
  assert.equal(validateSave({ ...s, version: 3 }), false);
  assert.equal(validateSave({ ...s, seed: NaN }), false);
  assert.equal(validateSave({ ...s, units: [] }), false);
  s.units[0].job = "nonsense" as never;
  assert.equal(validateSave(s), false);
});
test("complete scored-AI scenario terminates deterministically with legal turns", () => {
  function simulate() {
    let s = createBattle(143);
    for (let i = 0; i < 400 && s.result === "playing"; i++) {
      if (activeUnit(s).team === "ally") {
        // Use exactly the enemy planner as a symmetric test policy, preserving all team flags afterward.
        const t = structuredClone(s);
        t.units.forEach((u) => (u.team = u.team === "ally" ? "enemy" : "ally"));
        const r = aiTurn(t);
        r.units.forEach((u) => (u.team = u.team === "ally" ? "enemy" : "ally"));
        if (r.result === "victory") r.result = "defeat";
        else if (r.result === "defeat") r.result = "victory";
        s = r;
      } else s = aiTurn(s);
      assert(s.units.every((u) => u.hp >= 0 && u.hp <= u.maxHp));
      if (s.result === "playing") assert(activeUnit(s).hp > 0);
    }
    assert.notEqual(
      s.result,
      "playing",
      "battle must reach an outcome within 400 activations",
    );
    return s;
  }
  const a = simulate(),
    b = simulate();
  assert.deepEqual(a, b);
  assert(living(a).length > 0);
});
test("soaked targets take increased lightning damage", () => {
  const { s, a, b } = duel();
  const base = preview(s, a, b, skills.surge).amount;
  b.status.soaked = 2;
  assert.equal(preview(s, a, b, skills.surge).amount, Math.round(base * 1.5));
});
test("a lethal riposte advances away from the incapacitated actor", () => {
  const { s, a, b } = duel();
  s.units[1].hp = 20;
  a.hp = 5;
  b.job = "dancer";
  const out = command(s, { type: "skill", skill: "strike", x: b.x, z: b.z });
  assert.equal(out.units[0].hp, 0);
  assert.notEqual(out.active, a.id);
  assert.equal(activeUnit(out).hp > 0, true);
});
test("save validation safely rejects null tiles and missing status counters", () => {
  const s = createBattle();
  assert.equal(
    validateSave({ ...s, tiles: [null, ...s.tiles.slice(1)] }),
    false,
  );
  assert.equal(
    validateSave({ ...s, units: [null, ...s.units.slice(1)] }),
    false,
  );
  s.units[0].status = {} as never;
  assert.equal(validateSave(s), false);
});
test("area damage spares allies and a fallen body retains its tile", () => {
  const s = createBattle(),
    a = s.units[1];
  s.active = a.id;
  a.x = 3;
  a.z = 4;
  s.units[0].x = 3;
  s.units[0].z = 5;
  const out = command(s, { type: "skill", skill: "ember", x: 3, z: 5 });
  assert.equal(out.units[0].hp, s.units[0].hp);
  s.units[0].hp = 0;
  assert.equal(reachable(s, a).has(key(3, 5)), false);
});
