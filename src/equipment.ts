import type { GearArtwork } from "./gear-art";
import type { JobId } from "./data";

export type BuiltinGearId =
  | "ironblade"
  | "twinsteel"
  | "cedarrod"
  | "willowstaff"
  | "leather"
  | "lamellar"
  | "wayboots"
  | "copperfocus"
  | "watchcharm"
  | "crownseal";
export type GearId = BuiltinGearId | `custom-${string}`;
export type GearSlot = "weapon" | "armor" | "relic";
export type Loadout = Record<GearSlot, GearId | null>;
export interface Bonuses {
  attack: number;
  armor: number;
  magic: number;
  speed: number;
  move: number;
  hp: number;
}
export interface Gear {
  icon?: GearArtwork;
  id: GearId;
  name: string;
  slot: GearSlot;
  price: number;
  sellPrice?: number;
  rewardOnly?: boolean;
  description: string;
  jobs?: JobId[];
  bonuses: Partial<Bonuses>;
}
const blades: JobId[] = ["vanguard", "dancer", "shadowrunner", "runewarden"];
const casters: JobId[] = [
  "arcanist",
  "lifebinder",
  "stormherald",
  "chronoweaver",
  "runewarden",
];
export const equipment: Record<GearId, Gear> = {
  "custom-watch-spear": {
    id: "custom-watch-spear",
    name: "Watchman's spear",
    slot: "weapon",
    price: 85,
    jobs: blades,
    bonuses: { attack: 5, armor: 1 },
    description:
      "A braced infantry weapon. Standard strikes remain adjacent; no extra reach is granted.",
  },
  "custom-duelist-rapier": {
    id: "custom-duelist-rapier",
    name: "Silverleaf rapier",
    slot: "weapon",
    price: 110,
    jobs: blades,
    bonuses: { attack: 4, speed: 2 },
    description:
      "A fast blade for physical fighters. Trades raw power for initiative.",
  },
  "custom-runic-maul": {
    id: "custom-runic-maul",
    name: "Runic maul",
    slot: "weapon",
    price: 130,
    jobs: ["vanguard", "runewarden"],
    bonuses: { attack: 8, speed: -1 },
    description:
      "A heavy hammer with greater attack and slower activations. Adds no stun or armor-breaking mechanic.",
  },
  "custom-storm-focus": {
    id: "custom-storm-focus",
    name: "Stormglass focus",
    slot: "weapon",
    price: 125,
    jobs: casters,
    bonuses: { magic: 6, armor: -1 },
    description:
      "A potent focus with less protection. Spell damage still uses the equipped class and ability.",
  },
  "custom-healers-crook": {
    id: "custom-healers-crook",
    name: "Pilgrim's crook",
    slot: "weapon",
    price: 95,
    jobs: casters,
    bonuses: { magic: 3, hp: 14 },
    description:
      "A resilient walking staff. Its magic bonus does not raise fixed-power healing amounts.",
  },
  "custom-scout-coat": {
    id: "custom-scout-coat",
    name: "Scout coat",
    slot: "armor",
    price: 70,
    bonuses: { armor: 2, speed: 1 },
    description:
      "Light protection for any class with a modest initiative bonus.",
  },
  "custom-channeler-robes": {
    id: "custom-channeler-robes",
    name: "Channeler's robes",
    slot: "armor",
    price: 100,
    bonuses: { armor: 1, magic: 2, hp: 8 },
    description:
      "Woven runes reinforce a spellcaster without a movement penalty. Any class may wear them.",
  },
  "custom-bastion-plate": {
    id: "custom-bastion-plate",
    name: "Bastion plate",
    slot: "armor",
    price: 155,
    jobs: ["vanguard", "runewarden"],
    bonuses: { armor: 6, hp: 22, move: -1, speed: -1 },
    description:
      "Heavy protection paid for in movement and initiative. No damage immunity.",
  },
  "custom-trail-vest": {
    id: "custom-trail-vest",
    name: "Trailwarden vest",
    slot: "armor",
    price: 110,
    bonuses: { armor: 2, hp: 18 },
    description: "Reinforced field gear suited to any company member.",
  },
  "custom-iron-signet": {
    id: "custom-iron-signet",
    name: "Iron signet",
    slot: "relic",
    price: 90,
    bonuses: { armor: 2 },
    description: "A defensive keepsake. Uses the normal armor calculation.",
  },
  "custom-ember-pendant": {
    id: "custom-ember-pendant",
    name: "Ember pendant",
    slot: "relic",
    price: 115,
    bonuses: { attack: 2, magic: 2 },
    description:
      "Balances physical and magical pressure. Grants no fire resistance.",
  },
  "custom-heartwood-token": {
    id: "custom-heartwood-token",
    name: "Heartwood token",
    slot: "relic",
    price: 95,
    bonuses: { hp: 20 },
    description: "Adds health without changing the bearer's movement or class.",
  },
  crownseal: {
    id: "crownseal",
    name: "Bellkeeper’s seal",
    slot: "relic",
    price: 0,
    rewardOnly: true,
    description:
      "Awarded once for clearing The silent belfry. A broken oath still carries power.",
    bonuses: { armor: 2, magic: 3 },
  },
  ironblade: {
    id: "ironblade",
    name: "Oathsteel blade",
    slot: "weapon",
    price: 60,
    description: "A reliable edge for the company's front line.",
    jobs: blades,
    bonuses: { attack: 4 },
  },
  twinsteel: {
    id: "twinsteel",
    name: "Ashen twinblades",
    slot: "weapon",
    price: 75,
    description: "Light paired blades reward quick footwork.",
    jobs: blades,
    bonuses: { attack: 3, speed: 1 },
  },
  cedarrod: {
    id: "cedarrod",
    name: "Glass-tipped rod",
    slot: "weapon",
    price: 65,
    description: "A shard of river glass focuses elemental spells.",
    jobs: casters,
    bonuses: { magic: 4 },
  },
  willowstaff: {
    id: "willowstaff",
    name: "Living willow staff",
    slot: "weapon",
    price: 65,
    description: "A living branch lends resilience to its bearer.",
    jobs: casters,
    bonuses: { magic: 2, hp: 8 },
  },
  leather: {
    id: "leather",
    name: "Company leathers",
    slot: "armor",
    price: 35,
    description: "Flexible protection without a movement penalty.",
    bonuses: { armor: 1, hp: 4 },
  },
  lamellar: {
    id: "lamellar",
    name: "Bronze lamellar",
    slot: "armor",
    price: 95,
    description: "Strong protection at the cost of one movement.",
    jobs: ["vanguard", "runewarden"],
    bonuses: { armor: 4, hp: 15, move: -1 },
  },
  wayboots: {
    id: "wayboots",
    name: "Wayfarer's boots",
    slot: "relic",
    price: 80,
    description: "Reach one tile farther on every activation.",
    bonuses: { move: 1 },
  },
  copperfocus: {
    id: "copperfocus",
    name: "Copper focus",
    slot: "relic",
    price: 80,
    description: "A modest rune amplifies damaging magic.",
    bonuses: { magic: 3 },
  },
  watchcharm: {
    id: "watchcharm",
    name: "Dawnwatch charm",
    slot: "relic",
    price: 90,
    description: "An old watch charm grants quicker activations.",
    bonuses: { speed: 2 },
  },
};
export const emptyLoadout = (): Loadout => ({
  weapon: null,
  armor: null,
  relic: null,
});
export const canEquip = (job: JobId, id: GearId, catalog = equipment) =>
  !catalog[id].jobs || catalog[id].jobs!.includes(job);
export function gearBonuses(loadout: Loadout, catalog = equipment): Bonuses {
  const total: Bonuses = {
    attack: 0,
    armor: 0,
    magic: 0,
    speed: 0,
    move: 0,
    hp: 0,
  };
  for (const id of Object.values(loadout))
    if (id)
      for (const [stat, value] of Object.entries(catalog[id].bonuses))
        total[stat as keyof Bonuses] += value;
  return total;
}
