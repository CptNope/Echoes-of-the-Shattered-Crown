import { analyzeProject } from "./studio-validation";
import { gameAudio } from "./game-audio";
import { defaultSoundBank } from "./studio-sfx";
import { defaultMusicPattern } from "./studio-music";
import { gameMaterials } from "./studio-materials";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cachedClassArtwork,
  resolveActorArtwork,
  projectArtwork,
  useClassArtwork,
} from "./artwork-sync";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  exportLevelProject,
  parseLevelProject,
  applyProjectEdits,
  travelProjectHistory,
} from "./studio-project";
import { nativeSource } from "./studio-native-sprites";
import { defaultPixelClip, validatePixelClip } from "./studio-pixels";
import { gameRules } from "./studio-rules";
const manifest = JSON.parse(
  readFileSync("public/art/animations/manifest.json", "utf8"),
);
function sheet(
  job: "vanguard" | "custom-glass-ranger" = "vanguard",
  actor = "sera",
) {
  const m = manifest.sheets[job];
  return nativeSource(
    job,
    actor,
    m,
    "data:image/webp;base64," +
      readFileSync("public/" + m.file).toString("base64"),
  );
}
const mission = () =>
  editProject(createLevelProject(), 0, [
    { type: "mission-preset", preset: "frostglass-vigil" },
  ]);
test("dedicated custom textures never pollute the base-class cache in either load order", () => {
  const p = mission();
  for (const order of [
    ["custom-frost-sentinel", "custom-emberwarden", "runewarden"],
    ["runewarden", "custom-frost-sentinel", "custom-emberwarden"],
  ] as const) {
    const cache = new Map(),
      created: string[] = [];
    for (const id of order)
      cachedClassArtwork(cache, id, p.rules!.jobs, () => {
        created.push(id);
        return { owner: id };
      });
    assert.equal(cache.size, 2);
    assert.equal(
      cache.get("custom-frost-sentinel").owner,
      "custom-frost-sentinel",
    );
    assert.notEqual(
      cache.get("custom-frost-sentinel"),
      cache.get("runewarden"),
    );
    assert.deepEqual(
      created,
      order[0] === "runewarden"
        ? ["runewarden", "custom-frost-sentinel"]
        : ["custom-frost-sentinel", "custom-emberwarden"],
    );
  }
});
test("all four custom sheets and their base sheets have independent texture ownership", () => {
  const p = mission(),
    cache = new Map();
  for (const id of [
    "custom-glass-ranger",
    "custom-ash-cantor",
    "custom-frost-sentinel",
    "custom-dawn-duelist",
    "shadowrunner",
    "lifebinder",
    "runewarden",
    "dancer",
  ] as const)
    cachedClassArtwork(cache, id, p.rules!.jobs, () => ({ id }));
  assert.equal(cache.size, 8);
});
test("native precedence wins over indexed for the same actor in renderer inspection", () => {
  const p = mission();
  p.pixels = defaultPixelClip();
  p.pixels.actorId = "sera";
  p.nativeSprites = [sheet("custom-glass-ranger")];
  assert.equal(resolveActorArtwork(p.content!.actors[0], p).kind, "native");
  p.nativeSprites[0].enabled = false;
  assert.equal(resolveActorArtwork(p.content!.actors[0], p).kind, "indexed");
  p.pixels.enabled = false;
  const a = resolveActorArtwork(p.content!.actors[0], p);
  assert.equal(a.kind, "class");
  assert.equal(a.artId, "custom-glass-ranger");
});
test("class-art repair preserves embedded images pixels timings and the input project", () => {
  const p = mission();
  p.nativeSprites = [sheet()];
  p.nativeSprites[0].durations[0] = 180;
  p.pixels = defaultPixelClip();
  p.pixels.actorId = "ilya";
  const before = exportLevelProject(p),
    r = editProject(
      p,
      p.revision,
      useClassArtwork(
        p,
        p.placements.map((a) => a.id),
      ),
    );
  assert.equal(r.nativeSprites![0].enabled, false);
  assert.deepEqual(r.nativeSprites![0], {
    ...p.nativeSprites[0],
    enabled: false,
  });
  assert.deepEqual(r.pixels, { ...p.pixels, enabled: false });
  assert.equal(exportLevelProject(p), before);
  assert(projectArtwork(r).every((row) => row.art.kind === "class"));
  assert.deepEqual(parseLevelProject(exportLevelProject(r)), r);
  assert.deepEqual(compileLevelProject(r).units, compileLevelProject(p).units);
});
test("per-actor reset preserves unplaced assignments and unrelated actor overrides", () => {
  const p = mission();
  p.nativeSprites = [sheet(), sheet("vanguard", "enemy-not-placed")];
  p.pixels = defaultPixelClip();
  p.pixels.actorId = "ilya";
  const r = editProject(p, p.revision, useClassArtwork(p, ["sera"]));
  assert.equal(r.nativeSprites![0].enabled, false);
  assert.equal(r.nativeSprites![1].enabled, true);
  assert.equal(r.pixels!.enabled, true);
  assert(!projectArtwork(r).some((row) => row.actor.id === "enemy-not-placed"));
});
test("art repair is a single reversible history transaction including legacy native source", () => {
  const p = createLevelProject();
  p.nativeSprite = sheet();
  p.pixels = defaultPixelClip();
  const h = applyProjectEdits(
    { project: p, past: [], future: [] },
    useClassArtwork(p, ["sera"]),
  );
  const undone = travelProjectHistory(h, "undo").project;
  assert.deepEqual(undone.nativeSprite, p.nativeSprite);
  assert.deepEqual(undone.pixels, p.pixels);
  assert.deepEqual(
    travelProjectHistory(travelProjectHistory(h, "undo"), "redo").project
      .nativeSprites,
    h.project.nativeSprites,
  );
});
test("indexed sources accept actual custom enemy IDs and reject arbitrary bindings", () => {
  const clip = defaultPixelClip();
  clip.actorId = "enemy-kiln-warden-ashen-weir";
  assert.deepEqual(validatePixelClip(clip), clip);
  for (const id of [
    "unknown",
    "enemy-",
    "enemy-UPPER",
    "enemy-" + "a".repeat(60),
  ])
    assert.throws(() => validatePixelClip({ ...clip, actorId: id }));
});
test("all ten canonical missions resolve every placed actor to registered class art", () => {
  for (const id of [
    "shrine",
    "causeway",
    "redoubt",
    "bellkeeper",
    "greybank",
    "ashen-weir",
    "cinder-archive",
    "lantern-parley",
    "frostglass-vigil",
    "briar-resonance",
  ] as const) {
    const p = editProject(createLevelProject(), 0, [
      { type: "mission-preset", preset: id },
    ]);
    const rows = projectArtwork(p);
    assert.equal(rows.length, p.placements.length);
    for (const row of rows) {
      assert.equal(row.art.kind, "class");
      assert(manifest.sheets[row.art.artId]);
    }
  }
});

test("artwork findings identify the actual override and disappear after reversible repair", () => {
  const p = mission();
  p.pixels = defaultPixelClip();
  p.nativeSprites = [sheet()];
  const report = analyzeProject(p);
  assert(
    report.findings.some(
      (f) => f.id === "class-art:sera" && f.target.area === "assets",
    ),
  );
  // Native priority suppresses the lower-priority indexed warning for that actor.
  assert(!report.findings.some((f) => f.id === "indexed-art:sera"));
  p.pixels.actorId = "ilya";
  assert(analyzeProject(p).findings.some((f) => f.id === "indexed-art:ilya"));
  const synced = editProject(
    p,
    p.revision,
    useClassArtwork(
      p,
      p.placements.map((a) => a.id),
    ),
  );
  assert.equal(analyzeProject(synced).warnings, 0);
});

test("all mission editor domains retain one authoritative source through export and compilation", () => {
  const p = mission();
  p.gameAudio = gameAudio();
  p.gameAudio.stepMs = 630;
  p.sounds = defaultSoundBank();
  p.sounds.gain = 0.4;
  p.materials = gameMaterials();
  p.music = defaultMusicPattern();
  p.content!.actors.find((a) => a.id === "sera")!.name = "Edited Tamsin";
  p.content!.contracts.redoubt.reward = 177;
  p.rules!.skills["custom-glass-shot"].power = 23;
  const restored = parseLevelProject(exportLevelProject(p)),
    battle = compileLevelProject(restored);
  assert.equal(
    battle.units.find((a) => a.id === "sera")!.name,
    "Edited Tamsin",
  );
  assert.equal(battle.rules!.skills["custom-glass-shot"].power, 23);
  assert.deepEqual(restored.gameAudio, p.gameAudio);
  assert.deepEqual(restored.materials, p.materials);
  assert.deepEqual(restored.music, p.music);
  assert.deepEqual(restored.sounds, p.sounds);
  assert.equal(restored.content!.contracts.redoubt.reward, 177);
  assert.deepEqual(
    projectArtwork(restored).map((r) => r.actor.name),
    battle.units.map((a) => a.name),
  );
});
