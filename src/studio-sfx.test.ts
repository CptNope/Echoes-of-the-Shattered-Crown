import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultSoundBank,
  cueFor,
  renderSound,
  soundWav,
  validateSoundBank,
  resolvedSoundEvents,
  StudioSfxPlayer,
  SFX_RATE,
  SOUND_EVENTS,
} from "./studio-sfx";
import {
  createLevelProject,
  exportLevelProject,
  parseLevelProject,
  applyProjectEdits,
  travelProjectHistory,
  compileLevelProject,
} from "./studio-project";
import { command } from "./engine";

test("every cue produces deterministic finite bounded PCM with silent endpoints", () => {
  const bank = defaultSoundBank(),
    before = JSON.stringify(bank);
  for (const event of SOUND_EVENTS) {
    const pcm = renderSound(bank, event);
    assert.deepEqual(pcm, renderSound(bank, event));
    assert(pcm.some((v) => Math.abs(v) > 0.001));
    assert(pcm.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.6));
    assert.equal(pcm[0], 0);
    assert.equal(pcm.at(-1), 0);
    assert.equal(
      pcm.length,
      Math.ceil(
        (Math.max(
          ...cueFor(bank, event).layers.map((l) => l.durationMs + l.delayMs),
        ) *
          SFX_RATE) /
          1000,
      ),
    );
  }
  assert.equal(JSON.stringify(bank), before);
});
test("pitch, gain, noise seed, layer mute and delay change the rendered source", () => {
  const bank = defaultSoundBank(),
    original = renderSound(bank, "hit"),
    changed = structuredClone(bank);
  cueFor(changed, "hit").layers[0].frequency = 320;
  assert.notDeepEqual(renderSound(changed, "hit"), original);
  changed.gain = 0;
  assert(renderSound(changed, "hit").every((v) => v === 0));
  const noise = defaultSoundBank();
  cueFor(noise, "hit").seed++;
  assert.notDeepEqual(renderSound(noise, "hit"), original);
  cueFor(noise, "hit").layers.forEach((l) => (l.enabled = false));
  assert(renderSound(noise, "hit").every((v) => v === 0));
  const delayed = defaultSoundBank();
  cueFor(delayed, "miss").layers[0].delayMs = 100;
  assert(
    renderSound(delayed, "miss")
      .slice(0, Math.round(SFX_RATE * 0.1))
      .every((v) => v === 0),
  );
});
test("sound source rejects unbounded, malformed and unknown data before rendering", () => {
  for (const mutate of [
    (b: any) => b.cues.push(b.cues[0]),
    (b: any) => b.cues[0].layers.push(...Array(4).fill(b.cues[0].layers[0])),
    (b: any) => (b.gain = Infinity),
    (b: any) => (b.cues[0].seed = 1.5),
    (b: any) => (b.cues[0].layers[0].durationMs = 5000),
    (b: any) => (b.cues[0].layers[0].attackMs = 200),
    (b: any) => (b.cues[0].layers[0].waveform = ["sine"]),
    (b: any) => (b.cues[0].layers[0].customCode = "x"),
    (b: any) => (b.cues[0].event = "arbitrary"),
    (b: any) => (b.cues[0].layers[0].enabled = 1),
  ]) {
    const bank = defaultSoundBank();
    mutate(bank);
    assert.throws(() => validateSoundBank(bank));
  }
});
test("WAV export writes exact mono PCM16 samples, sample rate and RIFF lengths", () => {
  const pcm = renderSound(defaultSoundBank(), "heal"),
    bytes = soundWav(pcm),
    v = new DataView(bytes.buffer);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), "WAVE");
  assert.equal(v.getUint32(4, true), bytes.length - 8);
  assert.equal(v.getUint16(22, true), 1);
  assert.equal(v.getUint32(24, true), SFX_RATE);
  assert.equal(v.getUint16(34, true), 16);
  assert.equal(v.getUint32(40, true), pcm.length * 2);
  for (let i = 0; i < pcm.length; i++)
    assert.equal(
      v.getInt16(44 + i * 2, true),
      Math.round(pcm[i] * (pcm[i] < 0 ? 32768 : 32767)) || 0,
    );
});
test("sound edits share project history and survive source export and reimport", () => {
  const original = createLevelProject(),
    bank = defaultSoundBank();
  cueFor(bank, "hit").layers[0].durationMs = 240;
  const next = applyProjectEdits({ project: original, past: [], future: [] }, [
    { type: "sounds", bank },
  ]);
  const imported = parseLevelProject(exportLevelProject(next.project));
  assert.deepEqual(imported.sounds, bank);
  assert.deepEqual(
    renderSound(imported.sounds!, "hit"),
    renderSound(bank, "hit"),
  );
  assert.equal(travelProjectHistory(next, "undo").project.sounds, undefined);
  assert.deepEqual(
    travelProjectHistory(travelProjectHistory(next, "undo"), "redo").project
      .sounds,
    bank,
  );
  assert.equal(
    parseLevelProject(exportLevelProject(original)).sounds,
    undefined,
  );
});
test("resolved sound bindings deduplicate snapshots and distinguish actual misses/heals/buffs", () => {
  const hit = {
    unit: "sera",
    skill: "strike" as const,
    turn: 1,
    target: { x: 6, z: 4 },
    outcomes: [
      { unit: "sentinel", result: "hit" as const },
      { unit: "cantor", result: "hit" as const },
    ],
  };
  assert.deepEqual(resolvedSoundEvents(undefined, hit), ["hit"]);
  assert.deepEqual(resolvedSoundEvents(hit, structuredClone(hit)), []);
  assert.deepEqual(
    resolvedSoundEvents(hit, {
      ...hit,
      turn: 2,
      outcomes: [{ unit: "sentinel", result: "miss" }],
    }),
    ["miss"],
  );
  assert.deepEqual(
    resolvedSoundEvents(undefined, {
      ...hit,
      outcomes: [
        { unit: "sera", result: "heal" },
        { unit: "mae", result: "buff" },
      ],
    }),
    ["heal", "buff"],
  );
  assert.deepEqual(resolvedSoundEvents(hit, undefined), []);
  assert.deepEqual(
    resolvedSoundEvents(undefined, { ...hit, outcomes: undefined }),
    [],
  );
});
test("real combat audio inspection changes neither combat RNG nor editable source", () => {
  const p = createLevelProject(),
    source = exportLevelProject(p),
    b = compileLevelProject(p);
  b.units.find((u) => u.id === "sentinel")!.x = 3;
  b.units.find((u) => u.id === "sentinel")!.z = 5;
  const next = command(b, { type: "skill", skill: "strike", x: 3, z: 5 }),
    snapshot = structuredClone(next);
  assert.notEqual(next, b);
  for (const event of resolvedSoundEvents(b.lastAction, next.lastAction))
    renderSound(defaultSoundBank(), event);
  assert.deepEqual(next, snapshot);
  assert.equal(exportLevelProject(p), source);
  assert.deepEqual(
    command(b, { type: "skill", skill: "strike", x: 3, z: 5 }),
    next,
  );
  assert.deepEqual(
    resolvedSoundEvents(
      next.lastAction,
      command(next, { type: "end" }).lastAction,
    ),
    [],
  );
});
test("sound player waits for user unlock, caps voices and disposes sources/context", async () => {
  const original = globalThis.AudioContext;
  const sources: any[] = [];
  let closed = 0;
  class FakeContext {
    state = "suspended";
    destination = {};
    async resume() {
      this.state = "running";
    }
    async close() {
      this.state = "closed";
      closed++;
    }
    createBuffer(_channels: number, length: number) {
      const samples = new Float32Array(length);
      return { getChannelData: () => samples };
    }
    createBufferSource() {
      const s = {
        buffer: null,
        onended: null,
        stops: 0,
        connect() {},
        disconnect() {},
        start() {},
        stop() {
          this.stops++;
        },
      };
      sources.push(s);
      return s;
    }
  }
  globalThis.AudioContext = FakeContext as unknown as typeof AudioContext;
  try {
    const player = new StudioSfxPlayer();
    assert.equal(player.play(defaultSoundBank(), "hit"), false);
    await player.unlock();
    for (let i = 0; i < 6; i++)
      assert.equal(player.play(defaultSoundBank(), "hit"), true);
    assert.equal(sources.filter((s) => s.stops > 0).length, 2);
    player.dispose();
    assert(sources.every((s) => s.stops === 1));
    assert.equal(closed, 1);
    assert.equal(player.play(defaultSoundBank(), "hit"), false);
    await assert.rejects(() => player.unlock(), /closed/);
  } finally {
    globalThis.AudioContext = original;
  }
});
