import { test } from "node:test";
import assert from "node:assert/strict";
import { MISSION_PRESETS } from "./mission-presets";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  applyProjectEdits,
  travelProjectHistory,
  exportLevelProject,
  parseLevelProject,
} from "./studio-project";
import {
  aiCandidateTiles,
  aiPreferredRange,
  hasLightningFollowup,
  availableSkills,
  canTarget,
  distance,
  command,
} from "./engine";
import { baseSkillId } from "./data";
import { validateEffectStyle } from "./effect-style";
import { validateAbilityCues, abilitySoundEvents } from "./studio-assets";
import {
  planCombatEffect,
  resolveEffectRecipe,
  recipeFrame,
  effectRecipes,
} from "./combat-effects";
const mission = () =>
  editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: "briar-resonance" },
  ]);

test("AI candidate pruning keeps every useful legal aim in original tile order across all mission catalogs", () => {
  for (const preset of MISSION_PRESETS) {
    const b = compileLevelProject(
      editProject(createLevelProject(), 0, [
        { type: "mission-preset", preset: preset.id },
      ]),
    );
    for (const u of b.units)
      for (const id of availableSkills(u, b.rules)) {
        const skill = b.rules!.skills[id],
          candidates = aiCandidateTiles(b, u, skill);
        const expected = b.tiles.filter(
          (t) =>
            canTarget(b, u, skill, t.x, t.z) &&
            b.units.some(
              (v) =>
                distance(v, t) <= skill.radius &&
                (skill.kind === "damage"
                  ? v.team !== u.team && v.hp > 0
                  : v.team === u.team && (skill.kind === "heal" || v.hp > 0)),
            ),
        );
        assert.deepEqual(
          candidates.filter((t) => canTarget(b, u, skill, t.x, t.z)),
          expected,
          preset.id + ":" + id,
        );
        assert.deepEqual(
          candidates,
          b.tiles.filter((t) => candidates.includes(t)),
        );
      }
  }
});

test("AI candidate pruning handles dead allies, empty area centers, edge radii, no energy and acted units", () => {
  const b = compileLevelProject(mission()),
    u = b.units[0],
    enemy = b.units[4];
  enemy.x = 12;
  enemy.z = 10;
  const cross = { ...b.rules!.skills.ember, radius: 4 };
  assert(aiCandidateTiles(b, u, cross).some((t) => t.x === 11 && t.z === 10));
  const ally = b.units[1];
  ally.hp = 0;
  assert(
    aiCandidateTiles(b, u, b.rules!.skills.mend).some(
      (t) => t.x === ally.x && t.z === ally.z,
    ),
  );
  assert(
    !aiCandidateTiles(b, u, b.rules!.skills.aegis).some(
      (t) => t.x === ally.x && t.z === ally.z,
    ),
  );
  assert.deepEqual(aiCandidateTiles(b, { ...u, mp: 0 }, cross), []);
  assert.deepEqual(aiCandidateTiles(b, { ...u, acted: true }, cross), []);
});

test("custom casters and ranged physical classes keep their intended AI distance", () => {
  const b = compileLevelProject(mission());
  assert.equal(aiPreferredRange(b, b.units[0]), 3);
  assert.equal(aiPreferredRange(b, b.units[1]), 3);
  const ranger = { ...b.units[0], job: "custom-glass-ranger" as const };
  assert.equal(aiPreferredRange(b, ranger), 3);
  assert.equal(aiPreferredRange(b, { ...ranger, mp: 0 }), 1);
  assert.equal(aiPreferredRange(b, { ...ranger, job: "vanguard" }), 1);
});

test("soaking follow-up recognizes scoped lightning skills with their own cost reach and line of sight", () => {
  const b = compileLevelProject(mission()),
    rowan = b.units[0],
    smith = b.units[1],
    target = b.units[4];
  smith.x = 6;
  smith.z = 9;
  target.x = 8;
  target.z = 9;
  // The Smith has Anvil peal, not the built-in Surge identity.
  assert(!availableSkills(smith, b.rules).includes("surge"));
  assert(hasLightningFollowup(b, rowan, target));
  smith.mp = 7;
  assert(!hasLightningFollowup(b, rowan, target));
  smith.mp = 8;
  target.x = 10;
  assert(!hasLightningFollowup(b, rowan, target));
  target.x = 8;
  b.tiles.find((t) => t.x === 7 && t.z === 9)!.blocked = true;
  assert(!hasLightningFollowup(b, rowan, target));
});

test("optional effect appearance preserves legacy pairs and strictly rejects malformed overrides", () => {
  const pair = { strike: { effect: "ember" as const, sound: "hit" as const } };
  assert.deepEqual(validateAbilityCues(pair), pair);
  const style = {
    tint: "#e4efff",
    particleColor: "#e8b75d",
    size: 2.5,
    frameMs: 50,
    travelMs: 0,
    particle: "electric" as const,
    particles: 0,
    opacity: 0,
  };
  assert.deepEqual(validateEffectStyle(style), style);
  assert.deepEqual(
    validateAbilityCues({ strike: { ...pair.strike, style } }).strike!.style,
    style,
  );
  for (const value of [
    null,
    [],
    { tint: "red" },
    { particleColor: "#1234" },
    { size: Infinity },
    { size: 0 },
    { frameMs: 0 },
    { frameMs: 30.5 },
    { travelMs: 1501 },
    { particle: "leaves" },
    { particles: -1 },
    { particles: 3 },
    { opacity: 1.1 },
    { surprise: 1 },
    { size: "2" },
    { opacity: undefined },
  ])
    assert.throws(() => validateEffectStyle(value));
  assert.throws(() =>
    validateAbilityCues({ strike: { ...pair.strike, style: undefined } }),
  );
});

test("effect appearance exports and history roundtrip without changing battle rules or RNG", () => {
  const p = mission(),
    style = {
      tint: "#ffbb66",
      size: 2,
      frameMs: 60,
      travelMs: 0,
      particle: "sparks" as const,
      particles: 0.5,
      opacity: 0.6,
    };
  const h = applyProjectEdits({ project: p, past: [], future: [] }, [
    {
      type: "ability-cues",
      cues: {
        ...p.abilityCues,
        "custom-dewfall": { effect: "raincall", sound: "hit", style },
      },
    },
  ]);
  const restored = parseLevelProject(exportLevelProject(h.project));
  assert.deepEqual(restored.abilityCues!["custom-dewfall"]!.style, style);
  assert.deepEqual(
    travelProjectHistory(h, "undo").project.abilityCues,
    p.abilityCues,
  );
  assert.deepEqual(
    travelProjectHistory(travelProjectHistory(h, "undo"), "redo").project
      .abilityCues,
    restored.abilityCues,
  );
  assert.deepEqual(
    compileLevelProject(restored).units,
    compileLevelProject(p).units,
  );
  const before = compileLevelProject(p),
    after = compileLevelProject({ ...restored, revision: p.revision });
  for (const b of [before, after]) {
    b.active = b.units[0].id;
    b.units[4].x = b.units[0].x + 2;
    b.units[4].z = b.units[0].z;
  }
  const action = {
    type: "skill" as const,
    skill: "custom-dewfall" as const,
    x: before.units[4].x,
    z: before.units[4].z,
  };
  assert.deepEqual(command(before, action), command(after, action));
});

test("resolved effect plans snapshot presentation while preserving actual area outcomes and sound", () => {
  const p = mission(),
    b = compileLevelProject(p),
    snapshot = structuredClone(b);
  const cue = {
    unit: b.units[0].id,
    skill: "custom-dewfall" as const,
    turn: 1,
    target: { x: 8, z: 9 },
    outcomes: [{ unit: b.units[4].id, result: "miss" as const }],
  };
  const style = { size: 2, frameMs: 50, travelMs: 0, particles: 0 };
  const cues = {
    "custom-dewfall": {
      effect: "ember" as const,
      sound: "heal" as const,
      style,
    },
  };
  const normal = planCombatEffect(cue, b)!,
    edited = planCombatEffect(cue, b, cues)!;
  assert.deepEqual(normal.tiles, edited.tiles);
  assert.equal(normal.seed, edited.seed);
  assert.equal(edited.hits.length, 0);
  assert.equal(edited.recipe.atlas, "elements");
  assert.equal(edited.recipe.frameMs, 50);
  assert.equal(edited.recipe.travelMs, 0);
  style.frameMs = 100;
  assert.equal(edited.recipe.frameMs, 50);
  assert.deepEqual(abilitySoundEvents(undefined, cue, cues), ["miss"]);
  assert.deepEqual(b, snapshot);
  assert.equal(planCombatEffect({ ...cue, skill: "custom-missing" }, b), null);
});

test("custom frame timing spans all eight existing atlas cells and respects reduced motion", () => {
  const original = structuredClone(effectRecipes.surge),
    r = resolveEffectRecipe("surge", {
      frameMs: 40,
      tint: "#112233",
      particleColor: "#abcdef",
      particles: 0,
      opacity: 0,
    });
  assert.deepEqual(
    Array.from({ length: 8 }, (_, i) => recipeFrame(r, i * 40)),
    Array.from({ length: 8 }, (_, i) => r.clip * 8 + i),
  );
  assert.equal(recipeFrame(r, 999999), r.clip * 8 + 7);
  assert.equal(recipeFrame(r, 0, true), recipeFrame(r, 999999, true));
  assert.equal(r.tint, 0x112233);
  assert.equal(r.color, 0xabcdef);
  assert.equal(r.particles, 0);
  assert.equal(r.opacity, 0);
  assert.deepEqual(effectRecipes.surge, original);
});
