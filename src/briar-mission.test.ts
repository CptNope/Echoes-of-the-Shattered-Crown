import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  exportLevelProject,
  parseLevelProject,
  applyProjectEdits,
  travelProjectHistory,
} from "./studio-project";
import { analyzeProject } from "./studio-validation";
import { templateDifferences, previewExpedition } from "./studio-authoring";
import { animationArtId } from "./character-art";
import { nativeSource, validateNativeSprite } from "./studio-native-sprites";
import { defaultPixelClip } from "./studio-pixels";
import { projectArtwork } from "./artwork-sync";
import { activeUnit, aiTurn, command, preview, validateSave } from "./engine";
import { returnToCamp, validateExpedition } from "./campaign";
const mission = () =>
  editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: "briar-resonance" },
  ]);

test("Briar introduces two playable profiles, two named rivals and a connected 480-tile mission", () => {
  const p = mission(),
    b = compileLevelProject(p),
    report = analyzeProject(p);
  assert.equal(report.errors, 0, JSON.stringify(report.findings));
  assert.equal(report.warnings, 0, JSON.stringify(report.findings));
  assert.deepEqual(p.dimensions, { width: 24, height: 20 });
  assert.equal(p.tiles.length, 480);
  assert.equal(b.units.length, 10);
  assert.deepEqual(
    b.units.filter((u) => u.team === "ally").map((u) => u.name),
    ["Rowan Briar", "Edrin Bellforge", "Joren Ashbrook", "Nera Coldmere"],
  );
  for (const name of ["Warden Senna Moss", "Foreman Garron Rusk"])
    assert(b.units.some((u) => u.name === name));
  for (const actor of p.content!.actors.slice(4)) {
    const template = p.content!.enemyTemplates!.find(
      (t) => actor.id === t.id + "-ashen-weir",
    )!;
    assert(template);
    assert.deepEqual(templateDifferences(actor, template), []);
  }
  assert(validateSave(b));
});

for (const [id, actor] of [
  ["custom-thorn-warden", "sera"],
  ["custom-resonant-smith", "ilya"],
] as const)
  test(`${id} resolves its own editable native sheet rather than its gameplay base`, () => {
    const p = mission(),
      manifest = JSON.parse(
        readFileSync("public/art/animations/manifest.json", "utf8"),
      ),
      meta = manifest.sheets[id];
    assert.equal(animationArtId(id, p.rules!.jobs), id);
    assert.equal(new Set(meta.frameHashes).size, 32);
    assert(meta.opaque.every((n: number) => n > 1000));
    const source = nativeSource(
      id,
      actor,
      meta,
      "data:image/webp;base64," +
        readFileSync("public/" + meta.file).toString("base64"),
    );
    source.durations[0] = 180;
    assert.deepEqual(validateNativeSprite(source), source);
    const edited = editProject(p, p.revision, [
      { type: "native-library", sprites: [source] },
    ]);
    const restored = parseLevelProject(exportLevelProject(edited));
    assert.equal(
      projectArtwork(restored).find((r) => r.actor.id === actor)!.art.kind,
      "native",
    );
    assert.equal(restored.nativeSprites![0].durations[0], 180);
  });

test("Dewfall actually soaks enemies and enables Anvil peal's 50 percent lightning bonus", () => {
  const b = compileLevelProject(mission());
  b.active = "sera";
  const rowan = b.units.find((u) => u.id === "sera")!,
    target = b.units.find((u) => u.team === "enemy")!;
  target.x = rowan.x + 1;
  target.z = rowan.z;
  target.guard = false;
  const cast = command(b, {
    type: "skill",
    skill: "custom-dewfall",
    x: target.x,
    z: target.z,
  });
  const soaked = cast.units.find((u) => u.id === target.id)!,
    smith = cast.units.find((u) => u.id === "ilya")!;
  assert.equal(soaked.status.soaked, 3);
  assert.equal(cast.units.find((u) => u.id === "sera")!.mp, rowan.mp - 7);
  const dry = structuredClone(soaked);
  dry.status.soaked = 0;
  const skill = cast.rules!.skills["custom-anvil-peal"];
  assert.equal(
    preview(cast, smith, soaked, skill).amount,
    Math.round(preview(cast, smith, dry, skill).amount * 1.5),
  );
  cast.active = smith.id;
  const hit = command(cast, {
    type: "skill",
    skill: skill.id,
    x: soaked.x,
    z: soaked.z,
  });
  assert.equal(hit.units.find((u) => u.id === smith.id)!.mp, smith.mp - 8);
  assert(hit.units.find((u) => u.id === target.id)!.hp < soaked.hp);
  assert(validateSave(hit));
});

test("Briar shelter cleanses burn and Green mending revives with the existing 24-health rule", () => {
  const b = compileLevelProject(mission());
  b.active = "sera";
  const ally = b.units.find((u) => u.id === "mae")!;
  ally.status.burn = 2;
  const guarded = command(b, {
    type: "skill",
    skill: "custom-briar-shelter",
    x: ally.x,
    z: ally.z,
  });
  assert(guarded.units.find((u) => u.id === ally.id)!.guard);
  assert.equal(guarded.units.find((u) => u.id === ally.id)!.status.burn, 0);
  ally.hp = 0;
  const revived = command(b, {
    type: "skill",
    skill: "custom-green-mending",
    x: ally.x,
    z: ally.z,
  });
  assert.equal(revived.units.find((u) => u.id === ally.id)!.hp, 24);
  assert(validateSave(revived));
});

test("Smith timing skills apply their exact supported timeline changes", () => {
  const b = compileLevelProject(mission());
  b.active = "ilya";
  const smith = b.units.find((u) => u.id === "ilya")!,
    ally = b.units.find((u) => u.id === "sera")!;
  ally.next = 100;
  const hastened = command(b, {
    type: "skill",
    skill: "custom-tempered-tempo",
    x: ally.x,
    z: ally.z,
  });
  assert.equal(hastened.units.find((u) => u.id === ally.id)!.next, 65);
  const target = b.units.find((u) => u.team === "enemy")!;
  target.x = smith.x + 2;
  target.z = smith.z;
  target.next = 100;
  const delayed = command(b, {
    type: "skill",
    skill: "custom-dissonant-strike",
    x: target.x,
    z: target.z,
  });
  assert.equal(delayed.units.find((u) => u.id === target.id)!.next, 130);
  assert(validateSave(delayed));
});

test("Briar loading is reversible, preserves source overrides and leaves earlier missions independent", () => {
  const p = createLevelProject();
  p.pixels = defaultPixelClip();
  p.pixels.enabled = false;
  const before = exportLevelProject(p);
  const history = applyProjectEdits({ project: p, past: [], future: [] }, [
    { type: "mission-preset", preset: "briar-resonance" },
  ]);
  const undone = travelProjectHistory(history, "undo").project;
  assert.deepEqual({ ...undone, revision: p.revision }, p);
  const next = travelProjectHistory(
    travelProjectHistory(history, "undo"),
    "redo",
  ).project;
  assert.deepEqual(parseLevelProject(exportLevelProject(next)), next);
  assert.deepEqual(next.pixels, p.pixels);
  assert.equal(exportLevelProject(p), before);
  const older = editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: "frostglass-vigil" },
  ]);
  assert(!older.rules!.jobs["custom-thorn-warden"]);
  assert.equal(
    older.content!.actors.find((a) => a.id === "sera")!.name,
    "Tamsin Valehart",
  );
  const named = mission();
  named.id = "briar-resonance-mission";
  assert.deepEqual(
    parseLevelProject(
      readFileSync("public/missions/briar-resonance.json", "utf8"),
    ),
    named,
  );
});

test("Briar first-clear seal settles once and the exported source retains ability feedback", () => {
  const p = mission(),
    b = compileLevelProject(p);
  b.units.filter((u) => u.team === "enemy").forEach((u) => (u.hp = 0));
  b.result = "victory";
  const g = previewExpedition(b),
    out = returnToCamp(g, p.content!.contracts);
  assert(validateExpedition(out));
  assert.equal(out.company.gold, g.company.gold + 175);
  assert.equal(out.company.inventory["custom-resonance-seal"], 1);
  assert.deepEqual(returnToCamp(out, p.content!.contracts), out);
  const repeat = {
    ...structuredClone(out),
    stage: "battle" as const,
    battle: b,
  };
  repeat.company.deployments++;
  assert.equal(
    returnToCamp(repeat, p.content!.contracts).company.inventory[
      "custom-resonance-seal"
    ],
    1,
  );
  assert.deepEqual(
    parseLevelProject(exportLevelProject(p)).abilityCues!["custom-anvil-peal"],
    { effect: "surge", sound: "hit" },
  );
});

test("Briar reaches valid seeded terminal outcomes without changing its editable source", () => {
  const p = mission(),
    source = exportLevelProject(p);
  for (const seed of [74319, 9001, 42]) {
    let b = compileLevelProject({ ...p, seed }),
      n = 0;
    for (; n < 400 && b.result === "playing"; n++) {
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
    assert(n < 400);
    assert.notEqual(b.result, "playing");
    console.log(
      JSON.stringify({
        mission: "briar-resonance",
        seed,
        result: b.result,
        activations: n,
        survivors: b.units.filter((u) => u.team === "ally" && u.hp > 0).length,
      }),
    );
  }
  assert.equal(exportLevelProject(p), source);
});
