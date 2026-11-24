import { test } from "node:test";
import assert from "node:assert/strict";
import { equipment, type GearId } from "./equipment";
import {
  items,
  starterSupplies,
  sellValue,
  validateSupplies,
  validateItemCatalog,
  type ItemId,
} from "./items";
import {
  createExpedition,
  purchase,
  sellGear,
  tradeSupply,
  equip,
  depart,
  returnToCamp,
  retryContract,
  validateExpedition,
  decodeSave,
} from "./campaign";
import {
  command,
  canUseItem,
  activeUnit,
  reachable,
  validateSave,
} from "./engine";
import { gameRules, validateRules } from "./studio-rules";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  exportLevelProject,
  parseLevelProject,
  applyProjectEdits,
  travelProjectHistory,
} from "./studio-project";
import { planCombatEffect } from "./combat-effects";
import { MISSION_PRESETS } from "./mission-presets";

function field() {
  const camp = createExpedition();
  camp.company.supplies = Object.fromEntries(
    Object.keys(items).map((id) => [id, 3]),
  );
  const game = depart(camp, "shrine"),
    b = game.battle,
    actor = activeUnit(b),
    ally = b.units.find((u) => u.id === "ilya")!;
  ally.x = actor.x + 1;
  ally.z = actor.z;
  return { game, b, actor, ally };
}

test("expanded stock has twelve optional gear records and six actionable supplies", () => {
  const g = createExpedition();
  assert.equal(Object.keys(equipment).length, 22);
  assert.equal(Object.keys(items).length, 6);
  assert.deepEqual(g.company.supplies, starterSupplies());
  assert(validateExpedition(g));
  for (const item of [...Object.values(equipment), ...Object.values(items)])
    assert(sellValue(item) <= item.price);
});

test("quantity gear buying and spare-copy selling preserve allocation, gold and inputs", () => {
  const g = createExpedition(),
    original = structuredClone(g);
  assert.equal(sellGear(g, "leather"), g);
  const bought = purchase(g, "leather", 3);
  assert.equal(bought.company.gold, 35);
  assert.equal(bought.company.inventory.leather, 7);
  const sold = sellGear(bought, "leather", 2);
  assert.equal(sold.company.gold, 69);
  assert.equal(sold.company.inventory.leather, 5);
  assert(validateExpedition(sold));
  assert.deepEqual(g, original);
  assert.equal(sellGear(sold, "leather", 2), sold);
});

test("equipped copies and reward-only relics cannot be sold; legitimate unequipped camp copies can", () => {
  let g = depart(createExpedition(), "shrine");
  g.battle.result = "defeat";
  g = returnToCamp(g);
  assert.equal(sellGear(g, "ironblade"), g);
  g = equip(g, "sera", "weapon", null);
  const sold = sellGear(g, "ironblade");
  assert.equal(sold.company.inventory.ironblade, 0);
  assert(validateExpedition(sold));
  g.company.inventory.crownseal = 1;
  assert.equal(sellGear(g, "crownseal"), g);
  assert.equal(purchase(g, "crownseal"), g);
});

test("trades reject malformed quantities, unknown records, insufficient stock, caps and battle use atomically", () => {
  const g = createExpedition();
  for (const n of [-1, 0, 1.5, 100, NaN, Infinity]) {
    assert.equal(purchase(g, "leather", n), g);
    assert.equal(sellGear(g, "wayboots", n), g);
    assert.equal(tradeSupply(g, "field-tonic", "buy", n), g);
    assert.equal(tradeSupply(g, "field-tonic", "sell", n), g);
  }
  assert.equal(purchase(g, "custom-missing"), g);
  assert.equal(sellGear(g, "custom-missing"), g);
  assert.equal(tradeSupply(g, "custom-missing", "buy"), g);
  assert.equal(purchase(g, "lamellar", 2), g);
  const capped = structuredClone(g);
  capped.company.inventory.leather = 99;
  capped.company.supplies = { "field-tonic": 99 };
  assert.equal(purchase(capped, "leather"), capped);
  assert.equal(tradeSupply(capped, "field-tonic", "buy"), capped);
  const battle = depart(g, "shrine");
  assert.equal(purchase(battle, "leather"), battle);
  assert.equal(sellGear(battle, "wayboots"), battle);
  assert.equal(tradeSupply(battle, "field-tonic", "sell"), battle);
});

test("supply buy and sell cycles cannot mint gold or exceed safe integer wallets", () => {
  const g = createExpedition(),
    bought = tradeSupply(g, "field-tonic", "buy", 2),
    sold = tradeSupply(bought, "field-tonic", "sell", 2);
  assert.equal(bought.company.gold, 90);
  assert.equal(bought.company.supplies!["field-tonic"], 5);
  assert.equal(sold.company.gold, 114);
  assert.equal(sold.company.supplies!["field-tonic"], 3);
  assert(validateExpedition(sold));
  const full = structuredClone(g);
  full.company.gold = Number.MAX_SAFE_INTEGER;
  assert.equal(tradeSupply(full, "field-tonic", "sell"), full);
  assert.equal(sellGear(full, "wayboots"), full);
});

test("editable buybacks are bounded by purchase price and legacy catalogs remain valid", () => {
  const r = gameRules();
  r.gear.leather.sellPrice = 10;
  r.items!["field-tonic"].sellPrice = 5;
  assert.deepEqual(validateRules(r), r);
  for (const v of [-1, 36, 1.5]) {
    const bad = structuredClone(r);
    bad.gear.leather.sellPrice = v;
    assert.throws(() => validateRules(bad));
  }
  const legacy = structuredClone(r);
  delete legacy.items;
  for (const id of Object.keys(legacy.gear) as GearId[])
    if (id.startsWith("custom-")) delete legacy.gear[id];
  assert.equal(Object.keys(validateRules(legacy).gear).length, 10);
  const p = createLevelProject();
  p.rules = legacy;
  delete p.supplies;
  assert.deepEqual(parseLevelProject(exportLevelProject(p)), p);
});

test("tonics consume one action/copy, clamp HP, preserve RNG and JP and allow a separate move", () => {
  const { b, actor, ally } = field();
  ally.hp -= 20;
  const before = structuredClone(b),
    next = command(b, {
      type: "item",
      item: "field-tonic",
      x: ally.x,
      z: ally.z,
    });
  assert.equal(next.units.find((u) => u.id === ally.id)!.hp, ally.maxHp);
  assert.equal(next.supplies!["field-tonic"], 2);
  assert(next.units.find((u) => u.id === actor.id)!.acted);
  assert(!next.units.find((u) => u.id === actor.id)!.moved);
  assert.equal(next.seed, b.seed);
  assert.deepEqual(next.units.find((u) => u.id === actor.id)!.jp, actor.jp);
  assert.equal(
    command(next, { type: "item", item: "field-tonic", x: ally.x, z: ally.z }),
    next,
  );
  const destination = [...reachable(next, activeUnit(next))].find(
    ([key]) => key !== `${actor.x},${actor.z}`,
  )!;
  const [x, z] = destination[0].split(",").map(Number);
  assert.notEqual(command(next, { type: "move", x, z }), next);
  assert(validateSave(next));
  assert.deepEqual(b, before);
});

test("energy medicine, cleansing salts and revival have distinct supported effects", () => {
  for (const id of ["ether-draught", "deep-ether"] as ItemId[]) {
    const { b, ally } = field();
    ally.mp = 0;
    const n = command(b, { type: "item", item: id, x: ally.x, z: ally.z });
    assert.equal(
      n.units.find((u) => u.id === ally.id)!.mp,
      Math.min(ally.maxMp, items[id].power),
    );
    assert(validateSave(n));
  }
  const { b, ally } = field();
  ally.status = { burn: 2, slow: 2, exposed: 2, soaked: 2 };
  ally.hp -= 10;
  const clean = command(b, {
      type: "item",
      item: "cleansing-salts",
      x: ally.x,
      z: ally.z,
    }),
    v = clean.units.find((u) => u.id === ally.id)!;
  assert.deepEqual(v.status, { burn: 0, slow: 0, exposed: 0, soaked: 0 });
  assert.equal(v.hp, ally.hp);
  assert(!v.guard);
  ally.hp = 0;
  const revived = command(b, {
    type: "item",
    item: "phoenix-seed",
    x: ally.x,
    z: ally.z,
  });
  assert.equal(revived.units.find((u) => u.id === ally.id)!.hp, 30);
  assert(validateSave(revived));
});

test("items reject useless targets, enemies, fallen tonic targets, empty stock and out-of-reach targets", () => {
  const { b, actor, ally } = field(),
    enemy = b.units.find((u) => u.team === "enemy")!;
  assert(!canUseItem(b, actor, "field-tonic", ally.x, ally.z));
  assert(!canUseItem(b, actor, "cleansing-salts", ally.x, ally.z));
  assert(!canUseItem(b, actor, "phoenix-seed", ally.x, ally.z));
  ally.hp = 0;
  assert(!canUseItem(b, actor, "field-tonic", ally.x, ally.z));
  assert(!canUseItem(b, actor, "ether-draught", ally.x, ally.z));
  assert.equal(
    command(b, { type: "item", item: "field-tonic", x: enemy.x, z: enemy.z }),
    b,
  );
  ally.hp = 1;
  ally.x = 8;
  ally.z = 8;
  assert(!canUseItem(b, actor, "field-tonic", 8, 8));
  assert.equal(
    command(b, {
      type: "item",
      item: "custom-missing",
      x: actor.x,
      z: actor.z,
    }),
    b,
  );
  b.supplies!["field-tonic"] = 0;
  actor.hp--;
  assert(!canUseItem(b, actor, "field-tonic", actor.x, actor.z));
});

test("used supplies survive retry, defeat settlement and save roundtrip without a refund", () => {
  const { game, b, ally } = field();
  ally.hp -= 50;
  game.battle = command(b, {
    type: "item",
    item: "field-tonic",
    x: ally.x,
    z: ally.z,
  });
  const retried = retryContract(game);
  assert.equal(retried.company.supplies!["field-tonic"], 2);
  assert.equal(retried.battle.supplies!["field-tonic"], 2);
  assert(validateExpedition(retried));
  game.battle.result = "defeat";
  const camp = returnToCamp(game);
  assert.equal(camp.company.supplies!["field-tonic"], 2);
  assert(validateExpedition(camp));
  const restored = decodeSave(JSON.parse(JSON.stringify({ game: camp })))!.game;
  assert.deepEqual(restored, JSON.parse(JSON.stringify(camp)));
  const forged = structuredClone(retried);
  forged.battle.supplies!["field-tonic"] = 3;
  assert(!validateExpedition(forged));
});

test("legacy v2 saves without supplies remain valid and do not receive free inventory", () => {
  const g = createExpedition();
  delete g.company.supplies;
  delete g.battle.supplies;
  assert(validateExpedition(g));
  const next = depart(g, "shrine");
  assert.deepEqual(next.battle.supplies, {});
  assert(validateExpedition(next));
});

test("item definition and quantity validation rejects malformed or unsupported mechanics", () => {
  for (const stock of [
    [],
    null,
    { unknown: 1 },
    { "field-tonic": 100 },
    { "field-tonic": -1 },
    { "field-tonic": 1.5 },
  ])
    assert.throws(() => validateSupplies(stock));
  for (const patch of [
    { effect: "damage" },
    { range: 4 },
    { power: 0 },
    { price: -1 },
    { sellPrice: 26 },
    { power: NaN },
    { script: "alert(1)" },
  ])
    assert.throws(() =>
      validateItemCatalog({
        ...items,
        "field-tonic": { ...items["field-tonic"], ...patch },
      }),
    );
});

test("custom item definitions and starting quantities are reversible portable Studio sources", () => {
  const p = createLevelProject(),
    rules = gameRules();
  rules.items!["custom-moss-tea"] = {
    ...items["field-tonic"],
    id: "custom-moss-tea",
    name: "Moss tea",
    power: 20,
    price: 15,
  };
  const h = applyProjectEdits({ project: p, past: [], future: [] }, [
    { type: "rules", rules },
    { type: "supplies", supplies: { "custom-moss-tea": 2 } },
  ]);
  const parsed = parseLevelProject(exportLevelProject(h.project));
  assert.equal(compileLevelProject(parsed).supplies!["custom-moss-tea"], 2);
  assert.deepEqual(
    travelProjectHistory(h, "undo").project.supplies,
    p.supplies,
  );
  assert.deepEqual(
    travelProjectHistory(travelProjectHistory(h, "undo"), "redo").project
      .supplies,
    parsed.supplies,
  );
  const broken = structuredClone(parsed);
  delete broken.rules!.items!["custom-moss-tea"];
  assert.throws(() => exportLevelProject(broken));
});

test("every canonical mission compiles supply stock and item visuals stay single-target despite Mend area edits", () => {
  for (const preset of MISSION_PRESETS) {
    const p = editProject(createLevelProject(), 0, [
      { type: "mission-preset", preset: preset.id },
    ]);
    assert.deepEqual(compileLevelProject(p).supplies, starterSupplies());
  }
  const { b, ally } = field();
  b.rules = gameRules();
  b.rules.skills.mend.radius = 4;
  ally.hp -= 20;
  const n = command(b, {
    type: "item",
    item: "field-tonic",
    x: ally.x,
    z: ally.z,
  });
  assert.equal(planCombatEffect(n.lastAction!, n)!.tiles.length, 1);
  assert(validateSave(n));
});
