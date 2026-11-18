import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createExpedition,
  depart,
  returnToCamp,
  retryContract,
  train,
  setMemberJob,
  equip,
  purchase,
  memberUnit,
  spendableJP,
  allocated,
  validateExpedition,
  migrateLegacyBattle,
  decodeSave,
} from "./campaign";
import {
  activeUnit,
  aiTurn,
  availableSkills,
  command,
  createBattle,
  reachable,
  key,
  preview,
  unitStats,
  validateSave,
} from "./engine";
import { encounters, type EncounterId } from "./encounters";
import { skills, jobLevel } from "./data";

test("a fresh company has legal shared equipment and a gated contract route", () => {
  const g = createExpedition();
  assert(validateExpedition(g));
  assert.equal(g.stage, "camp");
  assert.equal(g.company.gold, 140);
  assert.equal(allocated(g.company, "leather"), 4);
  assert.equal(depart(g, "causeway"), g);
  const next = depart(g, "shrine");
  assert.equal(next.stage, "battle");
  assert.equal(next.company.deployments, 1);
  assert(validateExpedition(next));
  assert.equal(g.stage, "camp");
  assert.equal(next.battle.units[0].maxHp, 116);
});
test("learning spends per-job JP, preserves unlock levels, and becomes a secondary skill", () => {
  let g = createExpedition();
  const m = g.company.members[0];
  m.jp.vanguard = 120;
  const before = structuredClone(g);
  g = train(g, m.id, "vanguard", "cleave");
  assert.equal(spendableJP(g.company.members[0], "vanguard"), 60);
  assert.equal(jobLevel(g.company.members[0].jp.vanguard!), 3);
  assert.deepEqual(before.company.members[0].learned, ["mend"]);
  assert.equal(train(g, m.id, "vanguard", "cleave"), g);
  g = setMemberJob(g, m.id, "arcanist", "vanguard");
  const u = memberUnit(g.company.members[0]);
  assert(availableSkills(u).includes("cleave"));
  assert(availableSkills(u).includes("ember"));
  assert.equal(train(g, m.id, "arcanist", "ember"), g);
  assert.equal(
    train(depart(g, "shrine"), m.id, "vanguard", "cleave").stage,
    "battle",
  );
});
test("unlearned secondary skills are unavailable while primary skills stay native", () => {
  let g = createExpedition();
  g = setMemberJob(g, "sera", "lifebinder", "arcanist");
  const u = memberUnit(g.company.members[0]);
  assert(availableSkills(u).includes("mend"));
  assert(!availableSkills(u).includes("ember"));
  assert(!availableSkills(u).includes("frost"));
});
test("shared gear cannot be duplicated or assigned outside proficiency", () => {
  let g = createExpedition();
  g = equip(g, "sera", "relic", "wayboots");
  assert.equal(allocated(g.company, "wayboots"), 1);
  assert.equal(equip(g, "corin", "relic", "wayboots"), g);
  assert.equal(equip(g, "ilya", "weapon", "ironblade"), g);
  g = equip(g, "sera", "relic", null);
  g = equip(g, "corin", "relic", "wayboots");
  assert.equal(g.company.members[2].equipment.relic, "wayboots");
  const before = structuredClone(g);
  g = setMemberJob(g, "sera", "arcanist", "lifebinder");
  assert.equal(g.company.members[0].equipment.weapon, null);
  assert.equal(before.company.members[0].equipment.weapon, "ironblade");
  assert(validateExpedition(g));
});
test("shop purchases preserve gold and inventory invariants", () => {
  let g = createExpedition();
  const old = structuredClone(g);
  g = purchase(g, "lamellar");
  assert.equal(g.company.gold, 45);
  assert.equal(g.company.inventory.lamellar, 1);
  assert.equal(purchase(g, "watchcharm"), g);
  assert.deepEqual(old.company.inventory.lamellar, undefined);
  g = equip(g, "sera", "armor", "lamellar");
  assert.equal(unitStats(memberUnit(g.company.members[0])).move, 2);
  assert.equal(unitStats(memberUnit(g.company.members[0])).armor, 13);
  assert(validateExpedition(g));
});
test("equipment affects actual movement, damage, health and initiative", () => {
  let g = createExpedition();
  g = equip(g, "sera", "relic", "wayboots");
  g = depart(g, "shrine");
  const a = g.battle.units[0];
  assert.equal(unitStats(a).move, 4);
  assert.equal(unitStats(a).attack, 13);
  assert.equal(a.maxHp, 116);
  assert.equal(reachable(g.battle, a).get(key(3, 3)), 3);
  const b = g.battle.units[4];
  b.x = 3;
  b.z = 5;
  const damage = preview(g.battle, a, b, skills.strike).amount;
  a.equipment.weapon = null;
  assert.equal(preview(g.battle, a, b, skills.strike).amount, damage - 4);
  a.equipment.relic = "watchcharm";
  const ended = command(g.battle, { type: "end" });
  assert.equal(ended.units[0].next, 83);
});
test("victory settlement carries field JP and pays a contract once", () => {
  let g = depart(createExpedition(), "shrine");
  g.battle.units[0].jp.vanguard = 130;
  g.battle.result = "victory";
  const settled = returnToCamp(g);
  assert.equal(settled.stage, "camp");
  assert.equal(settled.company.gold, 200);
  assert.equal(settled.company.members[0].jp.vanguard, 130);
  assert.deepEqual(settled.company.completed, ["shrine"]);
  assert.equal(returnToCamp(settled), settled);
  const next = depart(settled, "causeway");
  assert.equal(next.battle.encounter, "causeway");
  assert.equal(next.battle.units[0].jp.vanguard, 130);
  assert.equal(next.battle.units[0].hp, next.battle.units[0].maxHp);
  assert(validateExpedition(next));
});
test("defeat preserves earned field JP without rewards; retry restores deployment roster", () => {
  let g = depart(createExpedition(), "shrine");
  g.battle.units[0].jp.vanguard = 50;
  const retry = retryContract(g);
  assert.equal(retry.battle.units[0].jp.vanguard, 0);
  assert.equal(retry.company.gold, 140);
  g.battle.result = "defeat";
  const camp = returnToCamp(g);
  assert.equal(camp.company.members[0].jp.vanguard, 50);
  assert.equal(camp.company.gold, 140);
  assert.equal(camp.company.completed.length, 0);
  assert(validateExpedition(camp));
});
test("legacy v1 saves migrate without changing combat resources, readiness or RNG", () => {
  const raw: any = structuredClone(createBattle(91));
  raw.version = 1;
  delete raw.encounter;
  raw.turn = 9;
  raw.active = "ilya";
  raw.units[1].hp = 43;
  raw.units[1].mp = 17;
  raw.units.forEach((u: any) => {
    delete u.baseHp;
    delete u.equipment;
    delete u.learned;
    delete u.jpSpent;
  });
  const copy = structuredClone(raw),
    g = migrateLegacyBattle(raw)!;
  assert(g);
  assert(validateExpedition(g));
  assert.equal(g.battle.units[1].hp, 43);
  assert.equal(g.battle.units[1].mp, 17);
  assert.equal(g.battle.seed, 91);
  assert.equal(g.battle.active, "ilya");
  assert.deepEqual(raw, copy);
  assert.equal(decodeSave({ battle: raw })?.migrated, true);
  assert.equal(decodeSave({ game: g })?.migrated, false);
  assert.equal(migrateLegacyBattle({ ...raw, units: [] }), null);
});
test("current save validation rejects missing learning data, invalid gear, and overspent JP", () => {
  const g = createExpedition();
  assert(validateExpedition(g));
  const bad = structuredClone(g);
  bad.company.members[0].jpSpent.vanguard = 60;
  assert(!validateExpedition(bad));
  const other = structuredClone(g);
  other.company.inventory.leather = 0;
  assert(!validateExpedition(other));
  const battle: any = createBattle();
  delete battle.units[0].learned;
  assert(!validateSave(battle));
  const prototypeId: any = createBattle();
  prototypeId.units[4].job = "constructor";
  assert(!validateSave(prototypeId));
  prototypeId.units[4].job = "vanguard";
  prototypeId.units[4].id = 99;
  assert(!validateSave(prototypeId));
  assert.equal(decodeSave(null), null);
});
test("each contract has a distinct legal board and a deterministic complete battle", () => {
  const ids = Object.keys(encounters) as EncounterId[];
  const signatures = new Set<string>();
  for (const id of ids) {
    const fresh = createBattle(143, id);
    assert(validateSave(fresh));
    assert.equal(new Set(fresh.units.map((u) => key(u.x, u.z))).size, 8);
    assert(
      fresh.units.every(
        (u) => !fresh.tiles.find((t) => t.x === u.x && t.z === u.z)!.blocked,
      ),
    );
    signatures.add(JSON.stringify(fresh.tiles));
    function simulate() {
      let s = structuredClone(fresh);
      for (let i = 0; i < 500 && s.result === "playing"; i++) {
        if (activeUnit(s).team === "ally") {
          const t = structuredClone(s);
          t.units.forEach(
            (u) => (u.team = u.team === "ally" ? "enemy" : "ally"),
          );
          s = aiTurn(t);
          s.units.forEach(
            (u) => (u.team = u.team === "ally" ? "enemy" : "ally"),
          );
          if (s.result === "victory") s.result = "defeat";
          else if (s.result === "defeat") s.result = "victory";
        } else s = aiTurn(s);
        if (s.result === "playing") assert(activeUnit(s).hp > 0);
      }
      assert.notEqual(s.result, "playing", id + " must terminate");
      return s;
    }
    assert.deepEqual(simulate(), simulate());
  }
  assert.equal(signatures.size, ids.length);
});

test("the belfry unlocks after the redoubt and grants its relic on the first clear only", () => {
  let g = createExpedition();
  assert.equal(depart(g, "bellkeeper"), g);
  g.company.completed = ["shrine", "causeway", "redoubt"];
  g = depart(g, "bellkeeper");
  assert.equal(g.battle.units[4].name, "Orren, Bellkeeper");
  g.battle.result = "victory";
  const camp = returnToCamp(g);
  assert.equal(camp.company.gold, 280);
  assert.equal(camp.company.inventory.crownseal, 1);
  assert.equal(purchase(camp, "crownseal"), camp);
  const equipped = equip(camp, "sera", "relic", "crownseal");
  assert.equal(unitStats(memberUnit(equipped.company.members[0])).magic, 3);
  assert.equal(unitStats(memberUnit(equipped.company.members[0])).armor, 12);
  assert(validateExpedition(equipped));
  const again = depart(equipped, "bellkeeper");
  again.battle.result = "victory";
  const replay = returnToCamp(again);
  assert.equal(replay.company.gold, 420);
  assert.equal(replay.company.inventory.crownseal, 1);
  assert.equal(returnToCamp(replay), replay);
});

test("Orren awakens once at half health, and the saved phase survives reload", () => {
  let s = createBattle(17, "bellkeeper");
  const boss = s.units[4];
  boss.hp = 84;
  boss.mp = 3;
  boss.status.burn = 2;
  boss.status.slow = 2;
  const next = boss.next;
  s = command(s, { type: "end" });
  const awakened = s.units[4];
  assert.equal(s.bossAwakened, true);
  assert.equal(awakened.hp, 84);
  assert.equal(awakened.mp, 48);
  assert.equal(awakened.status.burn, 0);
  assert.equal(awakened.status.slow, 0);
  assert.equal(awakened.next, Math.max(0, next - 25));
  assert.equal(awakened.equipment.relic, "watchcharm");
  assert(validateSave(s));
  const restored = JSON.parse(JSON.stringify(s));
  restored.units[4].mp = 5;
  const second = command(restored, { type: "end" });
  assert.equal(second.units[4].mp, 5);
  assert.equal(
    second.log.filter((t) => t.startsWith("Orren breaks")).length,
    1,
  );
  assert.equal(s.units[0].hp, 112);
  const bad: any = structuredClone(s);
  bad.bossAwakened = "yes";
  assert(!validateSave(bad));
});

test("lethal damage does not awaken a fallen boss and older v2 saves remain accepted", () => {
  let s = createBattle(18, "bellkeeper");
  s.units[4].hp = 0;
  s = command(s, { type: "end" });
  assert(!s.bossAwakened);
  const g = createExpedition();
  delete g.battle.bossAwakened;
  assert(validateExpedition(g));
  assert.equal(decodeSave({ game: g })?.migrated, false);
});
