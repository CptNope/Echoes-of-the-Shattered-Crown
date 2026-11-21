import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultPixelClip,
  editPixelClip,
  validatePixelClip,
  pixelSequence,
  pixelClipDuration,
  pixelStateFrame,
  pixelFrameAt,
  compilePixelSheet,
  renderPixelFrame,
  PIXEL_STATES,
} from "./studio-pixels";
import {
  createLevelProject,
  exportLevelProject,
  parseLevelProject,
  PROJECT_LIMIT,
  applyProjectEdits,
  travelProjectHistory,
  editProject,
} from "./studio-project";
import { defaultSoundBank } from "./studio-sfx";
import { defaultMusicPattern } from "./studio-music";
import { createBattle, command } from "./engine";
import { actionClip, chooseAnimation } from "./animation";
const tagged = () =>
  editPixelClip(defaultPixelClip(), { type: "create-clips" });
test("explicit action conversion preserves idle source and creates independent owned copies", () => {
  const old = defaultPixelClip(),
    before = structuredClone(old),
    p = editPixelClip(old, { type: "create-clips" });
  assert.deepEqual(old, before);
  assert.deepEqual(p.frames.slice(0, 2), old.frames);
  assert.equal(p.frames.length, 8);
  assert.equal(new Set(Object.values(p.clips!).flat()).size, 8);
  const walk = p.clips!.walk[0],
    changed = editPixelClip(p, {
      type: "paint",
      frameId: walk,
      layerId: "detail",
      points: [{ x: 0, y: 0, color: 7 }],
    });
  assert.deepEqual(
    changed.frames.find((f) => f.id === p.clips!.idle[0]),
    p.frames[0],
  );
  assert.notDeepEqual(
    renderPixelFrame(
      changed,
      changed.frames.findIndex((f) => f.id === walk),
    ),
    renderPixelFrame(
      p,
      p.frames.findIndex((f) => f.id === walk),
    ),
  );
  assert.throws(() => editPixelClip(p, { type: "create-clips" }));
});
test("action clip references reject missing, shared, orphaned and overfull frames", () => {
  const p = tagged();
  for (const mutate of [
    (p: any) => (p.clips.cast = []),
    (p: any) => (p.clips.walk[0] = "missing"),
    (p: any) => (p.clips.walk[0] = p.clips.idle[0]),
    (p: any) => (p.clips.extra = p.clips.idle),
    (p: any) =>
      p.frames.push({ ...structuredClone(p.frames[0]), id: "orphan" }),
    (p: any) => delete p.clips.cast,
  ]) {
    const bad = structuredClone(p);
    mutate(bad);
    assert.throws(() => validatePixelClip(bad));
  }
});
test("frame operations stay within the owning action and retain IDs through reordering", () => {
  let p = tagged();
  const id = p.clips!.attack[0],
    idle = structuredClone(pixelSequence(p, "idle"));
  p = editPixelClip(p, { type: "duplicate", frameId: id, state: "attack" });
  assert.equal(p.clips!.attack.length, 3);
  assert.deepEqual(pixelSequence(p, "idle"), idle);
  const copy = p.clips!.attack[1];
  p = editPixelClip(p, {
    type: "move",
    frameId: copy,
    state: "attack",
    direction: 1,
  });
  assert.equal(p.clips!.attack[2], copy);
  assert.throws(() =>
    editPixelClip(p, { type: "delete", frameId: id, state: "walk" }),
  );
  p = editPixelClip(p, { type: "delete", frameId: copy, state: "attack" });
  p = editPixelClip(p, {
    type: "delete",
    frameId: p.clips!.attack[1],
    state: "attack",
  });
  assert.throws(() =>
    editPixelClip(p, { type: "delete", frameId: id, state: "attack" }),
  );
});
test("idle and walk loop while attack/cast hold their final source frame", () => {
  let p = tagged();
  for (const state of PIXEL_STATES) {
    p = editPixelClip(p, {
      type: "timing",
      frameId: p.clips![state][0],
      durationMs: 40,
    });
    p = editPixelClip(p, {
      type: "timing",
      frameId: p.clips![state][1],
      durationMs: 60,
    });
  }
  p.frames.reverse();
  validatePixelClip(p);
  for (const state of PIXEL_STATES) {
    const first = p.frames.findIndex((f) => f.id === p.clips![state][0]),
      last = p.frames.findIndex((f) => f.id === p.clips![state][1]);
    assert.equal(pixelClipDuration(p, state), 100);
    assert.equal(pixelStateFrame(p, state, 39), first);
    assert.equal(pixelStateFrame(p, state, 40), last);
    assert.equal(
      pixelStateFrame(p, state, 100),
      state === "idle" || state === "walk" ? first : last,
    );
    assert.equal(pixelStateFrame(p, state, 10000, true), first);
  }
  assert.equal(
    pixelStateFrame(p, "guard", 0),
    p.frames.findIndex((f) => f.id === p.clips!.idle[0]),
  );
  assert.equal(
    pixelStateFrame(p, "downed", 0, true),
    p.frames.findIndex((f) => f.id === p.clips!.idle.at(-1)),
  );
});
test("legacy clips keep their original loop and old project JSON gains no automatic tags", () => {
  const p = defaultPixelClip(),
    project = { ...createLevelProject(), pixels: p };
  for (const state of PIXEL_STATES)
    assert.equal(pixelStateFrame(p, state, 700), pixelFrameAt(p, 700));
  assert.equal(
    parseLevelProject(exportLevelProject(project)).pixels!.clips,
    undefined,
  );
  assert.equal(pixelStateFrame(p, "downed", 0), p.frames.length - 1);
});
test("sixteen-frame rich projects export below the import limit without losing any source", () => {
  let clip = defaultPixelClip();
  clip = editPixelClip(clip, { type: "duplicate", frameId: clip.frames[0].id });
  clip = editPixelClip(clip, { type: "duplicate", frameId: clip.frames[0].id });
  clip = editPixelClip(clip, { type: "create-clips" });
  const project = {
    ...createLevelProject(),
    pixels: clip,
    sounds: defaultSoundBank(),
    music: defaultMusicPattern(),
  };
  assert.equal(clip.frames.length, 16);
  assert(
    new TextEncoder().encode(JSON.stringify(project, null, 2)).length >
      PROJECT_LIMIT,
  );
  const text = exportLevelProject(project);
  assert(new TextEncoder().encode(text).length <= PROJECT_LIMIT);
  assert.deepEqual(parseLevelProject(text), project);
  const sheet = compilePixelSheet(clip);
  assert.equal(sheet.width, 256);
  for (let n = 0; n < 16; n++) {
    const frame = renderPixelFrame(clip, n);
    for (let y = 0; y < 24; y++)
      assert.deepEqual(
        sheet.pixels.slice((y * 256 + n * 16) * 4, (y * 256 + n * 16 + 16) * 4),
        frame.slice(y * 64, (y + 1) * 64),
      );
  }
});
test("action sources share atomic project edits, undo and round trips", () => {
  const old = { ...createLevelProject(), pixels: defaultPixelClip() },
    clip = tagged();
  const state = applyProjectEdits({ project: old, past: [], future: [] }, [
    { type: "pixels", clip },
  ]);
  assert.deepEqual(
    parseLevelProject(exportLevelProject(state.project)),
    state.project,
  );
  assert.equal(
    travelProjectHistory(state, "undo").project.pixels!.clips,
    undefined,
  );
  assert.deepEqual(
    travelProjectHistory(travelProjectHistory(state, "undo"), "redo").project
      .pixels,
    clip,
  );
  const invalid = structuredClone(clip);
  invalid.clips!.idle = [];
  assert.throws(() =>
    editProject(old, 0, [
      { type: "tile", x: 3, z: 4, h: 1 },
      { type: "pixels", clip: invalid },
    ]),
  );
  assert.equal(old.revision, 0);
});
test("real physical and magical commands select their action art without extra RNG or state changes", () => {
  const p = tagged(),
    b = createBattle();
  const target = b.units.find((u) => u.id === "sentinel")!;
  target.x = 3;
  target.z = 5;
  const attack = command(b, { type: "skill", skill: "strike", x: 3, z: 5 });
  assert.notEqual(attack, b);
  assert.equal(actionClip(attack.lastAction!.skill), "attack");
  const c = createBattle();
  c.active = "ilya";
  const foe = c.units.find((u) => u.id === "sentinel")!;
  foe.x = 3;
  foe.z = 4;
  const cast = command(c, { type: "skill", skill: "ember", x: 3, z: 4 });
  assert.notEqual(cast, c);
  assert.equal(actionClip(cast.lastAction!.skill), "cast");
  for (const result of [attack, cast]) {
    const before = structuredClone(result),
      state = chooseAnimation({
        hp: 100,
        walking: false,
        hurt: false,
        action: actionClip(result.lastAction!.skill),
        result: "playing",
        team: "ally",
        guard: false,
      });
    assert.equal(
      p.frames[pixelStateFrame(p, state, 0)].id,
      p.clips![state as "attack" | "cast"][0],
    );
    assert.deepEqual(result, before);
  }
});
