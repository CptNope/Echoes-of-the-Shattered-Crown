import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nativeSource, nativePaint } from "./studio-native-sprites";
import {
  nativeSources,
  validateNativeLibrary,
  upsertNative,
  validateAbilityCues,
  abilitySoundEvents,
} from "./studio-assets";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  parseLevelProject,
  exportLevelProject,
  saveProjectCheckpoint,
  loadProjectCheckpoint,
  STUDIO_STORAGE,
  applyProjectEdits,
  travelProjectHistory,
  NATIVE_PROJECT_LIMIT,
} from "./studio-project";
import { command } from "./engine";
import { planCombatEffect } from "./combat-effects";
const manifest = JSON.parse(
  readFileSync("public/art/animations/manifest.json", "utf8"),
);
const sheet = (actor = "sera") => {
  const m = manifest.sheets.vanguard;
  return nativeSource(
    "vanguard",
    actor,
    m,
    "data:image/webp;base64," +
      readFileSync("public/" + m.file).toString("base64"),
  );
};
const storage = () => {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
  };
};
test("native library upsert migrates legacy assignments and preserves independent edits", () => {
  const p = createLevelProject();
  p.nativeSprite = sheet();
  const original = exportLevelProject(p);
  const second = nativePaint(sheet("ilya"), 0, [
    { x: 0, y: 0, color: "#112233ff" },
  ]);
  second.durations[0] = 190;
  const next = editProject(p, 0, [
    { type: "native-library", sprites: upsertNative(p, second) },
  ]);
  assert.equal(next.nativeSprite, undefined);
  assert.equal(nativeSources(next).length, 2);
  assert.equal(nativeSources(next)[0].durations[0], 220);
  assert.equal(nativeSources(next)[1].durations[0], 190);
  assert.equal(exportLevelProject(p), original);
  const replacement = sheet("ilya");
  assert.equal(upsertNative(next, replacement).length, 2);
  assert.deepEqual(upsertNative(next, replacement)[0], sheet());
});
test("native assignments support enemy instances reject duplicate identities and malformed sources", () => {
  assert.equal(
    validateNativeLibrary([sheet("enemy-custom-instance")])[0].actorId,
    "enemy-custom-instance",
  );
  assert.throws(() => validateNativeLibrary([sheet(), sheet()]));
  assert.throws(() => validateNativeLibrary([sheet("unknown")]));
  assert.throws(() =>
    validateNativeLibrary(
      Array.from({ length: 25 }, (_, i) => sheet(`enemy-extra-${i}`)),
    ),
  );
  const conflict = sheet("ilya");
  conflict.image = "data:image/webp;base64,AAAA";
  assert.throws(() => validateNativeLibrary([sheet(), conflict]));
  const p = createLevelProject();
  p.nativeSprite = sheet();
  p.nativeSprites = [];
  assert.throws(() => parseLevelProject(JSON.stringify(p)));
});
test("library checkpoints deduplicate originals and recover independent patches", () => {
  const store = storage();
  let p = editProject(createLevelProject(), 0, [
    { type: "native-library", sprites: [sheet(), sheet("ilya")] },
  ]);
  const token = saveProjectCheckpoint(store, p, null);
  assert.equal(
    [...store.m.keys()].filter((k) => k.startsWith(STUDIO_STORAGE + ".native."))
      .length,
    1,
  );
  assert(token.includes("asset:"));
  assert(!token.includes("data:image"));
  p = editProject(p, p.revision, [
    {
      type: "native-library",
      sprites: [
        sheet(),
        nativePaint(sheet("ilya"), 0, [{ x: 0, y: 0, color: "#abcdef80" }]),
      ],
    },
  ]);
  saveProjectCheckpoint(store, p, token);
  assert.deepEqual(loadProjectCheckpoint(store).project, p);
  store.m.set(STUDIO_STORAGE, "corrupt");
  assert.deepEqual(
    nativeSources(loadProjectCheckpoint(store).project!)[1].patches,
    {},
  );
});
test("missing shared checkpoint images and quota failures retain recovery boundaries", () => {
  const store = storage(),
    p = editProject(createLevelProject(), 0, [
      { type: "native-library", sprites: [sheet(), sheet("ilya")] },
    ]);
  saveProjectCheckpoint(store, p, null);
  store.m.delete(STUDIO_STORAGE + ".native." + sheet().sha256);
  assert.equal(loadProjectCheckpoint(store).project, null);
  const quota = {
    getItem: () => null,
    setItem: () => {
      throw Error("quota");
    },
  };
  assert.throws(() => saveProjectCheckpoint(quota, p, null), /quota/);
});
test("multiple sheet exports exceed the legacy budget without losing original bytes", () => {
  const ids = [
      "sera",
      "ilya",
      "corin",
      "mae",
      "sentinel",
      "cinder",
      "wraith",
      "cantor",
    ],
    p = editProject(createLevelProject(), 0, [
      { type: "native-library", sprites: ids.map((id) => sheet(id)) },
    ]);
  const text = exportLevelProject(p);
  assert(Buffer.byteLength(text) > NATIVE_PROJECT_LIMIT);
  assert.deepEqual(parseLevelProject(text), p);
  assert.deepEqual(
    nativeSources(parseLevelProject(text)).map((s) => s.image),
    ids.map(() => sheet().image),
  );
});
test("asset edits preserve authoritative battle state and share undo redo", () => {
  const p = createLevelProject(),
    h = applyProjectEdits({ project: p, past: [], future: [] }, [
      { type: "native-library", sprites: [sheet(), sheet("ilya")] },
      {
        type: "ability-cues",
        cues: { strike: { effect: "frost", sound: "buff" } },
      },
    ]);
  assert.deepEqual(
    compileLevelProject(h.project).units,
    compileLevelProject(p).units,
  );
  assert.deepEqual(travelProjectHistory(h, "undo").project, {
    ...p,
    revision: 2,
  });
  assert.deepEqual(
    travelProjectHistory(travelProjectHistory(h, "undo"), "redo").project
      .abilityCues,
    h.project.abilityCues,
  );
});
test("feedback validation accepts scoped abilities and rejects unknown references and fields", () => {
  const p = editProject(createLevelProject(), 0, [{ type: "greybank" }]);
  assert.deepEqual(
    validateAbilityCues(
      { "custom-brine-lance": { effect: "surge", sound: "heal" } },
      p.rules,
    ),
    { "custom-brine-lance": { effect: "surge", sound: "heal" } },
  );
  for (const raw of [
    { missing: { effect: "frost", sound: "hit" } },
    { strike: { effect: "missing", sound: "hit" } },
    { strike: { effect: "frost", sound: "other" } },
    { strike: { effect: "frost", sound: "hit", extra: 1 } },
  ])
    assert.throws(() => validateAbilityCues(raw));
});
test("ability VFX overrides preserve gameplay radius seed and actual command results", () => {
  const p = editProject(createLevelProject(), 0, [{ type: "greybank" }]),
    b = compileLevelProject(p);
  const n = command(b, {
      type: "skill",
      skill: "custom-glacial-chain",
      x: 8,
      z: 6,
    }),
    cue = n.lastAction!;
  const automatic = planCombatEffect(cue, n)!,
    bound = planCombatEffect(cue, n, {
      "custom-glacial-chain": { effect: "surge", sound: "buff" },
    })!;
  assert.equal(bound.skill, "surge");
  assert.equal(automatic.skill, "frost");
  assert.deepEqual(bound.tiles, automatic.tiles);
  assert.equal(bound.seed, automatic.seed);
  const authored = editProject(p, p.revision, [
    {
      type: "ability-cues",
      cues: { "custom-glacial-chain": { effect: "surge", sound: "buff" } },
    },
  ]);
  authored.revision = p.revision;
  assert.deepEqual(
    command(compileLevelProject(authored), {
      type: "skill",
      skill: "custom-glacial-chain",
      x: 8,
      z: 6,
    }),
    n,
  );
});
test("paired sound bindings preserve misses deduplicate events and support terrain casts", () => {
  const cues = { strike: { effect: "frost" as const, sound: "buff" as const } },
    cue = {
      unit: "sera",
      skill: "strike" as const,
      turn: 1,
      target: { x: 3, z: 4 },
      outcomes: [
        { unit: "sentinel", result: "hit" as const },
        { unit: "cinder", result: "miss" as const },
      ],
    };
  assert.deepEqual(abilitySoundEvents(undefined, cue, cues), ["buff", "miss"]);
  assert.deepEqual(abilitySoundEvents(cue, structuredClone(cue), cues), []);
  assert.deepEqual(
    abilitySoundEvents(undefined, { ...cue, outcomes: [] }, cues),
    ["buff"],
  );
  assert.deepEqual(abilitySoundEvents(undefined, undefined, cues), []);
  assert.deepEqual(abilitySoundEvents(undefined, cue), ["hit", "miss"]);
});
test("preset changes retain sheet assignments and prune feedback for removed custom abilities", () => {
  let p = editProject(createLevelProject(), 0, [{ type: "greybank" }]);
  p = editProject(p, p.revision, [
    { type: "native-library", sprites: [sheet("enemy-brineguard-greybank")] },
    {
      type: "ability-cues",
      cues: {
        "custom-brine-lance": { effect: "surge", sound: "heal" },
        strike: { effect: "frost", sound: "buff" },
      },
    },
  ]);
  const n = editProject(p, p.revision, [
    { type: "mission-preset", preset: "shrine" },
  ]);
  assert.deepEqual(n.nativeSprites, p.nativeSprites);
  assert.deepEqual(n.abilityCues, {
    strike: { effect: "frost", sound: "buff" },
  });
});
