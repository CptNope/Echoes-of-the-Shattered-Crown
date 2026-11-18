import { test } from "node:test";
import assert from "node:assert/strict";
import {
  animationFrame,
  chooseAnimation,
  actionClip,
  actionCueChanged,
  animationStates,
  clips,
  clipDuration,
} from "./animation";
import { createBattle, command, validateSave } from "./engine";
test("looping clips wrap at exact frame boundaries", () => {
  for (const s of ["idle", "walk", "guard", "victory"] as const) {
    const row = clips[s].row * 4,
      ms = clips[s].frameMs;
    assert.equal(animationFrame(s, -1), row);
    assert.equal(animationFrame(s, ms - 1), row);
    assert.equal(animationFrame(s, ms), row + 1);
    assert.equal(animationFrame(s, ms * 4), row);
  }
});
test("one-shot clips hold their final frame", () => {
  for (const s of ["attack", "cast", "hurt", "downed"] as const) {
    assert.equal(animationFrame(s, clipDuration(s) - 1), clips[s].row * 4 + 3);
    assert.equal(animationFrame(s, 999999), clips[s].row * 4 + 3);
  }
});
test("reduced motion selects stable representative poses", () => {
  for (const s of animationStates)
    assert.equal(animationFrame(s, 0, true), animationFrame(s, 999999, true));
  assert.equal(animationFrame("walk", 900, true), 0);
  assert.equal(animationFrame("downed", 0, true), 31);
});
test("visual state priority preserves downing, recoil and travel", () => {
  const s = {
    hp: 100,
    walking: false,
    hurt: false,
    action: null,
    result: "playing",
    team: "ally",
    guard: false,
  } as const;
  assert.equal(chooseAnimation(s), "idle");
  assert.equal(chooseAnimation({ ...s, guard: true }), "guard");
  assert.equal(
    chooseAnimation({ ...s, result: "victory", guard: true }),
    "victory",
  );
  assert.equal(chooseAnimation({ ...s, result: "defeat" }), "idle");
  assert.equal(
    chooseAnimation({ ...s, action: "cast", result: "victory" }),
    "cast",
  );
  assert.equal(
    chooseAnimation({ ...s, walking: true, action: "attack" }),
    "walk",
  );
  assert.equal(chooseAnimation({ ...s, hurt: true, walking: true }), "hurt");
  assert.equal(chooseAnimation({ ...s, hp: 0, hurt: true }), "downed");
});
test("valid combat actions record a compatible cosmetic cue", () => {
  let s = createBattle(17);
  s.units[0].job = "runewarden";
  const next = command(s, { type: "skill", skill: "aegis", x: 2, z: 5 });
  assert.deepEqual(next.lastAction, {
    unit: s.active,
    skill: "aegis",
    turn: s.turn,
  });
  assert.equal(actionClip("aegis"), "cast");
  assert.equal(actionClip("strike"), "attack");
  assert(validateSave(next));
  const old = structuredClone(next);
  delete old.lastAction;
  assert(validateSave(old));
  const bad = structuredClone(next);
  bad.lastAction!.unit = "missing";
  assert.equal(validateSave(bad), false);
  assert.equal(
    command(s, { type: "skill", skill: "aegis", x: 99, z: 99 }).lastAction,
    undefined,
  );
});
test("loaded and repeated snapshots do not replay action cues", () => {
  const cue = { unit: "mae", skill: "strike" as const, turn: 1 };
  assert(!actionCueChanged(undefined, undefined));
  assert(actionCueChanged(undefined, cue));
  assert(!actionCueChanged(cue, { ...cue }));
  assert(actionCueChanged(cue, { ...cue, turn: 2 }));
  assert(!actionCueChanged(cue, undefined));
});
