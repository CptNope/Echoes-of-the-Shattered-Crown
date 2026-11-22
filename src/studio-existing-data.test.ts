import { test } from "node:test";
import assert from "node:assert/strict";
import { createBattle, command, unitStats, validateSave } from "./engine";
import { encounters, encounterOpening } from "./encounters";
import { createExpedition, contractOpen, returnToCamp } from "./campaign";
import {
  ENCOUNTER_IDS,
  gameContent,
  validateGameContent,
} from "./studio-content";
import {
  gameMaterials,
  terrainColor,
  terrainRgba,
  validateMaterials,
  TERRAIN_IDS,
  TERRAIN_PALETTE,
} from "./studio-materials";
import { gameAudio, validateGameAudio } from "./game-audio";
import { AudioScore } from "./audio";
import {
  createLevelProject,
  editProject,
  compileLevelProject,
  applyProjectEdits,
  travelProjectHistory,
  exportLevelProject,
  parseLevelProject,
} from "./studio-project";
import { defaultPixelClip } from "./studio-pixels";
import { defaultSoundBank } from "./studio-sfx";
import { defaultMusicPattern } from "./studio-music";
test("every existing encounter imports exact game geometry, placements, roster and briefing sources", () => {
  for (const id of ENCOUNTER_IDS) {
    const original = createBattle(74319, id),
      p = createLevelProject(id),
      b = compileLevelProject(p),
      content = gameContent(id);
    assert.equal(b.encounter, id);
    assert.deepEqual(b.tiles, original.tiles);
    assert.deepEqual(b.units, original.units);
    assert.deepEqual(
      p.placements,
      original.units.map(({ id, x, z }) => ({ id, x, z })),
    );
    assert.deepEqual(content.contracts, encounters);
    assert.equal(content.dialogue[id][0].text, encounters[id].description);
    assert.equal(content.dialogue[id][1].text, encounterOpening.text);
    assert.equal(content.actors[4].name, original.units[4].name);
    assert.deepEqual(validateGameContent(content), content);
  }
});
test("loading an encounter is one reversible source transaction preserving unrelated authored sources", () => {
  const base = {
    ...createLevelProject(),
    sounds: defaultSoundBank(),
    music: defaultMusicPattern(),
    pixels: defaultPixelClip(),
    materials: gameMaterials(),
    gameAudio: gameAudio(),
  };
  const old = structuredClone(base),
    state = applyProjectEdits({ project: base, past: [], future: [] }, [
      { type: "load-encounter", encounter: "bellkeeper" },
    ]);
  assert.equal(state.project.encounter, "bellkeeper");
  assert.equal(state.project.content!.actors[4].baseHp, 168);
  assert.equal(
    compileLevelProject(state.project).units[4].name,
    "Orren, Bellkeeper",
  );
  for (const key of [
    "sounds",
    "music",
    "pixels",
    "materials",
    "gameAudio",
  ] as const)
    assert.deepEqual(state.project[key], base[key]);
  assert.deepEqual(travelProjectHistory(state, "undo").project, {
    ...old,
    revision: 2,
  });
  assert.deepEqual(base, old);
});
test("edited NPC identity, resources, jobs and secondary learning reach actual battle functions", () => {
  const c = gameContent("bellkeeper"),
    actor = c.actors[4];
  actor.name = "Orren of the reopened bell";
  actor.baseHp = 210;
  actor.maxMp = 57;
  actor.job = "arcanist";
  actor.secondary = "lifebinder";
  actor.learned = ["mend"];
  actor.jp.arcanist = 120;
  const p = editProject(createLevelProject("bellkeeper"), 0, [
      { type: "content", content: c },
    ]),
    b = compileLevelProject(p),
    u = b.units[4];
  assert.equal(u.name, actor.name);
  assert.equal(u.hp, 210);
  assert.equal(u.mp, 57);
  assert.equal(u.job, "arcanist");
  assert.equal(u.jp.arcanist, 120);
  assert.deepEqual(u.learned, ["mend"]);
  assert.equal(
    unitStats(u).magic,
    unitStats({ ...createBattle().units[4], job: "arcanist" }).magic,
  );
  assert.equal(b.seed, p.seed);
  assert.deepEqual(c.actors[4], actor);
});
test("content validation rejects cycles, missing identities, unresolved speakers/skills and invalid resources atomically", () => {
  const source = gameContent(),
    before = structuredClone(source);
  for (const mutate of [
    (p: any) => (p.contracts.shrine.requires = "bellkeeper"),
    (p: any) => delete p.contracts.shrine,
    (p: any) => (p.contracts.shrine.reward = -1),
    (p: any) => (p.contracts.shrine.firstClearRelic = "fake"),
    (p: any) => (p.actors[0].id = "new-npc"),
    (p: any) => (p.actors[0].baseHp = 0),
    (p: any) => (p.actors[0].job = ["vanguard"]),
    (p: any) => (p.actors[0].learned = ["missing"]),
    (p: any) => (p.actors[0].jp = { invalid: 1 }),
    (p: any) => (p.dialogue.shrine[0].speaker = "missing"),
    (p: any) => (p.dialogue.shrine[1].id = "briefing"),
    (p: any) => (p.dialogue.shrine[0].text = ""),
    (p: any) => (p.victoryJP = NaN),
    (p: any) => (p.extension = {}),
  ]) {
    const bad = structuredClone(source);
    mutate(bad);
    assert.throws(() => validateGameContent(bad));
    assert.throws(() =>
      editProject(createLevelProject(), 0, [{ type: "content", content: bad }]),
    );
  }
  assert.deepEqual(source, before);
});
test("authored progression uses real victory JP, settlement, first-clear items and contract gates", () => {
  const c = gameContent();
  c.victoryJP = 37;
  c.contracts.shrine.reward = 225;
  c.contracts.shrine.firstClearRelic = "crownseal";
  c.contracts.redoubt.requires = "shrine";
  const p = editProject(createLevelProject(), 0, [
      { type: "content", content: c },
    ]),
    b = compileLevelProject(p);
  b.units.filter((u) => u.team === "enemy").forEach((u) => (u.hp = 0));
  const won = command(b, { type: "end" });
  assert.equal(won.result, "victory");
  assert.ok(
    won.units.filter((u) => u.team === "ally").every((u) => u.jp[u.job] === 37),
  );
  assert.equal(command(won, { type: "end" }), won);
  const before = createExpedition(),
    settled = returnToCamp(
      { ...before, stage: "battle", battle: won },
      c.contracts,
    );
  assert.equal(settled.company.gold, 365);
  assert.equal(settled.company.inventory.crownseal, 1);
  assert.equal(returnToCamp(settled, c.contracts), settled);
  assert.equal(contractOpen(before.company, "redoubt", c.contracts), false);
  assert.equal(contractOpen(settled.company, "redoubt", c.contracts), true);
  assert.equal(validateSave({ ...won, victoryJP: -1 }), false);
  assert.equal(validateSave({ ...won, victoryJP: 37 }), true);
  assert.equal(before.company.gold, 140);
});
test("terrain source matches renderer palettes and exact authored RGBA textures without changing movement rules", () => {
  const material = gameMaterials();
  assert.deepEqual(
    TERRAIN_PALETTE.grass,
    [0x7d9161, 0x879b6c, 0x74895d, 0x8b9a6a],
  );
  assert.equal(terrainColor("stone", 0, 0), 0xa1a58d);
  assert.equal(terrainColor("ice", 4, 2), 0xb8d8cc);
  for (const id of TERRAIN_IDS)
    for (let x = 0; x < 9; x++)
      for (let z = 0; z < 9; z++)
        assert.equal(terrainColor(id, x, z, material), terrainColor(id, x, z));
  material.surfaces.stone.colors[1] = "#123456";
  material.surfaces.stone.painted = true;
  material.surfaces.stone.pixels = Array.from({ length: 256 }, (_, i) => i % 2);
  const bytes = terrainRgba(material, "stone");
  assert.equal(bytes.length, 1024);
  for (let i = 0; i < 256; i++)
    assert.deepEqual(
      [...bytes.slice(i * 4, i * 4 + 4)],
      i % 2 ? [18, 52, 86, 255] : [161, 165, 141, 255],
    );
  const p = editProject(createLevelProject(), 0, [
    { type: "materials", materials: material },
  ]);
  assert.deepEqual(compileLevelProject(p).tiles, createBattle().tiles);
  assert.deepEqual(
    parseLevelProject(exportLevelProject(p)).materials,
    material,
  );
});
test("terrain validation and project import reject out-of-range pixels, unknown surfaces and invalid palette data", () => {
  for (const mutate of [
    (p: any) => p.surfaces.grass.pixels.pop(),
    (p: any) => (p.surfaces.grass.pixels[0] = 4),
    (p: any) => (p.surfaces.stone.colors[0] = "#12345678"),
    (p: any) => delete p.surfaces.ice,
    (p: any) => (p.surfaces.grass.painted = "yes"),
    (p: any) => (p.surfaces.stone.extra = 1),
  ]) {
    const p = gameMaterials();
    mutate(p);
    assert.throws(() => validateMaterials(p));
  }
});
test("all current editor sources round-trip together and preserve dialogue order and current encounter", () => {
  const c = gameContent("causeway");
  c.dialogue.causeway.reverse();
  c.dialogue.causeway.push({
    id: "new-line",
    speaker: "cinder",
    text: "The crossing is open.",
  });
  const p = editProject(createLevelProject("causeway"), 0, [
    { type: "content", content: c },
    { type: "materials", materials: gameMaterials() },
    { type: "game-audio", audio: gameAudio() },
    { type: "sounds", bank: defaultSoundBank() },
    { type: "music", pattern: defaultMusicPattern() },
    { type: "pixels", clip: defaultPixelClip() },
  ]);
  const file = exportLevelProject(p);
  assert.deepEqual(parseLevelProject(file), p);
  assert.equal(p.encounter, "causeway");
  assert.equal(p.content!.dialogue.causeway[2].speaker, "cinder");
  const legacy = createLevelProject();
  assert.deepEqual(parseLevelProject(exportLevelProject(legacy)), legacy);
});
test("existing game audio source rejects malformed parameters and preserves precise original note frequencies", () => {
  const p = gameAudio();
  assert.equal(p.stepMs, 650);
  assert.deepEqual(p.notes.slice(0, 4), [220, 261.63, 329.63, 293.66]);
  assert.equal(p.skillHz, 440);
  assert.equal(p.moveHz, 280);
  assert.deepEqual(validateGameAudio(p), p);
  for (const change of [
    { notes: [220] },
    { skillHz: 0 },
    { volume: NaN },
    { stepMs: 99 },
    { waveform: "noise" },
    { unknown: true },
  ])
    assert.throws(() => validateGameAudio({ ...p, ...change }));
});
test("production AudioScore consumes edited frequencies and timing and cancels pending starts on disposal", async () => {
  const original = {
    AudioContext: globalThis.AudioContext,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  };
  const frequencies: number[] = [],
    intervals: number[] = [];
  let pending: (() => void) | undefined,
    delayed = false;
  class Context {
    currentTime = 0;
    state = "running";
    destination = {};
    async resume() {
      if (delayed) await new Promise<void>((resolve) => (pending = resolve));
    }
    async suspend() {
      this.state = "suspended";
    }
    async close() {
      this.state = "closed";
    }
    createOscillator() {
      return {
        type: "",
        frequency: {
          set value(n: number) {
            frequencies.push(n);
          },
        },
        connect: () => ({ connect: () => {} }),
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect: () => ({}),
      };
    }
  }
  try {
    globalThis.AudioContext = Context as any;
    globalThis.setInterval = ((_: any, ms: number) => {
      intervals.push(ms);
      return 123;
    }) as any;
    globalThis.clearInterval = (() => {}) as any;
    const source = gameAudio();
    source.notes[0] = 330;
    source.skillHz = 720;
    source.moveHz = 360;
    source.stepMs = 925;
    const player = new AudioScore(source);
    await player.start();
    player.feedback("skill");
    player.feedback("move");
    assert.deepEqual(frequencies, [330, 165, 720, 360]);
    assert.deepEqual(intervals, [925]);
    player.dispose();
    delayed = true;
    const cancelled = new AudioScore();
    const start = cancelled.start();
    cancelled.dispose();
    pending!();
    await start;
    assert.equal(intervals.length, 1);
  } finally {
    globalThis.AudioContext = original.AudioContext;
    globalThis.setInterval = original.setInterval;
    globalThis.clearInterval = original.clearInterval;
  }
});
