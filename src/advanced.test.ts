import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createBattle,
  command,
  preview,
  canTarget,
  aiTurn,
  availableSkills,
  validateSave,
} from "./engine";
import { skills } from "./data";
import {
  createExpedition,
  decodeSave,
  train,
  setMemberJob,
  memberUnit,
} from "./campaign";

test("Gloam pursuit previews the exposed bonus and consumes it only on a hit", () => {
  const s = createBattle(17);
  s.units[0].job = "shadowrunner";
  s.units[0].x = 5;
  s.units[0].z = 4;
  const a = s.units[0],
    v = s.units[4],
    plain = preview(s, a, v, skills.gloam).amount;
  v.status.exposed = 2;
  const amount = preview(s, a, v, skills.gloam).amount;
  assert.equal(amount, plain + 19);
  const next = command(s, { type: "skill", skill: "gloam", x: 6, z: 4 });
  assert.equal(next.units[4].hp, 100 - amount);
  assert.equal(next.units[4].status.exposed, 0);
  assert.equal(v.status.exposed, 2);
  assert.equal(next.units[0].mp, 23);
  const miss = structuredClone(s);
  for (let seed = 0; seed < 100000; seed++)
    if (
      (((Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 100 >
      preview(miss, a, v, skills.gloam).hit
    ) {
      miss.seed = seed;
      break;
    }
  const missed = command(miss, { type: "skill", skill: "gloam", x: 6, z: 4 });
  assert.equal(missed.units[4].hp, 100);
  assert.equal(missed.units[4].status.exposed, 2);
});
test("Oathguard protects living allies, clears burn, and survives a self-cast end turn", () => {
  let s = createBattle(17);
  s.units[0].job = "runewarden";
  s.units[3].status.burn = 2;
  assert(!canTarget(s, s.units[0], skills.aegis, 6, 4));
  s = command(s, { type: "skill", skill: "aegis", x: 1, z: 6 });
  assert(s.units[3].guard);
  assert.equal(s.units[3].status.burn, 0);
  assert.equal(s.units[0].mp, 24);
  for (let i = 0; i < 4 && s.active !== "mae"; i++)
    s = command(s, { type: "end" });
  assert.equal(s.active, "mae");
  assert(!s.units[3].guard);
  let self = createBattle();
  self.units[0].job = "runewarden";
  self = command(self, { type: "skill", skill: "aegis", x: 2, z: 5 });
  self = command(self, { type: "end" });
  assert(self.units[0].guard);
  const dead = createBattle();
  dead.units[0].job = "runewarden";
  dead.units[3].hp = 0;
  assert(!canTarget(dead, dead.units[0], skills.aegis, 1, 6));
  assert.equal(
    preview(dead, dead.units[0], dead.units[0], skills.aegis).amount,
    0,
  );
});
test("Rain of glass soaks a cross without damaging allies or changing terrain", () => {
  const s = createBattle(17);
  s.active = "ilya";
  s.units[1].x = 5;
  s.units[1].z = 3;
  s.units[3].x = 5;
  s.units[3].z = 4;
  const next = command(s, { type: "skill", skill: "raincall", x: 6, z: 4 });
  assert.equal(next.units[4].status.soaked, 3);
  assert.equal(next.units[7].status.soaked, 3);
  assert.equal(next.units[3].hp, s.units[3].hp);
  assert.equal(next.units[3].status.soaked, 0);
  assert.deepEqual(next.tiles, s.tiles);
  assert(preview(next, next.units[1], next.units[4], skills.surge).synergy);
  assert(validateSave(next));
});
test("Stolen hour delays surviving targets on hit without applying slow", () => {
  const s = createBattle(17);
  s.active = "ilya";
  s.units[1].job = "chronoweaver";
  s.units[1].x = 5;
  s.units[1].z = 4;
  const next = command(s, { type: "skill", skill: "delay", x: 6, z: 4 });
  assert.equal(next.units[4].next, s.units[4].next + 30);
  assert.equal(next.units[4].status.slow, 0);
  assert.equal(next.units[1].mp, 23);
  assert(validateSave(next));
  assert.deepEqual(
    next,
    command(s, { type: "skill", skill: "delay", x: 6, z: 4 }),
  );
  const haste = preview(s, s.units[1], s.units[1], skills.haste);
  assert.equal(haste.amount, 35);
});
test("advanced lessons are learned through camp and old v2 learned sets remain valid", () => {
  let g = createExpedition();
  g.company.members[0].jp.dancer = 120;
  g.company.members[0].jp.shadowrunner = 60;
  assert(
    !availableSkills(
      memberUnit({
        ...g.company.members[0],
        job: "arcanist",
        secondary: "shadowrunner",
      }),
    ).includes("gloam"),
  );
  g = train(g, "sera", "shadowrunner", "gloam");
  assert.equal(g.company.members[0].jpSpent.shadowrunner, 60);
  g = setMemberJob(g, "sera", "arcanist", "shadowrunner");
  assert(availableSkills(memberUnit(g.company.members[0])).includes("gloam"));
  const older = createExpedition();
  older.company.members[1].learned = ["surge", "frost"];
  assert(decodeSave({ game: older }));
  assert(
    !availableSkills(memberUnit(older.company.members[1])).includes("raincall"),
  );
});
test("AI can protect a threatened ally when offensive targets are out of range", () => {
  const s = createBattle(17);
  s.active = "sentinel";
  s.units[0].x = 7;
  s.units[0].z = 0;
  s.units.slice(1, 4).forEach((u) => (u.hp = 0));
  Object.assign(s.units[4], {
    x: 6,
    z: 5,
    job: "runewarden",
    secondary: "vanguard",
    learned: [],
    moved: true,
  });
  s.units[5].hp = 40;
  s.units[5].x = 6;
  s.units[5].z = 2;
  s.units[5].next = 60;
  const copy = structuredClone(s),
    next = aiTurn(s);
  assert(next.units[5].guard);
  assert(next.log.some((t) => t.includes("Oathguard")));
  assert.deepEqual(s, copy);
  assert.deepEqual(next, aiTurn(s));
});
