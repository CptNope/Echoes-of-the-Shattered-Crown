import { skills, type SkillId, type BuiltinSkillId } from "./data";
import {
  SOUND_EVENTS,
  resolvedSoundEvents,
  type SoundEvent,
} from "./studio-sfx";
import {
  validateNativeSprite,
  type NativeSprite,
} from "./studio-native-sprites";
import type { Battle } from "./engine";
import type { LevelProject } from "./studio-project";
import type { RuleCatalog } from "./studio-rules";
export interface AbilityCue {
  effect: BuiltinSkillId;
  sound: SoundEvent;
}
export type AbilityCues = Partial<Record<SkillId, AbilityCue>>;
export function nativeSources(
  p: Pick<LevelProject, "nativeSprite" | "nativeSprites">,
): NativeSprite[] {
  return p.nativeSprites ?? (p.nativeSprite ? [p.nativeSprite] : []);
}
export function validateNativeLibrary(raw: unknown): NativeSprite[] {
  if (!Array.isArray(raw) || raw.length > 24)
    throw Error("Use at most 24 native sprite assignments.");
  const ids = new Set<string>(),
    images = new Map<string, string>();
  return raw.map((v) => {
    const s = validateNativeSprite(v);
    if (ids.has(s.actorId))
      throw Error("Only one native sheet may be assigned to each actor.");
    ids.add(s.actorId);
    if (images.has(s.sha256) && images.get(s.sha256) !== s.image)
      throw Error("Conflicting native image digest.");
    images.set(s.sha256, s.image);
    return s;
  });
}
export function upsertNative(
  p: Pick<LevelProject, "nativeSprite" | "nativeSprites">,
  s: NativeSprite,
): NativeSprite[] {
  return validateNativeLibrary([
    ...nativeSources(p).filter((a) => a.actorId !== s.actorId),
    s,
  ]);
}
export function validateAbilityCues(
  raw: unknown,
  rules?: RuleCatalog,
): AbilityCues {
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    Object.keys(raw).length > 128
  )
    throw Error("Invalid ability feedback catalog.");
  const out: AbilityCues = {};
  for (const [id, v] of Object.entries(raw)) {
    if (!Object.hasOwn(rules?.skills ?? skills, id))
      throw Error(
        "Unknown feedback ability. Remove its binding before deleting the ability.",
      );
    if (
      !v ||
      typeof v !== "object" ||
      Array.isArray(v) ||
      Object.keys(v).length !== 2 ||
      !Object.hasOwn(v, "effect") ||
      !Object.hasOwn(v, "sound") ||
      !Object.hasOwn(skills, (v as AbilityCue).effect) ||
      !SOUND_EVENTS.includes((v as AbilityCue).sound)
    )
      throw Error("Choose an existing VFX family and sound cue.");
    out[id as SkillId] = { ...(v as AbilityCue) };
  }
  return out;
}
export function abilitySoundEvents(
  before: Battle["lastAction"],
  after: Battle["lastAction"],
  cues?: AbilityCues,
): SoundEvent[] {
  const binding = after && cues?.[after.skill];
  if (!binding) return resolvedSoundEvents(before, after);
  if (
    !after ||
    JSON.stringify([
      before?.unit,
      before?.skill,
      before?.turn,
      before?.target,
    ]) === JSON.stringify([after.unit, after.skill, after.turn, after.target])
  )
    return [];
  const events = resolvedSoundEvents(before, after);
  return [
    ...new Set(
      events.length
        ? events.map((e) => (e === "miss" ? e : binding.sound))
        : [binding.sound],
    ),
  ];
}
