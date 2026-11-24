import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { MISSION_PRESETS } from "../src/mission-presets";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  exportLevelProject,
  parseLevelProject,
} from "../src/studio-project";
import {
  activeUnit,
  aiTurn,
  aiCandidateTiles,
  availableSkills,
  command,
  validateSave,
  unitStats,
} from "../src/engine";
import { planCombatEffect } from "../src/combat-effects";
import { abilitySoundEvents } from "../src/studio-assets";
import { previewExpedition } from "../src/studio-authoring";
import { returnToCamp, validateExpedition } from "../src/campaign";
import { emptyLoadout } from "../src/equipment";
import { items as shippedItems } from "../src/items";
import { baseSkillId } from "../src/data";
const effects = JSON.parse(
  readFileSync("public/art/effects/manifest.json", "utf8"),
);
const missions = MISSION_PRESETS.map((preset) => {
  const p = editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: preset.id },
  ]);
  p.id = preset.id + "-mission";
  const original = exportLevelProject(p),
    initial = compileLevelProject(p);
  const abilities = Object.values(p.rules!.skills).map((skill) => {
    // Isolate each catalog entry on a legal training field, using its actual class binding.
    const b = structuredClone(initial),
      caster = b.units[0],
      ally = b.units[1],
      enemy = b.units.find((u) => u.team === "enemy")!;
    b.tiles.forEach((t) =>
      Object.assign(t, { terrain: "stone", h: 0, blocked: false, burn: 0 }),
    );
    b.units.forEach((u, i) => {
      u.x = i;
      u.z = 0;
    });
    caster.x = 4;
    caster.z = 4;
    ally.x = 5;
    ally.z = 4;
    enemy.x = 6;
    enemy.z = 4;
    const owner = Object.values(b.rules!.jobs).find((j) =>
      j.skills.includes(skill.id),
    );
    assert(
      owner || skill.id === "strike" || skill.id === "rally",
      `${preset.id}: unassigned ability ${skill.id}`,
    );
    caster.job = owner?.id ?? "vanguard";
    caster.equipment = emptyLoadout();
    caster.maxHp = unitStats(caster, b.rules).hp;
    caster.hp = caster.maxHp;
    caster.maxMp = caster.mp = 99;
    caster.moved = caster.acted = false;
    b.active = caster.id;
    b.momentum = 3;
    const target = skill.kind === "damage" ? enemy : ally;
    if (skill.range < Math.abs(caster.x - target.x)) target.x = caster.x + 1;
    if (skill.range === 0) {
      target.x = skill.kind === "damage" ? enemy.x : caster.x;
      target.z = caster.z;
    }
    if (skill.kind === "heal") target.hp = Math.max(1, target.hp - 25);
    assert(availableSkills(caster, b.rules).includes(skill.id));
    const n = command(b, {
      type: "skill",
      skill: skill.id,
      x: target.x,
      z: target.z,
    });
    assert.equal(
      n.lastAction?.skill,
      skill.id,
      `${preset.id}: cannot execute ${skill.id}`,
    );
    assert.equal(n.units.find((u) => u.id === caster.id)!.mp, 99 - skill.cost);
    assert(validateSave(n), `${preset.id}: invalid result for ${skill.id}`);
    const plan = planCombatEffect(n.lastAction!, n, p.abilityCues)!;
    assert(plan && effects.sheets[plan.recipe.atlas]);
    assert(plan.recipe.clip >= 0 && plan.recipe.clip < 4);
    assert(plan.recipe.frameMs > 0 && Number.isFinite(plan.recipe.size));
    assert(
      abilitySoundEvents(undefined, n.lastAction, p.abilityCues).length > 0,
    );
    return {
      id: skill.id,
      mechanic: baseSkillId(skill.id, p.rules!.skills),
      family: plan.skill,
      atlas: plan.recipe.atlas,
      clip: plan.recipe.clip,
      frames: 8,
      executable: true,
      feedbackEditable: true,
      appearanceOverride: !!p.abilityCues?.[skill.id]?.style,
    };
  });
  let exhaustiveAimTiles = 0,
    candidateAimTiles = 0;
  for (const u of initial.units)
    for (const id of availableSkills(u, initial.rules)) {
      const sk = initial.rules!.skills[id];
      if (baseSkillId(id, initial.rules!.skills) === "rally" || u.mp < sk.cost)
        continue;
      exhaustiveAimTiles += initial.tiles.length;
      candidateAimTiles += aiCandidateTiles(initial, u, sk).length;
    }
  const itemCases = Object.values(p.rules!.items ?? shippedItems).map(
    (item) => {
      const b = structuredClone(initial),
        actor = b.units[0],
        ally = b.units[1];
      b.tiles.forEach((t) =>
        Object.assign(t, { terrain: "stone", h: 0, blocked: false, burn: 0 }),
      );
      b.units.forEach((u, i) => {
        u.x = i;
        u.z = 0;
      });
      actor.x = 4;
      actor.z = 4;
      ally.x = 5;
      ally.z = 4;
      b.active = actor.id;
      const target = item.range === 0 ? actor : ally;
      if (item.effect === "heal") target.hp = Math.max(1, target.maxHp - 20);
      if (item.effect === "energy") target.mp = 0;
      if (item.effect === "cleanse") target.status.burn = 2;
      if (item.effect === "revive") target.hp = 0;
      b.supplies = { [item.id]: 1 };
      const n = command(b, {
        type: "item",
        item: item.id,
        x: target.x,
        z: target.z,
      });
      assert.equal(n.lastAction?.item, item.id);
      assert.equal(n.supplies![item.id], 0);
      assert(n.units.find((u) => u.id === actor.id)!.acted);
      assert.equal(n.seed, b.seed);
      assert(validateSave(n));
      assert.equal(planCombatEffect(n.lastAction!, n)!.tiles.length, 1);
      return {
        id: item.id,
        effect: item.effect,
        executable: true,
        consumesCopyAndAction: true,
      };
    },
  );
  const simulations = [74319, 9001, 42].map((seed) => {
    let b = compileLevelProject({ ...p, seed }),
      activations = 0;
    for (; activations < 400 && b.result === "playing"; activations++) {
      if (activeUnit(b).team === "ally") {
        let t = structuredClone(b);
        t.units.forEach((u) => (u.team = u.team === "ally" ? "enemy" : "ally"));
        t = aiTurn(t);
        t.units.forEach((u) => (u.team = u.team === "ally" ? "enemy" : "ally"));
        if (t.result === "victory") t.result = "defeat";
        else if (t.result === "defeat") t.result = "victory";
        b = t;
      } else b = aiTurn(b);
      assert(
        validateSave(b),
        `${preset.id}: invalid intermediate save at ${activations}`,
      );
    }
    assert.notEqual(
      b.result,
      "playing",
      `${preset.id}: stalled at seed ${seed}`,
    );
    return {
      seed,
      result: b.result,
      activations,
      survivingAllies: b.units.filter((u) => u.team === "ally" && u.hp > 0)
        .length,
    };
  });
  // Settlement is a separate check; an artificial victory is not a simulated human clear.
  const rewardBattle = structuredClone(initial);
  rewardBattle.units
    .filter((u) => u.team === "enemy")
    .forEach((u) => (u.hp = 0));
  rewardBattle.result = "victory";
  const expedition = previewExpedition(rewardBattle),
    settled = returnToCamp(expedition, p.content!.contracts);
  assert(validateExpedition(settled));
  assert.equal(
    settled.company.gold,
    expedition.company.gold + p.content!.contracts[p.encounter!].reward,
  );
  assert.deepEqual(returnToCamp(settled, p.content!.contracts), settled);
  assert.equal(exportLevelProject(p), original);
  assert.deepEqual(parseLevelProject(original), p);
  return {
    id: preset.id,
    name: p.name,
    abilities,
    itemCases,
    simulations,
    aimChecks: {
      exhaustiveAimTiles,
      candidateAimTiles,
      reductionPercent:
        Math.round((1 - candidateAimTiles / exhaustiveAimTiles) * 1000) / 10,
    },
    rewardSettlement: "valid and idempotent",
    sourceRoundtrip: "unchanged",
  };
});
const report = {
  version: 1,
  scope:
    "Canonical Studio sources; controlled AI and isolated ability fixtures, not human balance certification",
  missions: missions.length,
  simulations: missions.length * 3,
  executableAbilityCases: missions.reduce((n, m) => n + m.abilities.length, 0),
  executableItemCases: missions.reduce((n, m) => n + m.itemCases.length, 0),
  effectAtlases: Object.keys(effects.sheets).length,
  effectFrames: 96,
  results: missions,
};
const output = JSON.stringify(report, null, 2) + "\n",
  path = "docs/PLAYABILITY_REPORT.json";
if (process.argv.includes("--check"))
  assert.equal(
    readFileSync(path, "utf8"),
    output,
    "Playability report is stale; run npm run content:playtest",
  );
else writeFileSync(path, output);
console.log(
  `Verified ${report.missions} missions / ${report.simulations} terminal simulations / ${report.executableAbilityCases} ability commands / ${report.executableItemCases} item commands and editable sources`,
);
