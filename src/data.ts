export type BuiltinJobId =
  | "vanguard"
  | "dancer"
  | "arcanist"
  | "lifebinder"
  | "shadowrunner"
  | "runewarden"
  | "stormherald"
  | "chronoweaver";
export type JobId = BuiltinJobId | `custom-${string}`;
export type BuiltinSkillId =
  | "strike"
  | "cleave"
  | "ember"
  | "mend"
  | "surge"
  | "frost"
  | "veil"
  | "haste"
  | "rally"
  | "gloam"
  | "aegis"
  | "raincall"
  | "delay";
export type SkillId = BuiltinSkillId | `custom-${string}`;
export type Element = "physical" | "fire" | "ice" | "lightning" | "spirit";
export interface Skill {
  baseSkill?: BuiltinSkillId;
  id: SkillId;
  name: string;
  cost: number;
  range: number;
  power: number;
  radius: number;
  element: Element;
  kind: "damage" | "heal" | "buff";
  description: string;
  effect?: "consumeExposure" | "aegis" | "soak" | "delay";
}
export const skills: Record<SkillId, Skill> = {
  gloam: {
    id: "gloam",
    name: "Gloam pursuit",
    cost: 9,
    range: 2,
    power: 30,
    radius: 0,
    element: "physical",
    kind: "damage",
    effect: "consumeExposure",
    description:
      "A precise pursuit. An exposed target takes 12 extra damage in addition to the normal exposure bonus; a successful hit consumes exposure.",
  },
  aegis: {
    id: "aegis",
    name: "Oathguard",
    cost: 8,
    range: 3,
    power: 0,
    radius: 0,
    element: "spirit",
    kind: "buff",
    effect: "aegis",
    description:
      "Grant a living ally guard: 45% incoming damage reduction until their next activation. Also cleanse burn. Can target the caster.",
  },
  raincall: {
    id: "raincall",
    name: "Rain of glass",
    cost: 8,
    range: 4,
    power: 12,
    radius: 1,
    element: "spirit",
    kind: "damage",
    effect: "soak",
    description:
      "A cross-shaped magical shower. Successful hits soak enemies for three activations, preparing lightning synergy. Allies and terrain are unchanged.",
  },
  delay: {
    id: "delay",
    name: "Stolen hour",
    cost: 9,
    range: 4,
    power: 14,
    radius: 0,
    element: "spirit",
    kind: "damage",
    effect: "delay",
    description:
      "Deal spirit damage and delay a surviving enemy by 30 timeline ticks on a successful hit. Does not apply the slow status.",
  },

  strike: {
    id: "strike",
    name: "Weapon strike",
    cost: 0,
    range: 1,
    power: 24,
    radius: 0,
    element: "physical",
    kind: "damage",
    description:
      "A precise weapon attack. Height and flanking increase damage.",
  },
  cleave: {
    id: "cleave",
    name: "Sundering arc",
    cost: 7,
    range: 1,
    power: 29,
    radius: 1,
    element: "physical",
    kind: "damage",
    description: "Strike a cross of tiles. Allies in the arc are spared.",
  },
  ember: {
    id: "ember",
    name: "Cinder bloom",
    cost: 9,
    range: 4,
    power: 31,
    radius: 1,
    element: "fire",
    kind: "damage",
    description:
      "An explosive cross of flame. Burns targets for two turns and ignites grass.",
  },
  mend: {
    id: "mend",
    name: "Thread of life",
    cost: 8,
    range: 4,
    power: 36,
    radius: 0,
    element: "spirit",
    kind: "heal",
    description:
      "Restore 36 health to an ally, or revive a fallen ally with 24 health.",
  },
  surge: {
    id: "surge",
    name: "Glasslight bolt",
    cost: 10,
    range: 5,
    power: 32,
    radius: 0,
    element: "lightning",
    kind: "damage",
    description: "A lightning bolt. Deals 50% more damage to soaked targets.",
  },
  frost: {
    id: "frost",
    name: "Stillwater",
    cost: 6,
    range: 4,
    power: 20,
    radius: 1,
    element: "ice",
    kind: "damage",
    description:
      "Chill enemies and freeze water into traversable ice. Slows for two turns.",
  },
  veil: {
    id: "veil",
    name: "Dusk needle",
    cost: 6,
    range: 3,
    power: 28,
    radius: 0,
    element: "physical",
    kind: "damage",
    description: "A ranged blade that exposes the target to follow-up attacks.",
  },
  haste: {
    id: "haste",
    name: "Borrowed dawn",
    cost: 8,
    range: 3,
    power: 0,
    radius: 0,
    element: "spirit",
    kind: "buff",
    description: "Advance an ally’s next turn by 35 timeline ticks.",
  },
  rally: {
    id: "rally",
    name: "Lantern concord",
    cost: 0,
    range: 4,
    power: 42,
    radius: 1,
    element: "spirit",
    kind: "damage",
    description: "Spend 3 momentum for a coordinated burst. Allies are spared.",
  },
};
export interface Job {
  baseJob?: BuiltinJobId;
  id: JobId;
  name: string;
  role: string;
  color: string;
  move: number;
  speed: number;
  attack: number;
  armor: number;
  magic: number;
  skills: SkillId[];
  requires: Partial<Record<JobId, number>>;
}
export const jobs: Record<JobId, Job> = {
  vanguard: {
    id: "vanguard",
    name: "Vanguard",
    role: "Protection · heavy blade",
    color: "#d7ad5e",
    move: 3,
    speed: 10,
    attack: 9,
    armor: 9,
    magic: 0,
    skills: ["cleave"],
    requires: {},
  },
  dancer: {
    id: "dancer",
    name: "Blade Dancer",
    role: "Mobility · duelist",
    color: "#80c5ba",
    move: 5,
    speed: 14,
    attack: 7,
    armor: 3,
    magic: 0,
    skills: ["veil"],
    requires: {},
  },
  arcanist: {
    id: "arcanist",
    name: "Arcanist",
    role: "Elemental area control",
    color: "#df927c",
    move: 3,
    speed: 10,
    attack: 1,
    armor: 2,
    magic: 10,
    skills: ["ember", "frost"],
    requires: {},
  },
  lifebinder: {
    id: "lifebinder",
    name: "Lifebinder",
    role: "Restoration · spirit",
    color: "#b6c58f",
    move: 4,
    speed: 11,
    attack: 0,
    armor: 4,
    magic: 8,
    skills: ["mend"],
    requires: {},
  },
  shadowrunner: {
    id: "shadowrunner",
    name: "Shadowrunner",
    role: "Exposure · ranged blades",
    color: "#a9accb",
    move: 5,
    speed: 15,
    attack: 8,
    armor: 2,
    magic: 0,
    skills: ["veil", "gloam"],
    requires: { dancer: 3 },
  },
  runewarden: {
    id: "runewarden",
    name: "Runewarden",
    role: "Armored elemental hybrid",
    color: "#c3ba84",
    move: 3,
    speed: 9,
    attack: 5,
    armor: 11,
    magic: 6,
    skills: ["frost", "aegis"],
    requires: { vanguard: 3, arcanist: 2 },
  },
  stormherald: {
    id: "stormherald",
    name: "Storm Herald",
    role: "Lightning · water synergy",
    color: "#a7c7d0",
    move: 4,
    speed: 12,
    attack: 2,
    armor: 3,
    magic: 11,
    skills: ["surge", "frost", "raincall"],
    requires: { arcanist: 3 },
  },
  chronoweaver: {
    id: "chronoweaver",
    name: "Chronoweaver",
    role: "Timeline · support",
    color: "#d2bbd8",
    move: 4,
    speed: 13,
    attack: 0,
    armor: 3,
    magic: 9,
    skills: ["haste", "mend", "delay"],
    requires: { arcanist: 2, lifebinder: 3 },
  },
};
export const jobLevel = (jp: number) => 1 + Math.floor(jp / 60);
export const unlocked = (
  id: JobId,
  jp: Partial<Record<JobId, number>>,
  catalog = jobs,
) =>
  Object.entries(catalog[id].requires).every(
    ([j, n]) => jobLevel(jp[j as JobId] ?? 0) >= n!,
  );

/** Scoped custom records inherit a shipped mechanics/presentation archetype. */
export function baseJobId(id: JobId, catalog = jobs): BuiltinJobId {
  return (
    catalog[id]?.baseJob ??
    (Object.hasOwn(jobs, id) ? (id as BuiltinJobId) : "vanguard")
  );
}
export function baseSkillId(id: SkillId, catalog = skills): BuiltinSkillId {
  return (
    catalog[id]?.baseSkill ??
    (Object.hasOwn(skills, id) ? (id as BuiltinSkillId) : "strike")
  );
}
