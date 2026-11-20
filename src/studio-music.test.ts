import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultMusicPattern,
  validateMusicPattern,
  renderMusic,
  MUSIC_RATE,
  noteName,
} from "./studio-music";
import { SFX_RATE, soundWav, StudioSfxPlayer } from "./studio-sfx";
import {
  createLevelProject,
  applyProjectEdits,
  travelProjectHistory,
  exportLevelProject,
  parseLevelProject,
  editProject,
} from "./studio-project";
test("music bar timing, rests and loop endpoints derive from tempo and source notes", () => {
  const p = defaultMusicPattern(),
    before = structuredClone(p);
  for (const tempo of [60, 100, 180]) {
    p.tempo = tempo;
    const pcm = renderMusic(p);
    assert.equal(pcm.length, Math.round((240 / tempo) * MUSIC_RATE));
    assert.deepEqual(pcm, renderMusic(p));
    assert(pcm.every((v) => Number.isFinite(v) && Math.abs(v) < 0.301));
    assert.equal(pcm[0], 0);
    assert.equal(pcm.at(-1), 0);
    const start = Math.round((60 / tempo / 4) * MUSIC_RATE),
      end = Math.round(((2 * 60) / tempo / 4) * MUSIC_RATE);
    assert(pcm.slice(start, end).every((v) => v === 0));
  }
  p.tempo = before.tempo;
  assert.deepEqual(p, before);
  assert.equal(noteName(60), "C4");
  assert.equal(noteName(null), "Rest");
});
test("music note, gain, instrument and gate changes affect sound without modifying input", () => {
  const p = defaultMusicPattern(),
    original = renderMusic(p);
  for (const changed of [
    { ...p, notes: p.notes.map((n, i) => (i === 0 ? 72 : n)) },
    { ...p, waveform: "sine" as const },
    { ...p, gate: 0.3 },
  ])
    assert.notDeepEqual(renderMusic(changed), original);
  assert(renderMusic({ ...p, gain: 0 }).every((v) => v === 0));
  assert(
    renderMusic({ ...p, notes: Array(16).fill(null) }).every((v) => v === 0),
  );
  assert.deepEqual(
    renderMusic({ ...p, enabled: false }),
    original,
    "Preview binding does not prevent draft audition",
  );
});
test("music validation rejects unbounded and unsupported authoring sources", () => {
  const p = defaultMusicPattern();
  for (const invalid of [
    { ...p, tempo: 0 },
    { ...p, tempo: Infinity },
    { ...p, gate: 1 },
    { ...p, gain: -1 },
    { ...p, notes: [60] },
    { ...p, notes: Array(16).fill(85) },
    { ...p, notes: Array(16).fill("60") },
    { ...p, enabled: 1 },
    { ...p, tracks: [] },
    { ...p, waveform: "custom-code" },
  ])
    assert.throws(() => validateMusicPattern(invalid));
});
test("music is preserved by the same project import, atomic batches and undo/redo", () => {
  const p = createLevelProject(),
    pattern = defaultMusicPattern();
  pattern.notes[0] = 60;
  const state = applyProjectEdits({ project: p, past: [], future: [] }, [
    { type: "music", pattern },
  ]);
  const restored = parseLevelProject(exportLevelProject(state.project));
  assert.deepEqual(restored.music, pattern);
  assert.equal(p.music, undefined);
  assert.equal(travelProjectHistory(state, "undo").project.music, undefined);
  assert.deepEqual(
    travelProjectHistory(travelProjectHistory(state, "undo"), "redo").project
      .music,
    pattern,
  );
  const before = exportLevelProject(p);
  assert.throws(() =>
    editProject(p, 0, [
      { type: "tile", x: 3, z: 4, h: 1 },
      { type: "music", pattern: { ...pattern, tempo: 999 } },
    ]),
  );
  assert.equal(exportLevelProject(p), before);
});
test("exported music WAV has the same sample rate and exact rendered PCM16 data", () => {
  assert.equal(MUSIC_RATE, SFX_RATE);
  const pcm = renderMusic(defaultMusicPattern()),
    wav = soundWav(pcm),
    view = new DataView(wav.buffer);
  assert.equal(wav.length, 44 + pcm.length * 2);
  assert.equal(view.getUint32(24, true), MUSIC_RATE);
  for (let i = 0; i < pcm.length; i++)
    assert.equal(
      view.getInt16(44 + i * 2, true),
      Math.round(pcm[i] * (pcm[i] < 0 ? 32768 : 32767)) || 0,
    );
});
test("music player replaces one loop and stop/dispose release the loop and SFX voices", async () => {
  const original = globalThis.AudioContext,
    sources: any[] = [];
  let closed = 0;
  class Context {
    state = "suspended";
    destination = {};
    async resume() {
      this.state = "running";
    }
    async close() {
      closed++;
      this.state = "closed";
    }
    createBuffer(_n: number, length: number) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      const s = {
        loop: false,
        stops: 0,
        disconnects: 0,
        buffer: null,
        onended: null,
        start() {},
        connect() {},
        stop() {
          this.stops++;
        },
        disconnect() {
          this.disconnects++;
        },
      };
      sources.push(s);
      return s;
    }
  }
  globalThis.AudioContext = Context as unknown as typeof AudioContext;
  try {
    const p = new StudioSfxPlayer(),
      pcm = renderMusic(defaultMusicPattern());
    assert.equal(p.playLoop(pcm), false);
    await p.unlock();
    assert.equal(p.playLoop(pcm), true);
    assert.equal(sources[0].loop, true);
    p.playLoop(pcm);
    assert.equal(sources[0].stops, 1);
    assert.throws(
      () => p.playLoop(new Float32Array(MUSIC_RATE * 4 + 1)),
      /Invalid/,
    );
    p.stop();
    assert.equal(sources[1].stops, 1);
    p.playLoop(pcm);
    p.dispose();
    assert(sources.every((s) => s.stops === 1 && s.disconnects === 1));
    assert.equal(closed, 1);
  } finally {
    globalThis.AudioContext = original;
  }
});
