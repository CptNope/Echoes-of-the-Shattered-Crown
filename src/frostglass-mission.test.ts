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
  applyProjectEdits,
  travelProjectHistory,
} from "./studio-project";
import { analyzeProject } from "./studio-validation";
import {
  command,
  reachable,
  preview,
  validateSave,
  activeUnit,
  aiTurn,
} from "./engine";
import { nativeSource, validateNativeSprite } from "./studio-native-sprites";
import { animationArtId, CHARACTER_ART } from "./character-art";
import { returnToCamp, validateExpedition } from "./campaign";
import { previewExpedition } from "./studio-authoring";
const mission = () =>
  editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: "frostglass-vigil" },
  ]);
test("Frostglass introduces four custom playable profiles and a connected ten-actor mission", () => {
  const p = mission(),
    b = compileLevelProject(p),
    report = analyzeProject(p);
  assert.equal(report.errors, 0, JSON.stringify(report.findings));
  assert.equal(report.warnings, 0, JSON.stringify(report.findings));
  assert.deepEqual(p.dimensions, { width: 22, height: 18 });
  assert.equal(p.tiles.length, 396);
  assert.deepEqual(
    b.units.filter((u) => u.team === "ally").map((u) => u.name),
    ["Tamsin Valehart", "Orris Fen", "Joren Ashbrook", "Nera Coldmere"],
  );
  assert(b.units.some((u) => u.name === "Captain Ysra"));
  assert(b.units.some((u) => u.name === "Darian Sunscar"));
  assert.equal(p.content!.dialogue.redoubt.length, 6);
  assert(validateSave(b));
});
for (const id of ["custom-frost-sentinel", "custom-dawn-duelist"] as const) {
  test(`${id} has registered native editable artwork with 32 distinct transparent frames`, () => {
    const p = mission(),
      m = JSON.parse(
        readFileSync("public/art/animations/manifest.json", "utf8"),
      ),
      meta = m.sheets[id];
    assert.equal(animationArtId(id, p.rules!.jobs), id);
    assert.equal(Object.keys(CHARACTER_ART).length, 14);
    const bytes = readFileSync("public/" + meta.file);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), meta.sha256);
    assert.equal(new Set(meta.frameHashes).size, 32);
    assert(meta.opaque.every((n: number) => n > 1000));
    const source = nativeSource(
      id,
      "mae",
      meta,
      "data:image/webp;base64," + bytes.toString("base64"),
    );
    assert.deepEqual(validateNativeSprite(source), source);
  });
}
test("Frostline creates a traversable crossing through actual cast and movement commands", () => {
  const p = mission(),
    source = exportLevelProject(p),
    b = compileLevelProject(p);
  b.active = "mae";
  const n = b.units.find((u) => u.id === "mae")!;
  n.x = 6;
  n.z = 5;
  assert(!reachable(b, n).has("8,4"));
  const cast = command(b, {
    type: "skill",
    skill: "custom-frostline",
    x: 7,
    z: 4,
  });
  assert.equal(cast.units.find((u) => u.id === "mae")!.mp, 29);
  assert.equal(cast.tiles.find((t) => t.x === 8 && t.z === 4)!.terrain, "ice");
  assert(
    reachable(
      cast,
      cast.units.find((u) => u.id === "mae")!,
    ).has("8,4"),
  );
  const moved = command(cast, { type: "move", x: 8, z: 4 });
  assert.equal(moved.units.find((u) => u.id === "mae")!.x, 8);
  assert(validateSave(moved));
  assert.equal(exportLevelProject(p), source);
});
test("Rimeward cleanses burn and Winter's mercy revives at the supported fixed value", () => {
  const b = compileLevelProject(mission());
  b.active = "mae";
  const t = b.units.find((u) => u.id === "sera")!;
  t.status.burn = 2;
  const guarded = command(b, {
    type: "skill",
    skill: "custom-rimeward",
    x: t.x,
    z: t.z,
  });
  assert(guarded.units.find((u) => u.id === t.id)!.guard);
  assert.equal(guarded.units.find((u) => u.id === t.id)!.status.burn, 0);
  t.hp = 0;
  const revived = command(b, {
    type: "skill",
    skill: "custom-winters-mercy",
    x: t.x,
    z: t.z,
  });
  assert.equal(revived.units.find((u) => u.id === t.id)!.hp, 24);
  assert(validateSave(revived));
});
test("Sunlit pursuit benefits from and consumes exposure on a successful hit", () => {
  const b = compileLevelProject(mission());
  b.active = "corin";
  const j = b.units.find((u) => u.id === "corin")!,
    t = b.units.find((u) => u.team === "enemy")!;
  t.x = j.x + 2;
  t.z = j.z;
  t.status.exposed = 2;
  const exposed = preview(b, j, t, b.rules!.skills["custom-sunlit-pursuit"]),
    dry = structuredClone(t);
  dry.status.exposed = 0;
  assert(
    exposed.amount >
      preview(b, j, dry, b.rules!.skills["custom-sunlit-pursuit"]).amount,
  );
  const hit = command(b, {
    type: "skill",
    skill: "custom-sunlit-pursuit",
    x: t.x,
    z: t.z,
  });
  assert.equal(hit.units.find((u) => u.id === "corin")!.mp, 24);
  assert.equal(hit.units.find((u) => u.id === t.id)!.status.exposed, 0);
  assert(validateSave(hit));
});
test("Frostglass source, native assignments and reversible loading retain source ownership", () => {
  const p = createLevelProject(),
    before = exportLevelProject(p);
  const h = applyProjectEdits({ project: p, past: [], future: [] }, [
    { type: "mission-preset", preset: "frostglass-vigil" },
  ]);
  assert.equal(exportLevelProject(p), before);
  assert.deepEqual(parseLevelProject(exportLevelProject(h.project)), h.project);
  assert.deepEqual(travelProjectHistory(h, "undo").project.tiles, p.tiles);
  assert.deepEqual(
    travelProjectHistory(travelProjectHistory(h, "undo"), "redo").project
      .content,
    h.project.content,
  );
  const m = JSON.parse(
      readFileSync("public/art/animations/manifest.json", "utf8"),
    ),
    meta = m.sheets["custom-frost-sentinel"],
    bytes = readFileSync("public/" + meta.file);
  const native = nativeSource(
    "custom-frost-sentinel",
    "mae",
    meta,
    "data:image/webp;base64," + bytes.toString("base64"),
  );
  const next = editProject(h.project, h.project.revision, [
    { type: "native-library", sprites: [native] },
  ]);
  assert.deepEqual(parseLevelProject(exportLevelProject(next)), next);
});
test("Vigil reward settles once and its relic is not duplicated by repeat clears", () => {
  const p = mission(),
    b = compileLevelProject(p);
  b.units.filter((u) => u.team === "enemy").forEach((u) => (u.hp = 0));
  b.result = "victory";
  const g = previewExpedition(b),
    out = returnToCamp(g, p.content!.contracts);
  assert(validateExpedition(out));
  assert.equal(out.company.gold, g.company.gold + 165);
  assert.equal(out.company.inventory["custom-vigil-compass"], 1);
  assert.deepEqual(returnToCamp(out, p.content!.contracts), out);
  const repeat = {
    ...structuredClone(out),
    stage: "battle" as const,
    battle: b,
  };
  repeat.company.deployments++;
  assert.equal(
    returnToCamp(repeat, p.content!.contracts).company.inventory[
      "custom-vigil-compass"
    ],
    1,
  );
});
test("published Frostglass source is reproducible and keeps prior missions independent", () => {
  const p = mission();
  p.id = "frostglass-vigil-mission";
  assert.deepEqual(
    parseLevelProject(
      readFileSync("public/missions/frostglass-vigil.json", "utf8"),
    ),
    p,
  );
  const older = editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: "lantern-parley" },
  ]);
  assert(!older.rules!.jobs["custom-frost-sentinel"]);
  assert.equal(
    older.content!.actors.find((a) => a.id === "mae")!.name,
    "Maelis Reed",
  );
});
test("mixed-party mission reaches valid seeded terminal outcomes without source mutation", () => {
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
        mission: "frostglass-vigil",
        seed,
        result: b.result,
        activations: n,
        survivors: b.units.filter((u) => u.team === "ally" && u.hp > 0).length,
      }),
    );
  }
  assert.equal(exportLevelProject(p), source);
});
