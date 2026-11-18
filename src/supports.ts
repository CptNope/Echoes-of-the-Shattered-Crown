import { jobs, unlocked, type JobId, type SkillId } from "./data";
import type { Bonuses } from "./equipment";
export type SupportId =
  | "bulwark"
  | "fleetfoot"
  | "channel"
  | "secondwind"
  | "reprisal"
  | "runelore"
  | "stormborn"
  | "timeless";
export type SupportSlot = "passive" | "reaction" | "movement";
export type SupportSlots = Record<SupportSlot, SupportId | null>;
export interface SupportProfile {
  jp: Partial<Record<JobId, number>>;
  learned: SkillId[];
  learnedSupport?: SupportId[];
  supportSlots?: SupportSlots;
}
export const masteryJP = 240,
  supportCost = 120;
export const supports: Record<
  SupportId,
  {
    id: SupportId;
    job: JobId;
    name: string;
    slot: SupportSlot;
    description: string;
    bonuses?: Partial<Bonuses>;
  }
> = {
  bulwark: {
    id: "bulwark",
    job: "vanguard",
    name: "Steadfast",
    slot: "passive",
    description: "+2 armor in any primary job.",
    bonuses: { armor: 2 },
  },
  fleetfoot: {
    id: "fleetfoot",
    job: "dancer",
    name: "Lightfoot",
    slot: "movement",
    description: "+1 movement in any primary job.",
    bonuses: { move: 1 },
  },
  channel: {
    id: "channel",
    job: "arcanist",
    name: "Deep channel",
    slot: "passive",
    description: "+3 magic. Fixed healing amounts are unchanged.",
    bonuses: { magic: 3 },
  },
  secondwind: {
    id: "secondwind",
    job: "lifebinder",
    name: "Second wind",
    slot: "reaction",
    description:
      "After surviving an enemy ability hit, spend 2 energy to restore up to 4 HP. No reaction to hazards or ripostes.",
  },
  reprisal: {
    id: "reprisal",
    job: "shadowrunner",
    name: "Close reprisal",
    slot: "reaction",
    description:
      "After surviving an adjacent enemy Weapon strike, return 5 damage. Stacks with the native Blade Dancer riposte.",
  },
  runelore: {
    id: "runelore",
    job: "runewarden",
    name: "Runic discipline",
    slot: "passive",
    description: "+1 armor and +2 magic.",
    bonuses: { armor: 1, magic: 2 },
  },
  stormborn: {
    id: "stormborn",
    job: "stormherald",
    name: "Storm pulse",
    slot: "passive",
    description: "+2 magic and +1 speed.",
    bonuses: { magic: 2, speed: 1 },
  },
  timeless: {
    id: "timeless",
    job: "chronoweaver",
    name: "Unhurried step",
    slot: "movement",
    description: "+2 speed, bringing the next activation sooner.",
    bonuses: { speed: 2 },
  },
};
export const emptySupports = (): SupportSlots => ({
  passive: null,
  reaction: null,
  movement: null,
});
export const mastered = (m: SupportProfile, job: JobId) =>
  unlocked(job, m.jp) &&
  (m.jp[job] ?? 0) >= masteryJP &&
  jobs[job].skills.every((id) => m.learned.includes(id));
export function hasSupport(m: SupportProfile, id: SupportId) {
  return (
    m.supportSlots?.[supports[id].slot] === id &&
    (m.learnedSupport ?? []).includes(id)
  );
}
export function supportBonuses(m: SupportProfile): Bonuses {
  const b: Bonuses = {
    attack: 0,
    armor: 0,
    magic: 0,
    speed: 0,
    move: 0,
    hp: 0,
  };
  for (const slot of ["passive", "reaction", "movement"] as const) {
    const id = m.supportSlots?.[slot];
    if (id && hasSupport(m, id))
      for (const [k, v] of Object.entries(supports[id].bonuses ?? {}))
        b[k as keyof Bonuses] += v;
  }
  return b;
}
export function validSupports(m: SupportProfile) {
  if (m.learnedSupport === undefined && m.supportSlots === undefined)
    return true;
  if (
    !Array.isArray(m.learnedSupport) ||
    new Set(m.learnedSupport).size !== m.learnedSupport.length ||
    !m.learnedSupport.every((id) => Object.hasOwn(supports, id))
  )
    return false;
  if (
    !m.supportSlots ||
    typeof m.supportSlots !== "object" ||
    Object.keys(m.supportSlots).length !== 3
  )
    return false;
  return (["passive", "reaction", "movement"] as const).every((slot) => {
    const id = m.supportSlots![slot];
    return (
      id === null ||
      (Object.hasOwn(supports, id) &&
        supports[id!].slot === slot &&
        m.learnedSupport!.includes(id!))
    );
  });
}
