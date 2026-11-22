import { defaultSoundBank } from "./studio-sfx";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  exportLevelProject,
  parseLevelProject,
} from "./studio-project";
import { analyzeProject } from "./studio-validation";
import { animationArtId, CHARACTER_ART } from "./character-art";
import { nativeSource, validateNativeSprite } from "./studio-native-sprites";
import {
  activeUnit,
  aiTurn,
  command,
  validateSave,
  availableSkills,
} from "./engine";
const mission = () =>
  editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: "lantern-parley" },
  ]);
test("Lantern Parley provides two playable profiles, two named rivals and a clean editable mission", () => {
  const p = mission(),
    b = compileLevelProject(p),
    r = analyzeProject(p);
  assert.equal(r.errors, 0, JSON.stringify(r.findings));
  assert.equal(r.warnings, 0, JSON.stringify(r.findings));
  assert.equal(b.units.find((u) => u.id === "sera")!.name, "Tamsin Valehart");
  assert.equal(b.units.find((u) => u.id === "ilya")!.name, "Orris Fen");
  assert(
    b.units.some((u) => u.name === "Vessa Flintglass" && u.team === "enemy"),
  );
  assert(
    b.units.some((u) => u.name === "Brother Caldrin" && u.team === "enemy"),
  );
  assert.equal(b.units.length, 10);
  assert.equal(p.content!.dialogue.redoubt.length, 6);
  assert(validateSave(b));
  assert.deepEqual(parseLevelProject(exportLevelProject(p)), p);
});
test("class artwork resolves independently from gameplay base class and unknown variants retain fallback", () => {
  const p = mission();
  assert.equal(
    animationArtId("custom-glass-ranger", p.rules!.jobs),
    "custom-glass-ranger",
  );
  assert.equal(
    animationArtId("custom-ash-cantor", p.rules!.jobs),
    "custom-ash-cantor",
  );
  assert.equal(
    animationArtId("custom-emberwarden", p.rules!.jobs),
    "runewarden",
  );
  assert.equal(Object.keys(CHARACTER_ART).length, 12);
});
for (const id of ["custom-glass-ranger", "custom-ash-cantor"] as const) {
  test(`${id} has 32 unique alpha-bearing frames and editable native source`, () => {
    const m = JSON.parse(
        readFileSync("public/art/animations/manifest.json", "utf8"),
      ),
      s = m.sheets[id];
    const bytes = readFileSync("public/" + s.file);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), s.sha256);
    assert.equal(s.frameHashes.length, 32);
    assert.equal(new Set(s.frameHashes).size, 32);
    assert(s.opaque.every((n: number) => n > 1000));
    const native = nativeSource(
      id,
      "sera",
      s,
      "data:image/webp;base64," + bytes.toString("base64"),
    );
    assert.deepEqual(validateNativeSprite(native), native);
    assert.equal(native.durations.length, 32);
  });
}
test("Glass shot attacks beyond melee range and spends authored energy", () => {
  const b = compileLevelProject(mission()),
    target = b.units.find((u) => u.team === "enemy")!;
  target.x = 8;
  target.z = 7;
  const p = command(b, {
    type: "skill",
    skill: "custom-glass-shot",
    x: 8,
    z: 7,
  });
  assert.equal(p.units[0].mp, b.units[0].mp - 4);
  assert.equal(p.lastAction!.skill, "custom-glass-shot");
  assert(validateSave(p));
});
test("Facet mark applies exposure through its inherited rule", () => {
  const b = compileLevelProject(mission()),
    target = b.units.find((u) => u.team === "enemy")!;
  target.x = 7;
  target.z = 7;
  target.facing = [-1, 0];
  const p = command(b, {
    type: "skill",
    skill: "custom-facet-mark",
    x: 7,
    z: 7,
  });
  assert.equal(p.units[0].mp, b.units[0].mp - 6);
  assert.equal(p.units.find((u) => u.id === target.id)!.status.exposed, 2);
  assert(validateSave(p));
});
test("Ash Cantor has the authored three abilities and secondary healing", () => {
  const p = mission(),
    b = compileLevelProject(p),
    u = b.units.find((u) => u.id === "ilya")!;
  for (const id of [
    "custom-cinder-hymn",
    "custom-ashen-shelter",
    "custom-mourning-bell",
    "mend",
  ] as const)
    assert(availableSkills(u, b.rules).includes(id));
  assert.equal(p.rules!.jobs[u.job].baseJob, "lifebinder");
});
test("character preset retains earlier embedded artwork and sound overrides without mutation", () => {
  const p = createLevelProject();
  p.sounds = defaultSoundBank();
  p.sounds.cues[0].layers[0].gain = 0.1;
  const before = exportLevelProject(p);
  const next = editProject(p, 0, [
    { type: "mission-preset", preset: "lantern-parley" },
  ]);
  assert.deepEqual(next.sounds, p.sounds);
  assert.equal(exportLevelProject(p), before);
});
test("published character mission is exactly reproducible", () => {
  const p = mission();
  p.id = "lantern-parley-mission";
  assert.deepEqual(
    parseLevelProject(
      readFileSync("public/missions/lantern-parley.json", "utf8"),
    ),
    p,
  );
});
test("character mission completes seeded valid AI runs while preserving source", () => {
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
        mission: "lantern-parley",
        seed,
        result: b.result,
        activations: n,
      }),
    );
  }
  assert.equal(exportLevelProject(p), source);
});
