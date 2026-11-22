import { skills, type SkillId, type JobId } from "./data";
export const animationStates = [
  "idle",
  "walk",
  "attack",
  "cast",
  "hurt",
  "guard",
  "victory",
  "downed",
] as const;
export type AnimationState = (typeof animationStates)[number];
export const clips: Record<
  AnimationState,
  { row: number; frameMs: number; loop: boolean }
> = {
  idle: { row: 0, frameMs: 220, loop: true },
  walk: { row: 1, frameMs: 100, loop: true },
  attack: { row: 2, frameMs: 110, loop: false },
  cast: { row: 3, frameMs: 140, loop: false },
  hurt: { row: 4, frameMs: 95, loop: false },
  guard: { row: 5, frameMs: 240, loop: true },
  victory: { row: 6, frameMs: 220, loop: true },
  downed: { row: 7, frameMs: 150, loop: false },
};
export const clipDuration = (state: AnimationState) => clips[state].frameMs * 4;
export function animationFrame(
  state: AnimationState,
  elapsed: number,
  reduced = false,
): number {
  const c = clips[state];
  let frame = Math.max(0, Math.floor(elapsed / c.frameMs));
  if (reduced) {
    if (state === "walk") return 0;
    frame = state === "downed" ? 3 : state === "idle" ? 0 : 1;
  } else frame = c.loop ? frame % 4 : Math.min(3, frame);
  return c.row * 4 + frame;
}
export const actionClip = (
  skill: SkillId,
  catalog = skills,
): "attack" | "cast" =>
  catalog[skill].element === "physical" ? "attack" : "cast";
export function chooseAnimation(s: {
  hp: number;
  walking: boolean;
  hurt: boolean;
  action: "attack" | "cast" | null;
  result: "playing" | "victory" | "defeat";
  team: "ally" | "enemy";
  guard: boolean;
}): AnimationState {
  if (s.hp <= 0) return "downed";
  if (s.hurt) return "hurt";
  if (s.walking) return "walk";
  if (s.action) return s.action;
  if (
    (s.result === "victory" && s.team === "ally") ||
    (s.result === "defeat" && s.team === "enemy")
  )
    return "victory";
  return s.guard ? "guard" : "idle";
}
export interface AnimationSheet {
  file: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  sourceSha256: string;
  idleHeight: number;
  ground: number[];
  bounds: number[][];
  opaque: number[];
  frameHashes: string[];
}
export interface AnimationManifest {
  version: 1;
  columns: 4;
  rows: 8;
  framesPerState: 4;
  states: AnimationState[];
  sheets: Record<JobId, AnimationSheet>;
}
export interface ActionCue {
  unit: string;
  skill: SkillId;
  turn: number;
  target?: { x: number; z: number };
  outcomes?: { unit: string; result: "hit" | "miss" | "heal" | "buff" }[];
}
export function actionCueChanged(
  before: ActionCue | undefined,
  after: ActionCue | undefined,
): boolean {
  return (
    !!after &&
    (!before ||
      before.turn !== after.turn ||
      before.unit !== after.unit ||
      before.skill !== after.skill)
  );
}
