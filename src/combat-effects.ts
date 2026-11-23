import type { AbilityCues } from "./studio-assets";
import type { EffectStyle, ParticleKind } from "./effect-style";
export type { ParticleKind } from "./effect-style";
import { mapDimensions } from "./map-layout";
import { baseSkillId } from "./data";
import { skills, type SkillId } from "./data";
import type { Battle } from "./engine";
import type { ActionCue } from "./animation";
export type EffectAtlas = "martial" | "elements" | "support";
export interface EffectRecipe {
  atlas: EffectAtlas;
  clip: number;
  color: number;
  size: number;
  frameMs: number;
  travelMs: number;
  particle: ParticleKind;
  tint: number;
  particles: number;
  opacity: number;
}
const recipe = (
  atlas: EffectAtlas,
  clip: number,
  color: number,
  size: number,
  particle: ParticleKind,
  travelMs = 220,
  frameMs = 75,
): EffectRecipe => ({
  atlas,
  clip,
  color,
  size,
  particle,
  travelMs,
  frameMs,
  tint: 0xffffff,
  particles: 1,
  opacity: 0.78,
});
export const effectRecipes: Record<SkillId, EffectRecipe> = {
  strike: recipe("martial", 0, 0xd6ad62, 1.65, "sparks", 0, 60),
  cleave: recipe("martial", 1, 0xc9af68, 1.9, "sparks", 0, 70),
  gloam: recipe("martial", 2, 0x9274cf, 1.6, "shadow", 100, 65),
  rally: recipe("martial", 3, 0xebd08b, 1.9, "motes", 200, 90),
  ember: recipe("elements", 0, 0xf18542, 1.85, "embers", 280, 80),
  frost: recipe("elements", 1, 0x78bbd3, 1.7, "ice", 230, 80),
  surge: recipe("elements", 2, 0x7cdde0, 1.65, "electric", 100, 65),
  raincall: recipe("elements", 3, 0x6eacba, 1.7, "rain", 260, 85),
  mend: recipe("support", 0, 0xa2c995, 1.7, "motes", 260, 95),
  aegis: recipe("support", 1, 0xcdbb79, 1.75, "motes", 180, 90),
  haste: recipe("support", 2, 0xcdb38a, 1.55, "time", 200, 85),
  delay: recipe("support", 2, 0xa296ce, 1.65, "time", 220, 90),
  veil: recipe("support", 3, 0x976fc4, 1.65, "shadow", 240, 85),
};
export interface GridPoint {
  x: number;
  z: number;
}
export interface EffectPlan {
  skill: SkillId;
  recipe: EffectRecipe;
  origin: GridPoint;
  target: GridPoint;
  tiles: GridPoint[];
  hits: GridPoint[];
  seed: number;
}
export const MAX_EFFECT_SPRITES = 24,
  MAX_EFFECT_PARTICLES = 256;
export function effectFrame(
  skill: SkillId,
  ageMs: number,
  reduced = false,
): number {
  return recipeFrame(effectRecipes[skill], ageMs, reduced);
}
export function resolveEffectRecipe(
  skill: SkillId,
  style?: EffectStyle,
): EffectRecipe {
  const r = { ...effectRecipes[skill] };
  if (!style) return r;
  for (const name of [
    "size",
    "frameMs",
    "travelMs",
    "particle",
    "particles",
    "opacity",
  ] as const)
    if (style[name] !== undefined) (r as any)[name] = style[name];
  if (style.tint) r.tint = Number.parseInt(style.tint.slice(1), 16);
  if (style.particleColor)
    r.color = Number.parseInt(style.particleColor.slice(1), 16);
  return r;
}
export function recipeFrame(
  r: EffectRecipe,
  ageMs: number,
  reduced = false,
): number {
  return (
    r.clip * 8 +
    (reduced ? 3 : Math.min(7, Math.max(0, Math.floor(ageMs / r.frameMs))))
  );
}
export function effectSeed(cue: ActionCue): number {
  const text =
    cue.unit +
    ":" +
    cue.skill +
    ":" +
    cue.turn +
    ":" +
    cue.target?.x +
    ":" +
    cue.target?.z;
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function planCombatEffect(
  cue: ActionCue,
  battle: Battle,
  cues?: AbilityCues,
): EffectPlan | null {
  const actor = battle.units.find((u) => u.id === cue.unit),
    target = cue.target;
  if (
    !actor ||
    !target ||
    !Number.isInteger(target.x) ||
    !Number.isInteger(target.z) ||
    target.x < 0 ||
    target.x >= mapDimensions(battle).width ||
    target.z < 0 ||
    target.z >= mapDimensions(battle).height
  )
    return null;
  const sk = (battle.rules?.skills ?? skills)[cue.skill];
  if (!sk) return null;
  const tiles = battle.tiles
    .filter(
      (t) => Math.abs(t.x - target.x) + Math.abs(t.z - target.z) <= sk.radius,
    )
    .map((t) => ({ x: t.x, z: t.z }));
  const hits = (cue.outcomes ?? [])
    .filter((o) => o.result !== "miss")
    .flatMap((o) => {
      const u = battle.units.find((v) => v.id === o.unit);
      return u ? [{ x: u.x, z: u.z }] : [];
    });
  const family =
    cues?.[cue.skill]?.effect ?? baseSkillId(cue.skill, battle.rules?.skills);
  return {
    skill: family,
    recipe: resolveEffectRecipe(family, cues?.[cue.skill]?.style),
    origin: { x: actor.x, z: actor.z },
    target: { ...target },
    tiles,
    hits,
    seed: effectSeed(cue),
  };
}
export function particleOffset(seed: number, index: number): number {
  let n = (seed + Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
  return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
}
